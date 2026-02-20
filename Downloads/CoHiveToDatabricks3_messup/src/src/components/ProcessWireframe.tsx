import React, { useState, useEffect } from 'react';
import { ProcessFlow } from './ProcessFlow';
import { Download, Upload, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';

const STORAGE_KEYS = {
  responses: 'cohive_responses',
  currentStep: 'cohive_current_step',
  completedSteps: 'cohive_completed_steps',
};

export function ProcessWireframe() {
  const [currentStep, setCurrentStep] = useState<string>('');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedResponses = localStorage.getItem(STORAGE_KEYS.responses);
      const savedCurrentStep = localStorage.getItem(STORAGE_KEYS.currentStep);
      const savedCompletedSteps = localStorage.getItem(STORAGE_KEYS.completedSteps);

      if (savedResponses) setResponses(JSON.parse(savedResponses));
      if (savedCurrentStep) setCurrentStep(savedCurrentStep);
      if (savedCompletedSteps) setCompletedSteps(JSON.parse(savedCompletedSteps));
    } catch (error) {
      console.error('Failed to load saved state:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.responses, JSON.stringify(responses));
      localStorage.setItem(STORAGE_KEYS.currentStep, currentStep);
      localStorage.setItem(STORAGE_KEYS.completedSteps, JSON.stringify(completedSteps));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }, [responses, currentStep, completedSteps]);

  const handleStepClick = (stepId: string) => {
    setCurrentStep(stepId);
    
    // Mark as completed if not already
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const handleExportData = () => {
    const exportData = {
      responses,
      currentStep,
      completedSteps,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cohive-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        if (importData.responses) setResponses(importData.responses);
        if (importData.currentStep) setCurrentStep(importData.currentStep);
        if (importData.completedSteps) setCompletedSteps(importData.completedSteps);
        
        alert('Data imported successfully!');
      } catch (error) {
        console.error('Failed to import data:', error);
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleRestart = () => {
    if (confirm('Are you sure you want to restart? All progress will be lost.')) {
      setCurrentStep('');
      setCompletedSteps([]);
      setResponses({});
      localStorage.clear();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-200 py-4 px-6">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">CH</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CoHive</h1>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>

            <label>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                asChild
              >
                <span>
                  <Upload className="w-4 h-4" />
                  Import
                </span>
              </Button>
            </label>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleRestart}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restart
            </Button>
          </div>
        </div>
      </header>

      {/* Process Flow - Hexagon Navigation */}
      <ProcessFlow
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Main Content Area */}
      <main className="max-w-[1400px] mx-auto py-8 px-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {currentStep ? (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {currentStep}
              </h2>
              
              <div className="prose max-w-none">
                <p className="text-lg text-gray-600 mb-4">
                  This is the {currentStep} step of your CoHive workflow.
                </p>
                
                {/* Placeholder content - will be replaced with actual step content */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> This is a placeholder view. The actual step content 
                    will be implemented based on your specific workflow requirements.
                  </p>
                </div>

                {/* Textarea for user input */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Response:
                  </label>
                  <textarea
                    className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your response here..."
                    value={responses[currentStep] || ''}
                    onChange={(e) => setResponses({
                      ...responses,
                      [currentStep]: e.target.value
                    })}
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    onClick={() => {
                      if (!completedSteps.includes(currentStep)) {
                        setCompletedSteps([...completedSteps, currentStep]);
                      }
                      alert('Progress saved!');
                    }}
                  >
                    Save Progress
                  </Button>
                  
                  <Button variant="outline">
                    Clear Response
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Get Started
              </h2>
              <p className="text-gray-600 mb-6">
                Click on a hexagon above to begin your CoHive workflow
              </p>
              <Button
                size="lg"
                onClick={() => handleStepClick('Launch')}
              >
                Start with Launch
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProcessWireframe;
