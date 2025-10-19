// Accessibility enhancements for visually impaired users

document.addEventListener('DOMContentLoaded', () => {
  // Add accessibility stylesheet
  const a11yStyle = document.createElement('style');
  a11yStyle.textContent = `
    /* Voice indicator styles */
    .wake-indicator {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(124, 58, 237, 0.95) 100%);
      color: white;
      padding: 16px 30px;
      border-radius: 12px;
      z-index: 9999;
      font-weight: 600;
      font-size: 16px;
      font-family: 'Inter', sans-serif;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5);
      transition: opacity 0.3s ease, transform 0.3s ease;
      opacity: 0;
      transform: translate(-50%, -20px);
      pointer-events: none;
    }
    
    .wake-indicator.active {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    
    .wake-pulse {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: white;
      animation: pulse 2s infinite;
    }
    
    /* Audio feedback visual indicator */
    .audio-feedback {
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(139, 92, 246, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      pointer-events: none;
      transition: transform 0.2s, opacity 0.2s;
      opacity: 0;
    }
    
    .audio-feedback.active {
      animation: feedbackPulse 0.5s ease;
    }
    
    .audio-feedback.success {
      background: rgba(16, 185, 129, 0.2);
    }
    
    .audio-feedback.error {
      background: rgba(239, 68, 68, 0.2);
    }
    
    @keyframes feedbackPulse {
      0% { transform: scale(0.8); opacity: 0; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 0; }
    }
    
    /* Status announcements for screen readers */
    .sr-announcer {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    
    /* Loading animation during processing */
    .processing-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #6b7280;
      padding: 8px 16px;
      background: #f3f4f6;
      border-radius: 8px;
      margin: 10px 0;
    }
    
    .processing-indicator .dot {
      width: 6px;
      height: 6px;
      background: #8b5cf6;
      border-radius: 50%;
      animation: processingDot 1.4s infinite ease-in-out both;
    }
    
    .processing-indicator .dot:nth-child(1) { animation-delay: -0.32s; }
    .processing-indicator .dot:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes processingDot {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    
    /* Improve focus visibility for keyboard navigation */
    *:focus {
      outline: 3px solid rgba(139, 92, 246, 0.5) !important;
      outline-offset: 2px !important;
    }
    
    /* Set minimum touch target sizes for better accessibility */
    button, 
    [role="button"],
    .clickable {
      min-height: 44px;
      min-width: 44px;
    }
  `;
  
  document.head.appendChild(a11yStyle);
  
  // Create screen reader announcer
  const announcer = document.createElement('div');
  announcer.className = 'sr-announcer';
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(announcer);
  
  // Create audio feedback indicator
  const audioFeedback = document.createElement('div');
  audioFeedback.className = 'audio-feedback';
  document.body.appendChild(audioFeedback);
  
  // Function to announce to screen readers
  window.announceToScreenReader = (message, urgent = false) => {
    announcer.setAttribute('aria-live', urgent ? 'assertive' : 'polite');
    announcer.textContent = message;
    
    // Clear after a few seconds
    setTimeout(() => {
      announcer.textContent = '';
    }, 3000);
  };
  
  // Function to show audio feedback visually
  window.showAudioFeedback = (type) => {
    audioFeedback.className = 'audio-feedback';
    
    if (type === 'SUCCESS') {
      audioFeedback.classList.add('success');
    } else if (type === 'ERROR') {
      audioFeedback.classList.add('error');
    }
    
    audioFeedback.classList.add('active');
    
    // Remove after animation
    setTimeout(() => {
      audioFeedback.classList.remove('active');
    }, 500);
  };
  
  // Enhanced audio feedback
  window.playAudioWithFeedback = (type) => {
    // Play sound
    if (window.playAudioFeedback) {
      window.playAudioFeedback(type);
    }
    
    // Show visual indicator
    window.showAudioFeedback(type);
  };
  
  // Better keyboard navigation support
  document.addEventListener('keydown', (e) => {
    // Escape key closes any modals/overlays
    if (e.key === 'Escape') {
      const overlays = document.querySelectorAll('.modal, .overlay, .emergency-overlay.active');
      if (overlays.length > 0) {
        e.preventDefault();
        overlays.forEach(overlay => {
          const closeBtn = overlay.querySelector('[aria-label="Close"], .close, .btn-close-emergency');
          if (closeBtn) {
            closeBtn.click();
          }
        });
      }
    }
    
    // Tab key - make sure focus is visible
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
  });
  
  // Mouse use - remove keyboard navigation style
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
  });
  
  // Log initialization
  console.log('Accessibility enhancements loaded');
});
