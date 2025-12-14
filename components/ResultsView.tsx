import React from 'react';
import { SafeBiteResponse, SafetyFlag } from '../types';

interface ResultsViewProps {
  result: SafeBiteResponse | null;
  onReset: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result, onReset }) => {
  if (!result) return null;

  const getSafetyColor = (flag: SafetyFlag) => {
    switch (flag) {
      case SafetyFlag.UNSAFE: return 'text-red-600 bg-red-50 border-red-200';
      case SafetyFlag.CAUTION: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case SafetyFlag.LOW_RISK: return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const scoreColor = result.safety_score > 70 ? 'text-green-500' : result.safety_score > 40 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className={`p-6 border-b-4 ${result.safety_score > 70 ? 'border-green-500' : 'border-red-500'}`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{result.product_name}</h2>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${getSafetyColor(result.safety_flag)}`}>
                {result.safety_flag.toUpperCase()}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className={`text-4xl font-black ${scoreColor}`}>
                {result.safety_score}
              </div>
              <span className="text-xs text-gray-400 uppercase font-bold">Safety Score</span>
            </div>
          </div>
          
          <p className="mt-4 text-gray-700 leading-relaxed">
            {result.explanation_short}
          </p>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
          <div className="p-4 text-center">
            <span className="block text-xs text-gray-400 font-bold uppercase mb-1">Recalls</span>
            <span className="text-gray-900 font-medium">{result.explanation_short.includes('recall') ? '⚠️ Detected' : '✅ None'}</span>
          </div>
          <div className="p-4 text-center">
             <span className="block text-xs text-gray-400 font-bold uppercase mb-1">Sustainability</span>
            <span className="text-green-700 font-medium">{result.sustainability_score}/100</span>
          </div>
        </div>
      </div>

      {/* News & Sources */}
      {result.sources && result.sources.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-blue-100 bg-blue-50/20">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center">
            <span className="text-xl mr-2">📰</span> Live News & Outbreaks
          </h3>
          <p className="text-xs text-gray-500 mb-3">Sourced from News, Reddit, TikTok via Google Search</p>
          <div className="space-y-3">
            {result.sources.map((source, i) => (
              <a 
                key={i} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="text-sm font-medium text-blue-700 group-hover:underline truncate">{source.title}</div>
                <div className="text-xs text-gray-400 truncate mt-1">{source.uri}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Allergens & Details */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-xl mr-2">🧬</span> Allergen Analysis
        </h3>
        <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
          {result.allergen_risk}
        </p>
      </div>

       {/* Next Steps */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-xl mr-2">🛡️</span> Recommended Actions
        </h3>
        <ul className="space-y-2">
          {result.next_steps.map((step, i) => (
            <li key={i} className="flex items-start">
              <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">{i + 1}</span>
              <span className="text-gray-700">{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Alternatives */}
      {result.alternatives.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-xl mr-2">🌱</span> Better Alternatives
          </h3>
          <div className="space-y-4">
            {result.alternatives.map((alt, i) => (
              <div key={i} className="border border-green-100 rounded-xl p-4 bg-green-50/30">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900">{alt.name}</h4>
                  <span className="text-xs bg-white text-gray-500 px-2 py-1 rounded border border-gray-200">
                    Taste: {alt.taste_similarity}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{alt.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={onReset}
        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg sticky bottom-6"
      >
        Start New Scan
      </button>
    </div>
  );
};

export default ResultsView;
