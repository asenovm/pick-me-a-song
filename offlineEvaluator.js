var _ = require('underscore'),
    db = require('./db'),
    collaborativeRecommender = require('./collaborativeRecommender'),
    contentBasedRecommender = require('./contentBasedRecommender'),
    evaluator = require('./evaluator'),
    async = require('async'),
    ArgumentParser = require('argparse').ArgumentParser,
    parser = new ArgumentParser({ version: '0.0.1', addHelp: true, description: 'last.fm crawler' }),
    fileWriter = require('./fileWriter'),
    LENGTH_SET_MIN = 50,
    LENGTH_TRAINING_SET = 30;

parser.addArgument(['-cl', '--collaborative'], { help: 'evaluates the performance of the system when collaborative filtering is used', action: 'storeTrue' });
parser.addArgument(['-cb', '--content-based'], { help: 'evaluates the performance of the system when content-based filtering is used', action: 'storeTrue' });
parser.addArgument(['-t', '--tracks'], { help: 'evaluates the performance of the system when similarity is computed using tracks', action: 'storeTrue' });
parser.addArgument(['-n', '--neighbours'], { help: 'set the number of neighbours to be taken into account', type: 'int' });

var args = parser.parseArgs();

if(args.collaborative) {
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
    var resultFile = "evaluation_" + Date.now();
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

                fileWriter.append(resultFile, 'nDCG: ' + nDCG);
                fileWriter.append(resultFile, 'recall: ' + recall);
                fileWriter.append(resultFile, 'metrics @20 ' + precision +  ' ' + f1);
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
            fileWriter.append(resultFile, 'mean values @20: ' + meanPrecision + ' ' + meanF1);
            fileWriter.append(resultFile, 'mean values @10: ' + meanPrecision_10 + ' ' + meanF1_10);
            fileWriter.append(resultFile, 'mean values @5: ' + meanPrecision_5 + ' ' + meanF1_5);
        });
    });
}
