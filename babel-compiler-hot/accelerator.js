var fs = require('fs');
var path = require('path');
var http = require('http');
var crypto = require('crypto');
//var WebSocketServer = require('ws').Server;

/* arguments from hothacks.js */

// argv[0] == node bin
// argv[1] == this script
var HOT_PORT = process.argv[2];

/* */

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

// websocketserver setup below

var handlers = {};
var babelrc, packageDir, node_modules, meteorBabel, WebSocketServer,
  wss, pendingSetCacheDir;

process.on('message', function(msg) {
  if (handlers[msg.type])
    return handlers[msg.type](msg.data);
  console.log('[gadicc-hot-fork] Unknown message: ' + JSON.stringify(msg));
});

handlers.close = function() {
  server.close();
  wss.close();
  process.send({type: 'closed'});
  process.disconnect();
  process.exit();  
};

handlers.initPayload = function(data) {
  babelrc = data.babelrc;

  pkgSettings = data.pkgSettings;
  tsSettings = pkgSettings && pkgSettings.transformStateless;
  tsPathMatch = tsSettings && tsSettings.pathMatch
    ? toRegExp(tsSettings.pathMatch) : /\.jsx$/;
  tsSourceMatch = tsSettings && tsSettings.sourceMatch
    ? toRegExp(tsSettings.sourceMatch) : /^import React/m;
};

handlers.packageDir = function(dir) {
  packageDir = dir;

  // published package vs local package
  if (packageDir.match(/\+os\+/))
    node_modules = path.join(packageDir, 'npm', 'node_modules');
  else
    node_modules = path.join(packageDir, '.npm', 'package', 'node_modules');

  // modules via Npm.depends in package.js
  meteorBabel = require(path.join(node_modules, 'meteor-babel'));
  WebSocketServer = require(path.join(node_modules, 'ws')).Server;

  wss = new WebSocketServer({ server: server });

  // straight out of https://www.npmjs.com/package/ws
  wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
      client.send(data);
    });
  };

  if (pendingSetCacheDir) {
    handlers.setCacheDir(pendingSetCacheDir);
    pendingSetCacheDir = false;
  }
};

handlers.setCacheDir = function(dir) {
  if (!packageDir) {
    pendingSetCacheDir = dir;
    return;
  }

  bc.setDiskCacheDirectory(dir);

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
handlers.fileData = function(files) {
  // hothacks.js guarantees that these are all new
  for (var key in files)
    fs.watch(key, onChange.bind(null, key, files[key]));
};

/* handle file changes */

var lastCall = {};
function onChange(file, inputFile, event) {
  // de-dupe 2 calls for same event
  var now = Date.now();
  if (lastCall[file] && now - lastCall[file] < 2)
    return;
  lastCall[file] = now;

  if (event === 'rename') {
    console.log('todo, rename support', file);
    return;
  }

  //console.log('got ' + event + ' for ', JSON.stringify(file, null, 2));
  fs.readFile(file, 'utf8', function(err, contents) {
    if (err) throw new Error(err);

    inputFile.sourceHash =
      crypto.createHash('sha1').update(contents).digest('hex');

    inputFile.contents = contents;

    addInputFile(inputFile);
  });

}

/* debounce */

var timeout, inputFiles = [];

function addInputFile(inputFile) {
  if (timeout) clearTimeout(timeout);

  inputFiles.push(inputFile);

  timeout = setTimeout(sendInputFiles, 2);
}

function sendInputFiles() {
  bc.processFilesForTarget(
    inputFiles.map(function(inputFile) { return new FakeFile(inputFile); })
  );

  inputFiles = [];
  timeout = null;
}

/* Dupe code from rest of package */

//var packageDir = '/home/dragon/.meteor/packages/gadicc_babel-compiler-hot/.6.6.2-beta.1.4sue43++os+web.browser+web.cordova';
//var meteorBabel = require(packageDir + '/npm/node_modules/meteor-babel');

/* babelrc.js */

// babelrc processing done in build plugin

function archType(arch) {
  if (arch.substr(0, 4) === 'web.')
    return 'client';
  if (arch.substr(0, 3) === 'os.');
    return 'server';
  throw new Error("Unkown architecture: " + arch);
}

/*
 * Wow, in the end, this is all we need and babel does the rest in
 * the right way.
 */
mergeBabelrcOptions = function(options, inputFile) {
  var arch = archType(inputFile.getArch());

  var obj = babelrc[arch];
  if (!obj.exists)
    obj = babelrc.root;

  options.extends = obj.path;

  return {
    babelrcHash: obj.combinedHash || obj.hash,

    // Because .babelrc may contain env-specific configs
    // Default is 'development' as per http://babeljs.io/docs/usage/options/
    BABEL_ENV: process.env.BABEL_ENV || process.env.NODE_ENV || 'development'
  };
}

/* hothacks.js */

var hot = {
  lastHash: {},
  bundles: {},
  orig: {}
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
}

function toRegExp(input) {
  if (typeof input === 'string')
    return new RegExp(input);
  else if (Object.prototype.toString.call(input) === '[object Array]')
    return new RegExp(input[0], input[1]);
  else
    throw new Error("Don't know how to interpret pattern", input);
}

// set in initPayload
var pkgSettings, tsSettings, tsPathMatch, tsSourceMatch;

hot.transformStateless = function(source, path) {
  if (!(source.match(tsSourceMatch) && path.match(tsPathMatch))) {
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

function FakeFile(data) {
  this.data = data;
}
FakeFile.prototype.getContentsAsString = function() {
  return this.data.contents;
}
FakeFile.prototype.getPackageName = function() {
  return this.data.packageName;
}
FakeFile.prototype.getPathInPackage = function() {
  return this.data.pathInPackage;
}
FakeFile.prototype.getFileOptions = function() {
  return this.data.fileOptions;
}
FakeFile.prototype.getArch = function() {
  return 'web.browser';
}
FakeFile.prototype.getSourceHash = function() {
  return this.data.sourceHash;
}
FakeFile.prototype.addJavaScript = function() {
  // no-op
}
FakeFile.prototype.error = function(error) {
  console.log(error);
}

/* babel.js */

function validateExtraFeatures(extraFeatures) {
  if (extraFeatures) {
    /*
    check(extraFeatures, {
      // Modify options to enable React/JSX syntax.
      react: Match.Optional(Boolean),
      // Improve compatibility in older versions of Internet Explorer.
      jscript: Match.Optional(Boolean)
    });
    */
  }
}

/**
 * Returns a new object containing default options appropriate for
 */
function getDefaultOptions(extraFeatures) {
  validateExtraFeatures(extraFeatures);

  // See https://github.com/meteor/babel/blob/master/options.js for more
  // information about what the default options are.
  var options = meteorBabel.getDefaultOptions(extraFeatures);

  // The sourceMap option should probably be removed from the default
  // options returned by meteorBabel.getDefaultOptions.
  delete options.sourceMap;

  return options;
}

var Babel = {
  getDefaultOptions: getDefaultOptions,

  validateExtraFeatures: validateExtraFeatures,

  compile: function (source, options, deps) {
    options = options || getDefaultOptions();
    return meteorBabel.compile(source, options, deps);
  },

  setCacheDir: function (cacheDir) {
    meteorBabel.setCacheDir(cacheDir);
  }
};

/* babel-compiler.js */

/**
 * A compiler that can be instantiated with features and used inside
 * Plugin.registerCompiler
 * @param {Object} extraFeatures The same object that getDefaultOptions takes
 */
var BabelCompiler = function BabelCompiler(extraFeatures) {
  Babel.validateExtraFeatures(extraFeatures);
  this.extraFeatures = extraFeatures;
};

var BCp = BabelCompiler.prototype;
var excludedFileExtensionPattern = /\.es5\.js$/i;

BCp.processFilesForTarget = function (inputFiles) {
  var self = this;

  // hot
  var partialBundle = [];
  // hot.forFork(inputFiles, this, isFake);

  inputFiles.forEach(function (inputFile) {
    var source = inputFile.getContentsAsString();
    var packageName = inputFile.getPackageName();
    var inputFilePath = inputFile.getPathInPackage();
    var outputFilePath = inputFilePath;
    var fileOptions = inputFile.getFileOptions();
    var toBeAdded = {
      sourcePath: inputFilePath,
      path: outputFilePath,
      data: source,
      hash: inputFile.getSourceHash(),
      sourceMap: null,
      bare: !! fileOptions.bare
    };
    var deps;

    // If you need to exclude a specific file within a package from Babel
    // compilation, pass the { transpile: false } options to api.addFiles
    // when you add that file.
    if (fileOptions.transpile !== false &&
        // If you need to exclude a specific file within an app from Babel
        // compilation, give it the following file extension: .es5.js
        ! excludedFileExtensionPattern.test(inputFilePath)) {

      var targetCouldBeInternetExplorer8 =
        inputFile.getArch() === "web.browser";

      self.extraFeatures = self.extraFeatures || {};
      if (! self.extraFeatures.hasOwnProperty("jscript")) {
        // Perform some additional transformations to improve
        // compatibility in older browsers (e.g. wrapping named function
        // expressions, per http://kiro.me/blog/nfe_dilemma.html).
        self.extraFeatures.jscript = targetCouldBeInternetExplorer8;
      }

      var babelOptions = Babel.getDefaultOptions(self.extraFeatures);

      // hot
      deps = mergeBabelrcOptions(babelOptions, inputFile);
      source = hot.transformStateless(source, inputFilePath);
      deps.sourceHash = toBeAdded.hash;

      babelOptions.sourceMap = true;
      babelOptions.filename =
      babelOptions.sourceFileName = packageName
        ? "/packages/" + packageName + "/" + inputFilePath
        : "/" + inputFilePath;

      babelOptions.sourceMapTarget = babelOptions.filename + ".map";

      try {
        var result = profile('Babel.compile', function () {
          return Babel.compile(source, babelOptions, deps);
        });
      } catch (e) {
        if (e.loc) {
          inputFile.error({
            message: e.message,
            line: e.loc.line,
            column: e.loc.column,
          });

          return;
        }

        throw e;
      }

      toBeAdded.data = result.code;
      toBeAdded.hash = result.hash;
      toBeAdded.sourceMap = result.map;

      // hot
      toBeAdded.packageName = packageName;
    }

    partialBundle.push(toBeAdded);
  }); /* inputFiles.forEach */

  // hot
  hot.process(partialBundle);
};

BCp.setDiskCacheDirectory = function (cacheDir) {
  Babel.setCacheDir(cacheDir);
};

function profile(name, func) {
  if (typeof Profile !== 'undefined') {
    return Profile.time(name, func);
  } else {
    return func();
  }
};

/* */

var bc = new BabelCompiler({ react: true });

/*
var time = Date.now();
function sinceLast(text) {
  var now = Date.now();
  console.log(text + ' ' + (now - time));
  time = now;
}
*/
