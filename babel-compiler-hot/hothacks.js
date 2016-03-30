hot = {
  lastHash: {},
  bundles: {},
  orig: {}
};

/*
 * No HMR in production with our current model (but ideally, in the future)
 */
if (process.env.NODE_ENV === 'production') {
  hot.process = function() {}
  hot.transformStateless = function(source) { return source; }
  // This also skips the Mongo connect.
  return;
}

function extractRequires(content) {
  var requires = [], match, re = /require\((['"]+)(.+)\1\)/g;
  while (match = re.exec(content)) {
    requires.push(match[2]);
  }
  return requires;
}

// Given an object and ['a', 'b'], returns a ref to { a: { b: THIS }}
function getSub(tree, array, i) {
  if (!i)
    i = 0;
  if (i === 0 && !array.length)
    return tree;
  if (!tree[array[i]])
    tree[array[i]] = {};
  if (i === array.length-1)
    return tree[array[i]];
  else
    return getSub(tree[array[i]], array, i+1);
}

// Given a bundle, output a "tree" in the format meteorInstall expects
function treeify(bundle) {
  var tree = {};
  bundle.forEach(function(file) {
    var path = file.path;
    if (file.packageName)
      path = 'node_modules/meteor/' + file.packageName + '/' + path;

    var dirs = path.split('/');
    var filename = dirs.pop();

    var sub = getSub(tree, dirs);
    var requires = extractRequires(file.data);

    sub[filename] = requires.concat(
      '__OF__' + file.data + '__CF__');
  });
  return tree;
}

hot.process = function(bundle) {
  var id = Random.hexString(40);
  hot.bundles[id] = bundle;
  hot.lastBundleId = id;

  // console.log('[gadicc:hot] Creating a bundle for ' + bundle.length + ' change file(s)...');

  var tree = treeify(bundle);
  var bundleStr = 'meteorInstallHot(' +
    JSON.stringify(tree).replace(/\"__OF__(.*?)__CF__\"/g, function(m, f) {
      return 'function(require,exports,module){' +
        f.replace(/\\n/g, '\n').replace(/\\"/g, '"') + '}';
    }) + ');\n';

  bundle.forEach(function(file) {
    // bundleStr += 'require("./' + file.path + '");\n';
  });

  // console.log(bundleStr);

  hot.col.insertOne({
    _id: id,
    ctime: Date.now(),
    contents: bundleStr
  }, function(err) {
    if (err) console.log(err);
  });
}

hot.transformStateless = function(source, path) {
  // Support MantraJS style stateless components, see README
  if (!source.match(/^import React/m) || !path.match(/jsx$/)) {
    return source;
  }

  // const MyComponent = (prop1, prop2) => ();
  source = source.replace(/\nconst ([^ ]+) = \((.*?)\) => \(([\s\S]+?)\n\);\n/g,
    function(match, className, args, code) {
      return '\nclass ' + className + ' extends React.Component {\n' +
        '  render() {\n' +
        (args ? '    const ' + args + ' = this.props;\n' : '') +
        '    return (' + code + ')\n' +
        '  }\n' +
        '}\n';
    });

  // const MyComponent = (prop1, prop2) => {};
  source = source.replace(/\nconst ([^ ]+) = \((.*?)\) => \{([\s\S]+?)\n\};\n/g,
    function(match, className, args, code) {
      if (!match.match(/return\s+\(\s*\</))
        return match;
      return '\nclass ' + className + ' extends React.Component {\n' +
        '  render() {\n' +
        (args ? '    const ' + args + ' = this.props;\n' : '') +
        '    ' + code + '\n' +
        '  }\n' +
        '}\n';
    });

  return source;
}

/*
 * Mongo code follows.
 *
 * I'm pretty sure there's no way good way to communicate from a compiler plugin
 * to the actual app.  I did say hacky!
 */

var path = Npm.require('path');
var fs = Npm.require('fs');

var portFile = path.join(projRoot, '.meteor', 'local', 'db', 'METEOR-PORT');
var port = parseInt(fs.readFileSync(portFile));

var url = process.env.MONGO_URL || 'mongodb://127.0.0.1:'+port+'/meteor';
var MongoClient = Npm.require('mongodb').MongoClient;

MongoClient.connect(url, function(err, db) {
  if (err) {
    console.error('[gadicc:hot] Failed to connect to your Mongo database ' +
      'on "' + url + '". Try MONGO_URL environment variable or "-p PORT" ' +
      'when running Meteor.');
    throw new Error(err);
  }

  // console.info("[gadicc:hot - babel-compiler-hot] connected to db"); 
  hot.col = db.collection('__hot');

  // on startup, delete bundles older than 10s
  hot.col.deleteMany({ ctime: { $lt: Date.now() - 10000 }}, function(err) {
    if (err) console.log(err);
  });

  process.on('exit', function() {
    db.close();
  });
});
