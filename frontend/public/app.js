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

// State
let cameraActive = false;
let drawLoopId = null;
let currentMode = 'food';
let currentLanguage = 'en';
let emergencyActive = false;
let emergencyStream = null;

// Mode configurations
const modeConfig = {
  food: {
    name: 'Food Info',
    color: '#059669',
    messages: [
      { role: 'bot', text: 'Hi! I\'m A-eye, your vision assistant. Point your camera at food and ask me about nutrition.' },
      { role: 'user', text: 'What am I looking at?' },
      { role: 'bot', text: 'I see a bowl of cooked white rice. Would you like to know the nutritional information?' },
      { role: 'user', text: 'Yes, tell me the calories and macros' },
      { role: 'bot', text: 'One cup of cooked white rice contains approximately 205 calories. The macros are: 45g carbs, 4g protein, 0.4g fat, and 0.6g fiber.' }
    ]
  },
  cash: {
    name: 'Cash Mode',
    color: '#d97706',
    messages: [
      { role: 'bot', text: 'Cash mode activated. I can help you identify bills and coins.' },
      { role: 'user', text: 'What bill is this?' },
      { role: 'bot', text: 'This is a $20 bill. United States currency, Federal Reserve Note.' },
      { role: 'user', text: 'Can you count these bills?' },
      { role: 'bot', text: 'I see three bills: two $20 bills and one $10 bill. Total: $50.' }
    ]
  }
};

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

// Camera start function
async function startCamera() {
  if (!video || !canvas || !ctx) {
    log('Error: Video or canvas element not found');
    alert('Camera elements not found. Please refresh the page.');
    return;
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
        return;
      } catch (retryErr) {
        errorMsg += '\n\nFallback also failed: ' + retryErr.message;
      }
    }
    
    alert(errorMsg);
    console.error('Camera error details:', err);
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
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  } catch(e) {
    console.warn('drawImage failed:', e);
  }
  
  drawLoopId = requestAnimationFrame(drawVideoFrame);
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

function loadModeMessages(mode) {
  if (!chatWindow) return;
  
  chatWindow.innerHTML = '';
  const messages = modeConfig[mode]?.messages || [];
  messages.forEach((msg, index) => {
    setTimeout(() => {
      pushMsg(msg.role, msg.text);
    }, index * 100);
  });
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
