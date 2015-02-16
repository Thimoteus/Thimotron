global <<< require 'prelude-ls'
require! {
  './core': {
    settings
    recipient
    say
    robot
    repeat-fn
    simplify-listing
    send-pm
  }
}
settings = settings.modules.search
subs = settings.subreddits
cycle-time = settings.cycle_time or 60_000ms
username = robot.options.login.username

## turns the search string into a regexp
flag = if settings.ignore_case then 'ig' else 'g'
rxs = [ new RegExp term, flag for term in settings.search_terms ]

## search
## ------
search = (opts, cb = id) !-->
  ## parse the options
  url-param = opts.url-param
  text-property = opts.text-property
  after = opts.after or false
  limit = opts.limit or 100

  ## returns true if at least one of the regexps matches, otherwise false
  parse-text = -> return fold1 (or), [rx.test it[text-property] for rx in rxs]

  ## recursing will search into the past, essentially like continuously
  ## clicking on "view more: **next**"
  recurse = after is true or is-type 'String' after
  params = limit: limit
  if recurse => params.after = after

  (sub) <- subs.forEach
  (err, res, bod) <- robot.get "/r/#{sub}/#{url-param}.json" params
  if err or not res => return say 'Error: search'
  if res.status-code isnt 200 => return say "Error: #{res.status-code}, search"

  ## takes only the posts with our search terms in them
  parsed-text = bod |> simplify-listing |> filter parse-text

  cb parsed-text

  if recurse
    params =
      after: JSON.parse bod .data.after
      url-param: url-param
      text-property: text-property
    search params, cb

#TODO: substr is a duplicated function also found in bailiff.ls
substr = (sub, str) --> new RegExp sub .test str
send-notification = (list, cb = id) -->
  robot.get '/messages/sent.json', limit: 100, (err, res, bod) ->
    if err or not res => return say 'Error: sendNotification2'
    if res.status-code isnt 200
      return say "Error: #{res.status-code}, sendNotification2"
    ## take the bodies of each sent pm
    pm-bodies = bod |> simplify-listing |> map (.body)
    ## take the ids of each list item
    ids = map (.id), list
    ## test to see if a given id shows up in the pm bodies
    notified-test = (id) -> any (substr id), pm-bodies
    ## apply test to each id to get an array of booleans telling us
    ## which ids have already shown up in sent pms
    notified-booleans = map notified-test, list-ids
    ## pair up the list items with their booleans
    notification-pairs = zip list, notified-booleans
    ## reject any items who've already been sent
    to-update = reject (.1), notification-pairs
    ## send pms for each item that hasn't been sent
    pm-updates to-update

## searches the bodies of 'selftext' posts
search-self-texts = search {url-param: 'new', text-property: 'selftext'}
## searches comments
search-comments = search {url-param: 'comments', text-property: 'body'}
## searches the titles of posts
search-titles = search {url-param: 'new', text-property: 'title'}

## PMing
## -----
pm-updates = (array) ->
   ## don't send a pm if we didn't get any hits
   if array.length == 0 => return

   ## gets the (first) search term hit in the text that we know has a hit
   get-keyword-from = (post) ->
      rebuilt = (rxs) -> [ new RegExp rx.source, 'i' for rx in rxs ]
      for prop in <[ selftext body title ]> when prop of post
         for rx in rebuilt rxs
            if rx.test post[prop] => return rx.exec post[prop] .0

   ## creates the message to PM.
   ## includes the author, keyword and a link with context, plus the sub in which it appeared.
   msg = ''
   for post in array
      keyword = get-keyword-from post or 'one of your keywords'
      switch
      | /t3/.test post.name => msg := msg + "\n\n> `#{post.author}` mentioned [#keyword](#{post.url}?context=3) `in` /r/#{post.subreddit}"
      | /t1/.test post.name
         url = "/r/#{post.subreddit}/comments/#{join '' post.link_id[3 to]}/#{username}/#{post.id}?context=3"
         msg := msg + "\n\n> /u/#{post.author} mentioned [#keyword](#{url}) in /r/#{post.subreddit}"
   msg += "\n\nThis has been a service by #username."
   send-pm "Someone mentioned #keyword", msg, recipient

## repeats the search, commits hits to the 'mention' db, then sends pms
repeat-self-texts-search = -> repeat-fn cycle-time, search-self-texts, 'self-texts-search', (posts) -> commit-array-to-db posts, 'mentions', pm-updates
repeat-comments-search = -> repeat-fn cycle-time, search-comments, 'comments-search', (comments) -> commit-array-to-db comments, 'mentions', pm-updates
repeat-comments-search2 = -> repeat-fn cycle-time, search-comments, 'commentsSearch', send-notification
repeat-title-search = -> repeat-fn cycle-time, search-titles, 'titles-search', (titles) -> commit-array-to-db titles, 'mentions', pm-updates

module.exports =
   comments-search: repeat-comments-search
   comments-search2: repeat-comments-search2
   self-texts-search: repeat-self-texts-search
   titles-search: repeat-title-search
