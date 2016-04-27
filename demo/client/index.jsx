import { AppContainer } from 'react-hot-loader';
import React from 'react';

import { render } from 'react-dom';
import { App } from './App';
import { AppWithStateless } from './AppWithStateless';
import Both from '../both/hello';

Meteor.startup(function() {
  var rootDiv = document.createElement('div');
  rootDiv.id = 'root';
  document.body.appendChild(rootDiv);

  render(<AppContainer component={App} />, document.getElementById('root'));

  var rootDiv2 = document.createElement('div');
  rootDiv2.id = 'root2';
  document.body.appendChild(rootDiv2);

  render(<AppContainer component={AppWithStateless} />, document.getElementById('root2'));

  var rootDiv3 = document.createElement('div');
  rootDiv3.id = 'root3';
  document.body.appendChild(rootDiv3);

  render(<AppContainer component={Both} />, document.getElementById('root3'));
});

import { NICE } from './colors';
console.log('orig NICE', NICE);
if (module.hot)
module.hot.accept('./colors', function() {
  console.log('new NICE', require('./colors').NICE);
});

import { something } from 'meteor/hot-package-example';
console.log('something: ' + something);
if (module.hot)
module.hot.accept('meteor/hot-package-example', function() {
  console.log('new something: ', require('meteor/hot-package-example').something);
});

if (module.hot) {
  module.hot.accept('./App', () => {
    const App = require('./App').App;
    render(<AppContainer component={App} />, document.getElementById('root'));
  });
  module.hot.accept('./AppWithStateless', () => {
    const AppWithStateless = require('./AppWithStateless').AppWithStateless;
    render(<AppContainer component={AppWithStateless} />, document.getElementById('root2'));
  });
  module.hot.accept('../both/hello', () => {
    const Both = require('../both/hello').default;
    render(<AppContainer component={Both} />, document.getElementById('root3'));
  });
}

/*
function readonly(target, key, descriptor) {
  descriptor.writable = false;
  return descriptor;
}

class Cat {
  @readonly
  meow() { }
}

window.cat = new Cat();
window.cat.meow = 1;
*/