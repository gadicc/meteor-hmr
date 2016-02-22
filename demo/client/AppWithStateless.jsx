import React, { Component } from 'react';
import Stateless from './Stateless.jsx';

export class AppWithStateless extends Component {
  render() {
    return (
      <div>Stateless:
        <Stateless prop1={12} prop2={"x"} />
      </div>
    );
  }
}