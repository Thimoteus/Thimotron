## Basic wrapper for dealing with the inbox.
## Usage:
##     limit = 10
##     Inbox = require './mail'
##     inbox = Inbox limit
##     inbox.get-unread (err, res, bod) ->
##       bod.forEach (pm) -> inbox.read pm

{robot, simplify-listing} = require './core'

id = (x) -> x

## shortcut for returning an array of a listing
listify = (cb, err, res, bod) -->
   if res and res.status-code is 200 => bod = simplify-listing bod
   cb err, res, bod

Inbox = (@limit) ~>

   ## GETTING PMS
   ## ----------

   ## curried function to get any folder
   get-folder = (folder, cb) ~~>
      robot.get "/message/#folder.json", limit: @limit, listify cb

   ## gets unread messages
   get-unread: get-folder 'unread'

   ## gets the entire inbox
   get-inbox: get-folder 'inbox'

   ## gets username mentions
   get-mentions: get-folder 'mentions'

   ## gets replies to comments
   get-comment-replies: get-folder 'comments'

   ## gets replies to posts
   get-post-replies: get-folder 'selfreply'

   ## gets all messages
   get-messages: get-folder 'messages'

   ## gets sent messages
   get-sent: get-folder 'sent'

   ## gets moderator mail
   get-moderator: get-folder 'moderator'

   ## READING PMS
   ## ----------

   ## reads a pm
   read: (pm, cb = id) -> robot.post '/api/read_message' id: pm.name, cb

   ## reads all pms
   read-all: (cb = id) -> robot.post '/api/read_all_messages' cb

module.exports = Inbox
