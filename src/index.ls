## lets us require the library in modules
Bot = require 'modular-bot'
## tells the bot where to find the library
bot = new Bot 'lib/library', __dirname
## pulls modules from the settings file
modules = require './lib/core' .settings.modules.run

## before running anything, run the login function
bot.initiate 'login'
bot.load modules

## the real deal
bot.run()

