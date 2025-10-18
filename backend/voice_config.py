from elevenlabs import voices, Voice
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

def list_available_voices():
    """List all available voices from Eleven Labs"""
    try:
        eleven_labs_api_key = os.getenv("ELEVEN_LABS_API_KEY")
        if not eleven_labs_api_key:
            print("ERROR: ELEVEN_LABS_API_KEY not found in environment variables")
            return []
            
        available_voices = voices()
        print("Available Eleven Labs voices:")
        for i, voice in enumerate(available_voices):
            print(f"{i+1}. {voice.name} (ID: {voice.voice_id})")
        
        return available_voices
    except Exception as e:
        print(f"Error listing voices: {e}")
        return []

def update_voice_settings(voice_name=None, stability=0.5, similarity_boost=0.5):
    """
    Update the speech_utils.py file to use the specified voice settings
    
    Args:
        voice_name (str): Name of the voice to use
        stability (float): Voice stability setting (0.0-1.0)
        similarity_boost (float): Voice similarity boost setting (0.0-1.0)
    """
    try:
        # If no voice name provided, let user select from available voices
        if not voice_name:
            available_voices = list_available_voices()
            if not available_voices:
                print("No voices available or API key not set.")
                return
                
            choice = input("\nEnter the number of the voice you want to use: ")
            try:
                index = int(choice) - 1
                if 0 <= index < len(available_voices):
                    voice_name = available_voices[index].name
                else:
                    print("Invalid selection. Using default voice 'Rachel'.")
                    voice_name = "Rachel"
            except:
                print("Invalid input. Using default voice 'Rachel'.")
                voice_name = "Rachel"
                
        print(f"Configuring voice: {voice_name}")
        print(f"Stability: {stability}")
        print(f"Similarity Boost: {similarity_boost}")
        
        # These settings can be used in the SpeechManager class by updating the speak method
        print("\nTo use these settings, update your SpeechManager.speak method with:")
        print(f"""
        audio = generate(
            text=text,
            voice="{voice_name}",
            model="eleven_monolingual_v1",
            voice_settings=VoiceSettings(
                stability={stability},
                similarity_boost={similarity_boost}
            )
        )
        """)
        
    except Exception as e:
        print(f"Error updating voice settings: {e}")

if __name__ == "__main__":
    print("Eleven Labs Voice Configuration Utility")
    print("--------------------------------------")
    update_voice_settings()
