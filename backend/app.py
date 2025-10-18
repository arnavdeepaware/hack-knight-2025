from flask import Flask, Response, jsonify, request
import cv2
import numpy as np
import tensorflow as tf
import tensorflow_hub as hub
import json
import time
import base64
import os
import google.generativeai as genai
from typing import Dict, List, Optional, Union, Any
import dotenv

from camera_utils import CameraManager
from gemini_vision import GeminiVision
from speech_utils import SpeechManager

dotenv.load_dotenv()

app = Flask(__name__)

# Configuration
class Config:
    # Get API key from .env file
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY not found in .env file or environment variables")
    PORT = int(os.environ.get("PORT", 3000))
    CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "*")
    NODE_ENV = os.environ.get("NODE_ENV", "development")

config = Config()

# Initialize Gemini API
if not config.GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not set. Gemini services will not work.")
else:
    genai.configure(api_key=config.GEMINI_API_KEY)

# Type definitions
class NutritionFacts:
    def __init__(self):
        self.calories = None
        self.serving_size = None
        self.fat = None
        self.saturated_fat = None
        self.trans_fat = None
        self.cholesterol = None
        self.sodium = None
        self.carbohydrates = None
        self.fiber = None
        self.sugars = None
        self.added_sugars = None
        self.protein = None

class Product:
    def __init__(self):
        self.brand = None
        self.item = None
        self.quantity = None
        self.ingredients = None

class PackagedFoodResult:
    def __init__(self):
        self.status = "uncertain"
        self.product = Product()
        self.nutrition_facts = None
        self.notes = None

# Gemini Service
class GeminiService:
    def __init__(self):
        if not config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is required")
        
        # Initialize the model
        self.model = genai.GenerativeModel('gemini-2.5-flash')
    
    def strip_code_fences(self, s):
        """Remove code fences from the text"""
        s = s.replace("```json", "").replace("```", "").strip()
        return s
    
    def safe_parse_llm_json(self, s):
        """Safely parse JSON from LLM response"""
        cleaned = self.strip_code_fences(s)
        try:
            return json.loads(cleaned)
        except:
            # Try to salvage common issues like trailing commas
            relaxed = ''.join([l for l in cleaned.splitlines() if not l.strip().startswith('/')])
            relaxed = relaxed.replace(",}", "}").replace(",]", "]")
            return json.loads(relaxed)
    
    async def analyze_image(self, image_buffer):
        """Analyze image and provide a description for blind people"""
        try:
            image_data = base64.b64encode(image_buffer).decode('utf-8')
            
            prompt = """You are a helpful assistant for blind people. Analyze this image and provide a clear, concise description that would help a blind person understand what they're seeing. Focus on:

1. Main objects and people in the scene
2. Spatial relationships (left, right, center, distance)
3. Colors and visual characteristics
4. Text if visible (read signs, labels, etc.)
5. Potential obstacles or hazards
6. Navigation cues (doors, paths, stairs)

Keep the description under 100 words and use simple, clear language. Be specific about locations and distances when possible."""
            
            response = self.model.generate_content(
                contents=[prompt, {"mime_type": "image/jpeg", "data": image_data}]
            )
            
            return response.text
        except Exception as error:
            print(f'Error analyzing image with Gemini: {error}')
            raise Exception('Failed to analyze image')
    
    async def analyze_packaged_food(self, image_buffer):
        """Analyze packaged food from image and extract product info and nutrition facts"""
        try:
            image_data = base64.b64encode(image_buffer).decode('utf-8')
            
            schema_hint = """
Return ONLY JSON with this exact shape and no extra text:

{
  "status": "ok" | "uncertain" | "not_visible",
  "product": {
    "brand": string | null,
    "item": string | null,
    "quantity": string | null,
    "ingredients": string[] | null
  },
  "nutritionFacts": {
    "calories": string | number | null,
    "servingSize": string | null,
    "fat": string | null,
    "saturatedFat": string | null,
    "transFat": string | null,
    "cholesterol": string | null,
    "sodium": string | null,
    "carbohydrates": string | null,
    "fiber": string | null,
    "sugars": string | null,
    "addedSugars": string | null,
    "protein": string | null
  } | null,
  "notes": string | null
}

Rules:
- Extract only what is VISIBLE in the image. Do not guess.
- If label is too unclear to read any product-specific info, set "status": "not_visible" and use notes like "cannot see clearly".
- If partially readable, set "status": "uncertain" and fill known fields; unknown fields must be null.
- "ingredients" must be an array of visible ingredient words if readable; otherwise null.
- If a Nutrition Facts panel is VISIBLE and readable, include "nutritionFacts" with whatever fields are readable; otherwise set it to null.
- For numbers like calories you may return a number (e.g., 180). For others keep units as text (e.g., "12g").
- Output strictly JSON, no markdown."""
            
            # Configure a temperature for more deterministic output
            json_model = genai.GenerativeModel(
                model_name='gemini-2.5-flash',
                generation_config={"temperature": 0.2}
            )
            
            prompt = f"""You are analyzing a PACKAGED FOOD product label for accessibility.

Tasks:
1) Product: brand (manufacturer), item/name (what it is), quantity/size if visible, ingredients list if visible.
2) Nutrition Facts: if the nutrition panel is visible, extract key fields (calories, serving size, fat, carbs, protein, sugar, sodium, etc.) that can be read.

{schema_hint}"""
            
            response = json_model.generate_content(
                contents=[prompt, {"mime_type": "image/jpeg", "data": image_data}]
            )
            
            text = response.text
            parsed = self.safe_parse_llm_json(text)
            
            # Minimal post-validate and normalize
            if not parsed or "product" not in parsed:
                return {
                    "status": "not_visible",
                    "product": {"brand": None, "item": None, "quantity": None, "ingredients": None},
                    "nutritionFacts": None,
                    "notes": "cannot see clearly"
                }
            
            # Ensure fields exist even if model omitted some
            parsed["status"] = parsed.get("status", "uncertain")
            parsed["product"] = {
                "brand": parsed["product"].get("brand", None),
                "item": parsed["product"].get("item", None),
                "quantity": parsed["product"].get("quantity", None),
                "ingredients": parsed["product"].get("ingredients", None) if isinstance(parsed["product"].get("ingredients", None), list) else None
            }
            
            if "nutritionFacts" not in parsed:
                parsed["nutritionFacts"] = None
                
            parsed["notes"] = parsed.get("notes", None)
            
            # If nothing readable, flip to not_visible
            has_any = (
                parsed["product"]["brand"] or
                parsed["product"]["item"] or
                parsed["product"]["quantity"] or
                (parsed["product"]["ingredients"] and len(parsed["product"]["ingredients"]) > 0) or
                (parsed["nutritionFacts"] and any(v for v in parsed["nutritionFacts"].values() if v is not None and v != ""))
            )
            
            if not has_any:
                parsed["status"] = "not_visible"
                parsed["notes"] = parsed["notes"] or "cannot see clearly"
            
            return parsed
        except Exception as error:
            print(f'Error analyzing packaged food with Gemini: {error}')
            return {
                "status": "not_visible",
                "product": {"brand": None, "item": None, "quantity": None, "ingredients": None},
                "nutritionFacts": None,
                "notes": "cannot see clearly"
            }

# Create service instances
gemini_service = GeminiService()

# Routes for food detection
@app.route('/api/vision/analyze-food', methods=['POST'])
async def analyze_food():
    try:
        if 'image' not in request.files:
            # If no image file, try to get raw body data
            if request.data:
                image_buffer = request.data
            else:
                return jsonify({"error": "No image provided"}), 400
        else:
            image_file = request.files['image']
            image_buffer = image_file.read()
        
        # Analyze the food image
        result = await gemini_service.analyze_packaged_food(image_buffer)
        return jsonify(result)
    
    except Exception as e:
        print(f"Error in analyze_food: {e}")
        return jsonify({"error": str(e)}), 500

# Webcam routes for food detection
@app.route('/detect_food', methods=['POST'])
async def detect_food():
    # Capture from webcam directly for demonstration
    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        return jsonify({"error": "Failed to capture image"}), 400
    
    # Convert frame to buffer
    _, buffer = cv2.imencode('.jpg', frame)
    image_buffer = buffer.tobytes()
    
    # Analyze the food image
    try:
        result = await gemini_service.analyze_packaged_food(image_buffer)
        return jsonify(result)
    except Exception as e:
        print(f"Error in detect_food: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/video_feed')
def video_feed():
    def generate_frames():
        cap = cv2.VideoCapture(0)
        last_detection_time = 0
        last_food_info = {}
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Detect food every 3 seconds to avoid overloading
            current_time = time.time()
            if current_time - last_detection_time > 3:
                try:
                    # Convert frame to buffer
                    _, buffer = cv2.imencode('.jpg', frame)
                    image_buffer = buffer.tobytes()
                    
                    # Run detection asynchronously (note: this is a workaround)
                    import asyncio
                    loop = asyncio.new_event_loop()
                    last_food_info = loop.run_until_complete(gemini_service.analyze_packaged_food(image_buffer))
                    loop.close()
                    
                    last_detection_time = current_time
                except Exception as e:
                    print(f"Error in video detection: {e}")
            
            # Add overlay with food information
            if last_food_info and last_food_info.get('product', {}).get('item'):
                product = last_food_info['product']
                brand = product.get('brand', 'Unknown')
                item = product.get('item', 'Unknown')
                text = f"{brand} {item}"
                cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # Convert to JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        cap.release()
    
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def index():
    return """
    <html>
      <head>
        <title>Food Detection</title>
      </head>
      <body>
        <h1>Food Detection App</h1>
        <img src="/video_feed" width="640" height="480" />
        <div id="food_info"></div>
        <button onclick="detectFood()">Detect Food</button>
        
        <script>
          function detectFood() {
            fetch('/detect_food', {method: 'POST'})
              .then(response => response.json())
              .then(data => {
                document.getElementById('food_info').innerHTML = 
                  '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
              });
          }
        </script>
      </body>
    </html>
    """

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    })

class FoodAssistant:
    def __init__(self):
        """Initialize the food assistant application"""
        self.camera = CameraManager()
        self.gemini = GeminiVision()
        self.speech = SpeechManager()
        self.running = False
        
    def start(self):
        """Start the assistant"""
        try:
            self.running = True
            
            # Initialize camera
            if not self.camera.start():
                self.speech.speak("Failed to start camera. Please check your iPhone connection.")
                return
                
            self.speech.speak("Food assistant is ready. Ask me what you're holding.")
            
            while self.running:
                # Wait for trigger phrase
                trigger = self.speech.wait_for_trigger_phrase()
                
                if trigger:
                    # Capture image from camera
                    self.speech.speak("Looking at what you're holding...")
                    
                    # Get multiple frames to ensure we have a good one
                    for _ in range(3):  # Skip a few frames
                        image = self.camera.get_frame_as_pil()
                        time.sleep(0.1)
                    
                    if image:
                        # Process with Gemini Vision API
                        self.speech.speak("Analyzing the image...")
                        response_text = self.gemini.identify_food(image)
                        
                        try:
                            # Try to parse JSON response
                            # Find JSON content between ``` markers if present
                            if "```json" in response_text:
                                json_content = response_text.split("```json")[1].split("```")[0].strip()
                                response = json.loads(json_content)
                            else:
                                # Attempt direct JSON parsing
                                response = json.loads(response_text)
                            
                            if response.get("is_food", False):
                                product = response.get("product_name", "unknown food item")
                                brand = response.get("brand", "")
                                description = response.get("description", "")
                                
                                # Construct response
                                speech_response = f"You're holding {product}"
                                if brand:
                                    speech_response += f" made by {brand}"
                                if description and "unknown" not in product.lower():
                                    speech_response += f". {description}"
                                
                                self.speech.speak(speech_response)
                            else:
                                self.speech.speak(f"This doesn't appear to be a food item. {response.get('description', '')}")
                        
                        except json.JSONDecodeError:
                            # If not valid JSON, just speak the raw response
                            self.speech.speak(f"I found: {response_text}")
                    else:
                        self.speech.speak("I couldn't capture a clear image. Please try again.")
                
                # Check for exit command
                if "exit" in trigger or "quit" in trigger:
                    self.running = False
                    self.speech.speak("Shutting down food assistant.")
        
        except Exception as e:
            self.speech.speak(f"An error occurred: {str(e)}")
        
        finally:
            self.camera.stop()
    
    def stop(self):
        """Stop the assistant"""
        self.running = False


if __name__ == '__main__':
    import uvicorn
    print(f"🚀 Food Detection Backend running on port {config.PORT}")
    print(f"🔑 Gemini API configured: {'Yes' if config.GEMINI_API_KEY else 'No'}")
    uvicorn.run(app, host="0.0.0.0", port=config.PORT)
    
    assistant = FoodAssistant()
    try:
        assistant.start()
    except KeyboardInterrupt:
        print("\nStopping assistant...")
        assistant.stop()

