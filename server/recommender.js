var db = require('./db');

exports.getRecommendationsFor = function (bands, callback) {
    db.retrieveAllUsers(callback);
};
