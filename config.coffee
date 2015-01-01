config =
        settings: require './settings.json'
        package:
                name: require('./package.json').name
                version: require('./package.json').version
                author: require('./package.json').author

module.exports = config
