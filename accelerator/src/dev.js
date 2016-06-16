#!/usr/bin/env node

// Run via "npm run dev"; for now the bin/args must be specified here (and then `npm run compile`)

import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import _ from 'lodash';
import recursive from 'recursive-readdir-sync';

const bin='/home/dragon/.meteor/packages/meteor-tool/.1.3.2_1.1b63asg++os.linux.x86_64+web.browser+web.cordova/mt-os.linux.x86_64/dev_bundle/bin/node';
const args=['lib/accelerator.js', 'dev', '5002', '/home/dragon/.meteor/packages/meteor-tool/1.3.2_1/mt-os.linux.x86_64'];
const projRoot='/home/dragon/www/meteor-hmr/demo';

const debug=process.env.HOT_DEBUG || 1;
const files = recursive('src');
console.log('Dev mode.  Watching: ' + files.join(', ') + '\n');

// Add CWD to lib/accelerator, since we give a new CWD for the cmd
args[0] = path.join(process.cwd(), args[0]);

var child, restarting = false;
const restart = _.debounce(function restart() {
  if (child)
    child.kill();

  child_process.execSync('npm run compile', {stdio:[0,1,2]});
  console.log();

  start();
}, 5);

files.forEach(file => {
  fs.watch(file, restart);
});

function start() {
  child = child_process.spawn(bin, args, {
    cwd: projRoot,
    env: { HOT_DEBUG: debug },
    stdio: [0,1,2]
  });
  restarting = true;

  child.on('exit', () => {
    if (restarting)
      return;
    
    console.log("\n\nAccelerator exited/crashed, restarting...\n");
    start();
  });
}

start();
