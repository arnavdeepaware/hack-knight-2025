'use client';

import React from 'react';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

interface CameraApi {
  isActive: boolean;
  isSupported: boolean;
  error: string | null;
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhotoAsBlob: () => Promise<Blob | null>;
}

interface CameraViewProps {
  camera: CameraApi;
  onPhotoCapture?: (blob: Blob) => void;
  className?: string;
}

export const CameraView: React.FC<CameraViewProps> = ({ camera, onPhotoCapture, className = '' }) => {
  const {
    isActive,
    isSupported,
    error,
    stream,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhotoAsBlob,
  } = camera;

  const handleCapture = async () => {
    if (!isActive) return;

    try {
      const blob = await capturePhotoAsBlob();
      if (blob && onPhotoCapture) {
        onPhotoCapture(blob);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  };

  if (!isSupported) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg p-8 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Camera not supported on this device</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`} style={{ minHeight: '300px' }}>
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
        width="100%"
        height="100%"
        style={{ 
          minHeight: '300px',
          opacity: isActive ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          display: isActive ? 'block' : 'none'
        }}
        onLoadedMetadata={() => {
          console.log('Video loaded in CameraView, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
          if (videoRef.current) {
            videoRef.current.style.opacity = '1';
          }
        }}
        onCanPlay={() => {
          console.log('Video can play in CameraView');
          if (videoRef.current) {
            videoRef.current.style.opacity = '1';
          }
        }}
        onPlay={() => {
          console.log('Video is playing');
          if (videoRef.current) {
            videoRef.current.style.opacity = '1';
          }
        }}
      />
      
      {/* Hidden Canvas for Photo Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay when camera is not active */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center text-white">
            <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Camera Ready</p>
            <p className="text-sm opacity-75">Click to start camera</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-75">
          <div className="text-center text-white p-4">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Camera Error</p>
            <p className="text-sm opacity-75">{error}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
        {!isActive ? (
          <button
            onClick={startCamera}
            className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-full font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label="Start camera"
          >
            <Camera className="w-5 h-5" />
            <span>Start Camera</span>
          </button>
        ) : (
          <>
            <button
              onClick={handleCapture}
              className="bg-white hover:bg-gray-100 text-gray-800 p-3 rounded-full shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
              aria-label="Capture photo"
            >
              <Camera className="w-6 h-6" />
            </button>
            <button
              onClick={stopCamera}
              className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Stop camera"
            >
              <CameraOff className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Status Indicator */}
      {isActive && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center space-x-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {isActive && (
        <div className="absolute top-4 left-4">
          <div className="bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
            <div>Stream: {stream ? 'Active' : 'None'}</div>
            <div>Video: {videoRef.current?.readyState || 'Unknown'}</div>
          </div>
        </div>
      )}
    </div>
  );
};
