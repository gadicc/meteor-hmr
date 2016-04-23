var id;

function log(/* arguments */) {
  var args = Array.prototype.slice.call(arguments);
  var pre = '\n[gadicc:hot] Accelerator (' + id + '): ';

  if (typeof args[0] === 'string')
    args[0] =  pre + args[0];
  else
    args.splice(0, 0, pre);

  console.log.apply(console, args);
}

log.setId = function(_id) {
  id = _id;
}

function debug(/* arguments */) {
  if (process.env.HOT_DEBUG)
    log.apply(null, arguments);
}

export { log, debug };
