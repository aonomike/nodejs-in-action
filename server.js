var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};

//handle 404 errors for files that don't exist
function send404(response) {
	response.writeHead(404, {'Content-Type': 'text/plain'});
	response.write('Error 404: Resource not found');
	response.end();
}

//serve file data
function sendFile(response, filePath, fileContents) {
	response.writeHead(200, {contentType : mime.lookup(path.basename(filePath))});
	response.end(fileContents);
}

//serving static files
function serveStatic(response, cache, absPath) {
	if (cache[absPath]) {
		sendFile(response, absPath, cache[absPath]);
	}
 	else {
		fs.exists(absPath, function(exists){
			if(exists) {
				fs.readFile(absPath, function(err, data){
					if(err) {
						send404(response);
					}
					else {
						cache[absPath] = data;
						sendFile(response, absPath, data);
					}
				});
			} else {
				send404(response);
			}
		});
	}
}

//logic to create http server
var server = http.createServer(function(request, response) {
	var filePath = false;
	var absPath = './';
	if (request.url == '/') {
		filePath = 'public/index.html';
	}
	else {
		filePath = 'public' + request.url;
	}
	absPath = absPath + filePath;
	serveStatic(response, cache, absPath);

});

//start server
server.listen(3000, function() {
	console.log("server listening on port 3000");
});
