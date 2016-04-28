# Handling Hot Updates

NB: This is suited for developers who want to write their own hot acceptance code.  If you just want e.g. react hotloading, use the react-hot-loader babel plugin which implements the logic below for you.

This doc serves as a brief introduction to how hotloading works and hot to use it (as a developer).  You may also be interested in the following webpack docs for further reading:

* http://webpack.github.io/docs/hot-module-replacement.html
* http://webpack.github.io/docs/hot-module-replacement-with-webpack.html

Note: we only offer a partial HMR implementation but it covers the majority of cases.

## The Basics

When you save a change to a file (a module), it will be processed by it's build plugin and then sent to the client.  We then see if this file (which since Meteor 1.3 is actually a module) can "self-accept" the change (can reload itself).  If not, we look if it's parent module (the module that requires it) and see if it can accept the change for this dependency.  If not, we look at the parent of the parent, and so on, until we find a a module that can accept.  If, during our search, we reach a module that is not imported by anything else but still can't accept the change, we'll do a full reload of the page.

This looks a bit complicated in text, but the examples further down should make it clearer:

1. (A imports B) and (B imports C) and (C imports D) and (D imports E)
1. B can accept updates from C (e.g. B has a `hot.accept('C', callback)`)
1. E is updated (you save changes to the file)
1. E can't self accept, D can't accept E, C can't accept D, but B can accept C.
1. B gets the updated C with all the updated deps in between.

Let's look at an example of a case where a file has 1 import that will be updated.

**Accept dependency changes**:

When a module (a file) is updated, and the module that imports it (or one of it's parents), can accept the change.

style.js:

```
export default { color: "blue" };
```

example.js

```
import style from './style';

setDefaultStyle(style);

// Is hotloading available?  It's not in production.
if (module.hot) {
  // We can accept updates to the './style' module
  module.hot.accept('./style', function() {
    const style = require('./style');
    setDefaultStyle(style);
  })
}
```

Now if `style.js` is updated, `example.js` will accept the change because it knows how to handle it.

**Self acceptance**:

When a single file can accept it's own change, there is no callback given to `hot.accept()` - with no arguments, this simply marks the module as "self-accepted".  If this module (file) is updated, the entire file will simply be loaded again.  `hot.dispose()` may be used to provide a callback to call before the module is reloaded.  A good example is when CSS is sent to the client via JS modules:


style.css.js (could produced by a CSS build plugin):

```js
var style = { background: blue };
var styleElement = attachToDocumentWithStyleTag(style)

if (module.hot) {
  module.hot.dispose(() => {
    removeElementFromDocument(styleElement);
  });

  module.hot.accept(); // Register ourselves as being able to self-accept
}
```
