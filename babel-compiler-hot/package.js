// publish with 1.2.1 works
// publish with 1.3 thinks its binary?
// i did rm -rf .npm though

Package.describe({
  name: "gadicc:babel-compiler-hot",
  // version: '6.6.4'    // core version, KEEP UPDATED
  // version: '6.6.1_1',
  version: '6.6.2-beta.14',
  summary: 'React hotloading, used by gadicc:ecmascript-hot.',
  git: 'https://github.com/gadicc/meteor-react-hotloader',
  documentation: 'README.md'
});

Npm.depends({
  // DONT FORGET TO UPDATE `meteor-babel in meteor-hotload-accelerator` TOO!
  //'meteor-babel': '0.9.2',  // core version, KEEP UPDATED
  //'meteor-babel': 'file:///home/dragon/www/npm/gadicc-meteor-babel',
  'meteor-babel': 'https://github.com/gadicc/babel/tarball/94c32b8ac5949f92f9073ba78cc08655b36ae8fa',
  'mkdirp': '0.5.1'
});

Package.onUse(function (api) {
  api.addFiles([
    'babelrc.js',
    'hothacks.js',
    'babel.js',
    'babel-compiler.js'
  ], 'server');

  // hot
  api.addAssets([
    'babelrc-skel',
    'babelrc-client-skel'
  ], 'server');
  api.versionsFrom('1.3.1');
  api.use([
    'random',
    'underscore',
    'gadicc:json5@0.5.0-0',
    'tmeasday:check-npm-versions@0.3.0',
  ], 'server');

  api.export('Babel', 'server');
  api.export('BabelCompiler', 'server');
  // api.export('hot', 'server');
});
