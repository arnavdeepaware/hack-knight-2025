import { useState, useRef, useCallback, useEffect } from 'react';

interface CameraState {
  isActive: boolean;
  isSupported: boolean;
  error: string | null;
  stream: MediaStream | null;
}

export const useCamera = () => {
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    isSupported: false,
    error: null,
    stream: null,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check if camera is supported
  useEffect(() => {
    const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setCameraState(prev => ({ ...prev, isSupported }));
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
        videoRef.current.play();
      }

      setCameraState(prev => ({
        ...prev,
        isActive: true,
        stream,
        error: null,
      }));
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
      if (!videoRef.current || !canvasRef.current) {
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
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    ...cameraState,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    capturePhotoAsBlob,
  };
};
