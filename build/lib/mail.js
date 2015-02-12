(function(){
  var ref$, robot, simplifyListing, id, listify, Inbox, this$ = this;
  ref$ = require('./core'), robot = ref$.robot, simplifyListing = ref$.simplifyListing;
  id = function(x){
    return x;
  };
  listify = curry$(function(cb, err, res, bod){
    if (res && res.statusCode === 200) {
      bod = simplifyListing(bod);
    }
    return cb(err, res, bod);
  });
  Inbox = function(limit){
    var getFolder;
    this$.limit = limit;
    getFolder = curry$((function(folder, cb){
      return robot.get("/message/" + folder + ".json", {
        limit: this$.limit
      }, listify(cb));
    }), true);
    return {
      getUnread: getFolder('unread'),
      getInbox: getFolder('inbox'),
      getMentions: getFolder('mentions'),
      getCommentReplies: getFolder('comments'),
      getPostReplies: getFolder('selfreply'),
      getMessages: getFolder('messages'),
      getSent: getFolder('sent'),
      getModerator: getFolder('moderator'),
      read: function(pm, cb){
        cb == null && (cb = id);
        return robot.post('/api/read_message', {
          id: pm.name
        }, cb);
      },
      readAll: function(cb){
        cb == null && (cb = id);
        return robot.post('/api/read_all_messages', cb);
      }
    };
  };
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
