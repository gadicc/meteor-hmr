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

## Where this works and doesn't

NB: **This only works "out the box" on React components**.  If you change a file that is imported by non-react by modules that aren't react components, a regular client refresh will occur.  For hotloading to work, files must know how to "accept" the updated modules.  The react hotloading code knows how to do this for react components and their imports.  Other hotloaders *may* (or may not) work with the *very basic* HMR support provided by this project.  No other files will "magically" update themselves.  See http://webpack.github.io/docs/hot-module-replacement.html for the basic idea; BUT: we only provide `hot.accept()`, and on the client only, for now.

Related: if you change non-react code in a file that has a react component too, since we don't know any better, we'll patch the (unchanged) react component and still block the full refresh, meaning your old code will still run (unless, of course, it's used by the react component).  To avoid this, either ctrl-R in such situations or don't mix code and react components in the same file.

* ~~App only, no packages - avoids need to link in package imports~~
  (see Packages, below)
* ~~Only works with file paths that include 'client' and exclude 'test'.~~
* ~~Works on any client code where the path doesn't begin with `tests/` or
  end in `tests?.js` or `specs?.jsx` (the `?` means the `s` is optional).~~
* ~~Note the section below about stateless / functional / pure / "dumb" components.~~

Note: the new react-hot-loader version supports functional stateless components in the best way possible.

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
