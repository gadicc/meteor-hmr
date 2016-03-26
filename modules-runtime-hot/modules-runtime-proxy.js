if (process.env.NODE_ENV === 'production')
  return;

// console.log('[gadicc:hot] Overriding /packages/modules-runtime.js');

var fs = Npm.require('fs');

var staticFiles = WebAppInternals.staticFiles;
var modulesRuntime, modulesRuntimeHot, contents;

Meteor.startup(function() {
   modulesRuntime = staticFiles['/packages/modules-runtime.js'];
   modulesRuntimeHot = staticFiles['/packages/gadicc_modules-runtime-hot.js'];

   contents = fs.readFileSync(modulesRuntimeHot.absolutePath, 'utf8')
    .replace(/Package\['gadicc:modules-runtime-hot'\]/,
      "Package['modules-runtime']");
});

WebApp.rawConnectHandlers.use(function(req, res, next) {
  if (!req.url.match(/^\/packages\/modules-runtime\.js/))
    return next();

  res.writeHead(200, {
    'content-type': 'application/javascript; charset=UTF-8',
//    'cache-control': 'public, max-age=31536000',
//    'etag': modulesRuntimeHot.hash,
    'x-sourcemap': modulesRuntimeHot.sourceMapUrl
  });
  res.end(contents, 'utf8');
});
