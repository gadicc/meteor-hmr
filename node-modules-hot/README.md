# node-modules-hot

WIP to help develop local node_modules in a Meteor project.

Note, I don't have time to maintain this.  If you have problems, hopefully you're in a position to fix them yourself and submit a PR so everyone benefits :D

## The problem

1. Local node modules have their own babel setup.
1. To dev, you need to:
  1. Save `src file`
  1. Run `npm run compile`
  1. Restart Meteor
1. That's a pain, so instead, on save, we:
  1. Run package's babel with it's babel config for just the changed file
  1. Hotload the changed output file back into Meteor for HMR
  1. Everything is still rebuilt so a full restart works too.

## Assumptions

1. Specific package structure:
  1. local babel installed as a devDependency for the package
  1. `src` (input) and `lib` (output) directories
1. `npm run compile` has been run at least once before so the output paths all already exist.
1. You need to import the "main" file explicitly (for now), i.e.
   ```js
   // wrong
   import something from 'hot-test';
   module.hot.accept('hot-test', ...);

   // right
   import something from 'hot-test/lib/index.js';
   module.hot.accept('hot-test/lib/index.js', ...);
   ```
