import { WebSocketServer } from 'ws';
import { Server } from 'http';
import voiceService from '../services/voiceService';

export class WebSocketManager {
  private wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection from:', req.socket.remoteAddress);
      
      // Add client to voice service
      voiceService.addClient(ws);

      // Handle client messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received message:', data);
          
          // Handle different message types
          switch (data.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              break;
            case 'status':
              const status = voiceService.getStatus();
              ws.send(JSON.stringify({ type: 'status', data: status }));
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        voiceService.removeClient(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        voiceService.removeClient(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Blind Assistance Voice Service',
        timestamp: Date.now()
      }));
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  getConnectedClients(): number {
    return this.wss.clients.size;
  }

  broadcast(message: any) {
    const messageStr = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(messageStr);
      }
    });
  }

  close() {
    this.wss.close();
  }
}

export default WebSocketManager;
