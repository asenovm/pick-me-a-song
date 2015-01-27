var _ = require('underscore');

exports.METRIC_NAME_PRECISION = "precision";
exports.METRIC_NAME_NDCG = "ndcg";

exports.getPrecision = function (relevantItemsCount, recommendedItemsCount) {
    if(recommendedItemsCount === 0) {
        return 0;
    }
    return relevantItemsCount / recommendedItemsCount;
};

exports.getRecall = function (recommendedRelevantItemsCount, totalRelevantItemsCount) {
    if(totalRelevantItemsCount === 0) {
        return 1;
    }
    return recommendedRelevantItemsCount / totalRelevantItemsCount;
};

exports.getF1Measure = function (precision, recall) {
    return (2 * precision * recall) / (2 * precision + recall);
};

exports.getNDCG = function (likedItemsPositions, recommendedItemsCount) {
    var relevances = getTracksRelevance(likedItemsPositions, recommendedItemsCount),
        dcg = getDCG(relevances),
        properOrderRelevances = _.sortBy(relevances, function (relevance) { return -relevance;}),
        idealDCG = getDCG(properOrderRelevances);

    if(_.isEmpty(likedItemsPositions)) {
        return 0;
    }

    return dcg / idealDCG;
};

function getTracksRelevance(likedItemsPositions, recommendedItemsCount) {
    return _.map(_.range(0, recommendedItemsCount), function (index) {
        if(_.contains(likedItemsPositions, index)) {
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
