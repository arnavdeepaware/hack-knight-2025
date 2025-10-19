// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const placeholder = document.getElementById('placeholder');
const startCameraBtn = document.getElementById('startCamera');
const chatWindow = document.getElementById('chatWindow');

// New elements (with null checks)
const modeButtons = document.querySelectorAll('.mode-btn');
const languageSelect = document.getElementById('languageSelect');
const foodInfoContainer = document.getElementById('foodInfoContainer');
const emergencyBtn = document.getElementById('emergencyBtn');
const emergencyOverlay = document.getElementById('emergencyOverlay');
const closeEmergencyBtn = document.getElementById('closeEmergencyBtn');
const cancelEmergencyBtn = document.getElementById('cancelEmergencyBtn');
const emergencyVideo = document.getElementById('emergencyVideo');
const detectingBadge = document.getElementById('detectingBadge');

// Define voice command constants FIRST to avoid reference errors
const VOICE_SCRIPTS = {
  WELCOME: "Welcome to A-eye, your visual assistance companion. I'm ready to help you identify food products and provide nutritional information.",
  FIRST_SCAN_SUCCESS: "Great! I've successfully identified your first item. You can ask me about calories, ingredients, or if it contains allergens.",
  HELP_MESSAGE: "I can help you identify food products and provide nutritional information. Say phrases like 'What am I holding' or 'Tell me about this food'.",
  INACTIVITY_PROMPT: "I'm still here to help. If you have a food item to scan, just say 'What is in my hand' or 'Hey Vision' to activate me.",
  SCANNING_START: "Starting to scan. Please hold the item steady for a moment.",
  SCANNING_NO_RESULT: "I couldn't identify any food product. Try holding it closer to the camera, or in better lighting.",
  ALLERGEN_WARNING: "Important: This product contains allergens that might affect some individuals. Please be careful.",
  CAMERA_STARTED: "Camera activated. I'm ready to help you identify food products. What would you like me to scan?",
  CAMERA_ERROR: "I couldn't access the camera. Please make sure your browser has permission to use the camera."
};

const VOICE_COMMANDS = {
  // Assistant wake words - activates the voice assistant (replaces "Click to Talk")
  ASSISTANT_WAKE_WORDS: [
    "hi helper", "vision bot", "assistant wake up", "listen to me", "hey vision",
    "hello a eye", "a eye help me", "start listening"
  ],
  
  // Camera activation commands (replaces "Start Camera" click)
  CAMERA_ACTIVATION: [
    "scan now", "start scanning", "turn on camera", "camera on", "start camera",
    "let me see", "enable vision", "show me"
  ],
  
  // Scan/detection commands that also start camera if needed
  SCAN_COMMANDS: [
    "what is in my hand", "what am i holding", "what's in my hand", "scan this", 
    "detect this", "what is this product", "what food is this", "identify this",
    "tell me about this", "what am I looking at", "analyze this food"
  ],
  
  // Mode switching commands
  FOOD_MODE: ["food mode", "nutrition mode", "switch to food"],
  CASH_MODE: ["cash mode", "money mode", "switch to cash"]
};

// State
let cameraActive = false;
let drawLoopId = null;
let currentMode = 'food';
let currentLanguage = 'en';
let emergencyActive = false;
let emergencyStream = null;

// Add missing variables for voice control state
let continuousRecognition = null;
let isListeningForCommands = false;
let wakePhraseDetected = false; 
let onboardingActive = false;
let currentOnboardingStep = 0;

// Add recognition state variables
let recognitionAttempts = 0;
let maxRecognitionAttempts = 5;
let recognitionBackoffTime = 1000; // Start with 1 second, will increase on failures
let recognitionTimeout = null;

// Voice settings
let currentVoice = 'scarlet';
let currentProfile = 'default';
let isSpeaking = false;
let audioQueue = [];
let audioContext = null;

// Initialize session state globally
let sessionState = {
  scanCount: 0,
  lastScannedProduct: null,
  comparisonMode: false,
  lastInteractionTime: Date.now(),
  isFirstUse: true,
  hasGivenIntroduction: false
};

// Mode configurations
const modeConfig = {
  food: {
    name: 'Food Info',
    color: '#059669',
    messages: [
      { role: 'bot', text: 'Food Info mode activated. Point your camera at any food product and ask me about it.' }
    ]
  },
  cash: {
    name: 'Cash Mode',
    color: '#d97706',
    messages: [
      { role: 'bot', text: 'Cash mode activated. I can help you identify bills and coins.' }
    ]
  }
};

// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Detection state
let isDetecting = false;
let lastDetectionTime = 0;
const DETECTION_INTERVAL = 5000; // 5 seconds

// Rate limit handling
let rateLimitWarningShown = false;

// Voice state
let isListeningForVoice = false;
let speechRecognition = null;

// Helpers
function log(...args) { 
  console.log('[A-eye]', ...args); 
}

function pushMsg(role, text) {
  if (!chatWindow) return;
  
  const row = document.createElement('div');
  row.className = `msg ${role}`;
  
  // Add avatar
  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.innerHTML = role === 'bot' 
    ? `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`
    : `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
  
  const contentWrapper = document.createElement('div');
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  
  // Add timestamp
  const timestamp = document.createElement('span');
  timestamp.className = 'bubble-timestamp';
  timestamp.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  bubble.appendChild(timestamp);
  
  contentWrapper.appendChild(bubble);
  row.appendChild(avatar);
  row.appendChild(contentWrapper);
  
  chatWindow.appendChild(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Camera toggle function
async function toggleCamera() { 
  if (!cameraActive) {
    await startCamera();
  } else {
    stopCamera();
  }
}

// Updated function to request permissions first
async function showCameraSelector() {
  try {
    // IMPORTANT: Request permission first to see device labels
    log('Requesting initial camera permission to enumerate devices...');
    
    // Request any camera to get permission
    const tempStream = await navigator.mediaDevices.getUserMedia({ 
      video: true 
    });
    
    // Stop it immediately (we just needed permission)
    tempStream.getTracks().forEach(track => track.stop());
    
    log('Permission granted, enumerating devices...');
    
    // Now we can see device labels
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    log('Available cameras:');
    videoDevices.forEach((device, i) => {
      log(`  ${i + 1}. ${device.label || `Camera ${i + 1}`} (ID: ${device.deviceId.substring(0, 20)}...)`);
    });
    
    // Detect Camo/iPhone camera with more patterns
    const iphoneCamera = videoDevices.find(d => {
      const label = d.label.toLowerCase();
      return label.includes('iphone') || 
             label.includes('camo') ||
             label.includes('continuity') ||
             label.includes('camera') && label.includes('virtual');
    });
    
    if (iphoneCamera) {
      log('✅ iPhone/Camo camera detected:', iphoneCamera.label);
      return iphoneCamera.deviceId;
    } else {
      log('⚠️ No iPhone/Camo camera found. Available devices:');
      videoDevices.forEach(d => log(`   - ${d.label}`));
    }
    
    return null;
  } catch (err) {
    log('Error getting camera permissions:', err.message);
    console.error('Full error:', err);
    return null;
  }
}

// Enhanced camera start function with voice feedback
async function startCamera() {
  if (!video || !canvas || !ctx) {
    log('Error: Video or canvas element not found');
    alert('Camera elements not found. Please refresh the page.');
    return Promise.reject('Camera elements not found');
  }

  try {
    log('🎥 Starting camera...');
    
    // Get camera selection (this will request permission)
    const preferredDeviceId = await showCameraSelector();
    
    let constraints;
    
    if (preferredDeviceId) {
      // Use the specific camera (Camo/iPhone)
      constraints = {
        video: { 
          deviceId: { exact: preferredDeviceId },
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
        audio: false
      };
      log('Using iPhone/Camo camera');
    } else {
      // Fallback to any available camera
      constraints = { 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
        audio: false
      };
      log('Using default camera (no iPhone/Camo detected)');
    }
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    log('✅ Camera access granted');
    
    // Get the actual track being used
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      log(`📹 Using camera: ${videoTrack.label}`);
    }
    
    video.srcObject = stream;
    
    // Wait for video to be ready
    await new Promise((resolve) => {
      if (video.readyState >= 2) {
        resolve();
      } else {
        video.onloadedmetadata = () => resolve();
      }
    });
    
    await video.play();
    
    log('▶️ Video playing');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    
    log(`📐 Canvas size: ${canvas.width} x ${canvas.height}`);

    // Hide placeholder, show video
    if (placeholder) placeholder.style.display = 'none';
    video.style.display = 'block';
    canvas.style.display = 'block';

    // Update button
    if (startCameraBtn) {
      startCameraBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="currentColor" opacity=".2"/>
          <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/>
        </svg>
        Stop Camera
      `;
      startCameraBtn.classList.add('active');
    }
    
    cameraActive = true;

    // Start drawing loop
    drawVideoFrame();
    
    log('🎬 Camera started successfully!');

    // Add message to chat
    pushMsg('bot', `Camera is live! ${videoTrack ? `Using: ${videoTrack.label}` : 'Ready to detect food items.'}`);
    
    // After camera starts successfully, provide voice feedback
    if (VOICE_SCRIPTS && VOICE_SCRIPTS.CAMERA_STARTED) {
      speakText(VOICE_SCRIPTS.CAMERA_STARTED);
    }
    
    return Promise.resolve();
    
  } catch (err) {
    log('❌ Camera error:', err.message);
    
    let errorMsg = 'Unable to access camera: ' + err.message;
    
    if (err.name === 'NotAllowedError') {
      errorMsg += '\n\n🔒 Camera permission denied. Please:\n1. Click the camera icon in your browser\'s address bar\n2. Allow camera access\n3. Refresh the page';
    } else if (err.name === 'NotFoundError') {
      errorMsg += '\n\n📷 No camera found. Please:\n1. Make sure Camo is running on your Mac\n2. Launch Camo app on your iPhone\n3. Check that iPhone is connected via USB\n4. Look for "Connected" in Camo';
    } else if (err.name === 'OverconstrainedError') {
      errorMsg += '\n\n⚠️ Camera doesn\'t support requested settings.\nTrying again with default settings...';
      
      // Retry with minimal constraints
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await video.play();
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        placeholder.style.display = 'none';
        video.style.display = 'block';
        canvas.style.display = 'block';
        cameraActive = true;
        drawVideoFrame();
        log('✅ Camera started with fallback settings');
        pushMsg('bot', 'Camera connected with default settings.');
        return Promise.resolve();
      } catch (retryErr) {
        errorMsg += '\n\nFallback also failed: ' + retryErr.message;
      }
    }
    
    alert(errorMsg);
    console.error('Camera error details:', err);
    return Promise.reject(err);
  }
}

// Camera stop function
function stopCamera() {
  log('Stopping camera...');
  
  const stream = video ? video.srcObject : null;
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      log('Stopped track:', track.kind);
    });
    video.srcObject = null;
  }

  if (drawLoopId) {
    cancelAnimationFrame(drawLoopId);
    drawLoopId = null;
  }

  if (video) video.style.display = 'none';
  if (canvas) canvas.style.display = 'none';
  if (placeholder) placeholder.style.display = 'flex';

  if (startCameraBtn) {
    startCameraBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="currentColor" d="M3 9a2 2 0 0 1 2-2h.93c.66 0 1.28-.33 1.66-.89l.81-1.22A2 2 0 0 1 10.07 4h3.86c.66 0 1.28.33 1.66.89l.81 1.22c.38.56 1 .89 1.67.89H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
      </svg>
      Connect Stream
    `;
    startCameraBtn.classList.remove('active');
  }
  
  cameraActive = false;
  log('Camera stopped');
}

// Draw video frame to canvas
function drawVideoFrame() {
  if (!cameraActive || !ctx || !video) return;
  
  try {
    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Periodic detection (non-blocking)
    detectFoodProduct();
    
  } catch(e) {
    console.warn('drawImage failed:', e);
  }
  
  drawLoopId = requestAnimationFrame(drawVideoFrame);
}

// Function to send frame to backend for detection - Remove chat logging
async function detectFoodProduct() {
  if (!cameraActive || !canvas || isDetecting) {
    return;
  }

  const now = Date.now();
  if (now - lastDetectionTime < DETECTION_INTERVAL) {
    return;
  }

  isDetecting = true;
  lastDetectionTime = now;

  if (detectingBadge) {
    detectingBadge.classList.add('active');
  }

  try {
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    log('📤 Sending frame to backend for detection...');

    const response = await fetch(`${API_BASE_URL}/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        mode: currentMode,
        suppressChat: true  // Add flag to suppress chat logging
      })
    });

    // ✅ Handle rate limiting
    if (response.status === 429) {
      const errorData = await response.json();
      console.warn(`⏱️ Rate limit exceeded: ${errorData.error}`);
      
      if (!rateLimitWarningShown) {
        rateLimitWarningShown = true;
        pushMsg('bot', `⏱️ Slowing down detection to avoid rate limits. Detection paused for ${errorData.retryAfter} seconds.`);
        
        // Reset warning after 5 minutes
        setTimeout(() => { rateLimitWarningShown = false; }, 300000);
      }
      
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    log('📥 Detection result:', result);

    if (result.detected && result.product) {
      updateFoodInfoFromDetection(result);
      // Don't log to chat here if the detection was automatic
      // Only update the UI silently
    } else {
      log('ℹ️ No food product detected in frame');
    }

  } catch (error) {
    console.error('❌ Detection error:', error);
  } finally {
    isDetecting = false;
    
    if (detectingBadge) {
      detectingBadge.classList.remove('active');
    }
  }
}

// Update food info UI from detection result
function updateFoodInfoFromDetection(result) {
  const { product, nutrition, ingredients, allergens, warnings } = result;

  // Update product header
  if (product.name) {
    document.getElementById('productName').textContent = product.name;
  }
  if (product.brand) {
    document.getElementById('productBrand').textContent = product.brand;
  }
  if (product.quantity) {
    document.getElementById('productQuantity').textContent = product.quantity;
  }

  // Update nutrition values
  if (nutrition) {
    if (nutrition.calories !== null) {
      document.getElementById('calorieValue').textContent = nutrition.calories;
    }
    if (nutrition.carbs !== null) {
      document.getElementById('carbValue').textContent = `${nutrition.carbs}g`;
    }
    if (nutrition.protein !== null) {
      document.getElementById('proteinValue').textContent = `${nutrition.protein}g`;
    }
    if (nutrition.fat !== null) {
      document.getElementById('fatValue').textContent = `${nutrition.fat}g`;
    }
    if (nutrition.sugars !== null) {
      document.getElementById('sugarValue').textContent = `${nutrition.sugars}g`;
    }
    if (nutrition.sodium !== null) {
      document.getElementById('sodiumValue').textContent = `${nutrition.sodium}mg`;
    }
    if (nutrition.fiber !== null) {
      document.getElementById('fiberValue').textContent = `${nutrition.fiber}g`;
    }
  }

  // Update ingredients
  if (ingredients && ingredients.length > 0) {
    const tagsContainer = document.getElementById('ingredientsTags');
    if (tagsContainer) {
      tagsContainer.innerHTML = ingredients
        .slice(0, 5)
        .map(ing => `<span class="ingredient-tag">${ing}</span>`)
        .join('');
    }
  }

  // ✅ NEW: Display allergen warnings prominently
  if (allergens && allergens.length > 0) {
    const allergenSection = document.createElement('div');
    allergenSection.className = 'allergen-warning';
    allergenSection.innerHTML = `
      <div class="alert-header">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
        <strong>ALLERGEN WARNING</strong>
      </div>
      <div class="allergen-list">
        ${allergens.map(allergen => `<span class="allergen-tag-warning">${allergen}</span>`).join('')}
      </div>
    `;
    
    // Insert before ingredients
    const foodCard = document.querySelector('.food-info-card');
    const ingredientsSection = document.querySelector('.ingredients-section');
    if (foodCard && ingredientsSection) {
      foodCard.insertBefore(allergenSection, ingredientsSection);
    }
    
    // Voice alert for allergens
    speakText(`Warning: This product contains ${allergens.join(', ')}`);
  }

  log('✅ UI updated with detection results');
}

// Event listeners for camera controls
if (startCameraBtn) {
  startCameraBtn.addEventListener('click', toggleCamera);
  log('Camera button listener attached');
}

if (placeholder) {
  placeholder.addEventListener('click', toggleCamera);
  placeholder.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCamera();
    }
  });
  log('Placeholder listeners attached');
}

// Mode switching
if (modeButtons && modeButtons.length > 0) {
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      switchMode(mode);
    });
  });
}

function switchMode(mode) {
  currentMode = mode;
  
  // Update active button
  if (modeButtons) {
    modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }
  
  // Show/hide food info based on mode
  if (foodInfoContainer) {
    foodInfoContainer.style.display = mode === 'food' ? 'block' : 'none';
  }
  
  // Update chat messages
  loadModeMessages(mode);
  
  log(`Switched to ${mode} mode`);
}

// Update the function to load initial messages for modes
function loadModeMessages(mode) {
  if (!chatWindow) return;
  
  chatWindow.innerHTML = '';
  const messages = modeConfig[mode]?.messages || [];
  if (messages.length > 0) {
    messages.forEach((msg, index) => {
      setTimeout(() => {
        pushMsg(msg.role, msg.text);
      }, index * 100);
    });
  }
}

// Language handling
if (languageSelect) {
  languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    log(`Language changed to: ${currentLanguage}`);
    pushMsg('bot', `Language switched to ${e.target.options[e.target.selectedIndex].text}`);
  });
}

// Function to update food info dynamically
function updateFoodInfo(data) {
  if (!foodInfoContainer) return;
  
  const updates = {
    'productName': data.name || 'Unknown Product',
    'productBrand': data.brand || '',
    'productQuantity': data.quantity || '',
    'calorieValue': data.calories || '0',
    'carbValue': `${data.carbs || 0}g`,
    'proteinValue': `${data.protein || 0}g`,
    'fatValue': `${data.fat || 0}g`,
    'sugarValue': `${data.sugars || 0}g`,
    'sodiumValue': `${data.sodium || 0}mg`,
    'fiberValue': `${data.fiber || 0}g`
  };
  
  Object.entries(updates).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
  
  if (data.ingredients && data.ingredients.length > 0) {
    const tagsContainer = document.getElementById('ingredientsTags');
    if (tagsContainer) {
      tagsContainer.innerHTML = data.ingredients
        .slice(0, 5)
        .map(ing => `<span class="ingredient-tag">${ing}</span>`)
        .join('');
    }
  }
}

// Emergency mode handlers
if (emergencyBtn) {
  emergencyBtn.addEventListener('click', () => activateEmergency());
}

if (closeEmergencyBtn) {
  closeEmergencyBtn.addEventListener('click', () => deactivateEmergency());
}

if (cancelEmergencyBtn) {
  cancelEmergencyBtn.addEventListener('click', () => deactivateEmergency());
}

async function activateEmergency() {
  if (!emergencyOverlay) return;
  
  emergencyActive = true;
  emergencyOverlay.classList.add('active');
  
  try {
    emergencyStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    
    if (emergencyVideo) {
      emergencyVideo.srcObject = emergencyStream;
      await emergencyVideo.play();
    }
    
    log('Emergency mode activated');
    simulateEmergencyActions();
  } catch (err) {
    console.error('Emergency camera error:', err);
    alert('Unable to access camera for emergency mode');
  }
}

function deactivateEmergency() {
  if (!emergencyOverlay) return;
  
  emergencyActive = false;
  emergencyOverlay.classList.remove('active');
  
  if (emergencyStream) {
    emergencyStream.getTracks().forEach(track => track.stop());
    if (emergencyVideo) emergencyVideo.srcObject = null;
    emergencyStream = null;
  }
  
  resetEmergencyStatus();
  log('Emergency mode deactivated');
}

function simulateEmergencyActions() {
  const callStatus = document.getElementById('callStatus');
  const smsStatus = document.getElementById('smsStatus');
  const locationStatus = document.getElementById('locationStatus');
  
  const callStatusText = document.getElementById('callStatusText');
  const smsStatusText = document.getElementById('smsStatusText');
  const locationStatusText = document.getElementById('locationStatusText');
  
  if (!callStatusText || !smsStatusText || !locationStatusText) return;
  
  // Simulate call
  setTimeout(() => { callStatusText.textContent = 'Connecting call...'; }, 1000);
  setTimeout(() => {
    if (callStatus) {
      callStatus.classList.remove('status-pending');
      callStatus.classList.add('status-active');
    }
    callStatusText.textContent = 'Call connected to John Doe';
  }, 3000);
  
  // Simulate SMS
  setTimeout(() => { smsStatusText.textContent = 'Sending message with location...'; }, 1500);
  setTimeout(() => {
    if (smsStatus) {
      smsStatus.classList.remove('status-pending');
      smsStatus.classList.add('status-active');
    }
    smsStatusText.textContent = 'Emergency SMS sent successfully';
  }, 3500);
  
  // Simulate location
  setTimeout(() => { locationStatusText.textContent = 'Acquiring GPS coordinates...'; }, 500);
  setTimeout(() => {
    if (locationStatus) {
      locationStatus.classList.remove('status-pending');
      locationStatus.classList.add('status-active');
    }
    locationStatusText.textContent = 'Location shared: 37.7749° N, 122.4194° W';
  }, 2500);
}

function resetEmergencyStatus() {
  const statusIcons = document.querySelectorAll('.status-icon');
  statusIcons.forEach(icon => {
    icon.classList.remove('status-active', 'status-error');
    icon.classList.add('status-pending');
  });
  
  const callStatusText = document.getElementById('callStatusText');
  const smsStatusText = document.getElementById('smsStatusText');
  const locationStatusText = document.getElementById('locationStatusText');
  
  if (callStatusText) callStatusText.textContent = 'Preparing call...';
  if (smsStatusText) smsStatusText.textContent = 'Preparing message...';
  if (locationStatusText) locationStatusText.textContent = 'Getting location...';
}

// Initialize with food mode
switchMode('food');

// Log initialization
log('A-eye initialized');
log('Camera element:', video ? 'Found' : 'Not found');
log('Canvas element:', canvas ? 'Found' : 'Not found');
log('Start button:', startCameraBtn ? 'Found' : 'Not found');

// ========================================
// ELEVENLABS TTS INTEGRATION (COMPLETE)
// ========================================

// ✅ Initialize audio context (must be triggered by user interaction)
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    log('✅ AudioContext initialized');
  }
  
  // Resume if suspended (Chrome auto-suspends AudioContext)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

// ✅ Context-aware voice profile selection
function getVoiceProfileForContext(text) {
  const lowerText = text.toLowerCase();
  
  // ⚠️ Allergen warnings = Clear and stable
  if (lowerText.includes('warning') || lowerText.includes('allergen') || lowerText.includes('contains')) {
    return 'clear';
  }
  
  // 🎉 Exciting news = Energetic
  if (lowerText.includes('!') && (lowerText.includes('great') || lowerText.includes('perfect') || lowerText.includes('excellent'))) {
    return 'energetic';
  }
  
  // 📊 Quick facts (calories, numbers) = Fast
  if (lowerText.match(/\d+/) && (lowerText.includes('calories') || lowerText.includes('gram') || lowerText.includes('serving'))) {
    return 'fast';
  }
  
  // 💬 Long descriptions = Calm
  if (text.length > 200) {
    return 'calm';
  }
  
  // 🗣️ Conversational = Expressive
  if (lowerText.includes('you') || lowerText.includes('i') || lowerText.includes('?')) {
    return 'expressive';
  }
  
  // Default
  return 'default';
}

// ✅ Text-to-Speech using ElevenLabs API with context-aware profiles
async function speakText(text, customProfile = null) {
  if (!text || !text.trim()) {
    return;
  }
  
  // Add to queue if already speaking
  if (isSpeaking) {
    audioQueue.push({ text, profile: customProfile });
    log('🔊 Added to speech queue:', text.substring(0, 50) + '...');
    return;
  }
  
  isSpeaking = true;
  showSpeakingIndicator(true);
  
  try {
    log('🎤 Requesting ElevenLabs TTS...');
    
    // ✅ Initialize audio context on first use
    initAudioContext();
    
    // ✅ Auto-select profile based on context if not specified
    const selectedProfile = customProfile || getVoiceProfileForContext(text);
    log(`🎛️ Using voice profile: ${selectedProfile}`);
    
    // Call backend TTS endpoint
    const response = await fetch(`${API_BASE_URL}/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        voiceId: currentVoice,
        profile: selectedProfile,
        speed: 1.16
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`TTS service error: ${response.status}`, errorData);
      
      if (response.status === 401) {
        console.error('🔐 ElevenLabs API key is invalid or not configured');
        pushMsg('bot', '⚠️ Voice service unavailable. Using browser speech instead.');
      }
      
      throw new Error(`TTS service error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.fallback) {
      log('⚠️ Falling back to browser TTS');
      speakTextBrowser(text);
      return;
    }
    
    // Convert base64 to audio and play
    const audioBlob = base64ToBlob(result.audio, 'audio/mpeg');
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // ✅ Use Web Audio API for better control (avoids autoplay issues)
    try {
      await playAudioWithWebAudioAPI(audioUrl);
      log(`🔊 ElevenLabs audio played successfully (${result.textLength} chars, voice: ${result.voiceId}, profile: ${selectedProfile})`);
    } catch (playError) {
      console.error('Web Audio API failed, trying HTML5 Audio:', playError);
      await playAudioWithHTML5(audioUrl);
    }
    
    // Cleanup
    URL.revokeObjectURL(audioUrl);
    isSpeaking = false;
    showSpeakingIndicator(false);
    
    // ✅ Process queue with profile awareness
    if (audioQueue.length > 0) {
      const nextItem = audioQueue.shift();
      speakText(nextItem.text, nextItem.profile);
    }
    
  } catch (error) {
    console.error('❌ ElevenLabs TTS error:', error);
    isSpeaking = false;
    showSpeakingIndicator(false);
    
    // Fallback to browser TTS
    speakTextBrowser(text);
  }
}

// ✅ Play audio using Web Audio API (better for programmatic playback)
async function playAudioWithWebAudioAPI(audioUrl) {
  if (!audioContext) {
    throw new Error('AudioContext not initialized');
  }
  
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => resolve();
      source.start(0);
      
    } catch (error) {
      reject(error);
    }
  });
}

// ✅ Fallback HTML5 Audio with better error handling
async function playAudioWithHTML5(audioUrl) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    audio.autoplay = true;
    audio.muted = false;
    
    audio.onended = () => resolve();
    audio.onerror = (error) => reject(error);
    
    audio.play()
      .then(() => log('🔊 HTML5 Audio playing'))
      .catch((playError) => {
        console.error('Autoplay blocked:', playError);
        
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white; padding: 16px 24px; border-radius: 12px;
          box-shadow: 0 8px 30px rgba(239, 68, 68, 0.4); z-index: 10000;
          font-family: 'Inter', sans-serif; font-weight: 600; cursor: pointer;
          animation: slideDown 0.3s ease;
        `;
        notification.textContent = '🔊 Click here to enable audio';
        
        notification.addEventListener('click', () => {
          audio.play()
            .then(() => { notification.remove(); resolve(); })
            .catch((err) => {
              notification.textContent = '❌ Could not play audio';
              setTimeout(() => notification.remove(), 2000);
              reject(err);
            });
        });
        
        document.body.appendChild(notification);
        setTimeout(() => {
          if (document.body.contains(notification)) {
            notification.remove();
            reject(new Error('User did not enable audio'));
          }
        }, 10000);
      });
  });
}

// ✅ Fallback: Browser TTS
function speakTextBrowser(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLanguage === 'en' ? 'en-US' : currentLanguage;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith(currentLanguage) && voice.name.includes('Female')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
    log('🔊 Speaking (browser fallback):', text.substring(0, 50) + '...');
  } else {
    log('⚠️ Speech synthesis not supported');
  }
}

// ✅ Helper: Convert base64 to Blob
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// ✅ Show/hide speaking indicator
function showSpeakingIndicator(show) {
  const indicator = document.querySelector('.voice-status');
  if (indicator) {
    if (show) {
      indicator.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)';
      indicator.style.borderColor = 'rgba(139, 92, 246, 0.4)';
      
      const statusText = indicator.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = '🔊 Speaking... (ElevenLabs)';
      }
    } else {
      indicator.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)';
      indicator.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      
      const statusText = indicator.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = '🎤 Voice-only • Listening...';
      }
    }
  }
}

// ✅ Stop speaking (emergency cancel)
function stopSpeaking() {
  audioQueue = [];
  
  const audios = document.querySelectorAll('audio');
  audios.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
  
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  
  isSpeaking = false;
  showSpeakingIndicator(false);
  log('🛑 Stopped all speech');
}

// ========================================
// VOICE RECOGNITION FEATURES (UNIFIED)
// ========================================

// Define the speech recognition initialization function just once
function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    log('⚠️ Speech recognition not supported in this browser');
    return false;
  }
  
  // Cancel any existing instance to avoid conflicts
  if (speechRecognition) {
    try {
      speechRecognition.abort();
      speechRecognition.stop();
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
  
  speechRecognition = new SpeechRecognition();
  speechRecognition.continuous = false;
  speechRecognition.interimResults = false;
  speechRecognition.lang = currentLanguage === 'en' ? 'en-US' : currentLanguage;
  
  speechRecognition.onstart = () => {
    isListeningForVoice = true;
    log('🎤 Listening for speech...');
    
    // Pause continuous recognition when explicit listening starts
    pauseContinuousRecognition();
  };
  
  speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    log('📝 You said:', transcript);
    pushMsg('user', transcript);
    
    handleVoiceQuery(transcript);
    
    // Reset attempt counter on successful recognition
    recognitionAttempts = 0;
    recognitionBackoffTime = 1000;
  };
  
  speechRecognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isListeningForVoice = false;
    
    if (event.error === 'not-allowed') {
      alert('Microphone permission denied. Please allow microphone access in your browser settings.');
    } else if (event.error === 'no-speech') {
      pushMsg('bot', "I didn't hear anything. Please try again.");
    } else if (event.error === 'aborted') {
      log('🔄 Speech recognition was aborted - this is usually not an issue');
      // Don't show error message for aborted as it's often caused by system/browser
    } else {
      // For other errors, try restarting after a delay if it was a requested session
      setTimeout(() => toggleVoiceListening(), 1000);
    }
  };
  
  speechRecognition.onend = () => {
    isListeningForVoice = false;
    log('🔇 Stopped listening');
    
    // Resume continuous recognition after explicit listening ends
    resumeContinuousRecognition();
  };
  
  log('✅ Voice recognition initialized');
  return true;
}

// Modified toggle voice listening to handle conflicts better
function toggleVoiceListening() {
  if (!speechRecognition) {
    const initialized = initVoiceRecognition();
    if (!initialized) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
  }
  
  if (isListeningForVoice) {
    try {
      speechRecognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      // Force reset the state
      isListeningForVoice = false;
    }
  } else {
    try {
      // Ensure we have permission before starting
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          // Pause continuous recognition to avoid conflicts
          pauseContinuousRecognition();
          
          // Start our manual recognition
          try {
            speechRecognition.start();
          } catch (error) {
            console.error('Error starting speech recognition:', error);
            if (error.message.includes('already started')) {
              speechRecognition.stop();
              setTimeout(() => {
                try {
                  speechRecognition.start();
                } catch (e) {
                  console.error('Still failed after retry:', e);
                }
              }, 100);
            }
          }
        })
        .catch(err => {
          console.error('Microphone permission error:', err);
          alert('Microphone access is required for voice commands. Please allow access and try again.');
        });
    } catch (error) {
      console.error('Fatal error in voice recognition:', error);
    }
  }
}

// Improve the continuous recognition implementation
function initContinuousRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    log('⚠️ Speech recognition not supported in this browser');
    return false;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  // Clean up any existing instance
  if (continuousRecognition) {
    try {
      continuousRecognition.abort();
      continuousRecognition.stop();
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
  
  continuousRecognition = new SpeechRecognition();
  continuousRecognition.continuous = true;
  continuousRecognition.interimResults = true;
  continuousRecognition.lang = 'en-US';
  
  continuousRecognition.onstart = () => {
    isListeningForCommands = true;
    log('🎧 Continuous command listening active');
  };
  
  continuousRecognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    
    // Only process if we have a confident result
    if (result[0].confidence > 0.6) {
      const transcript = result[0].transcript.toLowerCase().trim();
      log('👂 Heard: ' + transcript);
      
      // Update last interaction time to track activity
      sessionState.lastInteractionTime = Date.now();
      
      // Check for assistant wake words - using locally defined VOICE_COMMANDS
      if (VOICE_COMMANDS.ASSISTANT_WAKE_WORDS.some(wake => transcript.includes(wake))) {
        log('🎙️ Assistant wake word detected: ' + transcript);
        showWakeWordIndicator("Assistant activated!");
        simulateAssistantButtonClick();
      }
      
      // Check for camera commands
      if (VOICE_COMMANDS.CAMERA_ACTIVATION.some(cmd => transcript.includes(cmd))) {
        log('📷 Camera activation command detected: ' + transcript);
        showWakeWordIndicator("Starting camera...");
        simulateCameraButtonClick();
      }
      
      // Check for scan commands
      if (VOICE_COMMANDS.SCAN_COMMANDS.some(cmd => transcript.includes(cmd))) {
        log('🔍 Scan command detected: ' + transcript);
        handleScanCommand(transcript);
      }
      
      // Check for mode switching
      if (VOICE_COMMANDS.FOOD_MODE.some(cmd => transcript.includes(cmd))) {
        log('🥗 Food mode command detected');
        switchMode('food');
      }
      
      if (VOICE_COMMANDS.CASH_MODE.some(cmd => transcript.includes(cmd))) {
        log('💵 Cash mode command detected');
        switchMode('cash');
      }
      
      // Reset attempt counter on successful recognition
      recognitionAttempts = 0;
      recognitionBackoffTime = 1000;
    }
  };
  
  continuousRecognition.onerror = (event) => {
    // Handle errors intelligently
    if (event.error === 'aborted') {
      log('🔄 Continuous recognition aborted - will restart with backoff');
      // Don't increment attempt counter for aborted as it might be intentional
    } else if (event.error === 'no-speech') {
      // Ignore no-speech errors (normal when nothing is said)
    } else {
      console.error('Continuous recognition error:', event.error);
      recognitionAttempts++;
      
      // Increase backoff time exponentially
      recognitionBackoffTime = Math.min(recognitionBackoffTime * 1.5, 10000); // Max 10 second backoff
    }
  };
  
  continuousRecognition.onend = () => {
    isListeningForCommands = false;
    log('🔇 Continuous recognition ended - will restart with backoff');
    
    // Clear any pending restart
    if (recognitionTimeout) {
      clearTimeout(recognitionTimeout);
      recognitionTimeout = null;
    }
    
    // Only try to restart if we haven't hit the max attempts
    if (recognitionAttempts < maxRecognitionAttempts) {
      log(`🔄 Restarting continuous recognition in ${recognitionBackoffTime/1000} seconds (attempt ${recognitionAttempts+1}/${maxRecognitionAttempts})`);
      recognitionTimeout = setTimeout(() => {
        startContinuousRecognition();
      }, recognitionBackoffTime);
    } else {
      log('⚠️ Max recognition attempts reached. Stopping automatic restarts.');
      // Show a user-facing notification that voice commands are disabled
      showWakeWordIndicator("Voice commands disabled. Please refresh the page to re-enable.");
    }
  };
  
  // Start recognition with a short delay
  setTimeout(() => {
    startContinuousRecognition();
  }, 500);
  
  // Set up inactivity checker
  setUpInactivityChecker();
  
  return true;
}

// Define the startContinuousRecognition function once and only once
function startContinuousRecognition() {
  if (!continuousRecognition) {
    log('⚠️ Cannot start recognition - not initialized');
    return;
  }
  
  // Don't try to start if explicit listening is active
  if (isListeningForVoice) {
    log('⚠️ Skipping continuous recognition start - explicit listening active');
    return;
  }
  
  // Check if we have microphone permission first
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => {
      try {
        continuousRecognition.start();
        log('🎧 Continuous command listening started');
        isListeningForCommands = true;
      } catch (err) {
        console.error('Error starting continuous recognition:', err);
        
        // Handle already started error by stopping and restarting
        if (err.message && err.message.includes('already started')) {
          log('🔄 Recognition already running - restarting');
          try {
            continuousRecognition.stop();
            
            setTimeout(() => {
              try {
                if (!isListeningForVoice) { // Double-check before starting
                  continuousRecognition.start();
                  log('🎧 Recognition restarted successfully');
                }
              } catch (e) {
                console.error('Failed to restart recognition:', e);
                recognitionAttempts++;
              }
            }, 500);
          } catch (stopErr) {
            console.error('Error stopping recognition during restart:', stopErr);
          }
        } else {
          recognitionAttempts++;
        }
      }
    })
    .catch(err => {
      console.error('Microphone permission error:', err);
      recognitionAttempts++;
      // Don't show alert here as it might be annoying in background mode
      log('⚠️ Microphone permission denied for continuous recognition');
    });
}

// Add functions to pause and resume continuous recognition
function pauseContinuousRecognition() {
  if (continuousRecognition && isListeningForCommands) {
    log('⏸️ Pausing continuous recognition to avoid conflicts');
    try {
      continuousRecognition.stop();
    } catch (err) {
      console.error('Error stopping continuous recognition:', err);
    }
  }
}

function resumeContinuousRecognition() {
  // Only resume if not already listening
  if (continuousRecognition && !isListeningForCommands && !isListeningForVoice) {
    log('▶️ Resuming continuous recognition');
    setTimeout(() => {
      try {
        startContinuousRecognition();
      } catch (err) {
        console.error('Error resuming continuous recognition:', err);
      }
    }, 500);
  }
}

// Add a periodic permission check function to detect if microphone access is revoked
function checkMicrophonePermission() {
  navigator.permissions.query({ name: 'microphone' })
    .then(permissionStatus => {
      log(`🎤 Microphone permission status: ${permissionStatus.state}`);
      
      if (permissionStatus.state === 'denied') {
        // Show a user-facing notification that microphone access is needed
        showWakeWordIndicator("Microphone access denied. Voice features disabled.");
        
        // Stop any active recognition
        if (continuousRecognition) {
          try {
            continuousRecognition.stop();
          } catch(e) { /* ignore */ }
        }
        
        if (speechRecognition) {
          try {
            speechRecognition.stop();
          } catch(e) { /* ignore */ }
        }
      }
      
      // Listen for changes to permission
      permissionStatus.onchange = function() {
        log(`🎤 Microphone permission changed to: ${this.state}`);
        
        if (this.state === 'granted') {
          // Permission granted again, restart recognition
          recognitionAttempts = 0;
          recognitionBackoffTime = 1000;
          initContinuousRecognition();
        }
      };
    })
    .catch(error => {
      // Some browsers don't support the permissions API
      log('Permissions API not supported, cannot monitor microphone permission status');
    });
}

// Update the DOMContentLoaded handler to include permission check
document.addEventListener('DOMContentLoaded', () => {
  // Check microphone permissions
  checkMicrophonePermission();
  
  // Initialize continuous recognition with a delay
  setTimeout(() => {
    initContinuousRecognition();
  }, 2000);
});

// Add CSS for voice feedback (if not already present)
const voiceFeedbackStyle = document.createElement('style');
voiceFeedbackStyle.textContent = `
.wake-indicator {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(124, 58, 237, 0.95) 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  z-index: 9999;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  display: none;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
  transition: opacity 0.3s ease;
}
.wake-pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: white;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;
document.head.appendChild(voiceFeedbackStyle);

// Add the missing setUpInactivityChecker function
function setUpInactivityChecker() {
  // Check every 45 seconds for user inactivity
  setInterval(() => {
    const now = Date.now();
    const inactiveTime = now - sessionState.lastInteractionTime;
    
    // If inactive for more than 45 seconds and camera is active but not speaking
    if (inactiveTime > 45000 && cameraActive && !isSpeaking) {
      // Provide a gentle reminder
      if (VOICE_SCRIPTS && VOICE_SCRIPTS.INACTIVITY_PROMPT) {
        speakText(VOICE_SCRIPTS.INACTIVITY_PROMPT);
      } else {
        speakText("I'm still here if you need help. Say 'Hey Vision' to activate me.");
      }
      
      // Reset timer after reminder
      sessionState.lastInteractionTime = now;
    }
  }, 45000);
  
  log('✅ Inactivity checker initialized');
}

// ========================================
// END OF FILE
// ========================================

// Add missing implementation for showing wake word indicator
function showWakeWordIndicator(message) {
  // Create or update indicator
  let indicator = document.querySelector('.wake-indicator');
  
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'wake-indicator';
    document.body.appendChild(indicator);
  }
  
  indicator.innerHTML = `<span class="wake-pulse"></span> ${message}`;
  
  // Make sure it's visible
  indicator.style.display = 'flex';
  indicator.style.opacity = '1';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    indicator.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(indicator)) {
        indicator.style.display = 'none';
      }
    }, 300);
  }, 3000);
}

// Add missing implementation for button simulation
function simulateAssistantButtonClick() {
  if (!isListeningForVoice) {
    log('🎙️ Auto-activating assistant');
    toggleVoiceListening();
  }
}

function simulateCameraButtonClick() {
  if (!cameraActive) {
    log('📷 Auto-starting camera');
    startCamera();
  } else {
    log('📷 Camera already active');
  }
}

// Fix implementation for scan command handling
function handleScanCommand(transcript) {
  // Start camera if needed
  if (!cameraActive) {
    log('📷 Starting camera for scan');
    if (VOICE_SCRIPTS && VOICE_SCRIPTS.SCANNING_START) {
      speakText(VOICE_SCRIPTS.SCANNING_START);
    }
    
    startCamera().then(() => {
      // Wait for camera to initialize
      setTimeout(() => {
        // Now handle the detection
        simulateAssistantButtonClick();
        pushMsg('user', transcript);
        handleVoiceQuery(transcript);
      }, 1500);
    }).catch(error => {
      log('Camera error during scan command:', error);
      if (VOICE_SCRIPTS && VOICE_SCRIPTS.CAMERA_ERROR) {
        speakText(VOICE_SCRIPTS.CAMERA_ERROR);
      }
    });
  } else {
    // Camera already active, just do detection
    simulateAssistantButtonClick();
    pushMsg('user', transcript);
    handleVoiceQuery(transcript);
  }
}

// Complete the handleVoiceQuery function
async function handleVoiceQuery(query) {
  if (!query || query.trim() === '') return;
  
  log('💬 Processing query:', query);
  
  try {
    // Show thinking indicator
    pushMsg('bot', '💭 Thinking...');
    
    // Gather context about the current product being viewed (if any)
    const foodContext = {
      product: {
        name: document.getElementById('productName')?.textContent || null,
        brand: document.getElementById('productBrand')?.textContent || null,
        quantity: document.getElementById('productQuantity')?.textContent || null
      },
      nutrition: {
        calories: document.getElementById('calorieValue')?.textContent || null,
        carbs: document.getElementById('carbValue')?.textContent?.replace('g', '') || null,
        protein: document.getElementById('proteinValue')?.textContent?.replace('g', '') || null,
        fat: document.getElementById('fatValue')?.textContent?.replace('g', '') || null,
        sugars: document.getElementById('sugarValue')?.textContent?.replace('g', '') || null,
        sodium: document.getElementById('sodiumValue')?.textContent?.replace('mg', '') || null,
        fiber: document.getElementById('fiberValue')?.textContent?.replace('g', '') || null
      }
    };
    
    // Send the query to the backend with context
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        foodContext: foodContext,
        mode: currentMode,
        language: currentLanguage
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Remove thinking indicator
    const thinkingMsg = chatWindow.querySelector('.msg.bot:last-child');
    if (thinkingMsg && thinkingMsg.querySelector('.bubble').textContent.includes('💭 Thinking')) {
      thinkingMsg.remove();
    }
    
    // Update session state
    sessionState.lastInteractionTime = Date.now();
    
    // Display and speak the response
    if (result.response) {
      pushMsg('bot', result.response);
      speakText(result.response);
      
      // Process any actions returned by the backend
      if (result.actions) {
        processResponseActions(result.actions);
      }
    } else {
      throw new Error('Empty response from backend');
    }
    
  } catch (error) {
    console.error('❌ Voice query error:', error);
    
    // Remove thinking indicator
    const thinkingMsg = chatWindow.querySelector('.msg.bot:last-child');
    if (thinkingMsg && thinkingMsg.querySelector('.bubble').textContent.includes('💭 Thinking')) {
      thinkingMsg.remove();
    }
    
    // Show error message
    const errorMsg = "Sorry, I had trouble processing that request. Please try again.";
    pushMsg('bot', errorMsg);
    speakText(errorMsg);
  }
}

// Add the helper function to process actions
function processResponseActions(actions) {
  if (!actions) return;
  
  // Handle different types of actions
  if (actions.switchMode && actions.switchMode in modeConfig) {
    switchMode(actions.switchMode);
    log(`🔄 Switched to ${actions.switchMode} mode based on voice command`);
  }
  
  if (actions.showElement) {
  const element = document.getElementById(actions.showElement);
  if