var fs = require('fs'),
    os = require('os');

exports.append = function (file, text) {
    fs.appendFileSync(file, text + os.EOL);
};
