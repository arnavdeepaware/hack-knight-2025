const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env file!');
  process.exit(1);
}

console.log('🔑 Gemini API Key loaded:', GEMINI_API_KEY.substring(0, 20) + '...');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ✅ USE gemini-2.0-flash (stable, supports vision)
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature: 0.2,
    topP: 0.8,
    topK: 40,
  }
});

// Helper: Clean and parse JSON
function parseGeminiJSON(text) {
  try {
    let cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('JSON parse error:', err.message);
    console.error('Raw text:', text.substring(0, 500));
    return null;
  }
}

// POST /api/detect - Analyze packaged food product
app.post('/api/detect', async (req, res) => {
  try {
    console.log('\n📸 New detection request received');
    
    const { image, mode } = req.body;
    
    if (!image) {
      console.error('❌ No image provided');
      return res.status(400).json({ 
        error: 'No image provided' 
      });
    }

    console.log(`📦 Mode: ${mode || 'food'}`);
    console.log(`🖼️  Image size: ${image.length} bytes`);

    // Extract base64 data
    const base64Data = image.includes('base64,') 
      ? image.split('base64,')[1] 
      : image;

    if (!base64Data || base64Data.length < 100) {
      throw new Error('Invalid image data');
    }

    console.log('✅ Image data extracted, sending to Gemini...');

    // Prepare image for Gemini
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg'
      }
    };

    // Structured prompt for packaged food detection
    const prompt = `You are analyzing a PACKAGED FOOD product label for a blind person shopping.

TASK: Extract product information and nutrition facts ONLY if clearly visible.

Return ONLY valid JSON (no markdown, no extra text):

{
  "detected": true/false,
  "product": {
    "name": "Full product name" or null,
    "brand": "Brand/manufacturer name" or null,
    "quantity": "Size with unit (e.g., 8.4 FL OZ, 500g)" or null
  },
  "nutrition": {
    "calories": number or null,
    "servingSize": "text" or null,
    "carbs": number or null,
    "protein": number or null,
    "fat": number or null,
    "sugars": number or null,
    "sodium": number or null,
    "fiber": number or null
  },
  "ingredients": ["ingredient1", "ingredient2"] or null,
  "message": "Natural language description for blind user"
}

CRITICAL RULES:
1. If you see a PACKAGED FOOD product with readable text, set "detected": true
2. Extract ONLY what is CLEARLY VISIBLE - never guess
3. For nutrition numbers, return ONLY the number (no units)
4. If nutrition label is not visible, set all nutrition values to null
5. "message" should naturally describe what you see for voice output
6. If NO food product visible, set "detected": false

Return ONLY the JSON object, nothing else.`;

    console.log('🤖 Calling Gemini API...');

    // Call Gemini
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log('📥 Gemini raw response:', text.substring(0, 300) + '...');

    // Parse response
    const parsed = parseGeminiJSON(text);

    if (!parsed) {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    console.log('✅ Parsed successfully');

    // Send response
    res.json({
      success: true,
      detected: parsed.detected || false,
      product: parsed.product || null,
      nutrition: parsed.nutrition || null,
      ingredients: parsed.ingredients || null,
      message: parsed.message || 'Analysis complete'
    });

    console.log('✅ Response sent to frontend\n');

  } catch (error) {
    console.error('\n❌ ERROR in /api/detect:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to analyze image',
      details: error.message,
      detected: false
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    geminiConfigured: !!GEMINI_API_KEY,
    model: 'gemini-2.0-flash',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify API key
app.get('/api/test-gemini', async (req, res) => {
  try {
    const result = await model.generateContent(['Say "Hello from Gemini!" in JSON format: {"message": "..."}']);
    const response = await result.response;
    res.json({ 
      success: true, 
      response: response.text() 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ================================');
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`🔑 Gemini API Key: ${GEMINI_API_KEY ? 'Configured ✓' : 'Missing ✗'}`);
  console.log(`📡 CORS enabled for: http://localhost:3000`);
  console.log(`🤖 Model: gemini-2.0-flash`);
  console.log('================================\n');
  console.log('📋 Available endpoints:');
  console.log(`   POST http://localhost:${PORT}/api/detect - Analyze food product`);
  console.log(`   GET  http://localhost:${PORT}/api/health - Health check`);
  console.log(`   GET  http://localhost:${PORT}/api/test-gemini - Test Gemini API`);
  console.log('\n💡 Waiting for detection requests...\n');
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
