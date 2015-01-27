var ALGORITHM_TYPE_COLLABORATIVE_FILTERING = 'collaborativeFiltering',
    collaborativeRecommender = require('./collaborativeRecommender'),
    contentBasedRecommender = require('./contentBasedRecommender');

exports.getRecommendationsFor = function (userProfile, algorithmType, neighboursCount, recommendedItemsCount, callback) {
    if(algorithmType === ALGORITHM_TYPE_COLLABORATIVE_FILTERING) {
        collaborativeRecommender.getRecommendations(userProfile, neighboursCount, recommendedItemsCount, callback);
    } else {
        contentBasedRecommender.getRecommendations(userProfile, callback);
    }
};

