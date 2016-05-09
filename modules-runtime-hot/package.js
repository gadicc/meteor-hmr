Package.describe({
  name: "gadicc:modules-runtime-hot",
  // version: "0.6.3",    // core version, KEEP UPDATED
  version: "0.6.3_7",
  summary: 'Used by gadicc:ecmascript-hot',
  git: "https://github.com/benjamn/install",
  documentation: "README.md"
});

/*
Npm.depends({
  install: "0.6.1"    // core version, KEEP UPDATED
});
*/

Package.onUse(function(api) {
  // forces minimum supported Meteor version
  api.use('modules-runtime@0.6.3', 'server');

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
  api.use('underscore');
  api.addFiles([
    "hot/utils.js",
    "hot/main.js"
  ]);
  api.export('mhot'); // XXX

  api.addFiles("modules-runtime.js");
  api.export("meteorInstall");

  api.use('sanjo:meteor-files-helpers@1.2.0_1', 'server');
  api.use('package-version-parser', 'server');
  api.addFiles('hot/versionCheck.js', 'server');

  // hot
  api.versionsFrom('1.3-rc.4');
  api.use('webapp', 'server');
  api.use('meteorhacks:inject-initial@1.0.4', 'server');
  api.addFiles('hot/proxy.js', 'server');
});

Package.onTest(function(api) {
  api.use("tinytest");
  api.use("modules"); // Test modules-runtime via modules.
  api.addFiles("modules-runtime-tests.js");
});
