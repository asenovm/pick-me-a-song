var fs = require('fs'),
    config = JSON.parse(fs.readFileSync('config.json')),
    LastfmAPI = require('lastfmapi'),
    _ = require('underscore'),
    async = require('async'),
    db = require('./db'),
    ArgumentParser = require('argparse').ArgumentParser,
    parser = new ArgumentParser({ version: '0.0.1', addHelp: true, description: 'last.fm crawler' }),
    lastfm = new LastfmAPI({
        api_key: config.apiKey,
        secret: config.secret
    }),
    LIMIT_PARALLEL_TASKS = 5;

parser.addArgument(['-u', '--users'], { help: 'crawl last.fm users', action: 'storeTrue' });
parser.addArgument(['-t', '--tracks'], { help: 'crawl last.fm annotated tracks', action: 'storeTrue' });
parser.addArgument(['-a', '--artists'], { help: 'crawl last.fm annotated artists', action: 'storeTrue' });

var args = parser.parseArgs();

if (args.tracks) {
    startCrawlingTrackTags();
} else if (args.artists) {
    startCrawlingArtistTags();
} else {
    startCrawlingUsers();
}

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
    var nextArtists = [];
    async.eachLimit(artists, LIMIT_PARALLEL_TASKS, function (artist, artistsCallback) {
        lastfm.artist.getTopTags({ artist: artist.artist.name }, function (err, tags) {
            insertArtistWithTags(artist.artist, tags.tag);
            async.eachLimit(tags.tag, LIMIT_PARALLEL_TASKS, function (tag, tagCallback) {
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
                                            console.log('inserting info for artist ', artist.name);
                                            insertArtistWithTags(artist, tags.tag);
                                        } else {
                                            console.log('already has info for artist ', artist.name);
                                        }
                                    });
                                }
                                tagCallback();
                            });
                        });
                        nextArtists = _.union(nextArtists, artists);
                    }
                });
            }, function (err) {
                artistsCallback(err);
            });
        });
    }, function (err) {
        crawlArtistTags(nextArtists);
    });
}

function startCrawlingTrackTags() {
    db.getInitialTags(function (err, tags) {
        crawlTracksForTags(tags);
    });
}

function crawlTracksForTags(tags) {
    var nextTags = [];
    async.eachSeries(tags, function (tag, callback) {
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
                            db.hasTrack(track, function (err, result) {
                                if(err || !result) {
                                    console.log('inserting info for ', track.name);
                                    db.insertTrackTags(track, _.noop);
                                } else {
                                    console.log('already has info for ', track.name); 
                                }
                            });
                            nextTags = _.union(nextTags, track.tags);
                        }
                        callback(err, result);
                    });
                });
            }
        });
    }, function (err) {
        crawlTracksForTags(nextTags);
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
    if (page > totalPages || page >= config.endPage) {
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
