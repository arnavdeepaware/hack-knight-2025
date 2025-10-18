// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const placeholder = document.getElementById('placeholder');
const startCameraBtn = document.getElementById('startCamera');
const chatWindow = document.getElementById('chatWindow');

// State
let cameraActive = false;
let drawLoopId = null;

// Helpers
function log(...args){ console.log('[VisionAid]', ...args); }
function pushMsg(role, text) {
  const row = document.createElement('div');
  row.className = `msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
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
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity=".2"/>
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/>
      </svg>
      Stop Camera
    `;
    startCameraBtn.classList.remove('btn-primary');
    startCameraBtn.classList.add('btn-danger');
    cameraActive = true;

    drawLoopId = requestAnimationFrame(drawVideoFrame);
    log('Camera started:', canvas.width, 'x', canvas.height);

    // demo: append a line to the chat when camera starts
    pushMsg('bot', 'Camera is live. Say “Read calories and macros.”');
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
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3 9a2 2 0 0 1 2-2h.93c.66 0 1.28-.33 1.66-.89l.81-1.22A2 2 0 0 1 10.07 4h3.86c.66 0 1.28.33 1.66.89l.81 1.22c.38.56 1 .89 1.67.89H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
    </svg>
    Start Camera
  `;
  startCameraBtn.classList.remove('btn-danger');
  startCameraBtn.classList.add('btn-primary');
  cameraActive = false;
}

function drawVideoFrame() {
  if (!cameraActive || !ctx) return;
  try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); }
  catch(e){ console.warn('drawImage failed:', e); }
  drawLoopId = requestAnimationFrame(drawVideoFrame);
}
