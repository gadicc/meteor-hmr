hot = {
  col: new Mongo.Collection('__hot')
}

Meteor.subscribe('__hot');

Meteor.startup(function() {
  hot.col.find().observe({
    added: function(doc) {
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = '/hot.js?hash=' + doc._id;
      document.head.appendChild(script);
    }
  });
});

var root = meteorInstall._expose();

/// XXX
var stuff = {};
window.x = stuff;

meteorInstallHot = function(tree) {
  stuff.tree = tree;
  console.log('got bundle', tree);
}