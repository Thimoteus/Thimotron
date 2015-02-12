(function(){
  var Jaraw, mongo, path, argv, settingsPath, settings, dbName, dbCollections, db, userAgent, username, password, clientId, secret, recipient, talkative, robot, say, login, repeatFn, recurseThroughRe, JSONparse, simplifyListing, commitArrayToDb, checkIfElementInDb, getElementFromDb, replyTo, sendPm, slice$ = [].slice;
  import$(global, require('prelude-ls'));
  Jaraw = require('jaraw');
  mongo = require('mongojs');
  path = require('path');
  argv = require('minimist')(process.argv);
  settingsPath = argv.settings
    ? path.resolve(__dirname, '../../', argv.settings)
    : path.resolve(__dirname, '../../settings.json');
  settings = require(settingsPath);
  dbName = settings.db.name || 'bot';
  dbCollections = ['mentions', 'receivedPms', 'acknowledgedPms', 'bailiffCases', 'bailiffEvidence', 'postman'];
  db = mongo(dbName, dbCollections);
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
      return console.log(it);
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
  commitArrayToDb = curry$(function(array, collection, cb){
    var arr, i$, len$, results$ = [];
    cb == null && (cb = id);
    arr = [];
    if (array.length) {
      for (i$ = 0, len$ = array.length; i$ < len$; ++i$) {
        results$.push((fn$.call(this, i$, array[i$])));
      }
      return results$;
    } else {
      return cb(arr);
    }
    function fn$(i, element){
      return checkIfElementInDb(element, collection, function(exists){
        if (exists) {
          return;
        }
        db[collection].insert(element);
        say("inserted " + element.name + " to database " + collection);
        arr.push(element);
        if (i === array.length - 1) {
          return cb(arr);
        }
      });
    }
  });
  checkIfElementInDb = curry$(function(el, collection, cb){
    cb == null && (cb = id);
    return db[collection].find({
      name: el.name
    }).limit(1).count(function(err, count){
      var ret;
      if (err) {
        cb(err);
      }
      ret = count !== 0;
      return cb(ret);
    });
  });
  getElementFromDb = curry$(function(el, collection, cb){
    cb == null && (cb = id);
    return db[collection].findOne({
      name: el.name
    }, function(err, doc){
      return cb(err, doc);
    });
  });
  replyTo = curry$(function(dest, text){
    var params;
    params = {
      thing_id: dest,
      text: text,
      api_type: 'json'
    };
    return robot.post("/api/comment", params, function(err, res, bod){
      if (err || !res) {
        return say("Error: reply-to");
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
    return robot.post("/api/compose", params, function(err, res, bod){
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
