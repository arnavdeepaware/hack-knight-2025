const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3002 });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    // Handle video frames from iPhone
    // Broadcast to web clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data); // Forward video stream
      }
    });
  });
});
