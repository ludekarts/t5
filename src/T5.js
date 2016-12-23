/**
 * T5.js
 * Micro-templating engine with user friendly markup, nested repeaters, custom fiilters adn outputs modifiers.
 *
 * version : 0.4.2
 * author  : Wojciech Ludwin 2016
 * contact : ludekarts@gmail.com, https://wldesign.pl
 * webpage : https://ludekarts.github.io/t5/
 * license : MIT
 */

 (function (root, factory) {
   if (typeof define === 'function' && define.amd) {
     define([], factory);
   } else if (typeof exports === 'object') {
     module.exports = factory();
   } else {
     root.t5 = factory();
   }
 }(window, function () {
   'use strict';

   var _filters = {};
   var _modifiers = {};
   var _templatesReferences = {};
   var _precompiledTemplates = {};

   // Register templates as HTML-template-string & stroe it under the @name.
   var _template = function (name, templateString) {
     if (name && templateString) {
       //Convert HTML source to DOM Element.
       var wrapper = document.createElement('div');
       var stub = document.createRange().createContextualFragment(templateString);
       wrapper.appendChild(stub);
       _precompiledTemplates[name] = precompileHTML(wrapper);

       wrapper = null;
       stub = null;
       return API;
     }

     //  Get all nodes with 'data-t5' attribute as @name.
     else {
       var allTemplates = Array.prototype.slice.call(document.querySelectorAll('[data-t5]')) || [];
       allTemplates.forEach(function (template) {
         var clone, name = template.getAttribute('data-t5');
         if (name) {
           clone = template.cloneNode(true);
           clone.removeAttribute('data-t5');
           // Bail if Repader doesn't have wrapper.
           if (clone.getAttribute('repeat')) throw new Error ('Repeater: "' + name + '" need to have a wrapper node!');
           _precompiledTemplates[name] = precompileHTML(clone);
           _templatesReferences[name] = template;
           clone = null;
         }
       });
      return API;
     }
   }

   // Replace HTML escape characters: &amp; , &gt; , &lt;
   var replaceHTMLEsc = function (value) {
      return (value === '&amp;') ? '&' : (value === '&gt;') ? '>' : (value === '&lt;') ? '<' : value;
   };

   // Prefix interpolations' values with @scope name.
   var prefixWithScope = function (expression, scope) {
     return expression.replace(/'[a-zA-Z+\.]+'|([a-zA-Z+\.]+)/g, function(quoted, nonquoted) {
       return nonquoted ? scope + '.' + nonquoted : quoted;
     });
   };

   // Interpolate values in curlybraces: {{ interpolation }}
   var interpolate = function (template, scope) {
     return template.replace(/\{\{\s*([0-9A-Za-z\.\[\]]+?)\s*\}\}/g, function (curlyString, value) {
       return "'+"+ (scope ? scope + "." : "") + value +"+'";
     })
   };

   // Find condition statements like:
   // {{ result : conditions }}
   // and change it to:
   // (conditions ? result : null);
   var conditionsValidator = function (body, scope) {
     return body.replace(/(&amp;)|(&gt;)|(&lt;)/g, replaceHTMLEsc).replace(/\{\{\s*([\w\']+\.*\w*\s*\:{1}\s*([0-9\!\w\.])+(([0-9\w\s\!\.\>\<\&\'])*(={2,3})*)*)\s*\}\}/g, function (curlyString, value) {
      var values = scope ? prefixWithScope(value, scope).split(':') : value.split(':');
       return "'+ ((" + values[1] + ") ? "+ values[0] +" : '') +'";
     })
   };

   // Render single repeater functions.
   var repeaterTemplate = function (template, repeaterScope, localScope, filterName, modName) {
     return ""
     +"(function (repeaterArray, filterName, modName) {"
          // Register filter & mod fot this repearter.
     +    "var filter = filters[filterName], mod = mods[modName];"
           // Clone template for @repeaterArray.
     +     "return repeaterArray.reduce(function (result, "+ localScope +", index) {"
           // When filter finds value."
     +     "if (filter && !filter(" + localScope + ", index)) return result;"
           // Modify current scope if mod exist.
     +     "if (mod) "+ localScope +" = mod(" + localScope + ", index);"
           // Interpolate template.
     +     "return result += \'"+ conditionsValidator(interpolate(template)) + "\';"
     +   "}, '');"
     +"}("+ repeaterScope +", '"+ filterName +"', '" + modName + "'))";
   };

   // Exreact Modificator & Filter names.
   var mod_and_filter = function (expresion) {
     var modName = expresion.match(/\>+\s*(\w+)/);
     var filterName = expresion.match(/\|+\s*(\w+)/);
     return {
       mod: modName ? modName[1] : undefined,
       filter: filterName ? filterName[1] : undefined
     }
   };

   // Transform HTML template into templateFunction.
   var templateToFunction = function (template, scope) {
     var repeaters = [].slice.call(template.querySelectorAll('[repeat]'));
     var repeaterKey, params, repeatString, parentRepeater = false, mf;
     // Build repeater code with dependencies base on DOM structure
     // At first reverse repeaters Array to maintain dependencies.
     repeaters.reverse().forEach(function (innerRepeater, index) {
       repeatString = innerRepeater.getAttribute('repeat');
       // repeat = "subset in set | filter > mod"
       params = repeatString.split(' ');
       // params[0] = 'subset' params[1] = 'in' params[2] = 'set'.
       parentRepeater = !~params[2].indexOf('.');
       // params[3] = '|' params[4] = 'filterName' params[5] = '>' params[6] = 'modName'.
       // Get Filter and Modifiers if exist.
       mf = (params[3] && params[3] === '|' || params[3] === '>>') ? mod_and_filter(params.slice(3, params.length).join(' ')) : { mod: undefined, filter: undefined };
       // Replace repeter HTML with repeter function.
       innerRepeater.outerHTML = "'+" + repeaterTemplate(
         // template.
         innerRepeater.outerHTML,
         // repeaterScope.
         parentRepeater ? scope + '.' + params[2] : params[2],
         // localScope.
         params[0],
         // filter.
         mf.filter,
         //  modifier.
         mf.mod) +
        "+'";
     });
     // Interpolate non-repeaters.
     return conditionsValidator(interpolate(template.outerHTML, scope), scope)
       // Replace all HTML escapes: & , > , < .
       .replace(/(&amp;)|(&gt;)|(&lt;)/g, replaceHTMLEsc)
       // Remove returs chars.
       .replace(/\r?\n|\r/g, '')
       // Translate 'tsrc' atribute to 'src'.
       .replace('tsrc', 'src');
   };

   //  Wrap templateFunction with execution function.
   var precompileHTML = function (template) {
     var body = "return '" + templateToFunction(template,'scope') + "';";
    //  console.log(body);  // Debug Function's Code.
     return new Function('scope', 'filters', 'mods', body);
   };

   // Register template with @data.
   var _render = function (templateName, data) {
     // Get only the content withouth origonal wrapper OR return no template string.
     var result = _precompiledTemplates[templateName] ? _precompiledTemplates[templateName](data, _filters, _modifiers).replace(/<(\w*)[^>]*>([\s\S]*?)<\/\1>/, function (a, b, c) { return c }) : '<< NO TEMPLATE >>';
     var ref = _templatesReferences[templateName];
     if (ref) ref.innerHTML = result;
     return result;
  };

   // Register filter.
   var _filter = function (name, callback) {
     if (typeof name === 'string' && typeof callback === 'function') _filters[name] = callback;
     return API;
   };

   // Register modifiers.
   var _modify = function (name, callback) {
     if (typeof name === 'string' && typeof callback === 'function') _modifiers[name] = callback;
     return API;
   };

   // Debug function OR return template function if @name provided.
   var _trace = function (name) {
      if(name) return _precompiledTemplates[name];
      console.log(_precompiledTemplates);
      return API;
   }

   // Public API.
   var API = {
     version  : '0.4.0',
     trace    : _trace,
     render   : _render,
     filter   : _filter,
     modify   : _modify,
     template : _template
   };

   // Return API.
   return API;
 }));
