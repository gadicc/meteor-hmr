import fs from 'fs';
import path from 'path';
import vm from 'vm';
import _ from 'lodash';

import { log, debug } from './log';

/*
 * Meteor runs all build plugins in the same context, so we should too, even
 * though it would be cleaner for us to give each plugin it's own context.
 */
var currentPlugin;

const buildPluginIds = {};

var localNodeModules;
function npmRequire(dep, isNpmRequire) {
  const resolved = npmRequire.resolve(dep, true);

  if (isNpmRequire)
    debug(5, 'Npm.require', dep, resolved);
  else
    debug(4, 'root npmRequire', dep, resolved);

  return require(resolved);
}

const resolveCache = {};
function resolve(dep, nonDirect) {
  var result, fromCache = false;

  const cache = currentPlugin.path + localNodeModules;
  if (!resolveCache[cache]) resolveCache[cache] = {};

  if (resolveCache[cache][dep]) {
    result = resolveCache[cache][dep];
    fromCache = true;
  } else {
    /* we could do something cleaner like this...
    if (dep.match(/^\/node_modules/)) {
      // dep: /node_modules/meteor/mss/node_modules/node-sass/package.json
      // localNodeModules: npm/node_modules/meteor/mss/node_modules
    }
    */
    dep = dep.replace(/(^\/node_modules\/meteor\/)([^\/]+)(\/.*)$/,
      (match, p1, packageName, p3) => p1+packageName.replace(/:/,'_')+p3);
    const options = [
      path.join(currentPlugin.path, 'npm', dep),
      path.join(currentPlugin.path, localNodeModules, dep),
      path.join(meteorToolNodeModules, dep)
    ];

    // no idea, e.g. caching-compiler needs this but doedsn't have it in it's
    // own node_modules.
    if (dep.match(/^\/node_modules\/babel-runtime/))
      options.push(path.join(currentPlugin.path, 'npm', 'node_modules',
        'meteor', 'babel-compiler', 'node_modules', 'meteor-babel', dep));

    for (let option of options) {
      try {
        result = require.resolve(option);
        break;
      } catch (e) {
        debug(5, 'nomatch', option)
      }
    }

    if (!result)
      result = require.resolve(dep);
  }

  if (!nonDirect)
    debug(4, 'root npmRequire.resolve', fromCache?'fromCache':'new', dep, result);

  if (!fromCache)
    resolveCache[cache][dep] = result;

  return result;
}

npmRequire.resolve = resolve;
npmRequire.setNodeModules = function(path) {
  localNodeModules = path;
};

/* --- */

class BuildPlugin {

  constructor(id, name, path, addJavaScript) {
    this.id = id;
    this.name = name;
    this.path = path;

    buildPluginIds[id] = this;

    this.addJavaScript = addJavaScript;

    /*
    this.InputFile = class extends InputFile {
      addJavaScript = function(data) {
        addJavaScript.call(null, data, this /* FakeFile *//*);
      }
    }
    */

    debug(`Loading plugin "${name}" (${id}) from ${path}`);
    this.load();
  }

  run(code, fullPath) {
    var options;

    currentPlugin = this;

    if (typeof code === 'object') {
      options = code;
      fullPath = path.join(this.path, options.path);
      code = fs.readFileSync(fullPath, 'utf8');
      if (options.node_modules) {
        new vm.Script(`npmRequire.setNodeModules("${options.node_modules}");`,
          'buildPlugin-npmRequire-setNodeModules').runInThisContext();
      }
    }

    new vm.Script(code, fullPath).runInThisContext();
    currentPlugin = false;
  }

  load() {
    const program = require(path.join(this.path, 'program.json'));

    if (program.format !== 'javascript-image-pre1')
      throw new Error("[gadicc:hot] Sorry, I only know how to handle 'javascript-image-pre1' format build plugins");

    if (program.arch !== 'os' && program.arch.substr(0, 3) !== 'os.')
      throw new Error("[gadicc:hot] Sorry, I only know how to handle 'os' arch build plugins, not: " + program.arch);

    program.load.forEach(file => this.run(file));
  }

  setDiskCacheDirectory(cacheDir) {
    this.compiler.setDiskCacheDirectory(cacheDir);
  }

  processFilesForTarget(inputFiles) {
    debug(`${this.name}.processFilesForTarget(`
      + inputFiles.map(file => file.pathInPackage) + ')');

    // The fiber is for use by plugins that expect to be run in one, e.g.
    // covers the current await/async/promise implementation for node 0.10
    new Fiber(() => {
      try {
        this.compiler.processFilesForTarget(inputFiles);
      } catch (err) {
        log("Build plugin error.  Skipping this time.  The error was:",
          err.stack);
        return;
      }

      debug(3, `Finished ${this.name}.processFilesForTarget(`
        + inputFiles.map(file => file.pathInPackage) + ')');
    }).run();
  }

}

/* --- */

BuildPlugin.byId = function(id) {
  return buildPluginIds[id];
};

function augmentConsole(console, method) {
  return function(...args) {
    var pre = '\n[gadicc:hot] Accelerator (' + log.id + ')' + (currentPlugin
      ? ' in ' + currentPlugin.name + ' (' + currentPlugin.id + '): '
      : ': ');

    if (typeof args[0] === 'string')
      args[0] =  pre + args[0];
    else
      args.splice(0, 0, pre);

    method.apply(console, args);
  }
}

var meteorToolNodeModules, buildPluginContext, Fiber;
BuildPlugin.init = function(data) {
  Fiber = data.Fiber;
  meteorToolNodeModules = data.meteorToolNodeModules;

  buildPluginContext = new vm.createContext({
    process: process,
    console: {
      log: augmentConsole(console, console.log),
      _log: console.log.bind(console),
      error: augmentConsole(console, console.error),
      warn: augmentConsole(console, console.warn),
      info: augmentConsole(console, console.info),
      trace: augmentConsole(console, console.trace),
      dir: console.dir,
      time: console.time,
      timeEnd: console.timeEnd,
      assert: console.assert,
      Console: console.Console,
      _augmented: true
    },

    Promise: data.Promise,

    Npm: {
      require: function(dep) { return npmRequire(dep, true); }
    },

    // Note, modules-runtime will useNode() if this global exists
    npmRequire: npmRequire,

    Plugin: {
      registerCompiler: function(options, func) {
        currentPlugin.compiler = func();
      }
    }
  });

  /*
   * Unfortunately, vm.Script's don't allow us to augment methods like String.
   * So we had to switch to RunInThisContext to allow packages like
   * ecmascript-runtime to run correctly.
   */
  _.extend(global, buildPluginContext);

  // someone smarter than me can explain why it's necessary to do like this
  for (let key in buildPluginContext.console)
    global.console[key] = buildPluginContext.console[key];
};

/*
var plugin = new BuildPlugin('x');
plugin.load();
plugin.processFilesForTarget([
  {
    contents: 'import x from "x"',
    packageName: 'packageName',
    pathInPackage: 'pathInPackage',
    sourceHash: 'sourceHash',
    fileOptions: {}
  }
]);
*/

export default BuildPlugin;
