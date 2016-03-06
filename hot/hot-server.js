hot = {
  col: new Mongo.Collection('__hot')
}

Meteor.publish('__hot', function() {
  var self = this;

  hot.col.find(
    { ctime: { $gt: Date.now() }},
    { fields: { _id: 1 }})
  .observe({
    added: function(doc) {
      self.added('__hot', doc._id, doc);
    }
  });

  this.ready();
});

WebApp.connectHandlers.use(function(req, res, next) {
  if (!req.url.match(/^\/hot.js/))
    return next();

  var hash = req.url.match(/\?hash=(.+)$/)[1];

  var bundle = hot.col.findOne(hash);
  if (!bundle) {
    console.warn('[gadicc:hot] client requested unknown bundle?');
    res.writeHead(404);
    res.end();
  }

  res.writeHead(200, {'Content-Type':'text/javascript'});
  res.end(bundle.contents, 'utf8');
});

Meteor.methods({
  '__hot.reload': function() {
    forceReload();
  }
});

var fs = Npm.require('fs');
var path = Npm.require('path');

var projRoot = process.cwd().substr(0,
  process.cwd().indexOf('/.meteor/local/build'));

var forceReloadFile = path.join(projRoot, 'client', 'hot-force-reload.js');

// XXX any better way to do this?
function forceReload() {
  fs.writeFileSync(forceReloadFile,
    '// Temporary measure to force a real reload\n' +
    'var UNIQUE = "' + Random.hexString(16) + '";\n');
  hot.col.remove({});
}
