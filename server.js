var express = require('express'),
    _ = require('underscore'),
    static = require('node-static'),
    fileServer = new static.Server('./web'),
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

app.post('/like', function (req, res) {
    var likedTracks = req.body.likedTracks,
        allTracks = req.body.allTracks;

    console.log('liked tracks are ', likedTracks);
    console.log('all tracks are ', allTracks);
    console.log('req body is ', req.body);

    res.status(200).end();
});

app.get('*', function (req, res) {
    fileServer.serve(req, res);
});

app.listen(process.env.PORT || 3000);
