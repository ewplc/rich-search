(function($){

  var DEFAULTS = {
  };

  var RootController = function(form, options) {
    if (!$.isFunction(options['resolve'])) throw 'options.resolve must be a Function';

    form = $(form);

    new FormController(form, options.resolve, function(formController) {
      var suggestionController = new SuggestionController(formController, options.resolve);
      new VirtualInputBoxController(form, formController, suggestionController);
    });
  };

  var FormController = function(form, resolve, complete) {
    var filters = [];

    this.getKeysInUse = function() {
      var output = [];
      $.each(filters, function() {
        if ($(this.inputElement).val()) {
          output.push(this.label);
        }
      });
      return output;
    };

    this.getFilters = function() {
      return filters;
    };

    this.removeFilter = function(key) {
      $.each(filters, function() {
        if (this.label === key) {
          $(this.inputElement).val(null);
          changed();
        }
      });
    };

    this.addFilter = function(key, value, silent) {
      silent = Boolean(silent);
      $.each(filters, function(i, filter) {
        if (filter.label === key) {
          //$.each(filter.values, function(optionName, optionValue) {
          //  if (optionValue === value) {
              $(filter.inputElement).val(value);
              if (!silent) changed();
          //  }
          //});
        }
      });
    };

    function isSimpleUserInput(i, input) {
      return !$(input).is(':file,:button,:submit,:reset,:image,textarea,:disabled,[type=hidden]');
    }

    function changed() {
      form.submit();
    }

    var self = this,
        simpleInputs = form.find(':input').filter(isSimpleUserInput),
        resolved = 0;
    simpleInputs.each(function() {
      var $input = $(this),
          label = form.find('label[for=' + $input.attr('id') + '], label[for=' + $input.attr('name') + ']').text(),
          values = {};

      if ($input.is('select')) {
        $('option', $input).each(function() {
          var $opt = $(this);
          if ($opt.val()) values[$opt.val()] = $opt.text();
        })
      }

      resolve({
        label: label,
        inputElement: $input,
        values: values
      }, function(filter) {
        resolved++;
        if (filter) filters.push(filter);
        if (resolved === simpleInputs.length) complete(self);
      });
    });

  };

  var SuggestionController = function(formController, resolve) {
    var currentInputElement = null,
        container = null,
        suggestionContainer = $('<div />').addClass('rich-search-suggestions-container'),
        suggestionList = $('<ul />').appendTo(suggestionContainer),
        lastValues = [],
        closing;

    /**
     *
     * @param values {Array}
     */
    function buildSuggestionDropdown(values) {
      if (!$.isPlainObject(values)) throw '"values" must be an object';

      if ($.isEmptyObject(values)) {
        suggestionContainer.hide();
      }
      else if (lastValues === values) {
        if (closing) window.clearTimeout(closing);
        suggestionContainer
          .show()
          .offset({
            left: currentInputElement.offset().left
          });
      }
      else {
        suggestionList.empty();

        var items = [];
        $.each(values, function(name, value) {
          items.push([name, value]);
        });
        items.sort(function(a, b) {
          a[1].localeCompare(b[1]);
        });

        $.each(items, function(i, item) {
          suggestionList.append(
            $('<li />')
              .text(item[1])
              .on('click', function (e) {
                suggestionContainer.hide();
                currentInputElement.val($(e.target).text());
                currentInputElement.trigger('richsearch:accept');
              })
              .data('value', item[0])
          );
        });
        if (closing) window.clearTimeout(closing);
        suggestionContainer
          .show()
          .offset({
            left: currentInputElement.offset().left
          });
        suggestionList.children().first().addClass('rich-search-active');
      }

      lastValues = values;
    }

    this.getKeySuggestions = function(startsWith, cb) {
      var filters = formController.getFilters(),
          inUse = formController.getKeysInUse(),
          responses = 0;

      $.each(filters, function(i, filter) {
        return resolve(filter, function(updatedFilter) {
          responses++;
          filters[i] = updatedFilter;

          if (responses === filters.length) {
            var output = {};
            $.each(filters, function(j, filter) {
              if (filter.label.toLowerCase().indexOf(startsWith.toLowerCase()) === 0 && $.inArray(filter.label, inUse) === -1) {
                output[filter.label] = filter.label;
              }
            });
            return cb(output);
          }
        })
      });
    };

    this.getValueSuggestions = function(startsWith, key, cb) {
      var filters = formController.getFilters();

      $.each(filters, function(i, filter) {
        if (filter.label === key) {
          return resolve(filter, function(updatedFilter) {
            filters[i] = updatedFilter;

            var output = {};
            for (var i in updatedFilter.values) {
              if (updatedFilter.values[i].toLowerCase().indexOf(startsWith.toLowerCase()) === 0) {
                output[i] = updatedFilter.values[i];
              }
            }
            return cb(output);
          });
        }
      });
    };

    this.updateSuggestions = function(type, userTyped, key) {
      if (type == 'key') {
        this.getKeySuggestions(userTyped, buildSuggestionDropdown);
      }
      else if (type == 'value') {
        this.getValueSuggestions(userTyped, key, buildSuggestionDropdown);
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
      var items = suggestionList.children('li'),
          active = suggestionList.children('li.rich-search-active'),
          currentIndex,
          newIndex;

      if (active){
        currentIndex = items.index(active);
      }
      else {
        currentIndex = 0;
      }

      if (direction == 'down'){
        newIndex = (currentIndex + 1) % items.length;
      }
      else if (direction == 'up'){
        currentIndex--;
        newIndex = (currentIndex < 0) ? items.length - 1 : currentIndex;
      }

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
        closing = null;
      }, 250);
    }

  };

  /**
   *
   * @param $form jQuery
   * @param formController FormController
   * @param suggestionController SuggestionController
   * @constructor
   */
  var VirtualInputBoxController = function($form, formController, suggestionController) {
    $form.hide();

    var container = $('<div>')
      .insertAfter($form)
      .addClass('rich-search-container')
      .click(this, function(e) {
        var $t = $(e.target);
        if ($t.is('div') || $t.is('ul')) {
          e.data.focusOnCurrent();
        }
      });

    var list = $('<ul />')
      .addClass('rich-search-terms')
      .appendTo(container);

    var STATES = {
      'WAITING': 'WAITING',
      'INKEY': 'INKEY',
      'INVALUE': 'INVALUE'
    };

    var workingPairElement = null,
        state = STATES.WAITING,
        prepopulated = false;

    startNewKey();
    $.each(formController.getFilters(), function (i, filter) {
      var $input = $(filter.inputElement);
      // console.log($input, $input.val());
      if ($input.val() || $input.val() !== '') {
        prepopulated = true;
        acceptUserSubmittedKey(filter.label, true);
        if (filter.inputElement.is('select')) {
          acceptUserSubmittedValue(filter.inputElement.find('option[value=' + $input.val() + ']').text(), true);
        }
        else {
          acceptUserSubmittedValue($input.val(), true);
        }
      }

      return true;
    });
    //if (!prepopulated) transitionState(STATES.INKEY);


    var inputKeyupEvent = function(type, e){
      var keyCode = e.which || e.keyCode,
          keyName = String.fromCharCode(keyCode),
          // backspaces = $(e.target).data('backspaces') || 0,
          inputValue = e.target.value;

      // console.log(keyCode + ' | ' + keyName);

      switch (keyCode){
        // case 8://backspace
        //   console.log('delete key');
        //   break;

        case 13://enter
        case 9://tab
          console.log('enter/tab key');
          // backspaces = 0;
          e.preventDefault();
          if (keyCode === 13 && suggestionController.isOpen()) {
            suggestionController.chooseCurrent();
          }
          else {
            acceptUserSubmittedKey(inputValue);
          }
          break;

        case 38://up arrow
        case 40://down arrow
          e.preventDefault();
          console.log('up/down key');
          if (keyCode === 38){
            suggestionController.navigate('up');
          }
          if (keyCode === 40){
            suggestionController.navigate('down');
          }
          break;

        case 37://left arrow
        case 39://right arrow
          //do nothing
          break;

        default:
          //everything else
          // console.log(inputValue);
          // backspaces = 0;
          workingPairElementValue = (type == 'value') ? workingPairElement.children('span.rich-search-key').text() : null;
          suggestionController.updateSuggestions(type, inputValue, workingPairElementValue);
          break;
      }
    };


    function buildKeyElement() {
      return $('<input type="text" placeholder="Enter keyword or field name" size="42" />')
        .addClass('rich-search-input rich-search-key')
        .on('richsearch:accept', function(e) {
          acceptUserSubmittedKey(e.target.value);
        })
        .on('focus', function(e) {
          suggestionController.updateSuggestions('key', e.target.value);
        })
        .on('blur', function(e) {
          suggestionController.hide();
        })
        .on('keyup', function(e) {//we want to listen for backspace too - which keypress doesnt invoke
          /*var keyCode = e.which || e.keyCode,
              keyName = String.fromCharCode(keyCode),
              // backspaces = $(e.target).data('backspaces') || 0,
              inputValue = e.target.value;

          // console.log(keyCode + ' | ' + keyName);

          switch (keyCode){
            // case 8://backspace
            //   console.log('delete key');
            //   break;

            case 13://enter
            case 9://tab
              console.log('enter/tab key');
              // backspaces = 0;
              e.preventDefault();
              if (keyCode === 13 && suggestionController.isOpen()) {
                suggestionController.chooseCurrent();
              }
              else {
                acceptUserSubmittedKey(inputValue);
              }
              break;

            case 38://up arrow
            case 40://down arrow
              e.preventDefault();
              console.log('up/down key');
              if (keyCode === 38){
                suggestionController.navigate('up');
              }
              if (keyCode === 40){
                suggestionController.navigate('down');
              }
              break;

            case 37://left arrow
            case 39://right arrow
              //do nothing
              break;

            default:
              //everything else
              // console.log(inputValue);
              // backspaces = 0;
              suggestionController.updateSuggestions('key', inputValue);
              break;
          }*/
          inputKeyupEvent('key', e);

          /*if (keyCode){
            backspaces = 0;
            suggestionController.updateSuggestions('key', e.target.value + keyName);
          }
          else {
            // if (e.keyCode === 8 && e.target.value.length === 0) {
            //   backspaces++;
            //   if (backspaces > 1) {
            //     e.preventDefault();
            //     $(e.target).remove();
            //     editPreviousKey();
            //   }
            // }

            if (keyCode === 13 || keyCode === 9) {//13 = Enter, 9 = Tab
              backspaces = 0;
              e.preventDefault();
              if(keyCode === 13 && suggestionController.isOpen()) {
                suggestionController.chooseCurrent();
              }
              else {
                acceptUserSubmittedKey(e.target.value);
              }
            }
            else if (keyCode === 38 || keyCode === 40) {
              e.preventDefault();
              if (keyCode === 38) suggestionController.navigate('up');
              if (keyCode === 40) suggestionController.navigate('down');
            }
          }*/

          // $(e.target).data('backspaces', backspaces);
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
        .on('richsearch:accept', function(e) {
          acceptUserSubmittedValue(e.target.value);
        })
        .on('focus', function(e) {
          suggestionController.updateSuggestions(
            'value',
            e.target.value,
            workingPairElement.children('span.rich-search-key').text()
          );
        })
        .on('blur', function(e) {
          suggestionController.hide();
        })
        /*.on('keypress', function(e) {
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

            if (e.keyCode === 13 || e.keyCode === 9) {
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
        })*/
        .on('keyup', function(e){
          inputKeyupEvent('value', e);
        })
        .on('keydown', function(e){
          var keyCode = e.which || e.keyCode,
              inputValue = e.target.value;

          switch (keyCode){
            case 8://backspace
              if (!inputValue){//if value field is empty on backspace
                e.preventDefault();
                $(e.target).remove();//remove field
                editPreviousKey();//go back to editing key field
              }
              break;
          }
        })
        ;

      workingPairElement.append(inputEl);
      suggestionController.updateCurrentInputElement(inputEl);

      inputEl.focus();
    }

    function acceptUserSubmittedKey(key, force) {
      if (force) {
        workingPairElement.children('input.rich-search-key').remove();
        workingPairElement.append(
          $('<span>')
            .addClass('rich-search-key')
            .text(key)
        );

        transitionState(STATES.INVALUE);
      }
      else {
        suggestionController.getKeySuggestions(key, function (keys) {
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
    }

    function acceptUserSubmittedValue(value, silent) {
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
        $('<span>&times;</span>').on('click', (function(el) {
          return function(e) {
            formController.removeFilter(el.children('span.rich-search-key').text());
            $(e.target).off('click', e.handle);
            el.remove();
          }
        })(workingPairElement)).addClass('rich-search-close')
      );

      formController.addFilter(
        workingPairElement.children('span.rich-search-key').text(),
        value,
        silent
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

    this.focusOnCurrent = function() {
      workingPairElement.children('input').focus();
    }
  };

  $.fn.richSearch = function(options) {
    options = $.extend({}, DEFAULTS, options);

    return this.each(function() {
      if (!$(this).is('form')) return false;
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