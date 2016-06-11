import fs from 'fs';
import crypto from 'crypto';
import _ from 'underscore';

/* sha1 */

export function sha1(contents) {
  return crypto.createHash('sha1').update(contents).digest('hex');
}

/* files.js */

const files = {};

files.readFile = function(path) {
  return fs.readFileSync(path);
}

export { files };

/* watch.js */

var readFile = function (absPath) {
  try {
    return files.readFile(absPath);
  } catch (e) {
    // Rethrow most errors.
    if (! e || (e.code !== 'ENOENT' && e.code !== 'EISDIR')) {
      throw e;
    }
    // File does not exist (or is a directory).
    return null;
  }
};

export function readAndWatchFileWithHash(watchSet, absPath) {
  var contents = readFile(absPath);
  var hash = null;
  // Allow null watchSet, if we want to use readFile-style error handling in a
  // context where we might not always have a WatchSet (eg, reading
  // settings.json where we watch for "meteor run" but not for "meteor deploy").
  if (watchSet) {
    hash = contents === null ? null : sha1(contents);
    // meteor-hmr: don't really do anything
    // watchSet.addFile(absPath, hash);
  }
  return {contents: contents, hash: hash};
}

export function readAndWatchFile(watchSet, absPath) {
  return readAndWatchFileWithHash(watchSet, absPath).contents;
}

/* compiler-plugin.js */

import Resolver from './resolver';

// from class PackageSourceBatch
export function getResolver() {
  if (this._resolver) {
    return this._resolver;
  }

  const nmds = this.unibuild.nodeModulesDirectories;
  const nodeModulesPaths = [];

  _.each(nmds, (nmd, path) => {
    if (! nmd.local) {
      nodeModulesPaths.push(
        files.convertToOSPath(path.replace(/\/$/g, "")));
    }
  });

  return this._resolver = new Resolver({
    sourceRoot: this.sourceRoot,
    targetArch: this.processor.arch,
    extensions: this.importExtensions,
    nodeModulesPaths,
    watchSet: this.unibuild.watchSet,
    onMissing(id) {
      const error = new Error("Cannot find module '" + id + "'");
      error.code = "MODULE_NOT_FOUND";
      throw error;
    }
  });
}
