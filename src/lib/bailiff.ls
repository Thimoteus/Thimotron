## This module is for use in /r/KarmaCourt. It has two functions, 1) serving
## as an archivist of evidence and 2) summoning defendants.
## Purpose 1 is automatic, it requires no interaction from the master.
## Purpose 2 is interactive. The bot must be summoned from a list of acceptable
## phrases, plus a username mention. It will then get the defendants from
## the title of the post and the charges from the selftext, and create a reply
## to your summon asking whether it got the case info correct. Then you reply
## to that post with one of a set list of confirmations ('yes' is enough),
## and the bot will message each defendant with a list of charges brought
## against them, a link to the case, and some references to the constitution.
#
#
## requirements
global <<< require 'prelude-ls'
require! {
  'request': 'request'
  './core': {
    settings
    repeat-fn
    recipient
    robot
    say
    simplify-listing
    send-pm
    reply-to
    recurse-through-re
    have-we-replied-here
    have-we-posted-here
  }
  './strings': {smallify, smallify2, bulletify, numberify}
  './mail': Inbox
}
settings = settings.modules.bailiff
subreddit = settings.subreddit
username = robot.options.login.username
inbox = new Inbox

## useful functions
same-length = (==) `over` (.length)

substr = (sub, str) -> new RegExp sub .test str

spoiler = (link, spoiler) -> "[#link](\#s '#spoiler')"

secret-message = (str) -> "[](\##str)"

disclaimer = """
**Reminder:** This is a [no-downvote zone](https://www.reddit.com/r/KarmaCourt/wiki/constitution\#wiki_article_vi._the_bill_of_rights)!
Also, Karma Court is [funny satire](https://www.reddit.com/r/KarmaCourt/wiki/constitution\#wiki_article_iv._karmacourt_is_funny_satire).
"""

## some people hate bots, so this humanizes it a little bit
roles =
  * "the guy who plays AC/DC in the back of the room," +
    " not paying attention to the trial."
  * "Zoidberg (\\/)(°,,,°)(\\/)"
  * "the guy who gasps at the inhumanity ⊙▃⊙"
  * "the guy who stands in the back," +
    " wearing sunglasses and saying nothing (̿▀̿ ̿Ĺ̯̿̿▀̿ ̿)̄"
  * "a teddy bear! ʕ´•ᴥ•`ʔ"
  * "Homer J. Simpson ~(8 &\#94;(| )"
  * "sitting in the corner, not doing anything, not doing anything at all ..."
  * "Groot. **I AM GROOT.**"
  * "the guy who sells combination Indian/Pakistani/Mexican food." +
    " But only dishes that combine all three."
  * "the world's smallest violinist, playing the world's largest violin ♫"
  * "someone who tells you how good cake is," +
    " while his mouth is full of cake. MM, MM."
  * "Maximus Decimus Meridius," +
    " father to a murdered son, husband to a murdered wife." +
    " And I will have my vengeance, in this life or the next."
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

## replies to the case thread with the summons text
declare-bailiffness-to-court = (case-id, reply-name, charges, defendants) ->
  defendants = defendants |> map (.toLowerCase!) |> join ', '
  ## the actual summons text
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
    if err or not res => return say 'Error: inbox.getMentions'
    if res.status-code isnt 200 => return say "Error: #{res.status-code}, inbox.getMentions"

    ## if we're summoned, let's check the facts of the case
    bod |> filter (.new) |> filter (.author is recipient) |> map check-case

  ## comment replies are only for checking if the bot got the defendants/charges right
  inbox.get-comment-replies (err, res, bod) ->
    if err or not res => return
    if res.status-code isnt 200 => return say "Error: #{res.status-code}, inbox.getReplies"

    ## someone responded to one of our comments, let's see if it confirmed the info we got
    bod |> filter (.new) |> filter (.author is recipient) |> map confirm-case

confirm-case = (reply) ->

  valid-confirmations =
    * "yes"
    * "y"
    * "You're goddamn right."

  is-valid = valid-confirmations |> map (is reply.body) |> or-list
  if not is-valid => return

  ## read the pm
  inbox.read reply

  ## originally there was another check here to see if the 'yes' reply really
  ## was to the bot asking whether defendants and charges were right,
  ## but that was removed because it's easier to just not reply with the
  ## exact strings in `valid-confirmations` unless it's to a bailiff post.

  ## now we get the requisite information from our original post
  case-id = /\/comments\/(\w{6})\//.exec reply.context .1
  cmt = unchars reply.parent_id[3 to]
  the-link = "/r/#subreddit/comments/#case-id.json"
  (err, res, bod) <- robot.get the-link, comment: cmt
  if err or not res => return say "Error: confirmCase"
  if res.status-code isnt 200
    return say "Error: #{res.status-code}, confirmCase"

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

  ## we've read this
  inbox.read pm

  ## unfortunately this is the only way to get a post id out of the inbox
  id = 't3_' + /comments\/(\w{6})\//.exec pm.context .1

  ## now we make a request to get the case
  (err, res, bod) <- robot.get "/by_id/#id"
  if err or not res => return say "Error: checkCase"
  if res.status-code isnt 200
    return say "Error: #{res.status-code}, checkCase"

  post = simplify-listing bod .0

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

    ## don't let pm.name fool you,
    ## we're actually responding to the comment where we're called
    reply-to pm.name, msg
  else
    say 'bad defendants or charges'

## ARCHIVIST
## ---------

submit-evidence-to-archive = (post, cb = id) -->

  ## get the link of the archived evidence
  get-redirect-link-from = (bod) ->
    /document\.location\.replace\("(.+)"\)},1000\)/.exec bod .1

  selftext = post.selftext

  (we-have) <- have-we-posted-here post, ''
  if we-have => return

  evidence = get-evidence-from selftext
  archived-evidence = []

  if not empty evidence then for let url in evidence
    say "making request to archive.today"
    params =
      url: 'https://archive.today/submit/'
      form:
        url: url
    request.post params, (err, res, bod) ->
      if err or not res
        return say 'Something went wrong, submitEvidenceToArchive'
      if res.status-code isnt 200
        say "Something went wrong: #{res.status-code}," +
          ' submitEvidenceToArchive'
        return
      archived-evidence.push get-redirect-link-from bod
      ## we don't finish until the last evidence has been archived
      if archived-evidence `same-length` evidence => cb archived-evidence
  else
    sign = smallify2(5) "I'm a bot, this action was done automatically as a reminder of KarmaCourt's principles."
    msg = """
    #disclaimer

    ---

    #sign
    """
    reply-to post.name, msg


get-evidence-from = (selftext) ->
  rx = /^\[EXHIBIT [A-Z]{1}\]\((.+)\)/gm
  evidence = recurse-through-re rx, selftext
  return evidence

report-evidence-to-court = (archive, post) ->
  my = spoiler "I'll be" "IAMA BOT, AMA"
  role = get-random-element-from roles
  declare = smallify(5) <[ The following is an archive of the evidence: ]>
  rendered-evidence = archive |> numberify |> smallify(5)
  signature = smallify(5) [
    * \This
    * \bot
    * \by
    * "/u/#recipient."
    * \Code
    * \viewable
    * \at
    * "github.com/#recipient/#username"
  ]

  msg = """
  #disclaimer

  **Mandatory bot participation message:** #my #role

  #declare #rendered-evidence #signature
  """

  ## Update the thread with EVIDENCE!
  reply-to post.name, msg

process-cases = ->
  (err, res, bod) <- robot.get "/r/#{subreddit}/new.json", limit: 2
  if err or not res => return say "Something went wrong, bailiff-get-new-cases"
  if res.status-code isnt 200
    say "Something went wrong: #{res.status-code}, bailiff-get-new-cases"
    return

  cases = simplify-listing bod

  for let post in cases
    submit-evidence-to-archive post, (archived-evidence) ->
      report-evidence-to-court archived-evidence, post

## MAIN LOOP
## ---------

bailiff = ->
  check-mail()
  process-cases()

module.exports =
  bailiff: -> repeat-fn settings.cycle_time, bailiff, \bailiff
