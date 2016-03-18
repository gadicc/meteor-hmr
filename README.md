# meteor-react-hotloader

*React hot loading, .babelrc support, in Meteor, today*

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

**Current status (2016-03-18)**: Much more reliable HMR/HCP combo, .babelrc support,
react error catching.

**Current release (2016-03-18)**: `gadicc:ecmascript-hot@0.0.11-rc.2`

## How to Use

*Use with correct Meteor release, currently 1.3-rc.2*

1. In your project root, `npm install --save react-transform-hmr react-transform-catch-errors redbox-react`.
1. Make sure you have a `.babelrc` in your project root that resembles the
sample at the end of this README.
1. Edit your `.meteor/packages` and replace `ecmascript` with `gadicc:ecmascript-hot@0.0.11-rc.2`

If you want `.babelrc` support without react hotloading, just take out
the `react-transform` lines in that file.

NB: If you already had a `.babelrc` before this, realize that it might contain
things that can break your Meteor build, but didn't before when Meteor ignored
it.  Pay attention to existing plugins & presets.

Working with
[mantra-sample-blog-app](https://github.com/mantrajs/mantra-sample-blog-app)
(but you need to remove `babel-root-slash-import`, which might break some
of your testing, tracking in
[#82](https://github.com/mantrajs/mantra-sample-blog-app/issues/82)).

## Upgrading from `v0.0.7-rc.1` and below

* Previously, we force-pushed `babel-plugin-react-transform` for you, but now
we provide full `.babelrc` support.  So make sure you have a `.babelrc` in
your project root that resembles the sample at the end of this README.

* You should also `npm install --save react-transform-catch-errors react-redbox`
if you want to use the error catching support.

* Previously we recommended to remove this package before deploy, but now with
proper `.babelrc` support, as long as the react-transform is in the `development`
section, you should be good.  (Note, this package has not yet been tested
extensively in production).

* If you want `.babelrc` support without react hotloading, just take out
the `react-transform` lines in that file.

## Where this works and doesn't

*This section isn't finished yet.*

NB: **This only works on React components**.  If you change a file that
is imported by non-react by modules that aren't react components, a
regular client refresh will occur.  We might offer full HMR support in
the future, but then you'd still need to add code to your existing
modules to handle the update (with React we know what to do already).

* App only, no packages - avoids need to link in package imports
* Only works with file paths that include 'client' and exclude 'test'.
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

```js
const MyComponent = ({prop1, prop2}) => (
  ... jsx ...
);

const MyComponent = ({prop1, prop2}) => {
  // must include /return\s+\(\s*\</
  // i.e. "return", whitespace, "(", optional whitespace, "<"
  return ( <JSX /> );
};
```

If this proves too inflexible, open an issue and I'll look at doing something
using [recast](https://github.com/benjamn/recast) (from Meteor's @benjamn!),
but for now I think it's better to be strict and avoid touching stuff we're
not meant to, which I think is the reason react-transform-hmr doesn't address
this yet.
[This](https://github.com/gaearon/babel-plugin-react-transform/issues/57#issuecomment-167677570) was interesting though.

FYI, to "convert" a pure component to a regular one, as in the
example above, just do:

```js
import React, { Component } from 'react';
const MyComponent extends Component {
  render() {
    const {prop1, prop2} = this.props;
    return (
      ... jsx ...
    )
  }
}
```

### Important Flaw with this method

We'll eventually incorporate
[this pull request](https://github.com/gaearon/babel-plugin-react-transform/pull/85)
which does pretty much the same thing with a bit more thought.

> React doesn’t let functional components get refs. However this would
technically allow those components to have refs in development. You can
rely on this, and it will break in production.  e.g. findDOMNode(), etc.

Source: @gaearon in
[this comment](https://github.com/gaearon/babel-plugin-react-transform/pull/85#issuecomment-185428885) and
[this comment](https://github.com/gaearon/babel-plugin-react-transform/pull/85#issuecomment-193033160).

## Forced Refresh

Just do a browser refresh like normal (ctrl-R, etc).

~~In situations we can't handle, we'll automatically resort to a regular
Meteor client refresh.  If you ever need to do this yourself, just
call `hot.reload()` on the client.  To disable the automatic
behaviour, call `hot.disableReload()` in your app, once.~~

~~If the automatic refresh is happening in cases where you think it
shouldn't, it can be useful to disable it to see the exact error
messages, etc.~~

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

1. In the (replaced) ecmascript compiler plugin, watch for changed files and
  manually construct a module tree that (hopefully) resembles Meteor's linker
  output (which we bypass; hence we only support specfic situations).

1. Bundle this and store in Mongo (no other way to communicate with the running
  app from a compiler plugin)

1. Publish/subscribe id's of new bundles, insert script tag in the HEAD to
  load it (and serve it from the server).

1. Patch meteorInstall's root, delete previous exports, climb the tree, and
  reevaluate.  This happens before the HCP, so if everything succeeded, we
  skip the next HCP.

1. We skip HCPs by wrapping autoupdate's observe()'s `changed` callback,
  to not fire the original callback in cases we want to skip.

## Changes from original core packages

The bases for `babel-compiler` and `ecmascript` began from `1.3-modules-beta.5`
and are upgraded as necessary, in their own commits (look out for commit messages
`update package bases to 1.3-beta.11 (<SHA>)` etc).

## TODO

* [X] Force real reload if client hmr can't be accepted
* [X] Consider intercepting how modules-runtime is served to client
      to avoid needing to provide a replacement package until
      [install#86](https://github.com/benjamn/install/pull/6).
* [ ] Clean up `babel-copmiler.js` and move `hothacks.js` stuff to `gadicc:hot`.
* [X] Proper module.hot stuff (seems to be good enough)
* [X] react-transform-error stuff
* [X] Check for MONGO_URL or -p option to meteor to get right mongo address

## Other ideas

Not tested yet in a big project, but if speed is an issue it's not too much
work to spawn another process to watch the files and communicate with mongo.

## Sample .babelrc

There should be a `.babelrc` file in your project root.  If it doesn't exist,
create it with the contents below.  If it does already exist, you need to
merge in the `env->development->plugins->["react-transform",{}]` array, below.

```js
{
  "env": {
    "development": {
      "plugins": [
        ["react-transform", {
          "transforms": [{
            "transform": "react-transform-hmr",
            "imports": ["react"],
            "locals": ["module"]
          }, {
            "transform": "react-transform-catch-errors",
            "imports": ["react", "redbox-react"]
          }]
        }]
      ]
    }
  }
}
```
