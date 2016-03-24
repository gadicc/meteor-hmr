# vNEXT

# v0.0.13-rc.10 (2016-03-24)

* Works with Meteor 1.3 `rc.4 - rc.10`.

* No longer auto-populate babelrc `presets` with `meteor`, to allow other
  plugins to be loaded before those in the preset.  If you don't already
  have a .babelrc, one will be created for you.  If you do, ensure you
  have `{ "presets": "meteor" }`.  Also,
  `npm install --save-dev babel-preset-meteor`.

# v0.0.12-rc.8 (2016-03-23)

* Fix transformStateless() from munging newlines and breaking some code.
* Use rawCollection() for serving hot.js via WebApp (without a Fiber).
* Slight change on file match algorithm.
* On reload, keep hot bundles from last 10s -- may help in future with server
  restarts.

# v0.0.10-rc.4 (2016-03-20)

* Release for Meteor `1.3-rc.4`

# v0.0.10-rc.3 (2016-03-19)

* Release for Meteor `1.3-rc.3`

# v00.0.9-rc.2 (2016-03-18)

* `.babelrc` support!  See the README for upgrading.

* `react-transform-catch-error` via `.babelrc`.

* Release for Meteor `1.3-rc.2`

* Remove slightly annoying notice on server "Creating a bundle..."
* Be slightly stricter in identifying stateless components, we now look for
  `/return\s+\(\s*\</` to match (i.e. we added a `<` after the `return (`.

# v0.0.7-beta.12 (2016-03-09)

* Accept function components that contain code (before we just accepted functions
  that mapped to jsx).  See README for the new example.

# v0.0.6-beta.12 (2016-03-08)

* Even more reliable HCP strategy.  Fixes broken CSS hotloading (#9) and all
  the cases which require a real reload (new files, etc) which we were accidently
  blocking.

# v0.0.5-beta.12 (2016-03-06)

* Release for Meteor `1.3-beta.12`.

# v0.0.5-beta.11 (2016-03-06)

* New and more reliable strategy to block HCP.  Regular page reload (via
  ctrl-R) now works how we expect (it's always up to date, no more stored
  patches) and `hot.reload()` is no longer required.

* Relax path restrictions a bit.  Match on anything that contains  'client'
  and not 'test' in the path / filename.

# v0.0.4-beta.11 (2016-02-22)

* `beta.11` support.

# v0.0.3-modules.7 (2016-02-12)

* Code to force a client refresh, used for changes we can't handle.

* Different method for overriding core modules-runtime.

# v0.0.2-modules.7 (2016-02-11)

* Correctly resolve relationships when importing from root paths
  (`/something`) and relative paths involving parents
  (`../../something).  Relative paths in the same directory
  (`./something) were all that was supported previously (#4).

# v0.0.1-modules.7 (2016-02-09) - first Atmosphere release

* Relax restriction on stateless components to not be in a `components`
  directory, let's hope it's ok.

* Intercept requests to `/packages/modules-runtime.js` and avoid need to
  replace entire module (until
  [install#86](https://github.com/benjamn/install/pull/6) is accepted).
