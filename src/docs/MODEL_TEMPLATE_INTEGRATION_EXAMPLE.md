# Model Template Integration Examples

This document provides practical examples of how to integrate Model Templates into Databricks API calls.

## Basic Integration

### Step 1: Import Required Functions

```typescript
import { getModelForExecution, type HexId, type PurposeId } from './components/ModelTemplateManager';
```

### Step 2: Get Model for Current Execution

```typescript
// In your component or API call function
const currentHex: HexId = 'Consumers';  // The active hex
const callPurpose: PurposeId = 'assessment';  // What you're doing

// Get the configured model from the active template
const modelToUse = getModelForExecution(
  currentModelTemplate,  // From state/context
  currentHex,
  callPurpose
);

console.log(`Using model: ${modelToUse}`);
// Output: "Using model: databricks-claude-sonnet-4-6"
```

### Step 3: Use Model in API Call

```typescript
// Example Databricks API call
const response = await fetch('/api/databricks/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: modelToUse,  // Use the configured model
    messages: [...],
    // ... other parameters
  })
});
```

## Full Example: Assessment Function

```typescript
import { getModelForExecution, type HexId, type PurposeId } from './components/ModelTemplateManager';
import type { ModelTemplate } from './components/ModelTemplateManager';

interface AssessmentParams {
  hexId: HexId;
  files: string[];
  userQuestion: string;
  currentModelTemplate: ModelTemplate;
}

async function runAssessment({
  hexId,
  files,
  userQuestion,
  currentModelTemplate
}: AssessmentParams) {
  // Determine the model to use based on template configuration
  const modelId = getModelForExecution(
    currentModelTemplate,
    hexId,
    'assessment'  // Purpose of this call
  );

  console.log(`Running ${hexId} assessment with model: ${modelId}`);

  // Make Databricks API call with configured model
  const response = await fetch('/api/databricks/assess', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      model: modelId,  // Use template-configured model
      hexId: hexId,
      files: files,
      question: userQuestion,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  return await response.json();
}
```

## Example: Multiple Call Types in One Workflow

```typescript
async function runUnifiedWorkflow({
  hexId,
  files,
  currentModelTemplate
}: {
  hexId: HexId;
  files: string[];
  currentModelTemplate: ModelTemplate;
}) {
  // Step 1: Synthesis - combine files
  const synthesisModel = getModelForExecution(
    currentModelTemplate,
    hexId,
    'synthesis'
  );
  
  const synthesis = await callDatabricks({
    model: synthesisModel,
    task: 'synthesize',
    files: files
  });

  // Step 2: Assessment - evaluate synthesized content
  const assessmentModel = getModelForExecution(
    currentModelTemplate,
    hexId,
    'assessment'
  );
  
  const assessment = await callDatabricks({
    model: assessmentModel,
    task: 'assess',
    content: synthesis.result
  });

  // Step 3: Recommendation - generate next steps
  const recommendationModel = getModelForExecution(
    currentModelTemplate,
    hexId,
    'recommendation'
  );
  
  const recommendations = await callDatabricks({
    model: recommendationModel,
    task: 'recommend',
    assessment: assessment.result
  });

  return {
    synthesis: synthesis.result,
    assessment: assessment.result,
    recommendations: recommendations.result,
    modelsUsed: {
      synthesis: synthesisModel,
      assessment: assessmentModel,
      recommendation: recommendationModel
    }
  };
}
```

## Example: Persona-Based Assessment

```typescript
async function runPersonaAssessment({
  hexId,
  personas,
  content,
  currentModelTemplate,
  conversationMode
}: {
  hexId: HexId;
  personas: string[];
  content: string;
  currentModelTemplate: ModelTemplate;
  conversationMode: 'multi-round' | 'incremental';
}) {
  // Get model for persona responses
  const personaModel = getModelForExecution(
    currentModelTemplate,
    hexId,
    'persona-response'
  );

  const personaResponses = [];

  if (conversationMode === 'incremental') {
    // Sequential: Each persona sees previous responses
    let conversationHistory = content;
    
    for (const persona of personas) {
      const response = await callDatabricks({
        model: personaModel,
        persona: persona,
        context: conversationHistory
      });
      
      personaResponses.push(response);
      conversationHistory += `\n\n${persona}: ${response.text}`;
    }
  } else {
    // Parallel: All personas respond simultaneously
    const responses = await Promise.all(
      personas.map(persona => 
        callDatabricks({
          model: personaModel,
          persona: persona,
          context: content
        })
      )
    );
    
    personaResponses.push(...responses);
  }

  // Fact-check the combined responses
  const factCheckModel = getModelForExecution(
    currentModelTemplate,
    hexId,
    'fact-checking'
  );

  const factCheck = await callDatabricks({
    model: factCheckModel,
    task: 'fact-check',
    content: personaResponses.map(r => r.text).join('\n\n')
  });

  // Summarize findings
  const summaryModel = getModelForExecution(
    currentModelTemplate,
    hexId,
    'summarization'
  );

  const summary = await callDatabricks({
    model: summaryModel,
    task: 'summarize',
    content: factCheck.result
  });

  return {
    personaResponses,
    factCheck: factCheck.result,
    summary: summary.result,
    modelsUsed: {
      personaResponse: personaModel,
      factChecking: factCheckModel,
      summarization: summaryModel
    }
  };
}
```

## Example: Dynamic Model Selection with Fallback

```typescript
function getModelWithFallback(
  currentModelTemplate: ModelTemplate | null,
  hexId: HexId,
  purposeId: PurposeId,
  fallbackModel: string = 'databricks-claude-sonnet-4-6'
): string {
  if (!currentModelTemplate) {
    console.warn('No model template available, using fallback');
    return fallbackModel;
  }

  try {
    return getModelForExecution(currentModelTemplate, hexId, purposeId);
  } catch (error) {
    console.error('Error getting model from template:', error);
    return fallbackModel;
  }
}

// Usage
const model = getModelWithFallback(
  currentModelTemplate,
  'Luminaries',
  'assessment'
);
```

## Example: Logging Model Usage

```typescript
interface ModelUsageLog {
  timestamp: number;
  hexId: HexId;
  purpose: PurposeId;
  modelUsed: string;
  executionTime: number;
  success: boolean;
}

const modelUsageLogs: ModelUsageLog[] = [];

async function callWithLogging({
  hexId,
  purpose,
  currentModelTemplate,
  apiCall
}: {
  hexId: HexId;
  purpose: PurposeId;
  currentModelTemplate: ModelTemplate;
  apiCall: (model: string) => Promise<any>;
}) {
  const modelId = getModelForExecution(currentModelTemplate, hexId, purpose);
  const startTime = Date.now();
  let success = false;

  try {
    const result = await apiCall(modelId);
    success = true;
    return result;
  } finally {
    // Log model usage
    modelUsageLogs.push({
      timestamp: Date.now(),
      hexId,
      purpose,
      modelUsed: modelId,
      executionTime: Date.now() - startTime,
      success
    });

    // Persist logs
    localStorage.setItem('model_usage_logs', JSON.stringify(modelUsageLogs));
  }
}

// Usage
const result = await callWithLogging({
  hexId: 'Grade',
  purpose: 'assessment',
  currentModelTemplate,
  apiCall: async (model) => {
    return await fetch('/api/databricks/assess', {
      method: 'POST',
      body: JSON.stringify({ model, /* ... */ })
    }).then(r => r.json());
  }
});
```

## Example: Exporting Model Configuration

```typescript
import { exportModelTemplateAsText } from './components/ModelTemplateManager';

function exportProjectWithModelConfig(
  projectData: any,
  currentModelTemplate: ModelTemplate
) {
  // Export project data
  const projectMarkdown = generateProjectMarkdown(projectData);
  
  // Add model configuration section
  const modelConfig = exportModelTemplateAsText(currentModelTemplate);
  
  const fullExport = `${projectMarkdown}\n\n---\n\n${modelConfig}`;
  
  // Download as file
  const blob = new Blob([fullExport], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `project_with_models_${Date.now()}.md`;
  a.click();
}
```

## Example: Per-Hex Model Summary Display

```typescript
import { getHexModelSummary } from './components/ModelTemplateManager';

function HexInfoCard({ hexId, modelTemplate }: { hexId: HexId; modelTemplate: ModelTemplate }) {
  const modelSummary = getHexModelSummary(modelTemplate, hexId);
  
  return (
    <div className="hex-card">
      <h3>{hexId}</h3>
      <div className="model-info">
        <Cpu className="icon" />
        <span className="text-sm text-gray-600">
          Models: {modelSummary}
        </span>
      </div>
    </div>
  );
}
```

## Best Practices

1. **Always pass the current template**: Ensure `currentModelTemplate` is available in your component state or context

2. **Use typed parameters**: Leverage TypeScript types `HexId` and `PurposeId` for type safety

3. **Handle null cases**: Check if model template exists before calling API

4. **Log model usage**: Track which models are used for analytics and debugging

5. **Provide fallbacks**: Have default models in case template is not configured

6. **Document purpose IDs**: Be consistent with purpose naming across your application

## Troubleshooting

**Issue**: Getting default model instead of configured one
- **Solution**: Ensure the hex and purpose IDs match exactly the types defined in ModelTemplateManager

**Issue**: Template is null or undefined
- **Solution**: Wait for template to load in useEffect before making calls

**Issue**: Model not available in Databricks
- **Solution**: Implement error handling and fallback to default model

---

For more information, see [Model Templates Documentation](/docs/MODEL_TEMPLATES.md)
