global <<< require 'prelude-ls'
Jaraw = require 'jaraw'
mongo = require 'mongojs'

const settings = require '../../settings'
const db-name = settings.db.name or 'bot'
const db-collections = <[ mentions receivedPms acknowledgedPms bailiffCases bailiffEvidence ]>
const db = mongo db-name, db-collections

const user-agent = "#{settings.info.name}@#{settings.info.version or '1.0.0'} by #{settings.info.author or ''}"
const username = settings.login.username
const password = settings.login.password
const client-id = settings.oauth.client_id
const secret = settings.oauth.client_secret
const recipient = settings.recipient
const talkative = settings.verbose or false

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
say = -> if talkative => console.log it

## basic login function
login = (cb) ->
   say "#username is initializing"
   robot.login-as-script cb

## takes a number `t` of milliseconds, `f` a function, `n` a string describing `f`, optional arguments and repeats `f` every `t`
repeat = (t, f, n, ...args) ->
   fn = ->
      set-timeout fn, t
      say "Beginning new loop for #n"
      f ...args
   fn!

## takes a regular expression and a string and returns an array of all matches in the string
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

## takes an array and inserts each element into `db-collection`, unless that element is already in (based on a .name attribute)
## useful for putting listings (by using simplify-listing) into a db
commit-array-to-db = (array, collection, cb = id) ->
   arr = []
   if array.length > 0 => for let element, i in array
      (exists) <- check-if-element-in-db element, collection
      if exists => return

      db[collection].insert element
      say "inserted #{element.name} to database #collection"
      arr.push element
      if i == array.length - 1 => return cb arr
   return cb arr

## returns true if `el` is in `collection` of the database, otherwise false
check-if-element-in-db = (el, collection, cb = id) ->
   db[collection].find name: el.name .limit 1 .count (err, count) ->
      ret = count != 0
      cb ret

## sends a reply to `dest` with message `text`
reply-to = (dest, text) ->
   params =
      thing_id: dest
      text: text
      api_type: 'json'
   robot.post "/api/comment", params, (err, res, bod) ->
      if err or not res => return say "Error: reply-to"
      if res.status-code isnt 200 => return say "Error: #{res.status-code}, reply-to"
      return say "Reply sent:\nDest: #dest\nText: #text"

## sends a pm with subject `title` to `receiver` with message `body`
send-pm = (title, body, receiver) ->
   if /\/u\//.test receiver => receiver = unchars receiver[3 to]
   params =
      api_type: 'json'
      subject: title
      text: body
      to: receiver
   robot.post "/api/compose", params, (err, res, bod) ->
      if err or not res => return say "Error: send-pm"
      if res.status-code isnt 200 => return say "Error: #{res.status-code}, send-pm"
      return say "PM sent:\nRecipient: #receiver\nTitle: #title\nBody: #body"

## where the magic happens
module.exports =
   login: login
   recipient: recipient
   send-pm: send-pm
   reply-to: reply-to
   commit-array-to-db: commit-array-to-db
   recurse-through-re: recurse-through-re
   simplify-listing: simplify-listing
   repeat: repeat
   say: say
   robot: robot
   check-if-element-in-db: check-if-element-in-db
