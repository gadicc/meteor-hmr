# vNEXT

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
