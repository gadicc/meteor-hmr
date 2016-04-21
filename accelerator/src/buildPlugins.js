import fs from 'fs';
import path from 'path';
import vm from 'vm';
import FakeFile from './fakeFile';
// import _ from 'lodash';

/*
 * Meteor runs all build plugins in the same context, so we should too, even
 * thought it would be cleaner for us to give each plugin it's own context.
 */
var currentPlugin;

const buildPluginContext = new vm.createContext({

  process: process,
  console: console,

  // Npm.require gets set on each run with correct path
  Npm: {},

  // and calls this function
  NpmRequire(dep, node_modules) {
    try {
      // Would be cleaner to fs.existsSync and cache, but this does the job for now.
      return require(path.join(currentPlugin.path, node_modules, dep));
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND')
        throw err;

      return require(dep);
    }
  },

  // Gets overriden per plugin
  Plugin: {

    registerCompiler: function(options, func) {
      currentPlugin.compiler = func();
    }

  }
});

class BuildPlugin {

  constructor(id) {
    this.id = id;

    this.path = '/home/dragon/.meteor/packages/ecmascript/0.4.3/plugin.compile-ecmascript.os';

    this.FakeFile = class extends FakeFile {
      addJavaScript(js) {
        console.log('5JS', js);
      }
    }
  }

  run(code) {
    var options;

    // Used for Plugin.registerCompiler
    if (currentPlugin !== this)
      currentPlugin = this;

    if (typeof code === 'object') {
      options = code;
      code = fs.readFileSync(path.join(this.path, options.path), 'utf8');
      if (options.node_modules)
        new vm.Script(`
          Npm.require = function(dep) {
            return NpmRequire(dep, "${options.node_modules}");
          }
        `).runInContext(buildPluginContext);
    }

    new vm.Script(code).runInContext(buildPluginContext);
  }

  load() {
    const program = require(path.join(this.path, 'program.json'));

    if (program.format !== 'javascript-image-pre1')
      throw new Error("[gadicc:hot] Sorry, I only know how to handle 'javascript-image-pre1' format build plugins");

    if (program.arch !== 'os')
      throw new Error("[gadicc:hot] Sorry, I only know how to handle 'os' arch build plugins");

    program.load.forEach(file => this.run(file));
  }

  processFilesForTarget(inputFiles) {
    this.compiler.processFilesForTarget(
      inputFiles.map(inputFile => new this.FakeFile(inputFile))
    );
  }

}

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

export default BuildPlugin;
