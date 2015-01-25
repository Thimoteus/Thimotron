(function(){
  var Bot, bot, modules;
  Bot = require('modular-bot');
  bot = new Bot('lib/library', __dirname);
  modules = require('../settings').modules.run;
  bot.initiate('login');
  bot.load(modules);
  bot.run();
}).call(this);
