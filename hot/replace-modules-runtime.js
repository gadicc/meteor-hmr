var modulesRunTimeHot = Assets.getText('modules-runtime-hot.js');

// No idea what's going on here... even if we don't mention
// modules-runtime-hot.js in package.js, Meteor bails if this
// is in the file.
modulesRunTimeHot = modulesRunTimeHot.replace(/\n\/\* Exports \*\/\n/,
  "/* Exports */\n" + 
  "if (typeof Package === 'undefined') Package = {};\n" +
  "(function (pkg, symbols) {\n" +
  "  for (var s in symbols)\n" +
  "    (s in pkg) || (pkg[s] = symbols[s]);\n" +
  "})(Package['modules-runtime'] = {}, {\n" +
  "  meteorInstall: meteorInstall\n" +
  "});\n");

WebApp.rawConnectHandlers.use(function(req, res, next) {
  if (!req.url.match(/^\/packages.modules-runtime.js/))
    return next();

  res.writeHead(200, { 'content-type': 'application/javascript; charset=UTF-8' });
  res.end(modulesRunTimeHot, 'utf8');
});

// console.log('[gadicc:hot] Overriding /packages/modules-runtime.js');
