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
        self.model = genai.GenerativeModel('gemini-pro')
        self.conversation_history = []
        
    def parse_intent(self, user_input: str, context: Dict) -> Dict:
        """
        Parse user intent and generate appropriate response
        Returns: {"intent": str, "response": str, "action": str}
        """
        prompt = f"""You are VisionAid, an AI assistant for visually impaired users.
Current context: {json.dumps(context)}
User allergies: {', '.join(USER_PROFILE['allergies'])}

User says: "{user_input}"

Analyze the user's intent and respond appropriately. Return JSON with:
- "intent": main intent (e.g., "identify_item", "nutrition_info", "allergy_check", "emergency")
- "response": what VisionAid should say
- "action": what action to take (e.g., "scan_item", "check_allergies", "call_emergency", "none")

Be empathetic, clear, and safety-focused. Keep responses concise."""

        try:
            response = self.model.generate_content(prompt)
            result = json.loads(response.text)
            self.conversation_history.append({"user": user_input, "ai": result})
            return result
        except Exception as e:
            print(f"[GEMINI ERROR] {e}")
            # Fallback response
            return {
                "intent": "unknown",
                "response": "I'm sorry, I didn't understand that. Could you repeat?",
                "action": "none"
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
        """Process user speech input"""
        print(f"\n👤 User: {user_input}")
        
        # Parse intent with Gemini
        parsed = self.parser.parse_intent(user_input, self.context)
        intent = parsed.get("intent", "unknown")
        action = parsed.get("action", "none")
        
        # Execute appropriate action
        if action == "scan_item":
            self.scan_item()
        elif action == "check_nutrition":
            self.read_nutrition()
        elif action == "check_allergies":
            self.check_allergies()
        elif action == "call_emergency":
            self.handle_emergency("Possible allergic reaction reported")
        else:
            # Just respond
            self.voice.speak(parsed.get("response", "I'm listening."))
    
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
        """Check for allergen matches"""
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
# DEMO SCRIPT EXECUTION
# ============================================================================

def run_demo_script():
    """Execute the full demo script"""
    print("\n" + "="*60)
    print("🎬 VisionAid Prototype Demo Starting...")
    print("="*60 + "\n")
    
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
    
    system.read_nutrition()
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
    print("Python 3.9.13 | ElevenLabs + Google Gemini")
    print("\nNote: Set ELEVENLABS_API_KEY environment variable for actual TTS.")
    print("Currently using text-based simulation.\n")
    
    try:
        run_demo_script()
    except KeyboardInterrupt:
        print("\n\n⚠️  Demo interrupted by user.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
