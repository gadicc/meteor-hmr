// This is the base class of the object presented to the user's plugin code.
export class InputFile {
  /**
   * @summary Returns the full contents of the file as a buffer.
   * @memberof InputFile
   * @returns {Buffer}
   */
  getContentsAsBuffer() {
    throw new Error("Not Implemented");
  }

  /**
   * @summary Returns the name of the package or `null` if the file is not in a
   * package.
   * @memberof InputFile
   * @returns {String}
   */
  getPackageName() {
    throw new Error("Not Implemented");
  }

  /**
   * @summary Returns the relative path of file to the package or app root
   * directory. The returned path always uses forward slashes.
   * @memberof InputFile
   * @returns {String}
   */
  getPathInPackage() {
    throw new Error("Not Implemented");
  }

  /**
   * @summary Returns a hash string for the file that can be used to implement
   * caching.
   * @memberof InputFile
   * @returns {String}
   */
  getSourceHash() {
    throw new Error("Not Implemented");
  }

  /**
   * @summary Returns the architecture that is targeted while processing this
   * file.
   * @memberof InputFile
   * @returns {String}
   */
  getArch() {
    throw new Error("Not Implemented");
  }

  /**
   * @summary Returns the full contents of the file as a string.
   * @memberof InputFile
   * @returns {String}
   */
  getContentsAsString() {
    var self = this;
    return self.getContentsAsBuffer().toString('utf8');
  }

  /**
   * @summary Returns the filename of the file.
   * @memberof InputFile
   * @returns {String}
   */
  getBasename() {
    var self = this;
    return files.pathBasename(self.getPathInPackage());
  }

  /**
   * @summary Returns the directory path relative to the package or app root.
   * The returned path always uses forward slashes.
   * @memberof InputFile
   * @returns {String}
   */
  getDirname() {
    var self = this;
    return files.pathDirname(self.getPathInPackage());
  }

  /**
   * @summary Returns an object of file options such as those passed as the
   *          third argument to api.addFiles.
   * @memberof InputFile
   * @returns {Object}
   */
  getFileOptions() {
    throw new Error("Not Implemented");
  }

  /**
   * @summary Call this method to raise a compilation or linting error for the
   * file.
   * @param {Object} options
   * @param {String} options.message The error message to display.
   * @param {String} [options.sourcePath] The path to display in the error message.
   * @param {Integer} options.line The line number to display in the error message.
   * @param {String} options.func The function name to display in the error message.
   * @memberof InputFile
   */
  error(options) {
    var self = this;
    var path = self.getPathInPackage();
    var packageName = self.getPackageName();
    if (packageName) {
      path = "packages/" + packageName + "/" + path;
    }

    self._reportError(options.message || ("error building " + path), {
      file: options.sourcePath || path,
      line: options.line ? options.line : undefined,
      column: options.column ? options.column : undefined,
      func: options.func ? options.func : undefined
    });
  }

  // Default implementation. May be overridden by subclasses.
  _reportError(message, info) {
    buildmessage.error(message, info);
  }
}
