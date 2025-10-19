// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const placeholder = document.getElementById('placeholder');
const startCameraBtn = document.getElementById('startCamera');
const chatWindow = document.getElementById('chatWindow');

// New elements
const modeButtons = document.querySelectorAll('.mode-btn');
const currentModeBadge = document.getElementById('currentModeBadge');
const languageSelect = document.getElementById('languageSelect');
const foodInfoContainer = document.getElementById('foodInfoContainer');
const emergencyBtn = document.getElementById('emergencyBtn');
const emergencyOverlay = document.getElementById('emergencyOverlay');
const closeEmergencyBtn = document.getElementById('closeEmergencyBtn');
const cancelEmergencyBtn = document.getElementById('cancelEmergencyBtn');
const emergencyVideo = document.getElementById('emergencyVideo');
const emergencyCanvas = document.getElementById('emergencyCanvas');
const cameraStreamFloat = document.getElementById('cameraStreamFloat');
const minimizeBtn = document.getElementById('minimizeBtn');

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
function log(...args){ console.log('[VisionAid]', ...args); }

function pushMsg(role, text) {
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

// Start via button or placeholder
startCameraBtn.addEventListener('click', () => toggleCamera());
placeholder.addEventListener('click', () => toggleCamera());
placeholder.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') toggleCamera();
});

async function toggleCamera() { if (!cameraActive) await startCamera(); else stopCamera(); }

// Camera
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });

    video.srcObject = stream;
    await new Promise((res)=>{ if(video.readyState>=1) res(); else video.onloadedmetadata=res; });
    await video.play();

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    placeholder.style.display = 'none';
    video.style.display = 'block';
    canvas.style.display = 'block';

    startCameraBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity=".2"/>
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/>
      </svg>
      Stop Camera
    `;
    startCameraBtn.classList.add('active');
    cameraActive = true;

    drawLoopId = requestAnimationFrame(drawVideoFrame);
    log('Camera started:', canvas.width, 'x', canvas.height);

    // demo: append a line to the chat when camera starts
    pushMsg('bot', 'Camera is live. Ask me about any food item!');
  } catch (err) {
    alert('Unable to access camera: ' + err.message);
    console.error('Camera error:', err);
  }
}

function stopCamera() {
  const stream = video.srcObject;
  if (stream) { for (const t of stream.getTracks()) t.stop(); video.srcObject = null; }

  cancelAnimationFrame(drawLoopId);
  drawLoopId = null;

  video.style.display = 'none';
  canvas.style.display = 'none';
  placeholder.style.display = 'flex';

  startCameraBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="currentColor" d="M3 9a2 2 0 0 1 2-2h.93c.66 0 1.28-.33 1.66-.89l.81-1.22A2 2 0 0 1 10.07 4h3.86c.66 0 1.28.33 1.66.89l.81 1.22c.38.56 1 .89 1.67.89H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
    </svg>
    Start Camera
  `;
  startCameraBtn.classList.remove('active');
  cameraActive = false;
}

function drawVideoFrame() {
  if (!cameraActive || !ctx) return;
  try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); }
  catch(e){ console.warn('drawImage failed:', e); }
  drawLoopId = requestAnimationFrame(drawVideoFrame);
}

// Mode switching
modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    switchMode(mode);
  });
});

function switchMode(mode) {
  currentMode = mode;
  
  // Update active button
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  // Update badge
  const config = modeConfig[mode];
  currentModeBadge.textContent = config.name;
  currentModeBadge.style.background = `linear-gradient(135deg, ${config.color}20 0%, ${config.color}30 100%)`;
  currentModeBadge.style.color = config.color;
  
  // Show/hide food info based on mode
  if (foodInfoContainer) {
    foodInfoContainer.style.display = mode === 'food' ? 'block' : 'none';
  }
  
  // Update chat messages
  loadModeMessages(mode);
  
  log(`Switched to ${config.name} mode`);
}

function loadModeMessages(mode) {
  chatWindow.innerHTML = '';
  const messages = modeConfig[mode].messages;
  messages.forEach((msg, index) => {
    setTimeout(() => {
      pushMsg(msg.role, msg.text);
    }, index * 100); // Stagger messages slightly for demo effect
  });
}

// Language handling
languageSelect.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  log(`Language changed to: ${currentLanguage}`);
  // In production, this would trigger translation API
  pushMsg('bot', `Language switched to ${e.target.options[e.target.selectedIndex].text}`);
});

// Function to update food info dynamically (can be called from backend)
function updateFoodInfo(data) {
  if (!foodInfoContainer) return;
  
  document.getElementById('productName').textContent = data.name || 'Unknown Product';
  document.getElementById('productBrand').textContent = data.brand || '';
  document.getElementById('productQuantity').textContent = data.quantity || '';
  document.getElementById('calorieValue').textContent = data.calories || '0';
  document.getElementById('carbValue').textContent = `${data.carbs || 0}g`;
  document.getElementById('proteinValue').textContent = `${data.protein || 0}g`;
  document.getElementById('fatValue').textContent = `${data.fat || 0}g`;
  document.getElementById('sugarValue').textContent = `${data.sugars || 0}g`;
  document.getElementById('sodiumValue').textContent = `${data.sodium || 0}mg`;
  document.getElementById('fiberValue').textContent = `${data.fiber || 0}g`;
  
  if (data.ingredients && data.ingredients.length > 0) {
    const tagsContainer = document.getElementById('ingredientsTags');
    tagsContainer.innerHTML = data.ingredients
      .slice(0, 5)
      .map(ing => `<span class="ingredient-tag">${ing}</span>`)
      .join('');
  }
}

// Emergency mode handlers
emergencyBtn.addEventListener('click', () => activateEmergency());
closeEmergencyBtn.addEventListener('click', () => deactivateEmergency());
cancelEmergencyBtn.addEventListener('click', () => deactivateEmergency());

async function activateEmergency() {
  emergencyActive = true;
  emergencyOverlay.classList.add('active');
  
  try {
    emergencyStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    
    emergencyVideo.srcObject = emergencyStream;
    await emergencyVideo.play();
    
    log('Emergency mode activated');
    
    // Simulate emergency actions
    simulateEmergencyActions();
  } catch (err) {
    console.error('Emergency camera error:', err);
    alert('Unable to access camera for emergency mode');
  }
}

function deactivateEmergency() {
  emergencyActive = false;
  emergencyOverlay.classList.remove('active');
  
  if (emergencyStream) {
    emergencyStream.getTracks().forEach(track => track.stop());
    emergencyVideo.srcObject = null;
    emergencyStream = null;
  }
  
  // Reset status indicators
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
  
  // Simulate call
  setTimeout(() => {
    callStatusText.textContent = 'Connecting call...';
  }, 1000);
  
  setTimeout(() => {
    callStatus.classList.remove('status-pending');
    callStatus.classList.add('status-active');
    callStatusText.textContent = 'Call connected to John Doe';
  }, 3000);
  
  // Simulate SMS
  setTimeout(() => {
    smsStatusText.textContent = 'Sending message with location...';
  }, 1500);
  
  setTimeout(() => {
    smsStatus.classList.remove('status-pending');
    smsStatus.classList.add('status-active');
    smsStatusText.textContent = 'Emergency SMS sent successfully';
  }, 3500);
  
  // Simulate location
  setTimeout(() => {
    locationStatusText.textContent = 'Acquiring GPS coordinates...';
  }, 500);
  
  setTimeout(() => {
    locationStatus.classList.remove('status-pending');
    locationStatus.classList.add('status-active');
    locationStatusText.textContent = 'Location shared: 37.7749° N, 122.4194° W';
  }, 2500);
}

function resetEmergencyStatus() {
  const statusIcons = document.querySelectorAll('.status-icon');
  statusIcons.forEach(icon => {
    icon.classList.remove('status-active', 'status-error');
    icon.classList.add('status-pending');
  });
  
  document.getElementById('callStatusText').textContent = 'Preparing call...';
  document.getElementById('smsStatusText').textContent = 'Preparing message...';
  document.getElementById('locationStatusText').textContent = 'Getting location...';
}

// Minimize/Maximize camera stream
if (minimizeBtn) {
  minimizeBtn.addEventListener('click', () => {
    cameraStreamFloat.classList.toggle('minimized');
  });
}

// Click minimized icon to restore
cameraStreamFloat.addEventListener('click', (e) => {
  if (cameraStreamFloat.classList.contains('minimized')) {
    cameraStreamFloat.classList.remove('minimized');
  }
});

// Initialize with food mode
switchMode('food');

// Auto-start camera when page loads
window.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure DOM is fully ready
  setTimeout(async () => {
    if (!cameraActive) {
      log('Auto-starting camera...');
      await startCamera();
    }
  }, 500);
});
