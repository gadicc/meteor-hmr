var port = Meteor.settings.public.HOT_PORT;
if (!port) {
  // handy for tests, etc.
  console.warn('[gadicc:hot] Invalid port "'+port+'", not connecting...');
  return;
}

var wsUrl = 'ws://' + location.hostname + ':' + port + '/';
var serverBase = 'http://' + location.hostname + ':' + port + '/hot.js?hash=';

var ws = {};

ws.onmessage = function(event) {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = serverBase + event.data;
  document.head.appendChild(script);
}

ws.onopen = function() {
  ws.reconnecting = false;
  console.log('[gadicc:hot] Connected and ready.');
}

/*
ws.onerror = function(error) {
  console.log('[gadicc:hot] Socket error', error);
}
*/

ws.onclose = function() {
  if (ws.reconnecting > 20000) {
    console.log('[gadicc:hot] Giving up.  Reload this page when the server '
      + 'is running again.');
    return;
  } else if (ws.reconnecting) {
    ws.reconnecting *= 2;
  } else {
    ws.reconnecting = 100;
    console.log('[gadicc:hot] Disconnected, attempting to reconnect...');
  }
  
  setTimeout(ws.open, ws.reconnecting);
}

ws.open = function() {
  ws.connection = new WebSocket(wsUrl);
  ws.connection.onopen = ws.onopen;
  ws.connection.onclose = ws.onclose;
  ws.connection.onerror = ws.onerror;
  ws.connection.onmessage = ws.onmessage;
}

ws.open();
