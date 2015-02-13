var _ = require('underscore'),
    db = require('./db'),
    collaborativeRecommender = require('./collaborativeRecommender'),
    contentBasedRecommender = require('./contentBasedRecommender'),
    evaluator = require('./evaluator'),
    async = require('async'),
    LENGTH_SET_MIN = 50,
    LENGTH_TRAINING_SET = 30;

startCollaborativeEvaluation();

function startCollaborativeEvaluation() {
    startOfflineEvaluation(function (userProfile, previousRecommendations, callback) {
        collaborativeRecommender.getRecommendations(userProfile, previousRecommendations, { metricType: 'tracks', neighboursCount: 32 }, callback);
    });
}

function startContentBasedEvaluation() {
    startOfflineEvaluation(function (userProfile, previousRecommendations, callback) {
        contentBasedRecommender.getRecommendations(userProfile, previousRecommendations, {}, callback);
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
        }), accumulatedPrecision = 0,
            accumulatedRecall = 0,
            accumulatedF1 = 0,
            accumulatedPrecision_10 = 0,
            accumulatedF1_10 = 0,
            accumulatedPrecision_5 = 0,
            accumulatedF1_5 = 0,
            accumulatedNDCG = 0;

        async.eachSeries(userInfo, function (user, callback) {
            var tracks = user.tracks,
                evaluationSet = _.first(tracks, LENGTH_SET_MIN),
                trainingSet = _.first(evaluationSet, LENGTH_TRAINING_SET),
                validationSet = _.last(evaluationSet, evaluationSet.length - trainingSet.length),
                artists = {},
                userProfile = { name: user.name, artists: [], tracks: trainingSet };

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

            fetchRecommendationsFunc(userProfile, trainingSet, function (err, recommendations) {
                var recommendedArtistNames = _.map(recommendations, function (track) {
                    return track.artist.name;
                }), validationArtistNames = _.map(validationSet, function (track) {
                    return track.artist.name;
                }), intersection = _.intersection(recommendedArtistNames, validationArtistNames),
                    relevantItemsPositions = _.map(intersection, function (artistName) {
                        return _.indexOf(recommendedArtistNames, artistName);
                    });

                var precision = evaluator.getPrecision(intersection.length, recommendedArtistNames.length),
                    recall = evaluator.getRecall(intersection.length, validationArtistNames.length),
                    f1 = evaluator.getF1Measure(precision, recall) || 0,
                    nDCG = evaluator.getNDCG(relevantItemsPositions, recommendedArtistNames.length);

                var intersection_10 = _.intersection(_.first(recommendedArtistNames, 10), validationArtistNames),
                    precision_10 = evaluator.getPrecision(intersection_10.length, 10),
                    f1_10 = evaluator.getF1Measure(precision_10, recall) || 0;

                var intersection_5 = _.intersection(_.first(recommendedArtistNames, 5), validationArtistNames),
                    precision_5 = evaluator.getPrecision(intersection_5.length, 5),
                    f1_5 = evaluator.getF1Measure(precision_5, recall) || 0;

                console.log('nDCG ', nDCG);
                console.log('metrics @20 ', precision, recall, f1);
                console.log('metrics @10 ', precision_10, recall, f1_10);
                console.log('metrics @5 ', precision_5, recall, f1_5);

                accumulatedPrecision += precision;
                accumulatedRecall += recall;
                accumulatedF1 += f1;

                accumulatedPrecision_10 += precision_10;
                accumulatedF1_10 += f1_10;

                accumulatedPrecision_5 += precision_5;
                accumulatedF1_5 += f1_5;

                accumulatedNDCG += nDCG;

                callback();
            });
        }, function (err) {
            var meanPrecision = accumulatedPrecision / users.length,
                meanPrecision_10 = accumulatedPrecision_10 / users.length,
                meanPrecision_5 = accumulatedPrecision_5 / users.length,
                meanRecall = accumulatedRecall / users.length,
                meanF1 = accumulatedF1 / users.length,
                meanF1_10 = accumulatedF1_10 / users.length,
                meanF1_5 = accumulatedF1_5 / users.length,
                meanNDCG = accumulatedNDCG / users.length;

            console.log('mean nDCG ', meanNDCG);
            console.log('mean values @ 20 ', meanPrecision, meanRecall, meanF1, meanNDCG);
            console.log('mean values @ 10 ', meanPrecision_10, meanRecall, meanF1_10, meanNDCG);
            console.log('mean values @ 5 ', meanPrecision_5, meanRecall, meanF1_5, meanNDCG);
        });
    });
}
