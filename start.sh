#!/bin/bash

# start the database
mongod --dbpath data/ --quiet &

# start the bot
coffee bot.coffee
