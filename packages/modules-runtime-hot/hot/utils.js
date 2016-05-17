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
};

/*
 * resolvePath("/client/foo/bar", "../baz") === "/client/foo/baz"
 XXX TODO optimize, merge with install methods
 */
function resolvePath(moduleId, origRequirePath) {
  var hot = this;
  var requirePath = origRequirePath;

  if (!requirePath) {
    throw new Error("resolvePath(moduleId, requirePath) called without requirePath for " + moduleId);
  }

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

  return requirePath;
};

/*
 * Given install.js root and a meteorInstall tree, walk through the latter
 * and call func with corresponding File and moduleCodeArray of each.
 */
function walkFileTree(root, tree, func, oldRoot) {
  for (var key in tree) {
    /*
     * tree[key] could be
     *
     *   1) ['dep1', 'dep2', function]
     *   2) function
     *   3) { 'child1.js1': ..., 'child2.js': ... }
     *
     */
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
    } else if (typeof tree[key] === 'function')
      func(root.c[key], [tree[key]]);
    else 
      walkFileTree(root.c[key], tree[key], func, root);
  }
};

function reverseDeps(tree) {
  var hot = this;

  walkFileTree(hot.root, tree, function(file, module) {

    // forEach on all reqs [ 'react', './blah', function(...) ]
    module.slice(0, module.length-1).forEach(function(req) {

      // npm and meteor packages will never be reloaded in this implementation
      // so we skip any req not beginning with a "." or a "/"
      // 2016-04-26; we now allow Meteor packages and maybe people will want
      // to hotload their own node_modules they're working on.  Let's see.
      //if (!req.match(/^[\.\/]{1,1}/))
      //  return;

      req = hot.resolvePath(file.m.id, req);

      if (!hot.modulesRequiringMe[req])
        hot.modulesRequiringMe[req] = [];

      if (file.m.id !== req)  // why?
        hot.modulesRequiringMe[req].push(file.m.id);
    });

  });  
};

utils = {
  flattenRoot: flattenRoot,
  resolvePath: resolvePath,
  walkFileTree: walkFileTree,
  reverseDeps: reverseDeps
};
