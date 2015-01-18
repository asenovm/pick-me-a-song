var _ = require('underscore');

exports.getPrecision = function (likedTracksPositions, recommendedTracksCount) {
    return likedTracksPositions.length / recommendedTracksCount;
};

exports.getNDCG = function (likedTracksPositions, recommendedTracksCount) {
    var relevances = getTracksRelevance(likedTracksPositions, recommendedTracksCount),
        dcg = getDCG(relevances),
        properOrderRelevances = _.sortBy(relevances, function (relevance) { return -relevance;}),
        idealDCG = getDCG(properOrderRelevances);

    return dcg / idealDCG;
};

function getTracksRelevance(likedTracksPositions, recommendedTracksCount) {
    return _.map(_.range(0, recommendedTracksCount), function (index) {
        if(_.contains(likedTracksPositions, index)) {
            return 1;
        }
        return 0;
    });
}

function getDCG(itemRelevances) {
    var result = 0;

    _.each(itemRelevances, function (relevance, index) {
        if(index === 0) {
            result += relevance
        } else {
            result += relevance / (Math.log(index + 1) / Math.log(2));
        }
    });

    return result;
}
