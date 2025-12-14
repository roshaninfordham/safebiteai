import React, { useState, useCallback, useEffect } from 'react';
import InputHub from './components/InputHub';
import Timeline from './components/Timeline';
import ResultsView from './components/ResultsView';
import Avatar from './components/Avatar';
import { AgentStep, InputType, SafeBiteResponse, SafetyFlag, UserPrefs } from './types';
import { startRun, streamRun } from './services/apiClient';
import { playVoice, voiceAvailable } from './services/voice';

const App: React.FC = () => {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<SafeBiteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [avatarUrl] = useState<string | undefined>(import.meta.env.VITE_AVATAR_IFRAME_URL);
  const [cleanup, setCleanup] = useState<(() => void) | null>(null);

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

  useEffect(() => {
    setVoiceReady(voiceAvailable());
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const handleScan = async (type: InputType, data: string | { mimeType: string; data: string }) => {
    setLoading(true);
    setSteps([]);
    setResult(null);
    setShowAvatar(false);
    if (cleanup) cleanup();

    try {
      const payload: any = { input_type: type, prefs };
      if (type === InputType.IMAGE && typeof data === 'object') {
        payload.image_base64 = data.data;
        payload.mime_type = data.mimeType;
      } else if (type === InputType.BARCODE) {
        payload.barcode = data as string;
      } else if (type === InputType.RECIPE) {
        payload.recipe = data as string;
        payload.raw_text = data as string;
      } else {
        payload.raw_text = data as string;
      }

      const sessionId = await startRun(payload);
      const stop = streamRun(sessionId, {
        onStep: (step) => handleStepUpdate(step),
        onFinal: (resp) => {
          setResult(resp);
          if (resp.safety_flag === SafetyFlag.UNSAFE || resp.safety_flag === SafetyFlag.CAUTION) {
            setShowAvatar(true);
          }
          if (voiceReady) {
            playVoice(resp.explanation_short).catch(() => {});
          }
          setLoading(false);
        },
        onError: (err) => {
          handleStepUpdate({ id: 'error', label: err, status: 'error', timestamp: new Date().toISOString() });
          setLoading(false);
        }
      });
      setCleanup(() => stop);
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
    if (cleanup) cleanup();
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
        
        <ResultsView 
          result={result} 
          onReset={handleReset} 
          onPlayVoice={(text) => playVoice(text).catch(() => {})}
          voiceEnabled={voiceReady}
        />
      </main>
      
      <Avatar show={showAvatar} onClose={() => setShowAvatar(false)} src={avatarUrl} />
      
      {/* Background decoration */}
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-200/20 rounded-full blur-3xl pointer-events-none -z-10"></div>
    </div>
  );
};

export default App;
