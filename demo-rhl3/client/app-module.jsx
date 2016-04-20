import React from 'react';

// define and export our Layout component
export const Layout = ({content}) => (
    <div>
        <h1 className="b">My X App</h1>
        <hr />

        <div>Direct Welcome: <Welcome name="directA" /></div>
        <div>Via Content: {content}</div>
    </div>
);

//console.log('yes123');

// define and export our Welcome component
export const Welcome = ({name}) => (
    <div className="a">
        Hello, {name}.
    </div>
);
