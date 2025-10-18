import os
import pathlib
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class GeminiVision:
    def __init__(self):
        """Initialize the Gemini Vision API client"""
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-pro-vision')
    
    def identify_food(self, image):
        """
        Identify food items in the image using Gemini Vision API
        
        Args:
            image: PIL Image object containing the food item
            
        Returns:
            dict: Information about the detected food item
        """
        prompt = """
        Identify the food item in this image. If it's a packaged food product, 
        try to read and provide:
        1. The exact product name and brand
        2. Key ingredients if visible
        3. Any nutrition information you can see
        
        If it's not a food item, just mention what it is briefly.
        Format your response as a structured JSON object with fields: 
        {
            "is_food": true/false,
            "product_name": "...",
            "brand": "...",
            "ingredients": ["...", "..."],
            "nutrition": {"calories": "...", "sugar": "...", etc},
            "description": "..."
        }
        """
        
        response = self.model.generate_content([prompt, image])
        return response.text
    
    def answer_question(self, image, question):
        """
        Answer a specific question about the food item in the image
        
        Args:
            image: PIL Image object containing the food item
            question: The user's question about the food
            
        Returns:
            str: Answer to the question
        """
        prompt = f"""
        Look at this food item and answer the following question:
        {question}
        
        Be concise and direct in your response. If you can't determine the answer from the image,
        please say so clearly.
        """
        
        response = self.model.generate_content([prompt, image])
        return response.text


if __name__ == "__main__":
    # Test with a local image file
    gemini = GeminiVision()
    try:
        # Replace with path to a test image
        test_image_path = "test_food.jpg"
        if os.path.exists(test_image_path):
            img = Image.open(test_image_path)
            result = gemini.identify_food(img)
            print(result)
        else:
            print(f"Test image not found: {test_image_path}")
    except Exception as e:
        print(f"Error testing Gemini Vision: {e}")
