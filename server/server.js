var express = require('express'),
    _ = require('underscore'),
    recommender = require('./recommender'),
    app = express();

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:9000');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

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

app.listen(3000);
