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

// ✅ Rate Limiting Configuration
const RATE_LIMITS = {
  detection: {
    interval: 5000, // Increase from 3s to 5s (12 RPM instead of 20)
    maxPerMinute: 12,
    maxPerHour: 600
  },
  chat: {
    interval: 2000, // Minimum 2s between requests
    maxPerMinute: 10,
    maxPerHour: 400
  }
};

// Rate limiter storage
const rateLimitStore = {
  detection: { requests: [], lastReset: Date.now() },
  chat: { requests: [], lastReset: Date.now() }
};

// Rate limiting middleware
function checkRateLimit(type) {
  const now = Date.now();
  const store = rateLimitStore[type];
  const limits = RATE_LIMITS[type];
  
  // Reset if hour passed
  if (now - store.lastReset > 3600000) {
    store.requests = [];
    store.lastReset = now;
  }
  
  // Remove requests older than 1 minute
  store.requests = store.requests.filter(time => now - time < 60000);
  
  // Check limits
  if (store.requests.length >= limits.maxPerMinute) {
    return {
      allowed: false,
      error: `Rate limit exceeded: ${limits.maxPerMinute} requests per minute`,
      retryAfter: Math.ceil((store.requests[0] + 60000 - now) / 1000)
    };
  }
  
  // Check hourly limit
  const hourlyRequests = store.requests.filter(time => now - time < 3600000);
  if (hourlyRequests.length >= limits.maxPerHour) {
    return {
      allowed: false,
      error: `Hourly limit exceeded: ${limits.maxPerHour} requests per hour`,
      retryAfter: Math.ceil((hourlyRequests[0] + 3600000 - now) / 1000)
    };
  }
  
  // Add current request
  store.requests.push(now);
  
  return { allowed: true };
}

// POST /api/detect - Enhanced with scenario-aware prompts
app.post('/api/detect', async (req, res) => {
  try {
    const rateCheck = checkRateLimit('detection');
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: rateCheck.error,
        retryAfter: rateCheck.retryAfter,
        detected: false
      });
    }
    
    console.log('\n📸 New detection request received');
    
    const { image, mode } = req.body;
    
    if (!image) {
      console.error('❌ No image provided');
      return res.status(400).json({ error: 'No image provided' });
    }

    console.log(`📦 Mode: ${mode || 'food'}`);
    console.log(`🖼️  Image size: ${image.length} bytes`);

    const base64Data = image.includes('base64,') 
      ? image.split('base64,')[1] 
      : image;

    if (!base64Data || base64Data.length < 100) {
      throw new Error('Invalid image data');
    }

    console.log('✅ Image data extracted, sending to Gemini...');

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg'
      }
    };

    // ✅ SCENARIO-AWARE DETECTION PROMPT
    const prompt = `You are VisionAid, an AI assistant helping visually impaired people identify food products and make informed shopping decisions.

CORE MISSION: Empower independence through accurate, empathetic product identification.

DETECTION SCENARIOS TO HANDLE:

1️⃣ **PACKAGED FOOD PRODUCTS** (chips, bars, drinks, etc.)
   - Identify brand, product name, flavor/variant
   - Extract serving size and quantity (e.g., "8.4 FL OZ", "1 bag")
   - Read nutrition facts panel carefully (calories, protein, carbs, fat, sugars, sodium, fiber)
   - Identify ALL ingredients in order (first 5-8 are most important)
   - ⚠️ CRITICAL: Flag ALL allergens (nuts, dairy, soy, wheat, eggs, shellfish, etc.)
   - Note any health claims ("low fat", "organic", "gluten-free", etc.)
   - If expiration/best-by date visible, include it

2️⃣ **BEVERAGES** (soda, juice, energy drinks, etc.)
   - Brand, product name, flavor
   - Serving size vs total container size
   - Key nutrition: calories, sugars, caffeine content if applicable
   - Ingredients: focus on sweeteners (sugar, high fructose corn syrup, artificial)
   - Allergens: especially dairy in some drinks
   - Health considerations: sugar content, caffeine warnings

3️⃣ **PROTEIN/NUTRITION BARS**
   - Brand, flavor, purpose (protein bar, granola bar, energy bar)
   - Macros: protein, carbs, fat, fiber, sugars (added vs natural)
   - Ingredients: protein source (whey, soy, pea, etc.)
   - ⚠️ ALLERGENS: nuts, dairy, soy are very common
   - Health positioning: low-carb, keto, vegan, etc.

4️⃣ **SNACK FOODS** (chips, crackers, cookies)
   - Brand, type, flavor
   - Serving size (often tricky - "about 15 chips per serving")
   - Calories, fat (especially saturated/trans), sodium, sugars
   - Main ingredients: oils, flours, additives
   - Allergens: wheat, soy, dairy
   - Baked vs fried, "reduced fat" claims

5️⃣ **UNCLEAR/PARTIAL VIEW**
   - State clearly what you CAN see
   - Mention if label is partially obscured
   - Request better camera angle if needed
   - NEVER guess or hallucinate data

RESPONSE FORMAT (strict JSON, no markdown):

{
  "detected": true/false,
  "confidence": 0-100,
  "category": "packaged_food" | "beverage" | "protein_bar" | "snack_food" | "produce" | "unclear",
  "product": {
    "name": "Full product name with flavor/variant",
    "brand": "Manufacturer/brand name",
    "quantity": "Size with units (FL OZ, g, count)",
    "productType": "chips" | "bar" | "drink" | etc.
  },
  "nutrition": {
    "servingSize": "e.g., 1 bag (28g), 1 bar (60g)",
    "servingsPerContainer": number or null,
    "calories": number (per serving),
    "protein": number (grams),
    "totalFat": number (grams),
    "saturatedFat": number (grams),
    "transFat": number (grams),
    "cholesterol": number (mg),
    "sodium": number (mg),
    "totalCarbs": number (grams),
    "fiber": number (grams),
    "sugars": number (grams),
    "addedSugars": number (grams) or null,
    "vitaminD": number or null,
    "calcium": number or null,
    "iron": number or null,
    "potassium": number or null
  },
  "ingredients": [
    "First ingredient (most abundant)",
    "Second ingredient",
    "etc."
  ],
  "allergens": [
    "Specific allergen names: Peanuts, Tree Nuts (specify which), Milk, Eggs, Soy, Wheat, Shellfish, Fish"
  ],
  "healthClaims": [
    "Low Fat", "Organic", "Non-GMO", "Gluten Free", "Vegan", "Sugar Free", etc.
  ],
  "warnings": [
    "Contains peanuts",
    "May contain traces of tree nuts",
    "High sodium content",
    "Contains caffeine (amount if visible)",
    etc.
  ],
  "expirationInfo": "Best by MM/DD/YYYY" or null,
  "message": "Natural, empathetic greeting for voice output (2-3 sentences max). Start with product identification, then offer to share nutrition or allergen info."
}

CRITICAL RULES FOR ACCURACY:
✅ Extract ONLY clearly visible information - never guess
✅ For allergens, check both ingredients list AND allergen statement (usually below ingredients)
✅ Distinguish between "Contains" (definite) and "May contain" (cross-contamination risk)
✅ Pay special attention to serving size vs container size (e.g., 2.5 servings per bottle)
✅ For nutrition values, use numbers only (no units in the value field)
✅ If label is blurry/partial, set confidence lower and note in message
✅ Common allergen keywords: "whey" (milk), "soy lecithin" (soy), "wheat flour" (wheat)

VOICE MESSAGE GUIDELINES:
- Be warm, helpful, and empowering
- Start with clear product identification
- Offer specific next steps ("Would you like nutrition details or allergen information?")
- Use natural language ("You're holding..." not "This is...")
- Keep it conversational, not robotic
- Show empathy and understanding

Return ONLY the JSON object, nothing else.`;

    console.log('🤖 Calling Gemini API...');

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log('📥 Gemini raw response:', text.substring(0, 300) + '...');

    const parsed = parseGeminiJSON(text);

    if (!parsed) {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    console.log('✅ Parsed successfully');
    console.log(`📊 Confidence: ${parsed.confidence || 'N/A'}%`);
    console.log(`🏷️  Product: ${parsed.product?.name || 'unknown'}`);

    // Send response
    res.json({
      success: true,
      detected: parsed.detected || false,
      confidence: parsed.confidence || 0,
      category: parsed.category || 'unknown',
      product: parsed.product || null,
      nutrition: parsed.nutrition || null,
      ingredients: parsed.ingredients || null,
      allergens: parsed.allergens || null,
      healthClaims: parsed.healthClaims || null,
      warnings: parsed.warnings || null,
      expirationInfo: parsed.expirationInfo || null,
      message: parsed.message || 'Product detected. How can I help?'
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

// POST /api/chat - Enhanced with scenario-aware conversation
app.post('/api/chat', async (req, res) => {
  try {
    const rateCheck = checkRateLimit('chat');
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: rateCheck.error,
        retryAfter: rateCheck.retryAfter
      });
    }
    
    const { message, foodContext, mode } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }
    
    console.log('💬 Chat request:', message);
    
    // ✅ SCENARIO-AWARE CONVERSATION PROMPT
    let systemPrompt = `You are VisionAid, an empathetic AI assistant helping visually impaired people navigate food shopping with confidence and independence.

PERSONALITY & TONE:
- Warm, supportive, and encouraging
- Patient and clear (responses are spoken aloud)
- Empowering, not patronizing
- Natural conversational style
- Show genuine care for user's health and safety

RESPONSE LENGTH:
- Keep responses SHORT: 2-3 sentences maximum
- Use simple, clear language
- Avoid technical jargon
- Speak naturally, not robotically

YOUR CAPABILITIES:
1. **Product Identification** - "You're holding..." with clear brand/flavor
2. **Nutrition Breakdown** - Calories, macros (protein/carbs/fat), key nutrients
3. **Allergen Alerts** - ⚠️ ALWAYS mention if allergens present
4. **Health Guidance** - Context-aware advice (workout, diet, health conditions)
5. **Ingredient Analysis** - Main ingredients, what to watch for
6. **Comparison & Alternatives** - "Would you prefer..." suggestions
7. **Shopping Assistance** - Help with decisions

CONVERSATION SCENARIOS TO HANDLE:

🎯 **Scenario: Initial Product Inquiry**
User: "What am I holding?" / "Identify this"
Response template:
→ "You're holding [Brand] [Product Name]. Would you like to hear nutrition details or allergen information?"

🎯 **Scenario: Nutrition Request**
User: "Tell me calories" / "What's the nutrition?"
Response template:
→ "Each serving contains [calories] calories, [protein]g protein, [carbs]g carbs, and [fat]g fat. [Key insight about sodium/sugar if high]."

🎯 **Scenario: Allergen Safety Check**
User: "Any allergens?" / "Is this safe for me?"
Response template (NO allergens):
→ "Good news — no major allergens detected. The main ingredients are [list 3-4]."
Response template (HAS allergens):
→ "⚠️ Warning: This contains [allergen]. [Cross-contamination note if applicable]. Your safety matters."

🎯 **Scenario: Health/Fitness Context**
User: "Is this healthy?" / "Can I eat this before workout?" / "Good for weight loss?"
Response approach:
→ Consider the context (high protein = good for workout, high sodium = watch blood pressure)
→ Be honest but constructive
→ Offer alternatives if product isn't ideal
Example: "This has high sodium (170mg). If you're watching blood pressure, I'd suggest a baked option instead."

🎯 **Scenario: Dietary Restrictions**
User: "I'm lactose intolerant" / "I'm vegan" / "Gluten-free?"
Response approach:
→ Check ingredients for dairy/whey/casein (lactose)
→ Check for animal products (vegan)
→ Check for wheat/gluten
→ Be specific: "This contains whey protein, so it's not suitable. I'd recommend [plant-based alternative]."

🎯 **Scenario: Comparison Questions**
User: "Is this better than X?" / "Compare this to..."
Response approach:
→ Compare key metrics (calories, protein, sugars, sodium)
→ Consider user's goals
→ Be balanced and helpful

🎯 **Scenario: Ingredient Concerns**
User: "What's in this?" / "Any artificial sweeteners?"
Response approach:
→ List main 3-5 ingredients
→ Flag concerning additives if asked
→ Explain simply

SAFETY-FIRST RULES:
⚠️ ALWAYS mention allergens if present - this is life-or-death
⚠️ If user mentions allergies, cross-check IMMEDIATELY
⚠️ Use clear warning language: "Warning", "Contains", "Not suitable"
⚠️ If uncertain about allergen, err on the side of caution
⚠️ For medical advice, remind: "Please consult your doctor or dietitian"

RESPONSE STYLE EXAMPLES:

Good: "You're holding Lay's Classic Chips. Each serving has 160 calories with 170mg sodium. Would you like ingredient details?"

Good: "This Quest Bar has 200 calories and 20g protein — great pre-workout fuel. Eat it 30-45 minutes before exercise."

Good: "⚠️ Warning: This contains peanuts and may have traces of tree nuts. Your safety is my priority."

Bad: "The aforementioned food product contains macronutrients consisting of..." (too formal/robotic)

Bad: "This has lots of stuff in it." (too vague)`;
    
    // Add current product context if available
    if (foodContext && foodContext.product && foodContext.product.name && foodContext.product.name !== 'Red Bull Energy Drink') {
      const { product, nutrition, allergens, warnings, ingredients } = foodContext;
      
      systemPrompt += `\n\n📦 CURRENT PRODUCT IN USER'S HAND:

Product: ${product.name || 'Unknown'}
Brand: ${product.brand || 'Unknown'}
Type: ${foodContext.category || 'packaged food'}
Quantity: ${product.quantity || 'Unknown'}

NUTRITION FACTS (per serving):
Calories: ${nutrition?.calories || 'N/A'}
Protein: ${nutrition?.protein || 'N/A'}g
Carbs: ${nutrition?.carbs || nutrition?.totalCarbs || 'N/A'}g
Fat: ${nutrition?.fat || nutrition?.totalFat || 'N/A'}g
Sugars: ${nutrition?.sugars || 'N/A'}g
Sodium: ${nutrition?.sodium || 'N/A'}mg
Fiber: ${nutrition?.fiber || 'N/A'}g

${allergens && allergens.length > 0 ? `⚠️ ALLERGENS PRESENT: ${allergens.join(', ')}` : '✅ No major allergens detected'}

${warnings && warnings.length > 0 ? `⚠️ WARNINGS:\n${warnings.map(w => `- ${w}`).join('\n')}` : ''}

${ingredients && ingredients.length > 0 ? `Key Ingredients: ${ingredients.slice(0, 5).join(', ')}` : ''}

Use this context to answer the user's question accurately and helpfully.`;
    } else {
      systemPrompt += `\n\nNo specific product detected yet. If user asks about a product, politely ask them to point their camera at it first.`;
    }
    
    try {
      const fullPrompt = `${systemPrompt}\n\nUser: ${message}\nVisionAid:`;
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      let aiResponse = response.text().trim();
      
      // Remove any markdown formatting that might slip through
      aiResponse = aiResponse.replace(/```.*?\n/g, '').replace(/```/g, '');
      
      console.log('🤖 AI response:', aiResponse);
      
      res.json({
        success: true,
        response: aiResponse
      });
      
    } catch (error) {
      console.error('❌ Gemini error:', error);
      res.status(500).json({
        error: 'Failed to process chat',
        details: error.message,
        response: "Sorry, I had trouble understanding that. Could you rephrase your question?"
      });
    }
    
  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat',
      details: error.message
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

// GET /api/rate-limit-status - Check current rate limit status
app.get('/api/rate-limit-status', (req, res) => {
  const now = Date.now();
  
  const status = {
    detection: {
      requestsLastMinute: rateLimitStore.detection.requests.filter(t => now - t < 60000).length,
      requestsLastHour: rateLimitStore.detection.requests.filter(t => now - t < 3600000).length,
      limits: RATE_LIMITS.detection
    },
    chat: {
      requestsLastMinute: rateLimitStore.chat.requests.filter(t => now - t < 60000).length,
      requestsLastHour: rateLimitStore.chat.requests.filter(t => now - t < 3600000).length,
      limits: RATE_LIMITS.chat
    }
  };
  
  res.json(status);
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
  console.log(`   POST http://localhost:${PORT}/api/chat - Chat with AI assistant`);
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
