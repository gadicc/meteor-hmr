Package.describe({
  name: 'gadicc:hot-build',
  version: '0.0.10',
  summary: 'React hotloading, used by gadicc:ecmascript-hot.',
  git: 'https://github.com/gadicc/meteor-react-hotloader',
  documentation: '../README.md'
});

Npm.depends({
  // 'meteor-hotload-accelerator': 'file:///home/dragon/www/meteor-react-hotloader/accelerator',
  'meteor-hotload-accelerator': '1.0.8'
});

Package.onUse(function(api) {
  api.versionsFrom('1.3-rc.4');

  api.use('random', 'server');
  api.use('underscore', 'server');
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