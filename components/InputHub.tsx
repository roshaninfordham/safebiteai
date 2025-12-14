import React, { useState, useRef } from 'react';
import { InputType } from '../types';

interface InputHubProps {
  onScan: (type: InputType, data: string | { mimeType: string; data: string }) => void;
  isLoading: boolean;
}

const InputHub: React.FC<InputHubProps> = ({ onScan, isLoading }) => {
  const [activeTab, setActiveTab] = useState<InputType>(InputType.TEXT);
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onScan(activeTab === InputType.RECIPE ? InputType.RECIPE : InputType.TEXT, textInput);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      const mimeType = file.type;
      onScan(InputType.IMAGE, { mimeType, data: base64String });
    };
    reader.readAsDataURL(file);
  };

  const tabs = [
    { id: InputType.TEXT, label: 'Chat', icon: '💬' },
    { id: InputType.IMAGE, label: 'Scan', icon: '📸' },
    { id: InputType.BARCODE, label: 'Barcode', icon: '📶' },
    { id: InputType.RECIPE, label: 'Recipe', icon: '📝' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex space-x-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[120px]">
        {activeTab === InputType.TEXT && (
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask: 'Is this raw chicken safe to leave out?'"
              className="w-full p-4 pr-12 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none h-32"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !textInput.trim()}
              className="absolute bottom-4 right-4 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 disabled:opacity-50 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </form>
        )}

        {activeTab === InputType.IMAGE && (
          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
               onClick={() => fileInputRef.current?.click()}>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload}
              disabled={isLoading}
            />
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm text-gray-500">Tap to take photo or upload</p>
          </div>
        )}

        {activeTab === InputType.BARCODE && (
          <div className="space-y-4">
             <input
              type="text"
              placeholder="Enter barcode number (e.g. 0123456789)"
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onScan(InputType.BARCODE, (e.target as HTMLInputElement).value);
                }
              }}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-400 text-center">Simulated Scanner: Type numbers & press Enter</p>
          </div>
        )}

        {activeTab === InputType.RECIPE && (
          <form onSubmit={handleSubmit} className="relative">
             <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste full recipe here..."
              className="w-full p-4 pr-12 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none h-32"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !textInput.trim()}
              className="absolute bottom-4 right-4 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-all"
            >
              Analyze
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default InputHub;
