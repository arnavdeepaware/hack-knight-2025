import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  wsPort: parseInt(process.env.WS_PORT || '3002', 10),
  maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || '5242880', 10),
  imageQuality: parseInt(process.env.IMAGE_QUALITY || '80', 10),
};

export default config;
