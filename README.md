# Blind Assistance - AI-Powered Voice Guidance

A real-time voice guidance system for blind people using Google Gemini Multimodal API. The system continuously analyzes camera input and provides spoken descriptions of the environment, naigation guidance, and object identification.

## 🌟 Features

- **Real-time Camera Analysis**: Continuous image capture and analysis using device camera
- **AI-Powered Descriptions**: Google Gemini API provides detailed scene descriptions
- **Voice Guidance**: Text-to-speech output for all analysis results
- **Navigation Assistance**: Specific guidance for movement and obstacles
- **Object Identification**: Recognition and description of objects in the environment
- **Auto Capture Mode**: Continuous monitoring with configurable intervals
- **Accessibility Focused**: Designed specifically for blind and visually impaired users
- **WebSocket Communication**: Real-time voice message delivery
- **Error Handling**: Comprehensive error management and user feedback

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Gemini API Integration**: Multimodal image analysis
- **WebSocket Server**: Real-time voice message delivery
- **Image Processing**: Sharp for image optimization
- **Voice Service**: Message queuing and priority management

### Frontend (Next.js + React)
- **Camera Access**: Real-time video capture using getUserMedia
- **Voice Synthesis**: Web Speech API for text-to-speech
- **Responsive UI**: Accessible design with keyboard navigation
- **Auto Capture**: Configurable continuous monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Google Gemini API key
- Modern web browser with camera support

### 1. Clone and Setup
```bash
git clone <repository-url>
cd hack-knight-2025
```

### 2. Backend Setup
```bash
cd backend
npm install
cp env.example .env
# Edit .env and add your GEMINI_API_KEY
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Access Application
- Open http://localhost:3000
- Allow camera permissions
- Start using the voice guidance system

## 🔧 Configuration

### Environment Variables (Backend)
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
WS_PORT=3002
MAX_IMAGE_SIZE=5242880
IMAGE_QUALITY=80
```

### Getting Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

## 📱 Usage

### Basic Usage
1. **Start Camera**: Click "Start Camera" and allow permissions
2. **Capture Photo**: Click the camera button to analyze current view
3. **Listen**: Voice guidance will automatically describe what's seen
4. **Navigate**: Follow the spoken navigation instructions

### Auto Capture Mode
1. **Enable Auto Capture**: Click "Start Auto Capture"
2. **Set Interval**: Choose capture frequency (3-30 seconds)
3. **Continuous Monitoring**: System automatically captures and analyzes
4. **Voice Feedback**: Receive continuous voice updates

### Voice Controls
- **Test Voice**: Verify audio is working
- **Stop Speaking**: Pause current voice output
- **Priority Messages**: High-priority messages interrupt lower priority ones

## 🎯 AI Analysis Types

### Scene Description
- Main objects and people in the scene
- Spatial relationships (left, right, center, distance)
- Colors and visual characteristics
- Text recognition (signs, labels, etc.)

### Navigation Guidance
- Clear paths and walkways
- Obstacles to avoid (steps, curbs, objects)
- Doors, entrances, and exits
- Stairs or elevators
- Handrails or guide features

### Object Identification
- People (count, approximate age, activities)
- Furniture and fixtures
- Electronic devices
- Food or drinks
- Personal items
- Safety-related objects

## 🔒 Privacy & Security

- **Local Processing**: Images processed locally before sending to API
- **No Storage**: Images are not stored on the server
- **Secure Communication**: HTTPS/WSS for all communications
- **API Key Protection**: Environment variable configuration

## ♿ Accessibility Features

- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respects user motion preferences
- **Voice-First Design**: Primary interaction through voice
- **Clear Error Messages**: Descriptive error feedback

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm test            # Run tests
```

### Frontend Development
```bash
cd frontend
npm run dev         # Start development server
npm run build       # Build for production
npm run lint        # Run linter
```

### API Endpoints

#### POST /api/vision/analyze
Analyze uploaded image
- **Body**: FormData with 'image' field
- **Response**: Analysis results (description, navigation, objects)

#### GET /api/vision/voice/status
Get voice service status
- **Response**: Connection status, queue length, processing state

#### POST /api/vision/voice/test
Test voice with custom message
- **Body**: `{ "message": "test message" }`

#### POST /api/vision/voice/stop
Stop current voice guidance

### WebSocket Events

#### Client → Server
- `ping`: Health check
- `status`: Request voice service status

#### Server → Client
- `connected`: Connection established
- `description`: Scene description message
- `navigation`: Navigation guidance message
- `objects`: Object identification message
- `error`: Error message
- `status`: Voice service status update

## 🚨 Troubleshooting

### Common Issues

**Camera Not Working**
- Check browser permissions
- Ensure HTTPS in production
- Try different browser

**Voice Not Speaking**
- Check WebSocket connection
- Verify browser audio settings
- Test with "Test Voice" button

**Analysis Failing**
- Verify Gemini API key
- Check image size (max 5MB)
- Ensure stable internet connection

**WebSocket Connection Issues**
- Check backend is running on port 3001
- Verify CORS settings
- Check firewall settings

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and logging.

## 📈 Performance Optimization

- **Image Compression**: Automatic resizing and quality optimization
- **Message Queuing**: Priority-based voice message handling
- **Connection Pooling**: Efficient WebSocket management
- **Caching**: Reduced API calls for similar images

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Google Gemini API for multimodal AI capabilities
- Web Speech API for text-to-speech functionality
- React and Next.js for the frontend framework
- Express.js for the backend server
- Built with accessibility in mind for the blind community

## 📞 Support

For support or questions:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section

---

**Built with ❤️ for accessibility at Hack Knight 2025**