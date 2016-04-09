var path = require('path');
var child_process = require('child_process');

var forkFile = path.join(__dirname, 'accelerator.js');

function Accelerator(port) {
  this.listeners = [];
  this.child = child_process.fork(forkFile, [port]);
  this.child.on('message', function(msg) {
    this.listeners.forEach(function(listener) {
      listener(msg);
    });
  });
}

Accelerator.prototype.send = function(msg) {
  this.child.send(msg);
}

Accelerator.prototype.on = function(hook, callback) {
  if (hook !== 'message')
    throw new Error("Only listen on 'message'");
  this.listeners.push(callback);
}

module.exports = Accelerator;