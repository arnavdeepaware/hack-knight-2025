import { useState, useRef, useCallback, useEffect } from 'react';

interface CameraState {
  isActive: boolean;
  isSupported: boolean;
  error: string | null;
  stream: MediaStream | null;
  isLiveAnalysis: boolean;
  analysisInterval: number;
}

export const useCamera = () => {
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    isSupported: false,
    error: null,
    stream: null,
    isLiveAnalysis: false,
  analysisInterval: 6.5, // seconds
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveAnalysisRef = useRef<NodeJS.Timeout | null>(null);
  const onFrameCaptureRef = useRef<((blob: Blob) => void) | null>(null);

  // Check if camera is supported
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        console.log('Checking camera support...');
        console.log('isSecureContext:', window.isSecureContext);
        console.log('navigator.mediaDevices:', !!navigator.mediaDevices);
        console.log('getUserMedia:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));

        // Check if we're in a secure context (required for camera access)
        if (!window.isSecureContext) {
          console.warn('Camera access requires HTTPS or localhost');
          setCameraState(prev => ({ ...prev, isSupported: false, error: 'Camera access requires HTTPS or localhost' }));
          return;
        }

        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('getUserMedia not supported');
          setCameraState(prev => ({ ...prev, isSupported: false, error: 'Camera not supported on this device' }));
          return;
        }

        // Try to enumerate devices to check if camera is available
        console.log('Enumerating devices...');
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('Available devices:', devices.length);
        const hasVideoDevice = devices.some(device => device.kind === 'videoinput');
        console.log('Has video device:', hasVideoDevice);
        
        if (!hasVideoDevice) {
          console.warn('No video input devices found');
          setCameraState(prev => ({ ...prev, isSupported: false, error: 'No camera found on this device' }));
          return;
        }

        console.log('Camera support detected');
        setCameraState(prev => ({ ...prev, isSupported: true, error: null }));
      } catch (error) {
        console.error('Error checking camera support:', error);
        setCameraState(prev => ({ ...prev, isSupported: false, error: 'Error checking camera support: ' + error.message }));
      }
    };

    // Add a small delay to ensure the page is fully loaded
    setTimeout(checkCameraSupport, 100);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraState(prev => ({ ...prev, error: null }));

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user', // Front camera
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for the video to be ready before playing
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            console.log('Video metadata loaded, dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            videoRef.current.style.display = 'block';
            videoRef.current.style.opacity = '1';
            videoRef.current.play().catch((error) => {
              console.error('Error playing video:', error);
            });
          }
        };

        videoRef.current.oncanplay = () => {
          console.log('Video can play, should be visible now');
          // Force visibility
          if (videoRef.current) {
            videoRef.current.style.opacity = '1';
            videoRef.current.style.display = 'block';
          }
        };

        videoRef.current.onplay = () => {
          console.log('Video is now playing');
          if (videoRef.current) {
            videoRef.current.style.opacity = '1';
            videoRef.current.style.display = 'block';
          }
        };

        videoRef.current.onerror = (error) => {
          console.error('Video element error:', error);
        };
      }

      setCameraState(prev => ({
        ...prev,
        isActive: true,
        stream,
        error: null,
      }));

      // Fallback: Force visibility after a short delay
      setTimeout(() => {
        if (videoRef.current && stream) {
          console.log('Fallback: Forcing video visibility');
          videoRef.current.style.opacity = '1';
          videoRef.current.style.display = 'block';
          videoRef.current.play().catch(console.error);
        }
      }, 1000);
    } catch (error) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Failed to access camera';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera permissions.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.';
        }
      }

      setCameraState(prev => ({
        ...prev,
        error: errorMessage,
        isActive: false,
        stream: null,
      }));
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraState.stream) {
      cameraState.stream.getTracks().forEach(track => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraState(prev => ({
      ...prev,
      isActive: false,
      stream: null,
      error: null,
    }));
  }, [cameraState.stream]);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const capturePhotoAsBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      console.log('Attempting to capture photo...');
      if (!videoRef.current || !canvasRef.current) {
        console.log('Missing video or canvas ref');
        resolve(null);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        resolve(null);
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob((blob) => {
        console.log('Photo captured, blob size:', blob?.size || 0);
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  }, []);

  const startLiveAnalysis = useCallback((onFrameCapture: (blob: Blob) => void, interval: number = 6.5) => {
    if (!cameraState.isActive || cameraState.isLiveAnalysis) {
      return;
    }

    onFrameCaptureRef.current = onFrameCapture;
    
    setCameraState(prev => ({
      ...prev,
      isLiveAnalysis: true,
      analysisInterval: interval,
    }));

    const captureFrame = async () => {
      if (!cameraState.isActive || !onFrameCaptureRef.current) {
        return;
      }

      try {
        const blob = await capturePhotoAsBlob();
        if (blob) {
          onFrameCaptureRef.current(blob);
        }
      } catch (error) {
        console.error('Error capturing frame for live analysis:', error);
      }
    };

    // Capture immediately
    captureFrame();

    // Set up interval for continuous capture
  liveAnalysisRef.current = setInterval(captureFrame, interval * 1000);
  }, [cameraState.isActive, cameraState.isLiveAnalysis, capturePhotoAsBlob]);

  const stopLiveAnalysis = useCallback(() => {
    if (liveAnalysisRef.current) {
      clearInterval(liveAnalysisRef.current);
      liveAnalysisRef.current = null;
    }

    onFrameCaptureRef.current = null;

    setCameraState(prev => ({
      ...prev,
      isLiveAnalysis: false,
    }));
  }, []);

  const updateAnalysisInterval = useCallback((newInterval: number) => {
    setCameraState(prev => {
      const wasActive = prev.isLiveAnalysis;
      
      // Stop current interval if active
      if (wasActive && liveAnalysisRef.current) {
        clearInterval(liveAnalysisRef.current);
        liveAnalysisRef.current = null;
      }

      // Update interval
      const newState = {
        ...prev,
        analysisInterval: newInterval,
      };

      // Restart with new interval if was active
      if (wasActive && onFrameCaptureRef.current) {
        setTimeout(() => {
          const captureFrame = async () => {
            if (!onFrameCaptureRef.current) return;
            try {
              const blob = await capturePhotoAsBlob();
              if (blob) {
                onFrameCaptureRef.current(blob);
              }
            } catch (error) {
              console.error('Error capturing frame for live analysis:', error);
            }
          };

          captureFrame();
          liveAnalysisRef.current = setInterval(captureFrame, newInterval * 1000);
        }, 100);
      }

      return newState;
    });
  }, [capturePhotoAsBlob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up intervals
      if (liveAnalysisRef.current) {
        clearInterval(liveAnalysisRef.current);
      }
      
      // Stop camera stream
      if (cameraState.stream) {
        cameraState.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  return {
    ...cameraState,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    capturePhotoAsBlob,
    startLiveAnalysis,
    stopLiveAnalysis,
    updateAnalysisInterval,
  };
};
