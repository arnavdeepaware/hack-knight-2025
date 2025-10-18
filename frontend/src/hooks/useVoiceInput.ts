'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface VoiceInputState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  isProcessing: boolean;
  finalTranscript: string;
}

export const useVoiceInput = (onVoiceComplete?: (transcript: string) => void) => {
  const [voiceState, setVoiceState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    error: null,
    isProcessing: false,
    finalTranscript: '',
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setVoiceState(prev => ({
        ...prev,
        isSupported: !!SpeechRecognition,
      }));
    }
  }, []);

  const startListening = useCallback(() => {
    if (!voiceState.isSupported) {
      setVoiceState(prev => ({
        ...prev,
        error: 'Speech recognition is not supported in this browser',
      }));
      return;
    }

    if (voiceState.isListening) {
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState(prev => ({
          ...prev,
          isListening: true,
          error: null,
          transcript: '',
        }));
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setVoiceState(prev => ({
          ...prev,
          transcript: finalTranscript || interimTranscript,
          finalTranscript: finalTranscript || prev.finalTranscript,
        }));
      };

      recognition.onend = () => {
        setVoiceState(prev => {
          // If we have a final transcript, trigger the callback
          if (prev.finalTranscript.trim() && onVoiceComplete) {
            onVoiceComplete(prev.finalTranscript.trim());
          }
          
          return {
            ...prev,
            isListening: false,
            isProcessing: false,
          };
        });
      };

      recognition.onerror = (event) => {
        let errorMessage = 'Speech recognition error occurred';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found. Please check your microphone.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error occurred. Please check your connection.';
            break;
          case 'aborted':
            errorMessage = 'Speech recognition was aborted.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }

        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
          error: errorMessage,
        }));
      };

      recognitionRef.current = recognition;
      recognition.start();

      // Set a timeout to stop listening after 10 seconds
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 10000);

    } catch (error) {
      setVoiceState(prev => ({
        ...prev,
        error: 'Failed to start speech recognition',
        isListening: false,
        isProcessing: false,
      }));
    }
  }, [voiceState.isSupported, voiceState.isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && voiceState.isListening) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [voiceState.isListening]);

  const clearTranscript = useCallback(() => {
    setVoiceState(prev => ({
      ...prev,
      transcript: '',
      finalTranscript: '',
      error: null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setVoiceState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...voiceState,
    startListening,
    stopListening,
    clearTranscript,
    clearError,
  };
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
