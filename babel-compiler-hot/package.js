Package.describe({
  name: "gadicc:babel-compiler-hot",
  // version: '6.5.0-beta.12'    // core version, KEEP UPDATED
  version: '0.0.5-beta.12',
  summary: 'React hotloading, used by gadicc:ecmascript-hot.',
  git: 'https://github.com/gadicc/meteor-react-hotloader',
  documentation: 'README.md'
});

Npm.depends({
  'meteor-babel': '0.8.0',
  'mongodb': '2.1.4',
  'babel-plugin-react-transform': '2.0.0'
});

Package.onUse(function (api) {
  api.addFiles([
    'hothacks.js',
    'babel.js',
    'babel-compiler.js'
  ], 'server');

  api.use('check@1.1.0');

  // hot
  api.use('random@1.0.5');
  api.use('underscore@1.0.0');

  api.export('Babel', 'server');
  api.export('BabelCompiler', 'server');
  // api.export('hot', 'server');
});
