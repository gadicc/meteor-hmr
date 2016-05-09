# React Hotloading in Meteor

* Edit your react components and see changes instantly, while maintaining state.
* Catch react `render()` errors and show on your screen rather than crashing your app
(currently just for initial mount pending
[facebook/react#6020](https://github.com/facebook/react/pull/6020)).

More info in https://github.com/gaearon/react-hot-boilerplate/pull/61.

## Configuration

What follows are instructions to add react hotloading to an existing app.  Later in this document, you can find full examples, further help for app-specific setups (like mantra and react-router apps) and links to other boilerplates.

You should be using `ecmascript-hot` if you aren't already:

1. `meteor remove ecmascript`
1. `meteor add gadicc:ecmascript-hot`

Note: if you're trying a non-stable release, you need to explicitly provide the `@version` (or `@=version` if it's not picked up correctly) in the second step.

Then follow these React Hotloader specific steps:

1. In your project root, `npm install --save-dev react-hot-loader@^3.0.0-beta.2 redbox-react` (check for the latest version of react-hot-loader)
1. See the [babelrc docs](./babelrc.md) if `.babelrc` support is new for you.  Make sure
your *project root* `.babelrc` has at least the following (there's an example at the end of this file):

  ```js
{
  "plugins": [ "react-hot-loader/babel" ]
}
```
1. Modify your main client entry point / wherever you mount your root to resemble:

  ```js
  import { AppContainer } from 'react-hot-loader';  // <-- add this line
  import AppRoot from './containers/Root';  // example; wherever you keep your main component

  // Wherever you do this, probably in Meteor.startup()
  ReactDOM.render(
    <AppContainer>
      <AppRoot />
    <AppContainer/>,
    document.getElementById('root')
  );

  // This section is new, the references to "containers/Root" should match your import statement
  if (module.hot) {
    module.hot.accept('./containers/Root', () => {
      const NextAppRoot = require('./containers/Root').default;
      render(
        <AppContainer>
          <NextAppRoot />
        </AppCotnainer>,
        document.getElementById('root')
      );
    });
  }
  ```

1. You need to:

  ```js
  import 'react-hot-loader/patch';`
  ```

*before* importing `React`.  If you have a *single* client entry-point and get everything else from the `/imports` directory, just add this as your first line.  If you still use a "regular" client directory (with more than 1 file), try place just this line in a file called `client/_patchReact.js` (or possibly in `client/lib` if you use react from within that directory).

## Sample .babelrc

```js
{
  "presets": [ "meteor" ],
  "plugins": [ "react-hot-loader/babel" ]
}
```

## Examples and app-specific Setup

There's an (extremely convoluted) working example of all the above in https://github.com/gadicc/meteor-hmr/tree/master/demo (besides the changed packages in `package.json`, note `client/_patch.js` and `client/index.jsx`).

See also the [Boilerplates](Boilerplates.md) section of the docs for other options.

### Mantra apps

There's a [mantra-sample-blog-app-hot](https://github.com/gadicc/mantra-sample-blog-app-hot) example.  Unfortunately default Mantra routing leads to a slightly weird pattern but it's not too bad.  You can also just see the [changes needed](https://github.com/gadicc/mantra-sample-blog-app-hot/compare/master...gadicc:hot) to take the stock `mantra-sample-blog-app` and make it hot.  Briefly:

1. Unfortunately, mantra apps don't live in `/imports`, so we have no control over load-order.  You need to view-source your app and click on 'app.js' near the bottom of the includes, to figure out which file in your app is called first (or at least, the first file to use React).  Here you should add the `import 'react-hot-loader/patch';` line.

1. You need to modify your `routes.jsx` to handle changes to component files.  The easiest way to understand what you need to do it to simply look at the "changes needed" link above.


### React Router Example

**main.jsx**:

```js
import 'react-hot-loader/patch';
import React from 'react';
import { browserHistory } from 'react-router';
import { Meteor } from 'meteor/meteor';
import { AppContainer as HotLoaderAppContainer } from 'react-hot-loader';
import ReactDOM from 'react-dom';
import AppRoutes from '/imports/startup/client/routes.jsx';

Meteor.startup(() => {
  const appElement = document.getElementById('app');

  const renderApp = (CurrentAppRoutes) => {
    ReactDOM.render(
      <HotLoaderAppContainer>
        <CurrentAppRoutes browserHistory={ browserHistory } />
      </HotLoaderAppContainer>,
      appElement
    );
  };

  renderApp(AppRoutes);

  if (module.hot) {
    module.hot.accept('/imports/startup/client/routes.jsx', () => {
      const NextAppRoutes = require('/imports/startup/client/routes.jsx').default;
      renderApp(NextAppRoutes);
    });
  }
});
```

**/imports/startup/client/routes.jsx**:

```js
import React from 'react';
import { Router, Route, IndexRoute } from 'react-router';

import AppContainer from '/imports/ui/containers/AppContainer.jsx';
import StandardPage from '/imports/ui/layouts/StandardPage.jsx';

import Home from '/imports/ui/pages/Home.jsx';

import About from '/imports/ui/pages/standard/About.jsx';
import Partners from '/imports/ui/pages/standard/Partners.jsx';
import NotFound from '/imports/ui/pages/standard/NotFound.jsx';

const AppRoutes = ({ browserHistory }) => (
  <Router history={ browserHistory }>
    <Route path="/" component={ AppContainer }>
      <IndexRoute component={ Home } />
      <Route component={ StandardPage } >
        <Route path="about" component={ About } />
        <Route path="partners" component={ Partners } />
        <Route path="*" component={ NotFound } />
      </Route>
    </Route>
  </Router>
);

AppRoutes.propTypes = {
  browserHistory: React.PropTypes.object,
};

export default AppRoutes;
```
