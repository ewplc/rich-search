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
              if (!silent){
                changed();
              }
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
        if (filter){
          filters.push(filter);
        }
        if (resolved === simpleInputs.length){
          complete(self);
        }
      });
    });

  };

  var SuggestionController = function(formController, resolve) {
    var pub = {};//public functions and vars

    pub.suggestionContainer = $('<div />').addClass('rich-search-suggestions-container');

    var currentInputElement = null,
        container = null,
        // suggestionContainer = $('<div />').addClass('rich-search-suggestions-container'),
        suggestionList = $('<ul />').appendTo(pub.suggestionContainer),
        lastValues = [],
        closing;

    /**
     *
     * @param values {Array}
     */
    function buildSuggestionDropdown(values) {
      if (!$.isPlainObject(values)) throw '"values" must be an object';

      if ($.isEmptyObject(values)) {
        pub.suggestionContainer.hide();
      }
      else if (lastValues === values) {
        if (closing){
          window.clearTimeout(closing);
        }
        pub.suggestionContainer
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
              .on('click', function(e){
                $(this).addClass('rich-search-active');
                pub.suggestionContainer.hide();
                currentInputElement.val($(this).text()).trigger('richsearch:accept');
              })
              .on('mouseover mouseout', function(e){
                suggestionList.children().removeClass('rich-search-hover');
                
                if (e.type == 'mouseover'){
                  $(this).addClass('rich-search-hover');
                }
              })
              .data('value', item[0])
          );
        });
        if (closing){
          window.clearTimeout(closing);
        }
        pub.suggestionContainer
          .show()
          .offset({
            left: currentInputElement.offset().left,
            top: currentInputElement.parent().offset().top + currentInputElement.parent().outerHeight()
          });

        //highlight the first suggestion for the Value input field only. The Key field should allow keywords
        // if (inputType == 'value'){
          // suggestionList.children().first().addClass('rich-search-active');
        // }
      }

      lastValues = values;
    }

    pub.getKeySuggestions = function(startsWith, cb) {
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

    pub.getValueSuggestions = function(startsWith, key, cb) {
      var filters = formController.getFilters();

      $.each(filters, function(i, filter) {
        if (filter.label === key) {
          // console.log(filter);
          return resolve(filter, function(updatedFilter) {
            // console.log(updatedFilter);
            filters[i] = updatedFilter;

            var output = {};
            for (var i in updatedFilter.values) {
              // if (Boolean(updatedFilter.values[i])){
                if (updatedFilter.values[i].toLowerCase().indexOf(startsWith.toLowerCase()) === 0) {
                  output[i] = updatedFilter.values[i];
                }
              // }
            }
            return cb(output);
          });
        }
      });
    };

    pub.updateSuggestions = function(type, userTyped, key) {
      // console.log(userTyped);
      if (type == 'key') {
        pub.getKeySuggestions(userTyped, buildSuggestionDropdown);
      }
      else if (type == 'value') {
        pub.getValueSuggestions(userTyped, key, buildSuggestionDropdown);
      }
    };

    pub.updateCurrentInputElement = function(element) {
      currentInputElement = element;
      if (!container) {
        container = element.parents('.rich-search-container');
        pub.suggestionContainer.appendTo(container);
      }
    };

    pub.navigate = function(direction) {
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

    pub.isOpen = function() {
      return pub.suggestionContainer.filter(':visible').length > 0;
    };

    pub.isSelected = function(){
      return suggestionList.children('li.rich-search-active').length > 0;
    };

    pub.chooseCurrent = function() {
      pub.suggestionContainer.hide();
      currentInputElement.val(suggestionList.children('li.rich-search-active').text());
      currentInputElement.trigger('richsearch:accept');
    };

    pub.hide = function() {
      closing = window.setTimeout(function() {
        pub.suggestionContainer.hide();
        closing = null;
      }, 250);
    };

    pub.cleanUp = function(){
      suggestionList.children('li').removeClass('rich-search-active');
    };

    return pub;
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
      .appendTo(container)

      //click to edit existing filterItem's
      .on('click', 'li', function(e){
        if ($(this).hasClass('rich-search-complete')){
          //check if its a keyword filterItem
          if ($(this).hasClass('type-keyword')){
            editPreviousFilterTypeKeyword( $(e.target).parent('li') );
          }
          else {
            editPreviousFilterValue( $(this) );
          }
        }
      });

    var STATES = {
      'WAITING': 'WAITING',
      'INKEY': 'INKEY',
      'INVALUE': 'INVALUE'
    };

    var activeFilterItem = null,
        state = STATES.WAITING,
        prepopulated = false;

    createFilterKey();
    $.each(formController.getFilters(), function (i, filter) {
      var $input = $(filter.inputElement);

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


    var inputKeyupEventCallback = function(type, e){
      var keyCode = e.which || e.keyCode,
          keyName = String.fromCharCode(keyCode),
          inputValue = e.target.value.trim();

      switch (keyCode){
        case 13://enter
        case 9://tab
          e.preventDefault();

          if (keyCode === 13 && suggestionController.isOpen() && suggestionController.isSelected()) {
            suggestionController.chooseCurrent();
          }
          else {
            //check input isn't empty otherwise we'll get a ":" string as our key or empty string for a value
            if (!Boolean(inputValue)){//check it has a value other than empty/whitespace
              return false;
            }

            if (type == 'key'){
              acceptUserSubmittedKey(inputValue);
            }
            else {
              acceptUserSubmittedValue(inputValue);
            }
          }
          break;

        case 38://up arrow
        case 40://down arrow
          e.preventDefault();
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
          activeFilterItemValue = (type == 'value') ? activeFilterItem.children('span.rich-search-key').text() : null;
          suggestionController.updateSuggestions(type, inputValue, activeFilterItemValue);
          break;
      }
    };


    var inputKeydownEventCallback = function(e){
      var filterItem = $(e.target).parents('li'),
          keyCode = e.which || e.keyCode;

      switch (keyCode){
        case 8://backspace
          var elementInputKey = filterItem.children('input.rich-search-key');
          //handle going back to previous filterItem from a empty key field on 'backspace'
          //check if key input field exists (is being edited) && is empty
          if (elementInputKey.length > 0 && !elementInputKey.val()){// && filterItem.data('state', 'edit-key')){
            //check that more than 1 fieldItem exists
            if (list.children('li').length > 1){
              //prevent deletion of the last character in the value input field when we switch to previous filterItem
              e.preventDefault();

              //decide if we need to go to the next sibling (if we're on the first filterItem in the list) or the prev if we're not
              nextFilterItem = Boolean(filterItem.prev().length) ? filterItem.prev() : filterItem.next();

              //check if previous filterItem is a keyword filter
              if (nextFilterItem.hasClass('type-keyword')){
                //treat keyword filters differently otherwise we're left with "keyword(s)" as a key and the keywords as a value. we only want the keywords to be editable
                editPreviousFilterTypeKeyword(nextFilterItem);
              }
              else {
                //and switch to edit the previous filterItem's value field
                editPreviousFilterValue(nextFilterItem);
              }
              //remove the empty filterItem
              filterItem.remove();
            }
          }
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
          var filterInput = $(e.target);

          suggestionController.updateCurrentInputElement(filterInput);

          //make current selected filter the active one
          activeFilterItem = filterInput.parents('li');

          filterInput.parent('li').addClass('rich-search-focus');
          suggestionController.updateSuggestions('key', filterInput.val());
        })
        .on('blur', function(e) {
          var filterInput = $(e.target);

          filterInput.parent('li').removeClass('rich-search-focus');
          suggestionController.hide();
        })
        .on('keyup', function(e) {
          inputKeyupEventCallback('key', e);
        })
        .on('keydown', function(e){
          inputKeydownEventCallback(e);
        });
    }

    function createFilterKey() {
      var inputEl = buildKeyElement();

      activeFilterItem = $('<li />')
        .data('state', 'new')//tells us how far along the process of adding a filter we are
        .addClass('rich-search-active rich-search-new')
        .append(inputEl)
        // .append($.thinkingIcon())
        .appendTo(list);

      suggestionController.updateCurrentInputElement(inputEl);

      inputEl.focus();
    }

    function editPreviousFilterKey(filterItem) {
      var keyEl = filterItem.children('span.rich-search-key'),
          value = keyEl.text(),
          inputEl = buildKeyElement().val(value);
      
      keyEl.remove();

      //remove the selected key from 'filters' array so it will appear as a selectable suggestionController option
      formController.removeFilter(value);

      activeFilterItem = filterItem;

      activeFilterItem
        .data('state', 'edit-key')
        .append(inputEl);

      inputEl.focus();

      suggestionController.updateCurrentInputElement(inputEl);
      suggestionController.updateSuggestions('key', value);
    }

    function editPreviousFilterTypeKeyword(filterItem){
      var elementSpanValue = filterItem.children('span.rich-search-value');

      //remove any "AND" operator elements so they don't get printed literally in our input field
      elementSpanValue.find('span.rich-search-operator').remove();

      var keywordValue = elementSpanValue.text();

      //we arent interested in the Value element but it prepares the filterItem nicely for editing the Key
      editPreviousFilterValue(filterItem);

      filterItem
        .removeClass('type-keyword')
        .children('span.rich-search-key').text(keywordValue).end()
        .children('input.rich-search-value').remove();

      //now that we've updated our Key element to contain the old Value string, let's make it editable
      editPreviousFilterKey(filterItem);
    }

    function editPreviousFilterValue(filterItem) {
      if (list.children('li').hasClass('rich-search-new')){
        //we havent added a key to this filterItem yet so just remove it
        activeFilterItem.remove();
      }

      activeFilterItem = filterItem;
      
      activeFilterItem
        .removeClass('rich-search-active')
        .addClass('rich-search-incomplete');
      
      var elementSpanValue = activeFilterItem.children('span.rich-search-value');

      //remove any "AND" operator elements so they don't get printed literally in our input field
      elementSpanValue.find('span.rich-search-operator').remove();

      var value = elementSpanValue.text().trim(),
          inputEl = createFilterValue();

      //remove the selected key from 'filters' array so it will appear as a selectable suggestionController option
      formController.removeFilter(activeFilterItem.children('span.rich-search-key').text());

      elementSpanValue.remove();

      activeFilterItem
        .data('state', 'edit-value')
        .addClass('rich-search-active')
        .removeClass('rich-search-complete')
        .append(inputEl)
        .children('span.rich-search-close').remove();

      inputEl.val(value).focus();
      suggestionController.updateCurrentInputElement(inputEl);
      suggestionController.updateSuggestions('value', value);
    }

    function createFilterValue() {
      var inputEl = $('<input type="text">')
        .addClass('rich-search-input rich-search-value')
        .on('richsearch:accept', function(e) {
          acceptUserSubmittedValue(e.target.value);
        })
        .on('focus', function(e) {
          var filterInput = $(e.target);

          suggestionController.updateCurrentInputElement(filterInput);

          //make current selected filter the active one
          activeFilterItem = filterInput.parents('li');

          filterInput.parent('li').addClass('rich-search-focus');

          suggestionController.updateSuggestions(
            'value',
            filterInput.val(),
            activeFilterItem.children('span.rich-search-key').text()
          );
        })
        .on('blur', function(e) {
          var filterInput = $(e.target);

          filterInput.parent('li').removeClass('rich-search-focus');
          suggestionController.hide();
        })
        .on('keyup', function(e){
          inputKeyupEventCallback('value', e);
        })
        .on('keydown', function(e){
          var keyCode = e.which || e.keyCode,
              inputValue = e.target.value;

          switch (keyCode){
            case 8://backspace
              if (!inputValue){//if value field is empty on backspace
                e.preventDefault();
                $(e.target).remove();//remove field
                editPreviousFilterKey(activeFilterItem);//go back to editing key field
              }
              break;
          }
        });

      activeFilterItem.append(inputEl);
      suggestionController.updateCurrentInputElement(inputEl);

      inputEl.focus();

      return inputEl;
    }

    function acceptUserSubmittedKey(key, force) {
      var keyText,
          keywordFilter = false;

      if (force) {
        activeFilterItem.children('input.rich-search-key').remove();
        keyText = key;
      }
      else {
        // suggestionController.getKeySuggestions(key, function(keys) {
          activeFilterItem.children('input.rich-search-key').remove();

          // if ($.isEmptyObject(keys)) {
            //no suggested key values were found so this will be treated as a keyword filter
          if (!suggestionController.isSelected()){
            //no suggestion was selected so we'll treat this as a keyword filter
            keyText = key.trim().indexOf(' ') >= 0 ? 'keywords' : 'keyword';
            keywordFilter = true;
          }
          else {
            keyText = key;
          }
        // });
      }

      if (keywordFilter){
        activeFilterItem.data('state', 'complete');
      }
      else {
        activeFilterItem.data('state', 'edit-value');
      }

      activeFilterItem
        .removeClass('rich-search-new')
        .prepend(
          $('<span />')
            .addClass('rich-search-key')
            .text(keyText)
        );

      if (keywordFilter){
        activeFilterItem.addClass('type-keyword');
        acceptUserSubmittedValue(key);
      }
      else {
        switchFilterItem();
      }
    }

    function acceptUserSubmittedValue(value, silent) {
      var key = activeFilterItem.children('span.rich-search-key').text();

      activeFilterItem.children('input.rich-search-value').remove();
      
      var label = $('<span>')
        .addClass('rich-search-value')
        .append($('<span>&times;</span>'));
      
      if (key == 'keyword' || key == 'keywords') {
        label.html(value.replace(' ', ' <span class="rich-search-operator">AND</span> '));
      }
      else {
        label.text(value);
      }
      activeFilterItem.append(label);

      activeFilterItem
        .data('state', 'complete')
        .removeClass('rich-search-active rich-search-incomplete')
        .addClass('rich-search-complete')
        .append(
          $('<span>&times;</span>')
            .on('click', (function(el){
              return function(e){
                formController.removeFilter(el.children('span.rich-search-key').text());
                $(e.target).off('click', e.handle);
                el.remove();
              }
            })(activeFilterItem))
            .addClass('rich-search-close')
        );

      formController.addFilter(
        activeFilterItem.children('span.rich-search-key').text(),
        value,
        silent
      );

      switchFilterItem();
    }

    //create new or edit next incomplete filterItem
    function switchFilterItem(filterItem) {
      filterItem = filterItem || false;

      if (filterItem){
        editPreviousFilterValue(filterItem);

        return false;
      }

      //cleanup suggestions
      suggestionController.cleanUp();

      var incompleteFilter = list.find('.rich-search-incomplete:eq(0)');

      switch (activeFilterItem.data('state')){
        case 'edit-value':
          //filter has a key set so create a value
          createFilterValue();
          break;

        case 'complete':
          //filter has a key and value set so create a new filter or continue editing an incomplete one
          if (incompleteFilter.length > 0){
            incompleteFilter.children('input').focus();
          }
          else {
            createFilterKey();
          }
          break;
      }
    }

    this.focusOnCurrent = function() {
      activeFilterItem.children('input').focus();
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

  $.thinkingIcon = function(){
    var icon = $('<div class="gui-thinker" />');

    for (var i = 1; i < 13; i++){
      icon.append($('<span class="dot dot'+i+'" />'));
    }
    return icon;
  };

})(jQuery);