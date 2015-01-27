var ALGORITHM_TYPE_COLLABORATIVE_FILTERING = 'collaborativeFiltering',
    collaborativeRecommender = require('./collaborativeRecommender'),
    contentBasedRecommender = require('./contentBasedRecommender');

exports.getRecommendationsFor = function (userProfile, options, callback) {
    if(options.algorithmType === ALGORITHM_TYPE_COLLABORATIVE_FILTERING) {
        collaborativeRecommender.getRecommendations(userProfile, options, callback);
    } else {
        contentBasedRecommender.getRecommendations(userProfile, options, callback);
    }
};

