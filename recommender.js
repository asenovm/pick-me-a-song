var _ = require('underscore'),
    db = require('./db'),
    MIN_COMMON_USERS = 5,
    MIN_RECOMMENDED_ITEMS_PER_USER = 2,
    ALGORITHM_TYPE_COLLABORATIVE_FILTERING = 'collaborativeFiltering',
    collaborativeRecommender = require('./collaborativeRecommender'),
    contentBasedRecommender = require('./contentBasedRecommender'),
    EPS = 0.001;

exports.getRecommendationsFor = function (artists, algorithmType, neighboursCount, recommendedItemsCount, callback) {
    if(algorithmType === ALGORITHM_TYPE_COLLABORATIVE_FILTERING) {
        collaborativeRecommender.getRecommendations(artists, neighboursCount, recommendedItemsCount, callback);
    } else {
        contentBasedRecommender.getRecommendations(artists, callback);
    }
};

