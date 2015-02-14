var fs = require('fs'),
    NEW_LINE = '\n';

exports.append = function (file, text) {
    fs.appendFileSync(file, text + NEW_LINE);
};
