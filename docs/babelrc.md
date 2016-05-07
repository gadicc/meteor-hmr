# Using babelrc in Meteor

NB: If you already had a `.babelrc` before this, realize that it might contain
things that can break your Meteor build, but didn't before when Meteor ignored
it.  Pay attention to existing plugins & presets, such as `babel-root-slash-import`.

If you don't already have a `.babelrc`, one will be created for you.  Otherwise,
ensure that it contains at least the following (unless you know what you're doing):

```js
{
  "presets": [ "meteor" ]
}
```

Install the Meteor preset if you don't have it installed already:

```sh
$ meteor npm install --save-dev babel-preset-meteor
```

## Adding presets and plugins

Please understand that babel presets and plugins modify your code in transit.
You should only add plugins and preset that you know you need and that you
understand how they work.

**When reporting bugs against Meteor, please strive to test your app with
*only* `{ presets: [ "meteor" ] }`.**  If this is not possible, please
**emphasize** what other plugins you are using.

If you add any new **plugins** or **presets** in your `.babelrc` files, you
need to `meteor npm install` them too.  e.g. if you add:

```js
{
  plugins: [ 'transform-decorators-legacy' ]
}
```

you need to:

```sh
$ meteor npm install --save-dev babel-plugin-transform-decorators-legacy
```

The name of the npm package is almost always the name of the plugin preceded
by `babel-plugin-`, unless the README or npmjs.com says otherwise.

For more information, see https://babeljs.io/docs/plugins/.  Note in
particular the section on
[Stage-X (Experimental Presets)](https://babeljs.io/docs/plugins/#stage-x-experimental-presets).
Many packages simply say "enable stage-0" without clearly explaining the
risks involved.  The stage-X presets (and their respective plugins) involve
proposals that are subject to change so should be used **with extreme caution**.
Code that works *now* with these plugins may break on future releases or once
the spec is finalized.

## Client and server-specific .babelrc

If `/server/.babelrc` or `/client/.babelrc` exist, they'll be used
preferentially for these architectures.  We suggest you extend your
root `.babelrc` and only keep target-specific config in these files, e.g.

**/client/.babelrc:**

```js
{
  "extends": "../.babelrc",

  "env": {
    "development": {
      "plugins": [
        "some-special-plugin-that-you-only-want-on-the-client-and-in-devel"
      ]
    }
  }
}
```

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

### Decorators Plugin and stage-0 preset

This is a bit tricky, since it depends on load order, and also the spec is not
final (this is why we use the `-legacy` plugin.)  The features in these plugins
are based on *propoals subject to change* so you should **use with extreme
caution**, especially since you may well need to change any code that relies
on these features when the respective spec is updated or finalized.

For more information see https://babeljs.io/docs/plugins/#stage-x-experimental-presets.

```sh
$ meteor npm install --save-dev babel-preset-es2015 babel-preset-stage0

```js
{
  "presets": [
    "meteor",
    "es2015",
    "stage-0",
    "react",
  ],
  "plugins": [
    "transform-decorators-legacy"
  ]
}
```

### `Uncaught Error: Cannot find module 'babel-runtime/helpers/get'`

And similar errors.

This can occur due to your load order in your `.babelrc`.  For a straight
Meteor experience, you should just have:

```js
{
  "presets": [ "meteor" ]
}
```

to confirm if this solves your issue.  If it does, you'll have to experiment
with the order of other presets and plugins, and whether they're compatible
with the meteor preset.

You might find some other help in [#68](https://github.com/gadicc/meteor-hmr/issues/68).
