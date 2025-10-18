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
  lastPackagedFood: PackagedFoodResult | null;
}

const API_BASE_URL = 'http://localhost:3001/api/vision';

// Types aligned with backend for packaged food
export interface NutritionFacts {
  calories?: string | number | null;
  servingSize?: string | null;
  fat?: string | null;
  saturatedFat?: string | null;
  transFat?: string | null;
  cholesterol?: string | null;
  sodium?: string | null;
  carbohydrates?: string | null;
  fiber?: string | null;
  sugars?: string | null;
  addedSugars?: string | null;
  protein?: string | null;
}

export interface PackagedFoodResult {
  status: 'ok' | 'uncertain' | 'not_visible';
  product: {
    brand: string | null;
    item: string | null;
    quantity: string | null;
    ingredients: string[] | null;
  };
  nutritionFacts?: NutritionFacts | null;
  notes?: string | null;
}

export const useVisionAnalysis = () => {
  const [visionState, setVisionState] = useState<VisionState>({
    isAnalyzing: false,
    lastAnalysis: null,
    error: null,
    analysisCount: 0,
    lastPackagedFood: null,
  });

  const analyzeImage = useCallback(async (imageBlob: Blob) => {
    try {
      console.log('Starting image analysis, blob size:', imageBlob.size);
      setVisionState(prev => ({
        ...prev,
        isAnalyzing: true,
        error: null,
      }));

      const formData = new FormData();
      formData.append('image', imageBlob, 'camera-capture.jpg');
      console.log('Sending request to backend:', `${API_BASE_URL}/analyze`);

      const response = await axios.post(`${API_BASE_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      const analysis: AnalysisResult = response.data.analysis;
      console.log('Received analysis from backend:', analysis);

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

  const askQuestion = useCallback(async (imageBlob: Blob, question: string) => {
    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'camera-capture.jpg');
      formData.append('question', question);

      const response = await axios.post(`${API_BASE_URL}/ask`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      const answer: string = response.data.answer;
      return answer;
    } catch (error) {
      console.error('Error asking question:', error);
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to ask question');
    }
  }, []);

  const analyzeLiveFrame = useCallback(async (imageBlob: Blob) => {
    try {
      console.log('Starting live frame analysis, blob size:', imageBlob.size);
      setVisionState(prev => ({
        ...prev,
        isAnalyzing: true,
        error: null,
      }));

      const formData = new FormData();
      formData.append('image', imageBlob, 'live-frame.jpg');
      console.log('Sending live frame to backend:', `${API_BASE_URL}/live`);

      const response = await axios.post(`${API_BASE_URL}/live`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 15000, // Shorter timeout for live analysis
      });

      const analysis: AnalysisResult = {
        description: response.data.analysis.description,
        navigation: '', // Live mode only provides description
        objects: ''
      };
      console.log('Received live analysis from backend:', analysis);

      setVisionState(prev => ({
        ...prev,
        isAnalyzing: false,
        lastAnalysis: analysis,
        analysisCount: prev.analysisCount + 1,
        error: null,
      }));

      return analysis;
    } catch (error) {
      console.error('Error analyzing live frame:', error);
      
      let errorMessage = 'Failed to analyze live frame';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          // Throttled - don't show error, just skip this frame
          console.log('Live analysis throttled, skipping frame');
          setVisionState(prev => ({
            ...prev,
            isAnalyzing: false,
            error: null,
          }));
          return null;
        } else if (error.response?.status === 413) {
          errorMessage = 'Image too large for live analysis.';
        } else if (error.response?.status === 400) {
          errorMessage = 'Invalid image format for live analysis.';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Live analysis timed out.';
        } else if (error.code === 'ERR_NETWORK') {
          errorMessage = 'Network error during live analysis.';
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

  // Analyze Packaged Food
  const analyzePackagedFood = useCallback(async (imageBlob: Blob) => {
    try {
      setVisionState(prev => ({ ...prev, isAnalyzing: true, error: null }));

      const formData = new FormData();
      formData.append('image', imageBlob, 'packaged-food.jpg');

      const response = await axios.post(`${API_BASE_URL}/packaged-food`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      const result: PackagedFoodResult = response.data;
      setVisionState(prev => ({
        ...prev,
        isAnalyzing: false,
        lastPackagedFood: result,
        error: null,
      }));

      return result;
    } catch (error) {
      console.error('Error analyzing packaged food:', error);
      let errorMessage = 'Could not extract packaged food info';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 413) errorMessage = 'Image too large.';
        else if (error.response?.status === 400) errorMessage = 'Invalid image.';
        else if (error.code === 'ECONNABORTED') errorMessage = 'Request timed out.';
        else if (error.code === 'ERR_NETWORK') errorMessage = 'Network error.';
      }
      setVisionState(prev => ({ ...prev, isAnalyzing: false, error: errorMessage }));
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

  // Analyze Produce
  const analyzeProduce = useCallback(async (imageBlob: Blob) => {
    try {
      setVisionState(prev => ({ ...prev, isAnalyzing: true, error: null }));

      const formData = new FormData();
      formData.append('image', imageBlob, 'produce.jpg');

      const response = await axios.post(`${API_BASE_URL}/produce`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      const analysis = response.data.analysis;
      setVisionState(prev => ({
        ...prev,
        isAnalyzing: false,
        lastAnalysis: { description: analysis, navigation: '', objects: '' },
        error: null,
      }));

      return analysis;
    } catch (error) {
      console.error('Error analyzing produce:', error);
      let errorMessage = 'Could not analyze produce';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 413) errorMessage = 'Image too large.';
        else if (error.response?.status === 400) errorMessage = 'Invalid image.';
        else if (error.code === 'ECONNABORTED') errorMessage = 'Request timed out.';
        else if (error.code === 'ERR_NETWORK') errorMessage = 'Network error.';
      }
      setVisionState(prev => ({ ...prev, isAnalyzing: false, error: errorMessage }));
      throw new Error(errorMessage);
    }
  }, []);

  // Analyze Store Section
  const analyzeStoreSection = useCallback(async (imageBlob: Blob) => {
    try {
      setVisionState(prev => ({ ...prev, isAnalyzing: true, error: null }));

      const formData = new FormData();
      formData.append('image', imageBlob, 'store-section.jpg');

      const response = await axios.post(`${API_BASE_URL}/store-section`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      const analysis = response.data.analysis;
      setVisionState(prev => ({
        ...prev,
        isAnalyzing: false,
        lastAnalysis: { description: analysis, navigation: '', objects: '' },
        error: null,
      }));

      return analysis;
    } catch (error) {
      console.error('Error analyzing store section:', error);
      let errorMessage = 'Could not analyze store section';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 413) errorMessage = 'Image too large.';
        else if (error.response?.status === 400) errorMessage = 'Invalid image.';
        else if (error.code === 'ECONNABORTED') errorMessage = 'Request timed out.';
        else if (error.code === 'ERR_NETWORK') errorMessage = 'Network error.';
      }
      setVisionState(prev => ({ ...prev, isAnalyzing: false, error: errorMessage }));
      throw new Error(errorMessage);
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
      lastPackagedFood: null,
    });
  }, []);

  return {
    ...visionState,
    analyzeImage,
    askQuestion,
    analyzeLiveFrame,
    analyzePackagedFood,
    analyzeProduce,
    analyzeStoreSection,
    testVoice,
    getVoiceStatus,
    stopVoice,
    clearError,
    resetAnalysis,
  };
};
