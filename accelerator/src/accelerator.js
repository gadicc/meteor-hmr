import fs from 'fs';
import http from 'http';
import crypto from 'crypto';
import _ from 'lodash';

import { Server as WebSocketServer } from 'ws';
import 'babel-polyfill';

import BuildPlugin from './buildPlugin';

/* */

// process.argv[0] <-- full node binary path
// process.argv[1] <-- full path for this file
const ACCEL_ID = process.argv[2];
const HOT_PORT = process.argv[3];

process.env.INSIDE_ACCELERATOR = true;

console.log('=> Starting gadicc:ecmascript-hot Accelerator(' + ACCEL_ID
  + ') on port ' + HOT_PORT + '.\n');

function log(/* arguments */) {
  var args = Array.prototype.slice.call(arguments);
  var pre = '\n[gadicc:hot] Accelerator(' + ACCEL_ID + '): ';

  if (typeof args[0] === 'string')
    args[0] =  pre + args[0];
  else
    args.splice(0, 0, pre);

  console.log.apply(console, args);
}

const server = http.createServer(function (req, res) {
  var hash = req.url.match(/^\/hot.js\?hash=(.*)$/);
  if (!(hash && (hash=hash[1]) && hot.bundles[hash])) {
    res.writeHead(404);
    res.end();
    return;
  }

  res.writeHead(200, {'Content-Type': 'application/javascript; charset=UTF-8'});
  res.end(hot.bundles[hash].contents, 'utf8');
}).listen(HOT_PORT);

const wss = new WebSocketServer({ server: server });

// straight out of https://www.npmjs.com/package/ws
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    client.send(data);
  });
};

const handlers = {};

process.on('disconnect', function() {
  // unclear from docs if this works within the child!
  log('disconnect event received, exiting.');
  handlers.close();
});

process.on('message', function(msg) {
  if (handlers[msg.type])
    return handlers[msg.type](msg,
      BuildPlugin.byId(msg.pluginId));

  log('unknown message: ' + JSON.stringify(msg));
});

handlers.close = function() {
  try {
    wss.close();
  } catch (err) {
    log('error closing websocket server (safe to ignore)');
    log('message', err.message);
    log('name', err.name);
  }

  try {
    server.close();
  } catch (err) {
    if (err.message !== 'Not running')
      throw err;
  }

  if (process.connected) {
    process.send({type: 'closed'});
    process.disconnect();
  }
  process.exit();
};

var bundleQueue = [];
function addJavaScript(source) {
  bundleQueue.push(source);
  hot.process(bundleQueue);
  bundleQueue = [];
}

handlers.PLUGIN_INIT = function({id, name, path}) {
  new BuildPlugin(id, name, path, addJavaScript);
}

handlers.setDiskCacheDirectory = function({dir}, plugin) {
  plugin.setDiskCacheDirectory(dir);
  return; // XXXXXXXXXX

  // First compile takes ages (probably from loading all the plugins),
  // so let's just get it out the way.
  //
  // Regrettably this polutes the disk, perhaps we should compute the
  // hash ourselves and unlink; would require utils.deepHash and
  // meteorBabelVersion.
  var options = Babel.getDefaultOptions();
  if (babelrc.client.exists)
    options.extends = babelrc.client.path;
  else
    options.extends = babelrc.root.path;
  options.filename = options.sourceFileName = 'gadicc-cachebuster.js';
  Babel.compile("import React from 'react';\n", options, {
    sourceHash: crypto.randomBytes(20).toString('hex')
  });
};

// get file data from build plugin
handlers.fileData = function({files, pluginId}) {
  // hothacks.js guarantees that these are all new
  for (var key in files)
    fs.watch(key, onChange.bind(null, key, pluginId, files[key]));
};

/* handle file changes */

var lastCall = {};
function onChange(file, pluginId, inputFile, event) {
  // de-dupe 2 calls for same event
  var now = Date.now();
  if (lastCall[file] && now - lastCall[file] < 2)
    return;
  lastCall[file] = now;

  if (event === 'rename') {
    log('TODO, rename support.', file);
    return;
  }

  //console.log('got ' + event + ' for ', JSON.stringify(file, null, 2));
  fs.readFile(file, 'utf8', function(err, contents) {
    if (err) throw new Error(err);

    inputFile.sourceHash =
      crypto.createHash('sha1').update(contents).digest('hex');

    inputFile.contents = contents;

    addInputFile(inputFile, pluginId);
  });

}

/* debounce */

var timeout, inputFiles = {};

function addInputFile(inputFile, pluginId) {
  if (timeout) clearTimeout(timeout);

  if (!inputFiles[pluginId])
    inputFiles[pluginId] = [];

  inputFiles[pluginId].push(inputFile);

  timeout = setTimeout(sendInputFiles, 2);
}

function sendInputFiles() {
  for (let pluginId in inputFiles) {
    const plugin = BuildPlugin.byId(pluginId);
    plugin.processFilesForTarget(inputFiles[pluginId]);
    inputFiles[pluginId] = [];
  }
  timeout = null;
}

/* hothacks.js */

var hot = {
  bundles: {}
};

function extractRequires(content) {
  var requires = [], match, re = /require\((['"]+)(.+)\1\)/g;
  while ((match = re.exec(content))) {
    requires.push(match[2]);
  }
  return requires;
}

// Given an object and ['a', 'b'], returns a ref to { a: { b: THIS }}
function getSub(tree, array, i) {
  if (!i)
    i = 0;
  if (i === 0 && !array.length)
    return tree;
  if (!tree[array[i]])
    tree[array[i]] = {};
  if (i === array.length-1)
    return tree[array[i]];
  else
    return getSub(tree[array[i]], array, i+1);
}

// Given a bundle, output a "tree" in the format meteorInstall expects
function treeify(bundle) {
  var tree = {};
  bundle.forEach(function(file) {
    var path = file.path;
    if (file.packageName)
      path = 'node_modules/meteor/' + file.packageName + '/' + path;

    var dirs = path.split('/');
    var filename = dirs.pop();

    var sub = getSub(tree, dirs);
    var requires = extractRequires(file.data);

    sub[filename] = requires.concat(
      '__OF__' + file.data + '__CF__');
  });
  return tree;
}

hot.process = _.debounce(function hotProcess(bundle) {
  if (!bundle.length)
    return;

  //var id = Random.hexString(40);
  var id = crypto.randomBytes(20).toString('hex');
  // console.log('[gadicc:hot] Creating a bundle for ' + bundle.length + ' change file(s)...');

  var tree = treeify(bundle);
  var bundleStr = 'meteorInstallHot(' +
    JSON.stringify(tree).replace(/\"__OF__(.*?)__CF__\"/g, function(m, f) {
      return 'function(require,exports,module){'
        + f.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'")
        + '\n}';
    }) + ');\n';

  hot.bundles[id] = { contents: bundleStr };
  wss.broadcast(id);
}, 5);
