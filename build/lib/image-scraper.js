(function(){
  var fs, path, request, ref$, say, simplifyListing, robot, settings, subs, dlDir, imageLimit, domain, re, getImageLinks, downloadImageLinks, imageScraper, toString$ = {}.toString;
  import$(global, require('prelude-ls'));
  fs = require('fs');
  path = require('path');
  request = require('request');
  ref$ = require('./core'), say = ref$.say, simplifyListing = ref$.simplifyListing, robot = ref$.robot;
  settings = require('../../settings').modules['image-scraper'];
  subs = settings.subreddits;
  dlDir = settings.download_directory || './';
  fs.exists(dlDir, function(exists){
    if (!exists) {
      throw new Error("bad download directory");
    }
  });
  imageLimit = settings.image_limit || 50;
  domain = settings.domain || 'imgur.com';
  re = new RegExp(domain);
  getImageLinks = function(opts, cb){
    var ref$, after, params, goodDomain, anAlbum, securify, i$, len$, results$ = [];
    cb == null && (cb = id);
    if (toString$.call(opts).slice(8, -1) === 'Function') {
      ref$ = [{}, opts], opts = ref$[0], cb = ref$[1];
    }
    after = opts.after || null;
    params = {
      after: after,
      limit: imageLimit
    };
    goodDomain = function(it){
      return re.test(it.domain);
    };
    anAlbum = function(it){
      return /\/a\//.test(it.url);
    };
    securify = function(url){
      if (/http:/.test(url)) {
        return url.replace(/http:/, 'https:');
      }
      return url;
    };
    for (i$ = 0, len$ = (ref$ = subs).length; i$ < len$; ++i$) {
      results$.push((fn$.call(this, ref$[i$])));
    }
    return results$;
    function fn$(sub){
      return robot.get("/r/" + sub + "/new.json", params, function(err, res, bod){
        var after, urls;
        if (err || !res) {
          return say("Error: get-image-links");
        }
        if (res.statusCode !== 200) {
          return say("Error: " + res.statusCode + ", get-image-links");
        }
        after = JSON.parse(bod).data.after;
        urls = map(securify)(
        map(function(it){
          return it.url;
        })(
        filter(compose$(anAlbum, not$))(
        filter(goodDomain)(
        simplifyListing(
        bod)))));
        return cb(urls, after);
      });
    }
  };
  downloadImageLinks = function(urls, cb){
    var filename, i$, len$;
    cb == null && (cb = id);
    filename = function(url){
      return /com\/(.+)$/.exec(url)[1];
    };
    say("there are " + urls.length + " images to download");
    for (i$ = 0, len$ = urls.length; i$ < len$; ++i$) {
      (fn$.call(this, i$, urls[i$]));
    }
    return cb(urls);
    function fn$(i, url){
      var destination;
      say("downloading file " + (i + 1));
      destination = path.join(dlDir, filename(url));
      request(url).pipe(fs.createWriteStream(destination));
    }
  };
  imageScraper = function(){
    say("scraping " + join(', ', subs) + " for up to " + imageLimit + " images from " + domain + " into " + dlDir);
    return getImageLinks(function(urls){
      return downloadImageLinks(urls);
    });
  };
  module.exports = {
    imageScraper: imageScraper
  };
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
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
  function not$(x){ return !x; }
}).call(this);
