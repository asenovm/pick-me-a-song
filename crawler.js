var fs = require('fs'),
    config = JSON.parse(fs.readFileSync('config.json')),
    LastfmAPI = require('lastfmapi'),
    _ = require('underscore'),
    async = require('async'),
    db = require('./db'),
    lastfm = new LastfmAPI({
        api_key: config.apiKey,
        secret: config.secret
    }),
    NUMBER_TAGS_CRAWLED = 5;

startCrawlingUsers();
//startCrawlingSongTags();
//startCrawlingArtistTags();

function insertArtistWithTags(artist, tags) {
    artist.tags = _.filter(tags, function (tag) {
        return parseInt(tag.count, 10) > 0;
    });
    db.insertArtistTags(artist, _.noop);
}

function startCrawlingArtistTags() {
    db.getInitialArtists(function (err, artists) {
        crawlArtistTags(artists);
    });
}

function crawlArtistTags(artists) {
    async.eachLimit(artists, 5, function (artist, artistsCallback) {
        lastfm.artist.getTopTags({ artist: artist.artist.name }, function (err, tags) {
            insertArtistWithTags(artist.artist, tags.tag);
            async.eachLimit(tags.tag, 5, function (tag, tagCallback) {
                lastfm.tag.getTopArtists({ tag: tag.name }, function (err, tagArtists) {
                    if(err || !tagArtists) {
                        console.log('error retrieving top artists for tag');
                    } else {
                        var artists = tagArtists.artist;
                        _.each(artists, function (artist) {
                            lastfm.artist.getTopTags({ artist: artist.name }, function (err, tags) {
                                if(err || !tags) {
                                    console.log('error retrieving top tags for artist');
                                } else {
                                    db.hasArtist(artist, function (err, result) {
                                        if(err || !result) {
                                            insertArtistWithTags(artist, tags.tag);
                                        }
                                    });
                                    tagCallback();
                                }
                            });
                        });
                        crawlArtistTags(artists);
                    }
                });
            }, function (err) {
                artistsCallback(err);
            });
        });
    }, function (err) {
        console.log('done');
    });
}

function startCrawlingSongTags() {
    db.getInitialTags(function (err, tags) {
        crawlTracksForTags(tags);
    });
}

function crawlTracksForTags(tags) {
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
                            crawlTracksForTags(track.tags);
                            db.hasTrack(track, function (err, result) {
                                if(err || !result) {
                                    db.insertTrackTags(track, _.noop);
                                }
                            });
                        }
                    });
                });
            }
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

    console.log('crawling ' + user + ' ' + page);

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
