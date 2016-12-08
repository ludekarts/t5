const _keywords = ['console', 'abstract', 'arguments', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'continue', 'default', 'delete', 'do', 'double', 'else', 'eval', 'false', 'final', 'finally', 'float', 'for', 'function', 'goto', 'if', 'implements', 'in', 'instanceof', 'int', 'let', 'long', 'native', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'true', 'try', 'typeof', 'var', 'void', 'volatile', 'while', 'with'];
const dataSource = {
  name: 'Ania',
  active: true,
  age: 33,
  hero: {
    date : 2234563,
    active: true
  },
  heroes: [
    { id: "1", name: 'Batman', alt: 'Bruce Wayne', all: "*" },
    { id: "2", name: 'Flash', alt: ' Barry Allen', all: "*" },
    { id: "3", name: 'Wonder Woman', alt: 'Diana', all: "*" },
    { id: "4", name: 'Cyborg', alt: 'Victor Stone', all: "*" },
    { id: "5", name: 'Superman', alt: 'Clark Kent' , all: "*" },
    { id: "6", name: 'Green Lantern', alt: 'Hal Jordan', all: "*" }
  ]
};

/*
  ---- FEATURES v 0.4.0 ----------------
  -> data stamping only
  -> repeaters (with)
     |-- nested repeaters
     |-- filters
     |-- modifiers
  -> toggle values ( value : condition )  allows only to -->  ! && !== === > <
  -> not allowing to calls, assigments --> function_name() , a = b

 ---- TIPS ----------------------------
 -> Allow only for one interpolation per curlybraces e.g. {{ interpolation }} not allow for something like: {{ interpolation interpolation }}
 -> Not Allow for executing code, assigning or arithmetic in template e.g. {{ run_function() }} , {{ var x = 12 }}, {{ a = a + b }}
*/

const ideal = `
  <ul data-t5="heroes">
    <li id="{{ hero.id }}" repeat="hero in heroes | filter > modify" class="{{ 'hidden' : !hero.active }}">
      <span class="name">{{ hero.name }}</span> <span class="alt">{{ hero.alt }}</span>
    </li>
  </ul>
`;


const template = ''
+'<ul>'
+'<li><span class="{{ \'active\' : name === \'Ania\' && hero.date > 2 }}">Hello {{ name }}</span></li>'
+'<li>{{ heroes[3].name }}, {{ heroes[3].alt }}</li>'
+'<li>'
+'  <span repeat="hero in heroes">{{ hero.name }}</span>'
+'</li>'
+'</ul>';

const mods = {
  emoji (element) {
    return element += " " + String.fromCharCode(0xD83D, 0xDE04);
  }
};

const  filters = {
  even (element) {
    return element % 2 === 0;
  }
};


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

const REPS = document.getElementById('repeaters');
const single = document.getElementById('single');

// Insert inner repeater template.
// const injectRepeater = function (template, irc) {
//     return template.replace(/#%([a-z\s\.]*)%#/g, function (a, key) {
//       return ("'+" + irc[key] + "+'" )|| '';
//     });
// };


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

// let irc = {};
function createRepeaterFunction (template, scope, filters, mods) {
  var repeaters = [].slice.call(template.querySelectorAll('[repeat]'));
  var repeaterKey, params, repeatString, parentRepeater = false, tail;

  // Reverse repeaters Array to maintain dependencies
  // then build inner-repeater code with dependencies base on DOM structure.
  repeaters.reverse().forEach(function (innerRepeater, index) {
    repeatString = innerRepeater.getAttribute('repeat');
    // repeat = "subset in set | filter > mod"
    params = repeatString.split(' ');
    // params[0] = subset.
    // params[1] = in.
    // params[2] = set.
    parentRepeater = !~params[2].indexOf('.');
    // params[3] = |.
    // params[4] = filter.
    // params[5] = >.
    // params[6] = mod.
    tail = (params[3] && params[3] === '|' || params[3] === '>') ? mod_and_filter(params.slice(3, params.length).join(' '), filters, mods) : { mod: undefined, filter: undefined };
    // Replace repeter HTML with repeter function.
    innerRepeater.outerHTML = "'+" + repeaterTemplate(innerRepeater.outerHTML, parentRepeater ? scope + '.' + params[2] : params[2], params[0], tail.filter, tail.mod) + "+'";
  });

  return conditionsValidator(interpolate(template.outerHTML, scope), scope).replace(/(&amp;)|(&gt;)|(&lt;)/g, function (a) {
    return ( a === '&amp;') ? '&' : ( a === '&gt;') ? '>' : ( a === '&lt;') ? '<' : a;
  });
}




// Object.keys(irc).forEach(name => {
//   irc[name] = injectRepeater(irc[name], irc);
//   // console.log(irc[name], '\n\n');
// })
//
// console.log(irc['subset in set'].replace(/[\n\t]+/g, ''));


const build = function (template, filters, mods) {
  let body = "return '" + createRepeaterFunction(template,'data', filters, mods).replace(/[\n\t]+/g,'') + "';";
  console.log(body);
  return new Function('data', body);
}

single.innerHTML = build(single, filters, mods)(singleData);


// const st = '<li repeat="subset in set">{{ subset.name }}</li>';
// console.log(repeaterTemplate(st, 'item', 'subset'));

// console.log(
// (function(scope, filter, mod) {
//     return scope.reduce(function(result, subset, index) {
//         if (filter && !filter(subset))
//             return result;
//         subset = mod
//             ? mod(subset)
//             : subset;
//         return result += '<li repeat="subset in set">' + subset.name + '</li>';
//     }, '');
// }(silgleData.set, filters['even'], mods['emoji'])), silgleData);


// single.innerHTML = (function (repeaterArray, filter, mod) {
//   return repeaterArray.reduce(function (result, subset, index) {
//     if (filter && !filter(subset)) return result;subset = mod ? mod(subset) : subset;
//     return result += '<li repeat="subset in set"><span>'+subset.name+'</span><ul>'+
//         (function (repeaterArray, filter, mod) {
//           return repeaterArray.reduce(function (result, deep, index) {
//             if (filter && !filter(deep))
//             return result;deep = mod ? mod(deep) : deep;
//             return result += '<li repeat="deep in subset.deep">'+deep.name+', '+
//               (function (repeaterArray, filter, mod) {
//                 return repeaterArray.reduce(function (result, num, index) {
//                   if (filter && !filter(num)) return result;num = mod ? mod(num) : num;
//                   return result += '<span repeat="num in deep.deeper">'+num+'</span>';}, '');
//                 }(deep.deeper, undefined, undefined))+'</li>';}, '');
//               }(subset.deep, undefined, undefined))+'</ul></li>';}, '');
//           }(silgleData.set, undefined, undefined))

// single.innerHTML =
// (function (repeaterArray, filter, mod) {return repeaterArray.reduce(function (result, subset, index) {if (filter && !filter(subset)) return result;subset = mod ? mod(subset) : subset;return result += '<li repeat="subset in set">      <span>'+subset.name+'</span>      <ul>        '+(function (repeaterArray, filter, mod) {return repeaterArray.reduce(function (result, deep, index) {if (filter && !filter(deep)) return result;deep = mod ? mod(deep) : deep;return result += '<li repeat="deep in subset.deep">          <p>'+deep.name+', '+deep.deeper[2]+' </p>          '+(function (repeaterArray, filter, mod) {return repeaterArray.reduce(function (result, num, index) {if (filter && !filter(num)) return result;num = mod ? mod(num) : num;return result += '<span repeat="num in deep.deeper">'+num+'</span>';}, '');}(deep.deeper, undefined, undefined))+'          '+(function (repeaterArray, filter, mod) {return repeaterArray.reduce(function (result, double, index) {if (filter && !filter(double)) return result;double = mod ? mod(double) : double;return result += '<span repeat="double in deep.deeper" class="active">'+double+'</span>';}, '');}(deep.deeper, undefined, undefined))+'        </li>';}, '');}(subset.deep, undefined, undefined))+'      </ul>    </li>';}, '');}
// (singleData.set, undefined, undefined))


// single.innerHTML = (function(data) {
// }(singleData));
