'use client';

import React from 'react';
import { Eye, Navigation, Package, Clock, AlertCircle } from 'lucide-react';

interface AnalysisResult {
  description: string;
  navigation: string;
  objects: string;
}

interface AnalysisResultsProps {
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
  analysisCount: number;
  error: string | null;
  onClearError?: () => void;
  className?: string;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysis,
  isAnalyzing,
  analysisCount,
  error,
  onClearError,
  className = '',
}) => {
  if (isAnalyzing) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-700">Analyzing image...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Analysis Error</h3>
            <p className="text-red-700 mb-4">{error}</p>
            {onClearError && (
              <button
                onClick={onClearError}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Clear Error
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-600 mb-2">No Analysis Yet</p>
          <p className="text-sm text-gray-500">Capture a photo to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Analysis Results</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Analysis #{analysisCount}</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Description */}
        <div className="border-l-4 border-blue-400 pl-4">
          <div className="flex items-center space-x-2 mb-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-800">Scene Description</h4>
          </div>
          <p className="text-gray-700 leading-relaxed">{analysis.description}</p>
        </div>

        {/* Navigation */}
        <div className="border-l-4 border-green-400 pl-4">
          <div className="flex items-center space-x-2 mb-2">
            <Navigation className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-800">Navigation Guidance</h4>
          </div>
          <p className="text-gray-700 leading-relaxed">{analysis.navigation}</p>
        </div>

        {/* Objects */}
        <div className="border-l-4 border-purple-400 pl-4">
          <div className="flex items-center space-x-2 mb-2">
            <Package className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-gray-800">Objects Identified</h4>
          </div>
          <p className="text-gray-700 leading-relaxed">{analysis.objects}</p>
        </div>
      </div>

      {/* Accessibility Note */}
      <div className="mt-6 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> All analysis results are automatically spoken through voice guidance. 
          You can also use the test voice feature to repeat any information.
        </p>
      </div>
    </div>
  );
};
