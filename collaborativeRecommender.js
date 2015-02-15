var _ = require('underscore'),
    db = require('./db'),
    recommenderUtil = require('./recommenderUtil'),
    COUNT_NEIGHBOURS_DEFAULT = 22,
    THRESHOLD_COMMON_ARTISTS_COUNT = 10,
    METRIC_TYPE_ARTISTS = 'artists',
    METRIC_TYPE_TRACKS = 'tracks';

exports.getRecommendations = function (user, previousRecommendations, options, callback) {
    if(options.metricType === METRIC_TYPE_TRACKS) {
        getRecommendationsFromTracks(user, previousRecommendations, options, callback);
    } else {
        getRecommendationsFromArtists(user, previousRecommendations, options, callback);
    }

};

function getRecommendationsFromTracks(user, previousRecommendations, options, callback) {
    var trackNames = _.map(user.tracks, function (track) {
        return track.name;
    }), activeUser = getUserProfile(user, options, 'tracks');
    db.retrieveAllUsersForTracks(trackNames, fetchAndSendRecommendations(activeUser, previousRecommendations, getTrackSimilarityForUser, callback));
};

function getRecommendationsFromArtists(user, previousRecommendations, options, callback) {
    var artistNames = _.map(user.artists, function (artist) {
        return artist.name;
    }), activeUser = getUserProfile(user, options, 'artists');

    db.retrieveAllUsersForArtists(artistNames, fetchAndSendRecommendations(activeUser, previousRecommendations, getArtistSimilarityForUser, callback));
}

function fetchAndSendRecommendations(activeUser, previousRecommendations, similarityFunc, callback) {
    return function (err, users) {
        if(err) {
            callback(err, []);
        } else {
            callback(err, getRecommendations(users, activeUser, previousRecommendations, similarityFunc));
        }
    };
}

function getUserProfile(user, options, model) {
    var artistNames = _.map(user.artists, function (artist) {
        return artist.name;
    });

    return {
        name: user.name,
        averageScore: getAverageScore(user, model),
        artists: _.indexBy(user.artists, 'name'),
        tracks: user.tracks,
        artistNames: artistNames,
        neighboursCount: options.neighboursCount
    };
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

function getAverageScore(user, model) {
    return _.reduce(user[model], function (memo, item) {
        return memo + parseFloat(item.userValue || item.playcount ||  item.score, 10);
    }, 0) / user[model].length;
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
        var currentUserPlaycount = parseInt(currentUserTracks[name].playcount, 10),
            activeUserScore = parseFloat(activeUserTracks[name].userValue || activeUserTracks[name].playcount, 10);

        nominator += (currentUserPlaycount - user.averagePlaycount) * (activeUserScore - activeUser.averageScore);
        currentUserDenominator += (currentUserPlaycount - user.averagePlaycount) * (currentUserPlaycount - user.averagePlaycount);
        activeUserDenominator += (activeUserScore - activeUser.averageScore) * (activeUserScore - activeUser.averageScore);
    });

    return getSimilarity(nominator, Math.sqrt(currentUserDenominator * activeUserDenominator), commonTrackNames);
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
        artistsDenominator = 0;

    _.each(commonArtistsNames, function (name) {
        var userScore = playCountsPerArtist[name] - userAverageScore,
            artistScore = activeUser.artists[name].score - activeUser.averageScore;

        nominator += userScore * artistScore;
        userDenominator += userScore * userScore;
        artistsDenominator += artistScore * artistScore;
    });

    return getSimilarity(nominator, Math.sqrt(userDenominator * artistsDenominator), commonArtistsNames);
}

function getSimilarity(nominator, denominator, commonItems) {
    if(denominator === 0) {
        return 0;
    }

    return (nominator / denominator) * Math.min(commonItems.length / THRESHOLD_COMMON_ARTISTS_COUNT, 1);
}
