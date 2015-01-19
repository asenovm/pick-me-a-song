var db = require('./db');

setTimeout(function () {
    db.findAndSaveTracksToRate();
}, 2000);
