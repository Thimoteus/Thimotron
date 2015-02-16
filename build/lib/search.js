(function(){
  var ref$, settings, recipient, say, robot, repeatFn, simplifyListing, sendPm, subs, cycleTime, username, flag, rxs, res$, i$, len$, term, search, substr, sendNotification, searchSelfTexts, searchComments, searchTitles, pmUpdates, repeatSelfTextsSearch, repeatCommentsSearch, repeatCommentsSearch2, repeatTitleSearch, slice$ = [].slice;
  import$(global, require('prelude-ls'));
  ref$ = require('./core'), settings = ref$.settings, recipient = ref$.recipient, say = ref$.say, robot = ref$.robot, repeatFn = ref$.repeatFn, simplifyListing = ref$.simplifyListing, sendPm = ref$.sendPm;
  settings = settings.modules.search;
  subs = settings.subreddits;
  cycleTime = settings.cycle_time || 60000;
  username = robot.options.login.username;
  flag = settings.ignore_case ? 'ig' : 'g';
  res$ = [];
  for (i$ = 0, len$ = (ref$ = settings.search_terms).length; i$ < len$; ++i$) {
    term = ref$[i$];
    res$.push(new RegExp(term, flag));
  }
  rxs = res$;
  search = curry$(function(opts, cb){
    var urlParam, textProperty, after, limit, parseText, recurse, params;
    cb == null && (cb = id);
    urlParam = opts.urlParam;
    textProperty = opts.textProperty;
    after = opts.after || false;
    limit = opts.limit || 100;
    parseText = function(it){
      var rx;
      return fold1(curry$(function(x$, y$){
        return x$ || y$;
      }), (function(){
        var i$, ref$, len$, results$ = [];
        for (i$ = 0, len$ = (ref$ = rxs).length; i$ < len$; ++i$) {
          rx = ref$[i$];
          results$.push(rx.test(it[textProperty]));
        }
        return results$;
      }()));
    };
    recurse = after === true || isType('String', after);
    params = {
      limit: limit
    };
    if (recurse) {
      params.after = after;
    }
    subs.forEach(function(sub){
      return robot.get("/r/" + sub + "/" + urlParam + ".json", params, function(err, res, bod){
        var parsedText, params;
        if (err || !res) {
          return say('Error: search');
        }
        if (res.statusCode !== 200) {
          return say("Error: " + res.statusCode + ", search");
        }
        parsedText = filter(parseText)(
        simplifyListing(
        bod));
        cb(parsedText);
        if (recurse) {
          params = {
            after: JSON.parse(bod).data.after,
            urlParam: urlParam,
            textProperty: textProperty
          };
          return search(params, cb);
        }
      });
    });
  });
  substr = curry$(function(sub, str){
    return new RegExp(sub).test(str);
  });
  sendNotification = curry$(function(list, cb){
    cb == null && (cb = id);
    return robot.get('/messages/sent.json', {
      limit: 100
    }, function(err, res, bod){
      var pmBodies, ids, notifiedTest, notifiedBooleans, notificationPairs, toUpdate;
      if (err || !res) {
        return say('Error: sendNotification2');
      }
      if (res.statusCode !== 200) {
        return say("Error: " + res.statusCode + ", sendNotification2");
      }
      pmBodies = map(function(it){
        return it.body;
      })(
      simplifyListing(
      bod));
      ids = map(function(it){
        return it.id;
      }, list);
      notifiedTest = function(id){
        return any(substr(id), pmBodies);
      };
      notifiedBooleans = map(notifiedTest, listIds);
      notificationPairs = zip(list, notifiedBooleans);
      toUpdate = reject(function(it){
        return it[1];
      }, notificationPairs);
      return pmUpdates(toUpdate);
    });
  });
  searchSelfTexts = search({
    urlParam: 'new',
    textProperty: 'selftext'
  });
  searchComments = search({
    urlParam: 'comments',
    textProperty: 'body'
  });
  searchTitles = search({
    urlParam: 'new',
    textProperty: 'title'
  });
  pmUpdates = function(array){
    var getKeywordFrom, msg, i$, len$, post, keyword, url;
    if (array.length === 0) {
      return;
    }
    getKeywordFrom = function(post){
      var rebuilt, i$, ref$, len$, prop, j$, ref1$, len1$, rx;
      rebuilt = function(rxs){
        var i$, len$, rx, results$ = [];
        for (i$ = 0, len$ = rxs.length; i$ < len$; ++i$) {
          rx = rxs[i$];
          results$.push(new RegExp(rx.source, 'i'));
        }
        return results$;
      };
      for (i$ = 0, len$ = (ref$ = ['selftext', 'body', 'title']).length; i$ < len$; ++i$) {
        prop = ref$[i$];
        if (prop in post) {
          for (j$ = 0, len1$ = (ref1$ = rebuilt(rxs)).length; j$ < len1$; ++j$) {
            rx = ref1$[j$];
            if (rx.test(post[prop])) {
              return rx.exec(post[prop])[0];
            }
          }
        }
      }
    };
    msg = '';
    for (i$ = 0, len$ = array.length; i$ < len$; ++i$) {
      post = array[i$];
      keyword = getKeywordFrom(post) || 'one of your keywords';
      switch (false) {
      case !/t3/.test(post.name):
        msg = msg + ("\n\n> `" + post.author + "` mentioned [" + keyword + "](" + post.url + "?context=3) `in` /r/" + post.subreddit);
        break;
      case !/t1/.test(post.name):
        url = "/r/" + post.subreddit + "/comments/" + join('', slice$.call(post.link_id, 3)) + "/" + username + "/" + post.id + "?context=3";
        msg = msg + ("\n\n> /u/" + post.author + " mentioned [" + keyword + "](" + url + ") in /r/" + post.subreddit);
      }
    }
    msg += "\n\nThis has been a service by " + username + ".";
    return sendPm("Someone mentioned " + keyword, msg, recipient);
  };
  repeatSelfTextsSearch = function(){
    return repeatFn(cycleTime, searchSelfTexts, 'self-texts-search', function(posts){
      return commitArrayToDb(posts, 'mentions', pmUpdates);
    });
  };
  repeatCommentsSearch = function(){
    return repeatFn(cycleTime, searchComments, 'comments-search', function(comments){
      return commitArrayToDb(comments, 'mentions', pmUpdates);
    });
  };
  repeatCommentsSearch2 = function(){
    return repeatFn(cycleTime, searchComments, 'commentsSearch', sendNotification);
  };
  repeatTitleSearch = function(){
    return repeatFn(cycleTime, searchTitles, 'titles-search', function(titles){
      return commitArrayToDb(titles, 'mentions', pmUpdates);
    });
  };
  module.exports = {
    commentsSearch: repeatCommentsSearch,
    commentsSearch2: repeatCommentsSearch2,
    selfTextsSearch: repeatSelfTextsSearch,
    titlesSearch: repeatTitleSearch
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
}).call(this);
