# Adding Hotloading to your Build Plugin

We assume you already have a working build plugin which uses `inputFile.addJavascript()`.

## Step 1: Get Hot Updates

Modify your `package.js`:

```js
Package.registerBuildPlugin({
  name: 'myPluginName',
  use: ['gadicc:hot-build'],  // <-- add this line
  sources: ['plugin.js']
});

Package.onUse(function (api) {
  // add these two packages
  api.use('gadicc:hot-build@0.0.1');
  api.use('gadicc:hot@0.0.20');
  // ...
});
```

Modify your `plugin.js`:

```
// This *must* match the name of your package and plugin
var hot = new Hot('author:package-name/plugin-name');

Plugin.registerCompiler({
  extensions: ['blah'],
}, function () {
  var compiler = new BlahCompiler();

  // Wrap your compiler before returning
  return hot.wrap(compiler);
});
```

From this stage, when your plugin loads, `hot-build` will load it again, a 2nd time, in a separate process, watching the same files, calling `processFilesForTarget` on changed files, and sending the replacement modules to the client.

Note, if you rely on being passed the contents of all your files and act on all of them together, currently this isn't supported, but can be.  Open an issue on github.

## Step 2: Handle Hot Updates

See [Handling Updates](./Handling_Updates.md) to try figure out where best to target your hotloading support.

You'll either need to modify your outputted modules to "self-accept" their own changes, or need to (tell your users to) add code to files that include these files to accept such changes.