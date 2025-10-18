import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

export class GeminiLiveService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    // Use the Live API model for real-time video processing
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-live',
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      }
    });
  }

  async processLiveVideo(videoStream: MediaStream): Promise<ReadableStream> {
    try {
      // Convert MediaStream to a format Gemini can process
      const videoTrack = videoStream.getVideoTracks()[0];
      const videoElement = document.createElement('video');
      videoElement.srcObject = videoStream;
      
      // Create a readable stream for continuous video processing
      const videoStreamProcessor = new ReadableStream({
        start(controller) {
          const processFrame = () => {
            if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
              // Capture current frame
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = videoElement.videoWidth;
              canvas.height = videoElement.videoHeight;
              
              if (ctx) {
                ctx.drawImage(videoElement, 0, 0);
                canvas.toBlob((blob) => {
                  if (blob) {
                    controller.enqueue(blob);
                  }
                }, 'image/jpeg', 0.8);
              }
            }
            requestAnimationFrame(processFrame);
          };
          processFrame();
        }
      });

      return videoStreamProcessor;
    } catch (error) {
      console.error('Error processing live video:', error);
      throw new Error('Failed to process live video');
    }
  }

  async analyzeVideoFrame(videoBlob: Blob): Promise<string> {
    try {
      // Convert blob to base64
      const arrayBuffer = await videoBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      const videoData = {
        inlineData: {
          data: base64,
          mimeType: 'image/jpeg'
        }
      };

      const prompt = `You are a helpful assistant for blind people. Analyze this video frame and provide a clear, concise description that would help a blind person understand what they're seeing in real-time. Focus on:

1. Main objects and people in the scene
2. Movement and changes from previous frames
3. Spatial relationships (left, right, center, distance)
4. Colors and visual characteristics
5. Text if visible (read signs, labels, etc.)
6. Potential obstacles or hazards
7. Navigation cues (doors, paths, stairs)

Keep the description under 80 words and use simple, clear language. Be specific about locations and distances when possible.`;

      const result = await this.model.generateContent([prompt, videoData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing video frame:', error);
      throw new Error('Failed to analyze video frame');
    }
  }

  // Alternative: Process video as a continuous stream
  async processVideoStream(videoFrames: Blob[]): Promise<string> {
    try {
      // Process multiple frames together for better context
      const frameData = await Promise.all(
        videoFrames.map(async (frame) => {
          const arrayBuffer = await frame.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          return {
            inlineData: {
              data: base64,
              mimeType: 'image/jpeg'
            }
          };
        })
      );

      const prompt = `You are analyzing a sequence of video frames for a blind person. Provide a continuous description of what's happening, focusing on:

1. Changes and movement between frames
2. Objects entering or leaving the scene
3. Navigation guidance based on the video sequence
4. Important visual cues that change over time

Keep it under 100 words and describe the flow of movement.`;

      const result = await this.model.generateContent([prompt, ...frameData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error processing video stream:', error);
      throw new Error('Failed to process video stream');
    }
  }
}

export default new GeminiLiveService();
