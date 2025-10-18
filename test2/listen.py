"""
listen.py - Speech-to-Text using SpeechRecognition

Handles:
- Recording audio from microphone with dynamic silence detection
- Converting speech to text
"""

import os
import time
import tempfile
import numpy as np
import sounddevice as sd
import soundfile as sf
import speech_recognition as sr
from typing import Optional


# Recording settings
SAMPLE_RATE = 16000
CHANNELS = 1

# Voice Activity Detection settings
SILENCE_THRESHOLD = 0.01  # Adjust based on your microphone sensitivity
SILENCE_DURATION = 3.0  # Stop after 3 seconds of silence
CHUNK_DURATION = 0.1  # Process audio in 100ms chunks
MIN_RECORDING_DURATION = 0.5  # Minimum recording time in seconds


def calculate_rms(audio_chunk: np.ndarray) -> float:
    """
    Calculate the Root Mean Square (RMS) of an audio chunk to measure volume.
    
    Args:
        audio_chunk: Audio data as numpy array
        
    Returns:
        RMS value (volume level)
    """
    return np.sqrt(np.mean(audio_chunk ** 2))


def record_audio_dynamic(
    silence_threshold: float = SILENCE_THRESHOLD,
    silence_duration: float = SILENCE_DURATION,
    sample_rate: int = SAMPLE_RATE,
    max_duration: float = 60.0
) -> str:
    """
    Record audio from microphone with dynamic silence detection.
    Continues recording while you speak and stops after detecting silence.
    
    Args:
        silence_threshold: Volume threshold below which is considered silence
        silence_duration: How long to wait in silence before stopping (seconds)
        sample_rate: Audio sample rate
        max_duration: Maximum recording duration (safety limit)
        
    Returns:
        Path to the saved WAV file
    """
    print(f"🎤 Listening... (will stop after {silence_duration}s of silence)")
    
    # Calculate chunk size
    chunk_size = int(CHUNK_DURATION * sample_rate)
    silence_chunks_needed = int(silence_duration / CHUNK_DURATION)
    
    # Storage for audio data
    audio_chunks = []
    silent_chunks_count = 0
    is_speaking = False
    start_time = time.time()
    
    try:
        # Open audio stream
        with sd.InputStream(
            samplerate=sample_rate,
            channels=CHANNELS,
            dtype='float32',
            blocksize=chunk_size
        ) as stream:
            
            while True:
                # Read audio chunk
                audio_chunk, overflowed = stream.read(chunk_size)
                
                if overflowed:
                    print("⚠️ Audio buffer overflow detected")
                
                # Store the chunk
                audio_chunks.append(audio_chunk.copy())
                
                # Calculate volume level
                rms = calculate_rms(audio_chunk)
                
                # Check if speaking or silent
                if rms > silence_threshold:
                    if not is_speaking:
                        print("🗣️  Speaking detected...")
                        is_speaking = True
                    silent_chunks_count = 0
                else:
                    if is_speaking:
                        silent_chunks_count += 1
                        
                        # Visual feedback - show dots for silence countdown
                        if silent_chunks_count % 5 == 0:
                            remaining = silence_chunks_needed - silent_chunks_count
                            if remaining > 0:
                                print(".", end="", flush=True)
                
                # Check if we should stop recording
                elapsed_time = time.time() - start_time
                
                # Stop conditions:
                # 1. Detected speech and then silence for the required duration
                if is_speaking and silent_chunks_count >= silence_chunks_needed:
                    print("\n✅ Silence detected, processing...")
                    break
                
                # 2. Maximum duration reached (safety limit)
                if elapsed_time > max_duration:
                    print(f"\n⏱️ Maximum recording time ({max_duration}s) reached")
                    break
                
                # 3. Minimum recording time check
                if elapsed_time < MIN_RECORDING_DURATION:
                    continue
    
    except KeyboardInterrupt:
        print("\n⚠️ Recording interrupted by user")
    
    # Concatenate all audio chunks
    if not audio_chunks:
        print("⚠️ No audio recorded")
        return None
    
    audio_data = np.concatenate(audio_chunks, axis=0)
    
    # Convert to int16 and save
    audio_int16 = np.int16(np.clip(audio_data, -1.0, 1.0) * 32767)
    
    # Create temporary WAV file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    wav_path = tmp.name
    tmp.close()
    
    sf.write(wav_path, audio_int16, sample_rate, subtype="PCM_16")
    
    duration = len(audio_data) / sample_rate
    print(f"💾 Recorded {duration:.2f}s of audio → {wav_path}")
    
    return wav_path


def record_audio(duration: float = 5.0, sample_rate: int = SAMPLE_RATE) -> str:
    """
    Record audio from microphone for a fixed duration (legacy function).
    
    Args:
        duration: Recording duration in seconds
        sample_rate: Audio sample rate
        
    Returns:
        Path to the saved WAV file
    """
    print(f"🎤 Recording for {duration:.1f} seconds...")
    
    # Record audio
    audio = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=CHANNELS,
        dtype="float32"
    )
    sd.wait()  # Wait until recording is finished
    
    # Convert to int16 and save
    audio_int16 = np.int16(np.clip(audio, -1.0, 1.0) * 32767)
    
    # Create temporary WAV file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    wav_path = tmp.name
    tmp.close()
    
    sf.write(wav_path, audio_int16, sample_rate, subtype="PCM_16")
    print(f"💾 Audio saved to: {wav_path}")
    
    return wav_path


def speech_to_text(wav_path: str) -> Optional[str]:
    """
    Convert speech in WAV file to text using Google's Web Speech API.
    
    Args:
        wav_path: Path to the WAV audio file
        
    Returns:
        Transcribed text or None if recognition failed
    """
    recognizer = sr.Recognizer()
    
    try:
        with sr.AudioFile(wav_path) as source:
            # Record the audio from the file
            audio = recognizer.record(source)
        
        # Use Google's speech recognition
        print("🔄 Transcribing audio...")
        text = recognizer.recognize_google(audio)
        print(f"📝 Transcribed: {text}")
        return text
        
    except sr.UnknownValueError:
        print("🤷 Could not understand the audio")
        return None
        
    except sr.RequestError as e:
        print(f"⚠️ Speech recognition request error: {e}")
        return None
        
    except Exception as e:
        print(f"⚠️ Error during speech-to-text: {e}")
        return None


def listen(duration: float = None, dynamic: bool = True) -> Optional[str]:
    """
    Complete listening flow: record audio and convert to text.
    
    Args:
        duration: Recording duration in seconds (only used if dynamic=False)
        dynamic: If True, use dynamic silence detection; if False, use fixed duration
        
    Returns:
        Transcribed text or None if failed
    """
    try:
        # Record audio
        if dynamic:
            wav_path = record_audio_dynamic()
        else:
            wav_path = record_audio(duration or 5.0)
        
        if not wav_path:
            return None
        
        # Convert to text
        text = speech_to_text(wav_path)
        
        # Clean up temporary file
        try:
            os.remove(wav_path)
        except:
            pass
            
        return text
        
    except Exception as e:
        print(f"⚠️ Error in listen flow: {e}")
        return None


if __name__ == "__main__":
    # Test the listening functionality
    print("Testing listen.py with dynamic silence detection...")
    print("Start speaking, and I'll stop listening after 3 seconds of silence.")
    result = listen(dynamic=True)
    if result:
        print(f"✅ Successfully transcribed: {result}")
    else:
        print("❌ Failed to transcribe audio")
