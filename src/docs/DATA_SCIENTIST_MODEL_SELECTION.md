# Data Scientist Model Selection Feature

## Overview

Data Scientists have an exclusive feature that allows them to manually select which AI model to use for any execution. This model selector is:
- **Visible ONLY to Data Scientists** - Hidden from all other user roles
- **Optional Override** - Defaults to the Model Template configuration
- **Results Included** - Model used is stored with execution results
- **Transparent in Results** - The model used can be shown in results, but the ability to choose is hidden from non-Data Scientists

## Implementation Requirements

### 1. Update CentralHexView Interface

Add `userRole` prop to `CentralHexViewProps`:

```typescript
interface CentralHexViewProps {
  // ... existing props
  userRole?: 'administrator' | 'research-analyst' | 'research-leader' | 'data-scientist' | 'marketing-manager' | 'product-manager' | 'executive-stakeholder';
}
```

### 2. Add Model Selection State

```typescript
// In CentralHexView component
const [selectedModel, setSelectedModel] = useState<string>('databricks-claude-sonnet-4-6');
```

### 3. Add Data Scientist Model Selector UI

Insert before Step 1 or in a prominent location (only visible when `userRole === 'data-scientist'`):

```tsx
{/* Data Scientist Model Selection - Hidden from other users */}
{userRole === 'data-scientist' && (
  <div className=\"p-3 mb-2 border-2 border-purple-300 bg-purple-50 rounded-lg\">
    <div className=\"flex items-center gap-2 mb-2\">
      <Cpu className=\"w-5 h-5 text-purple-600\" />
      <h4 className=\"text-gray-900 font-semibold\">Model Selection (Data Scientist Only)</h4>
    </div>
    <p className=\"text-sm text-gray-600 mb-2\">
      Override the template-configured model for this execution
    </p>
    <select
      className=\"w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-purple-500\"
      value={selectedModel}
      onChange={(e) => setSelectedModel(e.target.value)}
    >
      {availableModels.map(model => (
        <option key={model.id} value={model.id}>
          {model.name} ({model.provider})
          {model.recommended ? ' - Recommended' : ''}
        </option>
      ))}
    </select>
    <p className=\"text-xs text-gray-500 mt-1\">
      Model used will be included in execution results
    </p>
  </div>
)}
```

### 4. Update HexExecution Interface

Add `modelUsed` field to track which model was used:

```typescript
interface HexExecution {
  id: string;
  selectedFiles: string[];
  assessmentType: string[];
  assessment: string;
  timestamp: number;
  modelUsed?: string; // Track which model was used for this execution
}
```

### 5. Store Model with Execution

In the `onExecute` call, pass the selected model:

```typescript
// Modify onExecute to accept model parameter
onExecute(selectedFiles, assessmentType, assessment, selectedModel);
```

### 6. Display Model in Execution History

Show which model was used in the execution history (visible to everyone, but selector only visible to Data Scientists):

```tsx
{/* In history view */}
<div className=\"text-sm text-gray-700 mb-1\">
  <strong>Model:</strong> {execution.modelUsed || 'databricks-claude-sonnet-4-6'}
</div>
```

### 7. Update ProcessWireframe

Pass `userRole` to CentralHexView:

```typescript
<CentralHexView
  // ... existing props
  userRole={userRole}
/>
```

### 8. Update handleCentralHexExecute

Accept and store the model parameter:

```typescript
const handleCentralHexExecute = (
  selectedFiles: string[],
  assessmentType: string[],
  assessment: string,
  selectedModel?: string
) => {
  const execution: HexExecution = {
    id: Date.now().toString(),
    selectedFiles,
    assessmentType,
    assessment,
    timestamp: Date.now(),
    modelUsed: selectedModel || currentModelTemplate?.configuration[activeStepId]?.['assessment'] || 'databricks-claude-sonnet-4-6'
  };
  
  // ... rest of execution logic
};
```

## User Experience

### For Data Scientists
1. See a purple "Model Selection" box at the top of each hex
2. Can select any available model from the dropdown
3. Default is set to the template-configured model
4. Model selection persists for that execution only
5. Can see which model was used in execution history

### For Other Users
- Model selector is completely hidden
- Cannot see or change model selection
- Can see which model was used in execution history (transparency)
- No indication that model selection is even possible

## Security & Privacy

- Model selection UI uses `userRole === 'data-scientist'` check
- No API endpoints expose model selection capability
- Model used is logged for transparency and debugging
- Non-Data Scientists cannot access this feature through any UI path

## Benefits

1. **Experimentation**: Data Scientists can test different models
2. **Optimization**: Compare model performance for specific tasks
3. **Debugging**: Isolate model-specific issues
4. **Transparency**: All executions log which model was used
5. **Hidden Complexity**: Other users don't see unnecessary options

## Future Enhancements

- **Model Performance Tracking**: Log response time, token usage per model
- **A/B Testing**: Automatically split traffic between models
- **Model Recommendations**: Suggest best model based on task type
- **Cost Tracking**: Monitor costs per model
- **Model Comparison View**: Side-by-side comparison of different model results

## Implementation Checklist

- [ ] Add `userRole` prop to CentralHexView interface
- [ ] Add `selectedModel` state
- [ ] Add Data Scientist model selector UI
- [ ] Update `HexExecution` interface with `modelUsed` field
- [ ] Update `onExecute` to accept model parameter
- [ ] Display model in execution history
- [ ] Pass `userRole` from ProcessWireframe
- [ ] Update `handleCentralHexExecute` to store model
- [ ] Test with Data Scientist role
- [ ] Test with non-Data Scientist roles (selector should be hidden)
- [ ] Verify model is stored in execution results
- [ ] Verify model is displayed in history

---

**Implementation Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 1-2 hours
