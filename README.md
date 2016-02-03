# meteor-react-hotload

React Hot Loading in Meteor, today, in the worst way possible.

I'm not interested in maintaining this project, it's a community experiment.
If you'd like to help out, immediate repo write access is available to anyone
who has previously contributed (via PR / write access) to meteor, kadira,
velocity, etc (or that I've worked with previously).  Otherwise PRs welcome :)

https://github.com/gaearon/react-proxy

1. Don't force refresh on change of JSX
1. Use the babel-plugin-react-transform
1. Make a meteor react-transform-hmr or provide HMR API in meteor
1. proxy

## To use in another app (not recommended yet; use with correct Meteor commit)

1. Symlink demo/packages/* to your app `packages` dir
1. Edit your `.meteor/packages`
1.1. replace 'ecmascript' with 'ecmascript-hot'
1.1. add 'hot'

## How this works

Brace yourself for reading this and recall the project goals.

1. Avoids use of `inputFile.addJavaScript()` in the compiler plugin to prevent
client refresh.
1. Manually construct a module tree that (hopefully) resembles Meteor's linker
1. Bundle this and store in Mongo (no other way to communicate with the running app)
1. Publish/subscribe id's of new bundles, insert script tag in the HEAD to
load it, serve it.

## Changes from original core packages

Packages are based off the following commit in `meteor/meteor`:

```
commit 877cb9e61ae8bcf6312c6cec05bc943560770118
Author: Ben Newman <ben@meteor.com>
Date:   Mon Jan 25 15:34:16 2016 -0500

    Add a test of client/compatibility directories.
```

You can diff the latest commit here against the first commit in
this repo to see all changes to those packages.


App only - avoid need to link in package imports
client/* only - use Meteor's regular linker for server code
