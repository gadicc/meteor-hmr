Package.describe({
  name: "gadicc:babel-compiler-hot",
  // version: '6.5.2-rc.4'    // core version, KEEP UPDATED
  version: '0.0.12-rc.3',
  summary: 'React hotloading, used by gadicc:ecmascript-hot.',
  git: 'https://github.com/gadicc/meteor-react-hotloader',
  documentation: 'README.md'
});

Npm.depends({
  //'meteor-babel': '0.8.3',  // core version, KEEP UPDATED
  //'meteor-babel': 'file:///home/dragon/www/npm/gadicc-meteor-babel',
  'meteor-babel': 'https://github.com/gadicc/babel/tarball/da35c943be5ef7d6d7f90f1f9b85a49965335723',
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
