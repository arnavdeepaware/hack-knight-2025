# Setup Guide - Blind Assistance System

This guide will help you set up the Blind Assistance system on your local machine.

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **Google Gemini API key** ([Get one here](https://makersuite.google.com/app/apikey))
- **Modern web browser** with camera support (Chrome, Firefox, Safari, Edge)
- **Stable internet connection** for API calls

## 🚀 Step-by-Step Setup

### Step 1: Clone the Repository
```bash
git clone <your-repository-url>
cd hack-knight-2025
```

### Step 2: Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp env.example .env
   ```

4. **Edit the `.env` file:**
   ```bash
   nano .env  # or use your preferred editor
   ```
   
   Add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   WS_PORT=3002
   MAX_IMAGE_SIZE=5242880
   IMAGE_QUALITY=80
   ```

5. **Start the backend server:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   🚀 Blind Assistance Backend running on port 3001
   📡 WebSocket server running on ws://localhost:3001/ws
   🌐 CORS enabled for: http://localhost:3000
   🔑 Gemini API configured: Yes
   ```

### Step 3: Frontend Setup

1. **Open a new terminal and navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend development server:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   ▲ Next.js 14.0.4
   - Local:        http://localhost:3000
   - ready started server on 0.0.0.0:3000
   ```

### Step 4: Access the Application

1. **Open your web browser** and go to: `http://localhost:3000`

2. **Allow camera permissions** when prompted

3. **Test the system:**
   - Click "Start Camera"
   - Click the camera button to capture a photo
   - Listen for voice guidance

## 🔧 Configuration Options

### Backend Configuration

Edit `backend/.env` to customize:

```env
# Server Configuration
PORT=3001                    # Backend server port
NODE_ENV=development         # Environment mode

# API Configuration
GEMINI_API_KEY=your_key      # Required: Your Gemini API key

# CORS Configuration
CORS_ORIGIN=http://localhost:3000  # Frontend URL

# WebSocket Configuration
WS_PORT=3002                 # WebSocket port (usually same as main port)

# Image Processing
MAX_IMAGE_SIZE=5242880       # Max image size in bytes (5MB)
IMAGE_QUALITY=80             # JPEG quality (1-100)
```

### Frontend Configuration

The frontend automatically connects to `http://localhost:3001`. To change this:

1. Edit `frontend/src/hooks/useVisionAnalysis.ts`
2. Update the `API_BASE_URL` constant
3. Update the WebSocket URL in `frontend/src/hooks/useVoice.ts`

## 🧪 Testing the Setup

### 1. Backend Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "connectedClients": 0
}
```

### 2. Frontend Connection Test
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for WebSocket connection messages
4. Should see: "WebSocket connected"

### 3. Voice Test
1. Click "Test Voice" button
2. Should hear: "Hello! This is a test of the voice guidance system..."

### 4. Camera Test
1. Click "Start Camera"
2. Allow camera permissions
3. Should see live camera feed
4. Click camera button to capture photo

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. "Camera not supported" Error
**Problem:** Browser doesn't support camera access
**Solution:** 
- Use a modern browser (Chrome, Firefox, Safari, Edge)
- Ensure you're on HTTPS in production
- Check browser camera permissions

#### 2. "Failed to connect to voice service" Error
**Problem:** WebSocket connection failed
**Solution:**
- Ensure backend is running on port 3001
- Check firewall settings
- Verify CORS configuration

#### 3. "Failed to analyze image" Error
**Problem:** Gemini API issues
**Solution:**
- Verify API key is correct
- Check internet connection
- Ensure API key has proper permissions
- Check image size (max 5MB)

#### 4. "Camera access denied" Error
**Problem:** Browser blocked camera access
**Solution:**
- Click the camera icon in browser address bar
- Select "Allow" for camera access
- Refresh the page

#### 5. No voice output
**Problem:** Text-to-speech not working
**Solution:**
- Check browser audio settings
- Ensure system volume is up
- Try "Test Voice" button
- Check browser console for errors

### Debug Mode

Enable detailed logging:

1. **Backend:** Set `NODE_ENV=development` in `.env`
2. **Frontend:** Open browser developer tools
3. **Check console** for detailed error messages

### Port Conflicts

If ports 3000 or 3001 are in use:

1. **Change backend port:**
   ```bash
   # Edit backend/.env
   PORT=3002
   ```

2. **Update frontend API URL:**
   ```bash
   # Edit frontend/src/hooks/useVisionAnalysis.ts
   const API_BASE_URL = 'http://localhost:3002/api/vision';
   ```

## 🔄 Development Workflow

### Making Changes

1. **Backend changes:** Restart with `npm run dev`
2. **Frontend changes:** Hot reload automatically
3. **Environment changes:** Restart both servers

### Adding New Features

1. **Backend:** Add routes in `src/routes/`
2. **Frontend:** Add components in `src/components/`
3. **API:** Update types and interfaces
4. **Test:** Verify both frontend and backend work together

## 📱 Production Deployment

### Backend Deployment

1. **Build the application:**
   ```bash
   cd backend
   npm run build
   ```

2. **Set production environment:**
   ```bash
   NODE_ENV=production
   ```

3. **Start production server:**
   ```bash
   npm start
   ```

### Frontend Deployment

1. **Build the application:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

### Environment Variables for Production

```env
NODE_ENV=production
GEMINI_API_KEY=your_production_api_key
CORS_ORIGIN=https://your-domain.com
PORT=3001
```

## 🆘 Getting Help

If you encounter issues:

1. **Check this troubleshooting guide**
2. **Review the main README.md**
3. **Check browser console for errors**
4. **Verify all prerequisites are met**
5. **Create an issue in the repository**

## ✅ Verification Checklist

Before considering setup complete, verify:

- [ ] Backend server running on port 3001
- [ ] Frontend accessible at http://localhost:3000
- [ ] Camera permissions granted
- [ ] WebSocket connection established
- [ ] Voice test working
- [ ] Image analysis working
- [ ] No console errors

---

**Setup complete! 🎉 You're ready to use the Blind Assistance system.**
