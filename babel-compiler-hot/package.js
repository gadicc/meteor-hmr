Package.describe({
  name: "gadicc:babel-compiler-hot",
  summary: "Parser/transpiler for ECMAScript 2015+ syntax",
  // Tracks the npm version below.  Use wrap numbers to increment
  // without incrementing the npm version.  Hmm-- Apparently this
  // isn't possible because you can't publish a non-recommended
  // release with package versions that don't have a pre-release
  // identifier at the end (eg, -dev)
  version: '6.4.0-modules.8'
});

Npm.depends({
  'meteor-babel': '0.7.2',
  'mongodb': '2.1.4',
  'babel-plugin-react-transform': '2.0.0'
});

Package.onUse(function (api) {
  api.addFiles([
    'hothacks.js',
    'babel.js',
    'babel-compiler.js'
  ], 'server');

  api.use('check@1.0.5');

  // hot
  api.use('random@1.0.5');
  api.use('underscore@1.0.0');

  api.export('Babel', 'server');
  api.export('BabelCompiler', 'server');
  // api.export('hot', 'server');
});
