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

**Current status (2016-04-01)**: Fix for broken deploys.  (04-02): SSR working.

**Current release**: There's no more need to specify the version in your `packages`
file; remove it and `meteor update` for the latest stable version.

## How to Use

1. In your project root, `npm install --save-dev babel-preset-meteor babel-plugin-react-transform react-transform-hmr react-transform-catch-errors redbox-react`
1. If you don't already have a `.babelrc`, one will be created for you.  Otherwise,
ensure it resembles the sample at the end of this README.
1. Edit your `.meteor/packages` and replace `ecmascript` with `gadicc:ecmascript-hot`

If you want `.babelrc` support without react hotloading, just take out
the `react-transform` lines in your `client/.babelrc`.

NB: If you already had a `.babelrc` before this, realize that it might contain
things that can break your Meteor build, but didn't before when Meteor ignored
it.  Pay attention to existing plugins & presets.

Notes:

1. We use an extra port for communication with the client.  By default this is
Meteor's port + 2 (i.e., right after mongo), but you can override it with the
`HOT_PORT` environment variable.

1. Works great with
[mantra-sample-blog-app](https://github.com/mantrajs/mantra-sample-blog-app)
(but you need to remove `babel-root-slash-import`, which might break some
of your testing, tracking in
[#82](https://github.com/mantrajs/mantra-sample-blog-app/issues/82)).

## Upgrading from `v0.0.7-rc.1` and below

* Previously, we force-pushed `babel-plugin-react-transform` for you, but now
we provide full `.babelrc` support.  So now you should
`npm install --save-dev babel-plugin-react-transform'
and make sure you have a `.babelrc` in
your project root that resembles the sample at the end of this README. 

* You should also `npm install --save-dev react-transform-catch-errors react-redbox`
if you want to use the error catching support.

* Previously we recommended to remove this package before deploy, but now with
proper `.babelrc` support, as long as the react-transform is in the `development`
section, you should be good.  (Note, this package has not yet been tested
extensively in production).

* If you want `.babelrc` support without react hotloading, just take out
the `react-transform` lines in that file.

## Where this works and doesn't

NB: **This only works on React components**.  If you change a file that
is imported by non-react by modules that aren't react components, a
regular client refresh will occur.  We might offer full HMR support in
the future, but then you'd still need to add code to your existing
modules to handle the update (with React we know what to do already).

Related: if you change non-react code in a file that has a react
component too, since we don't know any better, we'll patch the (unchanged)
react component and still block the full refresh, meaning your old code
will still run.  To avoid this, either ctrl-R in such situations or
don't mix code and react components in the same file.

* ~~App only, no packages - avoids need to link in package imports~~
  (see Packages, below)
* ~~Only works with file paths that include 'client' and exclude 'test'.~~
* Works on any client code where the path doesn't begin with `tests/` or
  end in `tests?.js` or `specs?.jsx` (the `?` means the `s` is optional).
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

  1. Is a `.jsx` and contains "import React" at the beginning of a line.
    You can fine tune these settings in your package.json, see SETTINGS
    below.
  1. ~~Are in a directory (or subdir of a directory) called `components`~~
  1. Have exactly this format (const, identifier begins with uppercase,
  root level indentation, newlines) - args can be blank.)

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

If you experience the need to do this frequently, please report on GitHub.

Note, errors thrown in your app can break Meteor's HCP system, requiring
a browser refresh regardless... we can't help with that.

## Settings (in package.json)

You may optionally override various defaults (shown below) by adding
an `ecmascript-hot` key to your `package.json` file:

```js
  "ecmascript-hot": {
    "transformStateless": {
      "pathMatch": "\\.jsx$",
      "sourceMatch": [ "^import React", "m" ]
    },
  "babelEnvForTesting": "production",
  }
```

### transformStateless

To get `transformStateless` in `.js` files too (and not just `.jsx`),
you can do:

```js
  "ecmascript-hot": {
    "transformStateless": {
      "pathMatch": "\\.jsx?$",
    }
  }
```

i.e., just add a question mark ("?") before the end, to make the 'x'
optional.

Both `*Match` keys take regular expressions, so you could use the
`sourceMatch` to e.g. whitelist/blacklist by your own criteria.

### babelEnvForTesting

```js
{
  "ecmascript-hot": {
    "babelEnvForTesting": "production",     // default
    "babelEnvForTesting": "development",    // any other value you want
    "babelEnvForTesting": "default"         // will use existing BABEL_ENV if set
  }
}
```

## Packages

If you replace the `api.use('ecmascript')` in the `package.js` file with the
`gadicc:ecmascript-hot@<currentVersion>`, you'll be able to use the hotloading
while developing local packages, with one caveat:

This only works for "new style" 1.3 module packages.  That means any reference
inside of a file should refer to the local scope *only*, i.e. any dependencies
should be imported via the `import X from Y;` syntax, and your code should not
expect them to "just be available" because of Meteor's linker code.

## Troubleshooting

**[server] Uncaught Error: Unknown plugin "XXX" specified in .babelrc**

```
   While processing files with gadicc:ecmascript-hot (for target os.linux.x86_64):

   /home/dragon/.meteor/packages/gadicc_ecmascript-hot/...super long path.../option-manager.js:179:17:
   Unknown plugin "react-transform" specified in
   "/home/dragon/www/projects/wmd2/supervisor/.babelrc.env.development" at 0, attempted to
   resolve relative to "/home/dragon/www/projects/wmd2/supervisor"
   at
```

where obvoiusly XXX is some arbitrary plugin name.

Run `npm install --save-dev babel-plugin-XXX` in your project root (like we
recommend when adding any new plugin at the bottom of this README).

**[server] Uncaught Error: Unknown preset "XXX" specified in .babelrc**

```
   While processing files with gadicc:ecmascript-hot (for target os.linux.x86_64):

   /home/dragon/.meteor/packages/gadicc_ecmascript-hot/...super long path.../option-manager.js:179:17:
   Unknown preset "stage-0" specified in
   "/home/dragon/www/projects/wmd2/supervisor/.babelrc" at 0, attempted to
   resolve relative to "/home/dragon/www/projects/wmd2/supervisor"
   at
```

where obvoiusly XXX is some arbitrary preset name.

Run `npm install --save-dev babel-preset-XXX` in your project root (like we
recommend when adding any new preset at the bottom of this README).

**[client] Uncaught Error: Cannot find module 'react-transform-hmr'**

Run `npm install --save-dev react-transform-hmr` in your project root
(per the installation section in this README :)).

**Disable HCP on fail for debugging**

If you want to report an error with meteor-react-hotloader, but Meteor's HCP
kicks in before you can see the error, you can disable HCP until the next
page reload by typing the following line in your browser console:

```js
Reload._onMigrate(function() { return false; });
```

## How this works

Brace yourself for reading this and recall the project goals.

1. We use [@gaearon](https://github.com/gaearon/) (dan abramov)'s
[babel-plugin-react-transform](https://github.com/gaearon/babel-plugin-react-transform)
and
[react-transform-hmr](https://github.com/gaearon/react-transform-hmr)
plugins (which use his [react-proxy](https://github.com/gaearon/react-proxy) too).
These are awesome and this is the right way to go; nothing hacky here.

1. We provide a replacement `ecmascript-hot` compiler plugin, which honors
  `.babelrc` files and performs transforms on stateless functions.  We keep
  a running list of all files handled by this plugin, which is passed over
  to our "accelerator".

1. The accelerator is a separate (forked) process, which watches those files
  and on changes constructs a module tree that (hopefully) resembles Meteor's
  linker output (which we bypass; hence we only support `import`s and nothing
  from from `api.use()` in packagess, for example).

1. The accelerator also runs an http server (to serve bundles) and a websocket
  server (to notify the client of new bundles ids).  The client requests said
  bundles by inserting a script tag into the HEAD (so it will be loaded in the
  correct context).

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
it will be created for you with the contents below.  If it does exist, it
should include at least `{ "presets": "meteor" }`.  Consider also that until
now it was ignored, so it might contain some configuration that could break
your app.

```js
{
  "presets": [ "meteor" ]
}
```

If `/server/.babelrc` or `/client/.babelrc` exist, they'll be used
preferentially for these architectures.  We suggest you extend your
root `.babelrc` and only keep target-specific config in these files.
Here's an example client setup for react hotloading:

**/client/.babelrc:**

```js
{
  "extends": "../.babelrc",

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

If you add any new **plugins** or **presets** in your `.babelrc` files, you need to `npm install` them too.  e.g. if you add:

```js
{
  plugins: [ 'transform-decorators-legacy' ]
}
```

you need to:

```sh
$ npm install --save-dev babel-plugin-transform-decorators-legacy
```

The name of the npm package is almost always the name of the plugin preceded by `babel-plugin-`, unless the README or npmjs.com says otherwise.
