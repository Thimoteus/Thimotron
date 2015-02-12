{any, lines, unlines, words, unwords, repeat} = require 'prelude-ls'
## useful for taking an array and turning it into a string somehow,
## especially when the first element needs to be different from the rest
transform-strings = (initial, joiner, arr) -->
  the-head = initial + head arr
  the-tail = join joiner, [''] ++ tail arr
  return the-head + the-tail

bulletify = transform-strings '* ' '\n* '

smallify = (n) ->
  initial = repeat n, '^'
  joiner = ' ' + initial
  transform-strings initial, joiner

smallify-str = (n, str) -->
  small = repeat n, '^'
  str |> words |> map (small ++) |> unwords

## global search for a regular expression `rx` and replace with a string `sub`
replace = (rx, sub, str) -->
  ## creates an array of lines, then for each line creates an array of words
  str-matrix = str |> lines |> map words
  ## check if any word tests positive for the regular expression
  while any (any (rx.test _)), str-matrix
    ## replace the first occurance of the match with the substitution
    str-matrix = map (map (.replace rx, sub)), str-matrix
  ## glue the words back into lines, then glue the lines back into a paragraph
  str-matrix |> map unwords |> unlines

unsmallify = replace /\^/ ''

numberify = (strings) ->
  return for str, i in strings
    "[#{i + 1}](#str)"

module.exports =
  bulletify: bulletify
  smallify: smallify
  smallify2: smallify-str
  unsmallify: unsmallify
  replace: replace
  numberify: numberify
