hot = {
  col: new Mongo.Collection('__hot')
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
  if (!file)
    return console.error('[gadicc:hot] requirersUntilHot(): no file?');

  if (!file.m)
    return console.log('[gadicc:hot] requirersUntilHot(): no file.m?', file);

  func(file);

  if (!file.m.hot)
    modulesRequiringMe[file.m.id].forEach(function(moduleId) {
      requirersUntilHot(allModules[moduleId], func);
    });
}

/*
 * Like meteorInstall, called with every bundled tree from hot.js.
 * Patch existing install.js root, delete eval'd exports up to a module
 * with module.hot, and require() that.
 */
meteorInstallHot = function(tree) {
  stuff.lastTree = tree;
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
        file.m.hot.accept();
        // require(file.m.id);
      }
    });
  });
}

var root = meteorInstall._expose().root;

// this will run before global-imports.js and app.js
var modules = Package['modules'];
var origMeteorInstall = modules.meteorInstall;
var modulesRequiringMe = {};
var allModules;

modules.meteorInstall = function(tree) {
  stuff.firstTree = tree;

  var require = origMeteorInstall.apply(this, arguments);

  allModules = flattenRoot(root);

  walkFileTree(root, tree, function(file, module) {

    module.slice(0, module.length-1).forEach(function(req) {
      if (req.substr(0, 1) !== '.')
        return;

      req = req.replace(/^\.\//,
        file.m.id.replace(/\/[^\/]+$/, '') + '/');

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

/// XXX
var stuff = {
  root,
  allModules,
  modulesRequiringMe
};

// window.x = stuff;