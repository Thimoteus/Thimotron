global <<< require 'prelude-ls'
require! 'fs'
require! 'path'
require! 'request'
{say, simplify-listing, robot} = require './core'
settings = require '../../settings' .modules<[ image-scraper ]>
subs = settings.subreddits
dl-dir = settings.download_directory or './'
fs.exists dl-dir, (exists) -> if not exists => throw new Error "bad download directory"
image-limit = settings.image_limit or 50

domain = settings.domain or 'imgur.com'
re = new RegExp domain

## get image links
## ---------------
get-image-links = (opts, cb = id) ->
   # parse options
   if typeof! opts is 'Function' => [opts, cb] = [{}, opts]
   after = opts.after or null
   params =
      after: after
      limit: image-limit

   # we only want domains we know how to handle
   good-domain = -> re.test it.domain
   # we can't handle albums yet, so we have to test for them
   an-album = -> /\/a\//.test it.url
   # would rather download securely
   securify = (url) ->
      if /http:/.test url
         return url.replace /http:/, 'https:'
      return url

   for let sub in subs

      (err, res, bod) <- robot.get "/r/#{sub}/new.json", params
      if err or not res => return say "Error: get-image-links"
      if res.status-code isnt 200 => return say "Error: #{res.status-code}, get-image-links"

      after = JSON.parse bod .data.after
      ## turns the reddit response into an array of picture urls
      urls = bod |> simplify-listing |> filter good-domain |> filter (not) << an-album |> map (.url) |> map securify

      cb urls, after

download-image-links = (urls, cb = id) ->
   filename = (url) -> /com\/(.+)$/.exec url .1
   say "there are #{urls.length} images to download"

   for let url, i in urls
      say "downloading file #{i+1}"
      destination = path.join dl-dir, filename url
      request url .pipe fs.createWriteStream destination

   cb urls

image-scraper = ->
   say "scraping #{join ', ' subs} for up to #image-limit images from #domain into #dl-dir"
   get-image-links (urls) -> download-image-links urls

module.exports =
   image-scraper: image-scraper
