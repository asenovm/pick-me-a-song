var fs = require('fs'),
    express = require('express'),
    app = express(),
    config = JSON.parse(fs.readFileSync('config.json')),
    LastfmAPI = require('lastfmapi'),
    _ = require('underscore'),
    db = require('./db'),
    lastfm = new LastfmAPI({
        api_key: config.apiKey,
        secret: config.secret
    });

startCrawling();

function startCrawling() {
    crawl(config.crawlRoot);
}

function crawl(user) {
    visitNode(user, config.startPage, config.startPage);
    lastfm.user.getFriends({ user: user }, function (err, result) {
        if(err) {
            console.log('an error occurred');
            console.dir(err);
        } else {
            var friends = result.user;
            _.each(friends, function (friend) {
                db.hasUser(friend.name, function (err, result) {
                    if(!result && friend.name) {
                        crawl(friend.name);
                    }
                });
            });
        }
    });
}

function visitNode (user, page, totalPages) {
    if (page > totalPages || page > config.endPage) {
        return;
    }

    lastfm.user.getTopTracks({ user: user, page: page, limit: config.itemsPerPage}, function (err, result) {
        if (err) {
            console.log('get tracks err is ', err);
        } else if (result['@attr']) {
            var meta = result['@attr'],
                totalPages = meta.totalPages,
                tracks = _.isArray(result.track) ? result.track : [result.track];

            _.each(tracks, function (track) {
                track.name = track.name.toUpperCase();
            });

            db.updateUserProfile({ name: user, tracks: tracks }, function (err, result) {
                visitNode(user, page + 1, totalPages);
            });
        }
    });
}

app.listen(process.env.PORT || 3067);
