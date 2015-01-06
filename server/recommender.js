var _ = require('underscore'),
    db = require('./db');

exports.getRecommendationsFor = function (bands, callback) {
    db.retrieveAllUsers(bands, function (err, similarUsers) {
        if(err) {
            console.log('an error occurred');
            console.dir(err);
        } else {
            console.dir(_.map(similarUsers, function (user) {
                return user.user;
            }));
        }
    });
};
