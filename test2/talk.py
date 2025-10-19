"""
talk.py - Text-to-Speech using ElevenLabs

Handles:
- Converting text to speech using ElevenLabs API
- Playing audio output
"""

import os
import tempfile
import requests
import pygame
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ElevenLabs Configuration
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"

# Voice IDs (you can customize these)
VOICE_IDS = {
    "rachel": "21m00Tcm4TlvDq8ikWAM",  # Rachel - warm, friendly
    "bella": "EXAVITQu4vr4xnSDxMaL",  # Bella - confident, expressive
    "scarlet": "j7KV53NgP8U4LRS2k2Gs",  # Scarlet - bold, dynamic
    "default": "c1uwEpPUcC16tq1udqxk"
}


def text_to_speech(text: str, voice_id: str = None) -> Optional[str]:
    """
    Convert text to speech using ElevenLabs API.
    
    Args:
        text: Text to convert to speech
        voice_id: ElevenLabs voice ID (uses default if None)
        
    Returns:
        Path to the generated MP3 file or None if failed
    """
    if not ELEVENLABS_API_KEY or "YOUR_" in ELEVENLABS_API_KEY:
        print("⚠️ ElevenLabs API key not configured")
        return None
    
    # Use default voice if not specified
    if voice_id is None:
        voice_id = VOICE_IDS["default"]
    
    # Prepare API request
    url = f"{ELEVENLABS_API_URL}/{voice_id}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
    }
    
    payload = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.5,
            "use_speaker_boost": True
        }
    }
    
    try:
        print("🔄 Converting text to speech...")
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        
        if response.status_code != 200:
            print(f"⚠️ ElevenLabs API error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
        
        # Save audio to temporary file
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        tmp.write(response.content)
        mp3_path = tmp.name
        tmp.close()
        
        print(f"💾 Audio saved to: {mp3_path}")
        return mp3_path
        
    except requests.exceptions.Timeout:
        print("⚠️ Request timeout - ElevenLabs took too long to respond")
        return None
        
    except Exception as e:
        print(f"⚠️ Error during text-to-speech: {e}")
        return None


def play_audio(audio_path: str) -> bool:
    """
    Play audio file.
    
    Args:
        audio_path: Path to the audio file
        
    Returns:
        True if successful, False otherwise
    """
    try:
        print(f"🔊 Playing audio...")
        pygame.mixer.init()
        pygame.mixer.music.load(audio_path)
        pygame.mixer.music.play()
        while pygame.mixer.music.get_busy():
            pygame.time.Clock().tick(10)
        return True
        
    except Exception as e:
        print(f"⚠️ Error playing audio: {e}")
        return False


def speak(text: str, voice_id: str = None, cleanup: bool = True) -> bool:
    """
    Complete speaking flow: convert text to speech and play it.
    
    Args:
        text: Text to speak
        voice_id: ElevenLabs voice ID (uses default if None)
        cleanup: Whether to delete the audio file after playing
        
    Returns:
        True if successful, False otherwise
    """
    if not text:
        print("⚠️ No text provided to speak")
        return False
    
    print(f"💬 Speaking: {text}")
    
    # Convert text to speech
    audio_path = text_to_speech(text, voice_id)
    
    if not audio_path:
        # Fallback: just print the text
        print(f"🔊 [FALLBACK] {text}")
        return False
    
    # Play the audio
    success = play_audio(audio_path)
    
    # Clean up temporary file
    if cleanup:
        try:
            os.remove(audio_path)
        except:
            pass
    
    return success


if __name__ == "__main__":
    # Test the speaking functionality
    print("Testing talk.py...")
    test_text = "Hello! I am your AI assistant. How can I help you today?"
    success = speak(test_text)
    
    if success:
        print("✅ Successfully spoke the test message")
    else:
        print("❌ Failed to speak the test message")
