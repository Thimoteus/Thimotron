(function(){
  var ref$, settings, repeatFn, robot, say, sendPm, replyTo, smallify2, unsmallify, replace, Inbox, inbox, username, cycleTime, maxRecipients, map2, getUnread, getMessages, quotifyStr, quotify, unquotify, secretMessage, filterSummons, readRecipients, readSubject, readMessage, packageLetter, deliverMail, filterReplies, getFirstMessage, sentByPostman, packageReplies, postman, slice$ = [].slice;
  import$(global, require('prelude-ls'));
  ref$ = require('./core'), settings = ref$.settings, repeatFn = ref$.repeatFn, robot = ref$.robot, say = ref$.say, sendPm = ref$.sendPm, replyTo = ref$.replyTo;
  ref$ = require('./strings'), smallify2 = ref$.smallify2, unsmallify = ref$.unsmallify, replace = ref$.replace;
  Inbox = require('./mail');
  inbox = new Inbox(50);
  username = robot.options.login.username;
  settings = settings.modules.postman;
  cycleTime = settings.cycleTime || 45000;
  maxRecipients = settings.maxRecipients || 3;
  map2 = curry$(function(f, xs){
    var i$, len$, results$ = [];
    for (i$ = 0, len$ = xs.length; i$ < len$; ++i$) {
      results$.push((fn$.call(this, xs[i$])));
    }
    return results$;
    function fn$(x){
      return f(x);
    }
  });
  getUnread = function(cb){
    return inbox.getUnread(function(err, res, bod){
      if (err || !res) {
        return say('Error: get-unread');
      }
      if (res.statusCode !== 200) {
        return say("Error: " + res.statusCode + ", get-unread");
      }
      return cb(bod);
    });
  };
  getMessages = function(cb){
    return inbox.getMessages(function(err, res, bod){
      if (err || !res) {
        return say('Error: get-messages');
      }
      if (res.statusCode !== 200) {
        return say("Error: " + res.statusCode + ", get-messages");
      }
      return cb(bod);
    });
  };
  quotifyStr = compose$(words, (function(it){
    return ['> '].concat(it);
  }), unwords);
  quotify = compose$(lines, map(quotifyStr), unlines);
  unquotify = replace(/&(amp;)?gt;/, '>');
  secretMessage = function(str){
    return "[](#" + str + ")";
  };
  filterSummons = filter(function(it){
    return it.subject === 'New multimessage';
  });
  readRecipients = compose$(function(it){
    return /^To:\s?(.+)/.exec(it)[1];
  }, words, map(function(it){
    return it.replace(',', '');
  }));
  readSubject = function(body){
    return unquotify(
    function(it){
      return it[1];
    }(
    /^Subject:\s?(.+)$/m.exec(
    body)));
  };
  readMessage = function(body){
    var bodyArray, index, msg;
    bodyArray = lines(
    unquotify(
    body));
    index = elemIndex(0)(
    map(elemIndex('Message:'))(
    map(words)(
    bodyArray)));
    return msg = unwords(
    drop(1)(
    words(
    unlines(
    drop(index)(
    bodyArray)))));
  };
  packageLetter = function(pm){
    var body, recipients, subject, message, e, signature, msg, letter;
    inbox.read(pm);
    body = pm.body;
    try {
      recipients = readRecipients(body);
      subject = readSubject(body);
      message = readMessage(
      body);
    } catch (e$) {
      e = e$;
      say("Could not parse " + pm.body + ", returning");
      say(e.message);
      return;
    }
    if (recipients.length > maxRecipients) {
      replyTo(pm.name, 'You are trying to send a message to too many people.');
      return;
    }
    signature = smallify2(2, 'I am a bot.\n');
    signature += smallify2(2, "This is a multimessage from " + pm.author + " to " + join(', ', recipients) + ".\n");
    signature += smallify2(2, 'If you reply to this, I will send your message to all participants.');
    msg = "" + message + "\n\n---\n\n" + signature;
    return letter = {
      recipients: recipients,
      subject: subject,
      message: msg
    };
  };
  deliverMail = function(letter){
    var sendMessage;
    if (!letter) {
      return;
    }
    sendMessage = sendPm(letter.subject, letter.message);
    return map2(sendMessage, letter.recipients);
  };
  filterReplies = filter(function(it){
    return it.first_message_name;
  });
  getFirstMessage = curry$(function(firstName, pms){
    return filter(function(it){
      return it.name === firstName;
    }, pms);
  });
  sentByPostman = function(pair){
    var tester;
    tester = unsmallify(pair[1].body);
    return /This is a multimessage from/.test(tester);
  };
  packageReplies = function(pair){
    var ancestorLines, ind, recipients, originalMsg, subject, message, body, fakePm;
    ancestorLines = lines(
    unsmallify(
    pair[1].body));
    ind = last(
    elemIndices('---')(
    ancestorLines));
    recipients = function(it){
      return it[1];
    }(
    /This is a multimessage from \w+ to (.+)\./.exec(
    function(it){
      return it[0];
    }(
    dropWhile(function(it){
      return !/This is a multimessage from/.test(it);
    })(
    drop(ind)(
    ancestorLines)))));
    originalMsg = quotify(
    unlines(
    take(ind - 1)(
    ancestorLines)));
    subject = pair[0].subject;
    message = originalMsg + '\n\n' + pair[0].body;
    body = "To: " + recipients + "\n\nSubject: " + subject + "\n\nMessage: " + message;
    fakePm = {
      name: pair[0].name,
      author: pair[0].author,
      body: body
    };
    return packageLetter(fakePm);
  };
  postman = function(){
    return getUnread(function(bod){
      var summons, replies;
      summons = filterSummons(bod);
      replies = filterReplies(bod);
      if (!empty(summons)) {
        say('Got a new multimessage');
        map2(deliverMail)(
        map(packageLetter)(
        summons));
      }
      if (!empty(replies)) {
        return getMessages(function(msgs){
          var firstMessages, replyAncestorPairs, verifiedPairs;
          firstMessages = flatten(
          map(partialize$.apply(this, [getFirstMessage, [void 8, msgs], [0]]))(
          map(function(it){
            return it.first_message_name;
          })(
          replies)));
          replyAncestorPairs = zip(replies, firstMessages);
          verifiedPairs = filter(sentByPostman, replyAncestorPairs);
          return map2(deliverMail)(
          map(packageReplies)(
          verifiedPairs));
        });
      }
    });
  };
  module.exports = {
    postman: function(){
      return repeatFn(cycleTime, postman, 'postman');
    }
  };
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
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
  function compose$() {
    var functions = arguments;
    return function() {
      var i, result;
      result = functions[0].apply(this, arguments);
      for (i = 1; i < functions.length; ++i) {
        result = functions[i](result);
      }
      return result;
    };
  }
  function partialize$(f, args, where){
    var context = this;
    return function(){
      var params = slice$.call(arguments), i,
          len = params.length, wlen = where.length,
          ta = args ? args.concat() : [], tw = where ? where.concat() : [];
      for(i = 0; i < len; ++i) { ta[tw[0]] = params[i]; tw.shift(); }
      return len < wlen && len ?
        partialize$.apply(context, [f, ta, tw]) : f.apply(context, ta);
    };
  }
}).call(this);
