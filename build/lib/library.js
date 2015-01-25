/* MODULES */
(function(){
  var ref$, login, repeat, bailiffCycleTime, bailiff, imageScraper, commentsSearch, selfTextsSearch, titlesSearch;
  ref$ = require('./core'), login = ref$.login, repeat = ref$.repeat;
  ref$ = require('./bailiff'), bailiffCycleTime = ref$.bailiffCycleTime, bailiff = ref$.bailiff;
  imageScraper = require('./image-scraper').imageScraper;
  ref$ = require('./search'), commentsSearch = ref$.commentsSearch, selfTextsSearch = ref$.selfTextsSearch, titlesSearch = ref$.titlesSearch;
  module.exports = {
    commentsSearch: commentsSearch,
    selfTextsSearch: selfTextsSearch,
    titlesSearch: titlesSearch,
    login: login,
    bailiff: function(){
      return repeat(bailiffCycleTime, bailiff, 'bailiff');
    },
    imageScraper: imageScraper
  };
}).call(this);
