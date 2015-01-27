var _ = require('underscore'),
    db = require('./db'),
    COUNT_NEIGHBOURS_DEFAULT = 17,
    COUNT_RECOMMENDED_TRACKS = 20,
    THRESHOLD_COMMON_ARTISTS_COUNT = 10;

exports.getRecommendations = function (userProfile, neighboursCount, recommendedItemsCount, callback) {
    db.retrieveAllUsersForArtists(userProfile.artists, function (err, users) {
        var recommendedTracks = [];

        if(err) {
            console.log('an error occurred');
            console.dir(err);
        } else {
            var artistNames = _.map(userProfile.artists, function (artist) {
                return artist.name;
            }), userAverageScore = _.reduce(userProfile.artists, function (memo, artist) {
                return memo + artist.score;
            }, 0) / userProfile.artists.length;

            _.each(users, function (user) {
                user.similarity = getSimilarityForUser(user, userProfile.artists, userAverageScore, artistNames);
            });

            users = _.first(_.sortBy(_.filter(users, function (user) {
                return user.similarity >= 0 && user.user !== userProfile.name;
            }), function (user) {
                return -user.similarity;
            }), neighboursCount || COUNT_NEIGHBOURS_DEFAULT);

            var trackScores = {};
            _.each(users, function (user, index) {
                _.each(user.tracks, function (track) {
                    var key = track.name + track.artist.name,
                        playcount = parseInt(track.playcount, 10);

                    trackScores[key] = trackScores[key] || { totalPlaycount: 0, neighbours: [], track: track };
                    trackScores[key].totalPlaycount += playcount;
                    trackScores[key].neighbours.push({
                        user: user,
                        playcount: playcount
                    });
                });
            });

            var predictedRatings = [];

            _.each(trackScores, function (value, key) {
                var track = trackScores[key].track,
                    ratingNominator = 0,
                    ratingDenominator = 0,
                    averageTrackValue = _.reduce(value.neighbours, function (memo, neighbour) {
                        return memo + neighbour.playcount;
                    }, 0) / value.neighbours.length;

                _.each(value.neighbours, function (neighbour) {
                    ratingNominator += neighbour.user.similarity * (neighbour.playcount - parseInt(neighbour.user.averagePlaycount, 10));
                    ratingDenominator += Math.abs(neighbour.user.similarity);
                });

                track.score = userAverageScore + ratingNominator / ratingDenominator;
                predictedRatings.push(track);
            });

            recommendedTracks = _.first(_.sortBy(predictedRatings, function (track) {
                return -track.score;
            }), COUNT_RECOMMENDED_TRACKS);
        }

        callback(err, recommendedTracks);
    });
}

function getAveragePlaycountForUser(user) {
    return _.reduce(user.tracks, function (memo, track) {
        return memo + parseInt(track.playcount, 10);
    }, 0) / user.tracks.length;
}

function getSimilarityForUser(user, artists, artistsAverageScore, artistsNames) {
    var playCountsPerArtist = {},
        userTotalScore = 0,
        userScoreCount = 0,
        trackPlaycount = 0;

    _.each(user.tracks, function (track) {
        trackPlaycount = parseInt(track.playcount, 10);
        playCountsPerArtist[track.artist.name] = playCountsPerArtist[track.artist.name] || 0;
        playCountsPerArtist[track.artist.name] += trackPlaycount;
        userTotalScore += trackPlaycount;
    });

    var userArtistsNames = _.keys(playCountsPerArtist),
        commonArtistsNames = _.intersection(artistsNames, userArtistsNames),
        userAverageScore = userTotalScore / userArtistsNames.length;

    var nominator = _.reduce(commonArtistsNames, function (memo, name) {
        var userScore = playCountsPerArtist[name] - userAverageScore,
            artistScore = _.findWhere(artists, { name: name }).score - artistsAverageScore;

        return memo + userScore * artistScore;
    }, 0);

    var userDenominator = Math.sqrt(_.reduce(commonArtistsNames, function (memo, name) {
        var userScore = playCountsPerArtist[name] - userAverageScore;
        return memo + userScore * userScore;
    }, 0));

    var artistsDenominator = Math.sqrt(_.reduce(commonArtistsNames, function (memo, name) {
        var artistScore = _.findWhere(artists, { name: name }).score - artistsAverageScore;
        return memo + artistScore * artistScore;
    }, 0));

    var denominator = userDenominator * artistsDenominator;

    if(denominator === 0) {
        return 0;
    }

    return (nominator / denominator) * Math.min(commonArtistsNames.length / THRESHOLD_COMMON_ARTISTS_COUNT, 1);
}
