mhot = {
  allModules: {},
  modulesRequiringMe: {},
  trees: [],

  // from utils.js, to export
  flattenRoot: utils.flattenRoot,
  resolvePath: utils.resolvePath,
  walkFileTree: utils.walkFileTree,
  reverseDeps: utils.reverseDeps
};

var hot = mhot;

// On both the client & server this means no hotloading is present
if (!Meteor.settings.public.HOT_PORT)
  return;

function Module(id, parent) {
  this.id = id;
  this.parent = parent;

  if (1 /* TODO overridable default based on Meteor.isDevelopment? */) {
    this.hot = Object.create(moduleHotProto);
    for (var key in moduleHotProps)
      this.hot[key] = _.clone(moduleHotProps[key]);

    this.hot._m = this;
    this.parents = [];
    //hot.modules[id] = this;
  }
};

// https://github.com/webpack/webpack/blob/master/lib/HotModuleReplacement.runtime.js
var moduleHotProto = {
  // http://webpack.github.io/docs/hot-module-replacement.html#accept
  accept: function(dep, callback) {
    var module = this._m;

    if (typeof dep === "undefined")
      this._selfAccepted = true;
    else if (typeof dep === "function")
      this._selfAccepted = dep;
    else if (typeof dep === "object") {
      if (!this._acceptedDependencies) this._acceptedDependencies = {};
      for (var i = 0; i < dep.length; i++)
        this._acceptedDependencies[hot.resolvePath(module.id, dep[i])] = callback;
    } else if (typeof dep === "string") {
      if (!this._acceptedDependencies) this._acceptedDependencies = {};
      this._acceptedDependencies[hot.resolvePath(module.id, dep)] = callback;
    } else {
      throw new Error("[gadicc:hot] Invalid argument for hot.accept(): ",
        typeof dep, dep);
    }
  },

  decline: function(dep) {
    var module = this._m;

    if (typeof dep === "undefined")
      this._selfDeclined = true;
    else if (typeof dep === "string") {
      if (!this._declinedDependencies)
        this._declinedDependencies = {};
      this._declinedDependencies[hot.resolvePath(module.id, dep)] = true;
    } else if (typeof dep === "object") {
      if (!this._declinedDependencies)
        this._declinedDependencies = {};
      for (var i=0; i < dep.length; i++)
        this._declinedDependencies[hot.resolvePath(module.id, dep)] = true;
    } else {
      throw new Error("[gadicc:hot] Invalid argument for hot.decline(): ",
        typeof dep, dep);
    }
  },

  dispose: function(callback) {
    if (typeof callback !== 'function')
      throw new Error("[gadicc:hot] hot.dispose(func) expects a function");
    if (!this._disposeHandlers)
      this._disposeHandlers = [];
    this._disposeHandlers.push(callback);
  },
  addDisposeHandler: function(callback) {
    if (typeof callback !== 'function')
      throw new Error("[gadicc:hot] hot.addDisposeHandler(func) expects a function");
    if (!this._disposeHandlers)
      this._disposeHandlers = [];
    this._disposeHandlers.push(callback);
  },
  removeDisposeHandler: function(callback) {
    if (typeof callback !== 'function')
      throw new Error("[gadicc:hot] hot.removeDisposeHandler(func) expects a function");
    if (!this._disposeHandlers)
      return;
    var idx = this._disposeHandlers.indexOf(callback);
    if (idx >= 0) hot._disposeHandlers.splice(idx, 1);
  }

};

var moduleHotProps = {
  // Rather save mem and make them on-demand; requires a few more checks
  // here and there, but I think it's cleaner.
};

hot.makeInstaller = function(options) {
  options.Module = Module;

  var origInstall = makeInstaller(options);
  hot.root = origInstall._expose().root;

  return function meteorInstall(tree) {
    var require = origInstall.apply(this, arguments);

    hot.trees.push(tree);
    _.extend(hot.allModules, hot.flattenRoot(hot.root))
    hot.reverseDeps(tree);

    return require;
  }
};
