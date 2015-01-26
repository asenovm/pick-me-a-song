var _ = require('underscore'),
    db = require('./db'),
    collaborativeRecommender = require('./collaborativeRecommender'),
    contentBasedRecommender = require('./contentBasedRecommender'),
    evaluator = require('./evaluator'),
    async = require('async'),
    LENGTH_SET_MIN = 50,
    LENGTH_TRAINING_SET = 40;

startContentBasedEvaluation();

function startCollaborativeEvaluation() {
    startOfflineEvaluation(function (userProfile, callback) {
        collaborativeRecommender.getRecommendations(userProfile, false, false, callback);
    });
}

function startContentBasedEvaluation() {
    startOfflineEvaluation(contentBasedRecommender.getRecommendations);
}

function startOfflineEvaluation(fetchRecommendationsFunc) {
    db.retrieveUsersForEvaluation(function (err, users) {
        var tracksByUser = _.filter(_.map(users, function (user) {
            return user.tracks;
        }), function (userTracks) {
            return userTracks.length >= LENGTH_SET_MIN
        }), accumulatedPrecision = 0, accumulatedRecall = 0, accumulatedF1 = 0, recommendationsCount = 0;

        async.eachLimit(tracksByUser, 10, function (tracks, callback) {
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

            fetchRecommendationsFunc(userProfile, function (err, recommendations) {
                var recommendedTracksNames = _.map(recommendations, function (track) {
                    return track.name;
                }), validationTracksNames = _.map(validationSet, function (track) {
                    return track.name;
                }), intersection = _.intersection(recommendedTracksNames, validationTracksNames);

                var precision = evaluator.getPrecision(intersection.length, recommendedTracksNames.length),
                    recall = evaluator.getRecall(intersection.length, validationTracksNames.length),
                    f1 = evaluator.getF1Measure(precision, recall) || 0;

                console.log(precision, recall, f1);

                accumulatedPrecision += precision;
                accumulatedRecall += recall;
                accumulatedF1 += f1;
                callback();
            });
        }, function (err) {
            var meanPrecision = accumulatedPrecision / users.length,
                meanRecall = accumulatedRecall / users.length,
                meanF1 = accumulatedF1 / users.length;

            console.log('mean values');
            console.log(meanPrecision, meanRecall, meanF1);
        });
    });
}
