var _ = require('underscore'),
    db = require('./db'),
    recommenderUtil = require('./recommenderUtil'),
    COUNT_NEIGHBOURS_DEFAULT = 22,
    THRESHOLD_COMMON_ARTISTS_COUNT = 10,
    METRIC_TYPE_ARTISTS = 'artists',
    METRIC_TYPE_TRACKS = 'tracks';

exports.getRecommendations = function (userProfile, previousRecommendations, options, callback) {
    if(options.metricType === METRIC_TYPE_TRACKS) {
        getRecommendationsFromTracks(userProfile, previousRecommendations, options, callback);
    } else {
        getRecommendationsFromArtists(userProfile, previousRecommendations, options, callback);
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
            var activeUser = {
                    neighboursCount: options.neighboursCount,
                    name: userProfile.name,
                    tracks: userProfile.tracks,
                    averageScore: getAverageScore(userProfile, 'tracks')
                };

            callback(err, getRecommendations(users, activeUser, previousRecommendations, getTrackSimilarityForUser));
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
            var activeUser = {
                    name: userProfile.name,
                    averageScore: getAverageScore(userProfile, 'artists'),
                    artists: _.indexBy(userProfile.artists, 'name'),
                    artistNames: artistNames,
                    neighboursCount: options.neighboursCount
                };
                
            recommendedTracks = getRecommendations(users, activeUser, previousRecommendations, getArtistSimilarityForUser);
        }

        callback(err, recommendedTracks);
    });
}

function getRecommendations(users, activeUser, previousRecommendations, similarityFunc) {
    _.each(users, function (user) {
        user.similarity = similarityFunc(user, activeUser);
    });

    return getRecommendedTracks(activeUser, users, previousRecommendations);
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

function getAverageScore(userProfile, model) {
    return _.reduce(userProfile[model], function (memo, item) {
        return memo + item.score;
    }, 0) / userProfile[model].length;
}

function getUserNeighbours(activeUser, users) {
    return _.first(_.sortBy(_.filter(users, function (user) {
        return user.similarity >= 0 && user.user !== activeUser.name;
    }), function (user) {
        return -user.similarity;
    }), activeUser.neighboursCount || COUNT_NEIGHBOURS_DEFAULT);
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

function getTrackSimilarityForUser(user, activeUser) {
    var currentUserTrackNames = _.map(user.tracks, function (track) {
            return track.name;
        }), activeUserTrackNames = _.map(activeUser.tracks, function (track) {
            return track.name;
        }), commonTrackNames = _.intersection(currentUserTrackNames, activeUserTrackNames),
        currentUserTracks = _.indexBy(user.tracks, 'name'),
        activeUserTracks = _.indexBy(activeUser.tracks, 'name');

    var nominator = 0,
        currentUserDenominator = 0,
        activeUserDenominator = 0;
    
    _.each(commonTrackNames, function (name) {
        var currentUserPlaycount = parseInt(currentUserTracks[name].playcount, 10);
        nominator += (currentUserPlaycount - user.averagePlaycount) * (activeUserTracks[name].score - activeUser.averageScore);
        currentUserDenominator += (currentUserPlaycount - user.averagePlaycount) * (currentUserPlaycount - user.averagePlaycount);
        activeUserDenominator += (activeUserTracks[name].score - activeUser.averageScore) * (activeUserTracks[name].score - activeUser.averageScore);
    });

    if(currentUserDenominator === 0 || activeUserDenominator === 0) {
        return 0;
    }

    return (nominator / Math.sqrt(currentUserDenominator * activeUserDenominator)) * Math.min(commonTrackNames.length / THRESHOLD_COMMON_ARTISTS_COUNT, 1);
}

function getArtistSimilarityForUser(user, activeUser) {
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
        commonArtistsNames = _.intersection(activeUser.artistNames, userArtistsNames),
        userAverageScore = userTotalScore / userArtistsNames.length,
        nominator = 0,
        userDenominator = 0,
        artistsDenominator = 0,
        denominator;

    _.each(commonArtistsNames, function (name) {
        var userScore = playCountsPerArtist[name] - userAverageScore,
            artistScore = activeUser.artists[name].score - activeUser.averageScore;

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
