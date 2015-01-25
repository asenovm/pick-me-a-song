var _ = require('underscore'),
    db = require('./db'),
    MIN_COMMON_USERS = 5,
    MIN_RECOMMENDED_ITEMS_PER_USER = 2,
    COUNT_RECOMMENDED_TRACKS = 20,
    EPS = 0.001;

exports.getRecommendations = function (artists, neighboursCount, recommendedItemsCount, callback) {
    db.retrieveAllUsersForArtists(artists, function (err, users) {
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

            var trackScores = {};
            _.each(users, function (user, index) {
                _.each(user.tracks, function (track) {
                    var key = track.name + track.artist.name;
                    trackScores[key] = trackScores[key] || { totalPlaycount: 0, neighbours: [], track: track };
                    trackScores[key].totalPlaycount += (users.length - index) * parseInt(track.playcount, 10);
                    trackScores[key].neighbours.push(user);
                });
            });

            var predictedRatings = [];

            _.each(trackScores, function (value, key) {
                var track = trackScores[key].track;
                track.score = trackScores[key].totalPlaycount / trackScores[key].neighboursPlayed;
                predictedRatings.push(track);
            });

            recommendedTracks = _.first(_.sortBy(predictedRatings, function (track) {
                return -track.score;
            }, COUNT_RECOMMENDED_TRACKS));
        }

        callback(err, recommendedTracks);
    });
}

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
