import path from 'path';
import child_process from 'child_process';

const forkFile = path.join(__dirname, 'accelerator.js');

// We can figure this out from the path of the node bin being called
// /home/dragon/.meteor/packages/meteor-tool/.1.3.2_1.1b63asg++os.linux.x86_64+web.browser+web.cordova/mt-os.linux.x86_64/dev_bundle/bin/node
const meteorToolPath = path.join(
  path.dirname(process.argv[0]),  // bin (from bin/node)
  '..',                           // dev_bundle
  '..'                            // meteorToolPath
);

class Accelerator {

  constructor(port, id) {
    this.listeners = [];

    this.child = child_process.fork(forkFile, [id, port, meteorToolPath]);

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
