var mongo = require('mongodb'),
    fs = require('fs'),
    _ = require('underscore'),
    config = JSON.parse(fs.readFileSync('db.json')),
    ObjectID = mongo.BSONPure.ObjectID,
    MongoClient = mongo.MongoClient, db,
    COLLECTION_USERS = 'users',
    COLLECTION_EVALUATION = 'evaluation',
    COLLECTION_TRACKS_TO_RATE = 'tracksToRate',
    NUMBER_TRACKS_TO_RATE = 15;

MongoClient.connect(config.dbURL, function (err, dbInstance) {
    db = dbInstance;
});

exports.retrieveAllUsers = function (artists, callback) {
    var collection = db.collection(COLLECTION_USERS),
        names = _.map(artists, function (artist) {
            return artist.name;
        });

    collection.find({ tracks: { $elemMatch: { "artist.name": { "$in": names }}}}).toArray(callback);
}

exports.updateUserProfile = function (user, callback) {
    var users = db.collection(COLLECTION_USERS);
    users.update({ user: user.name }, { $pushAll: { tracks: user.tracks }}, { upsert: true }, callback);
};

exports.hasUser = function (user, callback) {
    var users = db.collection(COLLECTION_USERS);
    users.findOne({ user: user }, callback);
};

exports.writeEvaluationMetric = function (userId, metricName, metricValue, callback) {
    var evaluation = db.collection(COLLECTION_EVALUATION);
    evaluation.update({ userId: userId }, { metricName: metricName, metricValue: metricValue }, { upsert: true }, callback);
};

exports.getTracksToRate = function (callback) {
    var tracksToRate = db.collection(COLLECTION_TRACKS_TO_RATE);
    tracksToRate.find({}).toArray(callback);
};

exports.findAndSaveTracksToRate = function () {
    var users = db.collection(COLLECTION_USERS);
    users.find({}).toArray(function (err, result) {
        var tracks = _.flatten(_.map(result, function (user) {
            return user.tracks;
        })), trackNames = _.uniq(tracks, function (track) {
            return track.name;
        });

        tracks = _.map(trackNames, function (uniqueTrack) {
            var totalPlaycount = 0;
            _.each(tracks, function (track) {
                if(track.name === uniqueTrack.name) {
                    totalPlaycount += parseInt(track.playcount, 10);
                }
            })
            return {
                playcount: totalPlaycount,
                track: uniqueTrack
            };
        });

        tracks = _.first(_.sortBy(tracks, function (track) {
            return -track.playcount;
        }), NUMBER_TRACKS_TO_RATE);

        var tracksToRate = db.collection(COLLECTION_TRACKS_TO_RATE);
        tracksToRate.remove(function (err, result) {
            tracksToRate.insert(_.map(tracks, function (track) {
                return track.track;
            }), _.noop);
        });

    });
};
