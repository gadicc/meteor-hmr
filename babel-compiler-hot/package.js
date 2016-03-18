Package.describe({
  name: "gadicc:babel-compiler-hot",
  // version: '6.5.1-rc.2'    // core version, KEEP UPDATED
  version: '0.0.8-rc.2',
  summary: 'React hotloading, used by gadicc:ecmascript-hot.',
  git: 'https://github.com/gadicc/meteor-react-hotloader',
  documentation: 'README.md'
});

Npm.depends({
  //'meteor-babel': '0.8.2',  // KEEP UPDATED if tarball is against a different version
  'meteor-babel': 'https://github.com/gadicc/babel/tarball/5439e2ac422237e3c8eb57befedcb9f5eda9a916',
  'mongodb': '2.1.4'
//  'babel-plugin-react-transform': '2.0.0'
});

Package.onUse(function (api) {
  api.addFiles([
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

  api.export('Babel', 'server');
  api.export('BabelCompiler', 'server');
  // api.export('hot', 'server');
});
