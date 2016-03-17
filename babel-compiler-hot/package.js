Package.describe({
  name: "gadicc:babel-compiler-hot",
  // version: '6.5.1-rc.1'    // core version, KEEP UPDATED
  version: '0.0.7-babel.0',
  summary: 'React hotloading, used by gadicc:ecmascript-hot.',
  git: 'https://github.com/gadicc/meteor-react-hotloader',
  documentation: 'README.md'
});

Npm.depends({
  'meteor-babel': '0.8.2',
  'mongodb': '2.1.4'
//  'babel-plugin-react-transform': '2.0.0'
});

Package.registerBuildPlugin({
  name: 'babelrc-plugin-preset-importer',
  use: [ 'underscore', 'modules' ],
  sources: ['babelrc-importer.js']
});

Package.onUse(function (api) {
  api.addFiles([
    'babelrc-importer-hack',
    'hothacks.js',
    'babelrc.js',
    'babel.js',
    'babel-compiler.js'
  ], 'server');

  api.addAssets('babelrc-skel', 'server');

  api.use('check@1.1.0');

  // hot
  api.use('random@1.0.5');
  api.use('underscore@1.0.0');

  api.use('modules@0.5.1-rc.1');
  api.use('isobuild:compiler-plugin@1.0.0')

  api.export('Babel', 'server');
  api.export('BabelCompiler', 'server');
  // api.export('hot', 'server');
});
