Package.describe({
  // Had to change the name to prevent people on older versions doing a deep
  // `meteor update` and this not working with older versions of
  // ecmacsript-hot.  Unfortunately no SEMVER with _wrapped packages.
  name: "gadicc:babel-compiler-babelrc",
  // version: '6.6.4'    // core version, KEEP UPDATED
  version: '6.6.4_2',
  summary: 'babel-compiler with babelrc support',
  git: 'https://github.com/gadicc/meteor-react-hotloader',
  documentation: 'README.md'
});

Npm.depends({
  //'meteor-babel': '0.9.2',  // core version, KEEP UPDATED
  //'meteor-babel': 'file:///home/dragon/www/npm/gadicc-meteor-babel',
  'meteor-babel': 'https://github.com/gadicc/babel/tarball/94c32b8ac5949f92f9073ba78cc08655b36ae8fa',
  'json5': '0.5.0',
  'mkdirp': '0.5.1'
});

Package.onUse(function (api) {
  api.use('tmeasday:check-npm-versions@0.3.1', 'server');

  api.addFiles([
    'babelrc.js',
    'babel.js',
    'babel-compiler.js'
  ], 'server');

  api.addAssets('babelrc-skel', 'server');

  api.export('Babel', 'server');
  api.export('BabelCompiler', 'server');
});
