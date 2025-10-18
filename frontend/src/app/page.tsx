'use client';

import React, { useState, useCallback } from 'react';
import { CameraView } from '../components/CameraView';
import { AskQuestion } from '../components/AskQuestion';
import { VoiceStatus } from '../components/VoiceStatus';
import { AnalysisResults } from '../components/AnalysisResults';
import { AutoCapture } from '../components/AutoCapture';
import { LiveAnalysis } from '../components/LiveAnalysis';
import { useVoice } from '../hooks/useVoice';
import { useVisionAnalysis } from '../hooks/useVisionAnalysis';
import { useCamera } from '../hooks/useCamera';
import { Eye, Volume2, Settings, HelpCircle } from 'lucide-react';
import PackagedFoodResults from '../components/PackagedFoodResults';

export default function HomePage() {
  const [isAutoCaptureEnabled, setIsAutoCaptureEnabled] = useState(false);
  
  const {
    isConnected: voiceConnected,
    isSpeaking,
    currentMessage,
    error: voiceError,
    testVoice,
    stopSpeaking,
  } = useVoice();

  const {
    isAnalyzing,
    lastAnalysis,
    analysisCount,
    error: analysisError,
    analyzeImage,
    askQuestion,
    analyzeLiveFrame,
    analyzePackagedFood,
    lastPackagedFood,
    clearError,
    resetAnalysis,
  } = useVisionAnalysis();

  const camera = useCamera();

  const handlePhotoCapture = useCallback(async (blob: Blob) => {
    try {
      await analyzeImage(blob);
    } catch (error) {
      console.error('Error analyzing photo:', error);
    }
  }, [analyzeImage]);

  const handleLiveFrameCapture = useCallback(async (blob: Blob) => {
    try {
      await analyzeLiveFrame(blob);
    } catch (error) {
      console.error('Error analyzing live frame:', error);
    }
  }, [analyzeLiveFrame]);

  const handleTestVoice = useCallback(async () => {
    try {
      await testVoice('Hello! This is a test of the voice guidance system. The system is working correctly.');
    } catch (error) {
      console.error('Error testing voice:', error);
    }
  }, [testVoice]);

  const handleStopVoice = useCallback(() => {
    stopSpeaking();
  }, [stopSpeaking]);

  const handleAnalyzePackagedFood = useCallback(async () => {
    try {
      const blob = await camera.capturePhotoAsBlob();
      if (!blob) return;
      await analyzePackagedFood(blob);
    } catch (e) {
      console.error('Error analyzing packaged food:', e);
    }
  }, [camera.capturePhotoAsBlob, analyzePackagedFood]);

  const handleClearError = useCallback(() => {
    clearError();
  }, [clearError]);

  const handleResetAnalysis = useCallback(() => {
    resetAnalysis();
  }, [resetAnalysis]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Blind Assistance</h1>
                <p className="text-sm text-gray-600">AI-Powered Voice Guidance</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Volume2 className="w-4 h-4" />
                <span>Analysis #{analysisCount}</span>
              </div>
              <button
                onClick={handleResetAnalysis}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                title="Reset Analysis"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Camera and Controls */}
          <div className="space-y-6">
            {/* Camera View */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Camera View
                </h2>
              </div>
              <div className="p-4">
                <CameraView
                  camera={camera}
                  onPhotoCapture={handlePhotoCapture}
                  className="h-96"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleAnalyzePackagedFood}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Analyze Packaged Food
                  </button>
                </div>
              </div>
            </div>

            {/* Auto Capture */}
            <AutoCapture
              onPhotoCapture={handlePhotoCapture}
              isAnalyzing={isAnalyzing}
              capturePhoto={camera.capturePhotoAsBlob}
            />

            {/* Live Analysis */}
            <LiveAnalysis
              onFrameCapture={handleLiveFrameCapture}
              isAnalyzing={isAnalyzing}
              camera={camera}
            />
          </div>

          {/* Right Column - Voice and Analysis */}
          <div className="space-y-6">
            <AskQuestion
              camera={camera}
              ask={askQuestion}
            />
            {/* Voice Status */}
            <VoiceStatus
              isConnected={voiceConnected}
              isSpeaking={isSpeaking}
              currentMessage={currentMessage}
              error={voiceError}
              onTestVoice={handleTestVoice}
              onStopVoice={handleStopVoice}
            />

            {/* Analysis Results */}
            <AnalysisResults
              analysis={lastAnalysis}
              isAnalyzing={isAnalyzing}
              analysisCount={analysisCount}
              error={analysisError}
              onClearError={handleClearError}
            />

            {/* Packaged Food Results */}
            <PackagedFoodResults data={lastPackagedFood} isAnalyzing={isAnalyzing} />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <HelpCircle className="w-5 h-5 mr-2" />
            How to Use
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Getting Started</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Click "Start Camera" to begin</li>
                <li>• Allow camera permissions when prompted</li>
                <li>• Position the camera to see your surroundings</li>
                <li>• Click the camera button to capture a photo</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Live Analysis</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Start "Live Analysis" for continuous video processing</li>
                <li>• Adjust analysis interval (1-10 seconds)</li>
                <li>• System automatically throttles to prevent overload</li>
                <li>• Perfect for real-time navigation assistance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Voice Guidance</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All analysis results are spoken automatically</li>
                <li>• Use "Test Voice" to verify audio is working</li>
                <li>• Enable Auto Capture for continuous monitoring</li>
                <li>• Use "Stop Speaking" to pause voice output</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>Built with ❤️ for accessibility at Hack Knight 2025</p>
            <p className="mt-1">Powered by Google Gemini AI and Web Speech API</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
