var _ = require('underscore'),
    db = require('./db'),
    MIN_COMMON_USERS = 5,
    MIN_RECOMMENDED_ITEMS_PER_USER = 2,
    EPS = 0.001;

exports.getRecommendationsFor = function (artists, neighboursCount, recommendedItemsCount, callback) {
    db.retrieveAllUsers(artists, function (err, users) {
        var recommendedTracks = [];

        if(err) {
            console.log('an error occurred');
            console.dir(err);
        } else {
            var artistNames = _.map(artists, function (artist) {
                return artist.name;
            });

            _.each(users, function (user) {
                user.similarity = getSimilarityForUser(user, artists);
            });

            users = _.first(_.sortBy(_.filter(users, function (user) {
                return user.similarity >= 0;
            }), function (user) {
                return -user.similarity;
            }), neighboursCount || MIN_COMMON_USERS);

            _.each(users, function (user) {
                user.tracks = _.reject(_.uniq(_.sortBy(user.tracks, function (track) {
                    return -track.playcount;
                }), function (track) {
                    return track.artist.name;
                }), function (track) {
                    return _.contains(artistNames, track.artist.name);
                });
            });

            recommendedTracks = _.map(users, function (user, index) {
                return _.first(user.tracks, (Math.min(users.length, neighboursCount || MIN_COMMON_USERS) - index) * (recommendedItemsCount || MIN_RECOMMENDED_ITEMS_PER_USER));
            });
        }

        callback(err, _.flatten(recommendedTracks));
    });
};

function getSimilarityForUser(user, artists) {
    var tracksPerArtist = _.groupBy(user.tracks, function (track) {
        return track.artist.name;
    }), playCountsPerArtist = {};
    
    _.each(tracksPerArtist, function (value, key) {
        playCountsPerArtist[key] = _.reduce(value, function (memo, track) {
            return memo + parseInt(track.playcount, 10);
        }, 0);
    });

    var userTotalScore = 0,
        userScoreCount = 0;

    _.each(playCountsPerArtist, function (value, key) {
        userTotalScore += value;
        ++userScoreCount;
    });

    var userAverageScore = userTotalScore / userScoreCount;
    var artistsTotalScore = _.reduce(artists, function (memo, artist) {
        return memo + parseInt(artist.score, 10);
    }, 0);
    var artistsAverageScore = artistsTotalScore / artists.length;

    var userArtistsNames = _.keys(playCountsPerArtist),
        artistsNames = _.map(artists, function (artist) {
        return artist.name;
    }), commonArtistsNames = _.intersection(artistsNames, userArtistsNames);


    var nominator = _.reduce(commonArtistsNames, function (memo, name) {
        var userScore = playCountsPerArtist[name] - userAverageScore,
            artistScore = _.findWhere(artists, { name: name }).score - artistsAverageScore;

        return memo + userScore * artistScore + EPS;
    }, 0);

    var userDenominator = Math.sqrt(_.reduce(commonArtistsNames, function (memo, name) {
        var userScore = playCountsPerArtist[name] - userAverageScore;
        return memo + userScore * userScore + EPS;
    }, 0));

    var artistsDenominator = Math.sqrt(_.reduce(commonArtistsNames, function (memo, name) {
        var artistScore = _.findWhere(artists, { name: name }).score - artistsAverageScore;
        return memo + artistScore * artistScore + EPS;
    }, 0));

    var denominator = userDenominator * artistsDenominator;

    return nominator / denominator;
}
