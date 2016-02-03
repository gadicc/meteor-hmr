hot = {
  lastHash: {},
  bundles: {},
  orig: {}
};

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

  console.log('[hot] Creating a bundle for ' + bundle.length + ' change file(s)...');

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

/*
 * I'm pretty sure there's no way good way to communicate from a compiler plugin
 * to the actual app.  I did say hacky!
 */
var port = 3001; // TODO check in process.argv for -p and process.env for MONGO_URL
var url = 'mongodb://localhost:' + port + '/meteor';
var MongoClient = Npm.require('mongodb').MongoClient;
MongoClient.connect(url, function(err, db) {
  if (err) throw new Error(err);
  console.log("[hot] connected to db"); 
  hot.col = db.collection('__hot');

  hot.col.deleteMany({}, function(err) {
    if (err) console.log(err);
  });

  //db.close();  // XXX any good time to close?
});
