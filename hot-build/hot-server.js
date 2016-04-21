var path = Npm.require('path');

Hot = function() {
  this.id = Random.id();
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
    self.setCacheDir(cacheDir);
    origSetDiskCacheDirectory.call(compiler, cacheDir);
  }

  return compiler;
}

Hot.prototype.send = function(payload) {
  return;
  payload.compilerId = this.id;
  fork.send(payload);
}

Hot.prototype.setCacheDir = function(cacheDir) {
  this.send({ type: 'setCacheDir', data: cacheDir });
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
      data: data
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
