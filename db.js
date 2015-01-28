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
    FILE_TOP_TRACKS = 'topTracks.json',
    NUMBER_TRACKS_TO_RATE = 15,
    NUMBER_USERS_FOR_EVALUATION = 200;

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
    var collection = db.collection(COLLECTION_USERS);
    collection.find({ "tracks.artist.name": { "$in": artistNames }}).toArray(callback);
}

exports.updateUserRecommendations = function (userId, recommendations, callback) {
    var collection = db.collection(COLLECTION_RECOMMENDATIONS);
    collection.update({ userId: userId }, { $pushAll: { tracks: recommendations }}, { upsert: true }, callback);
};

exports.retrieveRecommendations = function (userId, callback) {
    var recommendations = db.collection(COLLECTION_RECOMMENDATIONS);
    recommendations.findOne({ userId: userId }, callback);
};

exports.updateUserProfile = function (user, callback) {
    var users = db.collection(COLLECTION_USERS);
    users.update({ user: user.name }, { $pushAll: { tracks: user.tracks }}, { upsert: true }, function (err, result) {
        users.findOne({ user: user.name }, function (err, user) {
            var averagePlaycount = _.reduce(user.tracks, function (memo, track) {
                return memo + parseInt(track.playcount, 10);
            }, 0) / user.tracks.length;

            users.update({ user: user.user }, { $set: {averagePlaycount : averagePlaycount }}, callback);
        });
    });
};

exports.hasUser = function (user, callback) {
    var users = db.collection(COLLECTION_USERS);
    users.findOne({ user: user }, callback);
};

exports.writeEvaluationMetrics = function (userId, metrics, callback) {
    var evaluation = db.collection(COLLECTION_EVALUATION);
    evaluation.update({ userId: userId }, { $set: metrics }, { upsert: true }, callback);
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
    userArtists.update({ userId: userId }, { $pushAll: { artists: artists }}, { upsert: true }, callback);
};

exports.retrieveUserArtists = function (userId, callback) {
    var userArtists = db.collection(COLLECTION_USER_ARTISTS);
    userArtists.findOne({ userId: userId }, function (err, result) {
        if(err) {
            callback(err, result);
        } else {
            callback(false, result.artists);
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
    var taggedTracks = db.collection(COLLECTION_TAGGED_TRACKS),
        tagNames = _.map(tags, function (tag) {
            return tag.name;
        });
    taggedTracks.find({ "tags.name": { $in: tagNames }}).toArray(callback);
};
