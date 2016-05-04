const hot = {
  failedOnce: false
};

_.extend(hot, Package['modules-runtime'].mhot);

const flattenRoot = hot.flattenRoot;
const resolvePath = hot.resolvePath;
const walkFileTree = hot.walkFileTree;
const reverseDeps = hot.reverseDeps;
const modulesRequiringMe = hot.modulesRequiringMe;
const allModules = hot.allModules;

/*
 * Given a File, find every other module which requires it, up to
 * a module that can self-accept or accept the new dep.  On each
 * crawl, call func(file), which should retrun true if the update
 * can be accepted.
 */ 
function requirersUntil(file, func, parentId, chain) {
  // console.log(file.m.id);
  if (chain)
    chain += ' > ' + file.m.id;
  else
    chain = file.m.id;

  if (!file)
    return console.error('[gadicc:hot] requirersUntil(): no file?');

  if (!file.m)
    return console.log('[gadicc:hot] requirersUntil(): no file.m?', file);

  if (!func(file, parentId)) {
    let id = file.m.id;
    if (!modulesRequiringMe[id])
      id = id.replace(/\/index\.jsx?|\.jsx?$/, '');

    if (modulesRequiringMe[id])
      for (let moduleId of modulesRequiringMe[id])
        requirersUntil(allModules[moduleId], func, id, chain);
    else {
      console.info('[gadicc:hot] No hot.accept() in ' + chain);
      hot.failedOnce = true;
    }
  }
}

function logAndFail(message, err) {
  console.error('[gadicc:hot] ' + message);
  if (err) console.error(err);
  hot.failedOnce = true;
  return true;
}

/*
 * Like meteorInstall, called with every bundled tree from hot.js.
 * Patch existing install.js root, delete eval'd exports up to a module
 * that can accept us and self-accept or accept-dep.
 */
const meteorInstallHot = function(tree) {
  hot.blockNextHCP = true;
  hot.lastTree = tree;
  //console.log('got bundle', tree);

  // First, patch changed modules
  var moduleNames = [];
  walkFileTree(hot.root, tree, function(file, moduleCodeArray) {
    moduleNames.push(file.m.id);
    // console.debug('[gadicc:hot] Replacing contents of ' + file.m.id);
    file.c = moduleCodeArray[moduleCodeArray.length-1];
  });

  console.info('[gadicc:hot] Updating', moduleNames);

  // Then, delete up to hot and reevaluate
  walkFileTree(hot.root, tree, function hotWalker(file, moduleCodeArray) {
    var changedFile = file;

    requirersUntil(file, function canAccept(file, parentId) {
      const mhot = file.m.hot;

      if (mhot._selfDeclined)
        return logAndFile('Aborted because of self decline: ' + file.m.id);
      else if (parentId && mhot._declinedDependencies
          && mhot._declinedDependencies[parentId])
        return logAndFail('Aborted because of declined dependency: '
          + parentId + ' in ' + file.m.id);

      if (mhot._disposeHandlers) {
        mhot.data = {};
        mhot._disposeHandlers.forEach(f => f(mhot.data));
        mhot._disposeHandlers = [];
      }

      if (mhot._selfAccepted) {
        // console.debug('[gadicc:hot] ' + file.m.id + ' can self accept');

        try {

          require(file.m.id);

        } catch (err) {

          // hot.accept([errHandler])
          if (typeof mhot._selfAccepted === 'function')
            mhot._selfAccepted(err);

          logAndFile('An error occured trying to accept hmr for '
            + file.m.id, err);

        }
        return true;

      } else if (parentId && mhot._acceptedDependencies
          && mhot._acceptedDependencies[parentId]) {

        // console.debug('[gadicc:hot] ' + file.m.id + ' can accept ' + parentId);

        try {

          mhot._acceptedDependencies[parentId]();

        } catch (err) {

          logAndFail('An error occured trying to accept hmr for '
            + file.m.id, err);

        }
        return true;

      } else {

        // console.debug(file.m.id + ' cannot self-accept or accept ' + parentId);
        
        // console.debug('[gadicc:hot] deleting exports for ' + file.m.id);
        delete file.m.exports; // re-force install.js fileEvaluate()

        // since benjamn/install 0.6.2
        // https://github.com/benjamn/install/commit/de70c43d873e03490e0110140e3b1ea57ba8549f
        if (file.m.loaded)
          file.m.loaded = false;
        // any repercussions for
        // https://github.com/benjamn/install/commit/aebd65a5f7dc5fda4cccb884d6e5070bf4a81a11#diff-f16acefe4b6553580c43edab685f50f3R182
      }

    });
  });
}

export { meteorInstallHot, hot };
export default hot;
