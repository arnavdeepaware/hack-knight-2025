import { Request, Response } from 'express';
import sharp from 'sharp';
import geminiService from '../services/geminiService';
import voiceService from '../services/voiceService';

// Throttling for live analysis
const lastAnalysisTime = new Map<string, number>();
const ANALYSIS_THROTTLE_MS = 2000; // Minimum 2 seconds between analyses per session

export class VisionController {
  async analyzeImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
      }

      // Process image with sharp
      const processedImage = await sharp(req.file.buffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Get different types of analysis
      const [description, navigation, objects] = await Promise.all([
        geminiService.analyzeImage(processedImage),
        geminiService.getNavigationGuidance(processedImage),
        geminiService.identifyObjects(processedImage)
      ]);

      // Send voice guidance
      await voiceService.speak(description, 'description', 'high');
      await voiceService.speak(navigation, 'navigation', 'medium');
      await voiceService.speak(objects, 'objects', 'low');

      res.json({
        success: true,
        analysis: {
          description,
          navigation,
          objects
        }
      });
    } catch (error) {
      console.error('Error in analyzeImage:', error);
      await voiceService.speak('Sorry, I could not analyze the image. Please try again.', 'error', 'high');
      res.status(500).json({ error: 'Failed to analyze image' });
    }
  }

  async answerQuestion(req: Request, res: Response) {
    try {
      const question = (req.body?.question || '').toString().trim();
      if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
      }
      if (!question) {
        return res.status(400).json({ error: 'No question provided' });
      }

      // Process image with sharp to keep payload small
      const processedImage = await sharp(req.file.buffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const answer = await geminiService.answerQuestion(processedImage, question);

      // Speak the answer with high priority so user hears it promptly
      await voiceService.speak(answer, 'description', 'high');

      res.json({ success: true, answer });
    } catch (error) {
      console.error('Error in answerQuestion:', error);
      await voiceService.speak('Sorry, I could not answer that. Please try again.', 'error', 'high');
      res.status(500).json({ error: 'Failed to answer question' });
    }
  }
  async getVoiceStatus(req: Request, res: Response) {
    try {
      const status = voiceService.getStatus();
      res.json({ success: true, status });
    } catch (error) {
      console.error('Error getting voice status:', error);
      res.status(500).json({ error: 'Failed to get voice status' });
    }
  }

  async stopVoice(req: Request, res: Response) {
    try {
      voiceService.stop();
      res.json({ success: true, message: 'Voice guidance stopped' });
    } catch (error) {
      console.error('Error stopping voice:', error);
      res.status(500).json({ error: 'Failed to stop voice guidance' });
    }
  }

  async testVoice(req: Request, res: Response) {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      await voiceService.speak(message, 'description', 'medium');
      res.json({ success: true, message: 'Test message sent' });
    } catch (error) {
      console.error('Error in testVoice:', error);
      res.status(500).json({ error: 'Failed to send test message' });
    }
  }

  async analyzeLiveFrame(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
      }

      // Get client IP for throttling
      const clientId = req.ip || 'unknown';
      const now = Date.now();
      const lastTime = lastAnalysisTime.get(clientId) || 0;

      // Check if enough time has passed since last analysis
      if (now - lastTime < ANALYSIS_THROTTLE_MS) {
        return res.status(429).json({ 
          error: 'Analysis throttled', 
          retryAfter: Math.ceil((ANALYSIS_THROTTLE_MS - (now - lastTime)) / 1000)
        });
      }

      // Update last analysis time
      lastAnalysisTime.set(clientId, now);

      // Process image with sharp (smaller size for live analysis)
      const processedImage = await sharp(req.file.buffer)
        .resize(640, 480, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();

      // Get only essential analysis for live mode
      const description = await geminiService.analyzeImage(processedImage);

      // Send voice guidance with lower priority for live mode
      await voiceService.speak(description, 'description', 'low');

      res.json({
        success: true,
        analysis: {
          description,
          timestamp: now
        }
      });
    } catch (error) {
      console.error('Error in analyzeLiveFrame:', error);
      // Don't speak error for live mode to avoid spam
      res.status(500).json({ error: 'Failed to analyze live frame' });
    }
  }
}

export default new VisionController();
