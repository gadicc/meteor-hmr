# meteor-react-hotloader

*React Hot Loading in Meteor, today, in the worst way possible.*

Edit your react components and see changes instantly, while maintaining state.

![screencast](https://discourse-cdn.global.ssl.fastly.net/meteor/uploads/default/optimized/2X/4/43fb14d7cc38a1537e51ae0aa1bef88d80f8e510_1_690x341.gif)

Copyright (c) 2016 by Gadi Cohen &lt;meteor@gadi.cc&gt;, released under the MIT License.
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

Discussion: https://forums.meteor.com/t/help-test-react-hotloading-in-native-meteor-i-e-no-webpack/17523/

**Current status (2016-02-09)**: Published to Atmopshere! Unfinished but very useable. Feedback wanted.

## How to Use (early release)

*Use with correct Meteor release, currently 1.3-modules-beta.7*

1. In your project root, `npm install --save react-transform-hmr`
1. Edit your `.meteor/packages` and replace `ecmascript` with `gadicc:ecmascript-hot@0.0.2-modules.7` (don't forget to set it back before a production deploy!)

There's a [commit](https://github.com/gadicc/meteor-react-hotloader/commit/cadf6619700e9262332381c2ef7bc1b0ced5b645) for beta.8 (in the likewise-named branch), but it breaks
because of a change in Meteor, tracking in [meteor#6182](https://github.com/meteor/meteor/issues/6182).

Working with
[mantra-sample-blog-app](https://github.com/mantrajs/mantra-sample-blog-app)
(but you need to switch from flow-router-ssr to flow-router in beta.7+, see
[mantra-sample-blog-app#45](https://github.com/mantrajs/mantra-sample-blog-app/issues/45)).

## Where this works and doesn't

*This section isn't finished yet.*

* App only, no packages - avoids need to link in package imports
* `client/*` only - use Meteor's regular linker for server and test code (?)
* Note the section below about stateless / functional / pure / "dumb" components.

## Stateless / Functional / Pure / "Dumb" Components

Since React 0.14 this is a recommended pattern, but they are harder to hot load.
Currently babel-plugin-react-transform does not support it, see
[#57](https://github.com/gaearon/babel-plugin-react-transform/issues/57).

There are two ways around this:

1. As long as your stateless component is imported into a regular component,
it's like any regular import, and this will work fine.  This won't work if
e.g. you pass a stateless component as a prop or context in a router, it
needs to be directly imported.

1. To sidestep the above limitation (and have faster patching), we'll auto
convert (during compilation) stateless components into regular components
in certain cases.  This can go wrong so instead of trying to accomodate
every format, we do this for MantraJS style components, that:

  1. Is a `.jsx` and contains "import React"
  1. ~~Are in a directory (or subdir of a directory) called `components`~~
  1. Have exactly this format (const, root level indentation, newlines) -
  args can be blank.)

```
const MyComponent = ({prop1, prop2}) => (
  ... code ...
);
```

If this proves too inflexible, open an issue and I'll look at doing something
using [recast](https://github.com/benjamn/recast) (from Meteor's @benjamn!),
but for now I think it's better to be strict and avoid touching stuff we're
not meant to, which I think is the reason react-transform-hmr doesn't address
this yet.
[This](https://github.com/gaearon/babel-plugin-react-transform/issues/57#issuecomment-167677570) was interesting though.

## Troubleshooting

**Uncaught Error: Cannot find module 'react-transform-hmr'**

Run `npm install --save react-transform-hmr` in your project root
(per the installation section in this README :)).

## How this works

Brace yourself for reading this and recall the project goals.

1. We use [@gaearon](https://github.com/gaearon/) (dan abramov)'s
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

The bases for `babel-compiler` and `ecmascript` began from `1.3-modules-beta.5`
and are upgraded as necessary, in their own commits (look out for commit messages
`update package bases to 1.3-modules-beta.7 (<SHA>)` etc).

## TODO

* [X] Update to METEOR@1.3-modules-beta.6 and .7 (see note about .8)
* [ ] Force real reload if an extra `import` has been added
* [ ] Force real reload if client hmr can't be accepted
* [X] Consider intercepting how modules-runtime is served to client
      to avoid needing to provide a replacement package until
      [install#86](https://github.com/benjamn/install/pull/6).
* [ ] Clean up `babel-copmiler.js` and move `hothacks.js` stuff to `gadicc:hot`.
* [X] Proper module.hot stuff (seems to be good enough)
* [ ] react-transform-error stuff
* [X] Check for MONGO_URL or -p option to meteor to get right mongo address
* [ ] Track & merge all hotloads for a single load for fresh manual browser load (not really so important since currently it will load the initial output and all the patches
in order)

## Other ideas

Not tested yet in a big project, but if speed is an issue it's not too much
work to spawn another process to watch the files and communicate with mongo.
