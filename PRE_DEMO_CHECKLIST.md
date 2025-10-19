# 🎬 Pre-Demo Checklist - Hack Knight 2025

## 30 Minutes Before Demo

### ✅ Environment Setup
- [ ] Backend server running (`cd backend && npm start`)
- [ ] Frontend loaded (`open public/main.html` or Live Server)
- [ ] Browser: Chrome/Edge (best support for Speech Recognition)
- [ ] Microphone permissions granted
- [ ] Camera permissions granted
- [ ] Good internet connection (for APIs)

### ✅ API Keys Verified
```bash
cd backend
cat .env | grep KEY
```
- [ ] `GEMINI_API_KEY` present and valid
- [ ] `ELEVENLABS_API_KEY` present and valid
- [ ] Backend logs show: "Gemini API Key: Configured ✓"
- [ ] Backend logs show: "ElevenLabs API Key: Loaded"

### ✅ Test Products Ready
Prepare 2-3 products with:
- [ ] Clear, readable labels
- [ ] Good nutrition facts panel
- [ ] Different types (drink, snack, bar)
- [ ] Well-lit environment

**Recommended test products:**
1. Energy drink (Red Bull, Monster)
2. Protein bar (Quest, RxBar)
3. Chips/snacks (Lay's, Doritos)

---

## 15 Minutes Before Demo

### ✅ Quick System Test

**Test 1: Camera**
- [ ] Click "Connect Stream"
- [ ] Camera feed appears with "LIVE" badge
- [ ] Image is clear and well-lit

**Test 2: Detection**
- [ ] Hold test product
- [ ] Wait 5 seconds
- [ ] "Scan complete." appears in chat
- [ ] Product info updates on left panel

**Test 3: Voice Conversation**
- [ ] System says "Scan complete."
- [ ] Ask: "Tell me about calories"
- [ ] AI responds naturally
- [ ] System restarts listening automatically

**Test 4: Product Switch**
- [ ] Hold different product
- [ ] New "Scan complete." announcement
- [ ] Fresh conversation starts

**Test 5: Camera Control**
- [ ] Say "start camera" (if stopped)
- [ ] Camera activates
- [ ] Not sent to chat API ✓

---

## 5 Minutes Before Demo

### ✅ Final Checks

**Visual:**
- [ ] Chat window empty or cleared
- [ ] Product info showing placeholder
- [ ] Voice status: "Say 'Hey Vision' to activate"
- [ ] No error messages in console

**Audio:**
- [ ] Microphone working (check system settings)
- [ ] Speaker/headphones volume appropriate
- [ ] ElevenLabs TTS working (test with "start camera")
- [ ] No echo or feedback

**Performance:**
- [ ] Backend responding fast (<2 seconds)
- [ ] No rate limit warnings
- [ ] Browser not lagging
- [ ] Camera feed smooth

---

## Demo Script (2-3 Minutes)

### Introduction (30 seconds)
```
"Hi! I'm demonstrating A-eye, a voice-to-voice AI assistant that helps 
visually impaired people identify food products and make informed shopping 
decisions using just their voice - no buttons, no screens."
```

### Live Demo (90 seconds)

**Part 1: Product Detection (20 seconds)**
```
1. Show interface: "This is our real-time camera feed"
2. Hold up product: "Let me scan this product..."
3. Wait for: "Scan complete."
4. Point to UI: "Notice it detected [product name] and nutrition facts"
```

**Part 2: Natural Conversation (40 seconds)**
```
You: "Tell me about the calories"
AI: [Responds]
You: "Any allergens?"
AI: [Responds]
You: "What are the main ingredients?"
AI: [Responds]

"Notice how it keeps listening automatically - no buttons to press!"
```

**Part 3: Product Switching (30 seconds)**
```
1. Hold different product
2. Wait for new "Scan complete"
3. Ask 1-2 questions
4. "See how it smoothly handles multiple products"
```

### Key Features (30 seconds)
```
✅ Fully voice-controlled - no buttons
✅ Real-time product detection with Gemini Vision
✅ Natural conversation flow - keeps listening
✅ Safety-first - prominent allergen warnings
✅ Context-aware - remembers what you're holding
```

---

## If Things Go Wrong

### Issue: No "Scan complete"
**Fix:**
- Improve lighting
- Hold product steadier
- Move closer to camera
- Ensure nutrition facts visible

### Issue: AI not responding
**Fix:**
- Check browser console for errors
- Verify API keys in backend
- Check internet connection
- Restart backend server

### Issue: Self-listening loop
**Fix:**
- Should NOT happen (we fixed this!)
- If it does: refresh page
- Restart backend

### Issue: Camera won't start
**Fix:**
- Check camera permissions
- Try different browser (Chrome/Edge)
- Reload page
- Check if camera is in use elsewhere

### Issue: Voice not recognized
**Fix:**
- Check microphone permissions
- Speak clearly and louder
- Reduce background noise
- Click anywhere on page first (browser policy)

---

## Backup Plan

### Option 1: Pre-recorded Video
If live demo fails, have a video ready showing:
- Successful product scan
- Natural conversation
- Product switching
- Key features

### Option 2: Walkthrough with Screenshots
- Show code architecture
- Explain technical stack
- Demonstrate key features via images

### Option 3: Code Review
- Walk through voice recognition code
- Show Gemini API integration
- Explain anti-spam logic
- Highlight innovations

---

## Judge Q&A Preparation

### Expected Questions:

**Q: "How does the voice recognition work?"**
A: "We use the Web Speech API for speech-to-text, then send to Gemini for 
natural language understanding. ElevenLabs handles text-to-speech for 
natural voice responses."

**Q: "What happens if it picks up its own voice?"**
A: "We implemented multiple safety checks - the system stops listening while 
speaking, and ignores any input detected during speech output."

**Q: "How do you handle multiple products?"**
A: "We use smart duplicate detection - the system only announces when the 
product changes, preventing chat spam while continuously updating the UI."

**Q: "What about privacy?"**
A: "All processing is done through secure APIs. We don't store images or 
conversation history. Users can stop the camera anytime with voice commands."

**Q: "How accurate is the detection?"**
A: "Gemini Vision API typically achieves 80-95% confidence on clear product 
labels. We use a 50% threshold for announcements to balance accuracy and 
responsiveness."

**Q: "Can this work offline?"**
A: "Currently requires internet for APIs. Future versions could use on-device 
models, but that would sacrifice accuracy."

---

## Technical Details (If Asked)

**Stack:**
- Frontend: Vanilla JavaScript (lightweight)
- Backend: Node.js + Express
- Vision: Google Gemini 2.0 Flash
- TTS: ElevenLabs (fallback to browser TTS)
- STT: Web Speech API

**Key Innovations:**
- Continuous voice loop after detection
- Smart duplicate prevention
- Context-aware conversation state
- Self-listening prevention
- Special keyword handling

**APIs Used:**
- Google Gemini API (vision + chat)
- ElevenLabs API (TTS)
- Web Speech API (STT)

---

## Success Metrics

✅ **Demo considered successful if:**
1. Product detected within 5 seconds
2. "Scan complete" announces clearly
3. At least 2-3 questions answered naturally
4. System keeps listening automatically
5. Product switch works smoothly
6. No crashes or errors

---

## Post-Demo

### If Demo Goes Well:
- Highlight key innovations
- Mention potential real-world impact
- Discuss future enhancements

### If Demo Has Issues:
- Acknowledge and explain technical challenges
- Show code quality and architecture
- Emphasize problem-solving approach
- Discuss lessons learned

---

## Final Reminder

🎯 **The Key Selling Point:**
"This is a **continuous voice conversation system** - no buttons, no interruptions, 
just natural interaction. A visually impaired person can scan products and ask 
questions naturally, making grocery shopping more accessible and independent."

---

## Good Luck! 🚀

You're ready. The system works. The code is solid. Now go show the judges 
what you've built!

Remember:
- ✅ Stay calm
- ✅ Speak clearly
- ✅ Show confidence
- ✅ Highlight the impact
- ✅ Have fun!

**You've got this!** 🎉
