var _ = require('underscore'),
    db = require('./db');

exports.getRecommendationsFor = function (artists, callback) {
    db.retrieveAllUsers(artists, function (err, users) {
        if(err) {
            console.log('an error occurred');
            console.dir(err);
        } else {
            _.each(users, function (user) {
                var tracks = [];
                _.each(artists, function (artist) {
                    tracks = _.union(tracks, _.filter(user.tracks, function (track) {
                        return track.artist.name === artist.name;
                    }));
                });

                var nominator = _.reduce(tracks, function (memo, track) {
                    var trackAuthor = _.find(artists, function (artist) {
                        return artist.name === track.artist.name;
                    });

                    return memo + track.playcount * trackAuthor.score
                }, 0);

                var userDenominator = _.reduce(tracks, function (memo, track) {
                    return memo + track.playcount * track.playcount;
                }, 0);

                var artistDenominator = _.reduce(tracks, function (memo, track) {
                    var trackAuthor = _.find(artists, function (artist) {
                        return artist.name === track.artist.name;
                    });

                    return memo + trackAuthor.score * trackAuthor.score;
                }, 0);

                var similarity = nominator / (Math.sqrt(userDenominator) * Math.sqrt(artistDenominator));

                console.log('similarity metric is ', similarity);
            });
        }
    });
};
