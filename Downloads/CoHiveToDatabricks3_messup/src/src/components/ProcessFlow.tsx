import React from 'react';
import { HexagonBreadcrumb, HexStatus } from './HexagonBreadcrumb';
import { stepColors } from '../styles/cohive-theme';

export interface ProcessStep {
  id: string;
  label: string;
  color?: string;
  required?: boolean;
}

// Updated process steps matching new naming convention
export const processSteps: ProcessStep[] = [
  { id: 'Launch', label: 'Launch', color: stepColors.Launch, required: true },
  { id: 'External Experts', label: 'External Experts', color: stepColors['External Experts'] },
  { id: 'Panel Homes', label: 'Panel Homes', color: stepColors['Panel Homes'] },
  { id: 'Buyers', label: 'Buyers', color: stepColors.Buyers },
  { id: 'Competitors', label: 'Competitors', color: stepColors.Competitors },
  { id: 'Knowledge Base', label: 'Knowledge Base', color: stepColors['Knowledge Base'] },
  { id: 'Test Against Segments', label: 'Test Against Segments', color: stepColors['Test Against Segments'] },
  { id: 'Action', label: 'Action', color: stepColors.Action, required: true },
];

interface ProcessFlowProps {
  currentStep: string;
  completedSteps: string[];
  onStepClick: (stepId: string) => void;
  visibleSteps?: string[];
}

export function ProcessFlow({
  currentStep,
  completedSteps,
  onStepClick,
  visibleSteps,
}: ProcessFlowProps) {
  
  // Filter steps based on visibility
  const displaySteps = visibleSteps 
    ? processSteps.filter(step => visibleSteps.includes(step.id))
    : processSteps;

  const getStepStatus = (stepId: string): HexStatus => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (currentStep === stepId) return 'active';
    
    // Launch is always available
    if (stepId === 'Launch') return 'upcoming';
    
    // Action requires at least Launch to be completed
    if (stepId === 'Action') {
      return completedSteps.includes('Launch') ? 'upcoming' : 'disabled';
    }
    
    // All other steps require Launch to be completed
    return completedSteps.includes('Launch') ? 'upcoming' : 'disabled';
  };

  return (
    <div className="w-full bg-white py-6 px-4 border-b-2 border-gray-200">
      <div className="max-w-[1400px] mx-auto">
        {/* Hexagon cluster layout */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {displaySteps.map((step, index) => {
            const status = getStepStatus(step.id);
            const isClickable = status !== 'disabled';
            
            return (
              <div key={step.id} className="relative">
                <HexagonBreadcrumb
                  label={step.label}
                  color={step.color}
                  status={status}
                  size="medium"
                  onClick={isClickable ? () => onStepClick(step.id) : undefined}
                  className={`transition-all ${
                    status === 'active' ? 'scale-110' : ''
                  }`}
                />
                
                {/* Arrow connector (except for last step) */}
                {index < displaySteps.length - 1 && (
                  <div className="absolute top-1/2 -right-8 transform -translate-y-1/2 hidden md:block">
                    <svg width="32" height="12" viewBox="0 0 32 12">
                      <path
                        d="M 0,6 L 28,6 L 24,2 M 28,6 L 24,10"
                        stroke="#d1d5db"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Step info */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {currentStep ? `Current: ${currentStep}` : 'Select a step to begin'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Completed: {completedSteps.length} / {displaySteps.length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProcessFlow;
