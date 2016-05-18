Package.describe({
  name: 'gadicc:ecmascript-babelrc',
  version: '0.4.3_4',
  summary: 'Compiler plugin that supports ES2015+ in all .js files',
  documentation: 'README.md'
});

Package.registerBuildPlugin({
  name: 'compile-ecmascript',
  use: ['gadicc:babel-compiler-babelrc'],
  sources: ['plugin.js']
});

Package.onUse(function (api) {
  api.versionsFrom('1.3.2');
  api.use('isobuild:compiler-plugin@1.0.0');
  api.use('gadicc:babel-compiler-babelrc@6.6.4_5');

  api.imply('modules');
  api.imply('ecmascript-runtime');
  api.imply('babel-runtime');
  api.imply('promise');

  api.addFiles("ecmascript.js", "server");
  api.export("ECMAScript", "server");
});

Package.onTest(function (api) {
  api.use(["tinytest", "underscore"]);
  api.use(["es5-shim", "ecmascript", "babel-compiler"]);
  api.addFiles("runtime-tests.js");
  api.addFiles("transpilation-tests.js", "server");

  api.addFiles("bare-test.js");
  api.addFiles("bare-test-file.js", ["client", "server"], {
    bare: true
  });
  api.addFiles("shell-tests.js", 'server');
});
