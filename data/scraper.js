var fs = require('fs'),
    config = JSON.parse(fs.readFileSync('config.json')),
    LastFmNode = require('lastfm').LastFmNode,
    lastfm = new LastFmNode({
        api_key: config.apiKey,
        secret: config.secret,
        useragent: config.userAgent
    });
