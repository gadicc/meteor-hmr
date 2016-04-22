# Using babelrc in Meteor

NB: If you already had a `.babelrc` before this, realize that it might contain
things that can break your Meteor build, but didn't before when Meteor ignored
it.  Pay attention to existing plugins & presets, such as `babel-slash-root-import`.

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

