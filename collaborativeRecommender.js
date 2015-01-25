var _ = require('underscore'),
    db = require('./db'),
    COUNT_NEIGHBOURS_DEFAULT = 5,
    COUNT_RECOMMENDED_TRACKS = 20,
    THRESHOLD_COMMON_ARTISTS_COUNT = 10;

exports.getRecommendations = function (artists, neighboursCount, recommendedItemsCount, callback) {
    db.retrieveAllUsersForArtists(artists, function (err, users) {
        var recommendedTracks = [];

        if(err) {
            console.log('an error occurred');
            console.dir(err);
        } else {
            var artistNames = _.map(artists, function (artist) {
                return artist.name;
            }), userAverageScore = _.reduce(artists, function (memo, artist) {
                return memo + artist.score;
            }, 0) / artists.length;

            _.each(users, function (user) {
                user.similarity = getSimilarityForUser(user, artists);
                user.averagePlaycount = getAveragePlaycountForUser(user);
            });

            users = _.first(_.sortBy(_.filter(users, function (user) {
                return user.similarity >= 0;
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
                    ratingNominator += neighbour.user.similarity * (neighbour.playcount - neighbour.user.averagePlaycount);
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
