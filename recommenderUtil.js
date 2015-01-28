var COUNT_RECOMMENDED_TRACKS = 20;

exports.getRecommendationsFromPredictions = function (predictedRatings, previousRecommendations) {
    return _.first(_.sortBy(_.filter(predictedRatings, function (track) {
        var contains = false;
        _.each(previousRecommendations, function (recommendation) {
            contains = contains || (recommendation.artist.name === track.artist.name && recommendation.name === track.name);
        });
        return !contains;
    }), function (track) {
        return -track.score;
    }), COUNT_RECOMMENDED_TRACKS);
};
