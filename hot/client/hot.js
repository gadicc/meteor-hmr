var NEW_HMR = false;

const hot = {
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
function walkFileTree(root, tree, func, oldRoot) {
  for (var key in tree) {
    if (_.isArray(tree[key])) {
      if (!root) {
        console.log('[gadicc:hot] no root for', key);
        console.log('oldRoot.c', oldRoot.c);
        console.log('tree[key]', tree[key]);
        console.log("If this happens once, it's safe to Ctrl-R.  If it " +
          'keeps happening, it would be great if you could open a github ' +
          'issue with a link to a github repo and steps to reproduce.');
      }
      func(root.c[key], tree[key]);
    }
    else 
      walkFileTree(root.c[key], tree[key], func, root);
  }
}

/*
 * Given a File, find every other module which requires it, up to
 * a module that can self-accept or accept the new dep.  On each
 * crawl, call func(file), which should retrun true if the update
 * can be accepted.
 */ 
function requirersUntilHot(file, func, parentId) {
  // console.log(file.m.id);

  if (!file)
    return console.error('[gadicc:hot] requirersUntilHot(): no file?');

  if (!file.m)
    return console.log('[gadicc:hot] requirersUntilHot(): no file.m?', file);

  if (!func(file, parentId)) {
    let id = file.m.id.replace(/\/index.js$/, '');

    if (modulesRequiringMe[id])
      modulesRequiringMe[id].forEach(function(moduleId) {
        requirersUntilHot(allModules[moduleId], func, id);
      });
    else {
      console.error('[gadicc:hot] ' + file.m.id + ' is not hot and nothing requires it');
      hot.failedOnce = true;
    }
  }
}

/*
 * Like meteorInstall, called with every bundled tree from hot.js.
 * Patch existing install.js root, delete eval'd exports up to a module
 * with module.hot, and require() that.
 */
const meteorInstallHot = function(tree) {
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
    var changedFile = file;

    requirersUntilHot(file, function (file, parentId) {
      // console.debug('[gadicc:hot] deleting exports for ' + file.m.id);
      delete file.m.exports; // re-force install.js fileEvaluate()

      if (file.m.hot._selfAccepted) {
        // console.debug('[gadicc:hot] ' + file.m.id + ' can self accept');

        try {

          require(file.m.id);

        } catch (e) {

          hot.failedOnce = true;

          if (typeof file.m.hot._selfAccepted === 'function')
            file.m.hot._selfAccepted(e);

          console.error('[gadicc:hot] An error occured trying to accept hmr for ' + file.m.id);
          console.error(e);

        }
        return true;

      } else if (parentId && file.m.hot._acceptedDependencies[parentId]) {
        // console.debug('[gadicc:hot] ' + file.m.id + ' can accept ' + parentId);

        try {

          file.m.hot._acceptedDependencies[parentId]();

        } catch (e) {

          hot.failedOnce = true;
          console.error('[gadicc:hot] An error occured trying to accept hmr for ' + file.m.id);
          console.error(e);

        }
        return true;

      } else {

        // console.debug(file.m.id + ' cannot self-accept or accept ' + parentId);
        
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

  var require = origMeteorInstall.apply(this, arguments);

  allModules = hot.allModules = flattenRoot(root);

  walkFileTree(root, tree, function(file, module) {

    // forEach on all reqs [ 'react', './blah', function(...) ]
    module.slice(0, module.length-1).forEach(function(req) {

      // npm and meteor packages will never be reloaded in this implementation
      // so we skip any req not beginning with a "." or a "/"
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

  });

  return require;
}

hot.root = root;
hot.allModules = allModules;
hot.modulesRequiringMe = modulesRequiringMe;
hot.origMeteorInstall = origMeteorInstall;

export { meteorInstallHot, hot };
export default hot;
