import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async analyzeImage(imageBuffer: Buffer): Promise<string> {
    try {
      const imageData = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const prompt = `You are a helpful assistant for blind people. Analyze this image and provide a clear, concise description that would help a blind person understand what they're seeing. Focus on:

1. Main objects and people in the scene
2. Spatial relationships (left, right, center, distance)
3. Colors and visual characteristics
4. Text if visible (read signs, labels, etc.)
5. Potential obstacles or hazards
6. Navigation cues (doors, paths, stairs)

Keep the description under 100 words and use simple, clear language. Be specific about locations and distances when possible.`;

      const result = await this.model.generateContent([prompt, imageData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing image with Gemini:', error);
      throw new Error('Failed to analyze image');
    }
  }

  async getNavigationGuidance(imageBuffer: Buffer): Promise<string> {
    try {
      const imageData = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const prompt = `You are a navigation assistant for blind people. Analyze this image and provide specific navigation guidance. Focus on:

1. Clear paths and walkways
2. Obstacles to avoid (steps, curbs, objects)
3. Doors, entrances, and exits
4. Stairs or elevators
5. Handrails or guide features
6. Crowded areas or open spaces
7. Directional cues (signs, arrows)

Provide actionable guidance like "Walk straight for 10 steps, then turn left at the door" or "There's a step down ahead, be careful". Keep it under 80 words.`;

      const result = await this.model.generateContent([prompt, imageData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error getting navigation guidance:', error);
      throw new Error('Failed to get navigation guidance');
    }
  }

  async identifyObjects(imageBuffer: Buffer): Promise<string> {
    try {
      const imageData = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const prompt = `Identify and describe objects in this image that a blind person should know about. List them in order of importance:

1. People (how many, approximate age, what they're doing)
2. Furniture and fixtures
3. Electronic devices
4. Food or drinks
5. Personal items
6. Safety-related objects

For each object, mention its approximate location (left, right, center, near, far) and any relevant details. Keep the response under 120 words.`;

      const result = await this.model.generateContent([prompt, imageData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error identifying objects:', error);
      throw new Error('Failed to identify objects');
    }
  }

  async answerQuestion(imageBuffer: Buffer, question: string): Promise<string> {
    try {
      const imageData = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const systemPrompt = `You are a concise visual assistant. Answer the user's question using ONLY the information visible in the image. If the answer cannot be determined from the image, say "I can't tell from the image."

Keep answers under 60 words. Prefer direct, helpful responses.`;

      const userPrompt = `Question: ${question}`;

      const result = await this.model.generateContent([systemPrompt, userPrompt, imageData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error answering question with Gemini:', error);
      throw new Error('Failed to answer question');
    }
  }
}

export default new GeminiService();
