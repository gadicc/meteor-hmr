Package.describe({
  name: 'gadicc:ecmascript-hot',
  // version: '0.4.3'    // core version, KEEP UPDATED
  // version: '1.3.1_1',
  version: '2.0.0-rc.0',
  summary: 'Replacement ecmascript package providing react hotloading',
  git: 'https://github.com/gadicc/meteor-react-hotloader',
  documentation: '../README.md'
});

Package.registerBuildPlugin({
  name: 'compile-ecmascript-hot',
  use: ['gadicc:babel-compiler-babelrc', 'gadicc:hot-build'],
  sources: ['plugin.js']
});

Package.onUse(function (api) {
  // hopefully covers version constaint on ecmascript
  // we can't use() this file directly else we get an extension conflict.
  api.versionsFrom('1.3.2');

  api.use('isobuild:compiler-plugin@1.0.0');
  api.use('gadicc:babel-compiler-babelrc@6.6.4_3');
  api.use('gadicc:hot-build@2.0.0-rc.0'); // REQUIRES NPM PUBLISH + BUMP BEFORE RC0

  api.imply('modules');
  api.imply('ecmascript-runtime');
  api.imply('babel-runtime');
  api.imply('promise');

  api.use('gadicc:hot@2.0.0');
  api.imply('gadicc:hot');

  api.use('sanjo:meteor-files-helpers@1.2.0_1', 'server');
  api.use('package-version-parser', 'server');
  api.addFiles('hotVersionCheck.js', 'server');

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
});
