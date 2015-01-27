var _ = require('underscore'),
    db = require('./db'),
    collaborativeRecommender = require('./collaborativeRecommender'),
    contentBasedRecommender = require('./contentBasedRecommender'),
    evaluator = require('./evaluator'),
    async = require('async'),
    LENGTH_SET_MIN = 20,
    LENGTH_TRAINING_SET = 12;

startContentBasedEvaluation();

function startCollaborativeEvaluation() {
    startOfflineEvaluation(function (userProfile, callback) {
        collaborativeRecommender.getRecommendations(userProfile, {}, callback);
    });
}

function startContentBasedEvaluation() {
    startOfflineEvaluation(function (userProfile, callback) {
        contentBasedRecommender.getRecommendations(userProfile, {}, callback);
    });
}

function startOfflineEvaluation(fetchRecommendationsFunc) {
    db.retrieveUsersForEvaluation(function (err, users) {
        var userInfo = _.filter(_.map(users, function (user) {
            return {
                tracks: user.tracks,
                name: user.user
            };
        }), function (userInfo) {
            return userInfo.tracks.length >= LENGTH_SET_MIN
        }), accumulatedPrecision = 0, accumulatedRecall = 0, accumulatedF1 = 0, recommendationsCount = 0;

        async.eachSeries(userInfo, function (user, callback) {
            var tracks = user.tracks,
                evaluationSet = _.first(tracks, LENGTH_SET_MIN),
                trainingSet = _.first(evaluationSet, LENGTH_TRAINING_SET),
                validationSet = _.last(evaluationSet, evaluationSet.length - trainingSet.length),
                artists = {},
                userProfile = { name: user.name, artists: [] };

            _.each(trainingSet, function (track) {
                artists[track.artist.name] = artists[track.artist.name] || 0;
                artists[track.artist.name] += parseInt(track.playcount, 10);
            });

            _.each(artists, function (value, key) {
                userProfile.artists.push({
                    name: key,
                    score: value
                });
            });

            fetchRecommendationsFunc(userProfile, function (err, recommendations) {
                var recommendedArtistNames = _.map(recommendations, function (track) {
                    return track.artist.name;
                }), validationArtistNames = _.map(validationSet, function (track) {
                    return track.artist.name;
                }), intersection = _.intersection(recommendedArtistNames, validationArtistNames);

                var precision = evaluator.getPrecision(intersection.length, recommendedArtistNames.length),
                    recall = evaluator.getRecall(intersection.length, validationArtistNames.length),
                    f1 = evaluator.getF1Measure(precision, recall) || 0,
                    averagePrecision = evaluator.getAveragePrecision(recommendedArtistNames, validationArtistNames);

                var intersection_10 = _.intersection(_.first(recommendedArtistNames, 10), validationArtistNames),
                    precision_10 = evaluator.getPrecision(intersection_10.length, 10),
                    f1_10 = evaluator.getF1Measure(precision_10, recall) || 0;

                var intersection_5 = _.intersection(_.first(recommendedArtistNames, 5), validationArtistNames),
                    precision_5 = evaluator.getPrecision(intersection_5.length, 5),
                    f1_5 = evaluator.getF1Measure(precision_5, recall) || 0;

                console.log('metrics @20 ', precision, recall, f1);
                console.log('metrics @10 ', precision_10, recall, f1_10);
                console.log('metrics @5 ', precision_5, recall, f1_5);

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
