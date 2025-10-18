'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Settings, Clock } from 'lucide-react';

interface AutoCaptureProps {
  onPhotoCapture: (blob: Blob) => void;
  isAnalyzing: boolean;
  capturePhoto?: () => Promise<Blob | null>;
  className?: string;
}

export const AutoCapture: React.FC<AutoCaptureProps> = ({
  onPhotoCapture,
  isAnalyzing,
  capturePhoto,
  className = '',
}) => {
  const [isActive, setIsActive] = useState(false);
  const [interval, setInterval] = useState(5); // seconds
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoCapture = () => {
    setIsActive(true);
    setCountdown(interval);
  };

  const stopAutoCapture = () => {
    setIsActive(false);
    setCountdown(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const handleIntervalChange = (newInterval: number) => {
    setInterval(newInterval);
    if (isActive) {
      stopAutoCapture();
      startAutoCapture();
    }
  };

  // Auto capture logic
  useEffect(() => {
    if (isActive && !isAnalyzing) {
      if (countdown > 0) {
        countdownRef.current = setTimeout(() => {
          setCountdown(countdown - 1);
        }, 1000);
      } else {
        // Trigger photo capture
        console.log('Auto-capture triggered');
        if (capturePhoto) {
          capturePhoto().then((blob) => {
            if (blob && onPhotoCapture) {
              onPhotoCapture(blob);
            }
          }).catch((error) => {
            console.error('Error capturing photo for auto-capture:', error);
          });
        }
        setCountdown(interval);
      }
    }

    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [isActive, countdown, interval, isAnalyzing, onPhotoCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoCapture();
    };
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2" />
        Auto Capture
      </h3>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`}></div>
            <span className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-gray-600'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Countdown */}
        {isActive && countdown > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 mb-2">
              {countdown}
            </div>
            <p className="text-sm text-gray-600">Next capture in seconds</p>
          </div>
        )}

        {/* Interval Settings */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">
            Capture Interval (seconds):
          </label>
          <div className="flex space-x-2">
            {[3, 5, 10, 15, 30].map((value) => (
              <button
                key={value}
                onClick={() => handleIntervalChange(value)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  interval === value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={isActive}
              >
                {value}s
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex space-x-3">
          {!isActive ? (
            <button
              onClick={startAutoCapture}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              disabled={isAnalyzing}
            >
              <Play className="w-4 h-4" />
              <span>Start Auto Capture</span>
            </button>
          ) : (
            <button
              onClick={stopAutoCapture}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <Pause className="w-4 h-4" />
              <span>Stop Auto Capture</span>
            </button>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p><strong>Auto Capture</strong> automatically takes photos at the specified interval.</p>
          <p className="mt-1">It pauses during analysis to avoid overwhelming the system.</p>
        </div>
      </div>
    </div>
  );
};
