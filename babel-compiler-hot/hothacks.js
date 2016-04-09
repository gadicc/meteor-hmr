var fs = Npm.require('fs');
var path = Npm.require('path');
var child_process = Npm.require('child_process');

hot = {
  lastHash: {},
  bundles: {},
  orig: {}
};

/*
 * No HMR in production with our current model (but ideally, in the future)
 */
if (process.env.NODE_ENV === 'production') {
  var noop = function() {};
  hot.process = noop;
  hot.forFork = noop;
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

function toRegExp(input) {
  if (typeof input === 'string')
    return new RegExp(input);
  else if (Object.prototype.toString.call(input) === '[object Array]')
    return new RegExp(input[0], input[1]);
  else
    throw new Error("Don't know how to interpret pattern", input);
}

var pkg = JSON.parse(fs.readFileSync(path.join(projRoot, 'package.json')));
var pkgSettings = pkg['ecmascript-hot'];
var tsSettings = pkgSettings && pkgSettings.transformStateless;
var tsPathMatch = tsSettings && tsSettings.pathMatch
  ? toRegExp(tsSettings.pathMatch) : /\.jsx$/;
var tsSourceMatch = tsSettings && tsSettings.sourceMatch
  ? toRegExp(tsSettings.sourceMatch) : /^import React/m;

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

/* figure out package source dir */

var versions = {};
(fs.readFileSync(path.join(projRoot, '.meteor', 'versions'), 'utf8'))
  .split('\n')
  .forEach(function(line) {
    line = line.split('@');
    versions[line[0]] = line[1];
  });
console.log(versions);


/* */

// we can't read straight from program assets because at build plugin time they
// won't be created yet.
// var forkFile = path.join(projRoot, '.meteor', 'local', 'build', 'programs',
//  'server', 'assets', 'packages', 'gadicc_babel-compiler-hot', 'accelerator.js');

var forkFile = path.join(projRoot, '.meteor', 'local', 'gadicc_hot-accel.js');
fs.writeFileSync(forkFile, Assets.getText('accelerator.js'));

console.log('[gadicc:hot] ' + forkFile);
console.log('=> Starting gadicc:ecmascript-hot server on port ' + HOT_PORT + '.\n');

var fork;

function startFork() {
  fork = gdata.fork = child_process.fork(forkFile, [HOT_PORT]);

  fork.send({
    type: 'initPayload',
    data: {
      babelrc: babelrc,
      pkgSettings: pkgSettings
    }
  });

  fork.on('message', function(msg) {

    if (msg.type === 'closed') {
      // This global is detected by the new instance
      gdata.fork = null;
      return;
    }

    if (msg.type === 'inputFiles') {
      bci.processFilesForTarget(
        msg.inputFiles.map(function(inputFile) { return new FakeFile(inputFile); }),
        true // fake
      );
      return;
    }

    console.log('[gadicc:hot] Build plugin got unknown message: '
      + JSON.stringify(msg));
  });  

}

// this only ever happens when upgrading the build plugin (e.g. devel, upgrade)
var waiting = false;
if (gdata.fork) {
  waiting = {};
  gdata.fork.on('message', function(msg) {
    if (msg.type === 'closed') {
      console.log('[gadicc:hot] Switching to new accelerator instance.');
      startFork();

      if (waiting.setCacheDir)
        fork.send({ type: 'setCacheDir', data: waiting.setCacheDir });
      if (waiting.packageDir)
        fork.send({ type: 'packageDir', data: waiting.packageDir });
      if (waiting.fileData)
        fork.send({ type: 'fileData', data: waiting.fileData });

      waiting = false;
    }
  });
  gdata.fork.send({ type: 'close' });
} else {
  startFork();
}

hot.setCacheDir = function(cacheDir) {
  if (waiting)
    waiting.setCacheDir = cacheDir;
  else
    fork.send({ type: 'setCacheDir', data: cacheDir });
}

var sentFiles = {}, bci, packageDir;
hot.forFork = function(inputFiles, instance, fake) {
  var data = {};
  if (fake) return;
  if (!bci) bci = instance;

/*
    if (!hot.lastHash[path]
        // || packageName !== null 
        || inputFileArch !== 'web.browser'
        || inputFilePath.match(/^tests\//)
        || inputFilePath.match(/tests?\.jsx?$/)
        || inputFilePath.match(/specs?\.jsx?$/)
        || packageName === 'gadicc:ecmascript-hot' ) {
*/
  inputFiles.forEach(function(inputFile) {
    var file;
    if (!packageDir) {
      packageDir = Object.keys(inputFile._resourceSlot.sourceProcessor.isopack.pluginWatchSet.files)
        .find(function(file) {
          return file.match(/packages\/(?:gadicc_)?babel-compiler-hot/)
        });
      if (packageDir) {
        console.log('found package dir', packageDir);
        packageDir = packageDir.substr(0, packageDir.indexOf('babel-compiler-hot') + 18);
        if (waiting)
          waiting.packageDir = packageDir;
        else
          fork.send({ type: 'packageDir', data: packageDir });
      }

      /*
      console.log(4, inputFile.getPathInPackage());
      //console.log(inputFile);
      console.log(5, inputFile._resourceSlot.sourceProcessor.isopack);
      console.log(6, inputFile._resourceSlot.packageSourceBatch.unibuild);
      console.log(7, inputFile._resourceSlot.packageSourceBatch.sourceRoot);
      */
    }

    if (inputFile.getArch() === "web.browser") {
      file = path.join(inputFile._resourceSlot.packageSourceBatch.sourceRoot, inputFile.getPathInPackage());
      if (!sentFiles[file]) {
        sentFiles[file] = true;
        data[file] = {
          packageName: inputFile.getPackageName(),
          pathInPackage: inputFile.getPathInPackage(),
          fileOptions: inputFile.getFileOptions()
          // sourceRoot: inputFile._resourceSlot.packageSourceBatch.sourceRoot
        }
      }
    }
  });

  if (Object.keys(data).length) {
    if (waiting)
      waiting.fileData = data;
    else
      fork.send({
        type: 'fileData',
        data: data
      });
  }
};
