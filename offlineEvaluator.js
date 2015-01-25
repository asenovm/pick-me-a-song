var _ = require('underscore'),
    db = require('./db'),
    collaborativeRecommender = require('./collaborativeRecommender'),
    evaluator = require('./evaluator'),
    LENGTH_SET_MIN = 50,
    LENGTH_TRAINING_SET = 40;

startOfflineEvaluation();

function startOfflineEvaluation() {
    db.retrieveUsersForEvaluation(function (err, users) {
        var tracksByUser = _.filter(_.map(users, function (user) {
            return user.tracks;
        }), function (userTracks) {
            return userTracks.length >= LENGTH_SET_MIN
        }), accumulatedPrecision = 0, accumulatedRecall = 0, accumulatedF1 = 0, recommendationsCount = 0;

        _.each(tracksByUser, function (tracks) {
            var evaluationSet = _.first(tracks, LENGTH_SET_MIN),
                trainingSet = _.first(evaluationSet, LENGTH_TRAINING_SET),
                validationSet = _.last(evaluationSet, evaluationSet.length - trainingSet.length),
                artists = {},
                userProfile = [];

            _.each(trainingSet, function (track) {
                artists[track.artist.name] = artists[track.artist.name] || 0;
                artists[track.artist.name] += parseInt(track.playcount, 10);
            });

            _.each(artists, function (value, key) {
                userProfile.push({
                    name: key,
                    score: value
                });
            });

            collaborativeRecommender.getRecommendations(userProfile, false, false, function (err, recommendations) {
                var recommendedTracksNames = _.map(recommendations, function (track) {
                    return track.name;
                }), validationTracksNames = _.map(validationSet, function (track) {
                    return track.name;
                }), intersection = _.intersection(recommendedTracksNames, validationTracksNames);

                var precision = evaluator.getPrecision(intersection.length, Math.min(recommendedTracksNames.length, 10)),
                    recall = evaluator.getRecall(intersection.length, validationTracksNames.length),
                    f1 = evaluator.getF1Measure(precision, recall) || 0;

                accumulatedPrecision += precision;
                accumulatedRecall += recall;
                accumulatedF1 += f1;
                ++recommendationsCount;
                console.log(recommendationsCount, users.length);
                console.log('number of recommended items is ' + recommendations.length);
                if(recommendationsCount === tracksByUser.length) {
                    console.log('accumulated values are ', accumulatedPrecision, accumulatedRecall, accumulatedF1);

                    var meanPrecision = accumulatedPrecision / users.length,
                        meanRecall = accumulatedRecall / users.length,
                        meanF1 = accumulatedF1 / users.length;

                    console.log('mean values are ', meanPrecision, meanRecall, meanF1);
                }
            });
        });
    });
}
