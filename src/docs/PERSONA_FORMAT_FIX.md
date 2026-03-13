# Persona Format Fix - Assessment API Integration

**Date:** March 9, 2026  
**Status:** ✅ Complete

---

## Issue Identified

The persona selection flow was passing persona IDs correctly from CentralHexView to the assessment API, but the API wasn't loading the actual persona content from JSON files. 

### Previous Flow (Broken)

```
1. User selects: "Spontaneous Shopper" (consumers-b2c-impulse)
2. CentralHexView stores ID: "consumers-b2c-impulse"
3. ProcessWireframe passes IDs: ["consumers-b2c-impulse"]
4. Assessment API receives IDs: ["consumers-b2c-impulse"]
5. ❌ API uses raw ID in prompt: "consumers-b2c-impulse, Fact-Checker"
6. ❌ AI gets no context about who this persona is
```

### Expected Flow (Fixed)

```
1. User selects: "Spontaneous Shopper" (consumers-b2c-impulse)
2. CentralHexView stores ID: "consumers-b2c-impulse"
3. ProcessWireframe passes IDs: ["consumers-b2c-impulse"]
4. Assessment API receives IDs: ["consumers-b2c-impulse"]
5. ✅ API loads: /data/persona-content/consumers-b2c-impulse.json
6. ✅ Extracts: name, context, description, detailedProfile
7. ✅ Builds system prompt with full persona details
8. ✅ AI gets: "Spontaneous Shopper, Fact-Checker" + full context
```

---

## Fix Implemented

### 1. Added Persona Content Loader

**File:** `/api/databricks/assessment/run.js`

```javascript
import fs from 'fs';
import path from 'path';

// Helper function to load persona content from JSON files
function loadPersonaContent(personaId) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'persona-content', `${personaId}.json`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.warn(`[Assessment] Could not load persona content for ${personaId}:`, error.message);
    // Return a fallback with just the ID as the name
    return {
      id: personaId,
      name: personaId,
      context: `Expert perspective from ${personaId}`,
      suggestedPrompts: []
    };
  }
}
```

### 2. Updated Persona Loading Logic

**Before:**
```javascript
const basePersonas = selectedPersonas?.length > 0 ? [...selectedPersonas] : ['General Expert'];
const shuffledPersonas = shuffleArray(basePersonas);
const personaList = [...shuffledPersonas, 'Fact-Checker'].join(', ');
// ❌ Uses raw IDs: "consumers-b2c-impulse, luminaries-tech-cto, Fact-Checker"
```

**After:**
```javascript
const basePersonas = selectedPersonas?.length > 0 ? [...selectedPersonas] : ['General Expert'];

// Load persona content from JSON files
console.log(`[Assessment] Loading persona content for ${basePersonas.length} personas...`);
const personaData = basePersonas.map(personaId => {
  const content = loadPersonaContent(personaId);
  console.log(`[Assessment] Loaded persona: ${content.name} (${personaId})`);
  return content;
});

const shuffledPersonaData = shuffleArray(personaData);
const personaNames = shuffledPersonaData.map(p => p.name);
const personaList = [...personaNames, 'Fact-Checker'].join(', ');
// ✅ Uses real names: "Spontaneous Shopper, Bill Bernbach, Fact-Checker"
```

### 3. Added Persona Context Section

**New section in system prompt:**
```javascript
// Build persona context section with each persona's background
const personaContextSection = shuffledPersonaData.map(persona => {
  return `### ${persona.name}
Context: ${persona.context}
${persona.description ? `Description: ${persona.description}` : ''}
${persona.detailedProfile ? `Profile: ${persona.detailedProfile.substring(0, 500)}...` : ''}`;
}).join('\n\n');

const systemPrompt = `You are facilitating a multi-persona collaborative assessment for ${brand}.

KNOWLEDGE BASE:
${kbContext}

PERSONA DETAILS:
${personaContextSection}

CITATION RULES (strictly enforced):
...
`;
```

---

## Example Transformation

### Input from Frontend
```json
{
  "selectedPersonas": [
    "consumers-b2c-impulse",
    "luminaries-tech-cto",
    "panelist-millennial-parent"
  ]
}
```

### Loaded Persona Data
```json
[
  {
    "id": "consumers-b2c-impulse",
    "name": "Spontaneous Shopper",
    "description": "Quick, emotion-driven purchases",
    "context": "A consumer who makes rapid purchase decisions based on immediate desires...",
    "detailedProfile": "This persona represents individuals who prioritize immediate gratification..."
  },
  {
    "id": "luminaries-tech-cto",
    "name": "Tech CTO",
    "description": "Technology executive perspective",
    "context": "Chief Technology Officer with enterprise experience in digital transformation...",
    "detailedProfile": "CTOs bring a strategic lens to technology evaluation..."
  },
  {
    "id": "panelist-millennial-parent",
    "name": "Millennial Parent",
    "description": "Balancing family needs with personal values",
    "context": "A parent aged 28-43 navigating child-rearing while managing career...",
    "detailedProfile": "Millennial parents represent a unique demographic blend..."
  }
]
```

### System Prompt Sent to AI
```
You are facilitating a multi-persona collaborative assessment for Nike.

KNOWLEDGE BASE:
--- BEGIN FILE: Nike_Brand_Study.pdf ---
[file content]
--- END FILE: Nike_Brand_Study.pdf ---

PERSONA DETAILS:

### Spontaneous Shopper
Context: A consumer who makes rapid purchase decisions based on immediate desires...
Description: Quick, emotion-driven purchases
Profile: This persona represents individuals who prioritize immediate gratification...

### Tech CTO
Context: Chief Technology Officer with enterprise experience in digital transformation...
Description: Technology executive perspective
Profile: CTOs bring a strategic lens to technology evaluation...

### Millennial Parent
Context: A parent aged 28-43 navigating child-rearing while managing career...
Description: Balancing family needs with personal values
Profile: Millennial parents represent a unique demographic blend...

CITATION RULES (strictly enforced):
- Every factual claim MUST be cited: [Source: exact_filename.ext]
...

Task: Collaborate to produce a unified, actionable recommendation for Nike in the Consumers context.
Personas (in this order): Spontaneous Shopper, Tech CTO, Millennial Parent, Fact-Checker

Begin Round 1 now.
```

---

## Persona Data Flow

### Complete Journey

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Interface (CentralHexView.tsx)                          │
│    - User selects personas via 3-level hierarchy                │
│    - Stores IDs: ["consumers-b2c-impulse", "luminaries-tech-cto"]│
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. ProcessWireframe.tsx (handleCentralHexExecute)               │
│    - Receives persona IDs from CentralHexView                   │
│    - Passes to AssessmentModal via setAssessmentModalProps      │
│    - selectedPersonas: ["consumers-b2c-impulse", ...]           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. AssessmentModal.tsx                                          │
│    - Opens modal, shows streaming UI                            │
│    - Calls: /api/databricks/assessment/run.js                  │
│    - Sends: { selectedPersonas: [...], kbFiles: [...] }        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Assessment API (/api/databricks/assessment/run.js)          │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │ Step A: Load Persona Content                            │ │
│    │   - For each ID: "consumers-b2c-impulse"                │ │
│    │   - Read: /data/persona-content/consumers-b2c-impulse.json│ │
│    │   - Parse JSON → persona object with full details      │ │
│    └─────────────────────────────────────────────────────────┘ │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │ Step B: Shuffle Personas                                │ │
│    │   - Randomize order (prevent anchoring)                 │ │
│    │   - Extract persona names                               │ │
│    └─────────────────────────────────────────────────────────┘ │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │ Step C: Build System Prompt                             │ │
│    │   - Include persona context sections                    │ │
│    │   - Add KB file contents                                │ │
│    │   - Add citation rules                                  │ │
│    └─────────────────────────────────────────────────────────┘ │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │ Step D: Execute AI Rounds                               │ │
│    │   - Personas contribute with full context               │ │
│    │   - Fact-Checker verifies citations                     │ │
│    │   - Summarizer creates neutral summary                  │ │
│    └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
/data/persona-content/
├── consumers-b2c-impulse.json      ← Loaded by API
├── consumers-b2c-research.json     ← Loaded by API
├── luminaries-tech-cto.json        ← Loaded by API
├── panelist-millennial-parent.json ← Loaded by API
├── david-ogilvy.json               ← Loaded by API
├── bill-bernbach.json              ← Loaded by API
└── ...

/data/personas.ts                   ← Defines structure/hierarchy only
/components/CentralHexView.tsx      ← Collects persona IDs from user
/components/ProcessWireframe.tsx    ← Passes IDs to API
/api/databricks/assessment/run.js   ← Loads content, builds prompts ✅
```

---

## Persona JSON Format

Each persona file must have at minimum:

```json
{
  "id": "consumers-b2c-impulse",
  "name": "Spontaneous Shopper",
  "description": "Quick, emotion-driven purchases",
  "context": "A consumer who makes rapid purchase decisions...",
  "suggestedPrompts": ["Evaluate emotional appeal", "..."]
}
```

**Optional fields** (used if present):
- `detailedProfile`: Long-form persona background
- `demographics`: Age, income, location, etc.
- `psychographics`: Values, interests, concerns
- `exampleQuotes`: Things this persona might say
- `keyInsights`: Important facts about the persona

---

## Console Output Example

When assessment runs, you'll see:

```
[Assessment] Starting — hex: Consumers, brand: Nike
[Assessment] Types: unified
[Assessment] Personas (pre-shuffle): consumers-b2c-impulse,luminaries-tech-cto
[Assessment] Loading persona content for 2 personas...
[Assessment] Loaded persona: Spontaneous Shopper (consumers-b2c-impulse)
[Assessment] Loaded persona: Tech CTO (luminaries-tech-cto)
[Assessment] Personas (post-shuffle): Tech CTO, Spontaneous Shopper, Fact-Checker
[Assessment] Round 1...
[Assessment] Round 1 done (2847 chars)
[Assessment] Round 2...
[Assessment] Round 2 done (3124 chars)
[Assessment] Running summarizer pass...
[Assessment] Summarizer done (892 chars)
[Assessment] Complete — 2 rounds, 3 citations, summary: yes
```

---

## Benefits

✅ **Proper Persona Context** - AI receives full persona background, not just IDs  
✅ **Richer Assessments** - Personas can respond with authentic voice and perspective  
✅ **Fallback Handling** - If JSON file missing, gracefully uses ID as name  
✅ **Server-Side Security** - Persona content never sent to client, stays in API  
✅ **Flexible Content** - Can update persona details without changing code  
✅ **Debug Logging** - Clear console output shows which personas loaded

---

## Testing Checklist

- [x] Persona IDs collected correctly in CentralHexView
- [x] IDs passed to ProcessWireframe.handleCentralHexExecute
- [x] IDs sent to assessment API
- [x] API loads JSON files successfully
- [x] Fallback works for missing personas
- [x] Persona names appear in system prompt
- [x] Persona context included in system prompt
- [x] Shuffle randomizes persona order
- [x] Fact-Checker always appended last
- [x] AI uses persona names in responses
- [x] Console logs show loaded personas

---

## Related Files

- `/components/CentralHexView.tsx` - Persona selection UI
- `/components/ProcessWireframe.tsx` - Data flow orchestration
- `/api/databricks/assessment/run.js` - Persona content loading ✅
- `/data/personas.ts` - Persona hierarchy structure
- `/data/persona-content/*.json` - Individual persona content files

---

**Implementation Complete:** March 9, 2026  
**Fix Type:** Critical - Enables proper persona-based assessments ✅
