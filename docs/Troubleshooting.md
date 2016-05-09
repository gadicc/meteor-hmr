## Troubleshooting

Please see the [Troubleshooting docs](docs/Troubleshooting.md).  The first
entry there is called **Is this even working?**.

## General Issues

### Is this even working?

On a save, you should see the following on the client console:

```
[gadicc:hot] Connected and ready.
[gadicc:hot] Updating ["/client/colors.js"]
[gadicc:hot] Skipping HCP after successful HMR
```

If you're not seeing that, probably we're not picking up the save.  The
biggest reason for this currently is **atomic writes** ("safe writes"),
which we're working to fix.  You can track the progress in
[#53](https://github.com/gadicc/meteor-hmr/issues/53).

Otherwise see further down about DEBUG LOGGING.

### `No hot.accept() in /client/non-hot-update.js > /client/index.jsx`

**Previously: /client/main.js is not hot and nothing requires it**

For hot-updating to work, either the file you changed must be able to
self accept, or we'll climb the import chain looking for a file that
can accept the change (i.e. it knows how to handle an update to a specific
import).

If you're trying to get React Hotloading working, see the
[React Hotloading docs](docs/React_Hotloading.md).  If you're trying to get
something else working, check the docs for the build plugin you think should
be HMR-aware, or the [Handling Updates docs](docs/Handling_Updates.md) to
get HMR working for other parts of your app.

For anything else, this is probably the correct message, and Meteor's regular
Hot Code Push (HCP) will come through and reload the page.  Hotloading only
works for hotloading-aware code.  Changes to any other code *has to* restart
the page to work correctly.

For example, are you importing your components **from multiple files**?  This is possible, but makes things more complicated, so be sure you really need to do this.  You need to figure out how to accept the update in the 2nd file you're importing into, or one of it's ancestors.  You may find more help in [#77](https://github.com/gadicc/meteor-hmr/issues/77).

You may also find some other helpful info in
[#65](https://github.com/gadicc/meteor-hmr/issues/65).

## OS-related Issues

### Open file limit reached

You get these kind of errors:

```
Error: UNKNOWN, readdir '/Users/username/....'

warning: unable to access 'imports/.gitignore': Too many open files in system

git_prompt_info:2: too many open files in system: /dev/null
```

You might hit this if you have a lot of `.js` files in your project, and
whether or not your platform requires an open file descriptor to watch a
file.  It's because we're not watching twice as many files in the same
session; each file is watched twice, once in Meteor and once inside the
accelerator.

So far we've hit this just on OSX.  See the following two superuser.com
answers, and make a note of any current values before changing them:

* http://superuser.com/a/838840
* http://superuser.com/a/443168

## Babel issues

If you already had a `.babelrc` before this, realize that it might contain
things that can break your Meteor build, but didn't before when Meteor ignored
it.  Pay attention to existing plugins & presets, such as `babel-root-slash-import`
and `es2015` -- you don't want either!  All this features are handled already -
correctly - by the `meteor` preset.

### `Uncaught Error: Cannot find module 'babel-runtime/helpers/get'`

**Also: Missing class properties transform**

And similar errors.

See the [`.babelrc`](babelrc.md) docs for this one.

## React issues

### `Warning: [react-router] You cannot change <Router routes>; it will be ignored`

It's annoying but this can be safely ignored.  It's because of
[react-router#2182](https://github.com/reactjs/react-router/issues/2182) which
`react-hot-loader` works around, but can't remove the warning.  You might
find more info in [#64](https://github.com/gadicc/meteor-hmr/issues/64) or
[react-hot-loader#61](https://github.com/gaearon/react-hot-boilerplate/pull/61).

## Debugging

### Disable HCP on fail for debugging

If you want to report an error with meteor-hmr, but Meteor's HCP
kicks in before you can see the error, you can disable HCP until the next
page reload by typing the following line in your browser console:

```js
Reload._onMigrate(function() { return false; });
```

### Debug Logging

You can set the environment variable `HOT_DEBUG=1` for more server-side info.
Actually, you can do `HOT_DEBUG=2` or `HOT_DEBUG=3` for even more verbose
debug logging, up to `HOT_DEBUG=5`, but things get kind of crazy around there
:)

A typical save with `HOT_DEBUG=1` should look like this:

```
[gadicc:hot] Accelerator (Pof): gadicc:ecmascript-hot/compile-ecmascript-hot.processFilesForTarget(client/colors.js)
[gadicc:hot] Accelerator (Pof): Creating a bundle for 1 changed file(s)...
```

You may find other info which helps you work out the nature of your problem,
so you can solve it or
[report it on github](https://github.com/gadicc/meteor-hmr/issues/new).
