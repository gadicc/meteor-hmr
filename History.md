# vNEXT

# v0.0.1-modules.7

* Relax restriction on stateless components to not be in a `components`
  directory, let's hope it's ok.

* Intercept requests to `/packages/modules-runtime.js` and avoid need to
  replace entire module (until
  [install#86](https://github.com/benjamn/install/pull/6) is accepted).
