# meteor-hotload-accelerator

See https://atmospherejs.com/gadicc/ecmascript-hot.

## Development

Because `hot-build` will connect to an existing accelerator if one exists, we can start the accelerator before running Meteor to develop it independently from the build process, saving much pain:

1. *Don't* start Meteor yet
1. For now, edit the consts in `src/dev.js` and `npm run compile`.
1. `npm run dev`
1. Run Meteor

On any file change, we'll kill the accelerator, run babel and launch the new accelerator.  `hot-build` will notice the disconnect and try reconnect, and send the new instance all the data it needs to carry off where the old one left off.  The client will also reconnect in time.

### Dev via Meteor

If you need to edit code from the accelerator, you should adjust `hot-builds`'s `package.js` to `Npm.depend()` on your local files.  You'll see an example commented out above the currently published version which I use for my home dir and you can adjust accordingly.

Updating this way is a pain, but here's what to do:

1. `npm run compile` in accelerator dir
1. Change `hot-build`'s `package.js` (e.g. insert a new line) to get Meteor to pull in the new dep.  You should see `gadicc:hot-build: updating npm dependencies -- meteor-hotload-accelerator...`
1. Since the accelerator is now a single long-lived process, you need to restart Meteor too.
