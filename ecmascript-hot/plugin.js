Plugin.registerCompiler({
  extensions: ['js', 'jsx'],
}, function () {
  console.log('start ecma plug');
  var x = new BabelCompiler({
    react: true
  });
  console.log('end ecma plug');
  return x;
});
