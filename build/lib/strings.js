(function(){
  var ref$, any, lines, unlines, words, unwords, repeat, transformStrings, bulletify, smallify, smallifyStr, replace, unsmallify, numberify, slice$ = [].slice;
  ref$ = require('prelude-ls'), any = ref$.any, lines = ref$.lines, unlines = ref$.unlines, words = ref$.words, unwords = ref$.unwords, repeat = ref$.repeat;
  transformStrings = curry$(function(initial, joiner, arr){
    var theHead, theTail;
    theHead = initial + head(arr);
    theTail = join(joiner, [''].concat(tail(arr)));
    return theHead + theTail;
  });
  bulletify = transformStrings('* ', '\n* ');
  smallify = function(n){
    var initial, joiner;
    initial = repeat(n, '^');
    joiner = ' ' + initial;
    return transformStrings(initial, joiner);
  };
  smallifyStr = curry$(function(n, str){
    var small;
    small = repeat(n, '^');
    return unwords(
    map((function(it){
      return small.concat(it);
    }))(
    words(
    str)));
  });
  replace = curry$(function(rx, sub, str){
    var strMatrix;
    strMatrix = map(words)(
    lines(
    str));
    while (any(any(partialize$.apply(rx, [rx.test, [void 8], [0]])), strMatrix)) {
      strMatrix = map(map(fn$), strMatrix);
    }
    return unlines(
    map(unwords)(
    strMatrix));
    function fn$(it){
      return it.replace(rx, sub);
    }
  });
  unsmallify = replace(/\^/, '');
  numberify = function(strings){
    var i, str;
    return (function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = strings).length; i$ < len$; ++i$) {
        i = i$;
        str = ref$[i$];
        results$.push("[" + (i + 1) + "](" + str + ")");
      }
      return results$;
    }());
  };
  module.exports = {
    bulletify: bulletify,
    smallify: smallify,
    smallify2: smallifyStr,
    unsmallify: unsmallify,
    replace: replace,
    numberify: numberify
  };
  function curry$(f, bound){
    var context,
    _curry = function(args) {
      return f.length > 1 ? function(){
        var params = args ? args.concat() : [];
        context = bound ? context || this : this;
        return params.push.apply(params, arguments) <
            f.length && arguments.length ?
          _curry.call(context, params) : f.apply(context, params);
      } : f;
    };
    return _curry();
  }
  function partialize$(f, args, where){
    var context = this;
    return function(){
      var params = slice$.call(arguments), i,
          len = params.length, wlen = where.length,
          ta = args ? args.concat() : [], tw = where ? where.concat() : [];
      for(i = 0; i < len; ++i) { ta[tw[0]] = params[i]; tw.shift(); }
      return len < wlen && len ?
        partialize$.apply(context, [f, ta, tw]) : f.apply(context, ta);
    };
  }
}).call(this);
