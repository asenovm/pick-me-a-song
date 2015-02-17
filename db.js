var mongo = require('mongodb'),
    fs = require('fs'),
    _ = require('underscore'),
    config = JSON.parse(fs.readFileSync('db.json')),
    ObjectID = mongo.BSONPure.ObjectID,
    MongoClient = mongo.MongoClient, db,
    COLLECTION_USERS = 'users',
    COLLECTION_USER_ARTISTS = 'userArtists',
    COLLECTION_EVALUATION = 'evaluation',
    COLLECTION_TRACKS_TO_RATE = 'tracksToRate',
    COLLECTION_TAGGED_TRACKS = 'taggedTracks',
    COLLECTION_TAGGED_ARTISTS = 'taggedArtists',
    COLLECTION_RECOMMENDATIONS = 'recommendations',
    COLLECTION_ARTISTS_INDEX = 'artistsIndex',
    COLLECTION_TRACKS_INDEX = 'tracksIndex',
    FILE_TOP_TRACKS = 'topTracks.json',
    NUMBER_TRACKS_TO_RATE = 15,
    NUMBER_USERS_FOR_EVALUATION = 1000;

MongoClient.connect(config.dbURL, function (err, dbInstance) {
    db = dbInstance;
});

exports.retrieveUsersForEvaluation = function (callback) {
    MongoClient.connect(config.dbURL, function (err, db) {
        var users = db.collection(COLLECTION_USERS);
        users.find({}).limit(NUMBER_USERS_FOR_EVALUATION).toArray(callback);
    });
};

exports.retrieveAllUsersForArtists = function (artistNames, callback) {
    var users = db.collection(COLLECTION_USERS),
        artistsIndex = db.collection(COLLECTION_ARTISTS_INDEX),
        start = Date.now();

    artistsIndex.find({ artist: { $in: artistNames }}).toArray(function (err, result) {
        var userIds = _.reduce(result, function (memo, artistInfo) {
            return _.union(memo, artistInfo.users);
        }, []);

        users.find({ _id: { $in: userIds }}).toArray(callback);
    });
};

exports.updateUserRecommendations = function (userId, recommendations, callback) {
    var collection = db.collection(COLLECTION_RECOMMENDATIONS);
    collection.update({ userId: userId }, { $pushAll: { tracks: recommendations }}, { upsert: true }, function (err, result) {
        callback(err, result);
    });
};

exports.retrieveRecommendations = function (userId, callback) {
    var recommendations = db.collection(COLLECTION_RECOMMENDATIONS);
    recommendations.findOne({ userId: userId }, function (err, result) {
        if(err || !result) {
            callback(err, result);
        } else {
            callback(err, _.sortBy(result.tracks, function (track) {
                return -track.timestamp;
            }));
        }
    });
};

exports.updateUserProfile = function (user, callback) {
    var users = db.collection(COLLECTION_USERS),
        artistsIndex = db.collection(COLLECTION_ARTISTS_INDEX),
        tracksIndex = db.collection(COLLECTION_TRACKS_INDEX);

    users.update({ user: user.name }, { $pushAll: { tracks: user.tracks }}, { upsert: true }, function (err, result) {
        users.findOne({ user: user.name }, function (err, user) {
            var averagePlaycount = _.reduce(user.tracks, function (memo, track) {
                return memo + parseInt(track.playcount, 10);
            }, 0) / user.tracks.length;

            users.update({ user: user.user }, { $set: {averagePlaycount : averagePlaycount }}, callback);

            _.each(user.tracks, function (track) {
                artistsIndex.update({ artist: track.artist.name }, { $addToSet: { users: user._id }}, { upsert: true }, _.noop);
                tracksIndex.update({ track: track.name }, { $addToSet: { users: user._id }}, { upsert: true }, _.noop);
            });
        });
    });
};

exports.hasUser = function (user, callback) {
    var users = db.collection(COLLECTION_USERS);
    users.findOne({ user: user }, callback);
};

exports.hasTrack = function (track, callback) {
    var taggedTracks = db.collection(COLLECTION_TAGGED_TRACKS);
    taggedTracks.findOne({ name: track.name}, callback);
};

exports.hasArtist = function (artist, callback) {
    var taggedArtists = db.collection(COLLECTION_TAGGED_ARTISTS);
    taggedArtists.findOne({ name: artist.name }, callback);
};

exports.writeEvaluationMetrics = function (userId, metrics, callback) {
    var evaluation = db.collection(COLLECTION_EVALUATION);
    evaluation.insert({ userId: userId, metrics: metrics }, callback);
};

exports.getTracksToRate = function (callback) {
    var tracksToRate = db.collection(COLLECTION_TRACKS_TO_RATE);
    tracksToRate.find({}).toArray(callback);
};

exports.findAndSaveTracksToRate = function () {
    var topTracks = JSON.parse(fs.readFileSync(FILE_TOP_TRACKS)),
        tracksToRate = db.collection(COLLECTION_TRACKS_TO_RATE);

    tracksToRate.remove({}, function (err, result) {
        tracksToRate.insert(topTracks, _.noop);
    });
};

exports.getInitialTags = function (callback) {
    MongoClient.connect(config.dbURL, function (err, db) {
        var tracksToRate = db.collection(COLLECTION_TRACKS_TO_RATE);
        tracksToRate.find({}, { tags: 1 }).toArray(function (err, result) {
            var tags = [];

            if(result) {
                var allTags = _.pluck(result, 'tags');

                _.each(allTags, function (trackTags) {
                    tags = _.union(tags, trackTags); 
                });

                tags = _.uniq(tags, false, function (tag) {
                    return tag.name;
                });
            }

            callback(err, tags);
        });
    });
};

exports.getInitialArtists = function (callback) {
    MongoClient.connect(config.dbURL, function (err, db) {
        var tracksToRate = db.collection(COLLECTION_TRACKS_TO_RATE);
        tracksToRate.find({}, { artist: 1 }).toArray(callback);
    });
}

exports.updateUserArtists = function (userId, artists, callback) {
    var userArtists = db.collection(COLLECTION_USER_ARTISTS);
    userArtists.findOne({ userId: userId }, function (err, result) {
        if(err || !result) {
            userArtists.update({ userId: userId }, { $set: { artists: artists }}, { upsert: true }, callback);
        } else {
            var uniqueArtists = _.union(artists, result.artists || []),
                resultIndex = _.indexBy(result.artists, 'name'),
                artistsIndex = _.indexBy(artists, 'name');

            uniqueArtists = _.uniq(uniqueArtists, false, function (artist) {
                return artist.name;
            });

            _.each(uniqueArtists, function (artist) {
                var score = 0,
                    count = 0;

                if(resultIndex[artist.name]) {
                    score += resultIndex[artist.name].score * resultIndex[artist.name].count;
                    count += resultIndex[artist.name].count;
                }
                if(artistsIndex[artist.name]) {
                    score += artistsIndex[artist.name].score * artistsIndex[artist.name].count;
                    count += artistsIndex[artist.name].count;
                }

                artist.score = score / count;
                artist.count = count;
            });

            userArtists.update({ userId: userId }, { $set: { artists: uniqueArtists }}, { upsert: true }, callback);
        }
    });
};

exports.retrieveUserArtists = function (userId, callback) {
    var userArtists = db.collection(COLLECTION_USER_ARTISTS);
    userArtists.findOne({ userId: userId }, function (err, result) {
        if(err) {
            callback(err, result);
        } else {
            callback(false, _.sortBy(result.artists, function (artist) {
                return -artist.timestamp;
            }));
        }
    });
};

exports.insertTrackTags = function (track, callback) {
    var taggedTracks = db.collection(COLLECTION_TAGGED_TRACKS);
    taggedTracks.insert(track, callback);
};

exports.insertArtistTags = function (artist, callback) {
    var taggedArtists = db.collection(COLLECTION_TAGGED_ARTISTS);
    taggedArtists.insert(artist, callback);
};

exports.getTagsForArtists = function (artists, callback) {
    var taggedArtists = db.collection(COLLECTION_TAGGED_ARTISTS),
        artistNames = _.map(artists, function (artist) {
            return artist.name;
        });

    taggedArtists.find({ name: {$in: artistNames }}).toArray(callback);
};

exports.getTracksForTags = function (tags, callback) {
    var taggedTracks = db.collection(COLLECTION_TAGGED_TRACKS);
    taggedTracks.find({ "tags.name": { $in: tags }}).toArray(callback);
};

exports.retrieveAllUsersForTracks = function (trackNames, callback) {
    var tracksIndex = db.collection(COLLECTION_TRACKS_INDEX),
        users = db.collection(COLLECTION_USERS);

    tracksIndex.find({ track: { $in: trackNames }}, { users: 1}).toArray(function (err, tracks) {
        var userIds = _.reduce(tracks, function (memo, track) {
            return _.union(memo, track.users);
        }, []);
        users.find({ _id: { $in: userIds }}).toArray(function (err, users) {
            callback(err, users);
        });
    });
};

exports.getEvaluations = function (callback) {
    MongoClient.connect(config.dbURL, function (err, db) {
        var evaluations = db.collection(COLLECTION_EVALUATION);
        evaluations.find({}).limit(NUMBER_USERS_FOR_EVALUATION).toArray(callback);
    });
};
