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

// XXX better way to do this?
var projRoot = process.cwd();
while (projRoot && !fs.existsSync(path.join(projRoot, '.meteor')))
  projRoot = path.normalize(path.join(projRoot, '..'));
if (!projRoot)
  throw new Error("Are you running inside a Meteor project dir?");

var babelrcPath = path.join(projRoot, '.babelrc');
var babelrcExists = fs.existsSync(babelrcPath);     // once on load
var userBabelrcHash;

/*
 * meteor-babel 
 */
if (babelrcExists) {
  userBabelrcHash = crypto.createHash('sha1')
    .update(fs.readFileSync(babelrcPath))
    .digest('hex');
}

/*
 * Wow, in the end, this is all we need and babel does the rest in
 * the right way.
 */
mergeBabelrcOptions = function(options) {
  if (babelrcExists) {
    options.extends = babelrcPath;
    return userBabelrcHash;
  }
}

/*
 * Quit on .babelrc change (need to rebuild all files through babel).
 * We purposefully watch even if the file doesn't exist, to quit if it's
 * created too.
 */
fs.watchFile(babelrcPath, function(event) {
  console.log("Your .babelrc was changed, please restart Meteor.");
  process.exit();
});
