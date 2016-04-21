// This *must* match the name of your package
var hot = new Hot('gadicc:ecmascript-hot');

Plugin.registerCompiler({
  extensions: ['js', 'jsx'],
}, function () {
  var compiler = new BabelCompiler({
    react: true
  });

  // Wrap your compiler before returning
  return hot.wrap(compiler);
});

/*
 * In theory, if we were to reproduce all of Meteor's file rules, we could
 * avoid the need to wrap the compiler at all.
 */