(function(){
  var mongo, collections, dbLib, this$ = this;
  mongo = require('mongojs');
  collections = ['mentions', 'receivedPms', 'acknowledgedPms', 'bailiffCases', 'bailiffEvidence', 'postman'];
  dbLib = function(name){
    var db, getElementFromDb, checkIfElementInDb, commitArrayToDb;
    this$.name = name;
    db = mongo(this$.name, collections);
    getElementFromDb = curry$((function(el, collection, cb){
      cb == null && (cb = id);
      return db[collection].findOne({
        name: el.name
      }, function(err, doc){
        return cb(err, doc);
      });
    }), true);
    checkIfElementInDb = curry$((function(el, collection, cb){
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
    }), true);
    commitArrayToDb = curry$((function(array, collection, cb){
      var arr, i$, len$, results$ = [];
      cb == null && (cb = id);
      arr = [];
      if (array.length) {
        for (i$ = 0, len$ = array.length; i$ < len$; ++i$) {
          results$.push((fn$.call(this$, i$, array[i$])));
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
    }), true);
    return {
      getElementFromDb: getElementFromDb,
      checkIfElementInDb: checkIfElementInDb,
      commitArrayToDb: commitArrayToDb
    };
  };
  module.exports = dbLib;
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
