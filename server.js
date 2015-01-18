var express = require('express'),
    _ = require('underscore'),
    static = require('node-static'),
    bodyParser = require('body-parser'),
    fileServer = new static.Server('./web'),
    recommender = require('./recommender'),
    evaluator = require('./evaluator'),
    db = require('./db'),
    app = express();

app.use(bodyParser.json());

app.get('/recommendations', function (req, res) {
    var artists = JSON.parse(req.query.artists);

    recommender.getRecommendationsFor(artists, function (err, recommendedTracks) {
        if(err) {
            res.status(500).end();
        } else {
            res.json(recommendedTracks);
            res.end();
        }
    });
});

app.post('/like', function (req, res) {
    var likedTracksPositions = req.body.likedTracksPositions,
        recommendedTracksCount = req.body.recommendedTracksCount,
        userId = req.body.userId,
        precision = evaluator.getPrecision(likedTracksPositions, recommendedTracksCount),
        nDCG = evaluator.getNDCG(likedTracksPositions, recommendedTracksCount);

    console.log('precision is ', precision);
    console.log('ndcg is ', nDCG);

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
