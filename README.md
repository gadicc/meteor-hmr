# meteor-react-hotloader

*React Hot Loading in Meteor, today, in the worst way possible.*

Given that:

1. Webpack has react hotload support
1. Meteor build process has become painfully slow
1. Meteor has no plans to integrate webpack (for good reasons)
1. MDG want more time to plan best way to do hot module replacement

Let's:

1. Implement a super hacky way (i.e. temporary) to get react hot loading NOW.

## Where this works and doesn't

XXX TODO

* App only, no packages - avoids need to link in package imports
* `client/*` only - use Meteor's regular linker for server and test code (?)

## To use in another app (not recommended yet; use with correct Meteor commit)

1. Symlink demo/packages/* to your app `packages` dir
1. Edit your `.meteor/packages`
1.1. replace 'ecmascript' with 'gadicc:ecmascript-hot'
1.1. add 'gadicc:hot' (name and nature of package likely to change)
1. Add `import ReactTransformHMR from 'react-transform-hmr';` anywhere in your app.

## How To (this won't work yet, but this is the intended path)

1. Edit your `.meteor/packages`
1.1. replace 'ecmascript' with 'gadicc:ecmascript-hot'
1.1. add 'gadicc:hot' (name and nature of package likely to change)
1. Use `react-mounter` to mount your components.

## How this works

Brace yourself for reading this and recall the project goals.

1. Use @gaearon (dan abramov)'s
[babel-plugin-react-transform](https://github.com/gaearon/babel-plugin-react-transform)
and
[react-transform-hmr](https://github.com/gaearon/react-transform-hmr)
plugins (which use his [react-proxy](https://github.com/gaearon/react-proxy) too).

1. In compiler plugin, always pass `inputFile.addJavaScript()` the original data
  for a file, even if it's changed - this avoids a client refresh.

1. With changed files, manually construct a module tree that (hopefully)
  resembles Meteor's linker output (which we bypass; hence we only support
  specfic situations).

1. Bundle this and store in Mongo (no other way to communicate with the running
  app from a compiler plugin)

1. Publish/subscribe id's of new bundles, insert script tag in the HEAD to
  load it (and serve it from the server).

1. Patch meteorInstall's root, delete previous exports, climb the tree, and
  reevaluate.

## Changes from original core packages

Packages are based off the following commit in `meteor/meteor`:

```
commit 877cb9e61ae8bcf6312c6cec05bc943560770118
Author: Ben Newman <ben@meteor.com>
Date:   Mon Jan 25 15:34:16 2016 -0500

    Add a test of client/compatibility directories.
```

You can diff the latest commit here against the first commit in
this repo to see all changes to those packages.

## TODO

* [ ] Force real reload if an extra `import` has been added
* [ ] Track & merge all hotloads for a single load for fresh manual browser load
* [ ] Proper module.hot stuff
* [ ] react-transform-error stuff
