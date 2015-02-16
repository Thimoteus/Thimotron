(function(){
  var Jaraw, path, minimist, dbLib, argv, settingsPath, settings, dbName, ref$, getElementFromDb, checkIfElementInDb, commitArrayToDb, userAgent, username, password, clientId, secret, recipient, talkative, robot, say, login, repeatFn, repeatFn2, recurseThroughRe, JSONparse, simplifyListing, haveWePostedHere, haveWeRepliedHere, replyTo, sendPm, slice$ = [].slice;
  import$(global, require('prelude-ls'));
  Jaraw = require('jaraw');
  path = require('path');
  minimist = require('minimist');
  dbLib = require('./db');
  argv = minimist(process.argv);
  settingsPath = argv.settings
    ? path.resolve(__dirname, '../../', argv.settings)
    : path.resolve(__dirname, '../../settings.json');
  settings = require(settingsPath);
  dbName = settings.db.name || 'bot';
  ref$ = dbLib(dbName), getElementFromDb = ref$.getElementFromDb, checkIfElementInDb = ref$.checkIfElementInDb, commitArrayToDb = ref$.commitArrayToDb;
  userAgent = settings.info.name + "@" + (settings.info.version || '1.0.0') + " by " + (settings.info.author || '');
  username = settings.login.username;
  password = settings.login.password;
  clientId = settings.oauth.client_id;
  secret = settings.oauth.client_secret;
  recipient = settings.recipient;
  talkative = settings.verbose || false;
  robot = new Jaraw({
    type: 'script',
    login: {
      username: username,
      password: password
    },
    oauth: {
      id: clientId,
      secret: secret
    },
    user_agent: userAgent,
    rate_limit: 1000
  });
  say = function(it){
    if (talkative) {
      console.log(it);
      return it;
    }
  };
  login = function(cb){
    say(username + " is initializing");
    return robot.loginAsScript(cb);
  };
  repeatFn = function(t, f, n){
    var args, fn;
    args = slice$.call(arguments, 3);
    fn = function(){
      say("Beginning new loop for " + n);
      return f.apply(null, args);
    };
    fn();
    return setInterval(fn, t);
  };
  repeatFn2 = function(t, f, n){
    var args, fn;
    args = slice$.call(arguments, 3);
    fn = function(){
      setTimeout(fn, t);
      say("Beginning new loop for " + n);
      return f.apply(null, args);
    };
    return fn();
  };
  recurseThroughRe = curry$(function(re, str){
    var flag, rx, ret, hit;
    flag = 'g';
    if (re.ignoreCase) {
      flag += 'i';
    }
    if (re.multiline) {
      flag += 'm';
    }
    rx = new RegExp(re.source, flag);
    ret = [];
    while (hit = rx.exec(str)) {
      ret.push(hit[1]);
    }
    return ret;
  });
  JSONparse = function(it){
    var b, e;
    try {
      b = JSON.parse(it);
      return b;
    } catch (e$) {
      e = e$;
      if (e instanceof SyntaxError) {
        return it;
      } else {
        throw e;
      }
    }
  };
  simplifyListing = compose$(JSONparse, function(it){
    return it.data.children;
  }, map(function(it){
    return it.data;
  }));
  haveWePostedHere = curry$(function(link, identifier, cb){
    var theLink, params, callback;
    theLink = "/r/" + link.subreddit + "/comments/" + link.id + ".json";
    params = {
      depth: 20,
      limit: 250
    };
    callback = function(err, res, bod){
      var hasIdentifier, posts, weHave;
      if (err || !res) {
        return say('Error: have-we-posted-here');
      }
      if (res.statusCode !== 200) {
        return say("Error: " + res.statusCode + ", have-we-posted-here");
      }
      hasIdentifier = function(it){
        return 0 <= it.body.indexOf(identifier);
      };
      posts = simplifyListing(
      function(it){
        return it[1];
      }(
      JSON.parse(
      bod)));
      weHave = orList(
      filter(hasIdentifier)(
      filter(function(it){
        return it.author === username;
      })(
      posts)));
      return cb(weHave);
    };
    return robot.get(theLink, params, callback);
  });
  haveWeRepliedHere = curry$(function(reply, cb){
    var id, thePost, params, callback;
    if (reply.link_id) {
      id = unchars(
      drop(3)(
      chars(
      link_id)));
      thePost = "/r/" + reply.subreddit + "/comments/" + id + "/_/" + reply.id + ".json";
    } else if (reply.context) {
      thePost = unchars(
      reverse(
      drop(10)(
      reverse(
      chars(
      reply.context)))));
    } else {
      throw new Error("I don't recognize this type of reply.");
    }
    params = {
      limit: 250,
      depth: 20
    };
    callback = function(err, res, bod){
      var repliesListing, replies;
      if (err || !res) {
        return say('Error: haveWeRepliedHere');
      }
      if (res.statusCode !== 200) {
        return say("Error: " + res.statusCode + ", haveWeRepliedHere");
      }
      repliesListing = function(it){
        return it[0].replies;
      }(
      simplifyListing(
      function(it){
        return it[1];
      }(
      JSON.parse(
      bod))));
      if (repliesListing) {
        replies = simplifyListing(repliesListing);
        return cb(any(function(it){
          return it.author === username;
        }, replies));
      } else {
        return cb(false);
      }
    };
    return robot.get(thePost, params, callback);
  });
  replyTo = curry$(function(dest, text){
    var params;
    params = {
      thing_id: dest,
      text: text,
      api_type: 'json'
    };
    return robot.post('/api/comment', params, function(err, res, bod){
      if (err || !res) {
        return say('Error: reply-to');
      }
      if (res.statusCode !== 200) {
        return say("Error: " + res.statusCode + ", reply-to");
      }
      return say("Reply sent:\nDest: " + dest + "\nText: " + text);
    });
  });
  sendPm = curry$(function(title, body, receiver){
    var params;
    if (/\/u\//.test(receiver)) {
      receiver = unchars(slice$.call(receiver, 3));
    }
    params = {
      api_type: 'json',
      subject: title,
      text: body,
      to: receiver
    };
    return robot.post('/api/compose', params, function(err, res, bod){
      if (err || !res) {
        return say("Error: send-pm");
      }
      if (res.statusCode !== 200) {
        return say("Error: " + res.statusCode + ", send-pm");
      }
      return say("PM sent:\nRecipient: " + receiver + "\nTitle: " + title + "\nBody: " + body);
    });
  });
  module.exports = {
    login: login,
    settings: settings,
    recipient: recipient,
    sendPm: sendPm,
    replyTo: replyTo,
    commitArrayToDb: commitArrayToDb,
    recurseThroughRe: recurseThroughRe,
    simplifyListing: simplifyListing,
    repeatFn: repeatFn,
    say: say,
    robot: robot,
    checkIfElementInDb: checkIfElementInDb,
    haveWePostedHere: haveWePostedHere,
    haveWeRepliedHere: haveWeRepliedHere,
    getElementFromDb: getElementFromDb
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
}).call(this);
