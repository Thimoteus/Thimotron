/* MODULES */

{login, repeat} = require './core'
{bailiff-cycle-time, bailiff} = require './bailiff'
{image-scraper} = require './image-scraper'
{comments-search, self-texts-search, titles-search} = require './search'

module.exports =
   comments-search: comments-search
   self-texts-search: self-texts-search
   titles-search: titles-search
   login: login
   bailiff: -> repeat bailiff-cycle-time, bailiff, 'bailiff'
   image-scraper: image-scraper
