# meteor-hmr

*Hot-module-replacement for Meteor*

* Edit your react components and see changes instantly, while maintaining state.
* Catch react `render()` errors and show on your screen rather than crashing your app.
* Add your own `.babelrc` plugins and presets, like
[jsx-control-statements](https://www.npmjs.com/package/jsx-control-statements).

![screencast](https://discourse-cdn.global.ssl.fastly.net/meteor/uploads/default/optimized/2X/4/43fb14d7cc38a1537e51ae0aa1bef88d80f8e510_1_690x341.gif)

Copyright (c) 2016 by Gadi Cohen &lt;meteor@gadi.cc&gt;, released under the MIT License.
Note: this code includes / republishes additions to core Meteor packages that are
Copyright MDG and released under the same license.

## More info

Given that:

1. Webpack has react hotload support and it's awesome.
1. Meteor build process has become painfully slow
([but is improving](https://forums.meteor.com/t/help-us-test-build-times-in-meteor-1-3/15031?u=gadicc))
1. Meteor has no plans to integrate webpack (for
[good reasons](https://forums.meteor.com/t/why-is-the-meteor-install-1-3-api-better-than-webpack-in-meteor/14480/3?u=gadicc))
1. MDG want more time to plan best way to do hot module replacement (as above).

Let's:

1. Implement a less-than-ideal solution to get react hot loading NOW, until
something better/official comes along.

Discussion: https://forums.meteor.com/t/help-test-react-hotloading-in-native-meteor-i-e-no-webpack/17523/

**Current status (2016-04-01)**: Fix for broken deploys.  (04-02): SSR working.

**Current release**: There's no more need to specify the version in your `packages`
file; remove it and `meteor update` for the latest stable version.

## How to Use

If upgrading from an earlier version, please see [Upgrading](docs/Upgrading.md).

Hotloading is provided on a *per-build-plugin* basis.  We provide a replacement
`ecmascript-hot` loader to hotload your `*.js` and `*.jsx` files:

1. Edit your `.meteor/packages` and replace `ecmascript` with `gadicc:ecmascript-hot`

Note, your code needs to be hot-module-replacement (HMR) aware.  For instuctions on how to add hot loading for React, please see the [React Hotloading](docs/React_Hotloading.md) docs.  For general instructions, see the [Handling Updates](docs/Handling_Updates.md).

Notes:

1. We use an extra port for communication with the client.  By default this is
Meteor's port + 2 (i.e., right after mongo), but you can override it with the
`HOT_PORT` environment variable.

1. Works great with
[mantra-sample-blog-app](https://github.com/mantrajs/mantra-sample-blog-app)
(but you need to remove `babel-root-slash-import`, which might break some
of your testing, tracking in
[#82](https://github.com/mantrajs/mantra-sample-blog-app/issues/82)).

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

Not relevant for newer versions.  Please remove this section.

## Packages

If you replace the `api.use('ecmascript')` in the `package.js` file with the
`gadicc:ecmascript-hot@<currentVersion>`, you'll be able to use the hotloading
while developing local packages, with one caveat:

This only works for "new style" 1.3 module packages.  That means any reference
inside of a file should refer to the local scope *only*, i.e. any dependencies
should be imported via the `import X from Y;` syntax, and your code should not
expect them to "just be available" because of Meteor's linker code.

## Troubleshooting

**Disable HCP on fail for debugging**

If you want to report an error with meteor-react-hotloader, but Meteor's HCP
kicks in before you can see the error, you can disable HCP until the next
page reload by typing the following line in your browser console:

```js
Reload._onMigrate(function() { return false; });
```

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
