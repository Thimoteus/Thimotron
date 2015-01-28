(function(){
  var ref$, recipient, say, robot, repeat, simplifyListing, sendPm, commitArrayToDb, settings, subs, cycleTime, username, flag, rxs, res$, i$, len$, term, getKeywordFrom, search, searchSelfTexts, searchComments, searchTitles, pmUpdates, repeatSelfTextsSearch, repeatCommentsSearch, repeatTitleSearch, slice$ = [].slice;
  import$(global, require('prelude-ls'));
  ref$ = require('./core'), recipient = ref$.recipient, say = ref$.say, robot = ref$.robot, repeat = ref$.repeat, simplifyListing = ref$.simplifyListing, sendPm = ref$.sendPm, commitArrayToDb = ref$.commitArrayToDb;
  settings = require('../../settings').modules.search;
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
  getKeywordFrom = function(post){
    var i$, ref$, len$, prop, j$, ref1$, len1$, rx;
    for (i$ = 0, len$ = (ref$ = ['selftext', 'body', 'title']).length; i$ < len$; ++i$) {
      prop = ref$[i$];
      if (prop in post) {
        for (j$ = 0, len1$ = (ref1$ = rxs).length; j$ < len1$; ++j$) {
          rx = ref1$[j$];
          if (rx.test(post.prop)) {
            return rx.source;
          }
        }
      }
    }
  };
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
        var parsedText, e;
        if (err || !res) {
          return say("Something went wrong, search");
        }
        if (res.statusCode !== 200) {
          return say("Something went wrong: " + res.statusCode + ", search");
        }
        try {
          parsedText = filter(parseText)(
          simplifyListing(
          bod));
        } catch (e$) {
          e = e$;
          if (e instanceof SyntaxError) {
            say("Reddit took too long to respond");
            return;
          } else {
            if ((res != null ? res.statusCode : void 8) != null) {
              say(res.statusCode);
            }
            if (bod != null) {
              say(bod);
            }
            return;
          }
        }
        cb(parsedText);
        if (recurse) {
          return search({
            after: JSON.parse(bod).data.after,
            urlParam: urlParam,
            textProperty: textProperty
          }, cb);
        }
      });
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
    var msg, keyword;
    if (array.length === 0) {
      return;
    }
    msg = "`The following are mentions you may be interested in:`";
    array.forEach(function(post){
      var url;
      switch (false) {
      case !/t3/.test(post.name):
        return msg = msg + ("\n\n> `" + post.author + "` [posted](" + post.url + ") `in` /r/" + post.subreddit);
      case !/t1/.test(post.name):
        url = "/r/" + post.subreddit + "/comments/" + join('', slice$.call(post.link_id, 3)) + "/" + username + "/" + post.id;
        return msg = msg + ("\n\n> /u/" + post.author + " [posted](" + url + ") in /r/" + post.subreddit);
      }
    });
    keyword = getKeywordFrom(post) || 'one of your keywords';
    msg += "\n\n`This has been a service by " + username + "`";
    return sendPm("Someone mentioned " + keyword, msg, recipient);
  };
  repeatSelfTextsSearch = function(){
    return repeat(cycleTime, searchSelfTexts, 'self-texts-search', function(posts){
      return commitArrayToDb(posts, 'mentions', pmUpdates);
    });
  };
  repeatCommentsSearch = function(){
    return repeat(cycleTime, searchComments, 'comments-search', function(comments){
      return commitArrayToDb(comments, 'mentions', pmUpdates);
    });
  };
  repeatTitleSearch = function(){
    return repeat(cycleTime, searchTitles, 'titles-search', function(titles){
      return commitArrayToDb(titles, 'mentions', pmUpdates);
    });
  };
  module.exports = {
    commentsSearch: repeatCommentsSearch,
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
