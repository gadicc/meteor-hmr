/*
 * See also:
 *
 *   * https://forums.meteor.com/t/meteor-1-3-and-babel-options/15275
 *   * https://github.com/meteor/meteor/issues/6351
 */ 

/*
 * Needed in core:
 *
 *   * Add .babelrc to watchlist
 *
 * TODO here
 *
 *   * {babelrc:false} also disables .babelignore, but that should be fine
 *     since we hand pick the files to compile anyway.
 *
 */

var meteorBabel = Npm.require('meteor-babel');
var skeleton = Assets.getText('babelrc-skel');
var babelrc = meteorBabel.babelrcImport(skeleton);

mergeBabelrcOptions = function(options) {
  /*
   * Append arrays
   */
  var arrays = ['presets', 'plugins'];
  _.each(arrays, function(key) {
    _.each(babelrc[key], function(val) {
      options[key].push(val);
    })
  });

  if (babelrc.env)
    options.env = babelrc.env;
}
