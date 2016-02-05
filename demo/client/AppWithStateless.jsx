import React, { Component } from 'react';
import Stateless from './Stateless.jsx';

export class AppWithStateless extends Component {
  render() {
    return (
      <div>Stateless:
        <Stateless prop1={11} prop2={"x"} />
      </div>
    );
  }
}