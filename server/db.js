var mongo = require('mongodb'),
    fs = require('fs'),
    config = JSON.parse(fs.readFileSync('db.json')),
    ObjectID = mongo.BSONPure.ObjectID,
    MongoClient = mongo.MongoClient, db,
    COLLECTION_USERS = 'users';

MongoClient.connect(config.dbURL, function (err, dbInstance) {
    db = dbInstance;
});

//XXX export a common module for interacting with the db both from the scraper and from the server part

exports.retrieveAllUsers = function (bands, callback) {
    var collection = db.collection(COLLECTION_USERS),
        band = bands[0].name;

    collection.find({ tracks: { $elemMatch: { "artist.name": band }}}).toArray(callback);
}
