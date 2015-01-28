var express = require('express'),
    _ = require('underscore'),
    static = require('node-static'),
    bodyParser = require('body-parser'),
    uuid = require('node-uuid'),
    fileServer = new static.Server('./web'),
    recommender = require('./recommender'),
    evaluator = require('./evaluator'),
    db = require('./db'),
    app = express(),
    LIMIT_COUNT_ARTISTS = 12;

app.use(bodyParser.json());

app.get('/recommendations', function (req, res) {
    var userProfile = JSON.parse(req.query.userProfile),
        options = JSON.parse(req.query.options),
        userArtists = [],
        userId = req.query.userId,
        likedTracksPositions = JSON.parse(req.query.likedTracksPositions),
        likedTracksPositions_10 = _.filter(likedTracksPositions, function (position) {
            return position <= 10;
        }), likedTracksPositions_5 = _.filter(likedTracksPositions, function (position) {
            return position <= 5;
        }), recommendedTracks = JSON.parse(req.query.recommendedTracks),
        metrics = {};

    if(recommendedTracks.length > 0) {
        metrics[evaluator.METRIC_NAME_PRECISION_20] = evaluator.getPrecision(likedTracksPositions.length, recommendedTracks.length);
        metrics[evaluator.METRIC_NAME_PRECISION_10] = evaluator.getPrecision(likedTracksPositions_10.length, 10);
        metrics[evaluator.METRIC_NAME_PRECISION_5] = evaluator.getPrecision(likedTracksPositions_5.length, 5);
        metrics[evaluator.METRIC_NAME_NDCG] = evaluator.getNDCG(likedTracksPositions, recommendedTracks.length);
    }

    db.updateUserRecommendations(userId, recommendedTracks, function (err, result) {
        db.retrieveRecommendations(userId, function (err, previousRecommendations) {
            db.updateUserArtists(userId, userProfile.artists, function (err, result) {
                db.retrieveUserArtists(userId, function (err, result) {
                    var openPositionsCount = LIMIT_COUNT_ARTISTS - userProfile.artists.length;
                    if(!err) {
                        userProfile.artists = _.union(userProfile.artists, _.first(result, openPositionsCount));
                    }
                    fetchAndSendRecommendations(userProfile, previousRecommendations, options, res);
                });
            });
        });
    });
});

function fetchAndSendRecommendations(userProfile, previousRecommendations, options, res) {
    recommender.getRecommendationsFor(userProfile, previousRecommendations, options, function (err, recommendedTracks) {
        if(err) {
            res.status(500).end();
        } else {
            res.json({
                recommendedTracks: recommendedTracks
            }).end();
        }
    });
}

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

    db.writeEvaluationMetrics(userId, metrics, function (err, result) {
        if(err) {
            res.status(500).end();
        } else {
            res.end();
        }
    });

});

app.get('*', function (req, res) {
    fileServer.serve(req, res);
});

app.listen(process.env.PORT || 3000);
