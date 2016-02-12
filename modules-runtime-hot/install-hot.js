makeInstaller = function (options) {
  options = options || {};

  // These file extensions will be appended to required module identifiers
  // if they do not exactly match an installed module.
  var extensions = options.extensions || [".js", ".json"];

  // This constructor will be used to instantiate the module objects
  // passed to module factory functions (i.e. the third argument after
  // require and exports).
  var Module = options.Module || function Module(id, parent) {
    this.id = id;
    this.parent = parent;
  };

  // If defined, the options.onInstall function will be called any time
  // new modules are installed.
  var onInstall = options.onInstall;

  // If defined, the options.fallback function will be called when no
  // installed module is found for a required module identifier. Often
  // options.fallback will be implemented in terms of the native Node
  // require function, which has the ability to load binary modules.
  var fallback = options.fallback;

  // Whenever a new require function is created in the makeRequire
  // function below, any methods contained by options.requireMethods will
  // be bound and attached as methods to that function object. This option
  // is intended to support user-defined require.* extensions like
  // require.ensure and require.promise.
  var requireMethods = options.requireMethods;

  // Sentinel returned by fileEvaluate when module resolution fails.
  var MISSING = {};

  // Nothing special about MISSING.hasOwnProperty, except that it's fewer
  // characters than Object.prototype.hasOwnProperty after minification.
  var hasOwn = MISSING.hasOwnProperty;

  // The file object representing the root directory of the installed
  // module tree.
  var root = new File({});

  // Merges the given tree of directories and module factory functions
  // into the tree of installed modules and returns a require function
  // that behaves as if called from a module in the root directory.
  function install(tree) {
    if (isObject(tree)) {
      fileMergeContents(root, tree);
      if (isFunction(onInstall)) {
        onInstall(root.r);
      }
    }
    return root.r;
  }

  // hot
  install._expose = function() {
    return {
      root: root
    }
  }

  function getOwn(obj, key) {
    return hasOwn.call(obj, key) && obj[key];
  }

  function isObject(value) {
    return value && typeof value === "object";
  }

  function isFunction(value) {
    return typeof value === "function";
  }

  function isString(value) {
    return typeof value === "string";
  }

  function makeRequire(file) {
    function require(id) {
      var result = fileEvaluate(fileResolve(file, id));
      if (result === MISSING) {
        var error = new Error("Cannot find module '" + id + "'");
        if (isFunction(fallback)) {
          result = fallback(
            id, // The missing module identifier.
            file.m.id, // The path of the enclosing directory.
            error // The error we would have thrown.
          );
        } else throw error;
      }
      return result;
    }

    // A function that immediately returns true iff all the transitive
    // dependencies of the module identified by id have been installed.
    // This function can be used with options.onInstall to implement
    // asynchronous module loading APIs like require.ensure.
    require.ready = function (id) {
      return fileReady(fileResolve(file, id));
    };

    if (requireMethods) {
      Object.keys(requireMethods).forEach(function (name) {
        if (isFunction(requireMethods[name])) {
          require[name] = requireMethods[name].bind(require);
        }
      });
    }

    return require;
  }

  // File objects represent either directories or modules that have been
  // installed. When a `File` respresents a directory, its `.c` (contents)
  // property is an object containing the names of the files (or
  // directories) that it contains. When a `File` represents a module, its
  // `.c` property is a function that can be invoked with the appropriate
  // `(require, exports, module)` arguments to evaluate the module. If the
  // `.c` property is a string, that string will be resolved as a module
  // identifier, and the exports of the resulting module will provide the
  // exports of the original file. The `.p` (parent) property of a File is
  // either a directory `File` or `null`. Note that a child may claim
  // another `File` as its parent even if the parent does not have an
  // entry for that child in its `.c` object.  This is important for
  // implementing anonymous files, and preventing child modules from using
  // `../relative/identifier` syntax to examine unrelated modules.
  function File(contents, /*optional:*/ parent, name) {
    var file = this;

    // Link to the parent file.
    file.p = parent = parent || null;

    // The module object for this File, which will eventually boast an
    // .exports property when/if the file is evaluated.
    file.m = new Module(
      // If this file was created with `name`, join it with `parent.m.id`
      // to generate a module identifier.
      name ? (parent && parent.m.id || "") + "/" + name : null,
      parent && parent.m
    );

    // Queue for tracking required modules with unmet dependencies,
    // inherited from the `parent`.
    file.q = parent && parent.q;

    // Each directory has its own bound version of the `require` function
    // that can resolve relative identifiers. Non-directory Files inherit
    // the require function of their parent directories, so we don't have
    // to create a new require function every time we evaluate a module.
    file.r = isObject(contents)
      ? makeRequire(file)
      : parent && parent.r;

    // Set the initial value of `file.c` (the "contents" of the File).
    fileMergeContents(file, contents);

    // When the file is a directory, `file.rc` is an object mapping module
    // identifiers to boolean ready statuses ("rc" is short for "ready
    // cache"). This information can be shared by all files in the
    // directory, because module resolution always has the same results
    // for all files in a given directory.
    file.rc = fileIsDirectory(file) && {};
  }

  // A file is ready if all of its dependencies are installed and ready.
  function fileReady(file) {
    var result = !! file;
    var contents = file && file.c;

    if (contents && ! file.inReady) {
      file.inReady = true;

      if (isString(contents)) {
        // This file is aliased (or symbolically linked) to the file
        // obtained by resolving the contents string as a module
        // identifier, so regard it as ready iff the resolved file exists
        // and is ready.
        result = fileReady(fileResolve(file, contents));

      } else if (isFunction(contents)) {
        var deps = contents.d;
        if (deps) {
          var parentReadyCache = file.p.rc;

          result = deps.every(function (dep) {
            // By storing the results of these lookups in `parentReadyCache`,
            // we benefit when any other file in the same directory resolves
            // the same identifier.
            return parentReadyCache[dep] =
              parentReadyCache[dep] ||
              fileReady(fileResolve(file.p, dep));
          });
        }
      }

      file.inReady = false;
    }

    return result;
  }

  function fileEvaluate(file) {
    var contents = file && file.c;
    if (isFunction(contents)) {
      var module = file.m;
      if (! hasOwn.call(module, "exports")) {
        contents(file.r, module.exports = {}, module);
      }
      return module.exports;
    }
    return MISSING;
  }

  function fileIsDirectory(file) {
    return file && isObject(file.c);
  }

  function fileMergeContents(file, contents) {
    // If contents is an array of strings and functions, return the last
    // function with a `.d` property containing all the strings.
    if (Array.isArray(contents)) {
      var deps = [];

      contents.forEach(function (item) {
        if (isString(item)) {
          deps.push(item);
        } else if (isFunction(item)) {
          contents = item;
        }
      });

      if (isFunction(contents)) {
        contents.d = deps;
      } else {
        // If the array did not contain a function, merge nothing.
        contents = null;
      }

    } else if (isFunction(contents)) {
      // If contents is already a function, make sure it has `.d`.
      contents.d = contents.d || [];

    } else if (! isString(contents) &&
               ! isObject(contents)) {
      // If contents is neither an array nor a function nor a string nor
      // an object, just give up and merge nothing.
      contents = null;
    }

    if (contents) {
      var fileContents = file.c = file.c || (
        isObject(contents) ? {} : contents
      );

      if (isObject(contents) && fileIsDirectory(file)) {
        Object.keys(contents).forEach(function (key) {
          var child = getOwn(fileContents, key);
          if (child) {
            fileMergeContents(child, contents[key]);
          } else {
            fileContents[key] = new File(contents[key], file, key);
          }
        });
      }
    }
  }

  function fileAppendIdPart(file, part, isLastPart) {
    // Always append relative to a directory.
    while (file && ! fileIsDirectory(file)) {
      file = file.p;
    }

    if (! file || ! part || part === ".") {
      return file;
    }

    if (part === "..") {
      return file.p;
    }

    var exactChild = getOwn(file.c, part);

    // Only consider multiple file extensions if this part is the last
    // part of a module identifier and not equal to `.` or `..`, and there
    // was no exact match or the exact match was a directory.
    if (isLastPart && (! exactChild || fileIsDirectory(exactChild))) {
      for (var e = 0; e < extensions.length; ++e) {
        var child = getOwn(file.c, part + extensions[e]);
        if (child) {
          return child;
        }
      }
    }

    return exactChild;
  }

  function fileAppendId(file, id) {
    var parts = id.split("/");
    // Use `Array.prototype.every` to terminate iteration early if
    // `fileAppendIdPart` returns a falsy value.
    parts.every(function (part, i) {
      return file = fileAppendIdPart(file, part, i === parts.length - 1);
    });
    return file;
  }

  function fileResolve(file, id, seenDirFiles) {
    file =
      // Absolute module identifiers (i.e. those that begin with a `/`
      // character) are interpreted relative to the root directory, which
      // is a slight deviation from Node, which has access to the entire
      // file system.
      id.charAt(0) === "/" ? fileAppendId(root, id) :
      // Relative module identifiers are interpreted relative to the
      // current file, naturally.
      id.charAt(0) === "." ? fileAppendId(file, id) :
      // Top-level module identifiers are interpreted as referring to
      // packages in `node_modules` directories.
      nodeModulesLookup(file, id);

    // If the identifier resolves to a directory, we use the same logic as
    // Node to find an `index.js` or `package.json` file to evaluate.
    while (fileIsDirectory(file)) {
      seenDirFiles = seenDirFiles || [];

      // If the "main" field of a `package.json` file resolves to a
      // directory we've already considered, then we should not attempt to
      // read the same `package.json` file again. Using an array as a set
      // is acceptable here because the number of directories to consider
      // is rarely greater than 1 or 2. Also, using indexOf allows us to
      // store File objects instead of strings.
      if (seenDirFiles.indexOf(file) < 0) {
        seenDirFiles.push(file);

        // If `package.json` does not exist, `fileEvaluate` will return
        // the `MISSING` object, which has no `.main` property.
        var pkg = fileEvaluate(fileAppendIdPart(file, "package.json"));
        if (pkg && isString(pkg.main)) {
          // The "main" field of package.json does not have to begin with
          // ./ to be considered relative, so first we try simply
          // appending it to the directory path before falling back to a
          // full fileResolve, which might return a package from a
          // node_modules directory.
          file = fileAppendId(file, pkg.main) ||
            fileResolve(file, pkg.main, seenDirFiles);

          if (file) {
            // The fileAppendId call above may have returned a directory,
            // so continue the loop to make sure we resolve it to a
            // non-directory file.
            continue;
          }
        }
      }

      // If we didn't find a `package.json` file, or it didn't have a
      // resolvable `.main` property, the only possibility left to
      // consider is that this directory contains an `index.js` module.
      // This assignment almost always terminates the while loop, because
      // there's very little chance `fileIsDirectory(file)` will be true
      // for the result of `fileAppendIdPart(file, "index.js")`. However,
      // in principle it is remotely possible that a file called
      // `index.js` could be a directory instead of a file.
      file = fileAppendIdPart(file, "index.js");
    }

    if (file && isString(file.c)) {
      file = fileResolve(file, file.c, seenDirFiles);
    }

    return file;
  };

  function nodeModulesLookup(file, id) {
    return fileIsDirectory(file) &&
      fileAppendId(file, "node_modules/" + id) ||
      (file.p && nodeModulesLookup(file.p, id));
  }

  return install;
};

if (typeof exports === "object") {
  exports.makeInstaller = makeInstaller;
}
