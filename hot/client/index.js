if (process.env.NODE_ENV === 'production' || Meteor.isTest)
  return;

// Can't import, since we want to load this conditionally if we get past the above.
require('./hcp-intercept');
require('./websocket');

const hot = require('./hot').default;
const meteorInstallHot = require('./hot').meteorInstallHot;

// app packages that use modules don't get imported to global scope
window.hot = hot;
window.meteorInstallHot = meteorInstallHot;

export { hot, meteorInstallHot };
