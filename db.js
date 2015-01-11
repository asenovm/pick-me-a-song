var mongo = require('mongodb'),
    fs = require('fs'),
    _ = require('underscore'),
    config = JSON.parse(fs.readFileSync('db.json')),
    ObjectID = mongo.BSONPure.ObjectID,
    MongoClient = mongo.MongoClient, db,
    COLLECTION_USERS = 'users';

MongoClient.connect(config.dbURL, function (err, dbInstance) {
    db = dbInstance;
});

//XXX export a common module for interacting with the db both from the scraper and from the server part

exports.retrieveAllUsers = function (artists, callback) {
    var collection = db.collection(COLLECTION_USERS),
        names = _.map(artists, function (artist) {
            return artist.name;
        });

    collection.find({ tracks: { $elemMatch: { "artist.name": { "$in": names }}}}).toArray(callback);
}
