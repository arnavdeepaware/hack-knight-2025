import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

export interface NutritionFacts {
  calories?: string | number | null;
  servingSize?: string | null;
  fat?: string | null;
  saturatedFat?: string | null;
  transFat?: string | null;
  cholesterol?: string | null;
  sodium?: string | null;
  carbohydrates?: string | null;
  fiber?: string | null;
  sugars?: string | null;
  addedSugars?: string | null;
  protein?: string | null;
}

export interface PackagedFoodResult {
  status: 'ok' | 'uncertain' | 'not_visible';
  product: {
    brand: string | null;
    item: string | null;
    quantity: string | null; // e.g., "500g", "12 oz", "2L"
    ingredients: string[] | null; // null if not readable
  };
  nutritionFacts?: NutritionFacts | null; // present only if facts panel is readable
  notes?: string | null; // optional clarifications like "partially occluded"
}

function stripCodeFences(s: string) {
  return s
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}

function safeParseLLMJson(s: string): any {
  const cleaned = stripCodeFences(s);
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to salvage common issues like trailing commas
    const relaxed = cleaned.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(relaxed);
  }
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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

  async analyzePackagedFood(imageBuffer: Buffer): Promise<PackagedFoodResult> {
    try {
      const imageData = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      };

      const schemaHint = `
Return ONLY JSON with this exact shape and no extra text:

{
  "status": "ok" | "uncertain" | "not_visible",
  "product": {
    "brand": string | null,
    "item": string | null,
    "quantity": string | null,
    "ingredients": string[] | null
  },
  "nutritionFacts": {
    "calories": string | number | null,
    "servingSize": string | null,
    "fat": string | null,
    "saturatedFat": string | null,
    "transFat": string | null,
    "cholesterol": string | null,
    "sodium": string | null,
    "carbohydrates": string | null,
    "fiber": string | null,
    "sugars": string | null,
    "addedSugars": string | null,
    "protein": string | null
  } | null,
  "notes": string | null
}

Rules:
- Extract only what is VISIBLE in the image. Do not guess.
- If label is too unclear to read any product-specific info, set "status": "not_visible" and use notes like "cannot see clearly".
- If partially readable, set "status": "uncertain" and fill known fields; unknown fields must be null.
- "ingredients" must be an array of visible ingredient words if readable; otherwise null.
- If a Nutrition Facts panel is VISIBLE and readable, include "nutritionFacts" with whatever fields are readable; otherwise set it to null.
- For numbers like calories you may return a number (e.g., 180). For others keep units as text (e.g., "12g").
- Output strictly JSON, no markdown.`;

      // Use a JSON-forcing config for this call
      const jsonModel = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.2,
        },
      });

      const result = await jsonModel.generateContent([
        {
          text: `You are analyzing a PACKAGED FOOD product label for accessibility.

Tasks:
1) Product: brand (manufacturer), item/name (what it is), quantity/size if visible, ingredients list if visible.
2) Nutrition Facts: if the nutrition panel is visible, extract key fields (calories, serving size, fat, carbs, protein, sugar, sodium, etc.) that can be read.

${schemaHint}`,
        },
        imageData,
      ]);

      const response = await result.response;
      const text = response.text();

      const parsed = safeParseLLMJson(text) as PackagedFoodResult;

      // Minimal post-validate and normalize
      if (!parsed || !parsed.product) {
        return {
          status: 'not_visible',
          product: { brand: null, item: null, quantity: null, ingredients: null },
          nutritionFacts: null,
          notes: 'cannot see clearly',
        };
      }

      // Ensure fields exist even if model omitted some
      parsed.status = parsed.status ?? 'uncertain';
      parsed.product = {
        brand: parsed.product.brand ?? null,
        item: parsed.product.item ?? null,
        quantity: parsed.product.quantity ?? null,
        ingredients: Array.isArray(parsed.product.ingredients)
          ? parsed.product.ingredients
          : null,
      };
  if (parsed.nutritionFacts === undefined) parsed.nutritionFacts = null;
  if (parsed.notes === undefined) parsed.notes = null;

      // If nothing readable, flip to not_visible
      const hasAny =
        parsed.product.brand ||
        parsed.product.item ||
        parsed.product.quantity ||
        (parsed.product.ingredients && parsed.product.ingredients.length > 0) ||
        (parsed.nutritionFacts &&
          Object.values(parsed.nutritionFacts).some(v => v !== null && v !== ''));
      if (!hasAny) {
        parsed.status = 'not_visible';
        parsed.notes = parsed.notes || 'cannot see clearly';
      }

      return parsed;
    } catch (error) {
      console.error('Error analyzing packaged food with Gemini:', error);
      return {
        status: 'not_visible',
        product: { brand: null, item: null, quantity: null, ingredients: null },
        nutritionFacts: null,
        notes: 'cannot see clearly',
      };
    }
  }
}

export default new GeminiService();
