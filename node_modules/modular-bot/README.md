# modular-bot [![Build Status](https://travis-ci.org/Thimoteus/modular-bot.svg?branch=master)](https://travis-ci.org/Thimoteus/modular-bot)
A tool for running bots piece-wise.

## Example

```coffeescript
Bot = require 'modular-bot'
bot = new Bot './relative/path/to/library', __dirname

bot.initiate 'login'
bot.load 'sayHello'

bot.run()
```

in `./relative/path/to/library`:

```coffeescript
module.exports =
   login: (callback) ->
      console.log "logged in!"
      callback()
   sayHello: ->
      console.log "hello!"
```

You **must** use `__dirname` as the second argument, and the first argument must be a relative path when instantiating. Future support for absolute paths without the second argument is planned.
