var mongo = require('mongodb'),
    fs = require('fs'),
    _ = require('underscore'),
    config = JSON.parse(fs.readFileSync('db.json')),
    ObjectID = mongo.BSONPure.ObjectID,
    MongoClient = mongo.MongoClient, db,
    COLLECTION_USERS = 'users',
    COLLECTION_EVALUATION = 'evaluation';

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
