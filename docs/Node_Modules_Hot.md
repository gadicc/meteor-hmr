# node-modules-hot

Pain-free development of local node modules in your Meteor project.

## Features:

* Scans your app's `node_modules` for symlinks (e.g. from `npm link`)
* Watches all files in `src/*` for changes
* Compiles changed files with babel to `lib/*`
* Uses meteor-hmr to inject the update into your HMR-aware app

## Requirements:

Related to the features above, your package should be structure so that your source files live in `src`, your transpiled files live in and "main" field points to `lib`, and inside `node_modules`, your package name is a *symlink* to the real package (considering that you probably list `node_modules` in `.gitignore`, this is probably what you're doing already, via `npm link`).

We also expect babel to be an installed devDependency in your package (presumably already used by `npm run compile`).  Babel settings should *not* be part of your script, but rather inside a `.babelrc` or inside the `babel` section of your `package.json`.

Generally your package should follow the recommendations in http://jamesknelson.com/writing-npm-packages-with-es6-using-the-babel-6-cli/ (but with a `.babelrc` or settings in `package.json`, as above).

You can use any presets you like but in a Meteor project you should consider using just `babel-preset-meteor` (i.e. similar `.babelrc` to your Meteor app itself).

## Expect changes

Currently we run the babel bin from your package to compile changes files.  In the future, we'll switch to our own in-memory version, using the same version as used to compile Meteor files (since this will be much faster).  Hopefully won't break anything for your package, but something to be aware of.

## Installation

```sh
$ meteor add gadicc:node-modules-hot
```

If you're trying a pre-release or experimental version, you may need to append `@version` or `@=version` to the package name.
