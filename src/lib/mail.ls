{capitalize} = require 'prelude-ls'
{robot, simplify-listing} = require './core'

# possible folders to check in your inbox
folders =
   * \unread
   * \inbox
   * \mentions
   * \replies
   * \selfreply
   * \messages
   * \sent
   * \moderator

# shortcut for returning an array of a listing
listify = (cb, err, res, bod) --> cb err, res, simplify-listing bod

# curried function to get any folder
get-folder = (folder, limit, cb) --> robot.get "/message/#folder.json", limit: limit, listify cb

# the real deal
class Inbox
   # limit restricts how many messages to check
   (@limit = 5) ~> folders

   ########## GETTING PMS ##########

   # gets unread messages
   get-unread: get-folder 'unread', @limit

   # gets the entire inbox
   get-inbox: get-folder 'inbox', @limit

   # gets username mentions
   get-mentions: get-folder 'mentions', @limit

   # gets replies to comments
   get-comment-replies: get-folder 'comments', @limit

   # gets replies to posts
   get-post-replies: get-folder 'selfreply', @limit

   # gets all messages
   get-messages: get-folder 'messages', @limit

   # gets sent messages
   get-sent: get-folder 'sent', @limit

   # gets moderator mail
   get-moderator: get-folder 'moderator', @limit

   ########## READING PMS ##########

   # reads a pm
   read: (pm, cb) -> robot.post '/api/read_message', id: pm.name, cb

   # reads all pms
   read-all: (cb) -> robot.post '/api/read_all_messages', cb

module.exports = Inbox
