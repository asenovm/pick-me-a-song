var _ = require('underscore'),
    db = require('./db'),
    collaborativeRecommender = require('./collaborativeRecommender'),
    contentBasedRecommender = require('./contentBasedRecommender'),
    metricsEvaluator = require('./metricsEvaluator'),
    async = require('async'),
    ArgumentParser = require('argparse').ArgumentParser,
    parser = new ArgumentParser({ version: '0.0.1', addHelp: true, description: 'last.fm crawler' }),
    fileWriter = require('./fileWriter'),
    LENGTH_SET_MIN = 50,
    LENGTH_TRAINING_SET = 25,
    COUNT_FOLDS = 3;

parser.addArgument(['-cl', '--collaborative'], { help: 'evaluates the performance of the system when collaborative filtering is used', action: 'storeTrue' });
parser.addArgument(['-cb', '--content-based'], { help: 'evaluates the performance of the system when content-based filtering is used', action: 'storeTrue' });
parser.addArgument(['-t', '--tracks'], { help: 'evaluates the performance of the system when similarity is computed using tracks', action: 'storeTrue' });
parser.addArgument(['-n', '--neighbours'], { help: 'set the number of neighbours to be taken into account', type: 'int' });
parser.addArgument(['-o', '--online'], { help: 'retrieve the statits from the usage of the system as persisted in the db', action: 'storeTrue'});

var args = parser.parseArgs();

if(args.online) {
    startOnlineEvaluation();
} else if(args.collaborative) {
    var metricType = args.tracks ? 'tracks' : 'artists',
        neighboursCount = args.neighbours;

    startCollaborativeEvaluation(metricType, neighboursCount);
} else {
    startContentBasedEvaluation();
}

function startCollaborativeEvaluation(metricType, neighboursCount) {
    startOfflineEvaluation(function (userProfile, previousRecommendations, callback) {
        collaborativeRecommender.getRecommendations(userProfile, previousRecommendations, { metricType: metricType, neighboursCount: neighboursCount }, callback);
    });
}

function startContentBasedEvaluation() {
    startOfflineEvaluation(function (userProfile, previousRecommendations, callback) {
        contentBasedRecommender.getRecommendations(userProfile, previousRecommendations, {}, callback);
    });
}

function startOfflineEvaluation(fetchRecommendationsFunc) {
    var resultFile = "evaluation_" + Date.now() + "_" + (args.neighbours || "default_neighbours_count");
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
                artists = {},
                itemsInFold = parseInt(evaluationSet.length / COUNT_FOLDS),
                crossValidationSets = _.initial(_.toArray(_.groupBy(evaluationSet, function (track, index) {
                    return Math.floor(index / itemsInFold);
                }))), precision = 0, recall = 0, f1 = 0, nDCG = 0,
                precision_10 = 0, f1_10 = 0, precision_5 = 0, f1_5 = 0;

            async.eachSeries(crossValidationSets, function (validationSet, crossValidationCallback) {
                var trainingSet = _.flatten(_.without(crossValidationSets, validationSet)),
                    userProfile = { name: user.name, artists: [], tracks: trainingSet };

                _.each(trainingSet, function (track) {
                    var playcount = parseInt(track.playcount, 10);
                    artists[track.artist.name] = artists[track.artist.name] || 0;
                    artists[track.artist.name] += playcount;
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

                    precision += metricsEvaluator.getPrecision(intersection.length, recommendedArtistNames.length);
                    recall += metricsEvaluator.getRecall(intersection.length, validationArtistNames.length),
                    f1 += metricsEvaluator.getF1Measure(precision, recall) || 0,
                    nDCG += metricsEvaluator.getNDCG(relevantItemsPositions, recommendedArtistNames.length);

                    var intersection_10 = _.intersection(_.first(recommendedArtistNames, 10), validationArtistNames);
                    precision_10 += metricsEvaluator.getPrecision(intersection_10.length, 10);
                    f1_10 += metricsEvaluator.getF1Measure(precision_10, recall) || 0;

                    var intersection_5 = _.intersection(_.first(recommendedArtistNames, 5), validationArtistNames);
                    precision_5 += metricsEvaluator.getPrecision(intersection_5.length, 5),
                    f1_5 += metricsEvaluator.getF1Measure(precision_5, recall) || 0;

                    crossValidationCallback();
                });
            }, function (err) {
                precision = precision / COUNT_FOLDS;
                precision_10 = precision_10 / COUNT_FOLDS;
                precision_5 = precision_5 / COUNT_FOLDS;

                recall = recall / COUNT_FOLDS;
                nDCG = nDCG / COUNT_FOLDS;

                f1 = f1 / COUNT_FOLDS;
                f1_10 = f1_10 / COUNT_FOLDS;
                f1_5 = f1_5 / COUNT_FOLDS;

                fileWriter.append(resultFile, 'nDCG: ' + nDCG);
                fileWriter.append(resultFile, 'recall: ' + recall);
                fileWriter.append(resultFile, 'metrics @25 ' + precision +  ' ' + f1);
                fileWriter.append(resultFile, 'metrics @10 ' + precision_10 + ' ' + f1_10);
                fileWriter.append(resultFile, 'metrics @5 ' + precision_5 + ' ' + f1_5);

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

            fileWriter.append(resultFile, 'mean nDCG: ' + meanNDCG);
            fileWriter.append(resultFile, 'mean recall: ' + meanRecall);
            fileWriter.append(resultFile, 'mean values @25: ' + meanPrecision + ' ' + meanF1);
            fileWriter.append(resultFile, 'mean values @10: ' + meanPrecision_10 + ' ' + meanF1_10);
            fileWriter.append(resultFile, 'mean values @5: ' + meanPrecision_5 + ' ' + meanF1_5);
        });
    });
}

function startOnlineEvaluation() {
    var resultFile = "online_evaluation_" + Date.now();

    db.getEvaluations(function (err, result) {
        var precision_25 = 0,
            precision_10 = 0,
            precision_5 = 0,
            ndcg = 0;

        _.each(result, function (user) {
            var metrics = user.metrics;
            precision_25 += metrics[metricsEvaluator.METRIC_NAME_PRECISION_25];
            precision_10 += metrics[metricsEvaluator.METRIC_NAME_PRECISION_10];
            precision_5 += metrics[metricsEvaluator.METRIC_NAME_PRECISION_5];
            ndcg += metrics[metricsEvaluator.METRIC_NAME_NDCG];
        });

        precision_25 = precision_25 / result.length;
        precision_10 = precision_10 / result.length;
        precision_5 = precision_5 / result.length;
        ndcg = ndcg / result.length;

        fileWriter.append(resultFile, 'mean precision @25: ' + precision_25);
        fileWriter.append(resultFile, 'mean precision @10: ' + precision_10);
        fileWriter.append(resultFile, 'mean precision @5: ' + precision_5);
        fileWriter.append(resultFile, 'mean nDCG: ' + ndcg);
    });
}
