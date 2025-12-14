import React, { useState, useCallback } from 'react';
import { AgentService } from './services/agentService';
import InputHub from './components/InputHub';
import Timeline from './components/Timeline';
import ResultsView from './components/ResultsView';
import Avatar from './components/Avatar';
import { AgentStep, InputType, SafeBiteResponse, SafetyFlag, UserPrefs } from './types';

const App: React.FC = () => {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<SafeBiteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);

  // Default User Prefs (Simulated)
  const prefs: UserPrefs = {
    user_language: 'English',
    diet_restriction: 'gluten-free', // Example
    location: 'New York, USA'
  };

  const handleStepUpdate = useCallback((newStep: AgentStep) => {
    setSteps(prev => {
      // Update existing step or add new one
      const exists = prev.find(s => s.id === newStep.id);
      if (exists) {
        return prev.map(s => s.id === newStep.id ? newStep : s);
      }
      return [...prev, newStep];
    });
  }, []);

  const handleScan = async (type: InputType, data: string | { mimeType: string; data: string }) => {
    setLoading(true);
    setSteps([]);
    setResult(null);
    setShowAvatar(false);

    const agent = new AgentService(handleStepUpdate);

    try {
      const response = await agent.runAgent(data, type, prefs);
      setResult(response);
      
      // Trigger Avatar if unsafe
      if (response.safety_flag === SafetyFlag.UNSAFE || response.safety_flag === SafetyFlag.CAUTION) {
        // Optional: Auto-trigger avatar for risky items
        // setShowAvatar(true); 
      }
    } catch (error) {
      console.error(error);
      handleStepUpdate({
        id: 'error',
        label: 'Error Processing Request',
        status: 'error',
        timestamp: new Date().toISOString(),
        details: 'Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSteps([]);
    setShowAvatar(false);
  };

  return (
    <div className="min-h-screen pb-20 max-w-md mx-auto bg-gray-50 shadow-2xl relative overflow-hidden">
      {/* ElevenLabs Integration (Hidden / Passive for this MVP) */}
      
      <header className="bg-white p-6 pb-4 sticky top-0 z-40 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">SafeBite</h1>
          </div>
          <button 
            className="text-gray-400 hover:text-green-600 transition-colors"
            onClick={() => setShowAvatar(true)}
            title="Open Avatar Helper"
          >
            <span className="sr-only">Help</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="p-4 pt-6">
        {!result && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                What are you eating?
              </h2>
              <p className="text-gray-500 text-sm">
                Scan a barcode, upload a photo, or ask a question to check for risks.
              </p>
            </div>
            
            <InputHub onScan={handleScan} isLoading={loading} />
          </>
        )}

        <Timeline steps={steps} />
        
        <ResultsView result={result} onReset={handleReset} />
      </main>
      
      <Avatar show={showAvatar} />
      
      {/* Background decoration */}
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-200/20 rounded-full blur-3xl pointer-events-none -z-10"></div>
    </div>
  );
};

export default App;
