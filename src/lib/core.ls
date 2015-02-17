global <<< require 'prelude-ls'
require! {
  'jaraw': Jaraw
  'path': path
}

console.log process.env.SEARCHSUBREDDITS
throw new Error "ouch"

settings =
  info:
    name: process.env.BOTNAME
    author: process.env.BOTMASTER
    version: process.env.BOTVERSION
  login:
    username: process.env.USERNAME
    password: process.env.PASSWORD
  oauth:
    client_id: process.env.CLIENTID
    client_secret: process.env.CLIENTSECRET
  modules:
    run: words process.env.MODULES
    bailiff:
      cycle_time: process.env.BAILIFFCYCLETIME
      subreddit: process.env.BAILIFFSUBREDDIT
    search:
      cycle_time: process.env.SEARCHCYCLETIME
      subreddits: words process.env.SEARCHSUBREDDITS
      search_terms: words process.env.SEARCHTERMS
      ignore_case: true
    postman:
      max: process.env.POSTMANMAX
      cycle_time: process.env.POSTMANCYCLETIME
  verbose: true

user-agent = "#{settings.info.name}@#{settings.info.version or '1.0.0'} by #{settings.info.author or ''}"
username = settings.login.username
password = settings.login.password
client-id = settings.oauth.client_id
secret = settings.oauth.client_secret
recipient = settings.info.author
talkative = settings.verbose

## Jaraw lets us access the reddit API
## with a minimum of hassle.
robot = new Jaraw do
  type: \script
  login:
    username: username
    password: password
  oauth:
    id: client-id
    secret: secret
  user_agent: user-agent
  rate_limit: 1_000ms

## console.log for debugging
say = -> if talkative => console.log it; return it

## basic login function
login = (cb) ->
  say "#username is initializing"
  robot.login-as-script cb

## takes:
## number `t` of milliseconds;
## function `f`;
## string `n`, describes f;
## optional `args`;
## result: repeats `f(args)` every `t` ms
repeat-fn = (t, f, n, ...args) ->
  fn = ->
    say "Beginning new loop for #n"
    f ...args
  fn()
  set-interval fn, t
## in case you want t to be dynamic
repeat-fn2 = (t, f, n, ...args) ->
  fn = ->
    set-timeout fn, t
    say "Beginning new loop for #n"
    f ...args
  fn!

## takes a regular expression and a string
# and returns an array of all matches in the string
recurse-through-re = (re, str) -->
  flag = 'g'
  flag += 'i' if re.ignore-case
  flag += 'm' if re.multiline
  rx = new RegExp re.source, flag
  ret = []
  while hit = rx.exec str
    ret.push hit.1
  return ret

## applies JSON.parse when possible, otherwise is the identity
JSONparse = ->
  try
    b = JSON.parse it
    return b
  catch
    if e instanceof SyntaxError
      return it
    else
      throw e

## useful for simplifying "list" responses from reddit
simplify-listing = JSONparse >> (.data.children) >> map (.data)

## checks if we've posted in a thread before.
## identifier is a string unique to whatever program is checking, i.e.
## have *we* posted here.
## Use '' if you don't want any identifier.
have-we-posted-here = (link, identifier, cb) -->
  ## the selfpost or link we're accessing
  the-link = "/r/#{link.subreddit}/comments/#{link.id}.json"
  ## these should be safe enough,, although the api isn't terribly clear
  ## about whether there are upper bounds on these
  params =
    depth: 20
    limit: 250
  ## returns true if we're found in the comments, else false
  callback = (err, res, bod) ->
    if err or not res => return say 'Error: have-we-posted-here'
    if res.status-code isnt 200
      return say "Error: #{res.status-code}, have-we-posted-here"
    ## checks to see if the body has the identifier
    has-identifier = -> 0 <= it.body.index-of identifier
    ## put a whole lot of comments into an array
    posts = bod |> JSON.parse |> (.1) |> simplify-listing
    we-have = posts
      |> filter (.author is username)
      |> filter has-identifier
      |> or-list
    cb we-have
  robot.get the-link, params, callback

have-we-replied-here = (reply, cb) -->
  ## reply is from a call to /r/(sub)/comments/(article)
  if reply.link_id
    id = link_id |> chars |> drop 3 |> unchars
    the-post = "/r/#{reply.subreddit}/comments/#id/_/#{reply.id}.json"
  ## reply is from a call to /message/(folder)
  else if reply.context
    the-post = reply.context |>
      chars |> reverse |> drop 10 |> reverse |> unchars
  ## not sure how else to get replies?
  else
    throw new Error "I don't recognize this type of reply."

  params =
    limit: 250
    depth: 20

  callback = (err, res, bod) ->
    if err or not res => return say 'Error: haveWeRepliedHere'
    if res.status-code isnt 200
      return say "Error: #{res.status-code}, haveWeRepliedHere"
    ## this only gets the children
    replies-listing = bod
    |> JSON.parse
    |> (.1)
    |> simplify-listing
    |> (.0.replies)
    ## check to see if there are any replies
    if replies-listing
      replies = simplify-listing replies-listing
      return cb any (.author is username), replies
    else
      return cb false

  robot.get the-post, params, callback

## sends a reply to `dest` with message `text`
reply-to = (dest, text) -->
  params =
    thing_id: dest
    text: text
    api_type: 'json'
  robot.post '/api/comment', params, (err, res, bod) ->
    if err or not res => return say 'Error: reply-to'
    if res.status-code isnt 200
      return say "Error: #{res.status-code}, reply-to"
    return say "Reply sent:\nDest: #dest\nText: #text"

## sends a pm with subject `title` to `receiver` with message `body`
send-pm = (title, body, receiver) -->
   if /\/u\//.test receiver => receiver = unchars receiver[3 to]
   params =
      api_type: 'json'
      subject: title
      text: body
      to: receiver
   robot.post '/api/compose', params, (err, res, bod) ->
      if err or not res => return say "Error: send-pm"
      if res.status-code isnt 200
        return say "Error: #{res.status-code}, send-pm"
      return say "PM sent:\nRecipient: #receiver\nTitle: #title\nBody: #body"

## where the magic happens
module.exports =
  login: login
  settings: settings
  recipient: recipient
  send-pm: send-pm
  reply-to: reply-to
  recurse-through-re: recurse-through-re
  simplify-listing: simplify-listing
  repeat-fn: repeat-fn
  say: say
  robot: robot
  have-we-posted-here: have-we-posted-here
  have-we-replied-here: have-we-replied-here
