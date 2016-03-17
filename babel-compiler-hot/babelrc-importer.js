/*
 * This is unfortunately quite hacky.  We "compile" a trigger file in this
 * package but we actually directly load PROJ_ROOT/.babelrc.  This is
 * necessary because it's not possible to override babel's reliance on
 * sourceFileName - it tries to resolve plugins/presets from
 * /package/blah... and fails.  So we need to handle these imports via
 * Meteor.
 */

var fs = Plugin.fs;
var path = Plugin.path;
var crypto = Npm.require('crypto');

Plugin.registerCompiler({
  filenames: ['babelrc-importer-hack']
}, function () {
  return new Compiler();
});

// XXX is there a meteor way to do this?
var PROJ_ROOT = process.cwd();
while (PROJ_ROOT && !fs.existsSync(path.join(PROJ_ROOT, '.meteor')))
  PROJ_ROOT = path.normalize(path.join(PROJ_ROOT, '..'));
if (!PROJ_ROOT)
  throw new Error("Are you running inside a Meteor project dir?");

/*
 * Mutates an array of plugins/presets, where each element should be
 * "pluginName" or ["pluginName", options], and replace the string
 * part with 'require(prefix+"pluginName").default'.  Meteor scans this
 * output and also links in the required module.  Prefix "babel-plugin-"
 */
function requireModules(array, prefix) {
  if (!array)
    return;
  for (var i=0; i < array.length; i++)
    if (typeof array[i] === 'string')
      array[i] = 'require("'+ prefix + array[i] + '").default';
    else if (_.isArray(array[i]) && typeof array[i][0] === 'string')
      array[i][0] = 'require("'+ prefix + array[i][0] + '").default';
}

/*
 * Using requireModules(), mutates plugins and presets providing the
 * the relevant prefix, e.g. "babel-plugin-".
 */
function requirePluginsAndPresets(root) {
  var arrays = ['presets', 'plugins'];
  _.each(arrays, function(key) {
    if (root[key])
      requireModules(root[key], 'babel-'+key.substr(0, key.length-1)+'-');
  });
}

Compiler = function() {}
Compiler.prototype.processFilesForTarget = function (files) {
  var file = files[0];
  var data = '';

  if (files.length > 1)
    throw new Error("And just how is it that you have more than one " +
      "babelrc-importer-hack files?");

  /*
   * Babel's own code to load .babelrc will climb the path tree to find it,
   * which could lead to unintended results (see #6016).  In Meteor, we
   * only accept a .babelrc in the project root.
   */

  var babelrc, babelrcPath = path.join(PROJ_ROOT, '.babelrc');
  try {
    babelrc = fs.readFileSync(babelrcPath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      babelrc = getBabelrcSkel(file);
      console.log('Creating a .babelrc in your project root');
      fs.writeFileSync(babelrcPath, babelrc);
    } else throw (e);
  }

  var hash = crypto.createHash('sha1').update(babelrc).digest('hex').substr(0, 7);
  var time = new Date().toTimeString();

  babelrc = JSON.parse(babelrc.replace(/\/\/.*\n/g, '\n')); // strip comments

  requirePluginsAndPresets(babelrc);
  if (babelrc.env)
    for (var key in babelrc.env)
      requirePluginsAndPresets(babelrc.env[key]);

  /*
   * Ok, close your mouth ;)  This is a small white lie and it really is where
   * .babelrc is from.  This lets us use the project's node_modules dir for
   * imports.
   */
  file._resourceSlot.packageSourceBatch.sourceRoot = PROJ_ROOT;

  // not great, but works.
  data = 'var babelrc = ' + JSON.stringify(babelrc, null, 2)
    .replace(/"require\(\\"([^"]+)\\"\).default"/g, 'require("$1").default')
    //+ ';\nmodule.exports = { default: babelrc };\n'
    + ';\nmodule.exports = '+JSON.stringify({default:babelrc,hash:hash,time:time})+';\n'
    + 'console.log("babelrc-importer-hack ' + hash + ' ' + time + '");';

  console.log('    babel-importer.js ' + hash + ' ' + time);
  file.addJavaScript({
    data: data,
    path: file.getPathInPackage() + '.js'
  });
}

function getBabelrcSkel(file) {
  /*
   * Ideally we'd like to load an asset included in this package, but when
   * this runs, it won't be ready yet.  We could alternatively handle this
   * in babelrc.js, but then we'd need to repeat a lot of code here.  For
   * now, we just directly load the file.
   */
  var packagePath = file._resourceSlot.packageSourceBatch.sourceRoot;

  // published package
  if (packagePath.match(/os\+web/))
    packagePath = path.normalize(packagePath +
      '/../os/packages/gadicc_babel-compiler-hot');

  return fs.readFileSync(path.join(packagePath, 'babelrc-skel'), 'utf8');
}
