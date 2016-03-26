/*
 * See also:
 *
 *   * https://forums.meteor.com/t/meteor-1-3-and-babel-options/15275
 *   * https://github.com/meteor/meteor/issues/6351
 */ 

/*
 * Needed in core:
 *
 *   * Add .babelrc to watchlist, handle more gracefully.
 *   * meteor-babel needs ability for custom cache hash deps (will submit PR)
 *
 * TODO here
 *
 *   * {babelrc:false} also disables .babelignore, but that should be fine
 *     since we hand pick the files to compile anyway.
 *
 */

var fs = Npm.require('fs');
var path = Npm.require('path');
var crypto = Npm.require('crypto');
// var JSON5 = Npm.require('json5');  now from 'json5' package on atmosphere

// XXX better way to do this?
var projRoot = process.cwd();
while (projRoot && !fs.existsSync(path.join(projRoot, '.meteor')))
  projRoot = path.normalize(path.join(projRoot, '..'));
if (!projRoot)
  throw new Error("Are you running inside a Meteor project dir?");

var babelrcPath = path.join(projRoot, '.babelrc');
var babelrc, babelrcRaw, babelrcHash;

if (fs.existsSync(babelrcPath)) {
  babelrcRaw = fs.readFileSync(babelrcPath);
} else {
  console.log('Creating ' + babelrcPath);
  babelrcRaw = Assets.getText('babelrc-skel');
  fs.writeFileSync(babelrcPath, babelrcRaw);
}

babelrcHash = crypto.createHash('sha1').update(babelrcRaw).digest('hex');

try {
  babelrc = JSON5.parse(babelrcRaw);
} catch (err) {
  console.log("Error parsing your .babelrc: " + err.message);
  process.exit(); // could throw err if .babelrc was in meteor's file watcher
}

if (!babelrc.presets || babelrc.presets.indexOf('meteor') === -1) {
  console.log('Your .babelrc must include at least { "presets": [ "meteor" ] }');
  process.exit(); // could throw err if .babelrc was in meteor's file watcher
}

/*
 * Wow, in the end, this is all we need and babel does the rest in
 * the right way.
 */
mergeBabelrcOptions = function(options) {
  options.extends = babelrcPath;
  return {
    babelrcHash: babelrcHash,
    // Because .babelrc may contain env-specific configs
    NODE_ENV: process.env.NODE_ENV
  };
}

/*
 * Quit on .babelrc change (need to rebuild all files through babel).
 */
fs.watchFile(babelrcPath, function(event) {
  console.log("Your .babelrc was changed, please restart Meteor.");
  process.exit();
});
