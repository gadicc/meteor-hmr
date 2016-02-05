import React from 'react';
import { render } from 'react-dom';
import { App } from './App.jsx';
import { AppWithStateless } from './AppWithStateless.jsx';

Meteor.startup(function() {
  var rootDiv = document.createElement('div');
  rootDiv.id = 'root';
  document.body.appendChild(rootDiv);

  render(<App />, document.getElementById('root'));

  var rootDiv2 = document.createElement('div');
  rootDiv2.id = 'root2';
  document.body.appendChild(rootDiv2);

  render(<AppWithStateless />, document.getElementById('root2'));

});
