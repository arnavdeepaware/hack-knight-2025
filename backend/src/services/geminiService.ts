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

      const prompt = `You are a grocery shopping assistant for blind people. Analyze this image and provide a focused description of the food shopping environment. Focus on:

1. Food items and products visible (fruits, vegetables, packaged goods, etc.)
2. Store layout and organization (aisles, sections, displays)
3. Product labels and signs that are readable
4. Shopping cart or basket contents if visible
5. Store staff or other shoppers if relevant
6. Price tags or promotional signs
7. Food safety information (expiration dates, storage instructions)

Keep the description under 80 words and focus specifically on food shopping context. Be ready to answer questions about what you see.`;

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

      const prompt = `You are a grocery store navigation assistant for blind people. Analyze this image and provide specific shopping navigation guidance. Focus on:

1. Store aisles and their organization
2. Shopping cart or basket locations
3. Product sections (produce, dairy, meat, etc.)
4. Checkout lanes and registers
5. Store staff or customer service areas
6. Shopping cart obstacles or clear paths
7. Product display heights and accessibility

Provide actionable guidance like "The produce section is to your right, about 15 steps away" or "There's a shopping cart blocking the aisle ahead". Keep it under 60 words and focus on grocery shopping context.`;

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

      const prompt = `Identify and describe food-related objects in this grocery store image. List them in order of shopping importance:

1. Fresh produce (fruits, vegetables) - type, condition, location
2. Packaged foods (cereals, snacks, canned goods) - brand, product name
3. Dairy products (milk, cheese, yogurt) - type, brand, expiration dates if visible
4. Meat and seafood - type, packaging, freshness indicators
5. Shopping cart or basket contents
6. Store displays and promotional items
7. Price tags and labels

For each food item, mention its approximate location (left, right, center, near, far) and any relevant shopping details like price, brand, or condition. Keep the response under 100 words.`;

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

      const systemPrompt = `You are a grocery shopping assistant for blind people. Answer the user's question about the food shopping environment using ONLY the information visible in the image. Focus on:

- Food items, brands, prices, and product details
- Store layout, aisles, and sections
- Product freshness, expiration dates, and quality
- Shopping cart contents and organization
- Store staff or other shoppers if relevant

If the answer cannot be determined from the image, say "I can't tell from the image." Keep answers under 80 words and be specific about food shopping context.`;

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

  async analyzeProduce(imageBuffer: Buffer): Promise<string> {
    try {
      const imageData = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const prompt = `You are analyzing fresh produce for a blind person shopping. Focus on:

1. Type of fruits or vegetables visible
2. Freshness indicators (color, firmness, blemishes)
3. Size and ripeness level
4. Price per pound or unit if visible
5. Organic vs conventional labels
6. Storage recommendations if mentioned
7. Any special offers or sales

Provide a helpful description for grocery shopping. Keep it under 80 words.`;

      const result = await this.model.generateContent([prompt, imageData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing produce with Gemini:', error);
      throw new Error('Failed to analyze produce');
    }
  }

  async analyzeStoreSection(imageBuffer: Buffer): Promise<string> {
    try {
      const imageData = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const prompt = `You are helping a blind person navigate a grocery store section. Analyze and describe:

1. What store section this is (produce, dairy, meat, bakery, etc.)
2. Aisle organization and layout
3. Product categories and their locations
4. Price signs and promotional displays
5. Store staff or other shoppers if visible
6. Shopping cart accessibility
7. Checkout lanes or registers nearby

Provide navigation guidance for grocery shopping. Keep it under 100 words.`;

      const result = await this.model.generateContent([prompt, imageData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing store section with Gemini:', error);
      throw new Error('Failed to analyze store section');
    }
  }
}

export default new GeminiService();
