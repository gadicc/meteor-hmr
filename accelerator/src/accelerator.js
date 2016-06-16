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

log.setId(ACCEL_ID);

/* Node_modules we can get from Meteor, notably, binary deps */

const meteorToolNodeModules = path.join(
  meteorToolPath, 'dev_bundle', 'lib', 'node_modules'
);

function meteorRequire(module) {
  return require(path.join(meteorToolNodeModules, module));
}

const Fiber = meteorRequire('fibers');
//const WebSocketServer = meteorRequire('ws').Server;
import { Server as WebSocketServer } from 'ws';
const PathWatcher = meteorRequire('pathwatcher');

const Promise = meteorRequire('meteor-promise');
Promise.Fiber = Fiber;

BuildPlugin.init({
  Fiber,
  Promise,
  meteorToolNodeModules
});

/* Load */

const packageJson = require('../package.json');
const packageVersion = packageJson.version;
const packageVersionParts = packageVersion.split('.').map(Number);

process.env.INSIDE_ACCELERATOR = true;

console._log('=> Starting gadicc:hot-build Accelerator (' + ACCEL_ID
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
  const match = ws.upgradeReq.url.match(/^\/hot-build\?id=(.*)&v=(.*)$/);
  if (match) {
    let id = match[1];
    let requestedVersion = match[2];
    let requestedVersionParts = requestedVersion.split('.').map(Number);

    if (requestedVersionParts[0] !== packageVersionParts[0]) {
      log(`Rejecting hot-build (${id}) because it requires a different `
        + `major version; requested v${requestedVersion}, current `
        + packageVersion);
      ws.send(JSON.stringify({
        type: "reject",
        code: "majorVersionMismatch",
        message: "You need to depend on a more recent version of hot-build. "
          + "Requested: v" + requestedVersion + ", current v" + packageVersion
      }));
      return;
    } else if (requestedVersionParts[1] < packageVersionParts[1]
        || requestedVersionParts[2] < packageVersionParts[2]) {
      log(`Rejecting hot-build (${id}) because it requires a newer `
        + `version; requested v${requestedVersion}, current `
        + packageVersion);
      ws.send(JSON.stringify({
        type: "reject",
        code: "versionReload",
        message: "You requested a newer version of the accelerator, "
          + "reloading..."
      }), handlers.close)  // quit only after message has been sent.
      return;
    }

    debug(`Connection from hot-build (${id})`);
    ws.send(JSON.stringify({type:'connected'}));

    ws.on('message', function(_msg) {
      var msg;
      try {
        msg = JSON.parse(_msg);
      } catch (err) {
        log("Ignoring invalid JSON: " + _msg, err);
        return;        
      }

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
  debug("Terminating");
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
  if (path.match(/local/)) {
    debug(`Queuing local ${name} (${id}) until use to ensure it's fully loaded`);
    initQueue[id] = {id, name, path};
  } else {
    new BuildPlugin(id, name, path, addJavaScript);
  }
}

handlers.setDiskCacheDirectory = function({dir}, plugin) {
  plugin.setDiskCacheDirectory(dir);

  if (plugin.compiler._hotInitFakeCompile) {
    plugin.compiler._hotInitFakeCompile();
  }
};

// get file data from build plugin
const watchers = {};
handlers.fileData = function({files, pluginId}) {
  const plugin = BuildPlugin.byId(pluginId);
  debug(3, `Got fileData from ${plugin.name} (${pluginId}), watching: `
    + Object.keys(files).join(', '));

  for (var key in files) {
    // Maybe we got the same file again from a new instance of the plugin
    if (watchers[key])
      watchers[key].close();

    try {
      watchers[key] =
        PathWatcher.watch(key, onChange.bind(null, key, pluginId, files[key]));
    } catch (err) {
      // On Linux the thrown error actually gives the problematic file name,
      // but not on Windows
      log("Error watching " + key);
      throw err;
    }
  }
};

/* handle file changes */

var changeQueue = {}, changeTimeout = null;
function onChange(file, pluginId, inputFile, event) {
  debug(3, `Got ${event} event for ${file}`);

  // de-dupe 2 calls for same event
  // fixed https://github.com/atom/node-pathwatcher/issues/50 in aug2015 but
  // Meteor still uses an old version
  // also, we need to debounce, to not start reading too early
  if (!changeQueue[file])
    changeQueue[file] = {
      pluginId: pluginId,
      inputFile: inputFile,
      events: [event]
    };
  else
    changeQueue[file].events.push(event);

  if (changeTimeout)
    clearTimeout(changeTimeout);

  changeTimeout = setTimeout(processChanges, 5);
}

function processChanges() {
  debug('processChanges', Object.keys(changeQueue));

  for (let file in changeQueue) {
    const { pluginId, inputFile, events } = changeQueue[file];

    // Remove file from watch list and skip processing
    if (events.indexOf('delete') > 0) {
      watchers[file].close();
      delete watchers[file];
      break;
    }

    // If there's no change event, skip (e.g. just a rename)
    if (events.indexOf('change') === -1)
      break;

    fs.readFile(file, 'utf8', function(err, contents) {
      if (err) throw err;

      inputFile.sourceHash =
        crypto.createHash('sha1').update(contents).digest('hex');

      inputFile.contents = contents;

      addInputFile(inputFile, pluginId);
    });
  }

  changeQueue = {};
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

  debug(2, `hot.process(${bundle.map(x => x.path).join(',')})`);
  if (!bundle.length)
    return;

  var id = crypto.randomBytes(20).toString('hex');
  debug('Creating a bundle for ' + bundle.length + ' changed file(s)...');

  var tree = treeify(bundle);
  var bundleStr = 'meteorInstallHot(' +
    JSON.stringify(tree).replace(/\"__OF__(.*?)__CF__\"/g, function(m, f) {
      return 'function(require,exports,module,__filename,__dirname){'
        + JSON.parse('"' + f + '"')
        + '\n}';
    }) + ');\n';

  debug(3, bundleStr);
  hot.bundles[id] = { contents: bundleStr };
  wss.broadcast(id);
  bundle = [];
};
