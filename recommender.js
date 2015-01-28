var ALGORITHM_TYPE_COLLABORATIVE_FILTERING = 'collaborativeFiltering',
    collaborativeRecommender = require('./collaborativeRecommender'),
    contentBasedRecommender = require('./contentBasedRecommender');

exports.getRecommendationsFor = function (userProfile, previousRecommendations, options, callback) {
    if(options.algorithmType === ALGORITHM_TYPE_COLLABORATIVE_FILTERING) {
        collaborativeRecommender.getRecommendations(userProfile, previousRecommendations, options, callback);
    } else {
        contentBasedRecommender.getRecommendations(userProfile, previousRecommendations, options, callback);
    }
};

