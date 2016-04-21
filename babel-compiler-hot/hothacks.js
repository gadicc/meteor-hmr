/*
 * This evalutes to true if we're running as a server package (vs a build
 * plugin inside of meteor-tool).
 */
if (process.env.APP_ID) {
//  Meteor.settings.public.HOT_PORT = parseInt(process.env.HOT_PORT);
  return;
}

/*
 * The rest of the code in this file only runs as build plugin.
 * CODE BELOW THIS POINT SURVIVES A SERVER RELOAD.
 */

var fs = Npm.require('fs');
var path = Npm.require('path');
// var Accelerator = Npm.require('meteor-hotload-accelerator').default;

hot = {
  lastHash: {},
  bundles: {},
  orig: {}
};

var packageJsonPath = path.join(projRoot, 'package.json');
var pkg = JSON.parse(fs.readFileSync(packageJsonPath));
var pkgSettings = pkg['ecmascript-hot'];
var tsSettings, tsPathMatch, tsSourceMatch;
var babelEnvForTesting;

function updateSettings() {
  // transformStateless
  tsSettings = pkgSettings && pkgSettings.transformStateless;
  tsPathMatch = tsSettings && tsSettings.pathMatch
    ? toRegExp(tsSettings.pathMatch) : /\.jsx$/;
  tsSourceMatch = tsSettings && tsSettings.sourceMatch
    ? toRegExp(tsSettings.sourceMatch) : /^import React/m;

  // babelEnvForTesting
  if (pkgSettings && pkgSettings.babelEnvForTesting)
    babelEnvForTesting = pkgSettings.babelEnvForTesting === 'default'
      ? null : pkgSettings.babelEnvForTesting;
  else
    babelEnvForTesting = 'production';

  // use for babel cache hash since babel output depends on these settings
  babelOtherDeps.ecmaHotPkgJson = pkgSettings;
}

updateSettings();

if (pkgSettings) {
  fs.watch(packageJsonPath, function() {
    var oldPkgSettings = pkgSettings;

    packageJsonPath = path.join(projRoot, 'package.json');
    pkg = JSON.parse(fs.readFileSync(packageJsonPath));
    pkgSettings = pkg['ecmascript-hot'];

    if (JSON.stringify(oldPkgSettings) !== JSON.stringify(pkgSettings)) {

      console.log('\n[gadicc:hot] package.json\'s `ecmascript-hot` section '
        + 'was modified, please restart Meteor.');
      process.exit();
      return;

      // FOR THE BELOW CODE TO WORK WE NEED TO GET METEOR TO REBUILD ALL EXISTING
      // FILES, SO UNTIL WE CAN DO THAT, JUST EXIT.

      console.log('\n[gadicc:hot] package.json\'s `ecmascript-hot` section '
        + 'modified, updating...');

      updateSettings();

        // Note, this assumes that that accelerator will
        //   1. not perform any init actions (true in 0.0.2)
        //   2. store this data in a way that will be re-used (true in 0.0.2)
        fork.send({
          type: 'initPayload',
          data: {
            babelrc: babelrc,
            pkgSettings: pkgSettings
          }
        });

    }
  });
}

/*
 * No HMR in production with our current model (but ideally, in the future)
 * nor in test mode (note, no Meteor.isTest in a build plugin; and the test
 * below will only be true inside of a build plugin in test mode.
 */
if (process.env.NODE_ENV === 'production'
    || process.argv[2] === 'test' || process.argv[2] === 'test-packages') {
  var noop = function() {};
  hot.process = noop;
  hot.forFork = noop;
  hot.transformStateless = function(source) { return source; }

  if (babelEnvForTesting)
    process.env.BABEL_ENV = babelEnvForTesting;

  // This also skips loading the Accelereator.
  return;
}

function toRegExp(input) {
  if (typeof input === 'string')
    return new RegExp(input);
  else if (Object.prototype.toString.call(input) === '[object Array]')
    return new RegExp(input[0], input[1]);
  else
    throw new Error("Don't know how to interpret pattern", input);
}

hot.transformStateless = function(source, path) {
  if (!(source.match(tsSourceMatch) && path.match(tsPathMatch))) {
    return source;
  }

  // const MyComponent = ({prop1, prop2}) => ();
  // const MyComponent = (props) => ();
  // const MyComponent = (props, context) => ();  TODO context
  source = source.replace(/\nconst ([A-Z][^ ]*) = \((.*?)\) => \(([\s\S]+?)(\n\S+)/g,
    function(match, className, args, code, rest) {
      if (rest !== '\n);')
        return match;
      return '\nclass ' + className + ' extends React.Component {\n' +
        '  render() {\n' +
        (args ? '    const ' + args + ' = this.props;\n' : '') +
        '    return (' + code + ')\n' +
        '  }\n' +
        '}\n';
    });

  // const MyComponent = (prop1, prop2) => { return ( < ... > ) };
  source = source.replace(/\nconst ([A-Z][^ ]*) = \((.*?)\) => \{([\s\S]+?)(\n\S+)/g,
    function(match, className, args, code, rest) {
      if (rest !== '\n};' || !code.match(/return\s+\(\s*\</))
        return match;
      return '\nclass ' + className + ' extends React.Component {\n' +
        '  render() {\n' +
        (args ? '    const ' + args + ' = this.props;\n' : '') +
        '    ' + code + '\n' +
        '  }\n' +
        '}\n';
    });

  return source;
}

