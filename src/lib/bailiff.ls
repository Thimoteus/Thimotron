global <<< require 'prelude-ls'
{db, recipient, robot, say, simplify-listing, send-pm, reply-to, commit-array-to-db, recurse-through-re} = require './core'
settings = require '../../settings' .modules.bailiff
subreddit = settings.subreddit

get-defendants-from-title = (title) ->
   defendants = /.+VS\.?(.+)FOR.+/gi.exec title
   if defendants => defendants = defendants.1
   users = recurse-through-re /(\/u\/\w+)/ig, defendants
   return users

get-charges-from-body = (body) ->
   charges = recurse-through-re /^\*\*CHARGE:\*\*\s*(.+)$/gm, body
   return charges

get-defendants-from-pm = (pm) ->
   defendants = recurse-through-re /^\* (\/u\/\w+)$/img, pm
   return defendants

get-charges-from-pm = (pm) ->
   charges = recurse-through-re //^\*\s([^/u/].+)$//m, pm
   return charges

get-case-link-from-pm = (pm) ->
   link = /Concerning \[this post\]\((.+)\):/.exec pm
   return link.1

bulletify = (arr) ->
   the-head = '* ' + arr.0
   the-tail = join '\n* ', [''] ++ tail arr
   return the-head + the-tail

summons-text = (charges, case-link) ->
   charges = bulletify charges
   satirical = 'https://www.reddit.com/r/KarmaCourt/wiki/constitution#wiki_article_iv._karmacourt_is_funny_satire'
   rights = 'https://www.reddit.com/r/KarmaCourt/wiki/constitution#wiki_article_vi._the_bill_of_rights'
   msg = """
   You are hereby summoned to /r/KarmaCourt on the following charges:

   #charges

   Your court case can be found [here](#{case-link}).

   ---

   If no one represents you the case will not go forward. You may represent yourself.

   KarmaCourt is [satirical](#satirical)
   and not to be taken seriously.

   Know your [rights](#rights).
   """
   return msg

send-summons = (case-link, charges, defendants) ->
   msg = summons-text charges, case-link
   for let scumbag in defendants
      send-pm "KARMACOURT SUMMONS", msg, scumbag

declare-bailiffness-to-court = (case-link, charges, defendants) ->
   defendants = defendants |> map (.toLowerCase!) |> join ', '
   summons = summons-text charges, case-link
   case-name = /http:\/\/redd\.it\/(\w{6})/.exec case-link .1
   msg = """
   `$ declare-bailiffness-to-court()`

   `I AM #username. I WILL BE THE BAILIFFBOT FOR THIS CASE.`

   `$ summon-scumbags-to-court()`

   `THE FOLLOWING DEFENDANT(S) HAVE BEEN AUTOMATICALLY SUMMONED:`

   #defendants

   `$ print summons-text()`

   `THE SUMMONS TEXT IS AS FOLLOWS:`

   ---
   ---

   #summons

   ---
   ---

   `$ exit()`

   `THE BAILIFFBOT WILL NOW UNDERGO COMPUTRONIC SLEEP PROCEDURES. GOODBYE!`
   """
   reply-to "t3_#{case-name}", msg

check-mail = ->
   (err, res, bod) <- robot.get "/message/messages.json", limit: 5
   if err or not res => return say "Something went wrong, bailiff-get-messages"
   if res => if res.status-code isnt 200 => return say "Something went wrong: #{res.status-code}, bailiff-get-messages"

   sent-by-me = -> it.subject is 'Are these right?'
   has-replies = -> it.replies isnt ''
   positives = -> /^y(es)?$/i.test it.body

   pms = bod |> simplify-listing |> filter sent-by-me |> filter has-replies
   for let pm in pms
      correct = pm.replies |> (.data.children) |> map (.data) |> filter positives
      # takes replies with a positive response that haven't been responded to yet
      if correct.length == 1
         (err, count) <- db['acknowledgedPms'].find name: correct.0.name .limit 1 .count
         if count == 0
            reply-to correct.0.name, "Acknowledged."
            commit-array-to-db correct, 'acknowledgedPms'

            case-link = get-case-link-from-pm pm.body
            charges = get-charges-from-pm pm.body
            defendants = get-defendants-from-pm pm.body

            send-summons case-link, charges, defendants
            declare-bailiffness-to-court case-link, charges, defendants

check-cases = ->
   (err, res, bod) <- robot.get "/r/#{subreddit}/new.json", limit: 4
   if err or not res => return say "Something went wrong, bailiff-get-new-cases"
   if res => if res.status-code isnt 200 => return say "Something went wrong: #{res.status-code}, bailiff-get-new-cases"

   posts = simplify-listing bod

   for let post in posts
      (err, count) <- db['bailiffCases'].find name: post.name .limit 1 .count

      defendants = get-defendants-from-title post.title
      charges = get-charges-from-body post.selftext

      if defendants.length > 0 and charges.length > 0 and count == 0
         title = 'Are these right?'
         defendants = map (.toLowerCase!), defendants
         charges = bulletify charges
         defendants = bulletify defendants
         msg = """
         Concerning [this post](http://redd.it/#{post.id}):

         **DEFENDANTS**:

         #defendants

         **CHARGES**:

         #charges
         """
         send-pm title, msg, recipient
         commit-array-to-db [post], 'bailiffCases'

bailiff = ->
   check-mail()
   check-cases()

module.exports =
   bailiff: bailiff
   bailiff-cycle-time: settings.cycle_time
