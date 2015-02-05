## MODULES
## -------

{login, repeat} = require './core'
{bailiff} = require './bailiff'
{image-scraper} = require './image-scraper'
{comments-search, self-texts-search, titles-search} = require './search'

module.exports =
   comments-search: comments-search
   self-texts-search: self-texts-search
   titles-search: titles-search
   login: login
   bailiff: bailiff
   image-scraper: image-scraper
