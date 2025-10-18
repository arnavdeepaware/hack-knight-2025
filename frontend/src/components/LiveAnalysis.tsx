'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Square, Settings, Clock, Eye, EyeOff } from 'lucide-react';
import { useVisionAnalysis } from '../hooks/useVisionAnalysis';

interface LiveAnalysisProps {
  onFrameCapture: (blob: Blob) => void;
  isAnalyzing: boolean;
  camera?: {
    startLiveAnalysis: (callback: (blob: Blob) => void, interval: number) => void;
    stopLiveAnalysis: () => void;
    updateAnalysisInterval: (interval: number) => void;
    isLiveAnalysis: boolean;
    analysisInterval: number;
  };
  className?: string;
}

export const LiveAnalysis: React.FC<LiveAnalysisProps> = ({
  onFrameCapture,
  isAnalyzing,
  camera,
  className = '',
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
  
  const { analyzeImage, lastAnalysis, error } = useVisionAnalysis();
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState(0);

  const startLiveAnalysis = useCallback(() => {
    if (camera) {
      camera.startLiveAnalysis(onFrameCapture, camera.analysisInterval);
      setLastAnalysisTime(new Date());
    }
  }, [camera, onFrameCapture]);

  const stopLiveAnalysis = useCallback(() => {
    if (camera) {
      camera.stopLiveAnalysis();
    }
  }, [camera]);

  const handleIntervalChange = useCallback((newInterval: number) => {
    if (camera) {
      camera.updateAnalysisInterval(newInterval);
    }
  }, [camera]);

  // Update countdown when analysis is triggered
  useEffect(() => {
    if (camera?.isLiveAnalysis && !isAnalyzing) {
      setCountdown(camera.analysisInterval);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setLastAnalysisTime(new Date());
            return camera.analysisInterval;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [camera?.isLiveAnalysis, camera?.analysisInterval, isAnalyzing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveAnalysis();
    };
  }, [stopLiveAnalysis]);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    } else {
      return `${Math.floor(seconds / 3600)}h ago`;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Live Analysis
        </h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${camera?.isLiveAnalysis ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`}></div>
            <span className={`text-sm font-medium ${camera?.isLiveAnalysis ? 'text-green-600' : 'text-gray-600'}`}>
              {camera?.isLiveAnalysis ? 'Analyzing Live' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Countdown */}
        {camera?.isLiveAnalysis && countdown > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 mb-2">
              {countdown}
            </div>
            <p className="text-sm text-gray-600">Next analysis in seconds</p>
          </div>
        )}

        {/* Last Analysis */}
        {lastAnalysisTime && (
          <div className="text-center text-sm text-gray-500">
            Last analysis: {formatTimeAgo(lastAnalysisTime)}
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">
                Analysis Interval (seconds):
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 5, 10].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleIntervalChange(value)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      camera?.analysisInterval === value
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    disabled={camera?.isLiveAnalysis}
                  >
                    {value}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex space-x-3">
          {!camera?.isLiveAnalysis ? (
            <button
              onClick={startLiveAnalysis}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              disabled={isAnalyzing}
            >
              <Play className="w-4 h-4" />
              <span>Start Live Analysis</span>
            </button>
          ) : (
            <button
              onClick={stopLiveAnalysis}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <Pause className="w-4 h-4" />
              <span>Stop Analysis</span>
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p><strong>Live Analysis</strong> continuously analyzes video frames from your camera.</p>
          <p className="mt-1">Adjust the interval to balance responsiveness with API usage.</p>
        </div>
      </div>
    </div>
  );
};
