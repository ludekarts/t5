  /**
   * T5
   * Micro templete engine with user-friendly markup, nested repeaters and custom fiilters.
   *
   * version : 0.3.0
   * author  : Wojciech Ludwin 2016
   * contact : ludekarts@gmail.com, wldesign.pl
   * webpage : www.wldesign.pl
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
   var _templatesReferences = {};
   var _precompiledTemplates = {};
   var _slice = Array.prototype.slice;
   var _keywords = ['console', 'abstract', 'arguments', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'continue', 'default', 'delete', 'do', 'double', 'else', 'eval', 'false', 'final', 'finally', 'float', 'for', 'function', 'goto', 'if', 'implements', 'in', 'instanceof', 'int', 'let', 'long', 'native', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'true', 'try', 'typeof', 'var', 'void', 'volatile', 'while', 'with'];

   // Register templates as HTML-templat- string & stroe it under the @name.
   function _template (templateStr, name) {
     if (templateStr && name) {
       //Convert HTML source to DOM Element.
       var wrapper = document.createElement('div');
       var stub = document.createRange().createContextualFragment(templateStr);
       wrapper.appendChild(stub);
       _precompiledTemplates[name] = precompileHTML(wrapper.firstChild);

       wrapper = null;
       stub = null;
       return API;
     }

     //  Get all nodes with 'data-t5' attribute as @name.
     else {
       var allTemplates = _slice.call(document.querySelectorAll('[data-t5]')) || [];
       allTemplates.forEach(function (template) {
         var name = template.getAttribute('data-t5');
         if (name) {
           var clone = template.cloneNode(true);
           clone.removeAttribute('data-t5');
           // Bail if Repader doesn't have wrapper.
           if (clone.getAttribute('repeat')) throw new Error ('Repeater: "' + name + '" does not have a wrapper node!');
           _precompiledTemplates[name] = precompileHTML(clone);
           _templatesReferences[name] = template;
           clone = null;
         }
       });
      return API;
     }
   }

   // Create code snippet with proper scope.path -> access to value.
   // In vase of detecting '#' its wrap all expresion in to '(...)' to eveluate it properly.
   function parseInterpolations(value, scopeName) {
     var code = (((_keywords.indexOf(value) === -1) && (value.indexOf('.') !== 0)) ? ((scopeName ? (scopeName + '.') : '') + value) : value);
     return (value.indexOf('#') === 0) ? "'+(" + code.replace('#','') + ")+'" : "'+" + code + "+'";
   };

   // Create repeater function with proper scope names.
   function createRepeaterFunction(repeater, scopeName, dataName, parentScope, filter) {
     if (parentScope) {
       return " (function (" + parentScope + ") { var result = ''; " + dataName + ".forEach(function (" + scopeName + ") { " + ( filter ? "if (filters['" + filter + "'](" + scopeName + "))" : "") + "result += '" + repeater.outerHTML.replace(/\{\{([\s\S]+?(\}?)+)\}\}/g, function (a, b) {
         return parseInterpolations(b);
       }) + "'; }); return result; }(" + parentScope + ")) ";
     } else {
       return " (function (data) { var result = ''; data." + dataName + ".forEach(function (" + scopeName + ") { " + ( filter ? "if (filters['" + filter + "'](" + scopeName + "))" : "") + " result += '" + repeater.outerHTML.replace(/\{\{([\s\S]+?(\}?)+)\}\}/g, function (a, b) {
         return parseInterpolations(b);
       }) + "'; }); return result; }(data)) ";
     }
   };

   // Inject Inner-repeater interpolated code.
   function inject(code, irc) {
     code = code
       // Interpolate.
       .replace(/\{\{([\s\S]+?(\}?)+)\}\}/g, function (a, b) {
         return parseInterpolations(b);
       })
       // Insert inner repeater template.
       .replace(/#%([a-z\s\.]*)%#/g, function (a, key) {
         return irc[key] || '';
       });

     return (code.match(/#%([a-z\s\.]*)%#/)) ? inject(code, irc) : code;
   };

   // Creat Function code for nested repeaters.
   function deepRepeaterFunction(repeater, scopeName, dataName, gfilter) {
     var repeaters = _slice.call(repeater.querySelectorAll('[repeat]'));
     // Inner Repeaters Container.
     var irc = {};

     // reverse Array to maintain dependencies.
     repeaters.reverse();
     // Build inner repeater code with dependencies base on DOM structure.
     repeaters.forEach(function (innerRepeater) {
       var repeatString = innerRepeater.getAttribute('repeat');
       var params = repeatString.split(' ');
       var repeaterKey = params.slice(0, 3).join(' ');
       var parentScope = params[2].slice(0, params[2].indexOf('.'));
       var filter = undefined;
       // Setup filter.
       if (params[3] && params[3] === '|') filter = params[4];
       // Stamp unique identification key for deep-repeater.
       innerRepeater.outerHTML = "#%" + repeaterKey + "%#";
       irc[repeaterKey] = "'+" + createRepeaterFunction(innerRepeater, params[0], params[2], parentScope, filter) + "+'";
     });

     return " (function (data) { var result = '';  data." + dataName + ".forEach(function (" + scopeName + ") { " + ( gfilter ? "if (filters['" + gfilter + "'](" + scopeName + "))" : "") + " result += '" + inject(repeater.outerHTML, irc) + "'; }); return result; }(data)) ";
   }

   function findRepeaters(repeatersFunc, node, parentScope) {
     var repeater = node.querySelector('[repeat]');
     // For each repeater on highest level - build the Function code.
     while (repeater) {
       var repeatString = repeater.getAttribute('repeat');
       var params = repeatString.split(' ');
       var repeaterKey = params.slice(0, 3).join(' ');
       var inner = repeater.querySelector('[repeat]');
       var filter = undefined;
       // Setup filter.
       if (params[3] && params[3] === '|') filter = params[4];
       // When have Inner repeaters -> Get code for inner repeaters /OR/ Get code for repeater on deep levels.
       repeatersFunc[repeaterKey] = (inner) ? deepRepeaterFunction(repeater, params[0], params[2], filter) : createRepeaterFunction(repeater, params[0], params[2], undefined, filter);
       // Clear content, to not search again throuht this node.
       repeater.outerHTML = '#' + repeaterKey + '#';
       repeater = node.querySelector('[repeat]');
     }
     return repeatersFunc;
   };

   function precompileHTML(node) {
     var body = "return '";
     var scopeName = 'data';
     var repeatersFunc = {};
     var clone = node.cloneNode(true);

     repeatersFunc = findRepeaters({}, clone, undefined);

     body += clone.outerHTML
       // Replace single quotes to double quotes.
       .replace(/\'/g, '\"')
       // Find repeaters.
       .replace(/#([a-zA-Z\s]*)#/g, function mapRepeatersFunc(a, key) {
         return "'+" + repeatersFunc[key] + "+'";
       })
       // Find interpolations.
       .replace(/\{\{([\s\S]+?(\}?)+)\}\}/g, function findInterpolates(a, b) {
         return parseInterpolations(b, scopeName);
       })
       // Remove returs chars.
       .replace(/\r?\n|\r/g, '')
       // Translate 'tsrc' atribute to 'src'.
       .replace('tsrc', 'src')
       // Return body of Result function.
       + "';";

     //console.log(body);
     clone = null;
     return new Function(scopeName, 'filters', body);
   };

   // Register template with @data.
   function _render(templateName, data) {
     var result = _precompiledTemplates[templateName] ? _precompiledTemplates[templateName](data, _filters) : '<< NO TEMPLATE >>';
     var ref = _templatesReferences[templateName];
     if (ref) ref.innerHTML = result;
     return result;
  };

   // Register filter.
   function _filter (name, callback) {
     if (typeof name === 'string' && typeof callback === 'function') _filters[name] = callback;
     return API;
   };

   // Debug function.
   function _trace () {
     console.log(_precompiledTemplates);
     return API;
   }

   // Public API.
   var API = {
     version  : '0.3.0',
     trace    : _trace,
     render   : _render,
     filter   : _filter,
     template : _template
   };

   // Return API.
   return API;
 }));
