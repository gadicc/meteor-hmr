/*
 * NB: We don't use this anymore, rather, import meteor/inputFile
 */

import { log, debug } from './log';
import _ from 'underscore';
import files from './mini-files.js';
import fs from 'fs';

class FakeFile {

  constructor(data) {
    this.data = data;

    for (let k of ['_controlFileCache','_resourceSlot','_resolveCache'])
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

  // Search ancestor directories for control files (e.g. package.json,
  // .babelrc), and return the absolute path of the first one found, or
  // null if the search failed.
  findControlFile(basename) {
    let absPath = this._controlFileCache[basename];
    if (typeof absPath === "string") {
      return absPath;
    }

    const sourceRoot = this._resourceSlot.packageSourceBatch.sourceRoot;
    if (! _.isString(sourceRoot)) {
      return this._controlFileCache[basename] = null;
    }

    let dir = files.pathDirname(this.getPathInPackage());
    while (true) {
      absPath = files.pathJoin(sourceRoot, dir, basename);

      const stat = files.statOrNull(absPath);
      if (stat && stat.isFile()) {
        return this._controlFileCache[basename] = absPath;
      }

      if (files.pathBasename(dir) === "node_modules") {
        // The search for control files should not escape node_modules.
        return this._controlFileCache[basename] = null;
      }

      let parentDir = files.pathDirname(dir);
      if (parentDir === dir) break;
      dir = parentDir;
    }

    return this._controlFileCache[basename] = null;
  }

  resolve(id) {
    if (_.has(this._resolveCache, id)) {
      return this._resolveCache[id];
    }

    const sourceBatch = this._resourceSlot.packageSourceBatch;
    const parentPath = files.convertToOSPath(files.pathJoin(
      sourceBatch.sourceRoot,
      this.getPathInPackage()
    ));
    // Absolute CommonJS module identifier of the parent module.
    const parentId = files.convertToPosixPath(parentPath, true);
    const Module = module.constructor;
    const parent = new Module(parentId);

    // We only need to populate parent.paths if id is top-level, meaning
    // that it could potentially be found in a node_modules directory.
    const isTopLevelId = "./".indexOf(id.charAt(0)) < 0;
    if (isTopLevelId) {
      const nmds = sourceBatch.unibuild.nodeModulesDirectories;
      const osPaths = Object.create(null);
      const nonLocalPaths = [];

      _.each(nmds, (nmd, path) => {
        path = files.convertToOSPath(path.replace(/\/$/g, ""));
        osPaths[path] = true;
        if (! nmd.local) {
          nonLocalPaths.push(path);
        }
      });

      parent.paths = [];

      // Add any local node_modules directory paths that are both
      // ancestors of this file and included in this PackageSourceBatch.
      Module._nodeModulePaths(parentPath).forEach(path => {
        if (_.has(osPaths, path)) {
          parent.paths.push(path);
        }
      });

      // Now add any non-local node_modules directories that are used by
      // this PackageSourceBatch.
      parent.paths.push(...nonLocalPaths);
    }

    return this._resolveCache[id] =
      Module._resolveFilename(id, parent);
  }

  require(id) {
    return require(this.resolve(id));
  }

}

export default FakeFile;
