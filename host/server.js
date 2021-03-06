const http = require('http');
const express = require('express');
const Bottleneck = require('bottleneck');

const isTriggerRunning = require('./modules/is-trigger-running');
const runSeleniumAdClicker = require('./modules/run-selenium-ad-clicker');

const app = express();
const limiter = new Bottleneck({
	maxConcurrent: 1,
	minTime: 1000
});

// If the server was started by the startup executable but the trigger process was not launched yet, delay further execution
if(process.platform === "win32") {
	do setTimeout(() => {}, 1000);
	while(!isTriggerRunning());
}

/* Socket Connection */

const socketServer = http.createServer(app);
const io = require('socket.io')(socketServer);
const socketPort = 3009; // Non-standardized port in common tcp/udp port range in an attempt to not block other services

// Start the socket server
socketServer.listen(socketPort, () => { 
    console.log(`Socket server is listening on : ${socketPort}`);
});

// Init socket connection
io.on('connection', socket => {
	// If socket disconnected and trigger process is still running, try to reconnect
  	socket.on('disconnect', () => {
    	const tryToReconnect = isTriggerRunning();

    	if(tryToReconnect) {
			do setTimeout(() => socket.connect(), 1000);
			while(isTriggerRunning());
    	} else {
			if(process.platform !== "win32") process.exit();
    	}
  	});

	// Request for closing this process
	socket.on("exitProcess", () => process.exit());

	// Instantiate a selenium driver, let it browse the query and click on ads
  	socket.on('issueQuery', query => {
		limiter.schedule(runSeleniumAdClicker, query)
			.then(aClickedHrefs => {
				socket.emit("clickedHrefs", JSON.stringify(aClickedHrefs));
			});
  	});
});