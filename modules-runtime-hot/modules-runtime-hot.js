mhot = { };

/*
 * resolvePath("/client/foo/bar", "../baz") === "/client/foo/baz"
 * XXX TODO optimize, merge with install methods
 * XXX part of this is duplicated in hot-client!
 */
function resolvePath(moduleId, requirePath) {
  if (requirePath.substr(0,1) === '/')
    requirePath; // noop
  else if (requirePath.substr(0,2) === './')
    requirePath = requirePath.replace(/^\.\//,
      moduleId.replace(/\/[^\/]+$/, '') + '/');
  else if (requirePath.substr(0,3) === '../') {
    moduleId = moduleId.replace(/\/[^\/]+$/, '');
    while (requirePath.substr(0,3) === '../') {
      requirePath = requirePath.replace(/^\.\.\//, '');
      moduleId = moduleId.replace(/\/[^\/]+$/, '');
    }
    requirePath = moduleId + '/' + requirePath;
  } else {
    requirePath = '/node_modules/' + requirePath;
  }

  // sorry; TODO
  var hot = {
    modules: window.hot.allModules
  };

  // XXX improve
  if (!hot.modules[requirePath]) {
    if (hot.modules[requirePath + '.jsx'])
      requirePath += '.jsx';
    else if (hot.modules[requirePath + '.js'])
      requirePath += '.js';
    else if (hot.modules[requirePath + '/index.js'])
      requirePath += '/index.js';
    else if (hot.modules[requirePath + '/index.jsx'])
      requirePath += '/index.jsx';
    else {
      // throw new Error("can't find/resolve " + moduleId + " " + requirePath);
      // Probably a Meteor package via the fallback
      return null;
    }
  }

  return requirePath;
}


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

// XXX
mhot.hotDepModules = [];
if (Meteor.isClient)
  Meteor.startup(function() {
    if (!window.hot.hotDepModules)
      window.hot.hotDepModules = Package['modules-runtime'].mhot.hotDepModules;
  });

function hotDepModuleWarn(module) {
  if (!mhot.hotDepModules.includes(module)) {
    mhot.hotDepModules.push(module);
    console.warn("[gadicc:hot] Support for hotloading dependencies is not "
      + "well tested: " + module.id + " (copied into hot.hotDepModules)");
  }
}

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
      hotDepModuleWarn(module);
      for(var i = 0; i < dep.length; i++)
        this._acceptedDependencies[resolvePath(module.id, dep[i])] = callback;
    } else if (typeof dep === "string") {
      hotDepModuleWarn(module);
      this._acceptedDependencies[resolvePath(module.id, dep)] = callback;
    } else {
      throw new Error("[gadicc:hot] Invalid argument for hot.accept(): ",
        typeof dep, dep);
    }
  }
};

var moduleHotProps = {
  _acceptedDependencies: {},
  _selfAccepted: false
};

mhot.makeInstaller = function(options) {
  options.Module = Module;

  return makeInstaller(options);
};

/*
 * code below used a slightly different approach that we could still go back to
 */
return;

mhot = {
  modules: {},
  acceptFuncs: {}
};

var hot = mhot;

function flattenTree(tree, out, path) {
  if (!out) out = {};
  if (!path) path = '';

  Object.keys(tree).forEach(function(key) {
    if (Array.isArray(tree[key]))
      out[path+'/'+key] = tree[key];
    else
      flattenTree(tree[key], out, path+'/'+key);
  });
  return out;
}

function findAndAccept(id) {
  if (hot.modules[id].hot._selfAccepted) {
    if (hot.modules[id].hot._selfAccepted === true)
      return true;
    else
      return hot.modules[id].hot._selfAccepted; // a function
    // TODO udpated deps etc

  } else {
    hot.modules[id].parents.forEach(function() {
      return findAccept(id);
    });
  }

}

function wrapRequire(tree) {
  var newRequire = meteorInstall(tree);
  return function(modulePath) {
    var out;
    try {
      out = newRequire(modulePath);
    } catch (e) {
      out = require(modulePath);
    }
    return out;
  }
}

hot.meteorInstallHot = function(tree) {
  var flat = flattenTree(tree);
  var require = wrapRequire(tree);

  _.each(flat, function(id) {
    findAndAccept(id, require);
  });
}

hot.makeInstaller = function(options) {
  options.Module = Module;

  var installer = makeInstaller(options);
  return function(tree) {
    var require = installer(tree);

    _.each(flattenTree(tree), function(reqs, id) {
      reqs.slice(0, reqs.length-1).forEach(function(req) {
        var reqMod = hot.modules[resolvePath(id, req)];

        if (reqMod.parents.indexOf(id) === -1)
          reqMod.parents.push(id);
      });
    });

    return require;
  }
}
