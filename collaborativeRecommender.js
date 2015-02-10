var _ = require('underscore'),
    db = require('./db'),
    recommenderUtil = require('./recommenderUtil'),
    COUNT_NEIGHBOURS_DEFAULT = 22,
    THRESHOLD_COMMON_ARTISTS_COUNT = 10,
    METRIC_TYPE_ARTISTS = 'artists';

exports.getRecommendations = function (userProfile, previousRecommendations, options, callback) {
    if(options.metricType === METRIC_TYPE_ARTISTS) {
        getRecommendationsFromArtists(userProfile, previousRecommendations, options, callback);
    } else {
        getRecommendationsFromTracks(userProfile, previousRecommendations, options, callback);
    }

};

function getRecommendationsFromTracks(userProfile, previousRecommendations, options, callback) {
    var trackNames = _.map(userProfile.tracks, function (track) {
        return track.name;
    });

    db.retrieveAllUsersForTracks(trackNames, function (err, users) {
        if(err) {
            callback(err, []);
        } else {
            var averageScore = _.reduce(userProfile.tracks, function (memo, track) {
                return memo + track.score;
            }, 0) / userProfile.tracks.length;

            _.each(users, function (user) {
                user.similarity = getTrackSimilarityForUser(user, userProfile.tracks, averageScore);
            });

            var activeUser = { 
                    neighboursCount: options.neighboursCount,
                    name: userProfile.name,
                    averageScore: averageScore
                };

            callback(err, getRecommendedTracks(activeUser, users, previousRecommendations));
        }
    });
}

function getRecommendationsFromArtists(userProfile, previousRecommendations, options, callback) {
    var artistNames = _.map(userProfile.artists, function (artist) {
        return artist.name;
    });

    db.retrieveAllUsersForArtists(artistNames, function (err, users) {
        var recommendedTracks = [];

        if(err) {
            console.log('an error occurred');
            console.dir(err);
        } else {
            var userAverageScore = getUserAverageScore(userProfile),
                artists = _.indexBy(userProfile.artists, 'name'),
                predictedRatings = [],
                activeUser = {
                    name: userProfile.name,
                    averageScore: userAverageScore,
                    artists: artists,
                    artistNames: artistNames,
                    neighboursCount: options.neighboursCount
                };
                
            _.each(users, function (user) {
                user.similarity = getSimilarityForUser(user, activeUser.artists, activeUser.averageScore, activeUser.artistNames);
            });

            recommendedTracks = getRecommendedTracks(activeUser, users, previousRecommendations);
        }

        callback(err, recommendedTracks);
    });
}

function getRecommendedTracks(activeUser, users, previousRecommendations) {
    var neighbours = getUserNeighbours(activeUser, users),
        trackScores = getNeighboursTrackScores(neighbours),
        predictedRatings = [];

    _.each(trackScores, function (value, key) {
        var track = value.track,
            ratingNominator = 0,
            ratingDenominator = 0;

        _.each(value.neighbours, function (neighbour) {
            ratingNominator += neighbour.user.similarity * (neighbour.playcount - neighbour.user.averagePlaycount);
            ratingDenominator += Math.abs(neighbour.user.similarity);
        });

        track.score = activeUser.averageScore + ratingNominator / ratingDenominator;
        predictedRatings.push(track);
    });

    return recommenderUtil.getRecommendationsFromPredictions(predictedRatings, previousRecommendations);
}

function getUserNeighbours(activeUser, users) {
    return _.first(_.sortBy(_.filter(users, function (user) {
        return user.similarity >= 0 && user.user !== activeUser.name;
    }), function (user) {
        return -user.similarity;
    }), activeUser.neighboursCount || COUNT_NEIGHBOURS_DEFAULT);
}

function getUserAverageScore(user) {
    return  _.reduce(user.artists, function (memo, artist) {
        return memo + artist.score;
    }, 0) / user.artists.length;
}

function getNeighboursTrackScores(neighbours) {
    var trackScores = {};
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
    return trackScores;
}

function getTrackSimilarityForUser(user, tracks, tracksAverageScore) {
    var userTrackNames = _.map(user.tracks, function (track) {
            return track.name;
        }), trackNames = _.map(tracks, function (track) {
            return track.name;
        }), commonTracks = _.intersection(userTrackNames, trackNames),
        userTracks = _.indexBy(user.tracks, 'name'),
        activeUserTracks = _.indexBy(tracks, 'name');

    var nominator = 0,
        userDenominator = 0,
        activeUserDenominator = 0;
    
    _.each(commonTracks, function (track) {
        var userPlaycount = parseInt(userTracks[track].playcount, 10);
        nominator += (userPlaycount - user.averagePlaycount) * (activeUserTracks[track].score - tracksAverageScore);
        userDenominator += (userPlaycount - user.averagePlaycount) * (userPlaycount - user.averagePlaycount);
        activeUserDenominator += (activeUserTracks[track].score - tracksAverageScore) * (activeUserTracks[track].score - tracksAverageScore);
    });

    if(userDenominator === 0 || activeUserDenominator === 0) {
        return 0;
    }

    return (nominator / Math.sqrt(userDenominator * activeUserDenominator)) * Math.min(commonTracks.length / THRESHOLD_COMMON_ARTISTS_COUNT, 1);
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
