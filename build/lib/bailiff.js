(function(){
  var request, ref$, settings, repeatFn, recipient, robot, say, simplifyListing, sendPm, replyTo, recurseThroughRe, haveWeRepliedHere, haveWePostedHere, smallify, bulletify, numberify, Inbox, subreddit, username, inbox, sameLength, substr, spoiler, secretMessage, disclaimer, roles, getRandomElementFrom, getDefendantsFromTitle, getChargesFromBody, getDefendantsFromConfirmation, getChargesFromConfirmation, summonsText, sendSummons, declareBailiffnessToCourt, checkMail, confirmCase, checkCase, submitEvidenceToArchive, getEvidenceFrom, reportEvidenceToCourt, processCases, bailiff, slice$ = [].slice;
  import$(global, require('prelude-ls'));
  request = require('request');
  ref$ = require('./core'), settings = ref$.settings, repeatFn = ref$.repeatFn, recipient = ref$.recipient, robot = ref$.robot, say = ref$.say, simplifyListing = ref$.simplifyListing, sendPm = ref$.sendPm, replyTo = ref$.replyTo, recurseThroughRe = ref$.recurseThroughRe, haveWeRepliedHere = ref$.haveWeRepliedHere, haveWePostedHere = ref$.haveWePostedHere;
  ref$ = require('./strings'), smallify = ref$.smallify, bulletify = ref$.bulletify, numberify = ref$.numberify;
  Inbox = require('./mail');
  settings = settings.modules.bailiff;
  subreddit = settings.subreddit;
  username = robot.options.login.username;
  inbox = new Inbox;
  sameLength = over(curry$(function(x$, y$){
    return x$ === y$;
  }), function(it){
    return it.length;
  });
  substr = function(sub, str){
    return new RegExp(sub).test(str);
  };
  spoiler = function(link, spoiler){
    return "[" + link + "](#s '" + spoiler + "')";
  };
  secretMessage = function(str){
    return "[](#" + str + ")";
  };
  disclaimer = "THIS IS A DISCLAIMER";
  roles = ["the guy who plays AC/DC in the back of the room," + " not paying attention to the trial.", "Zoidberg (\\/)(°,,,°)(\\/)", "the guy who gasps at the inhumanity ⊙▃⊙", "the guy who stands in the back," + " wearing sunglasses and saying nothing (̿▀̿ ̿Ĺ̯̿̿▀̿ ̿)̄", "a teddy bear! ʕ´•ᴥ•`ʔ", "Homer J. Simpson ~(8 &#94;(| )", "sitting in the corner, not doing anything, not doing anything at all ...", "Groot. **I AM GROOT.**", "the guy who sells combination Indian/Pakistani/Mexican food." + " But only dishes that combine all three.", "the world's smallest violinist, playing the world's largest violin ♫", "someone who tells you how good cake is," + " while his mouth is full of cake. MM, MM.", "Maximus Decimus Meridius," + " father to a murdered son, husband to a murdered wife." + " And I will have my vengeance, in this life or the next.", "the guy who [spoils](#s 'Snape kills Dumbledore') Harry Potter.", "the guy who [spoils](#s 'Jesus dies') Passion of the Christ.", "the guy who [spoils](#s 'Darth Vader is Luke's father') Star Wars."];
  getRandomElementFrom = function(list){
    var ind;
    ind = floor(Math.random() * list.length);
    return list[ind];
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
  getDefendantsFromConfirmation = function(pm){
    var defendants;
    defendants = recurseThroughRe(/^\* (\/u\/\w+)$/img, pm);
    return defendants;
  };
  getChargesFromConfirmation = function(pm){
    var charges;
    charges = recurseThroughRe(/^\*\s([^\/u\/].+)$/m, pm);
    return charges;
  };
  summonsText = function(charges, id){
    var caseLink, satirical, rights, msg;
    caseLink = "http://redd.it/" + id;
    charges = bulletify(charges);
    satirical = 'https://www.reddit.com/r/KarmaCourt/wiki/constitution#wiki_article_iv._karmacourt_is_funny_satire';
    rights = 'https://www.reddit.com/r/KarmaCourt/wiki/constitution#wiki_article_vi._the_bill_of_rights';
    msg = "You are hereby summoned to /r/KarmaCourt on the following charges:\n\n" + charges + "\n\nYour court case can be found [here](" + caseLink + ").\n\n---\n\nIf no one represents you the case will not go forward.\nYou may represent yourself.\n\nKarmaCourt is [satirical](" + satirical + ")\nand not to be taken seriously.\n\nKnow your [rights](" + rights + ").";
    return msg;
  };
  sendSummons = function(caseId, charges, defendants){
    var msg, i$, len$, results$ = [];
    msg = summonsText(charges, caseId);
    for (i$ = 0, len$ = defendants.length; i$ < len$; ++i$) {
      results$.push((fn$.call(this, defendants[i$])));
    }
    return results$;
    function fn$(scumbag){
      return sendPm("KARMACOURT SUMMONS", msg, scumbag);
    }
  };
  declareBailiffnessToCourt = function(caseId, replyName, charges, defendants){
    var summons, msg;
    defendants = join(', ')(
    map(function(it){
      return it.toLowerCase();
    })(
    defendants));
    summons = summonsText(charges, caseId);
    msg = "The following scumbag(s) have been automatically summoned:\n\n" + defendants + "\n\nThe summons text is as follows:\n\n---\n---\n\n" + summons + "\n\n---\n---\n";
    return replyTo(replyName, msg);
  };
  checkMail = function(){
    inbox.getMentions(function(err, res, bod){
      if (err || !res) {
        return say('Error: inbox.getMentions');
      }
      if (res.statusCode !== 200) {
        return say("Error: " + res.statusCode + ", inbox.getMentions");
      }
      return map(checkCase)(
      filter(function(it){
        return it.author === recipient;
      })(
      filter(function(it){
        return it['new'];
      })(
      bod)));
    });
    return inbox.getCommentReplies(function(err, res, bod){
      if (err || !res) {
        return;
      }
      if (res.statusCode !== 200) {
        return say("Error: " + res.statusCode + ", inbox.getReplies");
      }
      return map(confirmCase)(
      filter(function(it){
        return it.author === recipient;
      })(
      filter(function(it){
        return it['new'];
      })(
      bod)));
    });
  };
  confirmCase = function(reply){
    var validConfirmations, isValid, caseId, cmt, theLink;
    validConfirmations = ["yes", "y", "You're goddamn right."];
    isValid = orList(
    map((function(it){
      return it === reply.body;
    }))(
    validConfirmations));
    if (!isValid) {
      return;
    }
    inbox.read(reply);
    caseId = /\/comments\/(\w{6})\//.exec(reply.context)[1];
    cmt = unchars(slice$.call(reply.parent_id, 3));
    theLink = "/r/" + subreddit + "/comments/" + caseId + ".json";
    return robot.get(theLink, {
      comment: cmt
    }, function(err, res, bod){
      var text, charges, defendants;
      if (err || !res) {
        return say("Error: confirmCase");
      }
      if (res.statusCode !== 200) {
        return say("Error: " + res.statusCode + ", confirmCase");
      }
      text = function(it){
        return it[0].body;
      }(
      simplifyListing(
      function(it){
        return it[1];
      }(
      JSON.parse(
      bod))));
      charges = getChargesFromConfirmation(text);
      defendants = getDefendantsFromConfirmation(text);
      sendSummons(caseId, charges, defendants);
      return declareBailiffnessToCourt(caseId, reply.name, charges, defendants);
    });
  };
  checkCase = function(pm){
    var validSummons, isValid, summs, id;
    validSummons = ["bailiffy this case", "summon these scumbags", "summon this scumbag", "summon the defendant", "summon the defendants", "serve this scumbag", "serve these scumbags"];
    isValid = fold1(curry$(function(x$, y$){
      return x$ || y$;
    }), (function(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = validSummons).length; i$ < len$; ++i$) {
        summs = ref$[i$];
        results$.push(substr(summs, pm.body));
      }
      return results$;
    }()));
    if (!isValid) {
      return;
    }
    inbox.read(pm);
    id = 't3_' + /comments\/(\w{6})\//.exec(pm.context)[1];
    return robot.get("/by_id/" + id, function(err, res, bod){
      var post, defendants, charges, msg;
      if (err || !res) {
        return say("Error: checkCase");
      }
      if (res.statusCode !== 200) {
        return say("Error: " + res.statusCode + ", checkCase");
      }
      post = simplifyListing(bod)[0];
      defendants = getDefendantsFromTitle(post.title);
      charges = getChargesFromBody(post.selftext);
      if (defendants.length > 0 && charges.length > 0) {
        defendants = map(function(it){
          return it.toLowerCase();
        }, defendants);
        charges = bulletify(charges);
        defendants = bulletify(defendants);
        msg = "Are these the defendants and charges?\n\n**DEFENDANTS**:\n\n" + defendants + "\n\n**CHARGES**:\n\n" + charges;
        return replyTo(pm.name, msg);
      } else {
        return say('bad defendants or charges');
      }
    });
  };
  submitEvidenceToArchive = curry$(function(post, cb){
    var getRedirectLinkFrom, selftext;
    cb == null && (cb = id);
    getRedirectLinkFrom = function(bod){
      return /document\.location\.replace\("(.+)"\)},1000\)/.exec(bod)[1];
    };
    selftext = post.selftext;
    return haveWePostedHere(post, '', function(weHave){
      var evidence, archivedEvidence, i$, len$, results$ = [];
      if (weHave) {
        return;
      }
      evidence = getEvidenceFrom(selftext);
      archivedEvidence = [];
      if (!empty(evidence)) {
        for (i$ = 0, len$ = evidence.length; i$ < len$; ++i$) {
          results$.push((fn$.call(this, evidence[i$])));
        }
        return results$;
      } else {
        return replyTo(post.name, disclaimer);
      }
      function fn$(url){
        var params;
        say("making request to archive.today");
        params = {
          url: 'https://archive.today/submit/',
          form: {
            url: url
          }
        };
        return request.post(params, function(err, res, bod){
          if (err || !res) {
            return say('Something went wrong, submitEvidenceToArchive');
          }
          if (res.statusCode !== 200) {
            say(("Something went wrong: " + res.statusCode + ",") + ' submitEvidenceToArchive');
            return;
          }
          archivedEvidence.push(getRedirectLinkFrom(bod));
          if (sameLength(archivedEvidence, evidence)) {
            return cb(archivedEvidence);
          }
        });
      }
    });
  });
  getEvidenceFrom = function(selftext){
    var rx, evidence;
    rx = /^\[EXHIBIT [A-Z]{1}\]\((.+)\)/gm;
    evidence = recurseThroughRe(rx, selftext);
    return evidence;
  };
  reportEvidenceToCourt = function(archive, post){
    var my, role, declare, renderedEvidence, signature, msg;
    my = spoiler("I'll be", "IAMA BOT, AMA");
    role = getRandomElementFrom(roles);
    declare = smallify(5)(['The', 'following', 'is', 'an', 'archive', 'of', 'the', 'evidence:']);
    renderedEvidence = smallify(5)(
    numberify(
    archive));
    signature = smallify(5)(['This', 'bot', 'by', "/u/" + recipient + ".", 'Code', 'viewable', 'at', "github.com/" + recipient + "/" + username]);
    msg = "" + disclaimer + "\n\n" + my + " " + role + "\n\n" + declare + " " + renderedEvidence + " " + signature;
    return replyTo(post.name, msg);
  };
  processCases = function(){
    return robot.get("/r/" + subreddit + "/new.json", {
      limit: 2
    }, function(err, res, bod){
      var cases, i$, len$, results$ = [];
      if (err || !res) {
        return say("Something went wrong, bailiff-get-new-cases");
      }
      if (res.statusCode !== 200) {
        say("Something went wrong: " + res.statusCode + ", bailiff-get-new-cases");
        return;
      }
      cases = simplifyListing(bod);
      for (i$ = 0, len$ = cases.length; i$ < len$; ++i$) {
        results$.push((fn$.call(this, cases[i$])));
      }
      return results$;
      function fn$(post){
        return submitEvidenceToArchive(post, function(archivedEvidence){
          return reportEvidenceToCourt(archivedEvidence, post);
        });
      }
    });
  };
  bailiff = function(){
    checkMail();
    return processCases();
  };
  module.exports = {
    bailiff: function(){
      return repeatFn(settings.cycle_time, bailiff, 'bailiff');
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
}).call(this);
