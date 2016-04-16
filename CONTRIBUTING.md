# Contributing to ecmascript-hot

**For now, all development is happening on the master branch.  When things slow down or I get more time, there will be a separate master and devel branch.  Future releases will be tagged with the version used in the `ecmascript-hot` package**

## Getting setup

Clone the repo (or your fork) and symlink the `*hot` packages (`babel-compiler-hot`, `ecmascript-hot`, `hot`, `modules-runtime-hot`) into your Meteor project's `packages` dir, i.e.:

```bash
$ git clone https://github.com/gadicc/meteor-react-hotloader
$ ln -s .../meteor-react/hotloader/*hot .../meteorProject/packages
```

Inside of your project's `packages` directory, they will be used instead of the released versions downloaded with Meteor, regardless of whatever version you were currently using.  Therefore, be conscious of any version constraints in your app or packages.

## Release Versions

The release version of this project is the version from the `ecmascript-hot` package.  A stable release will wrap the Meteor version it's intended to be used with, so `gadicc:ecmascript-hot@1.3.1_1` is the first release we've made for Meteor 1.3.1.  Unfortunately we also need to be linked quite closely to the Meteor version because we are replacing core packages.

On the other hand, `babel-compiler-hot` and `modules-runtime-hot` will wrap the versions of those packages they replace, and `hot` has a normal version number.

### Test and experimental releases

Probably you want to specify a specific release explicitly, i.e. `gadicc:ecmascript-hot@=1.3.1-fast.9` (note the `@=`).  Usually in other Meteor packages we'll bump the major version first, which makes things a bit easier.  For wrapper packages, however, this is not possible, as we want to remain tied to the Meteor release we're wrapping.

### What should work in a release

Currently there's no automated testing, as writing tests for a lot of what this package does would be quite complicated.  For now there are just a few things we must check before announcing a new release:

* Hotloading (and thus .babelrc) works in:

  * App with local packages (e.g. during package devel)
  * App with downloadded packages (e.g. typical user usage)
  * App builds and the build runs (e.g. for deployment)

In theory we should also check that all the different NODE_ENV setups etc work.

## Working on the Accelerator

If you need to edit code from the accelerator, you should adjust `babel-compiler-hot`'s `package.js` to `Npm.depend()` on your local files.  You'll see an example commented out above the currently published version which I use for my home dir and you can adjust accordingly.

## Styling / linting

Coming soon :)

