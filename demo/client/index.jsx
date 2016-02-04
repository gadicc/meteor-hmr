import React from 'react';
import { render } from 'react-dom';
import { App } from './App.jsx';

Meteor.startup(function() {
  var rootDiv = document.createElement('div');
  rootDiv.id = 'root';

  document.body.appendChild(rootDiv);

  render(<App />, document.getElementById('root'));
});
