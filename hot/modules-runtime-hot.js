//////////////////////////////////////////////////////////////////////////
//                                                                      //
// This is a generated file. You can view the original                  //
// source in your browser if your browser supports source maps.         //
// Source maps are supported by all recent versions of Chrome, Safari,  //
// and Firefox, and by Internet Explorer 11.                            //
//                                                                      //
//////////////////////////////////////////////////////////////////////////


(function () {

/* Imports */
var process = Package.meteor.process;
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;

/* Package-scope variables */
var makeInstaller, meteorInstall;

////////////////////////////////////////////////////////////////////////////////
//                                                                            //
// packages/modules-runtime/install-hot.js                                    //
// This file is in bare mode and is not in its own closure.                   //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
                                                                              //
makeInstaller = function (options) {                                          // 1
  options = options || {};                                                    // 2
                                                                              // 3
  // These file extensions will be appended to required module identifiers    // 4
  // if they do not exactly match an installed module.                        // 5
  var extensions = options.extensions || [".js", ".json"];                    // 6
                                                                              // 7
  // This constructor will be used to instantiate the module objects          // 8
  // passed to module factory functions (i.e. the third argument after        // 9
  // require and exports).                                                    // 10
  var Module = options.Module || function Module(id, parent) {                // 11
    this.id = id;                                                             // 12
    this.parent = parent;                                                     // 13
  };                                                                          // 14
                                                                              // 15
  // If defined, the options.onInstall function will be called any time       // 16
  // new modules are installed.                                               // 17
  var onInstall = options.onInstall;                                          // 18
                                                                              // 19
  // If defined, the options.fallback function will be called when no         // 20
  // installed module is found for a required module identifier. Often        // 21
  // options.fallback will be implemented in terms of the native Node         // 22
  // require function, which has the ability to load binary modules.          // 23
  var fallback = options.fallback;                                            // 24
                                                                              // 25
  // Whenever a new require function is created in the makeRequire            // 26
  // function below, any methods contained by options.requireMethods will     // 27
  // be bound and attached as methods to that function object. This option    // 28
  // is intended to support user-defined require.* extensions like            // 29
  // require.ensure and require.promise.                                      // 30
  var requireMethods = options.requireMethods;                                // 31
                                                                              // 32
  // Sentinel returned by fileEvaluate when module resolution fails.          // 33
  var MISSING = {};                                                           // 34
                                                                              // 35
  // Nothing special about MISSING.hasOwnProperty, except that it's fewer     // 36
  // characters than Object.prototype.hasOwnProperty after minification.      // 37
  var hasOwn = MISSING.hasOwnProperty;                                        // 38
                                                                              // 39
  // The file object representing the root directory of the installed         // 40
  // module tree.                                                             // 41
  var root = new File({});                                                    // 42
                                                                              // 43
  // Merges the given tree of directories and module factory functions        // 44
  // into the tree of installed modules and returns a require function        // 45
  // that behaves as if called from a module in the root directory.           // 46
  function install(tree) {                                                    // 47
    if (isObject(tree)) {                                                     // 48
      fileMergeContents(root, tree);                                          // 49
      if (isFunction(onInstall)) {                                            // 50
        onInstall(root.r);                                                    // 51
      }                                                                       // 52
    }                                                                         // 53
    return root.r;                                                            // 54
  }                                                                           // 55
                                                                              // 56
  // hot                                                                      // 57
  install._expose = function() {                                              // 58
    return {                                                                  // 59
      root: root                                                              // 60
    }                                                                         // 61
  }                                                                           // 62
                                                                              // 63
  function getOwn(obj, key) {                                                 // 64
    return hasOwn.call(obj, key) && obj[key];                                 // 65
  }                                                                           // 66
                                                                              // 67
  function isObject(value) {                                                  // 68
    return value && typeof value === "object";                                // 69
  }                                                                           // 70
                                                                              // 71
  function isFunction(value) {                                                // 72
    return typeof value === "function";                                       // 73
  }                                                                           // 74
                                                                              // 75
  function isString(value) {                                                  // 76
    return typeof value === "string";                                         // 77
  }                                                                           // 78
                                                                              // 79
  function makeRequire(file) {                                                // 80
    function require(id) {                                                    // 81
      var result = fileEvaluate(fileResolve(file, id));                       // 82
      if (result === MISSING) {                                               // 83
        var error = new Error("Cannot find module '" + id + "'");             // 84
        if (isFunction(fallback)) {                                           // 85
          result = fallback(                                                  // 86
            id, // The missing module identifier.                             // 87
            file.m.id, // The path of the enclosing directory.                // 88
            error // The error we would have thrown.                          // 89
          );                                                                  // 90
        } else throw error;                                                   // 91
      }                                                                       // 92
      return result;                                                          // 93
    }                                                                         // 94
                                                                              // 95
    // A function that immediately returns true iff all the transitive        // 96
    // dependencies of the module identified by id have been installed.       // 97
    // This function can be used with options.onInstall to implement          // 98
    // asynchronous module loading APIs like require.ensure.                  // 99
    require.ready = function (id) {                                           // 100
      return fileReady(fileResolve(file, id));                                // 101
    };                                                                        // 102
                                                                              // 103
    if (requireMethods) {                                                     // 104
      Object.keys(requireMethods).forEach(function (name) {                   // 105
        if (isFunction(requireMethods[name])) {                               // 106
          require[name] = requireMethods[name].bind(require);                 // 107
        }                                                                     // 108
      });                                                                     // 109
    }                                                                         // 110
                                                                              // 111
    return require;                                                           // 112
  }                                                                           // 113
                                                                              // 114
  // File objects represent either directories or modules that have been      // 115
  // installed. When a `File` respresents a directory, its `.c` (contents)    // 116
  // property is an object containing the names of the files (or              // 117
  // directories) that it contains. When a `File` represents a module, its    // 118
  // `.c` property is a function that can be invoked with the appropriate     // 119
  // `(require, exports, module)` arguments to evaluate the module. If the    // 120
  // `.c` property is a string, that string will be resolved as a module      // 121
  // identifier, and the exports of the resulting module will provide the     // 122
  // exports of the original file. The `.p` (parent) property of a File is    // 123
  // either a directory `File` or `null`. Note that a child may claim         // 124
  // another `File` as its parent even if the parent does not have an         // 125
  // entry for that child in its `.c` object.  This is important for          // 126
  // implementing anonymous files, and preventing child modules from using    // 127
  // `../relative/identifier` syntax to examine unrelated modules.            // 128
  function File(contents, /*optional:*/ parent, name) {                       // 129
    var file = this;                                                          // 130
                                                                              // 131
    // Link to the parent file.                                               // 132
    file.p = parent = parent || null;                                         // 133
                                                                              // 134
    // The module object for this File, which will eventually boast an        // 135
    // .exports property when/if the file is evaluated.                       // 136
    file.m = new Module(                                                      // 137
      // If this file was created with `name`, join it with `parent.m.id`     // 138
      // to generate a module identifier.                                     // 139
      name ? (parent && parent.m.id || "") + "/" + name : null,               // 140
      parent && parent.m                                                      // 141
    );                                                                        // 142
                                                                              // 143
    // Queue for tracking required modules with unmet dependencies,           // 144
    // inherited from the `parent`.                                           // 145
    file.q = parent && parent.q;                                              // 146
                                                                              // 147
    // Each directory has its own bound version of the `require` function     // 148
    // that can resolve relative identifiers. Non-directory Files inherit     // 149
    // the require function of their parent directories, so we don't have     // 150
    // to create a new require function every time we evaluate a module.      // 151
    file.r = isObject(contents)                                               // 152
      ? makeRequire(file)                                                     // 153
      : parent && parent.r;                                                   // 154
                                                                              // 155
    // Set the initial value of `file.c` (the "contents" of the File).        // 156
    fileMergeContents(file, contents);                                        // 157
                                                                              // 158
    // When the file is a directory, `file.rc` is an object mapping module    // 159
    // identifiers to boolean ready statuses ("rc" is short for "ready        // 160
    // cache"). This information can be shared by all files in the            // 161
    // directory, because module resolution always has the same results       // 162
    // for all files in a given directory.                                    // 163
    file.rc = fileIsDirectory(file) && {};                                    // 164
  }                                                                           // 165
                                                                              // 166
  // A file is ready if all of its dependencies are installed and ready.      // 167
  function fileReady(file) {                                                  // 168
    var result = !! file;                                                     // 169
    var contents = file && file.c;                                            // 170
                                                                              // 171
    if (contents && ! file.inReady) {                                         // 172
      file.inReady = true;                                                    // 173
                                                                              // 174
      if (isString(contents)) {                                               // 175
        // This file is aliased (or symbolically linked) to the file          // 176
        // obtained by resolving the contents string as a module              // 177
        // identifier, so regard it as ready iff the resolved file exists     // 178
        // and is ready.                                                      // 179
        result = fileReady(fileResolve(file, contents));                      // 180
                                                                              // 181
      } else if (isFunction(contents)) {                                      // 182
        var deps = contents.d;                                                // 183
        if (deps) {                                                           // 184
          var parentReadyCache = file.p.rc;                                   // 185
                                                                              // 186
          result = deps.every(function (dep) {                                // 187
            // By storing the results of these lookups in `parentReadyCache`,
            // we benefit when any other file in the same directory resolves  // 189
            // the same identifier.                                           // 190
            return parentReadyCache[dep] =                                    // 191
              parentReadyCache[dep] ||                                        // 192
              fileReady(fileResolve(file.p, dep));                            // 193
          });                                                                 // 194
        }                                                                     // 195
      }                                                                       // 196
                                                                              // 197
      file.inReady = false;                                                   // 198
    }                                                                         // 199
                                                                              // 200
    return result;                                                            // 201
  }                                                                           // 202
                                                                              // 203
  function fileEvaluate(file) {                                               // 204
    var contents = file && file.c;                                            // 205
    if (isFunction(contents)) {                                               // 206
      var module = file.m;                                                    // 207
      if (! hasOwn.call(module, "exports")) {                                 // 208
        contents(file.r, module.exports = {}, module);                        // 209
      }                                                                       // 210
      return module.exports;                                                  // 211
    }                                                                         // 212
    return MISSING;                                                           // 213
  }                                                                           // 214
                                                                              // 215
  function fileIsDirectory(file) {                                            // 216
    return file && isObject(file.c);                                          // 217
  }                                                                           // 218
                                                                              // 219
  function fileMergeContents(file, contents) {                                // 220
    // If contents is an array of strings and functions, return the last      // 221
    // function with a `.d` property containing all the strings.              // 222
    if (Array.isArray(contents)) {                                            // 223
      var deps = [];                                                          // 224
                                                                              // 225
      contents.forEach(function (item) {                                      // 226
        if (isString(item)) {                                                 // 227
          deps.push(item);                                                    // 228
        } else if (isFunction(item)) {                                        // 229
          contents = item;                                                    // 230
        }                                                                     // 231
      });                                                                     // 232
                                                                              // 233
      if (isFunction(contents)) {                                             // 234
        contents.d = deps;                                                    // 235
      } else {                                                                // 236
        // If the array did not contain a function, merge nothing.            // 237
        contents = null;                                                      // 238
      }                                                                       // 239
                                                                              // 240
    } else if (isFunction(contents)) {                                        // 241
      // If contents is already a function, make sure it has `.d`.            // 242
      contents.d = contents.d || [];                                          // 243
                                                                              // 244
    } else if (! isString(contents) &&                                        // 245
               ! isObject(contents)) {                                        // 246
      // If contents is neither an array nor a function nor a string nor      // 247
      // an object, just give up and merge nothing.                           // 248
      contents = null;                                                        // 249
    }                                                                         // 250
                                                                              // 251
    if (contents) {                                                           // 252
      var fileContents = file.c = file.c || (                                 // 253
        isObject(contents) ? {} : contents                                    // 254
      );                                                                      // 255
                                                                              // 256
      if (isObject(contents) && fileIsDirectory(file)) {                      // 257
        Object.keys(contents).forEach(function (key) {                        // 258
          var child = getOwn(fileContents, key);                              // 259
          if (child) {                                                        // 260
            fileMergeContents(child, contents[key]);                          // 261
          } else {                                                            // 262
            fileContents[key] = new File(contents[key], file, key);           // 263
          }                                                                   // 264
        });                                                                   // 265
      }                                                                       // 266
    }                                                                         // 267
  }                                                                           // 268
                                                                              // 269
  function fileAppendIdPart(file, part, isLastPart) {                         // 270
    // Always append relative to a directory.                                 // 271
    while (file && ! fileIsDirectory(file)) {                                 // 272
      file = file.p;                                                          // 273
    }                                                                         // 274
                                                                              // 275
    if (! file || ! part || part === ".") {                                   // 276
      return file;                                                            // 277
    }                                                                         // 278
                                                                              // 279
    if (part === "..") {                                                      // 280
      return file.p;                                                          // 281
    }                                                                         // 282
                                                                              // 283
    var exactChild = getOwn(file.c, part);                                    // 284
                                                                              // 285
    // Only consider multiple file extensions if this part is the last        // 286
    // part of a module identifier and not equal to `.` or `..`, and there    // 287
    // was no exact match or the exact match was a directory.                 // 288
    if (isLastPart && (! exactChild || fileIsDirectory(exactChild))) {        // 289
      for (var e = 0; e < extensions.length; ++e) {                           // 290
        var child = getOwn(file.c, part + extensions[e]);                     // 291
        if (child) {                                                          // 292
          return child;                                                       // 293
        }                                                                     // 294
      }                                                                       // 295
    }                                                                         // 296
                                                                              // 297
    return exactChild;                                                        // 298
  }                                                                           // 299
                                                                              // 300
  function fileAppendId(file, id) {                                           // 301
    var parts = id.split("/");                                                // 302
    // Use `Array.prototype.every` to terminate iteration early if            // 303
    // `fileAppendIdPart` returns a falsy value.                              // 304
    parts.every(function (part, i) {                                          // 305
      return file = fileAppendIdPart(file, part, i === parts.length - 1);     // 306
    });                                                                       // 307
    return file;                                                              // 308
  }                                                                           // 309
                                                                              // 310
  function fileResolve(file, id, seenDirFiles) {                              // 311
    file =                                                                    // 312
      // Absolute module identifiers (i.e. those that begin with a `/`        // 313
      // character) are interpreted relative to the root directory, which     // 314
      // is a slight deviation from Node, which has access to the entire      // 315
      // file system.                                                         // 316
      id.charAt(0) === "/" ? fileAppendId(root, id) :                         // 317
      // Relative module identifiers are interpreted relative to the          // 318
      // current file, naturally.                                             // 319
      id.charAt(0) === "." ? fileAppendId(file, id) :                         // 320
      // Top-level module identifiers are interpreted as referring to         // 321
      // packages in `node_modules` directories.                              // 322
      nodeModulesLookup(file, id);                                            // 323
                                                                              // 324
    // If the identifier resolves to a directory, we use the same logic as    // 325
    // Node to find an `index.js` or `package.json` file to evaluate.         // 326
    while (fileIsDirectory(file)) {                                           // 327
      seenDirFiles = seenDirFiles || [];                                      // 328
                                                                              // 329
      // If the "main" field of a `package.json` file resolves to a           // 330
      // directory we've already considered, then we should not attempt to    // 331
      // read the same `package.json` file again. Using an array as a set     // 332
      // is acceptable here because the number of directories to consider     // 333
      // is rarely greater than 1 or 2. Also, using indexOf allows us to      // 334
      // store File objects instead of strings.                               // 335
      if (seenDirFiles.indexOf(file) < 0) {                                   // 336
        seenDirFiles.push(file);                                              // 337
                                                                              // 338
        // If `package.json` does not exist, `fileEvaluate` will return       // 339
        // the `MISSING` object, which has no `.main` property.               // 340
        var pkg = fileEvaluate(fileAppendIdPart(file, "package.json"));       // 341
        if (pkg && isString(pkg.main)) {                                      // 342
          // The "main" field of package.json does not have to begin with     // 343
          // ./ to be considered relative, so first we try simply             // 344
          // appending it to the directory path before falling back to a      // 345
          // full fileResolve, which might return a package from a            // 346
          // node_modules directory.                                          // 347
          file = fileAppendId(file, pkg.main) ||                              // 348
            fileResolve(file, pkg.main, seenDirFiles);                        // 349
                                                                              // 350
          if (file) {                                                         // 351
            // The fileAppendId call above may have returned a directory,     // 352
            // so continue the loop to make sure we resolve it to a           // 353
            // non-directory file.                                            // 354
            continue;                                                         // 355
          }                                                                   // 356
        }                                                                     // 357
      }                                                                       // 358
                                                                              // 359
      // If we didn't find a `package.json` file, or it didn't have a         // 360
      // resolvable `.main` property, the only possibility left to            // 361
      // consider is that this directory contains an `index.js` module.       // 362
      // This assignment almost always terminates the while loop, because     // 363
      // there's very little chance `fileIsDirectory(file)` will be true      // 364
      // for the result of `fileAppendIdPart(file, "index.js")`. However,     // 365
      // in principle it is remotely possible that a file called              // 366
      // `index.js` could be a directory instead of a file.                   // 367
      file = fileAppendIdPart(file, "index.js");                              // 368
    }                                                                         // 369
                                                                              // 370
    if (file && isString(file.c)) {                                           // 371
      file = fileResolve(file, file.c, seenDirFiles);                         // 372
    }                                                                         // 373
                                                                              // 374
    return file;                                                              // 375
  };                                                                          // 376
                                                                              // 377
  function nodeModulesLookup(file, id) {                                      // 378
    return fileIsDirectory(file) &&                                           // 379
      fileAppendId(file, "node_modules/" + id) ||                             // 380
      (file.p && nodeModulesLookup(file.p, id));                              // 381
  }                                                                           // 382
                                                                              // 383
  return install;                                                             // 384
};                                                                            // 385
                                                                              // 386
if (typeof exports === "object") {                                            // 387
  exports.makeInstaller = makeInstaller;                                      // 388
}                                                                             // 389
                                                                              // 390
////////////////////////////////////////////////////////////////////////////////







(function(){

////////////////////////////////////////////////////////////////////////////////
//                                                                            //
// packages/modules-runtime/modules-runtime.js                                //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
                                                                              //
var options = {};                                                             // 1
var hasOwn = options.hasOwnProperty;                                          // 2
                                                                              // 3
// RegExp matching strings that don't start with a `.` or a `/`.              // 4
var topLevelIdPattern = /^[^./]/;                                             // 5
                                                                              // 6
// This function will be called whenever a module identifier that hasn't      // 7
// been installed is required. For backwards compatibility, and so that we    // 8
// can require binary dependencies on the server, we implement the            // 9
// fallback in terms of Npm.require.                                          // 10
options.fallback = function (id, dir, error) {                                // 11
  // For simplicity, we honor only top-level module identifiers here.         // 12
  // We could try to honor relative and absolute module identifiers by        // 13
  // somehow combining `id` with `dir`, but we'd have to be really careful    // 14
  // that the resulting modules were located in a known directory (not        // 15
  // some arbitrary location on the file system), and we only really need     // 16
  // the fallback for dependencies installed in node_modules directories.     // 17
  if (topLevelIdPattern.test(id)) {                                           // 18
    var parts = id.split("/");                                                // 19
    if (parts.length === 2 &&                                                 // 20
        parts[0] === "meteor" &&                                              // 21
        hasOwn.call(Package, parts[1])) {                                     // 22
      return Package[parts[1]];                                               // 23
    }                                                                         // 24
                                                                              // 25
    if (typeof Npm === "object" &&                                            // 26
        typeof Npm.require === "function") {                                  // 27
      return Npm.require(id);                                                 // 28
    }                                                                         // 29
  }                                                                           // 30
                                                                              // 31
  throw error;                                                                // 32
};                                                                            // 33
                                                                              // 34
meteorInstall = makeInstaller(options);                                       // 35
                                                                              // 36
////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */

})();
