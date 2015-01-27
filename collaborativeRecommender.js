var _ = require('underscore'),
    db = require('./db'),
    COUNT_NEIGHBOURS_DEFAULT = 17,
    COUNT_RECOMMENDED_TRACKS = 20,
    THRESHOLD_COMMON_ARTISTS_COUNT = 10;

exports.getRecommendations = function (userProfile, neighboursCount, recommendedItemsCount, callback) {
    var artistNames = _.map(userProfile.artists, function (artist) {
        return artist.name;
    });

    db.retrieveAllUsersForArtists(artistNames, function (err, users) {
        var recommendedTracks = [];

        if(err) {
            console.log('an error occurred');
            console.dir(err);
        } else {
            var userAverageScore = _.reduce(userProfile.artists, function (memo, artist) {
                return memo + artist.score;
            }, 0) / userProfile.artists.length,
                artists = _.indexBy(userProfile.artists, 'name'),
                trackScores = {},
                predictedRatings = [],
                activeUser = {
                    name: userProfile.name,
                    averageScore: userAverageScore,
                    artists: artists,
                    artistNames: artistNames,
                    neighboursCount: neighboursCount
                }, neighbours = getUserNeighbours(activeUser, users);

            _.each(neighbours, function (user, index) {
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

            _.each(trackScores, function (value, key) {
                var track = value.track,
                    ratingNominator = 0,
                    ratingDenominator = 0,
                    averageTrackValue = value.totalPlaycount / value.neighbours.length;

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

function getUserNeighbours(activeUser, users) {
    _.each(users, function (user) {
        user.similarity = getSimilarityForUser(user, activeUser.artists, activeUser.averageScore, activeUser.artistNames);
    });

    return _.first(_.sortBy(_.filter(users, function (user) {
        return user.similarity >= 0 && user.user !== activeUser.name;
    }), function (user) {
        return -user.similarity;
    }), activeUser.neighboursCount || COUNT_NEIGHBOURS_DEFAULT);
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
        userAverageScore = userTotalScore / userArtistsNames.length,
        nominator = 0,
        userDenominator = 0,
        artistsDenominator = 0,
        denominator;

    _.each(commonArtistsNames, function (name) {
        var userScore = playCountsPerArtist[name] - userAverageScore,
            artistScore = artists[name].score - artistsAverageScore;

        nominator += userScore * artistScore;
        userDenominator += userScore * userScore;
        artistsDenominator += artistScore * artistScore;
    });

    denominator = Math.sqrt(userDenominator * artistsDenominator);

    if(denominator === 0) {
        return 0;
    }

    return (nominator / denominator) * Math.min(commonArtistsNames.length / THRESHOLD_COMMON_ARTISTS_COUNT, 1);
}
