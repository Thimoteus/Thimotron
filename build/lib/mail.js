(function(){
  var capitalize, ref$, robot, simplifyListing, folders, listify, getFolder, Inbox;
  capitalize = require('prelude-ls').capitalize;
  ref$ = require('./core'), robot = ref$.robot, simplifyListing = ref$.simplifyListing;
  folders = ['unread', 'inbox', 'mentions', 'replies', 'selfreply', 'messages', 'sent', 'moderator'];
  listify = curry$(function(cb, err, res, bod){
    return cb(err, res, simplifyListing(bod));
  });
  getFolder = curry$(function(folder, limit, cb){
    return robot.get("/message/" + folder + ".json", {
      limit: limit
    }, listify(cb));
  });
  Inbox = (function(){
    Inbox.displayName = 'Inbox';
    var prototype = Inbox.prototype, constructor = Inbox;
    function Inbox(limit){
      var this$ = this instanceof ctor$ ? this : new ctor$;
      this$.limit = limit != null ? limit : 5;
      folders;
      return this$;
    } function ctor$(){} ctor$.prototype = prototype;
    prototype.getUnread = getFolder('unread', Inbox.limit);
    prototype.getInbox = getFolder('inbox', Inbox.limit);
    prototype.getMentions = getFolder('mentions', Inbox.limit);
    prototype.getCommentReplies = getFolder('comments', Inbox.limit);
    prototype.getPostReplies = getFolder('selfreply', Inbox.limit);
    prototype.getMessages = getFolder('messages', Inbox.limit);
    prototype.getSent = getFolder('sent', Inbox.limit);
    prototype.getModerator = getFolder('moderator', Inbox.limit);
    prototype.read = function(pm, cb){
      return robot.post('/api/read_message', {
        id: pm.name
      }, cb);
    };
    prototype.readAll = function(cb){
      return robot.post('/api/read_all_messages', cb);
    };
    return Inbox;
  }());
  module.exports = Inbox;
  function curry$(f, bound){
    var context,
    _curry = function(args) {
      return f.length > 1 ? function(){
        var params = args ? args.concat() : [];
        context = bound ? context || this : this;
        return params.push.apply(params, arguments) <
            f.length && arguments.length ?
          _curry.call(context, params) : f.apply(context, params);
      } : f;
    };
    return _curry();
  }
}).call(this);
