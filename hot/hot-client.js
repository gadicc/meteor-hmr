var NEW_HMR = false;

if (process.env.NODE_ENV === 'production')
  return;

// line below gets injected into first meteorInstall call
//import ReactTransformHMR from 'react-transform-hmr';

hot = {
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

var port = Meteor.settings.public.HOT_PORT;
var wsUrl = 'ws://' + location.hostname + ':' + port + '/';
var serverBase = 'http://' + location.hostname + ':' + port + '/hot.js?hash=';

var ws = {};

ws.onmessage = function(event) {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = serverBase + event.data; 
  document.head.appendChild(script);
}

ws.onopen = function() {
  ws.reconnecting = false;
  console.log('[gadicc:hot] Connected and ready.');
}

/*
ws.onerror = function(error) {
  console.log('[gadicc:hot] Socket error', error);
}
*/

ws.onclose = function() {
  if (!ws.reconnecting) {
    ws.reconnecting = true;
    console.log('[gadicc:hot] Disconnected, attempting to reconnect...');
  }
  
  setTimeout(ws.open, 100);
}

ws.open = function() {
  ws.connection = new WebSocket(wsUrl);
  ws.connection.onopen = ws.onopen;
  ws.connection.onclose = ws.onclose;
  ws.connection.onerror = ws.onerror;
  ws.connection.onmessage = ws.onmessage;
}

ws.open();

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
