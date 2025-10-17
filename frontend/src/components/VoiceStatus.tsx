'use client';

import React from 'react';
import { Volume2, VolumeX, Wifi, WifiOff, Mic, MicOff } from 'lucide-react';

interface VoiceStatusProps {
  isConnected: boolean;
  isSpeaking: boolean;
  currentMessage: string | null;
  error: string | null;
  onTestVoice?: () => void;
  onStopVoice?: () => void;
  className?: string;
}

export const VoiceStatus: React.FC<VoiceStatusProps> = ({
  isConnected,
  isSpeaking,
  currentMessage,
  error,
  onTestVoice,
  onStopVoice,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Volume2 className="w-5 h-5 mr-2" />
        Voice Guidance Status
      </h3>

      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          <span className={`font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {isSpeaking && (
          <div className="flex items-center space-x-2 text-blue-600">
            <Mic className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Speaking...</span>
          </div>
        )}
      </div>

      {/* Current Message */}
      {currentMessage && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
          <p className="text-sm text-blue-800 font-medium">Currently saying:</p>
          <p className="text-blue-700 mt-1">{currentMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
          <p className="text-sm text-red-800 font-medium">Error:</p>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex space-x-3">
        {onTestVoice && (
          <button
            onClick={onTestVoice}
            className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            disabled={!isConnected}
          >
            <Volume2 className="w-4 h-4" />
            <span>Test Voice</span>
          </button>
        )}
        
        {onStopVoice && (
          <button
            onClick={onStopVoice}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            disabled={!isSpeaking}
          >
            <VolumeX className="w-4 h-4" />
            <span>Stop Speaking</span>
          </button>
        )}
      </div>

      {/* Status Indicators */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Connection:</span>
          <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Voice:</span>
          <span className={`font-medium ${isSpeaking ? 'text-blue-600' : 'text-gray-600'}`}>
            {isSpeaking ? 'Speaking' : 'Idle'}
          </span>
        </div>
      </div>
    </div>
  );
};
