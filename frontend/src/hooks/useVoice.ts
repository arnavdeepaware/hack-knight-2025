import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceMessage {
  type: 'description' | 'navigation' | 'objects' | 'error' | 'connected' | 'status';
  content: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

interface VoiceState {
  isConnected: boolean;
  isSpeaking: boolean;
  currentMessage: string | null;
  messageHistory: VoiceMessage[];
  error: string | null;
}

export const useVoice = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isConnected: false,
    isSpeaking: false,
    currentMessage: null,
    messageHistory: [],
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const speechSynthesis = useRef<SpeechSynthesis | null>(null);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynthesis.current = window.speechSynthesis;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      console.log('Attempting to connect to WebSocket...');
      const ws = new WebSocket('ws://localhost:3001/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setVoiceState(prev => ({
          ...prev,
          isConnected: true,
          error: null,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: VoiceMessage = JSON.parse(event.data);
          console.log('Received voice message:', message);
          
          setVoiceState(prev => ({
            ...prev,
            messageHistory: [...prev.messageHistory.slice(-9), message], // Keep last 10 messages
          }));

          // Handle different message types
          switch (message.type) {
            case 'connected':
              console.log('Voice service connected');
              break;
            case 'description':
            case 'navigation':
            case 'objects':
            case 'error':
              speakMessage(message.content);
              break;
            case 'status':
              console.log('Voice status:', message);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setVoiceState(prev => ({
          ...prev,
          isConnected: false,
        }));
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setVoiceState(prev => ({
          ...prev,
          error: 'Failed to connect to voice service',
          isConnected: false,
        }));
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setVoiceState(prev => ({
        ...prev,
        error: 'Failed to create WebSocket connection',
        isConnected: false,
      }));
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setVoiceState(prev => ({
      ...prev,
      isConnected: false,
    }));
  }, []);

  const speakMessage = useCallback((text: string) => {
    if (!speechSynthesis.current) {
      console.error('Speech synthesis not available');
      return;
    }

    // Stop any current speech
    if (currentUtterance.current) {
      speechSynthesis.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance.current = utterance;

    utterance.onstart = () => {
      setVoiceState(prev => ({
        ...prev,
        isSpeaking: true,
        currentMessage: text,
      }));
    };

    utterance.onend = () => {
      setVoiceState(prev => ({
        ...prev,
        isSpeaking: false,
        currentMessage: null,
      }));
      currentUtterance.current = null;
    };

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      setVoiceState(prev => ({
        ...prev,
        isSpeaking: false,
        currentMessage: null,
        error: 'Speech synthesis failed',
      }));
      currentUtterance.current = null;
    };

    // Configure voice settings
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a more natural voice
    const voices = speechSynthesis.current.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && 
      (voice.name.includes('Google') || voice.name.includes('Microsoft'))
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    speechSynthesis.current.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (speechSynthesis.current) {
      speechSynthesis.current.cancel();
    }
    setVoiceState(prev => ({
      ...prev,
      isSpeaking: false,
      currentMessage: null,
    }));
    currentUtterance.current = null;
  }, []);

  const testVoice = useCallback((message: string) => {
    speakMessage(message);
  }, [speakMessage]);

  // Auto-connect on mount
  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnectWebSocket();
      stopSpeaking();
    };
  }, [connectWebSocket, disconnectWebSocket, stopSpeaking]);

  return {
    ...voiceState,
    connectWebSocket,
    disconnectWebSocket,
    speakMessage,
    stopSpeaking,
    testVoice,
  };
};
