import { before, after, beforeEach, afterEach, describe, xdescribe, it, xit,
  specify, xspecify, xcontext, context } from 'meteor/practicalmeteor:mocha';
import { chai, assert, expect, should } from 'meteor/practicalmeteor:chai';
import { spies, stubs } from 'meteor/practicalmeteor:sinon';
import vm from 'vm';
import { HTTP } from 'meteor/http'

should();

const fakeAutoUpdate = new vm.Script(`
Package.autoupdate = {
  Autoupdate: {
    _ClientVersions: {
      _collection: {
        find: 1,
        queries: {
          a: {}
        }
      }
    }
  }
};
`, 'fakeAutoUpdate.js');

const packages = [
  'underscore',
  'meteor',
  'gadicc_modules-runtime-hot',
  new vm.Script(`
    var Meteor = Package.meteor.Meteor;
    Package['modules-runtime'] = Package['gadicc:modules-runtime-hot'];
  `, 'modules-runtime-sub.js'),
  'modules',
  'ecmascript-runtime',
  fakeAutoUpdate,
  'gadicc_hot',
  new vm.Script(`
    var meteorInstall = Package['modules-runtime'].meteorInstall;
  `, 'setupMeteorInstall.js')
];

const meteorRuntimeConfig = new vm.Script(`
  __meteor_runtime_config__ = {
    "meteorRelease": "METEOR@1.3.2.1",
    "meteorEnv": {
      "NODE_ENV": "development",
      "TEST_METADATA": '{}' //"driverPackage":"practicalmeteor:mocha"}'
    },
    "PUBLIC_SETTINGS": {
      HOT_PORT: "test"
    },
    "ROOT_URL": "${Meteor.absoluteUrl()}",
    "ROOT_URL_PATH_PREFIX": "",
    "appId": "5nficts16err2z4vy",
    "autoupdateVersion": "ddZEzTkfDgokDDnGj",
    "autoupdateVersionRefreshable": "a708d9e64bcf5d580a8186e4fe688dd9bc9766d9",
    "autoupdateVersionCordova": "none"
  }
`, 'meteorRunTimeConfig.js');

const packageCache = {};

// Note, this isn't a sandbox for safety, just for isolation of tests
const contextBase = {
  console: console,
  location: {
    hostname: ''
  },
  WebSocket: function() {

  },
  document: {
    readyState: 'complete',
    addEventListener: function() { console.log('doc.ael', arguments); },
    //attachEvent: function() { console.log('ae', arguments); },
    getElementsByTagName: function() {
      // never used; just HEAD fetched at modules/css.js init
      return { item: function() { return 1; }}
    }
  },
  setTimeout: global.setTimeout,
  Package: global.Package
};

class Sandbox {
  constructor() {
    this.context = new vm.createContext(contextBase);
    this.exec('window = this; global = this;');

    meteorRuntimeConfig.runInContext(this.context);

    for (let pkg of packages)
      this.loadPackage(pkg);
  }
  loadPackage(packageName) {
    if (packageName instanceof vm.Script)
      return packageName.runInContext(this.context);

    const path = '/packages/' + packageName + '.js';
    if (!packageCache[path])
      packageCache[path] = new vm.Script(HTTP.get(Meteor.absoluteUrl(path)).content, path);
    packageCache[path].runInContext(this.context);
  }
  exec(code, name) {
    const script = new vm.Script(code, name);
    return script.runInContext(this.context);
  }
}

describe('a', () => {
  console.log(4);
  it('passes', () => {
    console.log(5);
  });
});

describe('meteorInstallHot', () => {

  it('fails if no relevant hot.accept() found', () => {
    const s = new Sandbox();
    s.exec(`
      var require = meteorInstall({
        client: {
          "noHotAccept.js": function(require, exports, module) {
            exports.testValue = 1;
          }
        }
      });
      require('/client/noHotAccept.js').testValue;
    `, 'noHotAccept1.js').should.equal(1);  // it loads properly

    s.exec(`
      meteorInstallHot({
        client: {
          "noHotAccept.js": [function(require, exports, module) {
          }]
        }
      });
      hot.failedOnce;
   `, 'noHotAccept2.js').should.equal(true); // No relevant hot.accept() found
  });

  it('can self accept', () => {
    const s = new Sandbox();
    s.exec(`
      var testValue;
      var require = meteorInstall({
        client: {
          "selfAcceptTest.js": function(require, exports, module) {
            module.hot.accept();
            testValue = 1;
          }
        }
      });
      require('/client/selfAcceptTest.js');
      testValue;
   `, 'selfAcceptTest1.js').should.equal(1);

    s.exec(`
      meteorInstallHot({
        client: {
          "selfAcceptTest.js": [function(require, exports, module) {
            testValue = 2;
          }]
        }
      });
      testValue;
   `, 'selfAcceptTest1.js').should.equal(2);

    s.exec('hot.failedOnce').should.be.false;
  });

  it('replaces the exports of an existing module', () => {
    const s = new Sandbox();
    s.exec(`
      var testValue;
      var require = meteorInstall({
        client: {
          "test2.js": function(require, exports, module) {
            exports.testValue = 1;
          },
          "test1.js": ['./test2.js', function(require, exports, module) {
            testValue = require('./test2.js').testValue;
            module.hot.accept('./test2.js', function() {
              testValue = require('./test2.js').testValue;
            });
          }]
        }
      });

      require('/client/test1.js');
      testValue;
    `, 'replacesExportsSetup.js').should.equal(1);

    
    s.exec(`
      meteorInstallHot({
        client: {
          "test2.js": function(require, exports, module) {
            exports.testValue = 2;
          }
        }
      });

      testValue;
    `, 'replacesExportsTest.js').should.equal(2);

    s.exec('hot.failedOnce').should.be.false;
  });

  it('works with accept("package") and update "package/main.js"', () => {
    const s = new Sandbox();
    s.exec(`
      var testValue;

      var require = meteorInstall({
        client: {
          "app.js": function(require, exports, module) {
            testValue = require('hot-test').test;
            module.hot.accept('hot-test', function() {
              testValue = require('hot-test').test;
            });
          }
        },
        node_modules: {
          "hot-test": {
            "package.json": function(require, exports) {
              exports.main = "./main.js";
            },
            "main.js": function(require, exports) {
              exports.test = 1;
            }
          }
        }
      });

      require('/client/app.js');
      testValue;
    `, 'nodeModuleSetup.js').should.equal(1);

    
    s.exec(`
      meteorInstallHot({
        node_modules: {
          "hot-test": {
            "main.js": function(require, exports) {
              exports.test = 2;
            }
          }
        }
      });

      testValue;
    `, 'nodeModuleTest.js').should.equal(2);

    s.exec('hot.failedOnce').should.be.false;
  });

});
