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
  Package: global.Package,
};

class Sandbox {
  constructor() {
    this.context = new vm.createContext(contextBase);

    this.exec('window = this');
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

describe('meteorInstallHot', () => {

  it('replaces the exports of an existing module', () => {
    const s = new Sandbox();
    s.exec(`
      var meteorInstall = Package['modules-runtime'].meteorInstall;

      var require = meteorInstall({
        client: {
          "test1.js": function(require, exports, module) {
            exports.test = 1;
          }
        }
      });

      require('/client/test1.js').test;
    `, 'replacesExportsSetup.js').should.equal(1);

    
    s.exec(`
      meteorInstallHot({
        client: {
          "test1.js": [function(require, exports, module) {
            exports.test = 2;
          }]
        }
      });

      require('/client/test1.js').test;
    `, 'replacesExportsTest.js').should.equal(2);

    // No relevant hot.accept() in /client/test1.js.
    s.exec('hot.failedOnce').should.be.true;
  });

});
