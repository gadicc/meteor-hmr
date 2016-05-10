// keep in sync with accelerator/package.json
var requiredAcceleratorVersion = '1.0.10';

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
var ws, accelerator;
var firstAttempt = true, reconnecting = false, stopTrying = false;

function connect() {
  ws = new WebSocket('ws://127.0.0.1:' + HOT_PORT + '/hot-build'
    + '?id=' + log.id
    + '&v=' + requiredAcceleratorVersion);

  ws.on('open', function() {
    if (firstAttempt)
      debug("Connected to existing accelerator");
    else if (reconnecting)
      log("Reconnected");
    else
      debug("Connected to new accelerator");

    firstAttempt = false;
    reconnecting = false;

    // wait for "connected" message before sending, in case accelerator
    // rejects us.
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
    if (stopTrying)
      return;

    log("Lost connection to accelerator, trying to reconnect...");
    reconnecting = true;
    setTimeout(connect, 1000);
  });

  ws.on('message', function(message) {
    var data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      log("Ignoring invalid JSON: " + message, err);
      return;
    }

    switch(data.type) {

      case 'connected':
        Hot.onReconnect();
        return;

      case 'reject':
        log("Accelerator rejected us, " + data.code + ": " + data.message);
        if (data.code === 'vesionReload') {
          // connect() will log the new connection
          firstAttempt = true;
          setTimeout(connect, 1000);
        } else if (data.code === 'majorVersionMismatch') {
          stopTrying = true;
        }
        return;

    }

    log("Unknown message from accelerator: " + message);
  });
}

connect();

var send = Hot.send = function(data) {
  // only send if we can, otherwise lose the data.  that's ok because this
  // only happens if the connection dies, in which case, we reconnect, and
  // all relevant data is resent with Hot.onReconnect().
  if (ws.readyState === ws.OPEN)
    ws.send(JSON.stringify(data));
}

// If we're exiting, tell the fork to shutdown too
process.on('exit', function() {
  ws.send({ type: 'close' });
});
