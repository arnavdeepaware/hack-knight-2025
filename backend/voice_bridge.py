"""
Voice Bridge Server - WebSocket server for real-time voice interaction
Connects web frontend to Python voice processing (Gemini + ElevenLabs)
"""

import asyncio
import base64
import json
import os
import tempfile
import wave
from typing import Optional, Dict
import websockets
import speech_recognition as sr
import google.generativeai as genai
import requests
from dotenv import load_dotenv

load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVEN_LABS_API_KEY", "")
VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel voice

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genAI.GenerativeModel("gemini-2.0-flash")

# Global conversation state
conversation_history = []
current_food_context = None


def speech_to_text(audio_data: bytes) -> Optional[str]:
    """Convert audio bytes to text using Google Speech Recognition."""
    recognizer = sr.Recognizer()
    
    try:
        # Save audio to temporary WAV file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_data)
            wav_path = tmp.name
        
        with sr.AudioFile(wav_path) as source:
            audio = recognizer.record(source)
        
        text = recognizer.recognize_google(audio)
        print(f"📝 Transcribed: {text}")
        
        # Cleanup
        os.remove(wav_path)
        return text
        
    except sr.UnknownValueError:
        print("🤷 Could not understand audio")
        return None
    except Exception as e:
        print(f"❌ STT error: {e}")
        return None


def text_to_speech(text: str) -> Optional[bytes]:
    """Convert text to speech using ElevenLabs."""
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code == 200:
            print(f"🔊 Generated speech ({len(response.content)} bytes)")
            return response.content
        else:
            print(f"❌ TTS error: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ TTS error: {e}")
        return None


def get_ai_response(user_message: str, food_context: Optional[Dict] = None) -> str:
    """Get AI response from Gemini with food context."""
    global conversation_history, current_food_context
    
    # Build system prompt with food context
    system_prompt = """You are A-eye, a helpful voice assistant for blind shoppers in a grocery store.

Guidelines:
- Keep responses under 3 sentences (voice-friendly)
- Be warm, clear, and concise
- Answer questions about the detected food product
- Provide nutrition info when asked
- Help with shopping decisions"""
    
    if food_context:
        product = food_context.get('product', {})
        nutrition = food_context.get('nutrition', {})
        
        system_prompt += f"""

Current Product Context:
- Product: {product.get('name', 'Unknown')} by {product.get('brand', 'Unknown')}
- Size: {product.get('quantity', 'Unknown')}
- Calories: {nutrition.get('calories', 'N/A')}
- Protein: {nutrition.get('protein', 'N/A')}g
- Carbs: {nutrition.get('carbs', 'N/A')}g
- Fat: {nutrition.get('fat', 'N/A')}g
- Sugars: {nutrition.get('sugars', 'N/A')}g
- Sodium: {nutrition.get('sodium', 'N/A')}mg

Answer questions about THIS product naturally."""
    
    try:
        # Build full prompt with history
        prompt = f"{system_prompt}\n\n"
        
        # Add last 3 exchanges for context
        for msg in conversation_history[-6:]:
            role = "User" if msg['role'] == 'user' else "Assistant"
            prompt += f"{role}: {msg['content']}\n"
        
        prompt += f"User: {user_message}\nAssistant:"
        
        # Get response from Gemini
        response = model.generate_content(prompt)
        ai_text = response.text.strip()
        
        # Store in history
        conversation_history.append({"role": "user", "content": user_message})
        conversation_history.append({"role": "assistant", "content": ai_text})
        
        print(f"🤖 AI: {ai_text}")
        return ai_text
        
    except Exception as e:
        print(f"❌ Gemini error: {e}")
        return "Sorry, I had trouble processing that. Could you try again?"


async def handle_voice_message(websocket, message: Dict):
    """Handle incoming voice message from browser."""
    global current_food_context
    
    try:
        msg_type = message.get('type')
        
        if msg_type == 'audio':
            # Receive audio data from browser
            audio_base64 = message.get('data')
            audio_bytes = base64.b64decode(audio_base64)
            
            print("📥 Received audio from browser")
            
            # Step 1: Speech to Text
            user_text = speech_to_text(audio_bytes)
            if not user_text:
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': "Couldn't understand audio"
                }))
                return
            
            # Send transcription to browser
            await websocket.send(json.dumps({
                'type': 'transcription',
                'text': user_text
            }))
            
            # Step 2: Get AI response
            ai_response = get_ai_response(user_text, current_food_context)
            
            # Send AI text to browser
            await websocket.send(json.dumps({
                'type': 'response',
                'text': ai_response
            }))
            
            # Step 3: Text to Speech
            audio_data = text_to_speech(ai_response)
            if audio_data:
                # Send audio back to browser
                audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                await websocket.send(json.dumps({
                    'type': 'audio_response',
                    'data': audio_base64
                }))
        
        elif msg_type == 'food_context':
            # Update food context from detection
            current_food_context = message.get('data')
            print(f"📦 Updated food context: {current_food_context.get('product', {}).get('name', 'Unknown')}")
            
            await websocket.send(json.dumps({
                'type': 'context_updated',
                'message': 'Food context received'
            }))
        
        elif msg_type == 'reset':
            # Reset conversation
            conversation_history.clear()
            current_food_context = None
            await websocket.send(json.dumps({
                'type': 'reset_complete'
            }))
    
    except Exception as e:
        print(f"❌ Error handling message: {e}")
        await websocket.send(json.dumps({
            'type': 'error',
            'message': str(e)
        }))


async def websocket_handler(websocket, path):
    """Handle WebSocket connections."""
    print(f"✅ New connection from {websocket.remote_address}")
    
    try:
        async for message in websocket:
            data = json.loads(message)
            await handle_voice_message(websocket, data)
    
    except websockets.exceptions.ConnectionClosed:
        print("🔌 Connection closed")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")


async def main():
    """Start WebSocket server."""
    port = 8765
    print(f"\n🚀 Voice Bridge Server")
    print(f"📡 WebSocket: ws://localhost:{port}")
    print(f"🔑 Gemini: {'✓' if GEMINI_API_KEY else '✗'}")
    print(f"🎤 ElevenLabs: {'✓' if ELEVENLABS_API_KEY else '✗'}")
    print("\nWaiting for connections...\n")
    
    async with websockets.serve(websocket_handler, "localhost", port):
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    asyncio.run(main())
