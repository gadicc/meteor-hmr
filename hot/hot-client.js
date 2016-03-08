var NEW_HMR = false;

// gets injected into first meteorInstall call
//import ReactTransformHMR from 'react-transform-hmr';

hot = {
  col: new Mongo.Collection('__hot'),
  failedOnce: false
}

// XXX
if (NEW_HMR) {
  var mhot = Package['modules-runtime'].mhot;
  window.mhot = mhot;
  Meteor.startup(function() {
    window.meteorInstallHot = mhot.meteorInstallHot;
  });
}

Meteor.subscribe('__hot');

Meteor.startup(function() {
  hot.col.find().observe({
    added: function(doc) {
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = '/hot.js?hash=' + doc._id;
      document.head.appendChild(script);
    }
  });
});

hot.reload = function() {
  console.log('[gadicc:hot] Forcing client refresh...');
  Meteor.call('__hot.reload', function() {
    // setTimeout(window.location.reload.bind(window.location), 100);
  });
}

// useful to put in an app for dev work on this package
hot.disableReload = function() {
  hot.reload = function() {
    console.log('[gadicc:hot] Would usually force a refresh now, but ' +
      'hot.disableReload() was called.  Run hot.reload() when desirable.');
  }
}

/*
 * Takes install.js root and flattens it, so we can easily access modules by
 * their id, e.g. flattened['/client/app.jsx']
 */
function flattenRoot(root) {
  var out = {};
  function walk(root) {
    out[root.m.id] = root;
    _.each(root.c, function(child) {
      if (child)
        walk(child);
    });
  }
  walk(root);
  return out;
}

if (NEW_HMR)
  return;

/*
 * resolvePath("/client/foo/bar", "../baz") === "/client/foo/baz"
 * XXX TODO optimize
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
  }

  return requirePath;
}

/*
 * Given install.js root and a meteorInstall tree, walk through the later
 * and call func with corresponding File and moduleCodeArray of each.
 */
function walkFileTree(root, tree, func) {
  for (var key in tree) {
    if (_.isArray(tree[key]))
      func(root.c[key], tree[key]);
    else
      walkFileTree(root.c[key], tree[key], func);
  }
}

/*
 * Given a File, find every other module which requires it, up to
 * a module with a module.hot key.  On each crawl, call func(file).
 */ 
function requirersUntilHot(file, func) {
  // console.log(file.m.id);

  if (!file)
    return console.error('[gadicc:hot] requirersUntilHot(): no file?');

  if (!file.m)
    return console.log('[gadicc:hot] requirersUntilHot(): no file.m?', file);

  func(file);

  if (!file.m.hot) {
    let id = file.m.id.replace(/\/index.js$/, '');

    if (modulesRequiringMe[id])
      modulesRequiringMe[id].forEach(function(moduleId) {
        requirersUntilHot(allModules[moduleId], func);
      });
    else {
      console.error('[gadicc:hot] ' + file.m.id + ' is not hot and nothing requires it');
      //console.log("[gadicc:hot] You should restart Meteor");
      
      //hot.reload();
      hot.failedOnce = true;
    }
  }
}

/*
 * Like meteorInstall, called with every bundled tree from hot.js.
 * Patch existing install.js root, delete eval'd exports up to a module
 * with module.hot, and require() that.
 */
meteorInstallHot = function(tree) {
  hot.blockNextHCP = true;
  hot.lastTree = tree;
  //console.log('got bundle', tree);

  // First, patch changed modules
  var moduleNames = [];
  walkFileTree(root, tree, function(file, moduleCodeArray) {
    moduleNames.push(file.m.id);
    // console.debug('[gadicc:hot] Replacing contents of ' + file.m.id);
    file.c = moduleCodeArray[moduleCodeArray.length-1];
  });

  console.info('[gadicc:hot] Updating', moduleNames);

  // Then, delete up to hot and reevaluate
  walkFileTree(root, tree, function(file, moduleCodeArray) {
    requirersUntilHot(file, function (file) {
      // console.debug('[gadicc:hot] deleting exports for ' + file.m.id);
      delete file.m.exports; // re-force install.js fileEvaluate()

      if (file.m.hot) {
        // console.debug('[gadicc:hot] Found module.hot in ' + file.m.id);
        try {
          file.m.hot.accept();
          // require(file.m.id);
        } catch (e) {
          console.error('[gadicc:hot] An error occured trying to accept hmr for ' + file.m.id);
          console.error(e);
          //console.log('[gadicc:hot] Consider restarting Meteor.');

          //hot.reload();
          hot.failedOnce = true;
        }
      }
    });
  });
}

// this will run before global-imports.js and app.js
var modulesRuntime = Package['modules-runtime'];
var origMeteorInstall = modulesRuntime.meteorInstall;
var root = modulesRuntime.meteorInstall._expose().root;
var modulesRequiringMe = {};
var allModules;

modulesRuntime.meteorInstall = Package['modules'].meteorInstall = function(tree) {
  hot.firstTree = tree;

  // Inject react-transform-hmr into the tree
  /*
  if (!tree.node_modules)
    tree.node_modules = {};
  tree.node_modules['react-transform-hmr'] = [
    function(require,exports,module) {
      module.exports = ReactTransformHMR
    }
  ];
  */

  var require = origMeteorInstall.apply(this, arguments);

  allModules = hot.allModules = flattenRoot(root);

  walkFileTree(root, tree, function(file, module) {

    // forEach on all reqs [ 'react', './blah', function(...) ]
    module.slice(0, module.length-1).forEach(function(req) {

      // "react", etc will never be reloaded in this implementation
      if (!req.match(/^[\.\/]{1,1}/))
        return;

      req = resolvePath(file.m.id, req);

      if (!allModules[req]) {
        if (allModules[req+'.js'])
          req += '.js';
        else if (allModules[req+'.jsx'])
          req += '.jsx';
      }

      if (!modulesRequiringMe[req])
        modulesRequiringMe[req] = [];

      if (file.m.id !== req)  // why?
        modulesRequiringMe[req].push(file.m.id);
    });

    if (module.indexOf('react-transform-hmr') !== -1) {
      // console.log('match', file.m.id);
      file.m.hot = {
        accept: function() {
          // console.debug('[gadicc:hot] hot.accept() called for ' + file.m.id);
          // This is probably important I should probably read the webpack spec :)
          require(file.m.id);
        }
      };
    }
  });

  return require;
}

hot.root = root;
hot.allModules = allModules;
hot.modulesRequiringMe = modulesRequiringMe;
hot.origMeteorInstall = origMeteorInstall;
