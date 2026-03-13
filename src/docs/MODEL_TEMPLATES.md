# Model Templates Documentation

## Overview

The Model Templates system allows you to configure which AI model to use for every call made to Databricks. This provides fine-grained control over model selection based on the specific hex (workflow step) and purpose of the call.

## Features

- **Per-Hex Configuration**: Select different models for each hexagon in the workflow
- **Per-Purpose Configuration**: Choose specific models for different call types (assessment, recommendation, synthesis, etc.)
- **Template Management**: Create, edit, and switch between different model configurations
- **Future-Proof**: Designed to support multiple AI models as they become available
- **Quick Actions**: Bulk operations to set all hexes or all purposes to the same model

## Available Models

Currently supported:
- **Claude Sonnet 4** (databricks-claude-sonnet-4-6) - Default, recommended for balanced performance and speed

Future models (will be added):
- GPT-4o
- Claude Opus 4
- And more...

## Call Purposes

The system distinguishes calls by the following purposes:

1. **Assessment** - Evaluate and analyze selected files
2. **Recommendation** - Generate recommendations based on analysis
3. **Unified** - Combined assessment + recommendations in one call
4. **Synthesis** - Synthesize multiple research files into cohesive insights
5. **Persona Response** - Persona-based conversations and evaluations
6. **Fact Checking** - Verify claims and facts within content
7. **Summarization** - Generate summaries of content
8. **Initial Query** - First question/query processing
9. **Follow-up Query** - Subsequent questions in a conversation
10. **Wisdom Contribution** - Process wisdom hex inputs

## Hexagons

Model templates can be configured for all workflow hexes:
- Enter
- Knowledge Base (research)
- Luminaries
- Panelist
- Consumers
- Competitors
- Colleagues
- Cultural Voices (cultural)
- Social Voices (social)
- Wisdom
- Grade
- Findings

## How to Use

### Accessing Model Templates

1. Click the **"Model Templates"** button in the left sidebar
2. The Model Template Manager will open

### Selecting a Template

1. In the Model Template Manager, you'll see all available templates
2. Click on a template to activate it
3. The active template is marked with a green "Active" badge
4. Your selection is saved automatically

### Creating a New Template

1. Click **"Create New Template"** button
2. Enter a name and description
3. Configure models for each hex and purpose (see below)
4. Click **"Save Template"**

### Editing a Template

1. Click the **Edit** button (pencil icon) on any template
2. Modify the configuration
3. Click **"Save Template"** to update

### Configuring Models

#### Quick Actions

**Set All Hexes:**
- Use the "Set all hexes to:" buttons to apply one model to all hexes and purposes at once
- Useful for quickly creating a baseline configuration

**Set All Purposes in a Hex:**
- Select a hex tab
- Use the "Set all purposes in [Hex] to:" buttons
- Applies the selected model to all purposes within that specific hex

#### Detailed Configuration

1. **Select a Hex Tab**: Click on the hex you want to configure
2. **Configure Each Purpose**: For each purpose, select the desired model from the dropdown
3. Each dropdown shows:
   - Model name
   - Provider (e.g., Anthropic, OpenAI)
   - Whether it's recommended

### Default Template

The system comes with a default template:
- **"All Claude Sonnet 4"** - Uses Claude Sonnet 4 for all hexes and purposes
- Marked with a purple "Default" badge
- Recommended for most use cases

## Integration with Databricks Calls

When your application makes a call to Databricks, the Model Template system:

1. Identifies the current hex (e.g., "Consumers")
2. Identifies the purpose (e.g., "persona-response")
3. Looks up the configured model in the active template
4. Uses that model for the Databricks API call

### Example Usage in Code

```typescript
import { getModelForExecution } from './components/ModelTemplateManager';

// Get the model for a specific hex and purpose
const modelToUse = getModelForExecution(
  currentModelTemplate,  // Current active model template
  'Consumers' as HexId,  // The hex making the call
  'persona-response' as PurposeId  // The purpose of the call
);

// Use this model in your Databricks API call
await databricksAPI.call({
  model: modelToUse,
  // ... other parameters
});
```

## Storage

Model templates are stored in localStorage with the key:
- `cohive_model_templates` - Array of all model templates
- `cohive_current_model_template_id` - ID of the currently active template

## Best Practices

1. **Start with Default**: Begin with the "All Claude Sonnet 4" template
2. **Test Before Customizing**: Understand how different models perform before creating complex configurations
3. **Document Your Templates**: Use clear names and descriptions for custom templates
4. **Purpose-Specific Tuning**: Consider different models for different purposes:
   - Fast models for summarization
   - Powerful models for complex analysis
   - Balanced models for general use

## Future Enhancements

As more models become available:
- Model-specific settings (temperature, max tokens, etc.)
- Cost tracking per model
- Performance analytics per model
- Recommended model configurations for specific use cases
- Model fallback strategies

## Examples

### Use Case 1: Fast Summarization, Deep Analysis

Create a template that uses:
- Claude Sonnet 4 for summarization (fast)
- Claude Opus 4 (when available) for assessment and unified calls (powerful)

### Use Case 2: Cost Optimization

Configure less expensive models for:
- Initial queries
- Fact checking
- Simple recommendations

And more powerful models for:
- Complex assessments
- Synthesis
- Unified evaluations

### Use Case 3: Provider Diversity

Mix models from different providers based on their strengths:
- Anthropic Claude for reasoning-heavy tasks
- OpenAI GPT for creative recommendations
- Specialized models for domain-specific analysis

## Troubleshooting

**Q: My model selection isn't being used**
A: Ensure you've saved the template and it's marked as "Active"

**Q: Can I delete a template?**
A: Currently, templates can only be created and edited. Deletion will be added in a future update.

**Q: What happens if a model becomes unavailable?**
A: The system will fall back to the default model (Claude Sonnet 4)

## Technical Details

### Type Definitions

```typescript
type ModelId = 'databricks-claude-sonnet-4-6' | 'databricks-gpt-4o' | ...;
type HexId = 'Enter' | 'research' | 'Luminaries' | ...;
type PurposeId = 'assessment' | 'recommendation' | 'unified' | ...;

interface ModelConfiguration {
  [hexId: string]: {
    [purposeId: string]: ModelId;
  };
}

interface ModelTemplate {
  id: string;
  name: string;
  description: string;
  configuration: ModelConfiguration;
  isDefault?: boolean;
}
```

### Helper Functions

- `getModelForExecution(template, hexId, purposeId)` - Get the model for a specific execution
- `getDefaultConfiguration()` - Creates a configuration with all models set to Claude Sonnet 4

## See Also

- [User Templates Documentation](./USER_TEMPLATES.md)
- [Databricks Integration](./DATABRICKS_INTEGRATION.md)
- [Guidelines](../Guidelines.md)

---

**Last Updated:** March 2026
