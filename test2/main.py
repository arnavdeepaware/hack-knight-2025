"""
main.py - Conversational AI Assistant

Flow:
1. Listen to user speech (listen.py)
2. Convert speech to text (ElevenLabs/Google STT)
3. Send text to Gemini for conversation
4. Get Gemini's response
5. Convert response to speech (ElevenLabs TTS)
6. Play the speech

This creates a natural conversation flow with the AI.
"""

import os
import sys
import json
from typing import List, Dict, Optional
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import our custom modules
from listen import listen
from talk import speak


# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_ID = "gemini-2.0-flash-exp"  # Fast and efficient for conversations

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)


class ConversationManager:
    """Manages conversation history and interaction with Gemini."""
    
    def __init__(self, model_id: str = MODEL_ID, food_context: Optional[Dict] = None):
        """Initialize the conversation manager."""
        self.model = genai.GenerativeModel(model_id)
        self.chat_session = None
        self.history: List[Dict[str, str]] = []
        self.food_context = food_context
        self.first_interaction = True
        self.system_prompt = self._create_system_prompt()
        self._initialize_chat()
    
    def _create_system_prompt(self) -> str:
        """Create a system prompt for the AI assistant."""
        base_prompt = """You are a helpful, friendly, and conversational AI assistant. 

Key guidelines:
- Keep responses concise and natural for voice conversation (2-3 sentences max)
- Be warm, empathetic, and engaging
- Use casual, spoken language (avoid overly formal or technical terms)
- Show personality and enthusiasm
- If the user asks complex questions, break down your answer simply
- Remember context from previous messages in the conversation
- You can discuss ANY topic - don't limit yourself to just one subject

You're designed for voice interaction, so speak naturally as if having a real conversation."""

        if self.food_context:
            food_item = self.food_context.get('food_item', {})
            nutrition = self.food_context.get('nutrition_facts', {})
            allergens = self.food_context.get('allergens', [])
            
            food_context_prompt = f"""

AVAILABLE FOOD CONTEXT (use when relevant):
You have information about a food product available, but you're NOT limited to only talking about this:
- Product: {food_item.get('name', 'Unknown')} by {food_item.get('brand', 'Unknown')}
- Size: {food_item.get('quantity', 'Unknown')}
- Category: {food_item.get('category', 'Unknown')}

Key Nutrition Facts:
- Calories: {nutrition.get('calories', 'N/A')}
- Protein: {nutrition.get('protein', {}).get('value', 'N/A')}
- Total Fat: {nutrition.get('total_fat', {}).get('value', 'N/A')}
- Carbohydrates: {nutrition.get('total_carbohydrates', {}).get('value', 'N/A')}
- Sugars: {nutrition.get('total_sugars', {}).get('value', 'N/A')}
- Fiber: {nutrition.get('dietary_fiber', {}).get('value', 'N/A')}
- Sodium: {nutrition.get('sodium', {}).get('value', 'N/A')}

⚠️ ALLERGENS: {', '.join(allergens) if allergens else 'None listed'}

IMPORTANT: You can answer ANY question the user asks:
- General knowledge questions (science, history, math, etc.)
- Conversational topics (weather, hobbies, jokes, etc.)
- Technical questions (coding, technology, etc.)
- Creative requests (stories, ideas, suggestions, etc.)

Only reference the food context when:
- User explicitly asks about the food product
- User asks about nutrition, calories, ingredients, allergens
- User mentions allergies that relate to this product
- The conversation naturally relates to this food item

Otherwise, be a helpful general assistant and discuss whatever the user wants to talk about!
Always keep responses brief for voice interaction."""

            return base_prompt + food_context_prompt
        
        return base_prompt
    
    def _initialize_chat(self):
        """Initialize or reset the chat session."""
        try:
            # Start a new chat session
            self.chat_session = self.model.start_chat(history=[])
            print("✅ Conversation session initialized")
        except Exception as e:
            print(f"⚠️ Error initializing chat: {e}")
            self.chat_session = None
    
    def get_response(self, user_message: str) -> Optional[str]:
        """
        Get a response from Gemini for the user's message.
        
        Args:
            user_message: The user's input text
            
        Returns:
            AI's response text or None if failed
        """
        if not user_message or not user_message.strip():
            return None
        
        try:
            # For first interaction with food context, provide basic info automatically
            if self.first_interaction and self.food_context:
                self.first_interaction = False
                food_item = self.food_context.get('food_item', {})
                nutrition = self.food_context.get('nutrition_facts', {})
                
                # Create initial introduction message
                intro_message = f"{self.system_prompt}\n\nProvide a brief, friendly introduction to this food item in 2-3 sentences. Mention the name, what it is, and one key highlight (like high protein). Keep it conversational."
                
                full_message = intro_message
            # Add system prompt to first message
            elif len(self.history) == 0:
                full_message = f"{self.system_prompt}\n\nUser: {user_message}"
            else:
                full_message = user_message
            
            print(f"🤔 Thinking about: {user_message if not self.first_interaction else 'Initial food introduction'}")
            
            # Send message to Gemini
            if self.chat_session:
                response = self.chat_session.send_message(full_message)
            else:
                # Fallback to single generation if chat session failed
                response = self.model.generate_content(full_message)
            
            # Extract response text
            response_text = response.text.strip()
            
            # Store in history (skip for initial auto-intro)
            if not self.first_interaction or user_message:
                self.history.append({
                    "role": "user",
                    "content": user_message
                })
                self.history.append({
                    "role": "assistant",
                    "content": response_text
                })
            
            print(f"🤖 AI Response: {response_text}")
            return response_text
            
        except Exception as e:
            print(f"⚠️ Error getting Gemini response: {e}")
            return "I'm sorry, I had trouble processing that. Could you try again?"
    
    def reset(self):
        """Reset the conversation history."""
        self.history = []
        self.first_interaction = True
        self._initialize_chat()
        print("🔄 Conversation reset")


def load_food_context(file_path: str = "food.json") -> Optional[Dict]:
    """
    Load food context from JSON file.
    
    Args:
        file_path: Path to the food JSON file
        
    Returns:
        Food context dictionary or None if failed
    """
    try:
        # Try to find the file in the same directory as this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        full_path = os.path.join(script_dir, file_path)
        
        if not os.path.exists(full_path):
            print(f"⚠️ Food context file not found: {full_path}")
            return None
        
        with open(full_path, 'r', encoding='utf-8') as f:
            food_data = json.load(f)
        
        print(f"✅ Loaded food context: {food_data.get('food_item', {}).get('name', 'Unknown')}")
        return food_data
        
    except json.JSONDecodeError as e:
        print(f"⚠️ Error parsing food.json: {e}")
        return None
    except Exception as e:
        print(f"⚠️ Error loading food context: {e}")
        return None


def main():
    """Main conversation loop."""
    print("\n" + "="*60)
    print("🎙️  VisionR - AI Food Nutrition Assistant")
    print("="*60)
    print("\nThis assistant will:")
    print("  1. Tell you about the food item")
    print("  2. Continuously listen for wake word 'VisionR'")
    print("  3. Record and answer your questions")
    print("  4. Provide nutrition information and general assistance")
    print("\nHow to use:")
    print("  🗣️  Say 'VisionR' (or 'Vision R') to activate")
    print("  💬 Then speak your question")
    print("  ⏸️  Wait 3 seconds after speaking")
    print("  🔊 Listen to the response")
    print("  🔁 Say 'VisionR' again for next question")
    print("  🛑 Say 'quit', 'exit', or 'stop' to end")
    print("\nAlternative:")
    print("  - Type 'manual' to switch to press-Enter mode")
    print("  - Type 'exit' or 'quit' to end")
    print("  - Type any text to send without voice")
    print("\nTry saying:")
    print("  - 'VisionR, tell me about this product'")
    print("  - 'VisionR, what are the calories?'")
    print("  - 'VisionR, I have allergies'")
    print("  - 'VisionR, tell me a joke'")
    print("="*60 + "\n")
    
    # Load food context
    food_context = load_food_context("food.json")
    
    if food_context:
        food_name = food_context.get('food_item', {}).get('name', 'Unknown Product')
        print(f"📦 Loaded product: {food_name}\n")
    else:
        print("⚠️ No food context loaded - continuing with general conversation mode\n")
    
    # Initialize conversation manager with food context
    conversation = ConversationManager(food_context=food_context)
    
    # Initial greeting - AI will introduce the food item
    print("🤖 Getting food information...\n")
    initial_intro = conversation.get_response("")
    if initial_intro:
        speak(initial_intro)
    
    # Wake word mode by default
    use_wake_word_mode = True
    
    print("\n" + "="*60)
    print("🎙️ Ready! Say 'VisionR' to start a conversation")
    print("="*60)
    
    # Main conversation loop
    while True:
        try:
            # Handle wake word mode
            if use_wake_word_mode:
                # Listen for wake word, but allow text input
                print("\n💬 Say 'VisionR' to speak, or type a command:")
                print("   (Type 'manual' for press-Enter mode, 'exit' to quit)")
                
                # Start wake word listening (non-blocking approach)
                user_message = listen(dynamic=True, use_wake_word=True)
                
                if not user_message:
                    # Wake word detection was cancelled or failed
                    continue
                
                print(f"💬 You said: {user_message}")
                
            else:
                # Manual mode - wait for user input
                user_input = input("\n➡️  Press Enter to record, or type a message: ").strip()
                
                # Check for exit commands
                if user_input.lower() in ['exit', 'quit', 'bye', 'goodbye']:
                    farewell = "Goodbye! It was great talking with you. Have a wonderful day!"
                    speak(farewell)
                    print("\n👋 Exiting conversation...")
                    break
                
                # Check for mode switch
                if user_input.lower() == 'wake':
                    use_wake_word_mode = True
                    print("✅ Switched to wake word mode. Say 'VisionR' to activate.")
                    continue
                
                # Check for reset command
                if user_input.lower() == 'reset':
                    conversation.reset()
                    reset_msg = "Okay, let's start fresh! What would you like to talk about?"
                    speak(reset_msg)
                    continue
                
                # Get user's message (either typed or spoken)
                if user_input:
                    # User typed a message
                    user_message = user_input
                    print(f"💬 You: {user_message}")
                else:
                    # Record audio and transcribe with dynamic silence detection
                    print("\n🎤 Start speaking now... (I'll stop listening after 3 seconds of silence)")
                    user_message = listen(dynamic=True, use_wake_word=False)
                    
                    if not user_message:
                        error_msg = "Sorry, I didn't catch that. Could you try again?"
                        speak(error_msg)
                        continue
            
            # Check for typed commands (in wake word mode)
            if use_wake_word_mode and user_message:
                # Check for exit commands in voice input
                if any(word in user_message.lower() for word in ['exit', 'quit', 'bye', 'goodbye', 'stop']):
                    farewell = "Goodbye! It was great talking with you. Have a wonderful day!"
                    speak(farewell)
                    print("\n👋 Exiting conversation...")
                    break
                
                if user_message.lower() == 'manual':
                    use_wake_word_mode = False
                    print("✅ Switched to manual mode. Press Enter to record.")
                    continue
                
                if user_message.lower() == 'reset':
                    conversation.reset()
                    reset_msg = "Okay, let's start fresh! What would you like to talk about?"
                    speak(reset_msg)
                    continue
            
            # Get AI response
            ai_response = conversation.get_response(user_message)
            
            if not ai_response:
                error_msg = "I'm having trouble thinking right now. Let's try that again."
                speak(error_msg)
                continue
            
            # Speak the response
            speak(ai_response)
            
            # Small pause for natural conversation flow
            print("\n" + "-"*60)
            
            # In wake word mode, remind user
            if use_wake_word_mode:
                print("🔄 Ready for next question. Say 'VisionR' to continue...")
            
        except KeyboardInterrupt:
            print("\n\n⚠️ Interrupted by user")
            farewell = "Goodbye! Take care!"
            speak(farewell)
            break
            
        except Exception as e:
            print(f"\n⚠️ Unexpected error: {e}")
            error_msg = "Oops, something went wrong. Let's try continuing our conversation."
            speak(error_msg)
            continue
    
    print("\n✅ Session ended. Thank you for chatting!")


if __name__ == "__main__":
    # Check for API keys
    if not GEMINI_API_KEY or "YOUR_" in GEMINI_API_KEY:
        print("⚠️ WARNING: Gemini API key not configured!")
        print("Set GEMINI_API_KEY environment variable or update in code.")
        sys.exit(1)
    
    try:
        main()
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)
