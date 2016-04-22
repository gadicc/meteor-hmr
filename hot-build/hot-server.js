// Never run as a server package (only as a build plugin)
if (process.env.APP_ID)
  return;

// Don't do anything real in these circumstances
if (process.env.INSIDE_ACCELERATOR
    || process.env.NODE_ENV==='production'
    || process.argv[2] === 'test'
    || process.argv[2] === 'test-packages') {

  Hot = function() {};
  Hot.prototype.wrap = function(compiler) { return compiler; }
  return;
}

var path = Npm.require('path');
var fs = Npm.require('fs');

// XXX better way to do this?
var tmp = null;
projRoot = process.cwd();

while (projRoot !== tmp && !fs.existsSync(path.join(projRoot, '.meteor'))) {
  tmp = projRoot;  // used to detect drive root on windows too ("./.." == ".")
  projRoot = path.normalize(path.join(projRoot, '..'));
}

if (projRoot === tmp) {
  // We stop processing this file here in a non-devel environment
  // because a production build won't have a .meteor directory.
  // We need it during the build process (which is also "production"),
  // but for now we assume that this kind of error would be detected
  // during development.  Would love to hear of alternative ways to do
  // this.  Could maybe check for "local/star.json" to identify devel build.
  if (process.env.NODE_ENV !== 'development')
    return;
  else
    throw new Error("Are you running inside a Meteor project dir?");
}

function loadVersions() {
  var versionsRaw = fs.readFileSync(
    path.join(projRoot, '.meteor', 'versions'), 'utf8'
  ).split('\n');

  var versions = {};
  for (var i=0; i < versionsRaw.length; i++) {
    var line = versionsRaw[i].split('@');
    if (line.length == 2)
      versions[line[0]] = line[1];
  }
  return versions;  
}

var versions = null;

function findPackagePath(name) {
  var p = path.join(projRoot, '.meteor', 'local',
    'isopacks', name.replace(':', '_'));

  // First look for a locally installed version of the package (e.g. devel)
  if (fs.existsSync(p)) {
    return p;
  }

  console.log('[gadicc:hot] Not a local package: ' + name);
  return null;
}

function getPluginPath(name) {
  var parts = name.split('/');
  var packageName = parts[0];
  var pluginName = parts[1];

  var packagePath = findPackagePath(packageName);
  if (!packagePath)
    return null;

  var isopack = JSON.parse(
    fs.readFileSync(path.join(packagePath, 'isopack.json'))
  )['isopack-2'];

  if (!isopack)
    throw new Error("[gadicc:hot] No isopack-2 section: " + packageName);
  if (isopack.plugins.length === 0)
    throw new Error("[gadicc:hot] No plugins found in " + name);

  var plugin = _.find(isopack.plugins, function(plugin) {
    return plugin.name === pluginName;
  });

  if (!plugin)
    throw new Error("[gadicc:hot] No plugin \"" + pluginName
      + "\" in package \"" + packageName + "\"");

  return path.join(packagePath,
    plugin.path.replace(/\/program.json$/, ''));
}

Hot = function(plugin) {
  this.id = Random.id();
  this.plugin = plugin;

  var pluginPath = getPluginPath(plugin);
  if (!pluginPath) {
    console.log("[gadicc:hot] Couldn't find plugin path for: " + plugin);
  }
  this.pluginPath = pluginPath;

  this.send({
    type: 'PLUGIN_INIT',
    id: this.id,
    name: plugin,
    path: pluginPath
  });
}

Hot.prototype.wrap = function(compiler) {
  var self = this;

  var origProcessFilesForTarget = compiler.processFilesForTarget;
  compiler.processFilesForTarget = function(inputFiles) {
    self.processFilesForTarget(inputFiles);
    origProcessFilesForTarget.call(compiler, inputFiles);
  }

  var origSetDiskCacheDirectory = compiler.setDiskCacheDirectory;
  compiler.setDiskCacheDirectory = function(cacheDir) {
    self.setDiskCacheDirectory(cacheDir);
    origSetDiskCacheDirectory.call(compiler, cacheDir);
  }

  return compiler;
}

Hot.prototype.send = function(payload) {
  if (!this.pluginPath)
    return;

  payload.pluginId = this.id;
  Hot.send(payload);
}

Hot.prototype.setDiskCacheDirectory = function(cacheDir) {
  this.send({ type: 'setDiskCacheDirectory', dir: cacheDir });
}

var sentFiles = {};
Hot.prototype.processFilesForTarget = function(inputFiles) {
  var data = {};

  inputFiles.forEach(function(inputFile) {
    var file;
    if (inputFile.getArch() === "web.browser") {
      file = convertToOSPath(path.join(
        inputFile._resourceSlot.packageSourceBatch.sourceRoot,
        inputFile.getPathInPackage()
      ));
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

  if (Object.keys(data).length)
    this.send({
      type: 'fileData',
      files: data
    });
};

// These next two from meteor/tools/static-assets/server/mini-files.js
var convertToOSPath = function (standardPath, partialPath) {
  if (process.platform === "win32") {
    return toDosPath(standardPath, partialPath);
  }

  return standardPath;
};
var toDosPath = function (p, partialPath) {
  if (p[0] === '/' && ! partialPath) {
    if (! /^\/[A-Za-z](\/|$)/.test(p))
      throw new Error("Surprising path: " + p);
    // transform a previously windows path back
    // "/C/something" to "c:/something"
    p = p[1] + ":" + p.slice(2);
  }

  p = p.replace(/\//g, '\\');
  return p;
};
