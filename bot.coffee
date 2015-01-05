#!/usr/bin/coffee
root = this
# set a global namespace
config = require './config'
# imports settings and package info
settings = config.settings
# user settings kept in settings.cson
pack = config.package
# package settings, useful for the bot name, version, and author
Snoocore = require 'snoocore'
# node wrapper for the reddit api
mongo = require 'promised-mongo'
# the database

dbName = settings.db.name or "bot"
# the name of the database to use
dbCollections = settings.db.collections or ["mentions"]
# collections in the db
db = mongo(dbName, dbCollections)
# now we're connected

userAgent = "#{pack.name}@#{pack.version} by #{pack.author}"
# required for making api calls to reddit
username = settings.login.username
# your bot's username
password = settings.login.password
# your bot's password
clientId = settings.oauth.client_id
# bot's id, viewable at https://ssl.reddit.com/prefs/apps/ with your bot's account
secret = settings.oauth.client_secret
# bot's secret, get it at the same place as the id
scopes = ['identity', 'read', 'privatemessages', 'submit']
# get the scopes you require here: https://www.reddit.com/dev/api

cycleTime = settings.cycle_time or "60000"
updateMethod = settings.updateMethod
# one of "reply" or "PM"
recipient = settings.updateRecipient
# what the updates are being sent to
subs = settings.subreddits
# list of subs to crawl through
re = do ->
        flag = if settings.ignore_case then "i" else ""
        return new RegExp(settings.search_string, flag)

reddit = new Snoocore
        userAgent: userAgent
        login:
                username: username
                password: password
        oauth:
                type: "script"
                consumerKey: clientId
                consumerSecret: secret
                scope: scopes
        throttle: 1000

fetchNewLinks = (sub) ->
        parseNewLinks = (res) ->
                ret = res.data.children
                return (i.data for i in ret)
        links = reddit("/r/#{sub}/new").get()
        return links.then(parseNewLinks)

flattifyReplies = (res) ->
        parse_listing = (listing) -> listing.data
        topLevelReplies = res[1].data.children
        replies = []
        hasChildren = (comment) ->
                if comment.kind is 't1'
                        return comment.data.replies isnt ''
                return false
        getChildren = (listing) ->
                comment = parse_listing(listing)
                return if comment.replies is ''
                return comment.replies.data.children # is an array of listings with kind 't1'
        flattify = (comment) ->
                replies.push comment
                if hasChildren(comment)
                        flattify(child) for child in getChildren(comment)
        flattify(reply) for reply in topLevelReplies
        return replies

processReplies = (res) ->
        mentions = []
        replies = flattifyReplies(res)
        selfText = res[0].data.children[0].data
        filteredReplies = (reply for reply in replies when re.test reply.data.body)
        for reply in filteredReplies
                mentions.push
                        kind: 'reply'
                        id: reply.data.id
                        link_id: reply.data.link_id[3..8]
                        sr: reply.data.subreddit
                        author: reply.data.author
                        body: reply.data.body
                        notified: false
        if re.test selfText.selftext
                mentions.push
                        kind: 'selftext'
                        id: selfText.id
                        sr: selfText.subreddit
                        author: selfText.author
                        body: selfText.selftext
        saveMentions(mentions) if mentions.length > 0

fetchComments = (links) ->
        links.forEach (link) ->
                commentTree = reddit("/r/#{link.subreddit}/comments/#{link.id}").get
                        depth: 20
                        limit: 200
                commentTree.then(processReplies)
        return

search = (sub) ->
        parseRes = (res) ->
                ret = res.data.children
                (i.data for i in ret)

        links = fetchNewLinks(sub)
        comments = links.then(fetchComments)

searchAllSubs = ->
        console.log "Beginning loop."
        subs.forEach (sub) -> search(sub)
        setTimeout(searchAllSubs, cycleTime)

sendNotificationOf = (ment) ->
        sendPm = ->
                reddit("/api/compose").post
                        api_type: 'json'
                        subject: "New mention"
                        text: msg
                        to: recipient
                .then(console.log "PM notification of #{ment.id} sent.")
        sendReply = ->
                reddit("/api/comment").post
                        api_type: 'json'
                        text: msg
                        thing_id: recipient
                .then(console.log "Reply notification of #{ment.id} sent.")
        switch ment.kind
                when "selftext"
                        link = "http://redd.it/#{ment.id}"
                when "reply"
                        link = "https://www.reddit.com/r/#{ment.sr}/comments/#{ment.link_id}/#{pack.name}/#{ment.id}"
        msg = """
        /u/#{ment.author} has mentioned #{settings.search_string}
        [here](#{link}).
        """
        switch updateMethod
                when "PM" then sendPm()
                when "reply" then sendReply()

saveMentions = (ments) ->
        commitAndNotify = (ment, exists) ->
                if not exists
                        sendNotificationOf(ment)
                        db.mentions.insert(ment)
                        console.log "Inserting #{ment.id} to database."

        mentExistsInDb = (ment) ->
                exists = (ct) -> ct > 0
                return db.mentions.find({id: ment.id}).limit(1).count().then(exists)

        ments.forEach (ment) ->
                mentExistsInDb(ment).then (exists) -> commitAndNotify(ment, exists)

console.log "#{username} is now online."
reddit.auth()
.then(console.log "#{username} is logged in.")
.then(searchAllSubs)
.done()
