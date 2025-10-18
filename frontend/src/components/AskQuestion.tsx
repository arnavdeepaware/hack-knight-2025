'use client';

import React, { useState } from 'react';
import { Send, HelpCircle } from 'lucide-react';

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

  const handleAsk = async () => {
    if (!question.trim()) return;
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
      const resp = await ask(blob, question.trim());
      setAnswer(resp);
      onAnswer?.(resp);
    } catch (e: any) {
      setError(e?.message || 'Failed to get answer');
    } finally {
      setIsLoading(false);
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
        Ask About What You See
      </h3>

      <div className="flex space-x-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question about the current view..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={isLoading}
        />
        <button
          onClick={handleAsk}
          className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60"
          disabled={isLoading || !camera.isActive}
          aria-label="Ask question about current frame"
        >
          <Send className="w-4 h-4" />
          <span>Ask</span>
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-400 text-sm text-red-700">
          {error}
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


