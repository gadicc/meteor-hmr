var buildPluginModule = require('./build-plugin.js');
var _ = require('underscore');
import files from './mini-files';
import { readAndWatchFileWithHash } from './stubs';

class InputFile extends buildPluginModule.InputFile {
  constructor(resourceSlot) {
    super();
    // We use underscored attributes here because this is user-visible
    // code and we don't want users to be accessing anything that we don't
    // document.
    this._resourceSlot = resourceSlot;

    // Map from control file names (e.g. package.json, .babelrc) to
    // absolute paths, or null to indicate absence.
    this._controlFileCache = Object.create(null);

    // Map from imported module identifier strings (possibly relative) to
    // fully require.resolve'd module identifiers.
    this._resolveCache = Object.create(null);
  }

  getContentsAsBuffer() {
    var self = this;
    return self._resourceSlot.inputResource.data;
  }

  getPackageName() {
    var self = this;
    return self._resourceSlot.packageSourceBatch.unibuild.pkg.name;
  }

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

  getPathInPackage() {
    var self = this;
    return self._resourceSlot.inputResource.path;
  }

  getFileOptions() {
    var self = this;
    // XXX fileOptions only exists on some resources (of type "source"). The JS
    // resources might not have this property.
    return self._resourceSlot.inputResource.fileOptions || {};
  }

  readAndWatchFileWithHash(path) {
    const osPath = files.convertToOSPath(path);
    const sourceRoot = this.getSourceRoot();
    const relPath = files.pathRelative(sourceRoot, osPath);
    if (relPath.startsWith("..")) {
      throw new Error(
        `Attempting to read file outside ${
          this.getPackageName() || "the app"}: ${osPath}`
      );
    }
    const sourceBatch = this._resourceSlot.packageSourceBatch;
    return readAndWatchFileWithHash(
      sourceBatch.unibuild.watchSet,
      osPath
    );
  }

  readAndWatchFile(path) {
    return this.readAndWatchFileWithHash(path).contents;
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

  _resolveCacheLookup(id, parentPath) {
    const byId = this._resolveCache[id];
    return byId && byId[parentPath];
  }

  _resolveCacheStore(id, parentPath, resolved) {
    let byId = this._resolveCache[id];
    if (! byId) {
      byId = this._resolveCache[id] = Object.create(null);
    }
    return byId[parentPath] = resolved;
  }

  resolve(id, parentPath) {
    const batch = this._resourceSlot.packageSourceBatch;

    parentPath = parentPath || files.pathJoin(
      batch.sourceRoot,
      this.getPathInPackage()
    );

    let resolved = this._resolveCacheLookup(id, parentPath);
    if (resolved) {
      return resolved;
    }

    const parentStat = files.statOrNull(parentPath);
    if (! parentStat ||
        ! parentStat.isFile()) {
      throw new Error("Not a file: " + parentPath);
    }

    const resolver = batch.getResolver();

    console.log(4, 'resolver.resolve(' + id + ', ' + parentPath + ')');
    console.log(4, resolver.resolve(id, parentPath));

    return this._resolveCacheStore(
      id, parentPath, resolver.resolve(id, parentPath).id);
  }

  require(id, parentPath) {
    return require(this.resolve(id, parentPath));
  }

  getArch() {
    return this._resourceSlot.packageSourceBatch.processor.arch;
  }

  getSourceHash() {
    return this._resourceSlot.inputResource.hash;
  }

  /**
   * @summary Returns the extension that matched the compiler plugin.
   * The longest prefix is preferred.
   * @returns {String}
   */
  getExtension() {
    return this._resourceSlot.inputResource.extension;
  }

  /**
   * @summary Returns a list of symbols declared as exports in this target. The
   * result of `api.export('symbol')` calls in target's control file such as
   * package.js.
   * @memberof InputFile
   * @returns {String[]}
   */
  getDeclaredExports() {
    var self = this;
    return self._resourceSlot.packageSourceBatch.unibuild.declaredExports;
  }

  /**
   * @summary Returns a relative path that can be used to form error messages or
   * other display properties. Can be used as an input to a source map.
   * @memberof InputFile
   * @returns {String}
   */
  getDisplayPath() {
    var self = this;
    return self._resourceSlot.packageSourceBatch.unibuild.pkg._getServePath(self.getPathInPackage());
  }

  /**
   * @summary Web targets only. Add a stylesheet to the document. Not available
   * for linter build plugins.
   * @param {Object} options
   * @param {String} options.path The requested path for the added CSS, may not
   * be satisfied if there are path conflicts.
   * @param {String} options.data The content of the stylesheet that should be
   * added.
   * @param {String|Object} options.sourceMap A stringified JSON
   * sourcemap, in case the stylesheet was generated from a different
   * file.
   * @memberOf InputFile
   * @instance
   */
  addStylesheet(options) {
    var self = this;
    if (options.sourceMap && typeof options.sourceMap === 'string') {
      // XXX remove an anti-XSSI header? ")]}'\n"
      options.sourceMap = JSON.parse(options.sourceMap);
    }
    self._resourceSlot.addStylesheet(options);
  }

  /**
   * @summary Add JavaScript code. The code added will only see the
   * namespaces imported by this package as runtime dependencies using
   * ['api.use'](#PackageAPI-use). If the file being compiled was added
   * with the bare flag, the resulting JavaScript won't be wrapped in a
   * closure.
   * @param {Object} options
   * @param {String} options.path The path at which the JavaScript file
   * should be inserted, may not be honored in case of path conflicts.
   * @param {String} options.data The code to be added.
   * @param {String|Object} options.sourceMap A stringified JSON
   * sourcemap, in case the JavaScript file was generated from a
   * different file.
   * @memberOf InputFile
   * @instance
   */
  addJavaScript(options) {
    var self = this;
    if (options.sourceMap && typeof options.sourceMap === 'string') {
      // XXX remove an anti-XSSI header? ")]}'\n"
      options.sourceMap = JSON.parse(options.sourceMap);
    }
    self._resourceSlot.addJavaScript(options);
  }

  /**
   * @summary Add a file to serve as-is to the browser or to include on
   * the browser, depending on the target. On the web, it will be served
   * at the exact path requested. For server targets, it can be retrieved
   * using `Assets.getText` or `Assets.getBinary`.
   * @param {Object} options
   * @param {String} options.path The path at which to serve the asset.
   * @param {Buffer|String} options.data The data that should be placed in the
   * file.
   * @param {String} [options.hash] Optionally, supply a hash for the output
   * file.
   * @memberOf InputFile
   * @instance
   */
  addAsset(options) {
    var self = this;
    self._resourceSlot.addAsset(options);
  }

  /**
   * @summary Works in web targets only. Add markup to the `head` or `body`
   * section of the document.
   * @param  {Object} options
   * @param {String} options.section Which section of the document should
   * be appended to. Can only be "head" or "body".
   * @param {String} options.data The content to append.
   * @memberOf InputFile
   * @instance
   */
  addHtml(options) {
    var self = this;
    self._resourceSlot.addHtml(options);
  }

  _reportError(message, info) {
    if (this.getFileOptions().lazy === true) {
      // Files with fileOptions.lazy === true were not explicitly added to
      // the source batch via api.addFiles or api.mainModule, so any
      // compilation errors should not be fatal until the files are
      // actually imported by the ImportScanner. Attempting compilation is
      // still important for lazy files that might end up being imported
      // later, which is why we defang the error here, instead of avoiding
      // compilation preemptively. Note also that exceptions thrown by the
      // compiler will still cause build errors.
      this._resourceSlot.addError(message, info);
    } else {
      super._reportError(message, info);
    }
  }
}

export { InputFile };
