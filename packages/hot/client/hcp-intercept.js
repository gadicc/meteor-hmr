/*
 * Intercept the 'changed' callback for observes on _ClientVersions updates.
 * If an HCP came right after a (successful) HMR, simply skip it (by not
 * calling the original callback from autoreload).
 *
 * Note, there's a race condition on load, so we cover both cases; either
 * find() has already been called, in which case we augment the `changed`
 * function of the existing query; in case we missed that, we also override
 * the find() method for this collection to intercept the callback and
 * augment it before it's stored.
 */

import hot from './hot';
import { Autoupdate } from 'meteor/autoupdate';

// Wrapper for changed callbacks to decide whether or not to deliver them
function augmentChanged(origChanged) {
  return function(oldDoc, newDoc) {
    // This gets set in meteorInstallHot
    if (hot.blockNextHCP) {

      if (hot.failedOnce) {
        console.info('[gadicc:hot] HMR failed, allowing HCP...');
        origChanged.call(this, oldDoc, newDoc);
      } else {
        console.info('[gadicc:hot] Skipping HCP after successful HMR');
        hot.blockNextHCP = false;
      }

    } else /* !blocknextHCP */ {

      origChanged.call(this, oldDoc, newDoc);

    }
  };
}

// If find() was called before we load
var queries = Autoupdate._ClientVersions._collection.queries;
for (var key in queries) {
  queries[key].changed = augmentChanged(queries[key].changed);  
}

// Override find() to intercept on future calls
var origFind = Autoupdate._ClientVersions.find;
Autoupdate._ClientVersions.find = function(/* arguments */) {
  var cursor = origFind.apply(this, arguments);

  var origObserve = cursor.observe;
  cursor.observe = function(callbacks) {
    callbacks.changed = augmentChanged(callbacks.changed);

    origObserve.call(this, callbacks);
  };

  return cursor;
}

