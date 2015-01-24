var ALGORITHM_TYPE_COLLABORATIVE_FILTERING = 'collaborativeFiltering',
    collaborativeRecommender = require('./collaborativeRecommender'),
    contentBasedRecommender = require('./contentBasedRecommender');

exports.getRecommendationsFor = function (artists, algorithmType, neighboursCount, recommendedItemsCount, callback) {
    if(algorithmType === ALGORITHM_TYPE_COLLABORATIVE_FILTERING) {
        collaborativeRecommender.getRecommendations(artists, neighboursCount, recommendedItemsCount, callback);
    } else {
        contentBasedRecommender.getRecommendations(artists, callback);
    }
};

