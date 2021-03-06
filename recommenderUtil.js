var _ = require('underscore'),
    COUNT_RECOMMENDED_TRACKS = 25;

exports.getRecommendationsFromPredictions = function (predictedRatings, previousRecommendations) {
    return _.first(_.sortBy(_.uniq(_.filter(predictedRatings, function (track) {
        var contains = false;
        _.each(previousRecommendations, function (recommendation) {
            contains = contains || (recommendation.artist.name === track.artist.name && recommendation.name === track.name);
        });
        return !contains;
    }), false, function (track) {
        return track.artist.name + track.name;
    }), function (track) {
        return -track.score;
    }), COUNT_RECOMMENDED_TRACKS);
};
