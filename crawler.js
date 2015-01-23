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

//startCrawlingUsers();
//startCrawlingSongTags();
startCrawlingArtistTags();

function startCrawlingArtistTags() {
    db.getInitialArtists(function (err, artists) {
        _.each(artists, function (artist) {
            lastfm.artist.getTopTags({ artist: artist.artist.name }, function (err, tags) {
                artist.artist.tags = _.filter(tags.tag, function (tag) {
                    return parseInt(tag.count, 10) > 0;
                });
                db.insertArtistTags(artist.artist, _.noop);
            });
        });
    });
}

function startCrawlingSongTags() {
    //only crawl 1 level down
    db.getInitialTags(function (err, tags) {
        _.each(tags, function (tag) {
            lastfm.tag.getTopTracks({ tag: tag.name }, function (err, result) {
                if (err || !result) {
                    console.log('tag get top tracks err is ', err);
                } else {
                    var tracks = result.track;
                    _.each(tracks, function (track) {
                        lastfm.track.getTopTags({ track: track.name, artist: track.artist.name }, function (err, result) {
                            if(err || !result) {
                                console.log('track get top tags err is ', err);
                            } else {
                                track.tags = result.tag;
                                db.insertTrackTags(track, _.noop);
                            }
                        });
                    });
                }
            });
        });
    });
}

function startCrawlingUsers() {
    crawlUser(config.crawlRoot);
}

function crawlUser(user) {
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
                        crawlUser(friend.name);
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
            visitNode(user, page + 1, totalPages);
        } else if (result['@attr']) {
            var meta = result['@attr'],
                totalPages = meta.totalPages,
                tracks = _.isArray(result.track) ? result.track : [result.track];

            db.updateUserProfile({ name: user, tracks: tracks }, function (err, result) {
                visitNode(user, page + 1, totalPages);
            });
        }
    });
}

app.listen(process.env.PORT || 3067);
