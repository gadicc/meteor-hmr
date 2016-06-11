// meteor/tools/static-assets/server/mini-files.js
// and stuff we need from meteor/tools/fs/files.js at the bottom

var _ = require("underscore");
var os = require("os");
var path = require("path");

// All of these functions are attached to files.js for the tool;
// they live here because we need them in boot.js as well to avoid duplicating
// a lot of the code.
//
// Note that this file does NOT contain any of the "perform I/O maybe
// synchronously" functions from files.js; this is intentional, because we want
// to make it very hard to accidentally use fs.*Sync functions in the app server
// after bootup (since they block all concurrency!)
var files = module.exports;

var toPosixPath = function (p, partialPath) {
  // Sometimes, you can have a path like \Users\IEUser on windows, and this
  // actually means you want C:\Users\IEUser
  if (p[0] === "\\" && (! partialPath)) {
    p = process.env.SystemDrive + p;
  }

  p = p.replace(/\\/g, '/');
  if (p[1] === ':' && ! partialPath) {
    // transform "C:/bla/bla" to "/c/bla/bla"
    p = '/' + p[0] + p.slice(2);
  }

  return p;
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


var convertToOSPath = function (standardPath, partialPath) {
  if (process.platform === "win32") {
    return toDosPath(standardPath, partialPath);
  }

  return standardPath;
};

var convertToStandardPath = function (osPath, partialPath) {
  if (process.platform === "win32") {
    return toPosixPath(osPath, partialPath);
  }

  return osPath;
}

var convertToOSLineEndings = function (fileContents) {
  return fileContents.replace(/\n/g, os.EOL);
};

var convertToStandardLineEndings = function (fileContents) {
  // Convert all kinds of end-of-line chars to linuxy "\n".
  return fileContents.replace(new RegExp("\r\n", "g"), "\n")
                     .replace(new RegExp("\r", "g"), "\n");
};


// wrappings for path functions that always run as they were on unix (using
// forward slashes)
var wrapPathFunction = function (name, partialPaths) {
  var f = path[name];
  return function (/* args */) {
    if (process.platform === 'win32') {
      var args = _.toArray(arguments);
      args = _.map(args, function (p, i) {
        // if partialPaths is turned on (for path.join mostly)
        // forget about conversion of absolute paths for Windows
        return toDosPath(p, partialPaths);
      });
      return toPosixPath(f.apply(path, args), partialPaths);
    } else {
      return f.apply(path, arguments);
    }
  };
};

files.pathJoin = wrapPathFunction("join", true);
files.pathNormalize = wrapPathFunction("normalize");
files.pathRelative = wrapPathFunction("relative");
files.pathResolve = wrapPathFunction("resolve");
files.pathDirname = wrapPathFunction("dirname");
files.pathBasename = wrapPathFunction("basename");
files.pathExtname = wrapPathFunction("extname");
files.pathSep = '/';
files.pathDelimiter = ':';
files.pathOsDelimiter = path.delimiter;
files.pathIsAbsolute = function (path) {
  return toPosixPath(path).charAt(0) === '/';
};

files.convertToStandardPath = convertToStandardPath;
files.convertToOSPath = convertToOSPath;
files.convertToWindowsPath = toDosPath;
files.convertToPosixPath = toPosixPath;

files.convertToStandardLineEndings = convertToStandardLineEndings;
files.convertToOSLineEndings = convertToOSLineEndings;


// and stuff we need from meteor/tools/fs/files.js

import fs from 'fs';

// gadicc/meteor-hmr
// run sync versions of all fs methods
const Fiber = {
  current: null
};

files.fsFixPath = {};
/**
 * Wrap a function from node's fs module to use the right slashes for this OS
 * and run in a fiber, then assign it to the "files" namespace. Each call
 * creates a files.func that runs asynchronously with Fibers (yielding and
 * until the call is done), unless run outside a Fiber or in noYieldsAllowed, in
 * which case it uses fs.funcSync.
 *
 * Also creates a simpler version on files.fsFixPath.* that just fixes the path
 * and fiberizes the Sync version if possible.
 *
 * @param  {String} fsFuncName         The name of the node fs function to wrap
 * @param  {Number[]} pathArgIndices Indices of arguments that have paths, these
 * arguments will be converted to the correct OS slashes
 * @param  {Object} options        Some options for lesser-used cases
 * @param {Boolean} options.noErr If true, the callback of the wrapped function
 * doesn't have a first "error" argument, for example in fs.exists.
 * @param {Function} options.modifyReturnValue Pass in a function to modify the
 * return value
 */
function wrapFsFunc(fsFuncName, pathArgIndices, options) {
  options = options || {};

  const fsFunc = fs[fsFuncName];
  const fsFuncSync = fs[fsFuncName + "Sync"];

  function makeWrapper ({alwaysSync, sync}) {
    function wrapper(...args) {
      for (let j = pathArgIndices.length - 1; j >= 0; --j) {
        const i = pathArgIndices[j];
        args[i] = files.convertToOSPath(args[i]);
      }

      const canYield = Fiber.current && Fiber.yield && ! Fiber.yield.disallowed;
      const shouldBeSync = alwaysSync || sync;
      // There's some overhead in awaiting a Promise of an async call,
      // vs just doing the sync call, which for a call like "stat"
      // takes longer than the call itself.  Different parts of the tool
      // may perform 1,000s or 10,000s of stats each under certain
      // conditions, so we get a nice performance boost from making
      // these calls sync.
      const isQuickie = (fsFuncName === 'stat' ||
                         fsFuncName === 'rename');

      if (canYield && shouldBeSync && !isQuickie) {
        const promise = new Promise((resolve, reject) => {
          args.push((err, value) => {
            if (options.noErr) {
              resolve(err);
            } else if (err) {
              reject(err);
            } else {
              resolve(value);
            }
          });

          fsFunc.apply(fs, args);
        });

        const result = promise.await();

        return options.modifyReturnValue
          ? options.modifyReturnValue(result)
          : result;

      } else if (shouldBeSync) {
        // Should be sync but can't yield: we are not in a Fiber.
        // Run the sync version of the fs.* method.
        const result = fsFuncSync.apply(fs, args);
        return options.modifyReturnValue ?
               options.modifyReturnValue(result) : result;

      } else if (! sync) {
        // wrapping a plain async version
        let cb = args[args.length - 1];
        if (typeof cb === "function") {
          args.pop();
        } else {
          cb = null;
        }

        new Promise((resolve, reject) => {
          args.push((err, res) => {
            err ? reject(err) : resolve(res);
          });
          fsFunc.apply(fs, args);
        }).then(res => {
          if (options.modifyReturnValue) {
            res = options.modifyReturnValue(res);
          }
          cb && cb(null, res);
        }, cb);

        return;
      }

      throw new Error('unexpected');
    }

    wrapper.displayName = fsFuncName;
    return wrapper;
  }

  files[fsFuncName] = Profile('files.' + fsFuncName, makeWrapper({ alwaysSync: true }));

  files.fsFixPath[fsFuncName] =
    Profile('wrapped.fs.' + fsFuncName, makeWrapper({ sync: false }));
  files.fsFixPath[fsFuncName + 'Sync'] =
    Profile('wrapped.fs.' + fsFuncName + 'Sync', makeWrapper({ sync: true }));
}

// no real profiling (gadicc/meteor-hmr)
function Profile(name, func) { return func; }

wrapFsFunc("stat", [0]);

// Like statSync, but null if file not found
files.statOrNull = function (path) {
  try {
    return files.stat(path);
  } catch (e) {
    if (e.code == "ENOENT") {
      return null;
    }
    throw e;
  }
};
