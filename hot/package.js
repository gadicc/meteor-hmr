Package.describe({
  name: 'gadicc:hot',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.3-modules-beta.7');

  api.use('modules');
  api.use('ecmascript');
  api.use('mongo');
  api.use('underscore', 'client');
  api.use('webapp', 'server');

  // make sure we're loaded after modules-runtime & before global-imports, app
  api.use('modules-runtime', 'client')

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