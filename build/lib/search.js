(function(){
  var ref$, robot, repeat, simplifyListing, sendPm, commitArrayToDb, settings, subs, cycleTime, re, search, searchSelfTexts, searchComments, searchTitles, pmUpdates, repeatSelfTextsSearch, repeatCommentsSearch, repeatTitleSearch, slice$ = [].slice;
  import$(global, require('prelude-ls'));
  ref$ = require('./core'), robot = ref$.robot, repeat = ref$.repeat, simplifyListing = ref$.simplifyListing, sendPm = ref$.sendPm, commitArrayToDb = ref$.commitArrayToDb;
  settings = require('../../settings').modules.search;
  subs = settings.subreddits;
  cycleTime = settings.cycle_time || 60000;
  re = function(){
    var flag;
    flag = settings.ignore_case ? 'ig' : 'g';
    return new RegExp(settings.search_string, flag);
  }();
  search = curry$(function(opts, cb){
    var urlParam, textProperty, after, limit, parseText, recurse, params;
    cb == null && (cb = id);
    urlParam = opts.urlParam;
    textProperty = opts.textProperty;
    after = opts.after || false;
    limit = opts.limit || 100;
    parseText = function(it){
      if (re.test(it[textProperty])) {
        return true;
      } else {
        return false;
      }
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
    var msg;
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
    msg += "\n\n`This has been a service by " + username + "`";
    return sendPm("Someone mentioned " + settings.search_string, msg, recipient);
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
