var _ = require('underscore'),
    db = require('./db');

exports.getRecommendationsFor = function (artists, callback) {
    db.retrieveAllUsers(artists, function (err, users) {
        var recommendedTracks = [];

        if(err) {
            console.log('an error occurred');
            console.dir(err);
        } else {
            _.each(users, function (user) {
                user.similarity = getSimilarityForUser(user, artists);
            });

            users = _.sortBy(users, function (user) {
                return user.similarity;
            });

            _.each(users, function (user) {
                user.tracks = _.sortBy(user.tracks, function (track) {
                    return -track.playcount;
                });
            });
        }

        recommendedTracks = _.map(users, function (user) {
            return user.tracks;
        });

        callback(err, _.flatten(recommendedTracks));
    });
};

function getSimilarityForUser(user, artists) {
    var tracks = [];
    _.each(artists, function (artist) {
        tracks = _.union(tracks, _.filter(user.tracks, function (track) {
            return track.artist.name === artist.name;
        }));
    });

    var nominator = _.reduce(tracks, function (memo, track) {
        var trackAuthor = _.find(artists, matchTrackAuthor(track));
        return memo + track.playcount * trackAuthor.score
    }, 0);

    var userDenominator = _.reduce(tracks, function (memo, track) {
        return memo + track.playcount * track.playcount;
    }, 0);

    var artistDenominator = _.reduce(tracks, function (memo, track) {
        var trackAuthor = _.find(artists, matchTrackAuthor(track));
        return memo + trackAuthor.score * trackAuthor.score;
    }, 0);

    return nominator / (Math.sqrt(userDenominator) * Math.sqrt(artistDenominator));
}

function matchTrackAuthor(track) {
    return function (artist) {
        return artist.name === track.artist.name;
    };
}
