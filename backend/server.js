const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500', 'http://127.0.0.1:3000'],
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

⚠️ CRITICAL CONTEXT: Your user is BLIND or VISUALLY IMPAIRED. They CANNOT see the product. You are their EYES. Be their vision by accurately reading and describing everything on the package.

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
  "message": "Brief, natural greeting - just say 'Scan complete' or acknowledge the detection. Don't repeat the product name/brand - user can see it on screen. Keep it under 10 words."
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

⚠️ CRITICAL CONTEXT: Your user is BLIND or VISUALLY IMPAIRED. They CANNOT see the product, read labels, or check packaging. That's why they're using this app - to have you read and explain what they're holding. NEVER ask them to look at something or read something themselves.

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
1. **Product Identification** - YOU tell THEM what they're holding (they can't see it!)
2. **Nutrition Breakdown** - Calories, macros (protein/carbs/fat), key nutrients
3. **Allergen Alerts** - ⚠️ ALWAYS mention if allergens present
4. **Health Guidance** - Context-aware advice (workout, diet, health conditions)
5. **Ingredient Analysis** - Main ingredients, what to watch for
6. **Comparison & Alternatives** - "Would you prefer..." suggestions
7. **Shopping Assistance** - Help with decisions

⚠️ NEVER DO THIS:
❌ "Could you please tell me the product name?" (They can't see it!)
❌ "Check the label for..." (They can't read it!)
❌ "Look at the nutrition facts..." (They're blind!)
❌ "Can you show me the back of the package?" (They can't see what to show!)
❌ "Is there a barcode visible?" (Irrelevant - they can't see!)

✅ ALWAYS DO THIS:
✅ "You're holding..." (Tell them what they have)
✅ "This contains..." (Read the info for them)
✅ "The label says..." (You read it, not them)
✅ "Based on what I can see..." (You're their eyes)

CONVERSATION SCENARIOS TO HANDLE:

🎯 **Scenario: Product Inquiry When No Product Scanned Yet**
User: "What is this?" / "Tell me about this product"
Response template (NO product context):
→ "I don't have a product scanned yet. Please hold a food item in front of the camera, and I'll identify it for you."

⚠️ NEVER ask them to read or look at anything themselves!

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

🎯 **Scenario: User Asks About Specific Product When Nothing Scanned**
User: "Tell me about Red Bull" / "What's in Monster energy drink?"
Response approach:
→ "I'd be happy to help! To give you accurate information, please hold the specific product in front of the camera so I can scan it and read the exact details from the label."

⚠️ DON'T ask them questions about what they're holding - they can't see it!
⚠️ DON'T say "Could you tell me which one?" - they can't read the label!
✅ DO invite them to scan the product so YOU can identify it FOR them

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

ACCESSIBILITY-FIRST RULES (CRITICAL):
🔴 NEVER ask the user to read, look at, or check anything themselves
🔴 NEVER say "Could you tell me..." or "Can you check..." about product details
🔴 NEVER assume they can see colors, sizes, or any visual information
🔴 YOU are their eyes - describe everything clearly and completely
🔴 If no product is detected, invite them to hold it to the camera for scanning
🔴 Be descriptive but concise - they're listening, not reading

RESPONSE STYLE EXAMPLES:

Good: "Each serving has 160 calories with 170mg sodium. Want to know about ingredients?"

Good: "This has 200 calories and 20g protein — great pre-workout fuel."

Good: "⚠️ Warning: Contains peanuts and may have traces of tree nuts. Your safety is my priority."

Good (no product scanned): "I don't have a product scanned yet. Hold it in front of the camera and I'll identify it for you."

Bad: "Each serving has 160 calories with 170mg sodium. Want to know about ingredients?" (too repetitive - don't repeat product name)

Bad: "The aforementioned food product contains macronutrients consisting of..." (too formal/robotic)

Bad: "This has lots of stuff in it." (too vague)

❌ TERRIBLE (Accessibility Violation): "Could you please tell me the product name?" (They can't see it!)

❌ TERRIBLE (Accessibility Violation): "Check the back of the package for ingredients" (They can't read it!)

❌ TERRIBLE (Accessibility Violation): "Look at the nutrition label and tell me..." (They're blind!)

❌ TERRIBLE (Accessibility Violation): "Is there a barcode visible?" (Irrelevant and inaccessible!)

CRITICAL: Never repeat the product name/brand in responses - the user can already see it on screen. Just refer to it as "this", "it", or "this product" in follow-up answers.

⚠️ REMEMBER: Your user is BLIND. You are their EYES. Never ask them to see, read, or look at anything.`;
    
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

// ✅ ELEVENLABS TTS CONFIGURATION - Fixed API Key Reading
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY || '';

// Log API key status (without revealing the key)
console.log('🔑 ElevenLabs API Key Status:', ELEVENLABS_API_KEY ? 
  `Loaded (${ELEVENLABS_API_KEY.substring(0, 6)}...${ELEVENLABS_API_KEY.substring(ELEVENLABS_API_KEY.length - 4)})` : 
  '❌ NOT FOUND');

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Available voices (sponsor showcase!)
const ELEVENLABS_VOICES = {
  scarlet: 'j7KV53NgP8U4LRS2k2Gs',    // Scarlet - bold, dynamic (DEFAULT for hackathon)
  rachel: '21m00Tcm4TlvDq8ikWAM',    // Rachel - warm, friendly
  bella: 'EXAVITQu4vr4xnSDxMaL',     // Bella - confident, expressive
  antoni: 'ErXwobaYiN019PkySvjV',    // Antoni - well-rounded male
  elli: 'MF3mGyEYCl7XYWbV9V6O',      // Elli - emotional, young female
  josh: 'TxGEqnHWrfWFTfGW9XjX',      // Josh - deep, resonant male
  arnold: 'VR6AewLTigWG4xSOukaG',    // Arnold - crisp, articulate male
  adam: 'pNInz6obpgDQGcFmaJgB',      // Adam - deep, narrative male
  sam: 'yoZ06aMxZJJ28mfd3POQ'        // Sam - dynamic, raspy male
};

// ✅ ELEVENLABS VOICE PROFILES - Preset configurations for different use cases
const VOICE_PROFILES = {
  // Default: Balanced and natural
  default: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.5,
    use_speaker_boost: true
  },
  
  // Clear and stable - Best for important information (allergens, warnings)
  clear: {
    stability: 0.8,        // More consistent
    similarity_boost: 0.9, // Very accurate to voice
    style: 0.3,            // Less dramatic
    use_speaker_boost: true
  },
  
  // Expressive and dynamic - Best for conversational responses
  expressive: {
    stability: 0.3,        // More varied
    similarity_boost: 0.6, // Some variance allowed
    style: 0.8,            // More dramatic
    use_speaker_boost: true
  },
  
  // Fast and efficient - Best for quick facts
  fast: {
    stability: 0.7,        // Fairly stable
    similarity_boost: 0.8,
    style: 0.4,            // Neutral
    use_speaker_boost: true
  },
  
  // Calm and soothing - Best for long descriptions
  calm: {
    stability: 0.9,        // Very consistent
    similarity_boost: 0.85,
    style: 0.2,            // Minimal drama
    use_speaker_boost: true
  },
  
  // Energetic - Best for exciting announcements
  energetic: {
    stability: 0.2,        // Very varied
    similarity_boost: 0.5,
    style: 1.0,            // Maximum drama
    use_speaker_boost: true
  }
};

// POST /api/text-to-speech - Convert text to speech using ElevenLabs
app.post('/api/text-to-speech', async (req, res) => {
  try {
    const { text, voiceId = 'scarlet', speed = 1.15, profile = 'default' } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        error: 'No text provided'
      });
    }
    
    // ✅ Enhanced API key validation with detailed logging
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎤 TTS Request Received');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Text:', text.substring(0, 50) + '...');
    console.log('Voice:', voiceId);
    console.log('API Key Status:', ELEVENLABS_API_KEY ? '✅ Present' : '❌ Missing');
    console.log('API Key Length:', ELEVENLABS_API_KEY ? ELEVENLABS_API_KEY.length : 0);
    console.log('API Key Preview:', ELEVENLABS_API_KEY ? 
      `${ELEVENLABS_API_KEY.substring(0, 10)}...${ELEVENLABS_API_KEY.slice(-8)}` : 'N/A');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY.length < 20 || !ELEVENLABS_API_KEY.startsWith('sk_')) {
      console.error('⚠️ ElevenLabs API key is invalid or not configured');
      console.error('Expected format: sk_xxxxxxxxxxxxxxxxxxxxxxxx');
      console.error('Actual format:', ELEVENLABS_API_KEY ? `${ELEVENLABS_API_KEY.substring(0, 15)}...` : 'EMPTY');
      
      return res.status(500).json({
        error: 'Text-to-speech service not configured',
        fallback: true,
        debug: {
          hasKey: !!ELEVENLABS_API_KEY,
          keyLength: ELEVENLABS_API_KEY ? ELEVENLABS_API_KEY.length : 0,
          keyFormat: ELEVENLABS_API_KEY ? 'Invalid format' : 'Missing'
        }
      });
    }
    
    // Get voice ID from name or use directly if already an ID
    const selectedVoiceId = ELEVENLABS_VOICES[voiceId] || ELEVENLABS_VOICES.scarlet;
    
    // ✅ Get voice settings from profile (or use custom if provided in request)
    const voiceSettings = req.body.voice_settings || VOICE_PROFILES[profile] || VOICE_PROFILES.default;
    
    console.log(`📡 Calling ElevenLabs API...`);
    console.log(`   Voice ID: ${selectedVoiceId}`);
    console.log(`   Profile: ${profile}`);
    console.log(`   Settings:`, voiceSettings);
    
    // ✅ Call ElevenLabs API with customizable voice settings
    const response = await fetch(`${ELEVENLABS_API_URL}/${selectedVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: voiceSettings  // ✅ Use dynamic settings
      })
    });
    
    // ✅ Enhanced error response handling
    if (!response.ok) {
      let errorText = 'Unknown error';
      let errorDetails = {};
      
      try {
        const errorJson = await response.json();
        errorText = errorJson.detail?.message || errorJson.message || JSON.stringify(errorJson);
        errorDetails = errorJson;
      } catch {
        errorText = await response.text();
      }
      
      console.error('\n❌ ElevenLabs API Error');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Error:', errorText);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Check if it's specifically an auth error
      if (response.status === 401) {
        console.error('🔐 AUTHENTICATION FAILED!');
        console.error('👉 Your API key is invalid, expired, or revoked');
        console.error('👉 Go to: https://elevenlabs.io/app/settings/api-keys');
        console.error('👉 Create a new API key and update your .env file\n');
      }
      
      return res.status(response.status).json({
        error: 'Text-to-speech service error',
        details: errorText,
        fallback: true,
        debug: {
          status: response.status,
          statusText: response.statusText,
          voiceId: selectedVoiceId,
          textLength: text.length,
          errorDetails: errorDetails
        }
      });
    }
    
    // Get audio data
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    console.log(`✅ TTS Success: Generated ${audioBuffer.byteLength} bytes of audio\n`);
    
    // Send back as base64 (easier for frontend)
    res.json({
      success: true,
      audio: audioBase64,
      voiceId: voiceId,
      textLength: text.length
    });
    
  } catch (error) {
    console.error('\n❌ TTS Fatal Error');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    res.status(500).json({
      error: 'Failed to generate speech',
      details: error.message,
      fallback: true
    });
  }
});

// GET /api/voices - List available ElevenLabs voices
app.get('/api/voices', (req, res) => {
  res.json({
    voices: Object.keys(ELEVENLABS_VOICES).map(name => ({
      id: name,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      elevenLabsId: ELEVENLABS_VOICES[name],
      description: getVoiceDescription(name)
    })),
    default: 'scarlet' // ✅ Changed from 'rachel' to 'scarlet'
  });
});

function getVoiceDescription(voiceName) {
  const descriptions = {
    scarlet: 'Bold, dynamic female voice (RECOMMENDED for demos)', // ✅ NEW
    rachel: 'Warm, friendly female voice (great for accessibility)',
    bella: 'Confident, expressive female voice',
    antoni: 'Well-rounded, versatile male voice',
    elli: 'Emotional, young female voice',
    josh: 'Deep, resonant male voice',
    arnold: 'Crisp, articulate male voice',
    adam: 'Deep narrative male voice',
    sam: 'Dynamic, raspy male voice'
  };
  return descriptions[voiceName] || 'Professional AI voice';
}

// GET /api/voice-profiles - List available voice profiles
app.get('/api/voice-profiles', (req, res) => {
  res.json({
    profiles: Object.keys(VOICE_PROFILES).map(name => ({
      id: name,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      settings: VOICE_PROFILES[name],
      description: getProfileDescription(name)
    })),
    default: 'default'
  });
});

function getProfileDescription(profileName) {
  const descriptions = {
    default: 'Balanced and natural - good for general use',
    clear: 'Clear and stable - best for important information',
    expressive: 'Expressive and dynamic - best for conversation',
    fast: 'Fast and efficient - best for quick facts',
    calm: 'Calm and soothing - best for long descriptions',
    energetic: 'Energetic and exciting - best for announcements'
  };
  return descriptions[profileName] || 'Custom voice profile';
}

// =============================================================================
// EMERGENCY CALL ENDPOINT (Twilio Integration)
// =============================================================================

app.post('/api/emergency/call', async (req, res) => {
  console.log('\n🚨 ================================');
  console.log('📞 Emergency call request received');
  
  try {
    // Load Twilio credentials from environment
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    const toNumber = process.env.AEYE_EMERGENCY_CONTACT;
    const location = process.env.AEYE_LOCATION || 'Unknown location';
    
    // Validate credentials
    if (!twilioSid || !twilioToken || !fromNumber || !toNumber) {
      console.error('❌ Missing Twilio credentials in .env file');
      console.log('   Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, AEYE_EMERGENCY_CONTACT');
      return res.status(500).json({
        success: false,
        error: 'Emergency calling not configured. Please check server configuration.'
      });
    }
    
    // Validate phone number format (E.164)
    if (!fromNumber.startsWith('+') || !toNumber.startsWith('+')) {
      console.error('❌ Phone numbers must be in E.164 format (e.g., +1234567890)');
      return res.status(500).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }
    
    console.log(`📱 Calling from: ${fromNumber} → ${toNumber}`);
    console.log(`📍 Location: ${location}`);
    
    // Initialize Twilio client
    const client = twilio(twilioSid, twilioToken);
    
    // Get optional reason from request body
    const reason = req.body?.reason || 'User requested emergency assistance via AEye';
    
    // Create TwiML voice message
    const voiceMessage = `Emergency alert from AEye. ${reason}. Location: ${location}. Please respond immediately.`;
    
    // Place the call
    const call = await client.calls.create({
      to: toNumber,
      from: fromNumber,
      twiml: `<Response><Say voice='alice'>${voiceMessage}</Say></Response>`
    });
    
    console.log(`✅ Emergency call placed successfully`);
    console.log(`   Call SID: ${call.sid}`);
    console.log(`   Status: ${call.status}`);
    console.log('================================\n');
    
    return res.json({
      success: true,
      message: 'Emergency call placed successfully',
      callSid: call.sid,
      status: call.status
    });
    
  } catch (error) {
    console.error('❌ Emergency call failed:', error.message);
    console.error('   Error details:', error);
    console.log('================================\n');
    
    // Provide helpful error messages
    let userMessage = 'Failed to place emergency call';
    if (error.code === 20003) {
      userMessage = 'Authentication failed. Please check Twilio credentials.';
    } else if (error.code === 21210) {
      userMessage = 'Invalid phone number. The contact number may not be verified.';
    } else if (error.message.includes('trial')) {
      userMessage = 'Emergency contact must be verified on Twilio trial account.';
    }
    
    return res.status(500).json({
      success: false,
      error: userMessage,
      details: error.message
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
  console.log(`   POST http://localhost:${PORT}/api/chat - Chat with AI assistant`);
  console.log(`   POST http://localhost:${PORT}/api/emergency/call - Place emergency call (Twilio)`);
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
