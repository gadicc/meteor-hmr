Package.describe({
  name: "gadicc:babel-compiler-hot",
  // version: '6.5.1-rc.2'    // core version, KEEP UPDATED
  version: '0.0.10-rc.2',
  summary: 'React hotloading, used by gadicc:ecmascript-hot.',
  git: 'https://github.com/gadicc/meteor-react-hotloader',
  documentation: 'README.md'
});

Npm.depends({
  //'meteor-babel': '0.8.2',
  //'meteor-babel': 'file:///home/dragon/www/npm/gadicc-meteor-babel',
  'meteor-babel': 'https://github.com/gadicc/babel/tarball/b9ae6407f949ce66a9cad522056a8bb4f4f7f1af',
  'mongodb': '2.1.4'
});

Package.onUse(function (api) {
  api.addFiles([
    'hothacks.js',
    'babelrc.js',
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
