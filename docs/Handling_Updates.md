# Handling Hot Updates

NB: This is suited for developers who want to write their own hot acceptance code.  If you just want e.g. react hotloading, use the react-hot-loader babel plugin which implements the logic below for you.

This doc serves as a brief introduction to how hotloading works and hot to use it (as a developer).  You may also be interested in the following webpack docs for further reading:

* http://webpack.github.io/docs/hot-module-replacement.html
* http://webpack.github.io/docs/hot-module-replacement-with-webpack.html

Note: we only offer a limited implementation of `hot.accept()`.

## The Basics

When you save a change to a file, it will be processed by it's build plugin and then sent to the client.  We then see if this file (which since Meteor 1.3 is actually a module) can "self-accept" the change (can reload itself) or see if anything that requires it can accept the change.

**Self acceptance**:

example.js:

```js
console.log("I was loaded!");

if (module.hot)        // Is hotloading available?  Won't be in production.
  module.hot.accept(); // Register ourselves as being able to self-accept
```

This is usually more useful with a `dispose()` handler, as per the CSS example in the webpack doc.  This is not supported yet but will be soon.

You should only do this with a module *that has no exports*, otherwise you'll break the chain.  If your module has imports, you should try accept the change in the parent module (the module that imports it) - that module should either self-accept or know how to accept the changed dependency, as explained below.

**Accept dependency changes**:

style.js:

```
export default { color: "blue" };
```

example.js

```
import style from './style';

setDefaultStyle(style);

if (module.hot) {
  // We can accept updates to the './style' module
  module.hot.accept('./style', function() {
    const style = require('./style');
    setDefaultStyle(style);
  })
}
```

Now if `style.js` is updated, `example.js` will accept the change because it knows how to handle it.
