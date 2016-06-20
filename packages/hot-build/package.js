Package.describe({
  name: 'gadicc:hot-build',
  version: '2.0.0-beta.6',
  summary: 'HMR for use by meteor build plugins',
  git: 'https://github.com/gadicc/meteor-hmr',
  documentation: 'README.md'
});

Npm.depends({
  'ws': '1.1.0',
  'arson': '0.2.3',
  //'meteor-hotload-accelerator': 'file:///home/dragon/www/meteor-react-hotloader/accelerator'
  'meteor-hotload-accelerator': '1.0.16' // <-- update top of ./acceleretor.js too!,
});

Package.onUse(function(api) {
  api.versionsFrom('1.3.3');

  api.use('random', 'server');
  api.use('underscore', 'server');
  api.use('gadicc:package-json@1.0.4', 'server');

  api.addFiles([
    'log.js',
    'hot-server.js',
    'accelerator.js'
  ], 'server');
  api.export('Hot', 'server');
});

/*
Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('hot');
  api.addFiles('hot-tests.js');
});
*/