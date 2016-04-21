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

// This gets used at the very top of this file when running a server package
// (and not a build plugin)
if (!process.env.HOT_PORT)
  process.env.HOT_PORT = HOT_PORT;

var fork, waiting = false;
if (!gdata.accelId)
  gdata.accelId = 0;

function startFork() {
  fork = gdata.fork = Hot.fork = new Accelerator(HOT_PORT, ++gdata.accelId);

  var origSend = fork.send;
  fork.send = function waitAndSend(data) {
    // console.log('SEND', 'waiting', !!waiting, data);
    if (waiting)
      waiting.push(data);
    else
      origSend.call(this, data);
  }

  fork.on('message', function(msg) {

    if (msg.type === 'closed') {
      // This global is detected by the new instance
      gdata.fork = null;
      return;
    }

    console.log('[gadicc:hot] Build plugin got unknown message: '
      + JSON.stringify(msg));
  });

}

// this only ever happens when upgrading the build plugin (e.g. devel, upgrade)
if (gdata.fork) {
  waiting = [];
  gdata.fork.on('message', function(msg) {
    if (msg.type === 'closed') {
      console.log('[gadicc:hot] Switching to new accelerator instance.');
      startFork();

      while (waiting.length)
        fork.send(waiting.shift());

      waiting = false;
    }
  });
  gdata.fork.send({ type: 'close' });
} else {
  startFork();
}

// If we're exiting, tell the fork to shutdown too
process.on('exit', function() {
  fork.send({ type: 'close' });
});
