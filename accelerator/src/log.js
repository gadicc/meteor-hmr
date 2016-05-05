var id;
const HOT_DEBUG = process.env.HOT_DEBUG && parseInt(process.env.HOT_DEBUG) || 0;

function log(...args) {
  var pre = '\n[gadicc:hot] Accelerator (' + id + '): ';

  if (typeof args[0] === 'string')
    args[0] =  pre + args[0];
  else
    args.splice(0, 0, pre);

  console.log(...args);
}

log.setId = function(_id) {
  id = _id;
}

function debug(...args) {
  var verbosity;
  if (typeof args[0] === 'number') {
    verbosity = args[0];
    args = args.slice(1);
  } else
    verbosity = 1;

  if (verbosity <= HOT_DEBUG)
    log(...args);
}

if (HOT_DEBUG > 0) {
  // Because log.setId() has not been called yet
  console.log("[gadicc:hot] Accelerator running with HOT_DEBUG=" + HOT_DEBUG);
}

export { log, debug };
