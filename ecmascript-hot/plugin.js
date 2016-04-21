var crypto = Npm.require('crypto');

// This *must* match the name of your package
var hot = new Hot('gadicc:ecmascript-hot');

Plugin.registerCompiler({
  extensions: ['js', 'jsx'],
}, function () {
  var compiler = new BabelCompiler({
    react: true
  });

  // First compile takes ages (probably from loading all the plugins),
  // so let's just get it out the way.
  //
  // Regrettably this polutes the disk, perhaps we should compute the
  // hash ourselves and unlink; would require utils.deepHash and
  // meteorBabelVersion.
  compiler._hotInitFakeCompile = function() {
    var fakeFile = {
      getContentsAsString: function() { return "import React from 'react'\n"; },
      getPackageName: function() { return null; },
      getPathInPackage: function() { return 'gadicc-cachebuster.js'; },
      getFileOptions: function() { return {}; },
      getArch: function() { return 'web.browser'; },
      getSourceHash: function() { return crypto.randomBytes(20).toString('hex'); },
      addJavaScript: function() { },
      error: function(err) { console.log(err); }
    };
    this.processFilesForTarget([fakeFile]);
  }

  // Wrap your compiler before returning
  return hot.wrap(compiler);
});

/*
 * In theory, if we were to reproduce all of Meteor's file rules, we could
 * avoid the need to wrap the compiler at all.
 */