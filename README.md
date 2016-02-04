# meteor-react-hotloader

*React Hot Loading in Meteor, today, in the worst way possible.*

Edit your react components and see changes instantly, while maintaining state.

![screencast](https://discourse-cdn.global.ssl.fastly.net/meteor/uploads/default/optimized/2X/4/43fb14d7cc38a1537e51ae0aa1bef88d80f8e510_1_690x341.gif)

Copyright (c) 2016 by Gadi Cohen <meteor@gadi.cc>, released under the MIT License.
Note: this code includes / republishes additions to core Meteor packages that are
Copyright MDG and released under the same license.

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

## This isn't ready for use yet.

I left the repo up for the curious, I was just trying to gauge interest.
**There'll be a proper release probably next week**.  But you can play around
if you know what you're doing :)

## Where this works and doesn't

*This section isn't finished yet.*

* App only, no packages - avoids need to link in package imports
* `client/*` only - use Meteor's regular linker for server and test code (?)

## To use in another app (not recommended yet; use with correct Meteor
`release-1.3` commit)

1. Symlink demo/packages/* to your app `packages` dir
1. Edit your `.meteor/packages`
  1. replace 'ecmascript' with 'gadicc:ecmascript-hot'
  1. add 'gadicc:hot' (name and nature of package likely to change)
1. Temporarily, add `import ReactTransformHMR from 'react-transform-hmr';` to
any files that contain components that will be directly mounted.

## How To (this won't work yet, but this is the intended path)

1. Edit your `.meteor/packages`
  1. replace 'ecmascript' with 'gadicc:ecmascript-hot'
  1. add 'gadicc:hot' (name and nature of package likely to change)
1. Use `react-mounter` to mount your components.

## How this works

Brace yourself for reading this and recall the project goals.

1. Use [@gaearon](https://github.com/gaearon/) (dan abramov)'s
[babel-plugin-react-transform](https://github.com/gaearon/babel-plugin-react-transform)
and
[react-transform-hmr](https://github.com/gaearon/react-transform-hmr)
plugins (which use his [react-proxy](https://github.com/gaearon/react-proxy) too).
These are awesome and this is the right way to go; nothing hacky here.

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
* [ ] Proper module.hot stuff
* [ ] react-transform-error stuff
* [X] Check for MONGO_URL or -p option to meteor to get right mongo address
* [ ] Track & merge all hotloads for a single load for fresh manual browser load (not really so important since currently it will load the initial output and all the patches
in order)

## Other ideas

Not tested yet in a big project, but if speed is an issue it's not too much
work to spawn another process to watch the files and communicate with mongo.
