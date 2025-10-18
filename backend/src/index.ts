import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import config from './config';
import visionRoutes from './routes/vision';
import WebSocketManager from './utils/websocket';

const app = express();
const server = createServer(app);

// Initialize WebSocket manager
const wsManager = new WebSocketManager(server);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/vision', visionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connectedClients: wsManager.getConnectedClients()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`🚀 Blind Assistance Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server running on ws://localhost:${PORT}/ws`);
  console.log(`🌐 CORS enabled for: ${config.corsOrigin}`);
  console.log(`🔑 Gemini API configured: ${config.geminiApiKey ? 'Yes' : 'No'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  wsManager.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  wsManager.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
