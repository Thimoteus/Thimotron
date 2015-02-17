## MODULES
## -------

{login} = require './core'
{bailiff} = require './bailiff'
{comments-search, self-texts-search, titles-search} = require './search'
{postman} = require './postman'

module.exports =
   comments-search: comments-search
   self-texts-search: self-texts-search
   titles-search: titles-search
   login: login
   bailiff: bailiff
   postman: postman
