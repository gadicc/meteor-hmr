// Never run as a server package (only as a build plugin)
if (process.env.APP_ID)
  return;

// Don't load the accelerator in these circumstances
if (process.env.INSIDE_ACCELERATOR
    || process.env.NODE_ENV==='production'
    || process.argv[2] === 'test'
    || process.argv[2] === 'test-packages')
  return;

var fs = Npm.require('fs');
var path = Npm.require('path');
var Accelerator = Npm.require('meteor-hotload-accelerator').default;

// This is only ever used during devel when reloading the build plugin
var gdata = global._hotGlobalData;
if (!gdata) gdata = global._hotGlobalData = {};

var DEFAULT_METEOR_PORT = 3000;
var HOT_PORT_INCREMENT = 2;

var portIndex, HOT_PORT = process.env.HOT_PORT
  || (process.env.PORT
    && (parseInt(process.env.PORT) + HOT_PORT_INCREMENT ))
  || (process.env.METEOR_PORT
    && (parseInt(process.env.METEOR_PORT) + HOT_PORT_INCREMENT ));

if (!HOT_PORT) {
  portIndex = process.argv.indexOf('-p');
  if (portIndex === -1)
    portIndex = process.argv.indexOf('--port');
  if (portIndex === -1)
    HOT_PORT = DEFAULT_METEOR_PORT + HOT_PORT_INCREMENT;
  else {
    HOT_PORT = process.argv[portIndex+1].split(':');
    HOT_PORT = parseInt(HOT_PORT[HOT_PORT.length-1]) + HOT_PORT_INCREMENT;
  }
}

// This gets used by gadicc:hot/hot-server.js.
if (!process.env.HOT_PORT)
  process.env.HOT_PORT = HOT_PORT;

var WebSocket = Npm.require('ws');
var ws, accelerator, waiting = [], firstAttempt = true, reconnecting = false;

function connect() {
  ws = new WebSocket('ws://127.0.0.1:' + HOT_PORT + '/hot-build?id=' + log.id);

  ws.on('open', function() {
    if (firstAttempt)
      debug("Connected to existing accelerator");
    else if (reconnecting)
      log("Reconnected");
    else
      debug("Connected to new accelerator");

    firstAttempt = false;
    reconnecting = false;

    while (waiting.length)
      ws.send(waiting.shift());
    waiting = false;

    Hot.onReconnect();
  });

  ws.on('error', function(err) {
    if (err.code === 'ECONNREFUSED' && firstAttempt) {
      firstAttempt = false;
      debug("Starting new accelerator process");
      accelerator = new Accelerator(HOT_PORT, log.id);
      setTimeout(connect, 1000);
      return;
    }

    if (reconnecting)
      setTimeout(connect, 1000);
    else if (err.code === 'ECONNREFUSED') {
      log("Still can't reach accelerator after 1s, will keep retrying...");
      setTimeout(connect, 1000);
      reconnecting = true;
    } else
      log("Unhandled websocket err!", err);
  });

  ws.on('close', function() {
    log("Lost connection to accelerator, trying to reconnect...");
    reconnecting = true;
    setTimeout(connect, 1000);
  });

  ws.on('message', function(msg) {
    log("Unknown message from accelerator: " + JSON.stringify(msg));
  });
}

connect();

var send = Hot.send = function(data) {
  if (waiting)
    waiting.push(JSON.stringify(data));
  else
    ws.send(JSON.stringify(data));
}

// If we're exiting, tell the fork to shutdown too
process.on('exit', function() {
  ws.send({ type: 'close' });
});
