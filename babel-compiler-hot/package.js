// publish with 1.2.1 works
// publish with 1.3 thinks its binary?
// i did rm -rf .npm though

Package.describe({
  name: "gadicc:babel-compiler-hot",
  // version: '6.5.2'    // core version, KEEP UPDATED
  version: '6.5.2_5',
  summary: 'React hotloading, used by gadicc:ecmascript-hot.',
  git: 'https://github.com/gadicc/meteor-react-hotloader',
  documentation: 'README.md'
});

Npm.depends({
  //'meteor-babel': '0.8.3',  // core version, KEEP UPDATED
  //'meteor-babel': 'file:///home/dragon/www/npm/gadicc-meteor-babel',
  'meteor-babel': 'https://github.com/gadicc/babel/tarball/0f5519e0b6267cd11ac5e9140fe46aac260d038d',
  'mongodb': '2.1.4'
});

Package.onUse(function (api) {
  api.addFiles([
    'babelrc.js',
    'hothacks.js',
    'babel.js',
    'babel-compiler.js'
  ], 'server');

  api.addAssets('babelrc-skel', 'server');
  api.addAssets('babelrc-client-skel', 'server');

  api.use('check@1.1.0');

  // hot
  api.use('random@1.0.5');
  api.use('underscore@1.0.0');
  api.use('gadicc:json5@0.5.0-0');

  api.export('Babel', 'server');
  api.export('BabelCompiler', 'server');
  // api.export('hot', 'server');
});
