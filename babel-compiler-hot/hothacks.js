var fs = Npm.require('fs');
var path = Npm.require('path');

// like in hot-server.js
var projRoot = process.cwd().substr(0,
  process.cwd().indexOf('/.meteor/local/build'));
var forceReloadFile = path.join(projRoot, 'client', 'hot-force-reload.js');

hot = {};

hot.reset = function() {
  hot.lastHash = {};
  hot.bundles = {};
  hot.orig = {};
};
hot.reset();

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
    var dirs = file.path.split('/');
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

  console.log('[gadicc:hot] Creating a bundle for ' + bundle.length + ' change file(s)...');

  var tree = treeify(bundle);
  var bundleStr = 'meteorInstallHot(' +
    JSON.stringify(tree).replace(/\"__OF__(.*?)__CF__\"/g, function(m, f) {
      return 'function(require,exports,module){' +
        f.replace(/\\n/g, '\n').replace(/\\"/g, '"') + '}';
    }) + ');\n';

  bundle.forEach(function(file) {
    bundleStr += 'require("./' + file.path + '");\n';
  });

  // console.log(bundleStr);

  hot.col.insertOne({
    _id: id,
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

  source = source.replace(/import React from 'react';/,
    "import React, { Component } from 'react';");

  source = source.replace(/\nconst ([^ ]+) = \((.*?)\) => \(([\s\S]+?)\n\);\n/g,
    function(match, className, args, code) {
      return 'class ' + className + ' extends Component {\n' +
        '  render() {\n' +
        (args ? '    const ' + args + ' = this.props;\n' : '') +
        '    return (' + code + ')\n' +
        '  }\n' +
        '}';
    });

  return source;
}

/*
 * I'm pretty sure there's no way good way to communicate from a compiler plugin
 * to the actual app.  I did say hacky!
 */

var portIndex = process.argv.indexOf('-p');
var port = portIndex === -1 ? 3001 : parseInt(process.argv[portIndex+1]) + 1;
var url = process.env.MONGO_URL || 'mongodb://localhost:'+port+'/meteor';
var MongoClient = Npm.require('mongodb').MongoClient;

MongoClient.connect(url, function(err, db) {
  if (err) {
    console.error('[gadicc:hot] Failed to connect to your Mongo database ' +
      'on "' + url + '". Try MONGO_URL environment variable or "-p PORT" ' +
      'when running Meteor.');
    throw new Error(err);
  }

  // console.debug("[gadicc:hot - babel-compiler-hot] connected to db"); 
  hot.col = db.collection('__hot');

  // delete bundles from previous run (i.e. only track changes for this run)
  hot.col.deleteMany({}, function(err) {
    if (err) console.log(err);
  });

  process.on('exit', function() {
    db.close();
  });
});

/*
 * Because this happens during the build process, it won't trigger
 * a rebuild.
 */

hot.removeForceReloadJs = function() {
  fs.unlink(forceReloadFile);
}