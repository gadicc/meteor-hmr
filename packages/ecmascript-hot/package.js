Package.describe({
  name: 'gadicc:ecmascript-hot',
  // version: '0.4.4-rc.4'    // core version, KEEP UPDATED
  version: '2.0.0-beta.6',
  summary: 'Replacement ecmascript package providing react hotloading',
  git: 'https://github.com/gadicc/meteor-hmr',
  documentation: 'README.md'
});

Package.registerBuildPlugin({
  name: 'compile-ecmascript-hot',
  use: ['babel-compiler', 'gadicc:hot-build@2.0.0-beta.6'],
  sources: ['plugin.js']
});

Package.onUse(function (api) {
  // hopefully covers version constaint on ecmascript
  // we can't use() this file directly else we get an extension conflict.
  api.versionsFrom('1.3.3');

  api.use('isobuild:compiler-plugin@1.0.0');
  api.use('babel-compiler');

  // The following api.imply calls should match those in
  // ../coffeescript/package.js.
  api.imply('modules');
  api.imply('ecmascript-runtime');
  api.imply('babel-runtime');
  api.imply('promise');

  api.use('gadicc:hot@2.0.0-beta.3');
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
