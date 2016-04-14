import path from 'path';
import child_process from 'child_process';

const forkFile = path.join(__dirname, 'accelerator.js');

class Accelerator {

  constructor(port, id) {
    this.listeners = [];

    this.child = child_process.fork(forkFile, [id, port]);

    this.child.on('message', (msg) => {
      this.listeners.forEach(listener => listener(msg));
    });
  }

  send(msg) {
    this.child.send(msg);
  }

  on(hook, callback) {
    if (hook !== 'message')
      throw new Error("Only listen on 'message'");
    this.listeners.push(callback);
  }

}

export default Accelerator;
