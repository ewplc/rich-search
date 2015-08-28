!function($){var e={},t=function(e,t){if(!$.isFunction(t.resolve))throw"options.resolve must be a Function";e=$(e),new n(e,t.resolve,function(n){var i=new r(n,t.resolve);new a(e,n,i)})},n=function(e,t,n){function r(e,t){return!$(t).is(":file,:button,:submit,:reset,:image,textarea,:disabled,[type=hidden]")}function a(){e.submit()}var i=[];this.getKeysInUse=function(){var e=[];return $.each(i,function(){$(this.inputElement).val()&&e.push(this.label)}),e},this.getFilters=function(){return i},this.removeFilter=function(e){$.each(i,function(){this.label===e&&($(this.inputElement).val(null),a())})},this.addFilter=function(e,t,n){n=Boolean(n),$.each(i,function(r,i){i.label===e&&($(i.inputElement).val(t),n||a())})};var s=this,c=e.find(":input").filter(r),o=0;c.each(function(){var r=$(this),a=e.find("label[for="+r.attr("id")+"], label[for="+r.attr("name")+"]").text(),l={};r.is("select")&&$("option",r).each(function(){var e=$(this);e.val()&&(l[e.val()]=e.text())}),t({label:a,inputElement:r,values:l},function(e){o++,e&&i.push(e),o===c.length&&n(s)})})},r=function(e,t){function n(e){if(!$.isPlainObject(e))throw'"values" must be an object';if($.isEmptyObject(e))r.suggestionContainer.hide();else if(c===e)o&&window.clearTimeout(o),r.suggestionContainer.show().offset({left:a.offset().left});else{s.empty();var t=[];$.each(e,function(e,n){t.push([e,n])}),t.sort(function(e,t){e[1].localeCompare(t[1])}),$.each(t,function(e,t){s.append($("<li />").text(t[1]).on("click",function(e){$(this).addClass("rich-search-active"),r.suggestionContainer.hide(),a.val($(this).text()).trigger("richsearch:accept")}).on("mouseover mouseout",function(e){s.children().removeClass("rich-search-hover"),"mouseover"==e.type&&$(this).addClass("rich-search-hover")}).data("value",t[0]))}),o&&window.clearTimeout(o),r.suggestionContainer.show().offset({left:a.offset().left,top:a.parent().offset().top+a.parent().outerHeight()})}c=e}var r={};r.suggestionContainer=$("<div />").addClass("rich-search-suggestions-container");var a=null,i=null,s=$("<ul />").appendTo(r.suggestionContainer),c=[],o;return r.getKeySuggestions=function(n,r){var a=e.getFilters(),i=e.getKeysInUse(),s=0;$.each(a,function(e,c){return t(c,function(t){if(s++,a[e]=t,s===a.length){var c={};return $.each(a,function(e,t){0===t.label.toLowerCase().indexOf(n.toLowerCase())&&-1===$.inArray(t.label,i)&&(c[t.label]=t.label)}),r(c)}})})},r.getValueSuggestions=function(n,r,a){var i=e.getFilters();$.each(i,function(e,s){return s.label===r?t(s,function(e){i[r]=e;var t={};for(var r in e.values)0===e.values[r].toLowerCase().indexOf(n.toLowerCase())&&(t[r]=e.values[r]);return a(t)}):void 0})},r.updateSuggestions=function(e,t,a){"key"==e?r.getKeySuggestions(t,n):"value"==e&&r.getValueSuggestions(t,a,n)},r.updateCurrentInputElement=function(e){a=e,i||(i=e.parents(".rich-search-container"),r.suggestionContainer.appendTo(i))},r.navigate=function(e){var t=s.children("li"),n=s.children("li.rich-search-active"),a,i,c;a=n?t.index(n):0,"down"==e?i=(a+1)%t.length:"up"==e&&(a--,i=0>a?t.length-1:a),c=$(t[i]),n.removeClass("rich-search-active"),c.addClass("rich-search-active"),r.suggestionContainer.scrollTop(r.suggestionContainer.scrollTop()+c.position().top-r.suggestionContainer.height()/2+c.height()/2)},r.isOpen=function(){return r.suggestionContainer.filter(":visible").length>0},r.isSelected=function(){return s.children("li.rich-search-active").length>0},r.chooseCurrent=function(){r.suggestionContainer.hide(),a.val(s.children("li.rich-search-active").text()),a.trigger("richsearch:accept")},r.hide=function(){o=window.setTimeout(function(){r.suggestionContainer.hide(),o=null},250)},r.cleanUp=function(){s.children("li").removeClass("rich-search-active")},r},a=function(e,t,n){function r(){return $('<input type="text" placeholder="Enter keyword or field name" size="42" />').addClass("rich-search-input rich-search-key").on("richsearch:accept",function(e){l(e.target.value)}).on("focus",function(e){var t=$(e.target);n.updateCurrentInputElement(t),v=t.parents("li"),t.parent("li").addClass("rich-search-focus"),n.updateSuggestions("key",t.val())}).on("blur",function(e){var t=$(e.target);t.parent("li").removeClass("rich-search-focus"),n.hide()}).on("keyup",function(e){C("key",e)}).on("keydown",function(e){y(e)})}function a(){var e=r();v=$("<li />").data("state","new").addClass("rich-search-active rich-search-new").append(e).appendTo(d),n.updateCurrentInputElement(e),e.focus()}function i(e){var a=e.children("span.rich-search-key"),i=a.text(),s=r().val(i);a.remove(),t.removeFilter(i),v=e,v.data("state","edit-key").append(s),s.focus(),n.updateCurrentInputElement(s),n.updateSuggestions("key",i)}function s(e){var t=e.children("span.rich-search-value");t.find("span.rich-search-operator").remove();var n=t.text();c(e),e.removeClass("type-keyword").children("span.rich-search-key").text(n).end().children("input.rich-search-value").remove(),i(e)}function c(e){d.children("li").hasClass("rich-search-new")&&v.remove(),v=e,v.removeClass("rich-search-active").addClass("rich-search-incomplete");var r=v.children("span.rich-search-value");r.find("span.rich-search-operator").remove();var a=r.text().trim(),i=o();t.removeFilter(v.children("span.rich-search-key").text()),r.remove(),v.data("state","edit-value").addClass("rich-search-active").removeClass("rich-search-complete").append(i).children("span.rich-search-close").remove(),i.val(a).focus(),n.updateCurrentInputElement(i),n.updateSuggestions("value",a)}function o(){var e=$('<input type="text">').addClass("rich-search-input rich-search-value").on("richsearch:accept",function(e){u(e.target.value)}).on("focus",function(e){var t=$(e.target);n.updateCurrentInputElement(t),v=t.parents("li"),t.parent("li").addClass("rich-search-focus"),n.updateSuggestions("value",t.val(),v.children("span.rich-search-key").text())}).on("blur",function(e){var t=$(e.target);t.parent("li").removeClass("rich-search-focus"),n.hide()}).on("keyup",function(e){C("value",e)}).on("keydown",function(e){var t=e.which||e.keyCode,n=e.target.value;switch(t){case 8:n||(e.preventDefault(),$(e.target).remove(),i(v))}});return v.append(e),n.updateCurrentInputElement(e),e.focus(),e}function l(e,t){var r,a=!1;t?(v.children("input.rich-search-key").remove(),r=e):(v.children("input.rich-search-key").remove(),n.isSelected()?r=e:(r=e.trim().indexOf(" ")>=0?"keywords":"keyword",a=!0)),a?v.data("state","complete"):v.data("state","edit-value"),v.removeClass("rich-search-new").prepend($("<span />").addClass("rich-search-key").text(r)),a?(v.addClass("type-keyword"),u(e)):h()}function u(e,n){var r=v.children("span.rich-search-key").text();v.children("input.rich-search-value").remove();var a=$("<span>").addClass("rich-search-value").append($("<span>&times;</span>"));"keyword"==r||"keywords"==r?a.html(e.replace(" ",' <span class="rich-search-operator">AND</span> ')):a.text(e),v.append(a),v.data("state","complete").removeClass("rich-search-active rich-search-incomplete").addClass("rich-search-complete").append($("<span>&times;</span>").on("click",function(e){return function(n){t.removeFilter(e.children("span.rich-search-key").text()),$(n.target).off("click",n.handle),e.remove()}}(v)).addClass("rich-search-close")),t.addFilter(v.children("span.rich-search-key").text(),e,n),h()}function h(e){if(e=e||!1)return c(e),!1;n.cleanUp();var t=d.find(".rich-search-incomplete:eq(0)");switch(v.data("state")){case"edit-value":o();break;case"complete":t.length>0?t.children("input").focus():a()}}e.hide();var p=$("<div>").insertAfter(e).addClass("rich-search-container").click(this,function(e){var t=$(e.target);(t.is("div")||t.is("ul"))&&e.data.focusOnCurrent()}),d=$("<ul />").addClass("rich-search-terms").appendTo(p).on("click","li",function(e){$(this).hasClass("rich-search-complete")&&($(this).hasClass("type-keyword")?s($(e.target).parent("li")):c($(this)))}),f={WAITING:"WAITING",INKEY:"INKEY",INVALUE:"INVALUE"},v=null,g=f.WAITING,m=!1;a(),$.each(t.getFilters(),function(e,t){var n=$(t.inputElement);return(n.val()||""!==n.val())&&(m=!0,l(t.label,!0),t.inputElement.is("select")?u(t.inputElement.find("option[value="+n.val()+"]").text(),!0):u(n.val(),!0)),!0});var C=function(e,t){var r=t.which||t.keyCode,a=String.fromCharCode(r),i=t.target.value.trim();switch(r){case 13:case 9:if(t.preventDefault(),13===r&&n.isOpen()&&n.isSelected())n.chooseCurrent();else{if(!Boolean(i))return!1;"key"==e?l(i):u(i)}break;case 38:case 40:t.preventDefault(),38===r&&n.navigate("up"),40===r&&n.navigate("down");break;case 37:case 39:break;default:activeFilterItemValue="value"==e?v.children("span.rich-search-key").text():null,n.updateSuggestions(e,i,activeFilterItemValue)}},y=function(e){var t=$(e.target).parents("li"),n=e.which||e.keyCode;switch(n){case 8:var r=t.children("input.rich-search-key");r.length>0&&!r.val()&&d.children("li").length>1&&(e.preventDefault(),nextFilterItem=Boolean(t.prev().length)?t.prev():t.next(),nextFilterItem.hasClass("type-keyword")?s(nextFilterItem):c(nextFilterItem),t.remove())}};this.focusOnCurrent=function(){v.children("input").focus()}};$.fn.richSearch=function(n){return n=$.extend({},e,n),this.each(function(){if(!$(this).is("form"))return!1;var e=$.data(this,"RichSearch");e||(e=new t(this,n),$.data(this,"RichSearch",e))})},$.fn.setCursorPosition=function(e){return this.each(function(t,n){if(n.setSelectionRange)n.setSelectionRange(e,e);else if(n.createTextRange){var r=n.createTextRange();r.collapse(!0),r.moveEnd("character",e),r.moveStart("character",e),r.select()}}),this},$.arraysEqual=function(e,t){if(e===t)return!0;if(null==e||null==t)return!1;if(e.length!=t.length)return!1;for(var n=0;n<e.length;++n)if(e[n]!==t[n])return!1;return!0},Object.keys||(Object.keys=function(){"use strict";var e=Object.prototype.hasOwnProperty,t=!{toString:null}.propertyIsEnumerable("toString"),n=["toString","toLocaleString","valueOf","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","constructor"],r=n.length;return function(a){if("object"!=typeof a&&("function"!=typeof a||null===a))throw new TypeError("Object.keys called on non-object");var i=[],s,c;for(s in a)e.call(a,s)&&i.push(s);if(t)for(c=0;r>c;c++)e.call(a,n[c])&&i.push(n[c]);return i}}()),$.thinkingIcon=function(){for(var e=$('<div class="gui-thinker" />'),t=1;13>t;t++)e.append($('<span class="dot dot'+t+'" />'));return e}}(jQuery);