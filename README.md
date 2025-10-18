# Food Assistant for Visually Impaired

A hackathon project to help visually disabled people shop for food using computer vision and AI.

## Setup Instructions

### Prerequisites
1. iPhone with a camera
2. Mac/Windows laptop
3. iPhone camera streaming app (like Camo, EpocCam, etc.)
4. Python 3.8+
5. Google API key for Gemini API

### Installation

1. Clone this repository
2. Install required packages:
   ```
   pip install -r requirements.txt
   ```
3. Create a `.env` file with your Google API key:
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   ```

### Connect iPhone Camera

1. Install a webcam app on your iPhone (Camo, EpocCam, etc.)
2. Follow the app's instructions to connect your iPhone as a webcam to your laptop
3. Make sure your computer recognizes the iPhone as a camera input

### Usage

1. Run the main application:
   ```
   python app.py
   ```
2. The assistant will start listening for commands
3. Hold a food item in front of the camera and say "What am I holding?"
4. The assistant will analyze the image and respond verbally

## Features

- Live camera feed from iPhone
- Voice command recognition
- Food item detection and identification
- Voice response with food information

## Future Enhancements (Phase 2)
- Interactive Q&A about food items
- Nutritional information queries
- Dietary restrictions checking