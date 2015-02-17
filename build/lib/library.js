(function(){
  var login, bailiff, ref$, commentsSearch, selfTextsSearch, titlesSearch, postman;
  login = require('./core').login;
  bailiff = require('./bailiff').bailiff;
  ref$ = require('./search'), commentsSearch = ref$.commentsSearch, selfTextsSearch = ref$.selfTextsSearch, titlesSearch = ref$.titlesSearch;
  postman = require('./postman').postman;
  module.exports = {
    commentsSearch: commentsSearch,
    selfTextsSearch: selfTextsSearch,
    titlesSearch: titlesSearch,
    login: login,
    bailiff: bailiff,
    postman: postman
  };
}).call(this);
