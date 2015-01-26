(function(){
  var ref$, db, recipient, robot, say, simplifyListing, sendPm, replyTo, commitArrayToDb, recurseThroughRe, settings, subreddit, username, cheekySayings, getRandomCheekySaying, getLinkArchive, getDefendantsFromTitle, getChargesFromBody, getDefendantsFromPm, getChargesFromPm, getCaseLinkFromPm, bulletify, summonsText, sendSummons, declareBailiffnessToCourt, checkMail, checkCases, bailiff;
  import$(global, require('prelude-ls'));
  ref$ = require('./core'), db = ref$.db, recipient = ref$.recipient, robot = ref$.robot, say = ref$.say, simplifyListing = ref$.simplifyListing, sendPm = ref$.sendPm, replyTo = ref$.replyTo, commitArrayToDb = ref$.commitArrayToDb, recurseThroughRe = ref$.recurseThroughRe;
  settings = require('../../settings').modules.bailiff;
  subreddit = settings.subreddit;
  username = robot.options.login.username;
  cheekySayings = "YOUR FLAWED ATTEMPTS AT EVADING JUSTICE HAVE FAILED.";
  getRandomCheekySaying = function(){
    var ind;
    ind = floor(Math.random() * cheekySayings.length);
    return cheekySayings[ind];
  };
  getLinkArchive = function(url){
    return "https://archive.today/?run=1&url=" + encodeURIComponent(url);
  };
  getDefendantsFromTitle = function(title){
    var defendants, users;
    defendants = /.+VS\.?(.+)FOR.+/gi.exec(title);
    if (defendants) {
      defendants = defendants[1];
    }
    users = recurseThroughRe(/(\/u\/\w+)/ig, defendants);
    return users;
  };
  getChargesFromBody = function(body){
    var charges;
    charges = recurseThroughRe(/^\*\*CHARGE:?\*\*\s*(.+)$/gm, body);
    return charges;
  };
  getDefendantsFromPm = function(pm){
    var defendants;
    defendants = recurseThroughRe(/^\* (\/u\/\w+)$/img, pm);
    return defendants;
  };
  getChargesFromPm = function(pm){
    var charges;
    charges = recurseThroughRe(/^\*\s([^\/u\/].+)$/m, pm);
    return charges;
  };
  getCaseLinkFromPm = function(pm){
    var link;
    link = /Concerning \[this post\]\((.+)\):/.exec(pm);
    return link[1];
  };
  bulletify = function(arr){
    var theHead, theTail;
    theHead = '* ' + arr[0];
    theTail = join('\n* ', [''].concat(tail(arr)));
    return theHead + theTail;
  };
  summonsText = function(charges, caseLink){
    var satirical, rights, msg;
    charges = bulletify(charges);
    satirical = 'https://www.reddit.com/r/KarmaCourt/wiki/constitution#wiki_article_iv._karmacourt_is_funny_satire';
    rights = 'https://www.reddit.com/r/KarmaCourt/wiki/constitution#wiki_article_vi._the_bill_of_rights';
    msg = "You are hereby summoned to /r/KarmaCourt on the following charges:\n\n" + charges + "\n\nYour court case can be found [here](" + caseLink + ").\n\n---\n\nIf no one represents you the case will not go forward. You may represent yourself.\n\nKarmaCourt is [satirical](" + satirical + ")\nand not to be taken seriously.\n\nKnow your [rights](" + rights + ").";
    return msg;
  };
  sendSummons = function(caseLink, charges, defendants){
    var msg, i$, len$, results$ = [];
    msg = summonsText(charges, caseLink);
    for (i$ = 0, len$ = defendants.length; i$ < len$; ++i$) {
      results$.push((fn$.call(this, defendants[i$])));
    }
    return results$;
    function fn$(scumbag){
      return sendPm("KARMACOURT SUMMONS", msg, scumbag);
    }
  };
  declareBailiffnessToCourt = function(caseLink, charges, defendants){
    var summons, caseName, msg;
    defendants = join(', ')(
    map(function(it){
      return it.toLowerCase();
    })(
    defendants));
    summons = summonsText(charges, caseLink);
    caseName = /http:\/\/redd\.it\/(\w{6})/.exec(caseLink)[1];
    msg = "`I AM " + username + ". I WILL BE THE BAILIFFBOT FOR THIS CASE.`\n\n`THE FOLLOWING SCUMBAG(S) HAVE BEEN AUTOMATICALLY SUMMONED:`\n\n" + defendants + "\n\n`THE SUMMONS TEXT IS AS FOLLOWS:`\n\n---\n---\n\n" + summons + "\n\n---\n---\n\n`THE BAILIFFBOT WILL NOW UNDERGO COMPUTRONIC SLEEP PROCEDURES. GOODBYE!`";
    return replyTo("t3_" + caseName, msg);
  };
  checkMail = function(){
    return robot.get("/message/messages.json", {
      limit: 5
    }, function(err, res, bod){
      var sentByMe, hasReplies, positives, pms, i$, len$, results$ = [];
      if (err || !res) {
        return say("Something went wrong, bailiff-get-messages");
      }
      if (res.statusCode !== 200) {
        return say("Something went wrong: " + res.statusCode + ", bailiff-get-messages");
      }
      sentByMe = function(it){
        return it.subject === 'Are these right?';
      };
      hasReplies = function(it){
        return it.replies !== '';
      };
      positives = function(it){
        return /^y(es)?$/i.test(it.body);
      };
      pms = filter(hasReplies)(
      filter(sentByMe)(
      simplifyListing(
      bod)));
      for (i$ = 0, len$ = pms.length; i$ < len$; ++i$) {
        results$.push((fn$.call(this, pms[i$])));
      }
      return results$;
      function fn$(pm){
        var correct;
        correct = filter(positives)(
        map(function(it){
          return it.data;
        })(
        function(it){
          return it.data.children;
        }(
        pm.replies)));
        if (correct.length === 1) {
          return db['acknowledgedPms'].find({
            name: correct[0].name
          }).limit(1).count(function(err, count){
            var caseLink, charges, defendants;
            if (count === 0) {
              replyTo(correct[0].name, "Acknowledged.");
              commitArrayToDb(correct, 'acknowledgedPms');
              caseLink = getCaseLinkFromPm(pm.body);
              charges = getChargesFromPm(pm.body);
              defendants = getDefendantsFromPm(pm.body);
              sendSummons(caseLink, charges, defendants);
              return declareBailiffnessToCourt(caseLink, charges, defendants);
            }
          });
        }
      }
    });
  };
  checkCases = function(){
    return robot.get("/r/" + subreddit + "/new.json", {
      limit: 4
    }, function(err, res, bod){
      var posts, i$, len$, results$ = [];
      if (err || !res) {
        return say("Something went wrong, bailiff-get-new-cases");
      }
      if (res) {
        if (res.statusCode !== 200) {
          return say("Something went wrong: " + res.statusCode + ", bailiff-get-new-cases");
        }
      }
      posts = simplifyListing(bod);
      for (i$ = 0, len$ = posts.length; i$ < len$; ++i$) {
        results$.push((fn$.call(this, posts[i$])));
      }
      return results$;
      function fn$(post){
        return db['bailiffCases'].find({
          name: post.name
        }).limit(1).count(function(err, count){
          var defendants, charges, title, msg;
          defendants = getDefendantsFromTitle(post.title);
          charges = getChargesFromBody(post.selftext);
          if (defendants.length > 0 && charges.length > 0 && count === 0) {
            title = 'Are these right?';
            defendants = map(function(it){
              return it.toLowerCase();
            }, defendants);
            charges = bulletify(charges);
            defendants = bulletify(defendants);
            msg = "Concerning [this post](http://redd.it/" + post.id + "):\n\n**DEFENDANTS**:\n\n" + defendants + "\n\n**CHARGES**:\n\n" + charges;
            sendPm(title, msg, recipient);
            return commitArrayToDb([post], 'bailiffCases');
          }
        });
      }
    });
  };
  bailiff = function(){
    checkMail();
    return checkCases();
  };
  module.exports = {
    bailiff: bailiff,
    bailiffCycleTime: settings.cycle_time
  };
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
}).call(this);
