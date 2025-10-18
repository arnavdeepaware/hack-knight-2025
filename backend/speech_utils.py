import speech_recognition as sr
from elevenlabs import Client, VoiceSettings
import os
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class SpeechManager:
    def __init__(self):
        """Initialize speech recognition and synthesis components"""
        self.recognizer = sr.Recognizer()
        
        # Initialize Eleven Labs API
        eleven_labs_api_key = os.getenv("ELEVEN_LABS_API_KEY")
        if not eleven_labs_api_key:
            raise ValueError("ELEVEN_LABS_API_KEY not found in environment variables")
        self.client = Client(api_key=eleven_labs_api_key)
        
        # Choose a voice (using default voice)
        self.voice_id = "21m00Tcm4TlvDq8ikWAM"  # Rachel voice ID
        
        # Voice settings
        self.voice_settings = VoiceSettings(
            stability=0.71,
            similarity_boost=0.5,
            style=0.0,
            use_speaker_boost=True
        )
        
        # Adjust recognition parameters
        self.recognizer.energy_threshold = 4000
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.8
    
    def listen(self, timeout=5):
        """
        Listen for speech and convert to text
        
        Args:
            timeout (int): Maximum time to listen for in seconds
            
        Returns:
            str: Recognized text or None if nothing recognized
        """
        with sr.Microphone() as source:
            print("Listening...")
            # Adjust for ambient noise
            self.recognizer.adjust_for_ambient_noise(source)
            try:
                audio = self.recognizer.listen(source, timeout=timeout)
                print("Processing speech...")
                text = self.recognizer.recognize_google(audio)
                print(f"Recognized: {text}")
                return text.lower()
            except sr.WaitTimeoutError:
                print("No speech detected within timeout")
                return None
            except sr.UnknownValueError:
                print("Could not understand audio")
                return None
            except sr.RequestError as e:
                print(f"Could not request results; {e}")
                return None
    
    def speak(self, text):
        """
        Convert text to speech using Eleven Labs
        
        Args:
            text (str): Text to speak
        """
        print(f"Speaking: {text}")
        try:
            # Generate audio using Eleven Labs
            audio = self.client.generate(
                text=text,
                voice_id=self.voice_id,
                voice_settings=self.voice_settings
            )
            
            # Save and play audio
            import tempfile
            import pygame
            
            # Initialize pygame mixer
            pygame.mixer.init()
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tf:
                tf.write(audio)
                temp_filename = tf.name
            
            # Play the audio
            pygame.mixer.music.load(temp_filename)
            pygame.mixer.music.play()
            
            # Wait for playback to finish
            while pygame.mixer.music.get_busy():
                pygame.time.wait(100)
            
            # Cleanup
            pygame.mixer.quit()
            os.unlink(temp_filename)
            
        except Exception as e:
            print(f"Error generating speech with Eleven Labs: {e}")
            # In case of error, provide visual feedback
            print(f"[SPEECH] {text}")

    def wait_for_trigger_phrase(self, trigger_phrases=["what am i holding", "what's this"]):
        """
        Continuously listen until a trigger phrase is detected
        
        Args:
            trigger_phrases (list): List of phrases that trigger a response
            
        Returns:
            str: The trigger phrase that was detected
        """
        self.speak("Ready for commands.")
        
        while True:
            text = self.listen()
            if text:
                for phrase in trigger_phrases:
                    if phrase in text:
                        return phrase
            time.sleep(0.5)  # Brief pause before listening again


if __name__ == "__main__":
    # Test speech utilities
    speech_manager = SpeechManager()
    speech_manager.speak("Testing speech synthesis with Eleven Labs")
    print("Say something like 'what am I holding'")
    trigger = speech_manager.wait_for_trigger_phrase()
    if trigger:
        speech_manager.speak(f"Detected trigger phrase: {trigger}")
