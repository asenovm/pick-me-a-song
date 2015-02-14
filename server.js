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
    async = require('async'),
    LIMIT_COUNT_ITEMS = 40,
    METHOD_HEAD = "HEAD";

app.use(bodyParser.json({ limit: '25mb'}));

app.post('/recommendations', function (req, res) {
    var userProfile = req.body.userProfile,
        options = req.body.options,
        userId = req.body.userId,
        likedTracksPositions = req.body.likedTracksPositions,
        likedTracksPositions_10 = _.filter(likedTracksPositions, function (position) {
            return position <= 10;
        }), likedTracksPositions_5 = _.filter(likedTracksPositions, function (position) {
            return position <= 5;
        }), recommendedTracks = _.map(req.body.recommendedTracks, function (track) {
            track.timestamp = Date.now();
            return track;
        }),
        metrics = {};

    userProfile.artists = _.map(userProfile.artists, function (artist) {
        artist.timestamp = Date.now();
        return artist;
    });

    if(recommendedTracks.length > 0) {
        metrics[evaluator.METRIC_NAME_PRECISION_20] = evaluator.getPrecision(likedTracksPositions.length, recommendedTracks.length);
        metrics[evaluator.METRIC_NAME_PRECISION_10] = evaluator.getPrecision(likedTracksPositions_10.length, 10);
        metrics[evaluator.METRIC_NAME_PRECISION_5] = evaluator.getPrecision(likedTracksPositions_5.length, 5);
        metrics[evaluator.METRIC_NAME_NDCG] = evaluator.getNDCG(likedTracksPositions, recommendedTracks.length);
        db.writeEvaluationMetrics(userId, metrics, _.noop);
    }

    async.waterfall([
        function (callback) {
            db.updateUserRecommendations(userId, recommendedTracks, callback);
        },
        function (result, callback) {
            db.retrieveRecommendations(userId, callback);
        },
        function (previousRecommendations, callback) {
            db.updateUserArtists(userId, userProfile.artists, function (err, result) {
                callback(err, previousRecommendations);
            });
        },
        function (previousRecommendations, callback) {
            db.retrieveUserArtists(userId, function (err, result) {
                callback(err, previousRecommendations, result);
            });
        },
        function (previousRecommendations, artists, callback) {
            userProfile.artists = _.first(artists, LIMIT_COUNT_ITEMS);
            userProfile.tracks = _.first(_.filter(previousRecommendations, function (recommendation) {
                return recommendation.userValue;
            }), LIMIT_COUNT_ITEMS);

            recommender.getRecommendationsFor(userProfile, previousRecommendations, options, callback);
        }
    ], function (err, recommendedTracks) {
        if(err) {
            res.status(500).end();
        } else {
            res.json({
                recommendedTracks: recommendedTracks
            }).end();
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

app.get('*', function (req, res) {
    if(req.method === METHOD_HEAD) {
        res.end();
    } else {
        fileServer.serve(req, res);
    }
});

app.listen(process.env.PORT || 3000);
