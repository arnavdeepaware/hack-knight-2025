'use client';

import React, { useState, useCallback } from 'react';
import { CameraView } from '../components/CameraView';
import { AskQuestion } from '../components/AskQuestion';
import { VoiceStatus } from '../components/VoiceStatus';
import { AnalysisResults } from '../components/AnalysisResults';
import { useVoice } from '../hooks/useVoice';
import { useVisionAnalysis } from '../hooks/useVisionAnalysis';
import { useCamera } from '../hooks/useCamera';
import { Eye, Volume2, Settings, HelpCircle } from 'lucide-react';
import PackagedFoodResults from '../components/PackagedFoodResults';

export default function HomePage() {
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
    analyzePackagedFood,
    analyzeProduce,
    analyzeStoreSection,
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

  const handleAnalyzeProduce = useCallback(async () => {
    try {
      const blob = await camera.capturePhotoAsBlob();
      if (!blob) return;
      await analyzeProduce(blob);
    } catch (e) {
      console.error('Error analyzing produce:', e);
    }
  }, [camera.capturePhotoAsBlob, analyzeProduce]);

  const handleAnalyzeStoreSection = useCallback(async () => {
    try {
      const blob = await camera.capturePhotoAsBlob();
      if (!blob) return;
      await analyzeStoreSection(blob);
    } catch (e) {
      console.error('Error analyzing store section:', e);
    }
  }, [camera.capturePhotoAsBlob, analyzeStoreSection]);

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
                <h1 className="text-xl font-bold text-gray-900">Grocery Shopping Assistant</h1>
                <p className="text-sm text-gray-600">AI-Powered Food Shopping Support</p>
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
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={handleAnalyzePackagedFood}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Analyze Packaged Food
                  </button>
                  <button
                    onClick={handleAnalyzeProduce}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Analyze Fresh Produce
                  </button>
                  <button
                    onClick={handleAnalyzeStoreSection}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Analyze Store Section
                  </button>
                </div>
              </div>
            </div>

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
                <li>• Point camera at food items or store sections</li>
                <li>• Click the camera button to capture a photo</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Ask About Food</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Click "Voice" button and speak your question</li>
                <li>• Questions are asked automatically when you finish speaking</li>
                <li>• Ask "What fruits do you see?"</li>
                <li>• Ask "What's the price of this item?"</li>
                <li>• Ask "What are the ingredients?"</li>
                <li>• Ask "Is this fresh?" or "What's the expiration date?"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Product Analysis</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use "Analyze Packaged Food" for nutrition labels</li>
                <li>• Get brand, ingredients, and nutrition facts</li>
                <li>• Voice responses provided automatically</li>
                <li>• Perfect for reading small product labels</li>
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
