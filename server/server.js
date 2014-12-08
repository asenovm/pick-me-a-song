var express = require('express'),
    app = express();

app.get('/recommendations', function (req, res) {
    console.log('params are ');
    console.dir(req.params);
    res.end();
});

app.listen(3000);
