Package.describe({
  name: 'gadicc:node-modules-hot',
  version: '2.0.0-beta.6',
  summary: 'Watching, compilation and hotloading for local node-modules',
  git: 'https://github.com/gadicc/meteor-hmr',
  documentation: 'README.md'
});

Package.registerBuildPlugin({
  name: 'node-modules-hot',
  use: [
    'sanjo:meteor-files-helpers@1.2.0_1',
    'gadicc:hot-build@2.0.0-beta.6',
    'underscore@1.0.0'
  ],
  npmDependencies: {
    'recursive-readdir': '2.0.0',
    'stat-mode': '0.2.1'
  },  
  sources: ['plugin.js']
});

Package.onUse(function(api) {
  api.use('isobuild:compiler-plugin@1.0.0');
  api.use('gadicc:hot@2.0.0-beta.3');
});