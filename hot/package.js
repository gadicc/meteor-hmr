Package.describe({
  name: 'gadicc:hot',
  version: '0.0.2',
  summary: 'React hotloading, used by gadicc:ecmascript-hot.',
  git: 'https://github.com/gadicc/meteor-react-hotloader',
  documentation: '../README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.3-modules-beta.7');

  api.use('modules');
  api.use('ecmascript');
  api.use('mongo');
  api.use('underscore', 'client');
  api.use('webapp', 'server');

  // make sure we're loaded after modules-runtime & before global-imports, app
  //api.use('modules-runtime', 'client')

  // this isn't used directly, but is used to pull in the package
  api.use('gadicc:modules-runtime-hot@0.0.1-modules.7');

  // until https://github.com/benjamn/install/pull/6
  //api.addAssets('modules-runtime-hot.js', 'server');
  //api.addFiles('replace-modules-runtime.js', 'server');

  api.addFiles('hot-client.js', 'client');
  api.addFiles('hot-server.js', 'server');

  api.export('meteorInstallHot', 'client');
});

/*
Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('hot');
  api.addFiles('hot-tests.js');
});
*/