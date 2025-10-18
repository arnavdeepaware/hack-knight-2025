import { WebSocket } from 'ws';

export interface VoiceMessage {
  type: 'description' | 'navigation' | 'objects' | 'error';
  content: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

export class VoiceService {
  private clients: Set<WebSocket> = new Set();
  private messageQueue: VoiceMessage[] = [];
  private isProcessing = false;

  addClient(ws: WebSocket) {
    this.clients.add(ws);
    console.log(`Client connected. Total clients: ${this.clients.size}`);
  }

  removeClient(ws: WebSocket) {
    this.clients.delete(ws);
    console.log(`Client disconnected. Total clients: ${this.clients.size}`);
  }

  async speak(message: string, type: VoiceMessage['type'] = 'description', priority: VoiceMessage['priority'] = 'medium') {
    const voiceMessage: VoiceMessage = {
      type,
      content: message,
      priority,
      timestamp: Date.now()
    };

    // Add to queue
    this.messageQueue.push(voiceMessage);
    
    // Sort by priority and timestamp
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.timestamp - b.timestamp;
    });

    // Process queue
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.messageQueue.length > 0 && this.clients.size > 0) {
      const message = this.messageQueue.shift();
      if (!message) break;

      await this.sendToClients(message);
      
      // Add delay between messages to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isProcessing = false;
  }

  private async sendToClients(message: VoiceMessage) {
    const messageStr = JSON.stringify(message);
    const deadClients: WebSocket[] = [];

    for (const client of this.clients) {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        } else {
          deadClients.push(client);
        }
      } catch (error) {
        console.error('Error sending message to client:', error);
        deadClients.push(client);
      }
    }

    // Remove dead clients
    deadClients.forEach(client => this.removeClient(client));
  }

  // Emergency stop - clear queue and send stop message
  stop() {
    this.messageQueue = [];
    const stopMessage: VoiceMessage = {
      type: 'error',
      content: 'Voice guidance stopped',
      priority: 'high',
      timestamp: Date.now()
    };
    this.sendToClients(stopMessage);
  }

  // Get current status
  getStatus() {
    return {
      connectedClients: this.clients.size,
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

export default new VoiceService();
