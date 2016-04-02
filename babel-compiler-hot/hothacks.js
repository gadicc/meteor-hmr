hot = {
  lastHash: {},
  bundles: {},
  orig: {}
};

/*
 * No HMR in production with our current model (but ideally, in the future)
 */
if (process.env.NODE_ENV === 'production') {
  hot.process = function() {}
  hot.transformStateless = function(source) { return source; }
  // This also skips the Mongo connect.
  return;
}

/*
 * This is how we work out if we're in a build plugin (inside of meteor-tool)
 * or as a server package.  CODE BELOW THIS POINT SURVIVES A SERVER RELOAD.
 */
if (process.env.METEOR_PARENT_PID) {
  Meteor.settings.public.HOT_PORT = parseInt(process.env.HOT_PORT);
  return;
}

// This only actually happens in devel when reloading this plugin after change
var gdata = global._babelCompilerGlobalData;
if (!gdata) gdata = global._babelCompilerGlobalData = {};
if (gdata.wss) gdata.wss.close();
if (gdata.server) gdata.server.close();

/*
var id = Math.floor(Math.random() * 100);
console.log('loading ' + id);
process.on('exit', function() {
  console.log('exiting ' + id);
});
*/

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

// Used above when running a server package (and not a build plugin)
if (!process.env.HOT_PORT)
  process.env.HOT_PORT = HOT_PORT;

console.log('=> Starting gadicc:ecmascript-hot server on port ' + HOT_PORT + '.\n');

var http = Npm.require('http');
var server = http.createServer(function (req, res) {
  var hash = req.url.match(/^\/hot.js\?hash=(.*)$/);
  if (!(hash && (hash=hash[1]) && hot.bundles[hash])) {
    res.writeHead(404);
    res.end();
    return;
  }

  res.writeHead(200, {'Content-Type': 'application/javascript; charset=UTF-8'});
  res.end(hot.bundles[hash].contents, 'utf8');
}).listen(HOT_PORT);
gdata.server = server;

var WebSocketServer = Npm.require('ws').Server;
var wss = new WebSocketServer({ server: server });
gdata.wss = wss;

// straight out of https://www.npmjs.com/package/ws
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    client.send(data);
  });
};

function extractRequires(content) {
  var requires = [], match, re = /require\((['"]+)(.+)\1\)/g;
  while (match = re.exec(content)) {
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

hot.process = function(bundle) {
  var id = Random.hexString(40);
  // console.log('[gadicc:hot] Creating a bundle for ' + bundle.length + ' change file(s)...');

  var tree = treeify(bundle);
  var bundleStr = 'meteorInstallHot(' +
    JSON.stringify(tree).replace(/\"__OF__(.*?)__CF__\"/g, function(m, f) {
      return 'function(require,exports,module){'
        + f.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'")
        + '\n}';
    }) + ');\n';

  if (0)
  bundle.forEach(function(file) {
    bundleStr += 'require("./' + file.path + '");\n';
  });

  hot.bundles[id] = { contents: bundleStr };
  wss.broadcast(id);
}

hot.transformStateless = function(source, path) {
  // Support MantraJS style stateless components, see README
          /// XXX .js will be enabled again in the next release
  if (!source.match(/^import React/m) || !path.match(/\.jsx$/)) {
    return source;
  }

  // const MyComponent = (prop1, prop2) => ();
  source = source.replace(/\nconst ([^ ]+) = \((.*?)\) => \(([\s\S]+?)\n\);\n/g,
    function(match, className, args, code) {
      return '\nclass ' + className + ' extends React.Component {\n' +
        '  render() {\n' +
        (args ? '    const ' + args + ' = this.props;\n' : '') +
        '    return (' + code + ')\n' +
        '  }\n' +
        '}\n';
    });

  // const MyComponent = (prop1, prop2) => { return ( < ... > ) };
  source = source.replace(/\nconst ([^ ]+) = \((.*?)\) => \{([\s\S]+?)\n\};\n/g,
    function(match, className, args, code) {
      if (!match.match(/return\s+\(\s*\</))
        return match;
      return '\nclass ' + className + ' extends React.Component {\n' +
        '  render() {\n' +
        (args ? '    const ' + args + ' = this.props;\n' : '') +
        '    ' + code + '\n' +
        '  }\n' +
        '}\n';
    });

  return source;
}
