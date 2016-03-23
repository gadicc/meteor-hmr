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

  hot.col._collection.rawCollection()
    .findOne({ _id: hash }, function(err, bundle) {
      if (err) {
        throw err;
      }

      if (!bundle) {
        console.warn('[gadicc:hot] client requested unknown bundle?');
        res.writeHead(404);
        res.end();
      }

      res.writeHead(200, {'Content-Type':'text/javascript'});
      res.end(bundle.contents, 'utf8');

    });
});
