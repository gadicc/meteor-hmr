import React, { Component } from 'react';
import Stateless from './Stateless';

export class AppWithStateless extends Component {
  render() {
    return (
      <div>Stateless:
        <Stateless prop1={14} prop2={"z"} />
      </div>
    );
  }
}