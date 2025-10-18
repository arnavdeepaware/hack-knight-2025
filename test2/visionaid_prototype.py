"""
VisionAid Interactive Voice Assistant
- Mic -> STT (SpeechRecognition using Google)  [NO PyAudio required]
- Reasoning -> Gemini
- TTS -> ElevenLabs (played with playsound)

Deps:
  pip install google-generativeai requests playsound==1.2.2 SpeechRecognition sounddevice soundfile numpy
"""

import os
import io
import sys
import time
import json
import queue
import tempfile
import threading
from typing import Optional

import numpy as np
import sounddevice as sd
import soundfile as sf
from playsound import playsound
import speech_recognition as sr
import requests
import google.generativeai as genai

# -----------------------------------------------------------------------------
# CONFIG
# -----------------------------------------------------------------------------
# Prefer environment variables; fallback to literal placeholders.
GEMINI_API_KEY = "AIzaSyBqEEsfEPPGIN-fU39yRlBdj945HeNtyeI"
ELEVENLABS_API_KEY = "sk_94f0c1bdddb7708a716f144946a9f543531cee997f5b5d4a"

if not GEMINI_API_KEY or "YOUR_GEMINI_KEY_HERE" in GEMINI_API_KEY:
    print("⚠️  Set GEMINI_API_KEY env var or paste your key into GEMINI_API_KEY.")
if not ELEVENLABS_API_KEY or "YOUR_ELEVENLABS_KEY_HERE" in ELEVENLABS_API_KEY:
    print("⚠️  Set ELEVENLABS_API_KEY env var or paste your key into ELEVENLABS_API_KEY.")

# Configure Gemini (use fast model for hackathons)
genai.configure(api_key=GEMINI_API_KEY)
MODEL_ID = "gemini-2.5-flash"  # or "gemini-pro" if you prefer
model = genai.GenerativeModel(MODEL_ID)

# ElevenLabs voices
VOICE_NORMAL = "21m00Tcm4TlvDq8ikWAM"  # Rachel
VOICE_URGENT = "EXAVITQu4vr4xnSDxMaL"  # Bella

# Recording settings (short, snappy)
SAMPLE_RATE = 16000
CHANNELS = 1
DEFAULT_RECORD_SECONDS = 5.0


# -----------------------------------------------------------------------------
# AUDIO: RECORD FROM MIC (NO PYAUDIO)
# -----------------------------------------------------------------------------
def record_wav(seconds: float = DEFAULT_RECORD_SECONDS) -> str:
    """
    Record from the system default microphone using sounddevice and save to a WAV file.
    Returns path to the WAV file.
    """
    print(f"🎤 Recording for {seconds:.1f}s…")
    audio = sd.rec(int(seconds * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=CHANNELS, dtype="float32")
    sd.wait()
    # Normalize to int16 and save
    audio_int16 = np.int16(np.clip(audio, -1.0, 1.0) * 32767)

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    wav_path = tmp.name
    tmp.close()
    sf.write(wav_path, audio_int16, SAMPLE_RATE, subtype="PCM_16")
    print(f"💾 Saved: {wav_path}")
    return wav_path


# -----------------------------------------------------------------------------
# STT: TRANSCRIBE WITH SPEECHRECOGNITION (GOOGLE WEB API)
# -----------------------------------------------------------------------------
def transcribe_google(wav_path: str) -> str:
    """
    Use SpeechRecognition's Google recognizer on a WAV file (no PyAudio needed).
    """
    r = sr.Recognizer()
    with sr.AudioFile(wav_path) as source:
        audio = r.record(source)
    try:
        text = r.recognize_google(audio)
        print(f"📝 Transcribed: {text}")
        return text
    except sr.UnknownValueError:
        print("🤷  I couldn't understand that.")
        return ""
    except sr.RequestError as e:
        print(f"⚠️  STT request error: {e}")
        return ""


# -----------------------------------------------------------------------------
# NLU: GEMINI RESPONSE
# -----------------------------------------------------------------------------
def ask_gemini(prompt: str, history: Optional[list] = None) -> str:
    """
    Ask Gemini for a response. Includes short system style for clarity.
    """
    system_guidance = (
        "You are VisionAid, a brief, clear, empathetic voice assistant for a visually impaired user. "
        "Keep replies short and spoken-friendly. If asked to read nutrition or identify items, be practical."
    )
    try:
        full_prompt = f"{system_guidance}\n\nUser: {prompt}\nAssistant:"
        resp = model.generate_content(full_prompt)
        text = (resp.text or "").strip()
        if not text:
            text = "Sorry, I don't have a response."
        print(f"🤖 Gemini: {text}")
        return text
    except Exception as e:
        print(f"⚠️  Gemini error: {e}")
        return "Sorry, I had trouble thinking about that."


# -----------------------------------------------------------------------------
# TTS: ELEVENLABS
# -----------------------------------------------------------------------------
def elevenlabs_speak(text: str, voice_id: str = VOICE_NORMAL):
    """
    Send text to ElevenLabs TTS and play the MP3 with playsound.
    """
    if not ELEVENLABS_API_KEY or "YOUR_ELEVENLABS_KEY_HERE" in ELEVENLABS_API_KEY:
        # Fallback: print only
        print(f"\n🔊 VisionAid: {text}\n")
        return

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.5},
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        if resp.status_code != 200:
            print(f"[TTS ERROR] {resp.status_code}: {resp.text}")
            print(f"🔊 VisionAid (fallback): {text}")
            return

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            tmp.write(resp.content)
            mp3_path = tmp.name

        # Play audio (blocking)
        playsound(mp3_path)
    except Exception as e:
        print(f"[TTS ERROR] {e}")
        print(f"🔊 VisionAid (fallback): {text}")


# -----------------------------------------------------------------------------
# MAIN LOOP
# -----------------------------------------------------------------------------
def main():
    # Greeting
    elevenlabs_speak("Hello, I'm VisionAid. Press Enter to talk, or type exit to quit.")

    while True:
        user = input("\n➡️  Press Enter to record, or type a message (type 'exit' to quit): ").strip()
        if user.lower() == "exit":
            elevenlabs_speak("Goodbye. Stay safe.")
            break

        # If user typed text, skip recording
        if user:
            query_text = user
        else:
            # Record short utterance
            wav_path = record_wav(seconds=5.0)
            query_text = transcribe_google(wav_path)
            if not query_text:
                elevenlabs_speak("Sorry, I didn't catch that. Please try again.")
                continue

        # Get response from Gemini
        reply = ask_gemini(query_text)

        # Speak it back
        elevenlabs_speak(reply)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 Exiting.")
