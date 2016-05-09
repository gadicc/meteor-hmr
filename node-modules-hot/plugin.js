var fs = Npm.require('fs');
var path = Npm.require('path');
var crypto = Npm.require('crypto');
var child_process = Npm.require('child_process');

var recursive = Npm.require('recursive-readdir');
var Mode = Npm.require('stat-mode');

var PathWatcher = Npm.require('pathwatcher');

// This *must* match the name of your package
var hot = new Hot('gadicc:node-modules-hot/node-modules-hot');
var projRoot = MeteorFilesHelpers.getAppPath();
var nodeModules = path.join(projRoot, 'node_modules');

/*
 * Look through node_modules and call callback(symlink, realPath) for any
 * path found that is a symlink link to realPath.
 */
function findNodeModuleSymlinks(callback) {
  fs.readdir(nodeModules, function(err, files) {
    if (err) throw err;

    _.each(files, function(file) {
      file = path.join(nodeModules, file);
      fs.lstat(file, function(err, stats) {
        if (err) throw err;

        if (new Mode(stats).isSymbolicLink())
          fs.realpath(file, function(err, realpath) {
            if (err) throw err;
            callback(file, realpath);
          });
      });
    });
  });
}

/*
 * 1. Watch the 'src' versions of the files, and run babel when they
 *    are updated.  (TODO, run babel from inside node!  much quicker)
 *
 * 1. Call hot.processFilesForTarget locally (inside Meteor) with all
 *    'lib' versions of the files, so the accelerator will watch them.
 *
 */
function handleModule(symlink, realpath) {
  // Run babel for any changed files
  var onChange = _.debounce(function onChange(realpath, file, event) {
    console.log(realpath, file, event);
    if (event !== 'change') return;
    var bin = path.join(realpath, 'node_modules', '.bin', 'babel');
    var args = [
      '-o',
      path.join(file.replace(/\/src\//, '/lib/')),
      file
    ];
    console.log(bin, args);
    child_process.spawn(bin, args, { cwd: realpath });
  }, 5);

  recursive(path.join(realpath, 'src'), function(err, files) {
    _.each(files, function(file) {
      console.log('watch', file);
      PathWatcher.watch(file, onChange.bind(null, realpath, file));
    });
  });

  recursive(path.join(symlink, 'lib'), function(err, files) {
    hot.processFilesForTarget(
      _.map(files, function(file) {
        var fakeFile = new FakeFile({
          packageName: null,
          pathInPackage: file
            .replace(/^.*\/node_modules\//, 'node_modules/')
            .replace(/\/src\//, '/lib/'),
          extension: path.extname(file),
          basename: path.basename(file)
        });
        fakeFile._resourceSlot = {
          packageSourceBatch: {
            sourceRoot: projRoot
          }
        };
        return fakeFile;
      })
    );
  });
}

// for Hot.prototype.processFilesForTarget
function FakeFile(data) {
  this.data = data;
};
FakeFile.prototype.getContentsAsString = function() { console.error("getContents called?"); };
FakeFile.prototype.getPackageName = function() { return this.data.packageName; };
FakeFile.prototype.getPathInPackage = function() { return this.data.pathInPackage; };
FakeFile.prototype.getDisplayPath = function() { return this.data.displayPath; };
FakeFile.prototype.getFileOptions = function() { return { bare: true }; };
FakeFile.prototype.getArch = function() { return 'web.browser'; };
FakeFile.prototype.getSourceHash = function() { return this.data.getSourceHash; };
FakeFile.prototype.getExtension = function() { return this.data.extension; };
FakeFile.prototype.getBasename = function() { return this.data.basename; };
FakeFile.prototype.addJavaScript = function() { console.error("addJavaScript called?") };
FakeFile.prototype.error = function(err) { console.error(err); };


Plugin.registerCompiler({
  // We can't do a "real" build plugin for node_modules files
  filenames: ['nodeModulesHotNeverMatch']
}, function () {
  function LocalNodeModulesCompiler() {};

  // See comments for findNodeModuleSymlinks and handleModule, above.
  if (!process.env.INSIDE_ACCELERATOR)
    findNodeModuleSymlinks(handleModule);

  LocalNodeModulesCompiler.prototype.processFilesForTarget =
    process.env.INSIDE_ACCELERATOR ?
    function(files) {
      // Inside of accelerator, just add the files as-is.
      _.each(files, function(file) {
        file.addJavaScript({
          data: file.getContentsAsString(),
          path: file.getPathInPackage()
        });
      });
    } :
    function(files) {
      // Outside of accelerator, this should never be called.
      throw new Error("processFilesForTarget should never be called", files);
    };

  LocalNodeModulesCompiler.prototype.setDiskCacheDirectory = function() {};

  var compiler = new LocalNodeModulesCompiler();

  // Wrap your compiler before returning
  return hot.wrap(compiler);
});
