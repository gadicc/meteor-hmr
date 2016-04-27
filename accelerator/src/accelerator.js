import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';

import { log, debug } from './log';
import BuildPlugin from './buildPlugin';

/* Arguments */

// process.argv[0] <-- full node binary path
// process.argv[1] <-- full path for this file
const ACCEL_ID = process.argv[2];
const HOT_PORT = process.argv[3];
const meteorToolPath = process.argv[4];

/* Node_modules we can get from Meteor, notably, binary deps */

const meteorToolNodeModules = path.join(
  meteorToolPath, 'dev_bundle', 'lib', 'node_modules'
);

function meteorRequire(module) {
  return require(path.join(meteorToolNodeModules, module));
}

const Fiber = meteorRequire('fibers');
const WebSocketServer = meteorRequire('ws').Server;

const Promise = meteorRequire('meteor-promise');
Promise.Fiber = Fiber;

BuildPlugin.init({
  Fiber,
  Promise,
  meteorToolNodeModules
});

/* Load */

log.setId(ACCEL_ID);

process.env.INSIDE_ACCELERATOR = true;

console.log('=> Starting gadicc:hot-build Accelerator (' + ACCEL_ID
  + ') on port ' + HOT_PORT + '.\n');

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

wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    // Only send to web clients, not hot-build connections
    if (client.upgradeReq.url === '/')
      client.send(data);
  });
};

wss.on('connection', function connection(ws) {
  const match = ws.upgradeReq.url.match(/^\/hot-build\?id=(.*)$/);
  if (match) {
    let id = match[1];
    debug(`Connection from hot-build (${id})`);
    ws.on('message', function(_msg) {
      const msg = JSON.parse(_msg);

      if (msg.type === 'PLUGIN_INIT')
        return handlers[msg.type](msg);
      else if (handlers[msg.type]) {
        // set during devel to make sure plugin has finished building itself
        // before we try load it.
        if (initQueue[msg.pluginId]) {
          let {id, name, path} = initQueue[msg.pluginId];
          new BuildPlugin(id, name, path, addJavaScript);
          delete initQueue[msg.pluginId];
        }

        return handlers[msg.type](msg,
          BuildPlugin.byId(msg.pluginId));
      }

      log('unknown message: ' + _msg);
    });
  }
});

const handlers = {};

process.on('disconnect', function() {
  log('disconnect event received, exiting.');
  handlers.close();
});

process.on('message', function(msg) {
  log("Ignored message from process, use a websocket instead: "
    + JSON.stringify(msg));
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

const initQueue = {};
handlers.PLUGIN_INIT = function({id, name, path}) {
  // During devel the package might still be building itself at init time.
  if (path.match(/local/))
    initQueue[id] = {id, name, path};
  else
    new BuildPlugin(id, name, path, addJavaScript);
}

handlers.setDiskCacheDirectory = function({dir}, plugin) {
  plugin.setDiskCacheDirectory(dir);

  if (plugin.compiler._hotInitFakeCompile) {
    plugin.compiler._hotInitFakeCompile();
  }
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
  timeout = null;

  for (let pluginId in inputFiles) {
    const plugin = BuildPlugin.byId(pluginId);
    const files = inputFiles[pluginId];

    if (files.length) {
      plugin.processFilesForTarget(files);
      inputFiles[pluginId] = [];
    }
  }
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

var bundle = [], bundleTimeout;
function addJavaScript(data, file) {
  if (bundleTimeout)
    clearTimeout(bundleTimeout);

  debug(3, 'addJavaScript');
  debug(3, file);
  debug(3, data);

  data.packageName = file.data.packageName;

  bundle.push(data);
  bundleTimeout = setTimeout(hot.process, 5);
}

hot.process = function hotProcess() {
  bundleTimeout = null;

  debug(3, `hot.process(${bundle.join(',')})`);
  if (!bundle.length)
    return;

  var id = crypto.randomBytes(20).toString('hex');
  debug('Creating a bundle for ' + bundle.length + ' changed file(s)...');

  var tree = treeify(bundle);
  var bundleStr = 'meteorInstallHot(' +
    JSON.stringify(tree).replace(/\"__OF__(.*?)__CF__\"/g, function(m, f) {
      return 'function(require,exports,module,__filename,__dirname){'
        + f.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\'/g, "'")
        + '\n}';
    }) + ');\n';

  debug(3, bundleStr);
  hot.bundles[id] = { contents: bundleStr };
  wss.broadcast(id);
  bundle = [];
};
