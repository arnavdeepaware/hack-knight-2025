import { Request, Response } from 'express';
import sharp from 'sharp';
import geminiService from '../services/geminiService';
import voiceService from '../services/voiceService';

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
}

export default new VisionController();
