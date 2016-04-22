# React Hotloading in Meteor

* Edit your react components and see changes instantly, while maintaining state.
* Catch react `render()` errors and show on your screen rather than crashing your app
(currently just for initial pound pending
[facebook/react#6020](https://github.com/facebook/react/pull/6020)).

More info in https://github.com/gaearon/react-hot-boilerplate/pull/61.

## Configuration

You should be using `ecmascript-hot` if you aren't already:

1. Edit your `.meteor/packages` and replace `ecmascript` with `gadicc:ecmascript-hot`

Then follow these React Hotloader specific steps:

1. In your project root, `npm install --save-dev react-hot-loader@^3.0.0-alpha.12 redbox-react`
1. See the [babelrc docs][./babelrc.md] if `.babelrc` support is new for you.  Make sure
your *project root* `.babelrc` has at least the following (there's an example at the end of this file):

  ```js
{
  "plugins": [ "react-hot-loader/babel" ]
}
```
1. Modify your main client entry point / wherever you mount your root to resemble:

  ```js
import { AppContainer } from 'react-hot-loader';  // <-- add this line
import Root from './containers/Root';  // example; wherever you keep your main component

// Wherever you do this, probably in Meteor.startup()
ReactDOM.render(
  <AppContainer
    component={Root}
    props={{ store }}     {/* if e.g. you're using redux */}
  />,
  document.getElementById('root')
);

// This section is new, the references to "containers/Root" should match your import statement
if (module.hot) {
  module.hot.accept('./containers/Root', () => {
    render(
      <AppContainer
        component={require('./containers/Root').default}
        props={{ store }}
      />,
      document.getElementById('root')
    );
  });
}
```

1. You need to `import 'react-hot-loader/patch';` *before* importing `React`.  If you have a *single* client entry-point and get everything else from the `/imports` directory, just add this as your first line.  If you still use a "regular" client directory (with more than 1 file), try place just this line in a file called `client/_patchReact.js` (or possibly in `client/lib` if you use react from within that directory).

There's an (incredibly convoluted) example at https://github.com/gadicc/meteor-react-hotloader/tree/master/demo-rhl3.

## Sample .babelrc

```js
{
  "presets": [ "meteor" ],
  "plugins": [ "react-hot-loader/babel" ]
}
```
