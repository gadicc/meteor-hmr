import { log, debug } from './log';
import _ from 'underscore';
import files from './mini-files.js';
import fs from 'fs';
import crypto from 'crypto';

class FakeFile {

  constructor(data) {
    this.data = data;

    for (let k of ['_controlFileCache','_resourceSlot'/*,'_resolveCache'*/])
      this[k] = data[k];
  }

  getContentsAsString() {
    return this.data.contents;
  }

  getPackageName() {
    return this.data.packageName;
  }

  getPathInPackage() {
    return this.data.pathInPackage;
  }

  getFileOptions() {
    return this.data.fileOptions;
  }

  getDisplayPath() {
    return this.data.displayPath;
  }

  getExtension() {
    return this.data.extension;
  }

  getBasename() {
    return this.data.basename;
  }

  getArch() {
    return 'web.browser';
  }

  getSourceHash() {
    return this.data.sourceHash;
  }

  addJavaScript() {
    // no-op
    log('addJavaScript not overriden');
  }

  addStylesheet(style) {
    // no-op
    log(1, 'addStyleSheet called but ignored for hotloading', style);
  }

  error(error) {
    log("Error while compiling "
      + (this.data.packageName ? '['+this.data.packageName+']/' : '')
      + this.data.pathInPackage,
      error);
  }

  /*
   * Methods below were introduced in Meteor 1.3.3
   */

  isPackageFile() {
    return !! this.getPackageName();
  }

  isApplicationFile() {
    return ! this.getPackageName();
  }

  getSourceRoot() {
    const sourceRoot = this._resourceSlot.packageSourceBatch.sourceRoot;

    if (! _.isString(sourceRoot)) {
      const name = this.getPackageName();
      throw new Error(
        "Unknown source root for " + (
          name ? "package " + name : "app"));
    }

    return sourceRoot;
  }

  /*
   * meteor-hmr: no need to really watch the file, since, aside from in
   * accelerator-dev, the accelerator will always be restarted by Meteor
   * on changes in the watchset.
   */
  readAndWatchFile(path) {
    return fs.readFileSync(path);
  }
  readAndWatchFileWithHash(path) {
    const osPath = files.convertToOSPath(path);
    const contents = fs.readFileSync(osPath);
    const hash = crypto.createHash('sha1').update(contents).digest('hex');
    return { contents, hash };
  }

  // Search ancestor directories for control files (e.g. package.json,
  // .babelrc), and return the absolute path of the first one found, or
  // null if the search failed.
  findControlFile(basename) {
    let absPath = this._controlFileCache[basename];
    if (typeof absPath === "string") {
      return absPath;
    }

    //throw new Error(`control file ${basename} not found in cache`, this);
    return null;
  }

  // no actual resolver, exclusively use the existing reduced cache map
  resolve(id, parentPath) {
    const batch = this._resourceSlot.packageSourceBatch;

    parentPath = parentPath || files.pathJoin(
      batch.sourceRoot,
      this.getPathInPackage()
    );

    const cache = this.data._reducedResolveCache;
    if (!cache) {
      debug(3, `inputFile.resolve("${id}", "${parentPath}") - file has no cache, `
        + `passing to base require`);
      return require.resolve(id, true);
    }

    const resolved = cache[id] && cache[id][parentPath];
    if (!resolved) {
      debug(3, `inputFile.resolve("${id}", "${parentPath}") - no parentPath in `
        + `cache, passing to base require`);
      return require.resolve(id, true);
    }

    debug(3, `inputFile.resolve("${id}", "${parentPath}") => "${resolved}"`);
    return resolved;
  }

  require(id, parentPath) {
    return require(this.resolve(id, parentPath), true);
  }

}

export default FakeFile;
