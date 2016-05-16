# meteor-hmr

*Hot Module Replacement (HMR) for Meteor*

**NB: This README refers to the upcoming release.  Although it's experimental, you're encouraged to try it out, since that's the direction we're going in.  More details in [#51](https://github.com/gadicc/meteor-react-hotloader/issues/51).  Otherwise, you can find the old README [here](https://github.com/gadicc/meteor-react-hotloader/blob/1352a7a0335ebeab3684ca8fdd096c2b5749da05/README.md).**

* Edit your react components and see changes instantly, while maintaining state.
* Catch react `render()` errors and show on your screen rather than crashing your app.
* Add your own `.babelrc` plugins and presets, like
[jsx-control-statements](https://www.npmjs.com/package/jsx-control-statements).

![screencast](https://discourse-cdn.global.ssl.fastly.net/meteor/uploads/default/optimized/2X/4/43fb14d7cc38a1537e51ae0aa1bef88d80f8e510_1_690x341.gif)

Copyright (c) 2016 by Gadi Cohen &lt;dragon@wastelands.net&gt;, released under the MIT License.
Note: this code includes / republishes additions to core Meteor packages that are
Copyright MDG and released under the same license.

Discussion: https://forums.meteor.com/t/help-test-react-hotloading-in-native-meteor-i-e-no-webpack/17523/

## How to Use

If upgrading from an earlier version, please see [Upgrading](docs/Upgrading.md).

What follows are step-by-step instructions to add meteor-hmr to an existing project.  You can also see the [Boilerplates & Examples](docs/Boilerplates.md) section of the docs.

Hotloading is provided on a *per-build-plugin* basis.  We provide a replacement
`ecmascript-hot` loader to hotload your `*.js` and `*.jsx` files:

1. `meteor remove ecmascript`
1. `meteor add gadicc:ecmascript-hot`

If you're trying a non-stable release, you need to explicitly provide the `@version` (or `@=version` if it's not picked up correctly) in the second step.

Note, your code needs to be hot-module-replacement (HMR) aware.  For instuctions on how to add hot loading for React, please see the [React Hotloading](docs/React_Hotloading.md) docs.  For general instructions, see the [Handling Updates](docs/Handling_Updates.md).  If you're a build-plugin author, see the [Build Plugin docs](docs/Build_Plugins.md).  Other build plugins HMR support are list below:

Other Notes:

1. We use an extra port for communication with the client.  By default this is
Meteor's port + 2 (i.e., right after mongo), but you can override it with the
`HOT_PORT` environment variable.

1. For Mantra style apps, skim over the React Hotloading docs above and then read [this diff](https://github.com/gadicc/mantra-sample-blog-app-hot/compare/master...gadicc:hot) for an example on how to add hotloading to the `mantra-sample-blog-app` (or just clone the repo).  You may also find more info in [#60](https://github.com/gadicc/meteor-hmr/issues/60).

## List of HMR-aware Build Plugins

* `gadicc:ecmascript-hot` - `.js` and `.jsx` files (core, part of this project)
* `gadicc:node-modules-hot` - compilation & hot updates of local node-modules (core, see [docs](docs/Node_Modules_Hot.md))

Build plugin authors, please submit a PR to add your HMR-aware build plugin to this list.  For more info, see the [Build Plugin docs](docs/Build_Plugins.md).

## Where this works and doesn't work

Hot Module Replacement (HMR) only works with "pure" modules that use `import`
and `export`.  Any reliance on Meteor's old method of `api.use()`,
`api.export()` and globals will absolutely not work properly, ever.

## Forced Refresh

Just do a browser refresh like normal (ctrl-R, etc).

If you experience the need to do this frequently, please report on GitHub.

Note, errors thrown in your app can break Meteor's HCP system, requiring
a browser refresh regardless... we can't help with that.

## Settings (in package.json)

Hotloading is disabled by default for packages that *can* be hot loaded, unless the package explicitly forces hotloading, like `ecmascript-hot` and `node-modules-hot` which should simply be removed to disable hotloading.  You can enable hotloading for other packages as follows:

```js
{
  // Besides for "-hot" packages which are always enabled,
  // enable hotloading for all other packages that support it.
  "enabled": true
  // Or, we can specify an array of names
  "enabled": [ "author:packageName", "etc" ]
}
```

Please note that the old `ecmascript-hot` section is no longer used and should be removed.

## Packages

If you replace the `api.use('ecmascript')` in the `package.js` file with the
`gadicc:ecmascript-hot@<currentVersion>`, you'll be able to use the hotloading
while developing local packages, with one caveat:

This only works for "new style" 1.3 module packages.  That means any reference
inside of a file should refer to the local scope *only*, i.e. any dependencies
should be imported via the `import X from Y;` syntax, and your code should not
expect them to "just be available" because of Meteor's linker code.

Note, at time of writing (2016-05-07), Meteor doesn't allow for the
`hot.accept()` check to flow from packages back down to the app, so you need
to do this per package.  BUT, we have a PR open for this in
[meteor#6391](https://github.com/meteor/meteor/pull/6931).

## Troubleshooting

Please see the [Troubleshooting docs](docs/Troubleshooting.md).  The first
entry there is called **Is this even working?**.  Otherwise, see if anyone
else has experienced your problem by searching in
[issues](https://github.com/gadicc/meteor-hmr/issues)
and if not, please open a new one.

## How this works

Brace yourself for reading this and recall the project goals.

1. Build plugins that use `gadicc:hot-build` (like `gadicc:ecmascript-hot`)
   will be loaded a 2nd time in a forked process.  They will watch all the
   same files, and on update, will recompile only changed files and send
   this update directly to the client.

1. This above bundle resembles Meteor's linker output but also bypasses it,
   so this will only work with "pure" modules that use import/export and
   don't rely at all on Meteor's old method of `api.use()` and `api.export()`.

1. The accelerator also runs an http server (to serve bundles) and a websocket
  server (to notify the client of new bundles ids).  The client requests said
  bundles by inserting a script tag into the HEAD (so it will be loaded in the
  correct context).

1. We patch meteorInstall's root, delete previous exports, climb the tree, and
  reevaluate.  This happens before the HCP, so if everything succeeded, we
  skip the next HCP.

1. We skip HCPs by wrapping autoupdate's observe()'s `changed` callback,
  to not fire the original callback in cases we want to skip.

## Changes from original core packages

The bases for `babel-compiler` and `ecmascript` began from `1.3-modules-beta.5`
and are upgraded as necessary, in their own commits (look out for commit messages
`update package bases to 1.3-beta.11 (<SHA>)` etc).
