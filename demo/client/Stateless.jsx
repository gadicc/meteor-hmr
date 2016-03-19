import React from 'react';

const Stateless = ({prop1,prop2}) => (
  <div>
    <Stateless1 />
    <Stateless2 />
  </div>
);

const Stateless1 = ({prop1,prop2}) => (
  <div>
    <div>prop1a: {prop1}</div>
    <div>prop2b: {prop2}</div>
  </div>
);

const Stateless2 = ({prop1,prop2}) => {
  var x = 12;
  return (
    <div>
      <div>prop{x}a: {prop1}</div>
      <div>prop2b: {prop2}</div>
    </div>
  );
};

export default Stateless;