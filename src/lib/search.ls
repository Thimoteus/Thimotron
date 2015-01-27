global <<< require 'prelude-ls'
{recipient, say, robot, repeat, simplify-listing, send-pm, commit-array-to-db} = require './core'
settings = require '../../settings' .modules.search
subs = settings.subreddits
cycle-time = settings.cycle_time or 60000
username = robot.options.login.username

const re = do ->
   flag = if settings.ignore_case then \ig else \g
   new RegExp settings.search_string, flag

search = (opts, cb = id) !-->
   url-param = opts.url-param
   text-property = opts.text-property
   after = opts.after or false
   limit = opts.limit or 100

   parse-text = -> if re.test it[text-property] then return true else return false
   recurse = after is true or is-type 'String' after
   params = limit: limit
   if recurse => params.after = after

   (sub) <- subs.forEach
   (err, res, bod) <- robot.get "/r/#{sub}/#{url-param}.json" params
   if err or not res => return say "Something went wrong, search"
   if res.status-code isnt 200 => return say "Something went wrong: #{res.status-code}, search"

   try
      parsed-text = bod |> simplify-listing |> filter parse-text
   catch
      if e instanceof SyntaxError
         say "Reddit took too long to respond"
         return
      else
         say res.status-code if res?.status-code?
         say bod if bod?
         return

   cb parsed-text
   if recurse
      search {after: JSON.parse(bod).data.after, url-param: url-param, text-property: text-property}, cb

search-self-texts = search {url-param: 'new', text-property: 'selftext'}
search-comments = search {url-param: 'comments', text-property: 'body'}
search-titles = search {url-param: 'new', text-property: 'title'}

pm-updates = (array) ->
   return if array.length is 0
   msg = "`The following are mentions you may be interested in:`"
   array.forEach (post) ->
      | post.name is /t3/ => msg := msg + "\n\n> `#{post.author}` [posted](#{post.url}) `in` /r/#{post.subreddit}"
      | post.name is /t1/
         url = "/r/#{post.subreddit}/comments/#{join '' post.link_id[3 to]}/#{username}/#{post.id}"
         msg := msg + "\n\n> /u/#{post.author} [posted](#{url}) in /r/#{post.subreddit}"
   msg += "\n\n`This has been a service by #username`"
   send-pm "Someone mentioned #{settings.search_string}", msg, recipient

repeat-self-texts-search = -> repeat cycle-time, search-self-texts, 'self-texts-search', (posts) -> commit-array-to-db posts, 'mentions', pm-updates
repeat-comments-search = -> repeat cycle-time, search-comments, 'comments-search', (comments) -> commit-array-to-db comments, 'mentions', pm-updates
repeat-title-search = -> repeat cycle-time, search-titles, 'titles-search', (titles) -> commit-array-to-db titles, 'mentions', pm-updates

module.exports =
   comments-search: repeat-comments-search
   self-texts-search: repeat-self-texts-search
   titles-search: repeat-title-search
