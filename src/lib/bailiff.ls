## requirements
global <<< require 'prelude-ls'
require! 'request'
{settings, repeat-fn, check-if-element-in-db, recipient, robot, say, simplify-listing, send-pm, reply-to, commit-array-to-db, recurse-through-re} = require './core'
{smallify, bulletify, numberify} = require './strings'
Inbox = require './mail'
settings = settings.modules.bailiff
subreddit = settings.subreddit
username = robot.options.login.username
inbox = new Inbox

## useful functions
same-length = (==) `over` (.length)

substr = (sub, str) -> new RegExp sub .test str

wholestr = (sub, str) -> new RegExp "^#{sub}$" .test str

spoiler = (link, spoiler) -> "[#link](\#s '#spoiler')"

## some people hate bots, so this humanizes it a little bit
roles =
   * "the guy who plays AC/DC in the back of the room, not paying attention to the trial."
   * "Zoidberg (\/)(°,,,°)(\/)"
   * "the guy who gasps at the inhumanity ⊙▃⊙"
   * "the guy who stands in the back, wearing sunglasses and saying nothing (̿▀̿ ̿Ĺ̯̿̿▀̿ ̿)̄"
   * "a teddy bear! ʕ´•ᴥ•`ʔ"
   * "Homer J. Simpson ~(8 ^(| )"
   * "sitting in the corner, not doing anything, not doing anything at all ... "
   * "Groot. **I AM GROOT.**"
   * "the guy who sells combination Indian/Pakistani/Mexican food. But only dishes that combine all three."
   * "the world's smallest violinist, playing the world's largest violin ♫"
   * "someone who tells you how good cake is, while his mouth is full of cake. MM, MM."
   * "Maximus Decimus Meridius, father to a murdered son, husband to a murdered wife. And I will have my vengeance, in this life or the next."
   * "the guy who [spoils](\#s 'Snape kills Dumbledore') Harry Potter."
   * "the guy who [spoils](\#s 'Jesus dies') Passion of the Christ."
   * "the guy who [spoils](\#s 'Darth Vader is Luke's father') Star Wars."

get-random-element-from = (list) -->
   ind = floor Math.random() * list.length
   return list[ind]

get-defendants-from-title = (title) ->
   defendants = /.+VS\.?(.+)FOR.+/gi.exec title
   if defendants => defendants = defendants.1
   users = recurse-through-re /(\/u\/\w+)/ig, defendants
   return users

get-charges-from-body = (body) ->
   charges = recurse-through-re /^\*\*CHARGE:?\*\*\s*(.+)$/gm, body
   return charges

get-defendants-from-confirmation = (pm) ->
   defendants = recurse-through-re /^\* (\/u\/\w+)$/img, pm
   return defendants

get-charges-from-confirmation = (pm) ->
   charges = recurse-through-re //^\*\s([^/u/].+)$//m, pm
   return charges

## SUMMONER
## --------

summons-text = (charges, id) ->
   ## make a nice link from the id
   case-link = "http://redd.it/#id"
   ## charges is an array
   charges = bulletify charges
   ## Article IV of the constitution
   satirical = 'https://www.reddit.com/r/KarmaCourt/wiki/constitution#wiki_article_iv._karmacourt_is_funny_satire'
   ## Bill of rights
   rights = 'https://www.reddit.com/r/KarmaCourt/wiki/constitution#wiki_article_vi._the_bill_of_rights'

   ## the summons text
   msg = """
   You are hereby summoned to /r/KarmaCourt on the following charges:

   #charges

   Your court case can be found [here](#{case-link}).

   ---

   If no one represents you the case will not go forward.
   You may represent yourself.

   KarmaCourt is [satirical](#satirical)
   and not to be taken seriously.

   Know your [rights](#rights).
   """
   return msg

send-summons = (case-id, charges, defendants) ->
   msg = summons-text charges, case-id
   for let scumbag in defendants => send-pm "KARMACOURT SUMMONS", msg, scumbag

declare-bailiffness-to-court = (case-id, reply-name, charges, defendants) ->
   ## defendants is an array
   defendants = defendants |> map (.toLowerCase!) |> join ', '
   ## the actual summons text, charges is also an array
   summons = summons-text charges, case-id

   msg = """
   The following scumbag(s) have been automatically summoned:

   #defendants

   The summons text is as follows:

   ---
   ---

   #summons

   ---
   ---

   """
   reply-to reply-name, msg

check-mail = ->

   ## mentions should only be used for summons
   inbox.get-mentions (err, res, bod) ->
      if err or not res => return say 'Error: inbox.get-mentions'
      if res.status-code isnt 200 => return say "Error: #{res.status-code}, inbox.get-mentions"

      ## if we're summoned, let's check the facts of the case
      for let pm in bod => check-case pm

   ## comment replies are only for checking if the bot got the defendants/charges right
   inbox.get-comment-replies (err, res, bod) ->
      if err or not res => return
      if res.status-code isnt 200 => return say "Error: #{res.status-code}, inbox.get-replies"

      ## someone responded to one of our comments, let's see if it confirmed the info we got
      for let reply in bod => confirm-case reply

confirm-case = (reply) ->
   ## mustn't be summoned by random people
   if reply.author isnt recipient => return

   valid-confirmations =
      * "yes"
      * "y"
      * "You're goddamn right."

   is-valid = fold1 (or), [wholestr conf, reply.body for conf in valid-confirmations]
   if not is-valid => return

   (exists) <- check-if-element-in-db reply, 'acknowledgedPms'
   if exists => return

   commit-array-to-db [reply], 'acknowledgedPms'

   ## now we get the requisite information from our original post
   case-id = /\/comments\/(\w{6})\//.exec reply.context .1
   (err, res, bod) <- robot.get "/r/#subreddit/comments/#case-id.json", {comment: unchars reply.parent_id[3 to]}
   if err or not res => return say "Error: confirm-case"
   if res.status-code isnt 200 => return say "Error: #{res.status-code}, confirm-case"

   ## we take the original post asking for confirmation
   text = bod |> JSON.parse |> (.1) |> simplify-listing |> (.0.body)

   ## and extract the defendants and charges
   charges = get-charges-from-confirmation text
   defendants = get-defendants-from-confirmation text

   ## summon the defendants
   send-summons case-id, charges, defendants

   ## inform the court of the summons
   declare-bailiffness-to-court case-id, reply.name, charges, defendants

check-case = (pm) ->
   ## we've read this
   if pm.new => inbox.read pm
   ## can't be summoned by random people, now can we?
   if pm.author isnt recipient => return

   (exists) <- check-if-element-in-db pm, 'receivedPms'
   if exists => return

   ## maybe one day we can replace this with clever unread inbox calls
   commit-array-to-db [pm], 'receivedPms'

   ## here, summons refers to summoning the bot, not the defendants
   valid-summons =
      * "bailiffy this case"
      * "summon these scumbags"
      * "summon this scumbag"
      * "summon the defendant"
      * "summon the defendants"
      * "serve this scumbag"
      * "serve these scumbags"

   ## return if the summons text didn't match the acceptable summoning phrases
   is-valid = fold1 (or), [substr summs, pm.body for summs in valid-summons]
   if not is-valid => return

   ## unfortunately this is the only way to get a post id out of the inbox
   id = 't3_' + /comments\/(\w{6})\//.exec pm.context .1

   ## now we make a request to get the case
   (err, res, bod) <- robot.get "/by_id/#id"
   if err or not res => return say "Error: check-case"
   if res.status-code isnt 200 => return say "Error: #{res.status-code}, check-case"

   post = simplify-listing bod .0

   ## check if the case is already in our db
   (exists) <- check-if-element-in-db post, 'bailiffCases'
   if exists => return

   defendants = get-defendants-from-title post.title
   charges = get-charges-from-body post.selftext

   if defendants.length > 0 and charges.length > 0
      defendants = map (.toLowerCase!), defendants
      charges = bulletify charges
      defendants = bulletify defendants
      msg = """
      Are these the defendants and charges?

      **DEFENDANTS**:

      #defendants

      **CHARGES**:

      #charges
      """

      ## don't let pm.name fool you, we're actually responding to the comment where we're called
      reply-to pm.name, msg
      commit-array-to-db [post], 'bailiffCases'

## ARCHIVIST
## ---------

submit-evidence-to-archive = (post, cb = id) ->

   ## get the link of the archived evidence
   get-redirect-link-from = (bod) -> /document\.location\.replace\("(.+)"\)},1000\)/.exec bod .1

   selftext = post.selftext

   (exists) <- check-if-element-in-db post, 'bailiffEvidence'
   if exists => return

   evidence = get-evidence-from selftext
   archived-evidence = []

   for let url in evidence
      say "making request to archive.today"
      params =
         url: 'https://archive.today/submit/'
         form:
            url: url
      request.post params, (err, res, bod) ->
         if err or not res => return say "Something went wrong, submit-evidence-to-archive"
         if res.status-code isnt 200 => return say "Something went wrong: #{res.status-code}, submit-evidence-to-archive"
         archived-evidence.push get-redirect-link-from bod
         ## we don't finish until the last evidence has been archived
         if archived-evidence `same-length` evidence => cb archived-evidence

get-evidence-from = (selftext) ->
   rx = /^\[EXHIBIT [A-Z]{1}\]\((.+)\)/gm
   evidence = recurse-through-re rx, selftext
   return evidence

report-evidence-to-court = (archive, post) ->
   my = spoiler "I'll be" "IAMA BOT, AMA"
   role = get-random-element-from roles
   declare = smallify(5) <[ The following is an archive of the evidence: ]>
   rendered-evidence = archive |> numberify |> smallify(5)
   signature = smallify(5) [ \This \bot \by "/u/#recipient." \Code \viewable \at "github.com/#recipient/#username" ]

   msg = """
   #my #role

   #declare #rendered-evidence #signature
   """

   ## Originally did these two asynchronously, but for some reason it seems
   ## to not update the db sometimes. This makes sure the bot doesn't spam
   ## reddit in case it can't commit to the db.
   #reply-to post.name, msg
   commit-array-to-db [post], 'bailiffEvidence', -> reply-to post.name, msg

process-cases = ->
   (err, res, bod) <- robot.get "/r/#{subreddit}/new.json", limit: 2
   if err or not res => return say "Something went wrong, bailiff-get-new-cases"
   if res.status-code isnt 200 => return say "Something went wrong: #{res.status-code}, bailiff-get-new-cases"

   cases = simplify-listing bod

   for let post in cases
      submit-evidence-to-archive post, (archived-evidence) -> report-evidence-to-court archived-evidence, post

## MAIN LOOP
## ---------

bailiff = ->
   check-mail()
   process-cases()

module.exports =
   bailiff: -> repeat-fn settings.cycle_time, bailiff, \bailiff
