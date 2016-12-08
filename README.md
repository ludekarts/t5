# T5
Micro templating engine


## FEATURES v 0.4.0
- data stamping only
- repeaters (with)
 - nested repeaters
 - filters
 - modifiers
- toggle values `( value : condition )`  allows only to   `! && !== === > <`
- not allow to call function and make assigments like: `function_name()` , `a = b`

### Tips
- You need to declare `filters` nad `modifiers` before fetching template. This allows to export whole template code with  filters and modifiers included in `templteFunction`
- Allow only for one interpolation per curlybraces e.g. `{{ interpolation }}` not allow for something like:` {{ interpolation interpolation }}`
- Not Allow for executing code, assigning or arithmetic in template e.g. `{{ run_function() }}` , `{{ var x = 12 }}` , `{{ a = a + b }}`
