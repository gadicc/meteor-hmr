# accelerator - meteor files

## What's here

* `build-plugin.js` - export just the InputFile class

* `compiler-plugin.js`:

  ```js
  var buildPluginModule = require('./build-plugin.js');
  var _ = require('underscore');
  import files from './mini-files.js';

  // the entire InputFile class from meteor/tools/isobuild/compiler-plugin.js
  class InputFile extends buildPluginModule.InputFile {}

  export { InputFile };
  ```

* `mini-files.js`:

  ```js
  // meteor/tools/static-assets/server/mini-files.js

  // and stuff we need from meteor/tools/fs/files.js

  import fs from 'fs';

  // gadicc/meteor-hmr
  // run sync versions of all fs methods
  const Fiber = {
    current: null
  };

  files.fsFixPath = {};
  function wrapFsFunc(fsFuncName, pathArgIndices, options)

  // no real profiling (gadicc/meteor-hmr)
  function Profile(name, func) { return func; }

  wrapFsFunc("stat", [0]);

  // Like statSync, but null if file not found
  files.statOrNull = function (path)
```

## Are we up to date?

In Meteor fork:

* `git fetch upstream`
* `git checkout release/METEOR@1.3.3-rc.5`

In this directory:

* Run `./diff-upstream`
* Patch as necessary
* Update `last-upstream-commit`
