var fs = require('fs');
var crypto = require('crypto');

/* get file data from build plugin */

process.on('message', function(msg) {
  if (msg.type === 'fileData') {
    // console.log('got ' + Object.keys(msg.data).length);

    // hothacks.js guarantees that these are all new
    for (var key in msg.data)
      fs.watch(key, onChange.bind(null, key, msg.data[key]));

    return;
  }

  console.log('[gadicc-hot-fork] Unknown message: ' + JSON.stringify(msg));
});

/* handle file changes */

var lastCall = {};
function onChange(file, inputFile, event) {
  // de-dupe 2 calls for same event
  var now = Date.now();
  if (lastCall[file] && now - lastCall[file] < 2)
    return;
  lastCall[file] = now;

  if (event === 'rename') {
    console.log('todo, rename support', file);
    return;
  }

  //console.log('got ' + event + ' for ', JSON.stringify(file, null, 2));
  fs.readFile(file, 'utf8', function(err, contents) {
    if (err) throw new Error(err);

    inputFile.sourceHash =
      crypto.createHash('sha1').update(contents).digest('hex');

    inputFile.contents = contents;

    addInputFile(inputFile);
  });

}

/* debounce */

var timeout, inputFiles = [];

function addInputFile(inputFile) {
  if (timeout) clearTimeout(timeout);

  inputFiles.push(inputFile);
  sendInputFiles();

  timeout = setTimeout(sendInputFiles, 2);
}

function sendInputFiles() {
  process.send({
    type: 'inputFiles',
    inputFiles: inputFiles
  });

  inputFiles = [];
  timeout = null;
}
