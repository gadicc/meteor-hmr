var id = Random.id(3);

log = function(/* arguments */) {
  var args = Array.prototype.slice.call(arguments);
  var pre = '\n[gadicc:hot-build] (' + id + '): ';

  if (typeof args[0] === 'string')
    args[0] =  pre + args[0];
  else
    args.splice(0, 0, pre);

  console.log.apply(console, args);
}

debug = function(/* arguments */) {
  if (process.env.HOT_DEBUG)
    log.apply(null, arguments);
}

log.id = id;
