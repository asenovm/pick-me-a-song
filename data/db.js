var mongo = require('mongodb'),
    fs = require('fs'),
    config = JSON.parse(fs.readFileSync('db.json')),
    ObjectID = mongo.BSONPure.ObjectID,
    MongoClient = mongo.MongoClient, db,
    COLLECTION_USERS = 'users';

MongoClient.connect(config.dbURL, function (err, dbInstance) {
    db = dbInstance;
});

exports.updateUserProfile = function (user, callback) {
    var users = db.collection(COLLECTION_USERS);
    users.update({ user: user.name }, { $pushAll: { tracks: user.tracks }}, { upsert: true }, callback);
};

exports.hasUser = function (user, callback) {
    var users = db.collection(COLLECTION_USERS);
    users.findOne({ user: user }, callback);
};
