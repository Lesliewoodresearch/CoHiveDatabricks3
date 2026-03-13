import { Settings, Cpu, Save, X, Plus, Edit2, Check } from 'lucide-react';
import { useState } from 'react';

// Available AI models

export const availableModels = [
  // ── Tier 1: Premium / Flagship ──────────────────────────────────────────
  {
    id: 'databricks-claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    tier: 'premium' as const,
    description: 'Advanced hybrid reasoning — best for persona voice work',
    recommended: true
  },
  {
    id: 'databricks-gpt-5-2',
    name: 'GPT-5.2',
    provider: 'OpenAI',
    tier: 'premium' as const,
    description: 'Highest accuracy, structured extraction, multi-step workflows',
    recommended: false
  },
  {
    id: 'databricks-gpt-5-1',
    name: 'GPT-5.1',
    provider: 'OpenAI',
    tier: 'premium' as const,
    description: 'General purpose, auto-adjusts reasoning depth, content creation',
    recommended: false
  },
  {
    id: 'databricks-gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    tier: 'premium' as const,
    description: 'Flagship reasoning, coding, and agentic tasks',
    recommended: false
  },
  {
    id: 'databricks-gemini-3-1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    tier: 'premium' as const,
    description: 'Deep analysis, document intelligence, 1M token context',
    recommended: false
  },
  {
    id: 'databricks-gemini-2-5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    tier: 'premium' as const,
    description: 'Enterprise research, Deep Think Mode, 1M token context',
    recommended: false
  },

  // ── Tier 2: Balanced ─────────────────────────────────────────────────────
  {
    id: 'databricks-gpt-5-mini',
    name: 'GPT-5 mini',
    provider: 'OpenAI',
    tier: 'balanced' as const,
    description: 'Cost-optimized reasoning and chat, reliable output',
    recommended: false
  },
  {
    id: 'databricks-gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'Google',
    tier: 'balanced' as const,
    description: 'Fast multimodal, production-scale deployments',
    recommended: false
  },
  {
    id: 'databricks-gemini-2-5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    tier: 'balanced' as const,
    description: 'Real-time apps, hybrid reasoning, 1M token context',
    recommended: false
  },
  {
    id: 'databricks-meta-llama-3-3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    tier: 'balanced' as const,
    description: 'Open model, multilingual dialogue, 128K context',
    recommended: false
  },
  {
    id: 'databricks-qwen3-next-80b-a3b-instruct',
    name: 'Qwen3-Next 80B',
    provider: 'Alibaba',
    tier: 'balanced' as const,
    description: 'Ultra-long context, high throughput, enterprise (us-west-2 / ap-northeast-1 only)',
    recommended: false
  },

  // ── Tier 3: Economy / Fast ───────────────────────────────────────────────
  {
    id: 'databricks-claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    tier: 'economy' as const,
    description: 'Fastest and most cost-effective, real-time low-latency use',
    recommended: false
  },
  {
    id: 'databricks-gpt-5-nano',
    name: 'GPT-5 nano',
    provider: 'OpenAI',
    tier: 'economy' as const,
    description: 'High-throughput, simple classification, lowest cost',
    recommended: false
  },
] as const;

export type ModelTier = 'premium' | 'balanced' | 'economy';
  

// All hexagons in the system
export const hexagons = [
  'Enter',
  'research',
  'Luminaries',
  'panelist',
  'Consumers',
  'competitors',
  'Colleagues',
  'cultural',
  'social',
  'Wisdom',
  'Grade',
  'Findings'
] as const;

// Call purposes/types
export const callPurposes = [
  { id: 'assessment', name: 'Assessment', description: 'Evaluate and analyze files' },
  { id: 'recommendation', name: 'Recommendation', description: 'Generate recommendations' },
  { id: 'unified', name: 'Unified', description: 'Combined assessment + recommendations' },
  { id: 'synthesis', name: 'Synthesis', description: 'Synthesize research files' },
  { id: 'persona-response', name: 'Persona Response', description: 'Persona-based conversations' },
  { id: 'fact-checking', name: 'Fact Checking', description: 'Verify claims and facts' },
  { id: 'summarization', name: 'Summarization', description: 'Generate summaries' },
  { id: 'initial-query', name: 'Initial Query', description: 'First question/query processing' },
  { id: 'follow-up-query', name: 'Follow-up Query', description: 'Subsequent questions' },
  { id: 'wisdom-contribution', name: 'Wisdom Contribution', description: 'Process wisdom hex inputs' },
] as const;

export type ModelId = typeof availableModels[number]['id'];
export type HexId = typeof hexagons[number];
export type PurposeId = typeof callPurposes[number]['id'];

// Model configuration for a specific hex and purpose
export interface ModelConfiguration {
  [hexId: string]: {
    [purposeId: string]: ModelId;
  };
}

export interface ModelTemplate {
  id: string;
  name: string;
  description: string;
  configuration: ModelConfiguration;
  isDefault?: boolean;
}

interface ModelTemplateManagerProps {
  currentTemplate: ModelTemplate;
  availableTemplates: ModelTemplate[];
  onTemplateChange: (templateId: string) => void;
  onTemplateUpdate: (template: ModelTemplate) => void;
  onTemplateCreate: (template: ModelTemplate) => void;
}

export function ModelTemplateManager({
  currentTemplate,
  availableTemplates,
  onTemplateChange,
  onTemplateUpdate,
  onTemplateCreate
}: ModelTemplateManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'select' | 'edit' | 'create'>('select');
  const [editingTemplate, setEditingTemplate] = useState<ModelTemplate | null>(null);
  const [selectedHex, setSelectedHex] = useState<HexId>('Enter');
  const [highlightedGlobalModel, setHighlightedGlobalModel] = useState<ModelId | null>(null);

  const handleEdit = (template: ModelTemplate) => {
    setEditingTemplate({ ...template });
    setViewMode('edit');
    setHighlightedGlobalModel(null); // Reset highlight when editing a new template
  };

  const handleCreateNew = () => {
    const newTemplate: ModelTemplate = {
      id: Date.now().toString(),
      name: 'New Model Template',
      description: 'Custom model configuration',
      configuration: getDefaultConfiguration(),
      isDefault: false
    };
    setEditingTemplate(newTemplate);
    setViewMode('create');
    setHighlightedGlobalModel(null); // Reset highlight when creating new template
  };

  const handleSave = () => {
    if (editingTemplate) {
      if (viewMode === 'create') {
        onTemplateCreate(editingTemplate);
      } else {
        onTemplateUpdate(editingTemplate);
      }
      setViewMode('select');
      setEditingTemplate(null);
      setHighlightedGlobalModel(null); // Reset highlight after save
    }
  };

  const updateModelForPurpose = (hexId: HexId, purposeId: PurposeId, modelId: ModelId) => {
    if (!editingTemplate) return;
    
    setEditingTemplate({
      ...editingTemplate,
      configuration: {
        ...editingTemplate.configuration,
        [hexId]: {
          ...editingTemplate.configuration[hexId],
          [purposeId]: modelId
        }
      }
    });
    
    // Clear highlight when user makes manual changes
    setHighlightedGlobalModel(null);
  };

  const setAllHexesToModel = (modelId: ModelId) => {
    if (!editingTemplate) return;
    
    const newConfiguration: ModelConfiguration = {};
    hexagons.forEach(hex => {
      newConfiguration[hex] = {};
      callPurposes.forEach(purpose => {
        newConfiguration[hex][purpose.id] = modelId;
      });
    });
    
    setEditingTemplate({
      ...editingTemplate,
      configuration: newConfiguration
    });
    
    // Highlight this model to show it's been set globally
    setHighlightedGlobalModel(modelId);
  };

  const setAllPurposesForHexToModel = (hexId: HexId, modelId: ModelId) => {
    if (!editingTemplate) return;
    
    const newHexConfig: { [purposeId: string]: ModelId } = {};
    callPurposes.forEach(purpose => {
      newHexConfig[purpose.id] = modelId;
    });
    
    setEditingTemplate({
      ...editingTemplate,
      configuration: {
        ...editingTemplate.configuration,
        [hexId]: newHexConfig
      }
    });
  };

  if (!isOpen) {
    return (
      <button
        className="px-4 py-2 border-2 border-gray-400 bg-white text-gray-700 rounded flex items-center gap-2 hover:bg-gray-50"
        onClick={() => setIsOpen(true)}
      >
        <Cpu className="w-4 h-4" />
        Model Templates
      </button>
    );
  }

  return (
    <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl w-full max-w-[128rem] max-h-[90vh] overflow-hidden flex flex-col border-2 border-gray-300 z-50">
      {/* Header */}
      <div className="border-b-2 border-gray-300 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 leading-tight">Model Template Management</h2>
          <p className="text-gray-600 text-sm">Configure which AI model to use for each hex and purpose</p>
        </div>
        <button
          className="p-2 hover:bg-gray-100 rounded"
          onClick={() => {
            setIsOpen(false);
            setViewMode('select');
            setEditingTemplate(null);
          }}
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {viewMode === 'select' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900">Available Model Templates</h3>
              <button
                className="px-3 py-1.5 bg-blue-600 text-white rounded flex items-center gap-2 hover:bg-blue-700 text-sm"
                onClick={handleCreateNew}
              >
                <Plus className="w-4 h-4" />
                Create New Template
              </button>
            </div>

            <div className="space-y-3">
              {availableTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => {
                    if (template.id !== currentTemplate.id) {
                      onTemplateChange(template.id);
                    }
                  }}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    template.id === currentTemplate.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-25'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="radio"
                        name="model-template-selection"
                        checked={template.id === currentTemplate.id}
                        onChange={() => onTemplateChange(template.id)}
                        className="w-5 h-5 text-blue-600 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-gray-900 font-semibold">{template.name}</h4>
                          {template.isDefault && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                              Default
                            </span>
                          )}
                          {template.id === currentTemplate.id && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        className="px-3 py-1.5 border-2 border-gray-400 bg-white text-gray-700 rounded hover:bg-gray-50 text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(template);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(viewMode === 'edit' || viewMode === 'create') && editingTemplate && (
          <div className="space-y-6">
            <div>
              <h3 className="text-gray-900 mb-4">
                {viewMode === 'create' ? 'Create New Model Template' : 'Edit Model Template'}
              </h3>

              {/* Basic Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-gray-700 mb-1 text-sm">Template Name</label>
                  <input
                    type="text"
                    className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 text-sm">Description</label>
                  <textarea
                    className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 resize-none focus:outline-none focus:border-blue-500"
                    rows={2}
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h4 className="text-gray-900 mb-3 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  Quick Actions - Set Default for All Hexes
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-700">Set all hexes to:</span>
                    {availableModels.map(model => (
                      <button
                        key={model.id}
                        onClick={() => setAllHexesToModel(model.id)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                          highlightedGlobalModel === model.id
                            ? 'bg-blue-600 text-white border-2 border-blue-700 shadow-md'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {model.name}
                        {highlightedGlobalModel === model.id && (
                          <span className="ml-1">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {highlightedGlobalModel && (
                    <div className="mt-2 p-2 bg-green-50 border-2 border-green-300 rounded text-sm text-green-800">
                      ✓ All hexes set to <strong>{availableModels.find(m => m.id === highlightedGlobalModel)?.name}</strong>. Click "Save Template" to apply changes.
                    </div>
                  )}
                </div>
              </div>

              {/* Hex Tabs */}
              <div className="mb-6">
                <h4 className="text-gray-900 mb-3">Configure by Hex</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {hexagons.map(hex => (
                    <button
                      key={hex}
                      onClick={() => setSelectedHex(hex)}
                      className={`px-3 py-1.5 rounded text-sm transition-all ${
                        selectedHex === hex
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {hex === 'research' ? 'Knowledge Base' : hex}
                    </button>
                  ))}
                </div>

                {/* Quick action for selected hex */}
                <div className="mb-4 p-3 bg-gray-50 border-2 border-gray-200 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Set all purposes in <strong>{selectedHex}</strong> to:</span>
                    {availableModels.map(model => (
                      <button
                        key={model.id}
                        onClick={() => setAllPurposesForHexToModel(selectedHex, model.id)}
                        className="px-2 py-1 bg-white border-2 border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs"
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose configurations for selected hex */}
                <div className="space-y-3">
                  {callPurposes.map(purpose => (
                    <div key={purpose.id} className="border-2 border-gray-300 rounded p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <label className="block text-sm text-gray-900 font-medium mb-1">
                            {purpose.name}
                          </label>
                          <p className="text-xs text-gray-600">{purpose.description}</p>
                        </div>
                        <select
                          className="w-64 border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                          value={editingTemplate.configuration[selectedHex]?.[purpose.id] || 'databricks-claude-sonnet-4-6'}
                          onChange={(e) => updateModelForPurpose(selectedHex, purpose.id as PurposeId, e.target.value as ModelId)}
                        >
                          {availableModels.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.name} ({model.provider})
                              {model.recommended ? ' - Recommended' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t-2 border-gray-300">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                onClick={handleSave}
              >
                <Save className="w-4 h-4" />
                Save Template
              </button>
              <button
                className="px-4 py-2 border-2 border-gray-400 bg-white text-gray-700 rounded hover:bg-gray-50"
                onClick={() => {
                  setViewMode('select');
                  setEditingTemplate(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get default configuration (all set to Claude Haiku 4.5)
function getDefaultConfiguration(): ModelConfiguration {
  const config: ModelConfiguration = {};
  hexagons.forEach(hex => {
    config[hex] = {};
    callPurposes.forEach(purpose => {
      config[hex][purpose.id] = 'databricks-claude-haiku-4-5';
    });
  });
  return config;
}

// Default model templates
export const defaultModelTemplates: ModelTemplate[] = [
  {
    id: 'default-claude',
    name: 'All Claude Haiku 4.5 (DEFAULT)',
    description: 'Use Claude Haiku 4.5 for all hexes and purposes - fast, cost-effective, and optimized for CoHive workflows',
    configuration: getDefaultConfiguration(),
    isDefault: true
  }
];

// Helper function to get model for a specific hex and purpose
export function getModelForExecution(
  template: ModelTemplate,
  hexId: HexId,
  purposeId: PurposeId
): ModelId {
  return template.configuration[hexId]?.[purposeId] || 'databricks-claude-haiku-4-5';
}

// Helper function to export model template as readable text
export function exportModelTemplateAsText(template: ModelTemplate): string {
  let text = `# Model Template: ${template.name}\n\n`;
  text += `${template.description}\n\n`;
  
  hexagons.forEach(hex => {
    text += `## ${hex === 'research' ? 'Knowledge Base' : hex}\n\n`;
    callPurposes.forEach(purpose => {
      const modelId = template.configuration[hex]?.[purpose.id] || 'databricks-claude-sonnet-4-6';
      const model = availableModels.find(m => m.id === modelId);
      text += `- **${purpose.name}**: ${model?.name || modelId}\n`;
    });
    text += `\n`;
  });
  
  return text;
}

// Helper function to get model configuration summary for a specific hex
export function getHexModelSummary(template: ModelTemplate, hexId: HexId): string {
  const hexConfig = template.configuration[hexId] || {};
  const modelCounts: { [key: string]: number } = {};
  
  callPurposes.forEach(purpose => {
    const modelId = hexConfig[purpose.id] || 'databricks-claude-sonnet-4-6';
    modelCounts[modelId] = (modelCounts[modelId] || 0) + 1;
  });
  
  const entries = Object.entries(modelCounts);
  if (entries.length === 1) {
    const model = availableModels.find(m => m.id === entries[0][0]);
    return `All: ${model?.name || entries[0][0]}`;
  }
  
  return entries
    .map(([modelId, count]) => {
      const model = availableModels.find(m => m.id === modelId);
      return `${model?.name || modelId} (${count})`;
    })
    .join(', ');
}