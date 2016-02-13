Package.describe({
  name: "gadicc:modules-runtime-hot",
  version: "0.0.1-modules.7",
  // summary: "CommonJS module system",
  summary: 'Used by gadicc:ecmascript-hot',
  git: "https://github.com/benjamn/install",
  documentation: "README.md"
});

/*
Npm.depends({
  install: "0.4.2"
});
*/

Package.onUse(function(api) {
  api.addFiles(
    // ".npm/package/node_modules/install/install.js",
    'install-hot.js',
  [
    "client",
    "server"
  ], {
    bare: true
  });

  // hot
  api.addFiles("modules-runtime-hot.js");
  api.export('mhot'); // XXX
  api.use('underscore');

  api.addFiles("modules-runtime.js");
  api.export("meteorInstall");

  // hot
  api.versionsFrom('1.3-modules-beta.7');
  api.use('webapp', 'server');
  api.addFiles('modules-runtime-proxy.js', 'server');
});

Package.onTest(function(api) {
  api.use("tinytest");
  api.use("modules"); // Test modules-runtime via modules.
  api.addFiles("modules-runtime-tests.js");
});
