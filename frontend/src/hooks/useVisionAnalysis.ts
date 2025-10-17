import { useState, useCallback } from 'react';
import axios from 'axios';

interface AnalysisResult {
  description: string;
  navigation: string;
  objects: string;
}

interface VisionState {
  isAnalyzing: boolean;
  lastAnalysis: AnalysisResult | null;
  error: string | null;
  analysisCount: number;
}

const API_BASE_URL = 'http://localhost:3001/api/vision';

export const useVisionAnalysis = () => {
  const [visionState, setVisionState] = useState<VisionState>({
    isAnalyzing: false,
    lastAnalysis: null,
    error: null,
    analysisCount: 0,
  });

  const analyzeImage = useCallback(async (imageBlob: Blob) => {
    try {
      setVisionState(prev => ({
        ...prev,
        isAnalyzing: true,
        error: null,
      }));

      const formData = new FormData();
      formData.append('image', imageBlob, 'camera-capture.jpg');

      const response = await axios.post(`${API_BASE_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      const analysis: AnalysisResult = response.data.analysis;

      setVisionState(prev => ({
        ...prev,
        isAnalyzing: false,
        lastAnalysis: analysis,
        analysisCount: prev.analysisCount + 1,
        error: null,
      }));

      return analysis;
    } catch (error) {
      console.error('Error analyzing image:', error);
      
      let errorMessage = 'Failed to analyze image';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 413) {
          errorMessage = 'Image too large. Please try again.';
        } else if (error.response?.status === 400) {
          errorMessage = 'Invalid image format. Please try again.';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Analysis timed out. Please try again.';
        } else if (error.code === 'ERR_NETWORK') {
          errorMessage = 'Network error. Please check your connection.';
        }
      }

      setVisionState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: errorMessage,
      }));

      throw new Error(errorMessage);
    }
  }, []);

  const testVoice = useCallback(async (message: string) => {
    try {
      await axios.post(`${API_BASE_URL}/voice/test`, { message });
    } catch (error) {
      console.error('Error testing voice:', error);
      throw new Error('Failed to test voice');
    }
  }, []);

  const getVoiceStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/voice/status`);
      return response.data.status;
    } catch (error) {
      console.error('Error getting voice status:', error);
      return null;
    }
  }, []);

  const stopVoice = useCallback(async () => {
    try {
      await axios.post(`${API_BASE_URL}/voice/stop`);
    } catch (error) {
      console.error('Error stopping voice:', error);
      throw new Error('Failed to stop voice');
    }
  }, []);

  const clearError = useCallback(() => {
    setVisionState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const resetAnalysis = useCallback(() => {
    setVisionState({
      isAnalyzing: false,
      lastAnalysis: null,
      error: null,
      analysisCount: 0,
    });
  }, []);

  return {
    ...visionState,
    analyzeImage,
    testVoice,
    getVoiceStatus,
    stopVoice,
    clearError,
    resetAnalysis,
  };
};
