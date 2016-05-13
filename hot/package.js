Package.describe({
  name: 'gadicc:hot',
  version: '2.0.0',
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
  api.use('gadicc:modules-runtime-hot@0.6.3_7');
  api.use('modules-runtime', 'client');
  api.imply('modules-runtime', 'client');

  api.use('underscore', 'client');
  api.use('autoupdate', 'client');
  api.mainModule('client/index.js', 'client');

  api.mainModule('hot-server.js', 'server');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('http', 'server');
  api.use('gadicc:hot', 'client');
//  api.use('pete:jsdom@0.0.2', 'server');
  api.use('practicalmeteor:mocha@2.4.5_2');
  api.addFiles('hot-tests.js', 'server');
});
