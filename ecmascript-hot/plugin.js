var hot = new Hot({
  uses: [ 'babel-compiler' ]
});

Plugin.registerCompiler({
  extensions: ['js', 'jsx'],
}, function () {
  var compiler = new BabelCompiler({
    react: true
  });

  return hot.wrap(compiler);
});
