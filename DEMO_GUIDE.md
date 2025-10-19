# 🎤 Voice-to-Voice Demo Guide for Hack Knight 2025

## Quick Start (5 minutes)

### 1. Start Backend Server
```bash
cd backend
npm start
```

**Expected output:**
```
🚀 Backend server running on http://localhost:3001
🔑 Gemini API Key: Configured ✓
🎤 ElevenLabs API Key: Loaded (sk_...)
```

### 2. Open Frontend
```bash
cd frontend
open public/main.html
# Or just double-click main.html
```

### 3. Demo Flow

#### Step 1: Camera Setup
1. Click **"Connect Stream"** button
2. Allow camera permissions
3. Camera feed appears with "LIVE" badge

#### Step 2: Food Detection
1. Hold a packaged food product in front of camera
2. Wait 3-5 seconds for detection
3. System announces: **"Scan complete. You're holding [product]. What would you like to know?"**
4. **Note:** If you keep holding the same product, UI updates but chat won't spam - only announces when you switch products!

#### Step 3: Voice Conversation
**The system is now listening automatically!**

**Example conversation:**
- **You:** "Tell me about the calories"
- **AI:** "Each serving contains 180 calories, 12g protein, 20g carbs, and 5g fat."
- *(System auto-starts listening)*
- **You:** "Any allergens?"
- **AI:** "Warning: This contains peanuts and soy."
- *(System auto-starts listening)*
- **You:** "What are the main ingredients?"
- **AI:** "The main ingredients are peanuts, sugar, palm oil, salt, and molasses."

**Continue asking questions naturally - the system keeps listening!**

## Demo Script for Judges

### Introduction (30 seconds)
"Hi! I'm demonstrating A-eye, a voice-to-voice AI assistant for visually impaired people to identify food products and make informed shopping decisions."

### Live Demo (2 minutes)

1. **Show the interface:**
   - "Here's our real-time camera feed connected to an iPhone"
   - "And this is our voice conversation log"

2. **Scan a product:**
   - Hold up a snack/drink/protein bar
   - "Watch as the system automatically detects the product..."
   - Wait for: "Scan complete. You're holding..."

3. **Natural conversation:**
   - Ask about calories
   - Ask about allergens
   - Ask about ingredients
   - Show it responds and keeps listening

4. **Switch products (optional but impressive):**
   - Hold up a different product
   - System detects the change and announces new product
   - Shows smart duplicate prevention (won't spam same product)

5. **Highlight key features:**
   - "Notice how it automatically keeps listening after each response"
   - "The system provides a conversational experience - no button clicking needed"
   - "It prioritizes safety by highlighting allergens"
   - "Watch how it doesn't spam the chat - only announces when I change products"

### Key Talking Points

✅ **Fully Voice-Controlled**
- No buttons or screens to navigate
- Natural conversation flow
- Automatic listening after responses

✅ **Real-Time Product Detection**
- Uses Gemini 2.0 Vision API
- Detects products every 5 seconds
- 50%+ confidence threshold for announcements

✅ **Context-Aware Conversations**
- Remembers the scanned product
- Provides relevant information
- Answers follow-up questions

✅ **Safety First**
- Prominent allergen warnings
- Clear voice alerts for safety concerns
- Nutrition facts for health decisions

✅ **Natural Voice Output**
- ElevenLabs AI voice (Scarlet)
- Context-aware voice profiles
- Falls back to browser TTS if needed

## Sample Questions to Demo

### About Nutrition:
- "What's the calorie count?"
- "How much protein does it have?"
- "Tell me about the sugars"
- "Is this high in sodium?"

### About Safety:
- "Does this have any allergens?"
- "Is this safe for someone with peanut allergies?"
- "What about dairy?"

### About Ingredients:
- "What are the main ingredients?"
- "Does this have artificial sweeteners?"
- "What kind of oil is used?"

### Health Context:
- "Is this good for a workout?"
- "Can I eat this on a low-carb diet?"
- "Is this healthy?"

## Products That Work Well for Demo

✅ **Recommended:**
- Protein bars (Quest, KIND, RxBar) - clear labels
- Chips (Lay's, Doritos) - nutrition facts visible
- Energy drinks (Red Bull, Monster) - colorful packaging
- Granola bars (Nature Valley) - good lighting
- Packaged snacks (Oreos, Goldfish) - high contrast

⚠️ **Avoid:**
- Products with very small text
- Reflective packaging (foil)
- Crumpled or damaged labels
- Products held at bad angles

## Troubleshooting During Demo

### "Scan complete" doesn't announce:
- Adjust lighting (point toward light)
- Hold product steadier
- Move camera closer to label
- Ensure nutrition facts panel is visible

### Voice doesn't listen:
- Click anywhere on page first (browser audio policy)
- Check microphone permissions
- Look for "🎤 Listening..." in voice status

### Detection is slow:
- Normal - detects every 5 seconds
- Backend has rate limiting to prevent API abuse
- This is by design for demo stability

### Audio doesn't play:
- Browser may block autoplay
- Click "Enable audio" prompt if appears
- Falls back to browser TTS automatically

## Technical Architecture (for judge questions)

**Frontend:**
- Vanilla JavaScript (no heavy frameworks)
- Web Speech API for voice recognition
- Canvas API for video processing
- Continuous speech recognition for wake words

**Backend:**
- Node.js + Express
- Gemini 2.0 Flash for vision + chat
- ElevenLabs for natural TTS
- Rate limiting for API stability

**APIs:**
- Google Gemini API (vision + conversation)
- ElevenLabs API (text-to-speech)
- Web Speech API (speech-to-text)

**Key Innovation:**
- Continuous voice loop after detection
- Context-aware conversation state
- Automatic listening without manual triggers

## Backup Plan

If technical issues occur:

1. **Pre-recorded video demo** (always have this ready)
2. **Static screenshots** showing UI and conversation
3. **Code walkthrough** of key features
4. **Explain architecture** with diagrams

## Time Breakdown

- **Setup:** 30 seconds
- **Product scan:** 5 seconds
- **Conversation:** 1-2 minutes
- **Q&A with judges:** 1-2 minutes

---

## Success Metrics

✅ Smooth detection within 5 seconds
✅ Clear "Scan complete" announcement
✅ Natural back-and-forth conversation
✅ At least 3-4 questions answered
✅ System keeps listening automatically
✅ No crashes or freezes

---

**You're ready! Good luck with your demo! 🚀**

Remember: The key selling point is the **continuous voice conversation** - no buttons, no interruptions, just natural interaction.
