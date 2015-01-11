var static = require('node-static'),
    fileServer = new static.Server('./web');

require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        fileServer.serve(request, response);
    }).resume();
}).listen(9090);
