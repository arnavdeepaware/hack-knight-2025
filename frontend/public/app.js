// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const placeholder = document.getElementById('placeholder');
const startCameraBtn = document.getElementById('startCamera');
const startAutoBtn = document.getElementById('startAuto');
const intervalBtns = document.querySelectorAll('.interval-btn');
const autoStatus = document.getElementById('autoStatus');
const autoStatusText = document.getElementById('autoStatusText');
const analysisEmpty = document.getElementById('analysisEmpty');
const analysisResults = document.getElementById('analysisResults');

// State
let cameraActive = false;
let autoCapture = false;
let selectedInterval = 5;
let autoCaptureTimer = null;
let drawLoopId = null;

// Helpers
function log(...args){ console.log('[VisionAid]', ...args); }
function setHidden(el, hidden){ if(!el) return; el.hidden = !!hidden; }

// Interval button selection
intervalBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    intervalBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedInterval = parseInt(btn.dataset.interval, 10);
    if (autoCapture) {
      stopAutoCapture();
      startAutoCaptureTimer();
    }
  });
});

// Start via button or placeholder click/keyboard
startCameraBtn.addEventListener('click', () => toggleCamera());
placeholder.addEventListener('click', () => toggleCamera());
placeholder.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') toggleCamera();
});

// Start/Stop Auto Capture
startAutoBtn?.addEventListener('click', () => {
  if (!cameraActive) {
    alert('Please start the camera first!');
    return;
  }
  autoCapture = !autoCapture;
  if (autoCapture) {
    startAutoCaptureTimer();
    updateAutoUI(true);
  } else {
    stopAutoCapture();
    updateAutoUI(false);
  }
});

async function toggleCamera() {
  if (!cameraActive) {
    await startCamera();
  } else {
    stopCamera();
  }
}

// Camera Functions
async function startCamera() {
  try {
    // Request only video; audio off
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    video.srcObject = stream;

    // Wait for metadata to get correct dimensions
    await new Promise((resolve) => {
      if (video.readyState >= 1) resolve();
      else video.onloadedmetadata = () => resolve();
    });

    await video.play();

    // Size canvas after video is ready
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    placeholder.style.display = 'none';
    video.style.display = 'block';
    canvas.style.display = 'block';

    startCameraBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity=".2"/>
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/>
      </svg>
      Stop Camera
    `;
    startCameraBtn.classList.remove('btn-primary');
    startCameraBtn.classList.add('btn-danger');
    cameraActive = true;

    // Start draw loop
    drawLoopId = requestAnimationFrame(drawVideoFrame);
    log('Camera started:', canvas.width, 'x', canvas.height);
  } catch (err) {
    alert('Unable to access camera: ' + err.message);
    console.error('Camera error:', err);
  }
}

function stopCamera() {
  const stream = video.srcObject;
  if (stream) {
    for (const track of stream.getTracks()) track.stop();
    video.srcObject = null;
  }

  cancelAnimationFrame(drawLoopId);
  drawLoopId = null;

  video.style.display = 'none';
  canvas.style.display = 'none';
  placeholder.style.display = 'flex';

  startCameraBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3 9a2 2 0 0 1 2-2h.93c.66 0 1.28-.33 1.66-.89l.81-1.22A2 2 0 0 1 10.07 4h3.86c.66 0 1.28.33 1.66.89l.81 1.22c.38.56 1 .89 1.67.89H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
    </svg>
    Start Camera
  `;
  startCameraBtn.classList.remove('btn-danger');
  startCameraBtn.classList.add('btn-primary');
  cameraActive = false;

  if (autoCapture) {
    autoCapture = false;
    stopAutoCapture();
    updateAutoUI(false);
  }
}

function drawVideoFrame() {
  if (!cameraActive || !ctx) return;
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  } catch (e) {
    console.warn('drawImage failed this frame:', e);
  }
  drawLoopId = requestAnimationFrame(drawVideoFrame);
}

// Auto Capture Functions
function startAutoCaptureTimer() {
  stopAutoCapture();
  autoCaptureTimer = setInterval(captureFrame, selectedInterval * 1000);
  captureFrame(); // immediate first capture
}

function stopAutoCapture() {
  if (autoCaptureTimer) {
    clearInterval(autoCaptureTimer);
    autoCaptureTimer = null;
  }
}

function captureFrame() {
  if (!cameraActive) return;

  // Snapshot into a temp canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(video, 0, 0);

  // Example: produce a small thumbnail data URL (simulate sending to model)
  const thumbDataUrl = tempCanvas.toDataURL('image/jpeg', 0.6);

  // Visual feedback flash
  canvas.style.opacity = '0.5';
  setTimeout(() => (canvas.style.opacity = '1'), 100);

  // Update analysis panel (mock)
  setHidden(analysisEmpty, true);
  setHidden(analysisResults, false);
  analysisResults.innerHTML = `
    <div><strong>Captured:</strong> ${new Date().toLocaleTimeString()}</div>
    <div style="margin-top:8px;"><img alt="thumbnail" src="${thumbDataUrl}" style="max-width:160px;border-radius:8px;border:1px solid #e2e8f0"/></div>
  `;

  log('Capturing frame…');
}

function updateAutoUI(active) {
  if (active) {
    autoStatus.classList.add('active');
    autoStatusText.textContent = 'Active';
    startAutoBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M10 9v6h4V9H10z"/>
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity=".2"/>
      </svg>
      Stop Auto Capture
    `;
    startAutoBtn.classList.remove('btn-success');
    startAutoBtn.classList.add('btn-danger');
  } else {
    autoStatus.classList.remove('active');
    autoStatusText.textContent = 'Inactive';
    startAutoBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M14.75 11.17l-3.2-2.13A1 1 0 0 0 10 9.87v4.26a1 1 0 0 0 1.56.83l3.2-2.13a1 1 0 0 0 0-1.66z"/>
      </svg>
      Start Auto Capture
    `;
    startAutoBtn.classList.remove('btn-danger');
    startAutoBtn.classList.add('btn-success');
  }
}

// --- Voice buttons (mock) ---
document.getElementById('testVoice')?.addEventListener('click', () => {
  document.getElementById('voiceBadge').classList.remove('status-disconnected');
  document.getElementById('voiceBadge').classList.add('status-connected');
  document.getElementById('voiceConn').textContent = 'Connected';
  document.getElementById('voiceState').textContent = 'Speaking…';
  document.getElementById('voiceError').hidden = true;

  setTimeout(() => {
    document.getElementById('voiceState').textContent = 'Idle';
  }, 1500);
});

document.getElementById('stopVoice')?.addEventListener('click', () => {
  document.getElementById('voiceState').textContent = 'Stopped';
  setTimeout(() => (document.getElementById('voiceState').textContent = 'Idle'), 800);
});
