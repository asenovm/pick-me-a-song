var express = require('express'),
    _ = require('underscore'),
    static = require('node-static'),
    bodyParser = require('body-parser'),
    uuid = require('node-uuid'),
    fileServer = new static.Server('./web'),
    recommender = require('./recommender'),
    evaluator = require('./evaluator'),
    db = require('./db'),
    app = express();

app.use(bodyParser.json());

app.get('/recommendations', function (req, res) {
    var userProfile = JSON.parse(req.query.userProfile),
        userArtists = [],
        userId = req.query.userId,
        options: {
            neighboursCount: neighboursCount,
            algorithmType: algorithmType
        };

    db.updateUserArtists(userId, userProfile.artists, function (err, result) {
        if(err) {
            userArtists = userProfile.artists;
        } else {
            db.retrieveUserArtists(userId, function (err, result) {
                if(err) {
                    userArtists = userProfile.artists;
                } else {
                    userArtists = result;
                }

                recommender.getRecommendationsFor(userProfile, options, function (err, recommendedTracks) {
                    if(err) {
                        res.status(500).end();
                    } else {
                        res.json({
                            recommendedTracks: recommendedTracks
                        }).end();
                    }
                });
            });
        }
    });
});

app.get('/tracksToRate', function (req, res) {
    db.getTracksToRate(function (err, result) {
        if(err) {
            res.status(500).end();
        } else {
            res.json({
                userId: uuid.v4(),
                tracks: result
            }).end();
        }
    });
});

app.post('/rate', function (req, res) {
    var likedTracksPositions = req.body.likedTracksPositions,
        recommendedTracksCount = req.body.recommendedTracksCount,
        userId = req.body.userId,
        precision = evaluator.getPrecision(likedTracksPositions.length, recommendedTracksCount),
        nDCG = evaluator.getNDCG(likedTracksPositions, recommendedTracksCount);

    db.writeEvaluationMetric(userId, evaluator.METRIC_NAME_PRECISION, precision, function (errPrecision, result) {
        db.writeEvaluationMetric(userId, evaluator.METRIC_NAME_NDCG, nDCG, function (errNDCG, result) {
            if(errPrecision || errNDCG) {
                res.status(500).end();
            } else {
                res.end();
            }
        });
    });

});

app.get('*', function (req, res) {
    fileServer.serve(req, res);
});

app.listen(process.env.PORT || 3000);
