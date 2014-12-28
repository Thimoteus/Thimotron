#!/usr/bin/coffee
config = require './config'
Snoocore = require 'snoocore'
reddit = new Snoocore userAgent: "#{config.package.name}@#{config.package.version} by #{config.package.author}"
