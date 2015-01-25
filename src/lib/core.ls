global <<< require 'prelude-ls'
Jaraw = require 'jaraw'
mongo = require 'mongojs'

const settings = require '../../settings'
const db-name = settings.db.name or 'bot'
const db-collections = <[ mentions receivedPms acknowledgedPms bailiffCases ]>
const db = mongo db-name, db-collections

const user-agent = "#{settings.info.name}@#{settings.info.version or '1.0.0'} by #{settings.info.author or ''}"
const username = settings.login.username
const password = settings.login.password
const client-id = settings.oauth.client_id
const secret = settings.oauth.client_secret
const recipient = settings.recipient
const talkative = settings.verbose or false

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

say = -> console.log it if talkative

# basic login function
login = (cb) ->
   say "#username is initializing"
   robot.login-as-script cb

# takes a number t of milliseconds, f a function, n a string describing f, optional arguments and repeats f every t
repeat = (t, f, n, ...args) ->
   fn = ->
      set-timeout fn, t
      say "Beginning new loop for #n"
      f ...args
   fn!

# takes a regular expression and a string and returns an array of all matches in the string
recurse-through-re = (re, str) -->
   flag = 'g'
   flag += 'i' if re.ignore-case
   flag += 'm' if re.multiline
   rx = new RegExp re.source, flag
   ret = []
   while hit = rx.exec str
      ret.push hit.1
   return ret

# applies JSON.parse when possible, otherwise is the identity
JSONparse = ->
   try
      b = JSON.parse it
      return b
   catch
      if e instanceof SyntaxError
         return it
      else
         throw e

# useful for simplifying listing responses from reddit
simplify-listing = JSONparse >> (.data.children) >> map (.data)

# takes an array and inserts each element into `db-collection`, unless that element is already in (based on a .name attribute)
commit-array-to-db = (array, collection, cb = id) ->
   arr = []
   if array.length > 0
      (element, i) <- array.forEach
      (err, count) <- db[collection].find name: element.name .limit 1 .count
      if count is 0
         db[collection].insert element
         say "inserted #{element.name} to database"
         arr.push element
      if i == array.length - 1 => return cb arr
   else
      return cb arr

# sends a reply to `dest` with message `text`
reply-to = (dest, text) ->
   params =
      thing_id: dest
      text: text
      api_type: 'json'
   robot.post "/api/comment", params, (err, res, bod) ->
      if err or not res => return say "Something went wrong, reply-to"
      if res.status-code isnt 200 => return say "Something went wrong: #{res.status-code}, reply-to"
      return say "Reply sent:\nDest: #dest\nText: #text"

# sends a pm with subject `title` to `recipient` with message `body`
send-pm = (title, body, recipient) ->
   if /\/u\//.test recipient => recipient = unchars recipient[3 to]
   params =
      api_type: 'json'
      subject: title
      text: body
      to: recipient
   robot.post "/api/compose", params, (err, res, bod) ->
      if err or not res => return say "Something went wrong, send-pm"
      if res.status-code isnt 200 => return say "Something went wrong: #{res.status-code}, send-pm"
      return say "PM sent:\nRecipient: #recipient\nTitle: #title\nBody: #body"

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
   db: db
