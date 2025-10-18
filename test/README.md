# VisionAid Prototype

Python 3.9.13 prototype for voice-assisted food identification and allergy management for visually impaired users.

## Features

✅ **Voice Synthesis** - ElevenLabs TTS integration  
✅ **Conversation Parsing** - Google Gemini API for natural language understanding  
✅ **Camera Placeholders** - Simulated object/nutrition label detection  
✅ **Allergy Management** - Real-time allergen checking  
✅ **Emergency System** - Automated emergency contact alerts  
✅ **Full Script Demo** - Complete 4-scene demonstration

## Setup

### 1. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 2. Configure API Keys

**Required:**
- Gemini API key is hardcoded in the script (already set)

**Optional (for real TTS):**
```powershell
$env:ELEVENLABS_API_KEY="your_elevenlabs_api_key_here"
```

Without ElevenLabs key, the system will use text-based simulation (still fully functional).

### 3. Run the Demo

```powershell
python visionaid_prototype.py
```

## How It Works

### Scene 1: Item Identification
- User asks "What am I holding?"
- Camera detects item (simulated)
- Reads brand, flavor, weight

### Scene 2: Nutrition & Allergy Check
- Guides user to rotate item for nutrition label
- Detects ingredients and allergens
- Cross-checks with user's allergy profile
- Warns if dangerous allergens detected

### Scene 3: Emergency Response
- User reports accidental allergen consumption
- System triggers emergency protocol
- Contacts emergency contact with location
- Provides calming guidance

### Scene 4: Incident Logging
- Records incident in health log
- Updates allergy sensitivity settings
- Confirms user is safe

## Architecture

```
VisionAidSystem
├── CameraDetector (placeholder)
│   ├── detect_item()
│   ├── detect_nutrition_label()
│   └── guide_rotation()
├── VoiceSynthesizer (ElevenLabs)
│   └── speak(text, emotion)
├── ConversationParser (Gemini)
│   └── parse_intent(input, context)
└── EmergencySystem
    └── send_alert(profile, reason)
```

## User Profile

Located in `USER_PROFILE` dict:
```python
{
    "allergies": ["peanuts", "tree nuts"],
    "emergency_contact": "+1-555-0123",
    "location": "123 Main St, City, State"
}
```

Modify this to test different scenarios.

## API Usage

### Gemini (Google Studio API)
- Model: `gemini-pro`
- Used for: Intent parsing, response generation
- Handles context awareness and conversational flow

### ElevenLabs (Optional)
- Voices: Rachel (normal), Bella (urgent)
- Emotion modes: normal, urgent, calm
- Falls back to text if API key not set

## Testing Without Camera

Camera detection is fully simulated with:
- Mock item data (Clif Bar example)
- Simulated nutrition labels
- Rotation guidance timing

Ready for real camera integration by replacing `CameraDetector` class methods.

## Next Steps

To make this production-ready:

1. **Camera Integration**
   - Replace `CameraDetector` with OpenCV or similar
   - Add OCR for text extraction (Tesseract, Google Vision)
   - Implement actual object detection (YOLO, etc.)

2. **Audio Playback**
   - Use `pygame` or `playsound` to play ElevenLabs audio
   - Add audio streaming for faster response

3. **Speech Recognition**
   - Add STT (Speech-to-Text) for real voice input
   - Use Google Speech API or Whisper

4. **Database**
   - Store health logs, incidents, allergy profiles
   - Track item scan history

## Notes

- Currently uses text output for voice (simulation mode)
- All timing delays simulate real-world interaction
- Emergency system is simulated (no actual calls made)
- Gemini API key is embedded for demo purposes

## Troubleshooting

**ImportError for google.generativeai:**
```powershell
pip install --upgrade google-generativeai
```

**Gemini API errors:**
- Check API key is valid
- Ensure you have quota remaining
- Try `gemini-pro` model specifically

**Python version:**
```powershell
python --version  # Should be 3.9.13
```

---

**Built for Hack Knight 2025 🏆**  
*Making the world more accessible, one voice at a time.*
