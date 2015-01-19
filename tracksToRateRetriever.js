var db = require('./db');

//TODO extract as a Cron job
setTimeout(function () {
    db.findAndSaveTracksToRate();
}, 2000);
