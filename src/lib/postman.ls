global <<< require 'prelude-ls'
require! {
  './core': {settings, repeat-fn, robot, say, send-pm, reply-to}
  './strings': {smallify2, unsmallify, replace}
  './mail': Inbox
}

inbox = new Inbox 50
username = robot.options.login.username
settings = settings.modules.postman
cycle-time = settings.cycle-time or 45_000ms
max-recipients = settings.max-recipients or 3people

## useful functions
## ----------------
map2 = (f, xs) --> [f x for let x in xs]

## Get unread messages:
get-unread = (cb) -> inbox.get-unread (err, res, bod) ->
  if err or not res => return say 'Error: get-unread'
  if res.status-code isnt 200
    return say "Error: #{res.status-code}, get-unread"

  cb bod

## get all pm conversations
get-messages = (cb) -> inbox.get-messages (err, res, bod) ->
  if err or not res => return say 'Error: get-messages'
  if res.status-code isnt 200
    return say "Error: #{res.status-code}, get-messages"

  cb bod

## used for putting a string in quotes
quotify-str = words >> ([ '> ' ] ++) >> unwords
quotify = lines >> (map quotify-str) >> unlines
unquotify = replace /&(amp;)?gt;/ '>'

## used for adding an invisible string to a comment.
## just don't close the parentheses in the string!
secret-message = (str) -> "[](\##str)"

## New messages
## ------------

## Take only ones which ask us to send messages:
filter-summons = filter (.subject is 'New multimessage')

## Parse the bodies for recipients:
## Takes the top line, as long as it matches,
## splits all the names into words, then replaces
## commas if they exist.
read-recipients =
  (-> /^To:\s?(.+)/.exec it .1) >> words >> (map (.replace ',' ''))

## Get the subject
read-subject = (body) ->
  body |> /^Subject:\s?(.+)$/m.exec |> (.1) |> unquotify

## Get the message from the pm
read-message = (body) ->
  ## first split the body into lines
  body-array = body |> unquotify |> lines
  ## get the position of where the message starts
  index = body-array
    |> map (words)
    |> map (elem-index 'Message:')
    |> elem-index 0
  ## then take the message
  msg = body-array
    |> drop index
    |> unlines
    |> words
    |> drop 1
    |> unwords

## Creates a letter object
package-letter = (pm) ->
  ## read the pm so we don't see it again
  inbox.read pm

  ## get the recipients, subject and message.
  ## if there's a problem (usually because of a malformed 'New multimessage'
  ## pm), returns void so the next function knows there is no letter
  body = pm.body
  try
    recipients = read-recipients body
    subject = read-subject body
    message = body |> read-message
  catch
    say "Could not parse #{pm.body}, returning"
    say e.message
    return void

  ## don't send to too many recipients
  if recipients.length > max-recipients
    reply-to pm.name, 'You are trying to send a message to too many people.'
    return void

  signature = smallify2 2 'I am a bot.\n'
  signature += smallify2 2 "This is a multimessage from #{pm.author} to #{join ', ' recipients}.\n"
  signature += smallify2 2 'If you reply to this, I will send your message to all participants.'
  msg = """
  #message

  ---

  #signature
  """

  letter =
    recipients: recipients
    subject: subject
    message: msg

## sends the letter
deliver-mail = (letter) ->
  if not letter => return
  ## curry the send-pm function
  send-message = send-pm letter.subject, letter.message
  ## send the message to each recipient
  map2 send-message, letter.recipients

## Responses to old messages
## -------------------------
## Get unread messages -> take those who are replies to PMs we sent ->
## check the 'messages' folder -> for each reply, get the first message from
## the folder (which we sent) -> take only those sent by the postman program ->
## get the participants of the conversation -> send the body of the original
## unread message to each participant. Also at some point, mark the pm as read.

## take only responses to old messages
filter-replies = filter (.first_message_name)

## take only those whose names are the same as the first message name.
get-first-message = (first-name, pms) --> filter (.name is first-name), pms

## checks the second element to see if it was sent by postman
sent-by-postman = (pair) ->
  tester = unsmallify pair.1.body
  /This is a multimessage from/.test tester

## packages a fake message to be sent to the package-letter function
package-replies = (pair) ->
  ancestor-lines = pair.1.body |> unsmallify |> lines
  ## get index of the last '---', since we know it belongs to postman
  ind = ancestor-lines
    |> elem-indices '---'
    |> last

  ## take the line that we know has the list of recipients
  recipients = ancestor-lines
    ## drop everything before the last '---'
    |> drop ind
    ## then drop until the recipients line is first
    |> drop-while (-> not /This is a multimessage from/.test it)
    ## take the first element
    |> (.0)
    ## capture the recipients
    |> (/This is a multimessage from \w+ to (.+)\./.exec)
    ## return the capture
    |> (.1)

  ## place the original message in quotes
  original-msg = ancestor-lines
    |> take ind - 1
    |> unlines
    |> quotify

  ## we want the same subject
  subject = pair.0.subject

  ## place the quoted original message in with the new message
  message = original-msg + '\n\n' + pair.0.body

  body = """
  To: #recipients

  Subject: #subject

  Message: #message
  """

  fake-pm =
    name: pair.0.name
    author: pair.0.author
    body: body

  ## create a letter to send out of our constructed pm
  package-letter fake-pm

## Main function
## -------------
postman = -> get-unread (bod) ->
  summons = filter-summons bod
  replies = filter-replies bod

  if not empty summons
    say 'Got a new multimessage'

    ## take all summons, package their letters, then deliver them
    summons |> map package-letter |> map2 deliver-mail

  if not empty replies => get-messages (msgs) ->

    ## get the first message in the comment tree each reply is a part of
    first-messages = replies
      |> map (.first_message_name)
      |> map get-first-message  _, msgs
      |> flatten

    ## create a list of [reply, ancestor] pairs
    reply-ancestor-pairs = zip replies, first-messages

    ## take only those pairs where the second element was sent by postman
    verified-pairs = filter sent-by-postman, reply-ancestor-pairs

    ## package the replies then send them out
    verified-pairs |> map package-replies |> map2 deliver-mail

module.exports =
  postman: -> repeat-fn cycle-time, postman, 'postman'
