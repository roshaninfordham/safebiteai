import React, { useEffect, useRef } from 'react';
import { AgentStep } from '../types';

interface TimelineProps {
  steps: AgentStep[];
}

const Timeline: React.FC<TimelineProps> = ({ steps }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  if (steps.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-200">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
        Agent Activity
      </h3>
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isRunning = step.status === 'running';

          return (
            <div key={index} className="flex relative">
              {/* Vertical connector line */}
              {!isLast && (
                <div className="absolute left-[9px] top-6 bottom-[-24px] w-0.5 bg-gray-200"></div>
              )}
              
              <div className={`
                relative z-10 w-5 h-5 rounded-full flex items-center justify-center border-2 
                ${step.status === 'completed' ? 'bg-green-500 border-green-500' : 
                  step.status === 'running' ? 'bg-white border-blue-500 animate-bounce' : 
                  'bg-white border-gray-300'}
              `}>
                {step.status === 'completed' && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <div className="ml-4 flex-1">
                <p className={`text-sm font-medium ${isRunning ? 'text-blue-600' : 'text-gray-700'}`}>
                  {step.label}
                </p>
                {step.details && (
                  <p className="text-xs text-gray-500 mt-1">{step.details}</p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default Timeline;
