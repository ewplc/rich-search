(function($){

  var DEFAULTS = {
  };

  var RootController = function(el, options) {
    /*
    init querycontroller
    init suggestioncontroller
    init virtualinputboxcontroller
     */

    if (!$.isFunction(options['keys']) && !$.isArray(options['keys'])) throw 'options.keys must be an Array or Function';
    if (!$.isFunction(options['values']) && !$.isPlainObject(options['values'])) throw 'options.values must be an Object or Function';

    var queryController = new QueryController($(el), $(el).parents('form').first());
    var suggestionController = new SuggestionController(queryController, options['keys'], options['values']);
    var virtualInputBoxController = new VirtualInputBoxController(el, queryController, suggestionController);

    virtualInputBoxController.build();
  };

  var QueryController = function(input, form) {
    /*
     listens: richsearch:query:newFilter
     listens: richsearch:query:submit

     fires: input.form.submit
     */

    var filters = {};

    this.queryChanged = function() {
      input.val(JSON.stringify(filters));
      form.submit();
    };

    this.addFilter = function(key, value) {
      filters[key] = value;
      this.queryChanged();
    };

    this.removeFilter = function(key) {
      delete filters[key];
      this.queryChanged();
    };

    this.getKeysInUse = function() {
      return Object.keys(filters);
    };
  };

  var SuggestionController = function(queryController, keysSource, valuesSource) {
    this.getKeySuggestions = function(startsWith, cb) {
      var inUse = queryController.getKeysInUse();
      if ($.isFunction(keysSource)) {
        keysSource(startsWith, inUse, cb);
      }
      else {
        var output = [];
        for (var i in keysSource) {
          if (keysSource[i].indexOf(startsWith) === 0 && $.inArray(keysSource[i], inUse) === -1) {
            output.push(keysSource[i]);
          }
        }
        cb(output);
      }
    };

    function getValueSuggestions(startsWith, key, cb) {
      if ($.isFunction(valuesSource)) {
        valuesSource(startsWith, key, cb);
      }
      else {
        if (valuesSource[key]) {
          var output = [];
          for (var i in valuesSource[key]) {
            if (valuesSource[key][i].indexOf(startsWith) === 0) {
              output.push(valuesSource[key][i]);
            }
          }
          cb(output);
        }
        else {
          cb([]);
        }
      }
    }

    var currentInputElement = null,
        container = null,
        suggestionContainer = $('<div />').addClass('rich-search-suggestions-container'),
        suggestionList = $('<ul />').appendTo(suggestionContainer),
        lastValues = [],
        closing = false;

    /**
     *
     * @param values {Array}
     */
    function buildSuggestionDropdown(values) {
      if (!$.isArray(values)) throw '"values" must be an array';

      if ($.arraysEqual(values, [])) {
        suggestionContainer.hide();
      }
      else if ($.arraysEqual(lastValues, values)) {
        if (closing) window.clearTimeout(closing);
        suggestionContainer
          .show()
          .offset({
            left: currentInputElement.offset().left
          });
      }
      else {
        suggestionList.empty();
        for (var i in values) {
          suggestionList.append(
            $('<li />')
              .text(values[i])
              .bind('click', function (e) {
                suggestionContainer.hide();
                currentInputElement.val($(e.target).text());
                currentInputElement.trigger('richsearch:accept');
              })
              .addClass(i == 0 ? 'rich-search-active' : '')
          );
        }
        if (closing) window.clearTimeout(closing);
        suggestionContainer
          .show()
          .offset({
            left: currentInputElement.offset().left
          });
      }

      lastValues = values;
    }

    this.updateSuggestions = function(type, userTyped, key) {
      if (type == 'key') {
        this.getKeySuggestions(userTyped, buildSuggestionDropdown);
      }
      else if (type == 'value') {
        getValueSuggestions(userTyped, key, buildSuggestionDropdown);
      }
    };

    this.updateCurrentInputElement = function(element) {
      currentInputElement = element;
      if (!container) {
        container = element.parents('.rich-search-container');
        suggestionContainer.appendTo(container);
      }
    };

    this.navigate = function(direction) {
      var items = suggestionList.children('li');
      var active = suggestionList.children('li.rich-search-active');
      if (active) {
        var currentIndex = items.index(active);
      }
      else {
        var currentIndex = 0;
      }
      if (direction == 'down')
        var newIndex = (currentIndex + 1) % items.length;
      else if (direction == 'up')
        var newIndex = (currentIndex - 1) % items.length;
      active.removeClass('rich-search-active');
      $(items[newIndex]).addClass('rich-search-active');
    };

    this.isOpen = function() {
      return suggestionContainer.filter(":visible").length > 0;
    };

    this.chooseCurrent = function() {
      suggestionContainer.hide();
      currentInputElement.val(suggestionList.children('li.rich-search-active').text());
      currentInputElement.trigger('richsearch:accept');
    };

    this.hide = function() {
      closing = window.setTimeout(function() {
        suggestionContainer.hide();
        closing = false;
      }, 250);
    }

  };

  /**
   *
   * @param inputElement Object
   * @param queryController QueryController
   * @param suggestionController SuggestionController
   * @constructor
   */
  var VirtualInputBoxController = function(inputElement, queryController, suggestionController) {
    /*
     listens: input.keyup

     fires: richsearch:suggestion:updateValues
     fires: richsearch:suggestion:updateKeys
     fires: richsearch:query:newFilter
     fires: richsearch:query:submit
     */

    var $e = $(inputElement);

    $e.hide();

    var container = $e.wrap('<div />')
      .parent()
      .addClass('rich-search-container')
      .click(function(e) {
        var $t = $(e.target);
        if ($t.is('div') || $t.is('ul')) {
          this.focusOnCurrent();
        }
      }.bind(this));
    var list = $('<ul />')
      .addClass('rich-search-terms')
      .appendTo(container);

    var STATES = {
      'WAITING': 'WAITING',
      'INKEY': 'INKEY',
      'INVALUE': 'INVALUE'
    };

    var workingPairElement = null,
        state = STATES.WAITING;

    function buildKeyElement() {
      return $('<input type="text" placeholder="Filter by attributes or search by keywords" size="42" />')
        .addClass('rich-search-input rich-search-key')
        .bind('richsearch:accept', function(e) {
          acceptUserSubmittedKey(e.target.value);
        })
        .bind('focus', function(e) {
          suggestionController.updateSuggestions('key', e.target.value);
        })
        .bind('blur', function(e) {
          suggestionController.hide()
        })
        .bind('keypress  focus', function(e) {

          var backspaces = $(e.target).data('backspaces') || 0;

          if (e.charCode) {
            backspaces = 0;
            suggestionController.updateSuggestions('key', e.target.value + String.fromCharCode(e.charCode));
          }
          else {
            /*
            if(e.keyCode === 8 && e.target.value.length === 0) {
              backspaces++;
              if (backspaces > 1) {
                e.preventDefault();
                $(e.target).remove();
                editPreviousKey();
              }
            }
            */

            if (e.keyCode === 13 /* Enter/Return */ || e.keyCode === 9 /* Tab */) {
              backspaces = 0;
              e.preventDefault();
              if(e.keyCode === 13 && suggestionController.isOpen()) {
                suggestionController.chooseCurrent();
              }
              else {
                acceptUserSubmittedKey(e.target.value);
              }
            }
            else if (e.keyCode === 38 || e.keyCode === 40) {
              e.preventDefault();
              if (e.keyCode === 38) suggestionController.navigate('up');
              if (e.keyCode === 40) suggestionController.navigate('down');
            }
          }

          $(e.target).data('backspaces', backspaces);
        });
    }

    function startNewKey() {
      var inputEl = buildKeyElement();

      if (workingPairElement) workingPairElement.removeClass('rich-search-active');

      workingPairElement = $('<li />')
        .addClass('rich-search-active')
        .append(inputEl)
        .appendTo(list);
      suggestionController.updateCurrentInputElement(inputEl);

      inputEl.focus();
    }

    function editPreviousKey(index) {
      var keyEl = workingPairElement.children('span.rich-search-key');
      var value = keyEl.text();
      keyEl.remove();

      var inputEl = buildKeyElement().val(value);
      workingPairElement.append(inputEl);
      inputEl.focus().setCursorPosition(value.length);
      suggestionController.updateCurrentInputElement(inputEl);
      suggestionController.updateSuggestions('key', value);
    }

    function startNewValue() {
      var inputEl = $('<input type="text">')
        .addClass('rich-search-input rich-search-value')
        .bind('richsearch:accept', function(e) {
          acceptUserSubmittedValue(e.target.value);
        })
        .bind('focus', function(e) {
          suggestionController.updateSuggestions(
            'value',
            e.target.value,
            workingPairElement.children('span.rich-search-key').text()
          );
        })
        .bind('blur', function(e) {
          suggestionController.hide();
        })
        .bind('keypress', function(e) {
          var backspaces = $(e.target).data('backspaces') || 0;

          if (e.charCode) {
            backspaces = 0;
            suggestionController.updateSuggestions(
              'value',
              e.target.value + String.fromCharCode(e.charCode),
              workingPairElement.children('span.rich-search-key').text()
            );
          }
          else {
            if (e.keyCode === 8 && e.target.value.length === 0) {
              backspaces++;
              if (backspaces > 1) {
                e.preventDefault();
                $(e.target).remove();
                editPreviousKey();
              }
            }

            if (e.keyCode === 13 /* Enter/Return */ || e.keyCode === 9 /* Tab */) {
              backspaces = 0;
              e.preventDefault();
              if(e.keyCode === 13 && suggestionController.isOpen()) {
                suggestionController.chooseCurrent();
              }
              else {
                acceptUserSubmittedValue(e.target.value);
              }
            }
            else if (e.keyCode === 38 || e.keyCode === 40) {
              e.preventDefault();
              if (e.keyCode === 38) suggestionController.navigate('up');
              if (e.keyCode === 40) suggestionController.navigate('down');
            }
          }

          $(e.target).data('backspaces', backspaces);
        });

      workingPairElement.append(inputEl);
      suggestionController.updateCurrentInputElement(inputEl);

      inputEl.focus();
    }

    function acceptUserSubmittedKey(key) {
      suggestionController.getKeySuggestions(key, function(keys) {
        workingPairElement.children('input.rich-search-key').remove();
        if (keys.length === 0) {
          workingPairElement.append(
            $('<span>')
              .addClass('rich-search-key')
              .text(key.indexOf(' ') >= 0 ? 'keywords' : 'keyword')
          );

          acceptUserSubmittedValue(key);
        }
        else {
          workingPairElement.append(
            $('<span>')
              .addClass('rich-search-key')
              .text(key)
          );

          transitionState(STATES.INVALUE);
        }

      });
    }

    function acceptUserSubmittedValue(value) {
      var key = workingPairElement.children('span.rich-search-key').text();

      workingPairElement.children('input.rich-search-value').remove();
      var label = $('<span>')
        .addClass('rich-search-value')
        .append($('<span>&times;</span>'));
      if (key == 'keyword' || key == 'keywords') {
        label.html(value.replace(' ', ' <span class="rich-search-operator">AND</span> '));
      }
      else {
        label.text(value);
      }
      workingPairElement.append(label);

      workingPairElement.append(
        $('<span>&times;</span>').bind('click', (function(el) {
          return function(e) {
            queryController.removeFilter(el.children('span.rich-search-key').text())
            $(e.target).unbind('click', e.handle);
            el.remove();
          }
        })(workingPairElement)).addClass('rich-search-close')
      );

      queryController.addFilter(
        workingPairElement.children('span.rich-search-key').text(),
        value
      );

      transitionState(STATES.INKEY);
    }

    function transitionState(newState) {
      state = newState;

      switch (newState) {
        case STATES.WAITING:
          break;
        case STATES.INKEY:
          startNewKey();
          break;
        case STATES.INVALUE:
          startNewValue();
          break;
      }
    }

    transitionState(STATES.INKEY);

    this.focusOnCurrent = function() {
      workingPairElement.children('input').focus();
    }

    this.build = function() {

    };
  };

  $.fn.richSearch = function(options) {
    options = $.extend({}, DEFAULTS, options);

    return this.each(function() {
      if (!$(this).is('input[type=text]')) return false;
      if ($(this).parents('form').length === 0) return false;
      var instance = $.data(this, 'RichSearch');
      if (!instance) {
        instance = new RootController(this, options);
        $.data(this, 'RichSearch', instance);
      }
    });
  };

  /**
   * @see http://www.sitepoint.com/jqueryhtml5-input-focus-cursor-positions/
   * @param pos
   * @returns {$.fn}
   */
  $.fn.setCursorPosition = function(pos) {
    this.each(function(index, elem) {
      if (elem.setSelectionRange) {
        elem.setSelectionRange(pos, pos);
      } else if (elem.createTextRange) {
        var range = elem.createTextRange();
        range.collapse(true);
        range.moveEnd('character', pos);
        range.moveStart('character', pos);
        range.select();
      }
    });
    return this;
  };

  $.arraysEqual = function(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.

    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
  if (!Object.keys) {
    Object.keys = (function() {
      'use strict';
      var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

      return function(obj) {
        if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
          throw new TypeError('Object.keys called on non-object');
        }

        var result = [], prop, i;

        for (prop in obj) {
          if (hasOwnProperty.call(obj, prop)) {
            result.push(prop);
          }
        }

        if (hasDontEnumBug) {
          for (i = 0; i < dontEnumsLength; i++) {
            if (hasOwnProperty.call(obj, dontEnums[i])) {
              result.push(dontEnums[i]);
            }
          }
        }
        return result;
      };
    }());
  }

})(jQuery);