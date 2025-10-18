"""
VisionAid Prototype - Voice Assistant for Visually Impaired
Python 3.9.13 compatible
Uses ElevenLabs for TTS and Google Gemini for conversation parsing
"""

import os
import time
import json
from typing import Dict, Optional
import requests
import google.generativeai as genai

# ============================================================================
# CONFIGURATION
# ============================================================================



# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# ElevenLabs voice IDs (use default voices or replace with your own)
VOICE_NORMAL = "21m00Tcm4TlvDq8ikWAM"  # Rachel (calm)
VOICE_URGENT = "EXAVITQu4vr4xnSDxMaL"  # Bella (more urgent)

# User profile
USER_PROFILE = {
    "allergies": ["peanuts", "tree nuts"],
    "emergency_contact": "+1-555-0123",
    "location": "123 Main St, City, State"
}

# ============================================================================
# PLACEHOLDER: CAMERA / VISION DETECTION
# ============================================================================

class CameraDetector:
    """Placeholder for camera-based object detection"""
    
    def __init__(self):
        self.current_item = None
        self.rotation_guidance = ["A little more to the left...", "Perfect, hold it right there."]
        
    def detect_item(self) -> Dict:
        """Simulate detecting a food item"""
        print("[CAMERA] Simulating item detection...")
        time.sleep(1)
        return {
            "name": "Clif Bar",
            "flavor": "Chocolate Peanut Butter",
            "weight": "68 grams",
            "brand": "Clif Bar",
            "detected": True
        }
    
    def detect_nutrition_label(self) -> Dict:
        """Simulate detecting nutrition label after rotation"""
        print("[CAMERA] Simulating nutrition label detection...")
        time.sleep(1)
        return {
            "detected": True,
            "ingredients": ["peanuts", "soy lecithin", "milk ingredients"],
            "allergens": ["peanuts", "soy", "milk"],
            "calories": 260,
            "protein": "10g",
            "sugar": "21g"
        }
    
    def guide_rotation(self):
        """Simulate guiding user to rotate item"""
        for instruction in self.rotation_guidance:
            print(f"[CAMERA GUIDANCE] {instruction}")
            time.sleep(1.5)
        return True

# ============================================================================
# ELEVENLABS TEXT-TO-SPEECH
# ============================================================================

class VoiceSynthesizer:
    """ElevenLabs TTS integration"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.elevenlabs.io/v1"
        
    def speak(self, text: str, voice_id: str = VOICE_NORMAL, emotion: str = "normal"):
        """
        Convert text to speech and play it
        emotion: 'normal', 'urgent', 'calm'
        """
        if not self.api_key:
            print(f"\n🔊 VisionAid says: {text}\n")
            return
        
        try:
            # ElevenLabs TTS endpoint
            url = f"{self.base_url}/text-to-speech/{voice_id}"
            headers = {
                "xi-api-key": self.api_key,
                "Content-Type": "application/json"
            }
            
            # Adjust stability/clarity based on emotion
            settings = {
                "normal": {"stability": 0.5, "similarity_boost": 0.5},
                "urgent": {"stability": 0.7, "similarity_boost": 0.8},
                "calm": {"stability": 0.3, "similarity_boost": 0.3}
            }
            
            data = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": settings.get(emotion, settings["normal"])
            }
            
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code == 200:
                # In real implementation, you'd play the audio
                # For now, just print
                print(f"\n🔊 VisionAid ({emotion}): {text}\n")
                # Simulate speaking time
                time.sleep(len(text) * 0.05)
            else:
                print(f"[TTS ERROR] {response.status_code}: {response.text}")
                print(f"\n🔊 VisionAid: {text}\n")
                
        except Exception as e:
            print(f"[TTS ERROR] {e}")
            print(f"\n🔊 VisionAid: {text}\n")

# ============================================================================
# GEMINI CONVERSATION PARSER
# ============================================================================

class ConversationParser:
    """Use Gemini to parse and respond to user input"""
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.conversation_history = []
        
    def parse_intent(self, user_input: str, context: Dict) -> Dict:
        """
        Parse user intent and generate appropriate response
        Returns: {"intent": str, "response": str, "action": str}
        """
        # Build context summary
        context_summary = []
        if context.get("current_item"):
            item = context["current_item"]
            context_summary.append(f"Currently holding: {item.get('name', 'unknown item')}")
        if context.get("nutrition"):
            nutrition = context["nutrition"]
            context_summary.append(f"Nutrition label detected with allergens: {', '.join(nutrition.get('allergens', []))}")
        
        conversation_context = "\n".join([f"User: {h['user']}\nAI: {h['ai'].get('response', '')}" for h in self.conversation_history[-3:]])
        
        prompt = f"""You are VisionAid, a helpful AI assistant for visually impaired people who helps them identify food items and check for allergens.

SYSTEM CONTEXT:
User's known allergies: {', '.join(USER_PROFILE['allergies'])}
Current situation: {' | '.join(context_summary) if context_summary else 'No item scanned yet'}

RECENT CONVERSATION:
{conversation_context if conversation_context else 'No prior conversation'}

USER'S CURRENT INPUT: "{user_input}"

Your task: Understand what the user wants and respond naturally. Return ONLY valid JSON (no markdown):
{{
  "intent": "<intent_category>",
  "response": "<what_to_say>",
  "action": "<action_to_take>",
  "emotion": "<normal|urgent|calm>"
}}

INTENT CATEGORIES:
- "identify_item": User wants to know what they're holding
- "nutrition_request": User wants nutrition information
- "allergy_check": User asks if product is safe/has allergens
- "emergency": User reports eating allergen or having reaction
- "confirmation": User says yes/sure/okay to continue
- "gratitude": User says thank you
- "negative": User says no/nothing else
- "general": Casual conversation

ACTIONS:
- "scan_item": Trigger camera to identify the item
- "read_nutrition": Guide rotation and read nutrition label
- "check_allergies": Check if allergens match user's profile
- "call_emergency": Emergency alert system
- "log_incident": Record health incident
- "none": Just respond verbally

GUIDELINES:
- Be warm, helpful, and safety-focused
- For emergencies, stay calm but act quickly
- If user confirms/agrees after a question, proceed with context
- Keep responses under 30 words unless critical safety info
- Use emotion "urgent" only for emergencies, "calm" for reassurance"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                )
            )
            
            # Clean response text
            response_text = response.text.strip()
            # Remove markdown code fences if present
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text
            
            result = json.loads(response_text)
            self.conversation_history.append({"user": user_input, "ai": result})
            return result
            
        except json.JSONDecodeError as e:
            print(f"[GEMINI JSON ERROR] {e}")
            print(f"Raw response: {response.text if 'response' in locals() else 'No response'}")
            return {
                "intent": "unknown",
                "response": "I'm listening. How can I help you?",
                "action": "none",
                "emotion": "normal"
            }
        except Exception as e:
            print(f"[GEMINI ERROR] {e}")
            return {
                "intent": "unknown",
                "response": "I'm sorry, I didn't catch that. Could you repeat?",
                "action": "none",
                "emotion": "normal"
            }

# ============================================================================
# EMERGENCY SYSTEM
# ============================================================================

class EmergencySystem:
    """Handle emergency scenarios"""
    
    @staticmethod
    def send_alert(user_profile: Dict, reason: str):
        """Simulate sending emergency alert"""
        print("\n" + "="*60)
        print("🚨 EMERGENCY ALERT TRIGGERED 🚨")
        print("="*60)
        print(f"Reason: {reason}")
        print(f"Calling: {user_profile['emergency_contact']}")
        print(f"Location: {user_profile['location']}")
        time.sleep(2)
        print("\n📞 Dialing emergency contact...")
        time.sleep(2)
        print("📱 Message sent: 'User may be experiencing allergic reaction. Location shared.'")
        print("="*60 + "\n")
        return True

# ============================================================================
# MAIN VISIONAID SYSTEM
# ============================================================================

class VisionAidSystem:
    """Main system orchestrating all components"""
    
    def __init__(self):
        self.camera = CameraDetector()
        self.voice = VoiceSynthesizer(ELEVENLABS_API_KEY)
        self.parser = ConversationParser()
        self.emergency = EmergencySystem()
        self.current_item = None
        self.context = {}
        
    def process_user_input(self, user_input: str):
        """Process user speech input dynamically"""
        print(f"\n👤 User: {user_input}")
        
        # Parse intent with Gemini
        parsed = self.parser.parse_intent(user_input, self.context)
        intent = parsed.get("intent", "unknown")
        action = parsed.get("action", "none")
        emotion = parsed.get("emotion", "normal")
        response = parsed.get("response", "")
        
        # Execute appropriate action based on parsed intent
        if action == "scan_item":
            self.scan_item()
        elif action == "read_nutrition":
            self.read_nutrition()
        elif action == "check_allergies":
            self.check_allergies_from_context(response, emotion)
        elif action == "call_emergency":
            self.handle_emergency("User reports possible allergic reaction")
        elif action == "log_incident":
            self.log_incident()
        else:
            # Just respond with the generated text
            if response:
                self.voice.speak(response, emotion=emotion)
    
    def scan_item(self):
        """Scene 1: Identify item"""
        self.voice.speak("Scanning...")
        item = self.camera.detect_item()
        self.current_item = item
        self.context["current_item"] = item
        
        response = f"This looks like a {item['name']} – {item['flavor']} flavor. Net weight: {item['weight']}."
        self.voice.speak(response)
        self.voice.speak("Would you like me to read the nutrition information?")
    
    def read_nutrition(self):
        """Scene 2: Read nutrition label"""
        self.voice.speak("Please rotate the item slowly until I detect the nutrition label.")
        self.camera.guide_rotation()
        
        time.sleep(1)
        self.voice.speak("I've got it!")
        
        nutrition = self.camera.detect_nutrition_label()
        self.context["nutrition"] = nutrition
        
        # Read ingredients
        ingredients_text = ", ".join(nutrition["ingredients"])
        self.voice.speak(f"This bar contains {ingredients_text}.")
    
    def check_allergies(self):
        """Check for allergen matches - original method"""
        if "nutrition" not in self.context:
            self.voice.speak("I need to scan the nutrition label first.")
            return
        
        allergens = self.context["nutrition"]["allergens"]
        user_allergies = USER_PROFILE["allergies"]
        
        # Check for matches
        matches = [a for a in allergens if any(ua in a for ua in user_allergies)]
        
        if matches:
            self.voice.speak(
                f"Yes. This product contains {', '.join(matches)}, which could trigger a severe allergic reaction for you.",
                emotion="urgent"
            )
            self.voice.speak("Pick up something else and let me see for you", emotion="calm")
        else:
            self.voice.speak("Good news! I don't detect any of your known allergens in this product.")
    
    def check_allergies_from_context(self, ai_response: str, emotion: str):
        """Check allergies using AI-generated response"""
        if "nutrition" not in self.context:
            self.voice.speak("Let me scan the nutrition label first.", emotion="calm")
            self.read_nutrition()
            return
        
        # Use AI response if provided, otherwise default logic
        if ai_response:
            self.voice.speak(ai_response, emotion=emotion)
        else:
            self.check_allergies()
    
    def handle_emergency(self, reason: str):
        """Scene 3: Emergency scenario"""
        self.voice.speak("Don't worry. I've detected a possible allergic emergency.", emotion="urgent")
        self.voice.speak("I'm contacting your emergency contact now.", emotion="calm")
        
        # Send alert
        self.emergency.send_alert(USER_PROFILE, reason)
        
        self.voice.speak("Help is on the way. Stay calm. Take slow, deep breaths. You're going to be okay.", emotion="calm")
    
    def log_incident(self):
        """Scene 4: Log incident"""
        self.voice.speak("Done. I've also updated your allergy alert to 'high sensitivity'.")
        self.voice.speak("Is there anything else I can do for you?")

# ============================================================================
# INTERACTIVE MODE
# ============================================================================

def run_interactive_mode():
    """Run VisionAid in interactive conversational mode"""
    print("\n" + "="*60)
    print("🎙️  VisionAid Interactive Mode")
    print("="*60)
    print("\nVisionAid is ready! Say what you need help with.")
    print("Tips:")
    print("  - 'What am I holding?' to identify an item")
    print("  - 'Read the nutrition label' for details")
    print("  - 'Am I allergic to this?' to check allergens")
    print("  - Type 'quit' or 'exit' to stop")
    print("\n" + "─"*60 + "\n")
    
    system = VisionAidSystem()
    system.voice.speak("Hello! I'm VisionAid. How can I help you today?")
    
    while True:
        try:
            user_input = input("\n👤 You: ").strip()
            
            if not user_input:
                continue
            
            if user_input.lower() in ['quit', 'exit', 'goodbye', 'bye']:
                system.voice.speak("Goodbye! Remember, you're never alone when you can see with sound.")
                break
            
            system.process_user_input(user_input)
            time.sleep(0.5)  # Small pause for natural flow
            
        except KeyboardInterrupt:
            print("\n\n⚠️  Interrupted by user.")
            system.voice.speak("Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            continue

# ============================================================================
# DEMO SCRIPT EXECUTION (for reference/testing)
# ============================================================================

def run_demo_script():
    """Execute a sample demo following the original script flow"""
    print("\n" + "="*60)
    print("🎬 VisionAid Demo Script")
    print("="*60)
    print("This simulates the interaction from the original script.")
    print("For interactive mode, restart with interactive=True")
    print("\n" + "─"*60 + "\n")
    
    system = VisionAidSystem()
    
    # Scene 1 – User picks up food item
    print("\n" + "─"*60)
    print("SCENE 1: Identifying Food Item")
    print("─"*60)
    
    system.process_user_input("Hey VisionAid, what am I holding?")
    time.sleep(1)
    system.process_user_input("Yeah, sure.")
    
    # Scene 2 – Nutrition info & allergy check
    print("\n" + "─"*60)
    print("SCENE 2: Nutrition Info & Allergy Check")
    print("─"*60)
    
    time.sleep(1)
    system.process_user_input("I'm allergic to nuts. Should I be worried?")
    system.check_allergies()
    
    # Scene 3 – Emergency scenario
    print("\n" + "─"*60)
    print("SCENE 3: Emergency Scenario")
    print("─"*60)
    
    time.sleep(2)
    system.process_user_input("VisionAid! I think I accidentally ate the peanut one!")
    system.handle_emergency("User reports accidental consumption of allergen")
    
    # Scene 4 – Aftermath
    print("\n" + "─"*60)
    print("SCENE 4: Calm Aftermath")
    print("─"*60)
    
    time.sleep(1)
    system.process_user_input("Thank you, VisionAid.")
    system.voice.speak("You're welcome. Your safety is my first priority.")
    system.voice.speak("Would you like me to record this incident in your health log?")
    time.sleep(1)
    system.process_user_input("Yeah… do that.")
    system.log_incident()
    time.sleep(1)
    system.process_user_input("No, that's all. Thanks.")
    system.voice.speak("Anytime. Remember — you're never alone when you can see with sound.")
    
    print("\n" + "="*60)
    print("✅ Demo Complete!")
    print("="*60 + "\n")

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    print("VisionAid Prototype")
    print("Python 3.10+ | ElevenLabs + Google Gemini")
    print("\nNote: Set ELEVENLABS_API_KEY environment variable for actual TTS.")
    print("Currently using text-based simulation.\n")
    
    # Choose mode
    print("Choose mode:")
    print("  1. Interactive Mode (type your own messages)")
    print("  2. Demo Script Mode (runs predefined script)")
    
    try:
        choice = input("\nEnter 1 or 2 (default: 1): ").strip()
        
        if choice == "2":
            run_demo_script()
        else:
            run_interactive_mode()
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Demo interrupted by user.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
