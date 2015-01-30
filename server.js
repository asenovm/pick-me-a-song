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
    LIMIT_COUNT_ARTISTS = 8,
    METHOD_HEAD = "HEAD";

app.use(bodyParser.json());

app.post('/recommendations', function (req, res) {
    var userProfile = req.body.userProfile,
        options = req.body.options,
        userArtists = [],
        userId = req.body.userId,
        likedTracksPositions = req.body.likedTracksPositions,
        likedTracksPositions_10 = _.filter(likedTracksPositions, function (position) {
            return position <= 10;
        }), likedTracksPositions_5 = _.filter(likedTracksPositions, function (position) {
            return position <= 5;
        }), recommendedTracks = req.body.recommendedTracks,
        metrics = {};

    if(recommendedTracks.length > 0) {
        metrics[evaluator.METRIC_NAME_PRECISION_20] = evaluator.getPrecision(likedTracksPositions.length, recommendedTracks.length);
        metrics[evaluator.METRIC_NAME_PRECISION_10] = evaluator.getPrecision(likedTracksPositions_10.length, 10);
        metrics[evaluator.METRIC_NAME_PRECISION_5] = evaluator.getPrecision(likedTracksPositions_5.length, 5);
        metrics[evaluator.METRIC_NAME_NDCG] = evaluator.getNDCG(likedTracksPositions, recommendedTracks.length);
        db.writeEvaluationMetrics(userId, metrics, _.noop);
    }

    db.updateUserRecommendations(userId, recommendedTracks, function (err, result) {
        db.retrieveRecommendations(userId, function (err, previousRecommendations) {
            db.updateUserArtists(userId, userProfile.artists, function (err, result) {
                db.retrieveUserArtists(userId, function (err, result) {
                    userProfile.artists = _.first(userProfile.artists, LIMIT_COUNT_ARTISTS);
                    var openPositionsCount = LIMIT_COUNT_ARTISTS - userProfile.artists.length,
                        userProfileArtistNames = _.map(userProfile.artists, function (artist) {
                            return artist.name;
                        });

                    if(openPositionsCount > 0) {
                        _.each(result, function (artist) {
                            if(openPositionsCount > 0 && !_.contains(userProfileArtistNames, artist.name)) {
                                --openPositionsCount;
                                userProfile.artists.push(artist);
                            }
                        });
                    }
                    fetchAndSendRecommendations(userProfile, previousRecommendations.tracks, options, res);
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

app.get('*', function (req, res) {
    if(req.method === METHOD_HEAD) {
        res.end();
    } else {
        fileServer.serve(req, res);
    }
});

app.listen(process.env.PORT || 3000);
