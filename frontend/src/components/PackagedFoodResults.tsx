"use client";

import React from 'react';
import type { PackagedFoodResult } from '../hooks/useVisionAnalysis';

interface Props {
  data: PackagedFoodResult | null;
  isAnalyzing?: boolean;
}

export const PackagedFoodResults: React.FC<Props> = ({ data, isAnalyzing }) => {
  if (isAnalyzing) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-600">Analyzing packaged food…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-500">No packaged food analysis yet.</p>
      </div>
    );
  }

  const { status, product, nutritionFacts, notes } = data;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">Packaged Food Details</h3>
        <p className="text-xs text-gray-500 mt-1">Status: {status}</p>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Product</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><strong>Brand:</strong> {product.brand ?? '—'}</li>
            <li><strong>Item:</strong> {product.item ?? '—'}</li>
            <li><strong>Quantity:</strong> {product.quantity ?? '—'}</li>
            <li>
              <strong>Ingredients:</strong>{' '}
              {product.ingredients && product.ingredients.length > 0
                ? product.ingredients.join(', ')
                : '—'}
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium text-gray-800 mb-2">Nutrition Facts</h4>
          {nutritionFacts ? (
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              {Object.entries(nutritionFacts).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                  <span className="font-medium">{v ?? '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No nutrition facts visible.</p>
          )}
        </div>

        {notes && (
          <div className="text-xs text-gray-500">Notes: {notes}</div>
        )}
      </div>
    </div>
  );
};

export default PackagedFoodResults;
