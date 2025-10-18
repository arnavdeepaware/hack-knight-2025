'use client';

import React, { useState, useEffect } from 'react';
import { Send, HelpCircle, Mic, MicOff, Volume2 } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface CameraApiMinimal {
  capturePhotoAsBlob: () => Promise<Blob | null>;
  isActive: boolean;
}

interface AskQuestionProps {
  camera: CameraApiMinimal;
  ask: (image: Blob, question: string) => Promise<string>;
  onAnswer?: (answer: string) => void;
  className?: string;
}

export const AskQuestion: React.FC<AskQuestionProps> = ({ camera, ask, onAnswer, className = '' }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Define handleVoiceComplete before using it in the hook
  const handleVoiceComplete = async (finalTranscript: string) => {
    if (finalTranscript.trim()) {
      setQuestion(finalTranscript);
      // Small delay to ensure voice recognition has fully completed
      setTimeout(async () => {
        await handleAskWithQuestion(finalTranscript);
      }, 500);
    }
  };

  const handleAskWithQuestion = async (questionText: string) => {
    if (!questionText.trim()) return;
    setIsLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const blob = await camera.capturePhotoAsBlob();
      if (!blob) {
        setError('Could not capture current frame. Start the camera first.');
        setIsLoading(false);
        return;
      }
      const resp = await ask(blob, questionText.trim());
      setAnswer(resp);
      onAnswer?.(resp);
    } catch (e: any) {
      setError(e?.message || 'Failed to get answer');
    } finally {
      setIsLoading(false);
    }
  };
  
  const {
    isListening,
    isSupported,
    transcript,
    error: voiceError,
    startListening,
    stopListening,
    clearTranscript,
    clearError: clearVoiceError,
  } = useVoiceInput(handleVoiceComplete);

  // Update question when transcript changes
  useEffect(() => {
    if (transcript) {
      setQuestion(transcript);
    }
  }, [transcript]);

  // Clear errors when starting new interaction
  useEffect(() => {
    if (isListening) {
      setError(null);
      clearVoiceError();
    }
  }, [isListening, clearVoiceError]);

  const handleAsk = async () => {
    await handleAskWithQuestion(question);
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      clearTranscript();
      startListening();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <HelpCircle className="w-5 h-5 mr-2" />
        Ask About Food & Products
      </h3>

      <div className="space-y-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about food items, prices, ingredients, or store layout..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isLoading || isListening}
          />
          <button
            onClick={handleVoiceToggle}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 ${
              isListening
                ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
            }`}
            disabled={!isSupported || isLoading}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isListening ? 'Stop' : 'Voice'}</span>
          </button>
          <button
            onClick={handleAsk}
            className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60"
            disabled={isLoading || !camera.isActive || !question.trim()}
            aria-label="Ask question about current frame"
          >
            <Send className="w-4 h-4" />
            <span>Ask</span>
          </button>
        </div>

        {/* Voice input status */}
        {isListening && (
          <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span>Listening... Speak your question now</span>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
            <Volume2 className="w-4 h-4 animate-spin" />
            <span>Processing your question and analyzing the image...</span>
          </div>
        )}

        {!isSupported && (
          <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
            Voice input is not supported in this browser. Please type your question instead.
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-400 text-sm text-red-700">
          {error}
        </div>
      )}

      {voiceError && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-400 text-sm text-red-700">
          <div className="flex items-center justify-between">
            <span>{voiceError}</span>
            <button
              onClick={clearVoiceError}
              className="text-red-500 hover:text-red-700 ml-2"
              aria-label="Clear voice error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {answer && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
          <p className="text-sm text-blue-800 font-medium">Answer:</p>
          <p className="text-blue-700 mt-1">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default AskQuestion;


