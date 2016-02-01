import React from 'react';
import {mount} from 'react-mounter';
import {Layout, Welcome} from './app-module.jsx';

mount(Layout, {
  content: (<Welcome name="John" />)
});
