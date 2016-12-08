/**
 * T5
 * Micro templete engine with user-friendly markup, nested repeaters, custom fiilters adn output modifiers.
 *
 * version : 0.4.0
 * author  : Wojciech Ludwin 2016
 * contact : ludekarts@gmail.com, wldesign.pl
 * webpage : www.wldesign.pl
 * license : MIT
 */


// Prefix interpolations' values with @scope name.
const prefixWithScope = function (expression, scope) {
  scope = scope || 'scope';
  return expression.replace(/'[a-zA-Z+\.]+'|([a-zA-Z+\.]+)/g, function(quoted, nonquoted) {
    return nonquoted ? scope + '.' + nonquoted : quoted;
  });
};

// Interpolate values in curlybraces: {{ interpolation }}
const interpolate = function (template, scope) {
  return template.replace(/\{\{\s*([0-9A-Za-z\.\[\]]+?)\s*\}\}/g, function (curlyString, value) {
    return "'+"+ (scope ? scope + "." : "") + value +"+'";
  })
}

// Find condition statements like:
// {{ result : conditions }}
// and change it to:
// (conditions ? result : null);
const conditionsValidator = function (body, scope) {
  return body.replace(/\{\{\s*([\w\']+\.*\w*\s*\:{1}\s*([0-9\!\w\.])+(([0-9\w\s\!\.\>\<&\'])*(={2,3})*)*)\s*\}\}/g, function (curlyString, value) {
    const values = prefixWithScope(value, scope).split(':');
    return "'+ ((" + values[1] + ") ? "+ values[0] +" : '') +'";
  })
}


// Render single repeater functions.
const repeaterTemplate = function (template, repeaterScope, localScope, filter, mod) {
  return ""
  +"(function (repeaterArray, filter, mod) {"
        // Clone template for @repeaterArray.
  +     "return repeaterArray.reduce(function (result, "+ localScope +", index) {"
        // When filter finds value."
  +     "if (filter && !filter(" + localScope + ")) return result;"
        // Modify current scope if mod exist.
  +     ""+ localScope +" = mod ? mod(" + localScope + ") : " + localScope + ";"
        // Interpolate template.
  +     "return result += \'"+ conditionsValidator(interpolate(template)) + "\';"
  +   "}, '');"
  +"}("+ repeaterScope +", "+ filter +", " + mod + "))";
};


// Exreact Modificator & Filter names.
function mod_and_filter (expresion, filters, mods) {
  let modName = expresion.match(/\>+\s*(\w+)/);
  let filterName = expresion.match(/\|+\s*(\w+)/);
  return {
    mod: mods[modName ? modName[1] : ''],
    filter: filters[filterName ? filterName[1] : '']
  }
}

function createRepeaterFunction (template, scope, filters, mods) {
  var repeaters = [].slice.call(template.querySelectorAll('[repeat]'));
  var repeaterKey, params, repeatString, parentRepeater = false, tail;
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
    tail = (params[3] && params[3] === '|' || params[3] === '>') ? mod_and_filter(params.slice(3, params.length).join(' '), filters, mods) : { mod: undefined, filter: undefined };
    // Replace repeter HTML with repeter function.
    innerRepeater.outerHTML = "'+" + repeaterTemplate(innerRepeater.outerHTML, parentRepeater ? scope + '.' + params[2] : params[2], params[0], tail.filter, tail.mod) + "+'";
  });
  // Interpolate non repeaters.
  return conditionsValidator(interpolate(template.outerHTML, scope), scope)
    // Replace all HTML escapes: & , > , < .
    .replace(/(&amp;)|(&gt;)|(&lt;)/g, function (a) {
      return ( a === '&amp;') ? '&' : ( a === '&gt;') ? '>' : ( a === '&lt;') ? '<' : a;
    })
    // Remove tabs and spaces.
    .replace(/[\t\s]+/g,' ');
}

const build = function (template, filters, mods) {
  let body = "return '" + createRepeaterFunction(template,'data', filters, mods) + "';";
  // console.log(body);  // Debug Function Code.
  return new Function('data', body);
}
