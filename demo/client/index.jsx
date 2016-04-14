import React from 'react';
import { render } from 'react-dom';
import { App } from './App.jsx';
import { AppWithStateless } from './AppWithStateless';
import Both from '../both/hello.jsx';

Meteor.startup(function() {
  var rootDiv = document.createElement('div');
  rootDiv.id = 'root';
  document.body.appendChild(rootDiv);

  render(<App />, document.getElementById('root'));

  var rootDiv2 = document.createElement('div');
  rootDiv2.id = 'root2';
  document.body.appendChild(rootDiv2);

  render(<AppWithStateless />, document.getElementById('root2'));

  var rootDiv3 = document.createElement('div');
  rootDiv3.id = 'root3';
  document.body.appendChild(rootDiv3);

  render(<Both />, document.getElementById('root3'));

});

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