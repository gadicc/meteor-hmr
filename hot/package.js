Package.describe({
  name: 'gadicc:hot',
  version: '0.0.23',
  summary: 'React hotloading, used by gadicc:ecmascript-hot.',
  git: 'https://github.com/gadicc/meteor-react-hotloader',
  documentation: '../README.md'
});

/*
Npm.depends({
  //'meteor-hotload-accelerator': 'file:///home/dragon/www/meteor-react-hotloader/accelerator',
  'meteor-hotload-accelerator': '0.0.8',
});
*/

Package.onUse(function(api) {
  api.versionsFrom('1.3-rc.4');

  api.use('modules');
  api.use('ecmascript');

  // this isn't used directly, but is used to pull in the package
  api.use('gadicc:modules-runtime-hot@0.6.3_5');
  api.use('modules-runtime', 'client');
  api.imply('modules-runtime', 'client');

  api.use('underscore', 'client');
  api.use('autoupdate', 'client');
  api.mainModule('client/index.js', 'client');

  api.mainModule('hot-server.js', 'server');
});

/*
Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('hot');
  api.addFiles('hot-tests.js');
});
*/