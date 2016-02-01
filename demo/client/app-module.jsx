import React from 'react';

// define and export our Layout component
export const Layout = ({content}) => (
    <div>
        <h1 className="b">My X App</h1>
        <hr />

        <div>Direct Welcome: <Welcome name="direct" /></div>
        <div>Via Content: {content}</div>
    </div>
);

// define and export our Welcome component
export const Welcome = ({name}) => (
    <div className="a">
        Hello, {name}.
    </div>
);

window.X = { Layout, Welcome };