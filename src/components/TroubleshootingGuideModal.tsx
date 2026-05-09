//Troubleshooting Guide Modal 
import { AlertCircle } from 'lucide-react';

interface TestResult {
  id: string;
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending' | 'running' | 'skipped';
  message: string;
  duration?: number;
  timestamp?: Date;
  expected?: string;
  received?: string;
  element?: string;
}

interface TroubleshootingGuideModalProps {
  onClose: () => void;
  testResults: TestResult[];
  selectedCategory?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TROUBLESHOOTING DATABASE - Maps test IDs to fix instructions
// ══════════════════════════════════════════════════════════════════════════════

const TROUBLESHOOTING_DB: Record<string, {
  title: string;
  symptom: string;
  whatThisMeans: string[];
  commonCauses: string[];
  howToFix: string;
  codeExample?: string;
  relatedFiles: string[];
}> = {
  // ── CORE NAVIGATION TESTS ──────────────────────────────────────────────────
  'nav-hex-count': {
    title: 'All 13 Hexagons Not Rendered',
    symptom: 'Only X/13 hexagons appearing in workflow',
    whatThisMeans: [
      'Not all hexagons are visible in the workflow',
      'Some hexagons are hidden or not rendering',
      'Template settings may be restricting visibility'
    ],
    commonCauses: [
      'Template visibility settings - Current template has visibleSteps that excludes some hexes',
      'Component rendering error - ProcessFlow.tsx has errors preventing hex rendering',
      'Missing hex definitions - processSteps array in ProcessFlow.tsx is incomplete'
    ],
    howToFix: '1. Open TemplateManager and verify all hexes are visible in current template\n2. Check ProcessFlow.tsx and verify all 13 hexes are defined in processSteps array\n3. Check browser console for React component errors',
    codeExample: `// ProcessFlow.tsx - Ensure all 13 hexes are defined
const processSteps = [
  { id: 'enter', label: 'Enter', ... },
  { id: 'colleagues', label: 'Colleagues', ... },
  { id: 'luminaries', label: 'Luminaries', ... },
  { id: 'culturalVoices', label: 'Cultural Voices', ... },
  { id: 'stories', label: 'Stories', ... },
  { id: 'competitors', label: 'Competitors', ... },
  { id: 'socialListening', label: 'Social Listening', ... },
  { id: 'consumers', label: 'Consumers', ... },
  { id: 'grade', label: 'Score Results', ... },
  { id: 'action', label: 'Findings', ... },
  { id: 'research', label: 'Knowledge Base', ... },
  { id: 'wisdom', label: 'Share Your Wisdom', ... },
  { id: 'myFiles', label: 'My Files', ... }
];`,
    relatedFiles: ['/components/ProcessFlow.tsx', '/components/TemplateManager.tsx']
  },

  'nav-hex-colors': {
    title: 'Hexagons Missing SVG Colors',
    symptom: 'Hexagons rendering but without visual styling',
    whatThisMeans: [
      'Hexagons are rendering but without SVG graphics',
      'Color styling is broken or missing',
      'HexagonBreadcrumb component not rendering properly'
    ],
    commonCauses: [
      'HexagonBreadcrumb Component Issue - SVG element not rendering',
      'Missing stepColors Import - Colors not imported from cohive-theme.ts',
      'Invalid Color Value - Hex doesn\'t have a valid color in stepColors'
    ],
    howToFix: '1. Check HexagonBreadcrumb.tsx renders SVG element with fill color\n2. Verify stepColors import from cohive-theme.ts\n3. Ensure each hex has a valid color in stepColors object',
    codeExample: `// HexagonBreadcrumb.tsx
<svg viewBox="0 0 100 100">
  <polygon 
    points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
    fill={color}  // ← Ensure color prop is used
  />
</svg>

// Import stepColors
import { stepColors } from '../styles/cohive-theme';`,
    relatedFiles: ['/components/HexagonBreadcrumb.tsx', '/styles/cohive-theme.ts']
  },

  'nav-hex-clickable': {
    title: 'Hexagons Not Clickable',
    symptom: 'Cannot click hexagons to navigate',
    whatThisMeans: [
      'User cannot click hexagons to navigate',
      'onClick handlers are missing or not working',
      'Navigation is completely broken'
    ],
    commonCauses: [
      'Missing Button Wrapper - Hexagons not wrapped in <button> elements',
      'onClick Handler Undefined - handleHexClick function missing',
      'Event Listener Not Attached - onClick prop not passed correctly'
    ],
    howToFix: '1. Ensure each hexagon is wrapped in a <button> element\n2. Verify handleHexClick function is defined\n3. Pass onClick handler to button wrapper',
    codeExample: `// ProcessFlow.tsx - Wrap hexagons in buttons
<button
  onClick={() => handleHexClick(stepId)}
  className="cursor-pointer focus:outline-none"
>
  <HexagonBreadcrumb
    label={step.label}
    color={stepColors[step.id]}
    status={step.status}
  />
</button>`,
    relatedFiles: ['/components/ProcessFlow.tsx']
  },

  'nav-template-btn': {
    title: 'Template Settings Button Missing',
    symptom: 'Cannot find "Manage Templates" button',
    whatThisMeans: [
      'Users cannot access template configuration',
      'Settings button removed from header',
      'Template management is inaccessible'
    ],
    commonCauses: [
      'Button Removed - Settings button commented out or deleted from code',
      'Conditional Rendering - Button hidden by logic',
      'Header Component Error - ProcessWireframe header has rendering errors'
    ],
    howToFix: '1. Check ProcessWireframe.tsx header section\n2. Look for Settings icon button\n3. Verify button isn\'t hidden by conditional logic',
    codeExample: `// ProcessWireframe.tsx - Add Settings button
import { Settings } from 'lucide-react';

<button
  onClick={() => setShowTemplateManager(true)}
  className="p-2 hover:bg-gray-100 rounded"
  title="Manage Templates"
>
  <Settings className="w-5 h-5" />
</button>`,
    relatedFiles: ['/components/ProcessWireframe.tsx']
  },

  // ── ENTER HEX TESTS ────────────────────────────────────────────────────────
  'enter-brand-input': {
    title: 'Brand Input Field Not Working',
    symptom: 'Brand input field not accepting text or not visible',
    whatThisMeans: [
      'Users cannot enter brand name',
      'Input field is missing or disabled',
      'Enter hex form is broken'
    ],
    commonCauses: [
      'Input Field Missing - Brand input not rendered in CentralHexView',
      'Input Disabled - Field has disabled attribute',
      'State Not Connected - Input value not connected to state',
      'Event Handler Missing - onChange handler not defined'
    ],
    howToFix: '1. Navigate to Enter hex\n2. Check CentralHexView.tsx for brand input rendering\n3. Verify input has onChange handler and value prop\n4. Check brand state management',
    codeExample: `// CentralHexView.tsx - Brand input
<input
  type="text"
  value={brand}
  onChange={(e) => setBrand(e.target.value)}
  placeholder="Enter brand name"
  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
/>`,
    relatedFiles: ['/components/CentralHexView.tsx', '/components/ProcessWireframe.tsx']
  },

  'enter-project-type': {
    title: 'Project Type Dropdown Not Working',
    symptom: 'Cannot select project type or dropdown missing',
    whatThisMeans: [
      'Users cannot select project type',
      'Dropdown is missing or not populated',
      'Project type list is empty'
    ],
    commonCauses: [
      'Dropdown Missing - Select element not rendered',
      'No Options - Project type list is empty',
      'State Not Connected - Selected value not connected to state',
      'Options Not Loading - systemProjectTypes or user project types not loading'
    ],
    howToFix: '1. Check CentralHexView.tsx for project type dropdown\n2. Verify systemProjectTypes is imported\n3. Check user project types in localStorage (cohive_project_type_configs)\n4. Ensure onChange handler updates state',
    codeExample: `// CentralHexView.tsx - Project type dropdown
<select
  value={projectType}
  onChange={(e) => setProjectType(e.target.value)}
  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
>
  <option value="">Select Project Type</option>
  {systemProjectTypes.map(type => (
    <option key={type.name} value={type.name}>{type.name}</option>
  ))}
</select>`,
    relatedFiles: ['/components/CentralHexView.tsx', '/data/systemProjectTypes.ts']
  },

  'enter-save-button': {
    title: 'Save Button Not Working',
    symptom: 'Save button missing or not saving data',
    whatThisMeans: [
      'Cannot save brand and project type',
      'Data not persisting to localStorage',
      'Save button not triggering save function'
    ],
    commonCauses: [
      'Button Missing - Save button not rendered',
      'onClick Handler Missing - Save function not attached',
      'localStorage Not Updating - Save function not writing to storage',
      'Button Disabled - Save button has disabled state when it shouldn\'t'
    ],
    howToFix: '1. Check for Save button in Enter hex view\n2. Verify onClick handler calls save function\n3. Check save function writes to localStorage\n4. Verify button is not disabled incorrectly',
    codeExample: `// CentralHexView.tsx - Save button
<button
  onClick={handleSave}
  className="px-6 py-3 bg-blue-600 text-white rounded-lg"
>
  Save
</button>

const handleSave = () => {
  localStorage.setItem('cohive_brand', brand);
  localStorage.setItem('cohive_project_type', projectType);
};`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'enter-brand-validation': {
    title: 'Brand Name Validation Failed',
    symptom: 'Empty or whitespace-only brand name accepted',
    whatThisMeans: [
      'Brand name is empty or contains only spaces',
      'Input validation is not working',
      'Data quality issue at entry point'
    ],
    commonCauses: [
      'No Validation Logic - Input accepts any value including empty strings',
      'trim() Not Used - Whitespace-only strings pass validation',
      'Save Handler Missing Check - Data saved without validation',
      'User Cleared Field - Brand was deleted after initial entry'
    ],
    howToFix: '1. Add validation before saving brand\n2. Use trim() to remove whitespace\n3. Prevent save if brand is empty\n4. Show error message to user',
    codeExample: `// CentralHexView.tsx - Brand validation
const handleSave = () => {
  const trimmedBrand = brand.trim();
  
  if (!trimmedBrand) {
    toast.error('Brand name cannot be empty');
    return;
  }
  
  localStorage.setItem('cohive_brand', trimmedBrand);
  localStorage.setItem('cohive_project_type', projectType);
  toast.success('Saved successfully');
};`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'enter-project-type-required': {
    title: 'Project Type Required Validation Failed',
    symptom: 'User can proceed without selecting project type',
    whatThisMeans: [
      'Project type selection is not enforced',
      'Workflow can start without required data',
      'Assessment will fail without project type'
    ],
    commonCauses: [
      'No Required Validation - Save allows empty project type',
      'Default Empty Value - Dropdown has no placeholder/disabled option',
      'Navigation Not Blocked - User can navigate away without selecting',
      'State Reset Issue - Project type cleared unintentionally'
    ],
    howToFix: '1. Add required validation before save\n2. Disable save button if no project type selected\n3. Show error message if validation fails\n4. Add required attribute to select element',
    codeExample: `// CentralHexView.tsx - Project type validation
const handleSave = () => {
  if (!projectType || projectType.trim() === '') {
    toast.error('Please select a project type');
    return;
  }
  
  localStorage.setItem('cohive_brand', brand.trim());
  localStorage.setItem('cohive_project_type', projectType);
};

// Disable save button when invalid
<button
  onClick={handleSave}
  disabled={!brand.trim() || !projectType}
  className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
>
  Save
</button>`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'enter-reload-recovery': {
    title: 'Page Reload Recovery Failed',
    symptom: 'Brand and project type lost after page refresh',
    whatThisMeans: [
      'Data does not survive page reload',
      'localStorage not persisting correctly',
      'Session data is volatile'
    ],
    commonCauses: [
      'localStorage Not Writing - Save function not actually writing to storage',
      'Browser Private Mode - localStorage disabled in incognito/private browsing',
      'localStorage Quota Full - Storage limit reached',
      'Wrong Key Names - Reading from different key than writing to',
      'Data Cleared on Load - Restart button or initialization clearing data'
    ],
    howToFix: '1. Check browser console for localStorage errors\n2. Verify not in private/incognito mode\n3. Check localStorage in DevTools Application tab\n4. Ensure consistent key names for read/write\n5. Test with small dataset to rule out quota issues',
    codeExample: `// CentralHexView.tsx - Proper persistence
// WRITE (on save)
const handleSave = () => {
  try {
    localStorage.setItem('cohive_brand', brand);
    localStorage.setItem('cohive_project_type', projectType);
    toast.success('Saved');
  } catch (error) {
    console.error('localStorage write failed:', error);
    toast.error('Failed to save - check browser storage');
  }
};

// READ (on component mount)
useEffect(() => {
  const savedBrand = localStorage.getItem('cohive_brand');
  const savedProjectType = localStorage.getItem('cohive_project_type');
  
  if (savedBrand) setBrand(savedBrand);
  if (savedProjectType) setProjectType(savedProjectType);
}, []);`,
    relatedFiles: ['/components/CentralHexView.tsx', '/components/ProcessWireframe.tsx']
  },

  'enter-user-project-types': {
    title: 'User-Defined Project Types Not Loading',
    symptom: 'Only system project types visible, custom types missing',
    whatThisMeans: [
      'Custom project types from data-scientists not appearing',
      'Dual-source architecture not working',
      'Only seeing built-in system types'
    ],
    commonCauses: [
      'Not Initialized - Project types not loaded from Databricks',
      'Merge Logic Broken - System and user types not being combined',
      'Filter Error - User types filtered out incorrectly',
      'No User Types Created - No custom types exist yet (expected for new workspace)',
      'isSystem Flag Missing - Project types don\'t have isSystem property'
    ],
    howToFix: '1. Check cohive_available_project_types in localStorage\n2. Verify each type has isSystem boolean flag\n3. Check merge logic combines system + user types\n4. If data-scientist role, create test custom project type\n5. Verify Databricks sync is fetching user project types',
    codeExample: `// ProcessWireframe.tsx - Merge system and user types
import { systemProjectTypes } from '../data/systemProjectTypes';

useEffect(() => {
  // Fetch user-defined types from Databricks or localStorage
  const userTypes = JSON.parse(
    localStorage.getItem('cohive_project_type_configs') || '[]'
  );
  
  // Mark system types
  const systemTypesMarked = systemProjectTypes.map(t => ({
    ...t,
    isSystem: true
  }));
  
  // Mark user types
  const userTypesMarked = userTypes.map(t => ({
    ...t,
    isSystem: false
  }));
  
  // Merge both
  const allTypes = [...systemTypesMarked, ...userTypesMarked];
  localStorage.setItem('cohive_available_project_types', JSON.stringify(allTypes));
}, []);`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/data/systemProjectTypes.ts', '/components/ResearchView.tsx']
  },

  'enter-save-feedback': {
    title: 'Save Success Feedback Missing',
    symptom: 'No visual confirmation when data is saved',
    whatThisMeans: [
      'Users don\'t know if save was successful',
      'Poor user experience - no feedback loop',
      'Toast notification system not working'
    ],
    commonCauses: [
      'No Toast Library - Sonner or notification system not installed',
      'Toast Not Called - Save function doesn\'t trigger notification',
      'Toaster Component Missing - <Toaster /> not rendered in app',
      'Toast Import Error - toast() function not imported correctly'
    ],
    howToFix: '1. Install sonner toast library if missing\n2. Add <Toaster /> to ProcessWireframe.tsx\n3. Import and call toast() in save function\n4. Test with toast.success() after successful save',
    codeExample: `// ProcessWireframe.tsx - Add Toaster component
import { Toaster } from 'sonner@2.0.3';

export function ProcessWireframe() {
  return (
    <div>
      <Toaster position="top-right" />
      {/* rest of component */}
    </div>
  );
}

// CentralHexView.tsx - Add toast notification
import { toast } from 'sonner@2.0.3';

const handleSave = () => {
  try {
    localStorage.setItem('cohive_brand', brand);
    localStorage.setItem('cohive_project_type', projectType);
    toast.success('Brand and project type saved!');
  } catch (error) {
    toast.error('Failed to save');
  }
};`,
    relatedFiles: ['/components/CentralHexView.tsx', '/components/ProcessWireframe.tsx']
  },

  // ── DATABRICKS TESTS ───────────────────────────────────────────────────────
  'db-oauth': {
    title: 'Databricks Authentication Not Working',
    symptom: 'Not authenticated with Databricks',
    whatThisMeans: [
      'OAuth flow not completed',
      'Running in mock mode (Figma Make environment)',
      'Cannot access real Knowledge Base'
    ],
    commonCauses: [
      'Mock Mode Active - Running in Figma Make (expected behavior)',
      'OAuth Not Completed - User dismissed or skipped authentication',
      'Authentication Failed - OAuth popup closed or errored'
    ],
    howToFix: '1. Check if running in Figma Make (mock mode is auto-enabled)\n2. If not mock mode, complete OAuth flow\n3. Verify databricks_authenticated in localStorage',
    codeExample: `// Check authentication status
const isAuthenticated = localStorage.getItem('databricks_authenticated');
const isMockMode = localStorage.getItem('cohive_mock_mode') === 'true';

// If mock mode, this is expected
// If production, complete OAuth in authentication modal`,
    relatedFiles: ['/components/DatabricksAuthModal.tsx']
  },

  // ── TEMPLATE TESTS ─────────────────────────────────────────────────────────
  'template-storage': {
    title: 'No Templates Found',
    symptom: 'Template system not initialized',
    whatThisMeans: [
      'No templates in localStorage',
      'First-time user or localStorage cleared',
      'Cannot manage workflow visibility'
    ],
    commonCauses: [
      'First Time User - No templates created yet',
      'localStorage Cleared - Browser data was cleared',
      'Initialization Failed - Default templates not loaded on startup'
    ],
    howToFix: '1. Open TemplateManager\n2. Create a new template manually\n3. Or check TemplateManager.tsx for default template initialization',
    codeExample: `// TemplateManager.tsx - Initialize defaults
useEffect(() => {
  const templates = localStorage.getItem('cohive_templates');
  if (!templates) {
    const defaultTemplates = [
      {
        id: 'default-researcher',
        name: 'Default Researcher',
        role: 'researcher',
        visibleSteps: ['all']
      }
    ];
    localStorage.setItem('cohive_templates', JSON.stringify(defaultTemplates));
  }
}, []);`,
    relatedFiles: ['/components/TemplateManager.tsx']
  },

  // ── KNOWLEDGE BASE TESTS ───────────────────────────────────────────────────
  'kb-modes': {
    title: 'Knowledge Base Modes Missing',
    symptom: 'Only X/4 Knowledge Base modes visible',
    whatThisMeans: [
      'Cannot access all Knowledge Base functionality',
      'Mode buttons not rendering',
      'Some modes hidden due to role restrictions'
    ],
    commonCauses: [
      'Role-Based Visibility - Workspace mode is admin-only',
      'Component Error - ResearchView.tsx mode buttons not rendering',
      'Missing Mode Definitions - Modes not defined in state'
    ],
    howToFix: '1. Check user role (Workspace mode requires administrator role)\n2. Navigate to Knowledge Base hex\n3. Check ResearchView.tsx for mode button rendering',
    codeExample: `// Expected modes:
// 1. Synthesis - Upload research, create insights
// 2. Personas - Manage persona library
// 3. Read/Edit/Approve - File approval workflow
// 4. Workspace - Admin-only Databricks operations

// ResearchView.tsx - Check mode rendering
{modes.map(mode => {
  if (mode.adminOnly && userRole !== 'administrator') return null;
  return <button key={mode.id}>{mode.label}</button>
})}`,
    relatedFiles: ['/components/ResearchView.tsx']
  },

  'kb-file-upload': {
    title: 'File Upload Not Working',
    symptom: 'Cannot upload files to Knowledge Base',
    whatThisMeans: [
      'File upload input missing',
      'Upload functionality broken',
      'Users cannot add research files'
    ],
    commonCauses: [
      'Wrong Mode - Upload only available in Synthesis/Workspace modes',
      'Permission Issue - Non-researchers cannot upload to Knowledge Base',
      'Input Missing - File input element not rendered'
    ],
    howToFix: '1. Navigate to Knowledge Base > Synthesis mode\n2. Check user role (must be researcher or admin)\n3. Verify file input element is rendered',
    codeExample: `// ResearchView.tsx - File upload
{(mode === 'synthesis' && isResearcher) && (
  <input
    type="file"
    onChange={handleFileUpload}
    accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv"
  />
)}`,
    relatedFiles: ['/components/ResearchView.tsx']
  },

  // ── ASSESSMENT TESTS ───────���───────────────────────────────────────────────
  'assessment-types': {
    title: 'Assessment Type Buttons Missing',
    symptom: 'Cannot select Assess/Recommend/Unified',
    whatThisMeans: [
      'Cannot run AI assessments',
      'Assessment buttons not visible',
      'Not on a persona hex'
    ],
    commonCauses: [
      'Not on Persona Hex - Assessment only available on persona hexes (Colleagues, Luminaries, etc.)',
      'Component Not Rendering - CentralHexView assessment section has errors',
      'Conditional Logic - Assessment section hidden'
    ],
    howToFix: '1. Navigate to a persona hex (Colleagues, Luminaries, Consumers, etc.)\n2. Check CentralHexView.tsx renders assessment buttons\n3. Verify isPersonaHex logic is correct',
    codeExample: `// Assessment available on these hexes:
const personaHexes = [
  'colleagues', 'luminaries', 'consumers',
  'culturalVoices', 'stories', 'competitors', 'socialListening'
];

// CentralHexView.tsx
{isPersonaHex && (
  <div className="assessment-section">
    <button onClick={() => setAssessmentType('assess')}>Assess</button>
    <button onClick={() => setAssessmentType('recommend')}>Recommend</button>
    <button onClick={() => setAssessmentType('unified')}>Unified</button>
  </div>
)}`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  // ── COLLEAGUES HEX TESTS ───────────────────────────────────────────────────
  'colleagues-persona-selection': {
    title: 'Persona Selection Not Working',
    symptom: 'Cannot select colleague personas with checkboxes',
    whatThisMeans: [
      'Persona checkboxes not rendering',
      'Not on Colleagues hex Step 2',
      'Persona library not loaded'
    ],
    commonCauses: [
      'Wrong Step - Must be on Step 2 (Select Personas) in Colleagues hex',
      'Persona Data Missing - Persona library not loaded from /data/personas.ts',
      'Checkbox Rendering Error - CentralHexView not rendering persona checkboxes',
      'No Personas for Hex - getPersonasForHex() returning empty array'
    ],
    howToFix: '1. Navigate to Colleagues hex\n2. Complete Step 1 (select files) and click Next\n3. Verify Step 2 displays persona checkboxes\n4. Check /data/personas.ts has Colleagues personas defined',
    codeExample: `// CentralHexView.tsx - Persona rendering
import { getPersonasForHex } from '../data/personas';

const personaConfig = getPersonasForHex('Colleagues');

// Render checkboxes
{personaConfig.level1Personas.map(persona => (
  <label key={persona.id}>
    <input
      type="checkbox"
      id={\`persona-\${persona.id}\`}
      checked={selectedPersonas.includes(persona.id)}
      onChange={() => togglePersona(persona.id)}
    />
    {persona.name}
  </label>
))}`,
    relatedFiles: ['/components/CentralHexView.tsx', '/data/personas.ts']
  },

  'colleagues-file-selection': {
    title: 'Research File Selection Not Working',
    symptom: 'No research files available for Colleagues hex',
    whatThisMeans: [
      'Knowledge Base has no research files',
      'Files not approved for use',
      'File selection step not working'
    ],
    commonCauses: [
      'No Files Uploaded - Knowledge Base is empty (expected for new workspace)',
      'No Approved Files - All files are pending approval (non-researchers see only approved)',
      'localStorage Empty - cohive_research_files not populated',
      'Filter Error - Files being filtered out incorrectly'
    ],
    howToFix: '1. Navigate to Knowledge Base hex\n2. Upload research files in Synthesis mode\n3. If non-researcher, ensure files are approved\n4. Return to Colleagues hex and verify files appear in Step 1',
    codeExample: `// Expected localStorage structure:
localStorage.setItem('cohive_research_files', JSON.stringify([
  {
    id: 'file-1',
    fileName: 'Research.pdf',
    brand: 'Nike',
    projectType: 'Creative Messaging',
    isApproved: true,
    uploadDate: Date.now(),
    fileType: 'research'
  }
]));

// CentralHexView.tsx - File filtering
const relevantFiles = researchFiles.filter(file => file.isApproved);`,
    relatedFiles: ['/components/CentralHexView.tsx', '/components/ResearchView.tsx']
  },

  'colleagues-assessment-type': {
    title: 'Assessment Type Configuration Missing',
    symptom: 'Cannot select recommend/assess/unified options',
    whatThisMeans: [
      'Assessment type controls not visible',
      'Default assessment type not set correctly',
      'Not on persona hex workflow'
    ],
    commonCauses: [
      'Not on Persona Hex - Colleagues should be treated as persona hex',
      'isPersonaHex Logic Broken - Colleagues not in isPersonaHex array',
      'Controls Not Rendered - Assessment type checkboxes/buttons missing',
      'Conditional Hidden - UI hidden by template or state logic'
    ],
    howToFix: '1. Navigate to Colleagues hex\n2. Check that Colleagues is in isPersonaHex array\n3. Verify assessment type controls render in Step 3\n4. Default should be "recommend" for persona hexes',
    codeExample: `// CentralHexView.tsx - Persona hex detection
const isPersonaHex = [
  'Consumers', 
  'Luminaries', 
  'Colleagues',  // ← Ensure this is included
  'cultural', 
  'Grade'
].includes(hexId);

// Default assessment type for persona hexes
const [assessmentType, setAssessmentType] = useState<string[]>(
  isPersonaHex ? ["recommend"] : ["unified"]
);`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'colleagues-workflow-nav': {
    title: '3-Step Workflow Navigation Broken',
    symptom: 'Cannot navigate between Step 1→2→3',
    whatThisMeans: [
      'Step navigation buttons not working',
      'Cannot progress through workflow',
      'Stuck on one step'
    ],
    commonCauses: [
      'Next Button Disabled - No files or personas selected',
      'State Not Updating - currentStep state not changing',
      'Navigation Logic Error - onClick handler not calling setCurrentStep',
      'Validation Blocking - Step requirements not met'
    ],
    howToFix: '1. Ensure at least one file is selected before clicking Next (Step 1→2)\n2. Ensure at least one persona is selected before clicking Next (Step 2→3)\n3. Check CentralHexView.tsx for step navigation logic\n4. Verify setCurrentStep is called on Next/Back button clicks',
    codeExample: `// CentralHexView.tsx - Step navigation
const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

// Step 1: Select Files
<button
  onClick={() => setCurrentStep(2)}
  disabled={selectedFiles.length === 0}
>
  Next
</button>

// Step 2: Select Personas
<button onClick={() => setCurrentStep(1)}>Back</button>
<button
  onClick={() => setCurrentStep(3)}
  disabled={selectedPersonas.length === 0}
>
  Next
</button>

// Step 3: Execute
<button onClick={() => setCurrentStep(2)}>Back</button>`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'colleagues-results-persistence': {
    title: 'Execution Results Not Persisting',
    symptom: 'Colleagues hex results not saved or not appearing in history',
    whatThisMeans: [
      'Assessment results are lost',
      'Cannot view previous executions',
      'localStorage not saving hex executions'
    ],
    commonCauses: [
      'No Executions Yet - No assessments have been run (expected)',
      'localStorage Not Writing - onExecute function not saving to storage',
      'Wrong Key - Saving to wrong localStorage key',
      'Parse Error - Corrupted JSON in cohive_hex_executions',
      'Hex ID Mismatch - Saving under different hex ID'
    ],
    howToFix: '1. Run at least one assessment in Colleagues hex\n2. Check cohive_hex_executions in localStorage (DevTools)\n3. Verify executions are saved under "Colleagues" key\n4. Check ProcessWireframe.tsx handleExecuteAssessment function',
    codeExample: `// ProcessWireframe.tsx - Save execution
const handleExecuteAssessment = (selectedFiles, assessmentType, assessment) => {
  const executionData = {
    id: Date.now().toString(),
    selectedFiles,
    assessmentType,
    assessment,
    timestamp: Date.now()
  };
  
  // Save to localStorage
  const executions = JSON.parse(
    localStorage.getItem('cohive_hex_executions') || '{}'
  );
  
  executions['Colleagues'] = [
    ...(executions['Colleagues'] || []),
    executionData
  ];
  
  localStorage.setItem('cohive_hex_executions', JSON.stringify(executions));
};

// Retrieve executions
const colleaguesExecutions = JSON.parse(
  localStorage.getItem('cohive_hex_executions') || '{}'
)['Colleagues'] || [];`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/components/CentralHexView.tsx']
  },

  // ── LUMINARIES HEX TESTS ───────────────────────────────────────────────────
  'luminaries-persona-selection': {
    title: 'Persona Selection Not Working',
    symptom: 'Cannot select luminary personas (industry experts) with checkboxes',
    whatThisMeans: [
      'Persona checkboxes not rendering',
      'Not on Luminaries hex Step 2',
      'Persona library not loaded'
    ],
    commonCauses: [
      'Wrong Step - Must be on Step 2 (Select Personas) in Luminaries hex',
      'Persona Data Missing - Persona library not loaded from /data/personas.ts',
      'Checkbox Rendering Error - CentralHexView not rendering persona checkboxes',
      'No Personas for Hex - getPersonasForHex() returning empty array'
    ],
    howToFix: '1. Navigate to Luminaries hex\n2. Complete Step 1 (select files) and click Next\n3. Verify Step 2 displays persona checkboxes\n4. Check /data/personas.ts has Luminaries personas defined',
    codeExample: `// CentralHexView.tsx - Persona rendering
import { getPersonasForHex } from '../data/personas';

const personaConfig = getPersonasForHex('Luminaries');

// Render checkboxes
{personaConfig.level1Personas.map(persona => (
  <label key={persona.id}>
    <input
      type="checkbox"
      id={\`persona-\${persona.id}\`}
      checked={selectedPersonas.includes(persona.id)}
      onChange={() => togglePersona(persona.id)}
    />
    {persona.name}
  </label>
))}`,
    relatedFiles: ['/components/CentralHexView.tsx', '/data/personas.ts']
  },

  'luminaries-file-selection': {
    title: 'Research File Selection Not Working',
    symptom: 'No research files available for Luminaries hex',
    whatThisMeans: [
      'Knowledge Base has no research files',
      'Files not approved for use',
      'File selection step not working'
    ],
    commonCauses: [
      'No Files Uploaded - Knowledge Base is empty (expected for new workspace)',
      'No Approved Files - All files are pending approval (non-researchers see only approved)',
      'localStorage Empty - cohive_research_files not populated',
      'Filter Error - Files being filtered out incorrectly'
    ],
    howToFix: '1. Navigate to Knowledge Base hex\n2. Upload research files in Synthesis mode\n3. If non-researcher, ensure files are approved\n4. Return to Luminaries hex and verify files appear in Step 1',
    codeExample: `// Expected localStorage structure:
localStorage.setItem('cohive_research_files', JSON.stringify([
  {
    id: 'file-1',
    fileName: 'Industry-Research.pdf',
    brand: 'Nike',
    projectType: 'Creative Messaging',
    isApproved: true,
    uploadDate: Date.now(),
    fileType: 'research'
  }
]));

// CentralHexView.tsx - File filtering
const relevantFiles = researchFiles.filter(file => file.isApproved);`,
    relatedFiles: ['/components/CentralHexView.tsx', '/components/ResearchView.tsx']
  },

  'luminaries-assessment-type': {
    title: 'Assessment Type Configuration Missing',
    symptom: 'Cannot select recommend/assess/unified options',
    whatThisMeans: [
      'Assessment type controls not visible',
      'Default assessment type not set correctly',
      'Not on persona hex workflow'
    ],
    commonCauses: [
      'Not on Persona Hex - Luminaries should be treated as persona hex',
      'isPersonaHex Logic Broken - Luminaries not in isPersonaHex array',
      'Controls Not Rendered - Assessment type checkboxes/buttons missing',
      'Conditional Hidden - UI hidden by template or state logic'
    ],
    howToFix: '1. Navigate to Luminaries hex\n2. Check that Luminaries is in isPersonaHex array\n3. Verify assessment type controls render in Step 3\n4. Default should be "recommend" for persona hexes',
    codeExample: `// CentralHexView.tsx - Persona hex detection
const isPersonaHex = [
  'Consumers', 
  'Luminaries',  // ← Ensure this is included
  'Colleagues', 
  'cultural', 
  'Grade'
].includes(hexId);

// Default assessment type for persona hexes
const [assessmentType, setAssessmentType] = useState<string[]>(
  isPersonaHex ? ["recommend"] : ["unified"]
);`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'luminaries-workflow-nav': {
    title: '3-Step Workflow Navigation Broken',
    symptom: 'Cannot navigate between Step 1→2→3',
    whatThisMeans: [
      'Step navigation buttons not working',
      'Cannot progress through workflow',
      'Stuck on one step'
    ],
    commonCauses: [
      'Next Button Disabled - No files or personas selected',
      'State Not Updating - currentStep state not changing',
      'Navigation Logic Error - onClick handler not calling setCurrentStep',
      'Validation Blocking - Step requirements not met'
    ],
    howToFix: '1. Ensure at least one file is selected before clicking Next (Step 1→2)\n2. Ensure at least one persona is selected before clicking Next (Step 2→3)\n3. Check CentralHexView.tsx for step navigation logic\n4. Verify setCurrentStep is called on Next/Back button clicks',
    codeExample: `// CentralHexView.tsx - Step navigation
const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

// Step 1: Select Files
<button
  onClick={() => setCurrentStep(2)}
  disabled={selectedFiles.length === 0}
>
  Next
</button>

// Step 2: Select Personas
<button onClick={() => setCurrentStep(1)}>Back</button>
<button
  onClick={() => setCurrentStep(3)}
  disabled={selectedPersonas.length === 0}
>
  Next
</button>

// Step 3: Execute
<button onClick={() => setCurrentStep(2)}>Back</button>`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'luminaries-results-persistence': {
    title: 'Execution Results Not Persisting',
    symptom: 'Luminaries hex results not saved or not appearing in history',
    whatThisMeans: [
      'Assessment results are lost',
      'Cannot view previous executions',
      'localStorage not saving hex executions'
    ],
    commonCauses: [
      'No Executions Yet - No assessments have been run (expected)',
      'localStorage Not Writing - onExecute function not saving to storage',
      'Wrong Key - Saving to wrong localStorage key',
      'Parse Error - Corrupted JSON in cohive_hex_executions',
      'Hex ID Mismatch - Saving under different hex ID'
    ],
    howToFix: '1. Run at least one assessment in Luminaries hex\n2. Check cohive_hex_executions in localStorage (DevTools)\n3. Verify executions are saved under "Luminaries" key\n4. Check ProcessWireframe.tsx handleExecuteAssessment function',
    codeExample: `// ProcessWireframe.tsx - Save execution
const handleExecuteAssessment = (selectedFiles, assessmentType, assessment) => {
  const executionData = {
    id: Date.now().toString(),
    selectedFiles,
    assessmentType,
    assessment,
    timestamp: Date.now()
  };
  
  // Save to localStorage
  const executions = JSON.parse(
    localStorage.getItem('cohive_hex_executions') || '{}'
  );
  
  executions['Luminaries'] = [
    ...(executions['Luminaries'] || []),
    executionData
  ];
  
  localStorage.setItem('cohive_hex_executions', JSON.stringify(executions));
};

// Retrieve executions
const luminariesExecutions = JSON.parse(
  localStorage.getItem('cohive_hex_executions') || '{}'
)['Luminaries'] || [];`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/components/CentralHexView.tsx']
  },

  // ── CULTURAL VOICES HEX TESTS ──────────────────────────────────────────────
  'cultural-persona-selection': {
    title: 'Persona Selection Not Working',
    symptom: 'Cannot select cultural perspective personas with checkboxes',
    whatThisMeans: [
      'Persona checkboxes not rendering',
      'Not on Cultural Voices hex Step 2',
      'Persona library not loaded'
    ],
    commonCauses: [
      'Wrong Step - Must be on Step 2 (Select Personas) in Cultural Voices hex',
      'Persona Data Missing - Persona library not loaded from /data/personas.ts',
      'Checkbox Rendering Error - CentralHexView not rendering persona checkboxes',
      'No Personas for Hex - getPersonasForHex() returning empty array'
    ],
    howToFix: '1. Navigate to Cultural Voices hex\n2. Complete Step 1 (select files) and click Next\n3. Verify Step 2 displays persona checkboxes\n4. Check /data/personas.ts has cultural personas defined',
    codeExample: `// CentralHexView.tsx - Persona rendering
import { getPersonasForHex } from '../data/personas';

const personaConfig = getPersonasForHex('cultural');

// Render checkboxes
{personaConfig.level1Personas.map(persona => (
  <label key={persona.id}>
    <input
      type="checkbox"
      id={\`persona-\${persona.id}\`}
      checked={selectedPersonas.includes(persona.id)}
      onChange={() => togglePersona(persona.id)}
    />
    {persona.name}
  </label>
))}`,
    relatedFiles: ['/components/CentralHexView.tsx', '/data/personas.ts']
  },

  'cultural-file-selection': {
    title: 'Research File Selection Not Working',
    symptom: 'No research files available for Cultural Voices hex',
    whatThisMeans: [
      'Knowledge Base has no research files',
      'Files not approved for use',
      'File selection step not working'
    ],
    commonCauses: [
      'No Files Uploaded - Knowledge Base is empty (expected for new workspace)',
      'No Approved Files - All files are pending approval (non-researchers see only approved)',
      'localStorage Empty - cohive_research_files not populated',
      'Filter Error - Files being filtered out incorrectly'
    ],
    howToFix: '1. Navigate to Knowledge Base hex\n2. Upload research files in Synthesis mode\n3. If non-researcher, ensure files are approved\n4. Return to Cultural Voices hex and verify files appear in Step 1',
    codeExample: `// Expected localStorage structure:
localStorage.setItem('cohive_research_files', JSON.stringify([
  {
    id: 'file-1',
    fileName: 'Cultural-Insights.pdf',
    brand: 'Nike',
    projectType: 'Creative Messaging',
    isApproved: true,
    uploadDate: Date.now(),
    fileType: 'research'
  }
]));

// CentralHexView.tsx - File filtering
const relevantFiles = researchFiles.filter(file => file.isApproved);`,
    relatedFiles: ['/components/CentralHexView.tsx', '/components/ResearchView.tsx']
  },

  'cultural-assessment-type': {
    title: 'Assessment Type Configuration Missing',
    symptom: 'Cannot select recommend/assess/unified options',
    whatThisMeans: [
      'Assessment type controls not visible',
      'Default assessment type not set correctly',
      'Not on persona hex workflow'
    ],
    commonCauses: [
      'Not on Persona Hex - Cultural Voices should be treated as persona hex',
      'isPersonaHex Logic Broken - "cultural" not in isPersonaHex array',
      'Controls Not Rendered - Assessment type checkboxes/buttons missing',
      'Conditional Hidden - UI hidden by template or state logic'
    ],
    howToFix: '1. Navigate to Cultural Voices hex\n2. Check that "cultural" is in isPersonaHex array\n3. Verify assessment type controls render in Step 3\n4. Default should be "recommend" for persona hexes',
    codeExample: `// CentralHexView.tsx - Persona hex detection
const isPersonaHex = [
  'Consumers', 
  'Luminaries',
  'Colleagues', 
  'cultural',  // ← Ensure this is included
  'Grade'
].includes(hexId);

// Default assessment type for persona hexes
const [assessmentType, setAssessmentType] = useState<string[]>(
  isPersonaHex ? ["recommend"] : ["unified"]
);`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'cultural-workflow-nav': {
    title: '3-Step Workflow Navigation Broken',
    symptom: 'Cannot navigate between Step 1→2→3',
    whatThisMeans: [
      'Step navigation buttons not working',
      'Cannot progress through workflow',
      'Stuck on one step'
    ],
    commonCauses: [
      'Next Button Disabled - No files or personas selected',
      'State Not Updating - currentStep state not changing',
      'Navigation Logic Error - onClick handler not calling setCurrentStep',
      'Validation Blocking - Step requirements not met'
    ],
    howToFix: '1. Ensure at least one file is selected before clicking Next (Step 1→2)\n2. Ensure at least one persona is selected before clicking Next (Step 2→3)\n3. Check CentralHexView.tsx for step navigation logic\n4. Verify setCurrentStep is called on Next/Back button clicks',
    codeExample: `// CentralHexView.tsx - Step navigation
const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

// Step 1: Select Files
<button
  onClick={() => setCurrentStep(2)}
  disabled={selectedFiles.length === 0}
>
  Next
</button>

// Step 2: Select Personas
<button onClick={() => setCurrentStep(1)}>Back</button>
<button
  onClick={() => setCurrentStep(3)}
  disabled={selectedPersonas.length === 0}
>
  Next
</button>

// Step 3: Execute
<button onClick={() => setCurrentStep(2)}>Back</button>`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'cultural-results-persistence': {
    title: 'Execution Results Not Persisting',
    symptom: 'Cultural Voices hex results not saved or not appearing in history',
    whatThisMeans: [
      'Assessment results are lost',
      'Cannot view previous executions',
      'localStorage not saving hex executions'
    ],
    commonCauses: [
      'No Executions Yet - No assessments have been run (expected)',
      'localStorage Not Writing - onExecute function not saving to storage',
      'Wrong Key - Saving to wrong localStorage key (should be "cultural")',
      'Parse Error - Corrupted JSON in cohive_hex_executions',
      'Hex ID Mismatch - Saving under different hex ID'
    ],
    howToFix: '1. Run at least one assessment in Cultural Voices hex\n2. Check cohive_hex_executions in localStorage (DevTools)\n3. Verify executions are saved under "cultural" key (not "Cultural Voices")\n4. Check ProcessWireframe.tsx handleExecuteAssessment function',
    codeExample: `// ProcessWireframe.tsx - Save execution
const handleExecuteAssessment = (selectedFiles, assessmentType, assessment) => {
  const executionData = {
    id: Date.now().toString(),
    selectedFiles,
    assessmentType,
    assessment,
    timestamp: Date.now()
  };
  
  // Save to localStorage (note: key is "cultural" not "Cultural Voices")
  const executions = JSON.parse(
    localStorage.getItem('cohive_hex_executions') || '{}'
  );
  
  executions['cultural'] = [
    ...(executions['cultural'] || []),
    executionData
  ];
  
  localStorage.setItem('cohive_hex_executions', JSON.stringify(executions));
};

// Retrieve executions
const culturalExecutions = JSON.parse(
  localStorage.getItem('cohive_hex_executions') || '{}'
)['cultural'] || [];`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/components/CentralHexView.tsx']
  },

  // ── STORIES HEX TESTS ──────────────────────────────────────────────────────
  'stories-persona-selection': {
    title: 'Persona Selection Not Working',
    symptom: 'Cannot select stories personas with checkboxes',
    whatThisMeans: [
      'Persona checkboxes not rendering',
      'Not on Stories hex Step 2',
      'Persona library not loaded'
    ],
    commonCauses: [
      'Wrong Step - Must be on Step 2 (Select Personas) in Stories hex',
      'Persona Data Missing - Persona library not loaded from /data/personas.ts',
      'Checkbox Rendering Error - CentralHexView not rendering persona checkboxes',
      'No Personas for Hex - getPersonasForHex() returning empty array'
    ],
    howToFix: '1. Navigate to Stories hex\n2. Complete Step 1 (select files) and click Next\n3. Verify Step 2 displays persona checkboxes\n4. Check /data/personas.ts has Stories personas defined',
    codeExample: `// CentralHexView.tsx - Persona rendering
import { getPersonasForHex } from '../data/personas';

const personaConfig = getPersonasForHex('Stories');

// Render checkboxes
{personaConfig.level1Personas.map(persona => (
  <label key={persona.id}>
    <input
      type="checkbox"
      id={\`persona-\${persona.id}\`}
      checked={selectedPersonas.includes(persona.id)}
      onChange={() => togglePersona(persona.id)}
    />
    {persona.name}
  </label>
))}`,
    relatedFiles: ['/components/CentralHexView.tsx', '/data/personas.ts']
  },

  'stories-file-selection': {
    title: 'Research File Selection Not Working',
    symptom: 'No research files available for Stories hex',
    whatThisMeans: [
      'Knowledge Base has no research files',
      'Files not approved for use',
      'File selection step not working'
    ],
    commonCauses: [
      'No Files Uploaded - Knowledge Base is empty (expected for new workspace)',
      'No Approved Files - All files are pending approval (non-researchers see only approved)',
      'localStorage Empty - cohive_research_files not populated',
      'Filter Error - Files being filtered out incorrectly'
    ],
    howToFix: '1. Navigate to Knowledge Base hex\n2. Upload research files in Synthesis mode\n3. If non-researcher, ensure files are approved\n4. Return to Stories hex and verify files appear in Step 1',
    codeExample: `// Expected localStorage structure:
localStorage.setItem('cohive_research_files', JSON.stringify([
  {
    id: 'file-1',
    fileName: 'Panel-Research.pdf',
    brand: 'Nike',
    projectType: 'Creative Messaging',
    isApproved: true,
    uploadDate: Date.now(),
    fileType: 'research'
  }
]));

// CentralHexView.tsx - File filtering
const relevantFiles = researchFiles.filter(file => file.isApproved);`,
    relatedFiles: ['/components/CentralHexView.tsx', '/components/ResearchView.tsx']
  },

  'stories-assessment-type': {
    title: 'Assessment Type Configuration Missing',
    symptom: 'Cannot select recommend/assess/unified options',
    whatThisMeans: [
      'Assessment type controls not visible',
      'Default assessment type not set correctly',
      'Not on persona hex workflow'
    ],
    commonCauses: [
      'Not on Persona Hex - Stories should be treated as persona hex',
      'isPersonaHex Logic Broken - "Stories" not in isPersonaHex array',
      'Controls Not Rendered - Assessment type checkboxes/buttons missing',
      'Conditional Hidden - UI hidden by template or state logic'
    ],
    howToFix: '1. Navigate to Stories hex\n2. Check that "Stories" is in isPersonaHex array\n3. Verify assessment type controls render in Step 3\n4. Default should be "recommend" for persona hexes',
    codeExample: `// CentralHexView.tsx - Persona hex detection
const isPersonaHex = [
  'Consumers', 
  'Luminaries',
  'Colleagues', 
  'cultural',
  'Stories',  // ← Ensure this is included
  'Grade'
].includes(hexId);

// Default assessment type for persona hexes
const [assessmentType, setAssessmentType] = useState<string[]>(
  isPersonaHex ? ["recommend"] : ["unified"]
);`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'stories-workflow-nav': {
    title: '3-Step Workflow Navigation Broken',
    symptom: 'Cannot navigate between Step 1→2→3',
    whatThisMeans: [
      'Step navigation buttons not working',
      'Cannot progress through workflow',
      'Stuck on one step'
    ],
    commonCauses: [
      'Next Button Disabled - No files or personas selected',
      'State Not Updating - currentStep state not changing',
      'Navigation Logic Error - onClick handler not calling setCurrentStep',
      'Validation Blocking - Step requirements not met'
    ],
    howToFix: '1. Ensure at least one file is selected before clicking Next (Step 1→2)\n2. Ensure at least one persona is selected before clicking Next (Step 2→3)\n3. Check CentralHexView.tsx for step navigation logic\n4. Verify setCurrentStep is called on Next/Back button clicks',
    codeExample: `// CentralHexView.tsx - Step navigation
const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

// Step 1: Select Files
<button
  onClick={() => setCurrentStep(2)}
  disabled={selectedFiles.length === 0}
>
  Next
</button>

// Step 2: Select Personas
<button onClick={() => setCurrentStep(1)}>Back</button>
<button
  onClick={() => setCurrentStep(3)}
  disabled={selectedPersonas.length === 0}
>
  Next
</button>

// Step 3: Execute
<button onClick={() => setCurrentStep(2)}>Back</button>`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'stories-results-persistence': {
    title: 'Execution Results Not Persisting',
    symptom: 'Stories hex results not saved or not appearing in history',
    whatThisMeans: [
      'Assessment results are lost',
      'Cannot view previous executions',
      'localStorage not saving hex executions'
    ],
    commonCauses: [
      'No Executions Yet - No assessments have been run (expected)',
      'localStorage Not Writing - onExecute function not saving to storage',
      'Wrong Key - Saving to wrong localStorage key',
      'Parse Error - Corrupted JSON in cohive_hex_executions',
      'Hex ID Mismatch - Saving under different hex ID'
    ],
    howToFix: '1. Run at least one assessment in Stories hex\n2. Check cohive_hex_executions in localStorage (DevTools)\n3. Verify executions are saved under "Stories" key\n4. Check ProcessWireframe.tsx handleExecuteAssessment function',
    codeExample: `// ProcessWireframe.tsx - Save execution
const handleExecuteAssessment = (selectedFiles, assessmentType, assessment) => {
  const executionData = {
    id: Date.now().toString(),
    selectedFiles,
    assessmentType,
    assessment,
    timestamp: Date.now()
  };
  
  // Save to localStorage
  const executions = JSON.parse(
    localStorage.getItem('cohive_hex_executions') || '{}'
  );
  
  executions['Stories'] = [
    ...(executions['Stories'] || []),
    executionData
  ];
  
  localStorage.setItem('cohive_hex_executions', JSON.stringify(executions));
};

// Retrieve executions
const storiesExecutions = JSON.parse(
  localStorage.getItem('cohive_hex_executions') || '{}'
)['Stories'] || [];`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/components/CentralHexView.tsx']
  },

  // ── COMPETITORS HEX TESTS ───────────────────────────────────────────────────
  'competitors-persona-selection': {
    title: 'Persona Selection Not Working',
    symptom: 'Cannot select competitor analysis personas with checkboxes',
    whatThisMeans: [
      'Persona checkboxes not rendering',
      'Not on Competitors hex Step 2',
      'Persona library not loaded'
    ],
    commonCauses: [
      'Wrong Step - Must be on Step 2 (Select Personas) in Competitors hex',
      'Persona Data Missing - Persona library not loaded from /data/personas.ts',
      'Checkbox Rendering Error - CentralHexView not rendering persona checkboxes',
      'No Personas for Hex - getPersonasForHex() returning empty array'
    ],
    howToFix: '1. Navigate to Competitors hex\n2. Complete Step 1 (select files) and click Next\n3. Verify Step 2 displays persona checkboxes\n4. Check /data/personas.ts has Competitors personas defined',
    codeExample: `// CentralHexView.tsx - Persona rendering
import { getPersonasForHex } from '../data/personas';

const personaConfig = getPersonasForHex('Competitors');

// Render checkboxes
{personaConfig.level1Personas.map(persona => (
  <label key={persona.id}>
    <input
      type="checkbox"
      id={\`persona-\${persona.id}\`}
      checked={selectedPersonas.includes(persona.id)}
      onChange={() => togglePersona(persona.id)}
    />
    {persona.name}
  </label>
))}`,
    relatedFiles: ['/components/CentralHexView.tsx', '/data/personas.ts']
  },

  'competitors-file-selection': {
    title: 'Research File Selection Not Working',
    symptom: 'No research files available for Competitors hex',
    whatThisMeans: [
      'Knowledge Base has no research files',
      'Files not approved for use',
      'File selection step not working'
    ],
    commonCauses: [
      'No Files Uploaded - Knowledge Base is empty (expected for new workspace)',
      'No Approved Files - All files are pending approval (non-researchers see only approved)',
      'localStorage Empty - cohive_research_files not populated',
      'Filter Error - Files being filtered out incorrectly'
    ],
    howToFix: '1. Navigate to Knowledge Base hex\n2. Upload research files in Synthesis mode\n3. If non-researcher, ensure files are approved\n4. Return to Competitors hex and verify files appear in Step 1',
    codeExample: `// Expected localStorage structure:
localStorage.setItem('cohive_research_files', JSON.stringify([
  {
    id: 'file-1',
    fileName: 'Competitor-Analysis.pdf',
    brand: 'Nike',
    projectType: 'Creative Messaging',
    isApproved: true,
    uploadDate: Date.now(),
    fileType: 'research'
  }
]));

// CentralHexView.tsx - File filtering
const relevantFiles = researchFiles.filter(file => file.isApproved);`,
    relatedFiles: ['/components/CentralHexView.tsx', '/components/ResearchView.tsx']
  },

  'competitors-assessment-type': {
    title: 'Assessment Type Configuration Missing',
    symptom: 'Cannot select recommend/assess/unified options',
    whatThisMeans: [
      'Assessment type controls not visible',
      'Default assessment type not set correctly',
      'Not on persona hex workflow'
    ],
    commonCauses: [
      'Not on Persona Hex - Competitors should be treated as persona hex',
      'isPersonaHex Logic Broken - "Competitors" not in isPersonaHex array',
      'Controls Not Rendered - Assessment type checkboxes/buttons missing',
      'Conditional Hidden - UI hidden by template or state logic'
    ],
    howToFix: '1. Navigate to Competitors hex\n2. Check that "Competitors" is in isPersonaHex array\n3. Verify assessment type controls render in Step 3\n4. Default should be "recommend" for persona hexes',
    codeExample: `// CentralHexView.tsx - Persona hex detection
const isPersonaHex = [
  'Consumers', 
  'Luminaries',
  'Colleagues', 
  'cultural',
  'Stories',
  'Competitors',  // ← Ensure this is included
  'Grade'
].includes(hexId);

// Default assessment type for persona hexes
const [assessmentType, setAssessmentType] = useState<string[]>(
  isPersonaHex ? ["recommend"] : ["unified"]
);`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'competitors-workflow-nav': {
    title: '3-Step Workflow Navigation Broken',
    symptom: 'Cannot navigate between Step 1→2→3',
    whatThisMeans: [
      'Step navigation buttons not working',
      'Cannot progress through workflow',
      'Stuck on one step'
    ],
    commonCauses: [
      'Next Button Disabled - No files or personas selected',
      'State Not Updating - currentStep state not changing',
      'Navigation Logic Error - onClick handler not calling setCurrentStep',
      'Validation Blocking - Step requirements not met'
    ],
    howToFix: '1. Ensure at least one file is selected before clicking Next (Step 1→2)\n2. Ensure at least one persona is selected before clicking Next (Step 2→3)\n3. Check CentralHexView.tsx for step navigation logic\n4. Verify setCurrentStep is called on Next/Back button clicks',
    codeExample: `// CentralHexView.tsx - Step navigation
const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

// Step 1: Select Files
<button
  onClick={() => setCurrentStep(2)}
  disabled={selectedFiles.length === 0}
>
  Next
</button>

// Step 2: Select Personas
<button onClick={() => setCurrentStep(1)}>Back</button>
<button
  onClick={() => setCurrentStep(3)}
  disabled={selectedPersonas.length === 0}
>
  Next
</button>

// Step 3: Execute
<button onClick={() => setCurrentStep(2)}>Back</button>`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'competitors-results-persistence': {
    title: 'Execution Results Not Persisting',
    symptom: 'Competitors hex results not saved or not appearing in history',
    whatThisMeans: [
      'Assessment results are lost',
      'Cannot view previous executions',
      'localStorage not saving hex executions'
    ],
    commonCauses: [
      'No Executions Yet - No assessments have been run (expected)',
      'localStorage Not Writing - onExecute function not saving to storage',
      'Wrong Key - Saving to wrong localStorage key',
      'Parse Error - Corrupted JSON in cohive_hex_executions',
      'Hex ID Mismatch - Saving under different hex ID'
    ],
    howToFix: '1. Run at least one assessment in Competitors hex\n2. Check cohive_hex_executions in localStorage (DevTools)\n3. Verify executions are saved under "Competitors" key\n4. Check ProcessWireframe.tsx handleExecuteAssessment function',
    codeExample: `// ProcessWireframe.tsx - Save execution
const handleExecuteAssessment = (selectedFiles, assessmentType, assessment) => {
  const executionData = {
    id: Date.now().toString(),
    selectedFiles,
    assessmentType,
    assessment,
    timestamp: Date.now()
  };
  
  // Save to localStorage
  const executions = JSON.parse(
    localStorage.getItem('cohive_hex_executions') || '{}'
  );
  
  executions['Competitors'] = [
    ...(executions['Competitors'] || []),
    executionData
  ];
  
  localStorage.setItem('cohive_hex_executions', JSON.stringify(executions));
};

// Retrieve executions
const competitorsExecutions = JSON.parse(
  localStorage.getItem('cohive_hex_executions') || '{}'
)['Competitors'] || [];`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/components/CentralHexView.tsx']
  },

  // ── SOCIAL LISTENING HEX TESTS ──────────────────────────────────────────────
  'social-persona-selection': {
    title: 'Persona Selection Not Working',
    symptom: 'Cannot select social media personas with checkboxes',
    whatThisMeans: [
      'Persona checkboxes not rendering',
      'Not on Social Voices hex Step 2',
      'Persona library not loaded'
    ],
    commonCauses: [
      'Wrong Step - Must be on Step 2 (Select Personas) in Social Voices hex',
      'Persona Data Missing - Persona library not loaded from /data/personas.ts',
      'Checkbox Rendering Error - CentralHexView not rendering persona checkboxes',
      'No Personas for Hex - getPersonasForHex() returning empty array for "social"'
    ],
    howToFix: '1. Navigate to Social Voices hex\n2. Complete Step 1 (select files) and click Next\n3. Verify Step 2 displays persona checkboxes\n4. Check /data/personas.ts has Social Voices personas defined under "social" key',
    codeExample: `// CentralHexView.tsx - Persona rendering
import { getPersonasForHex } from '../data/personas';

const personaConfig = getPersonasForHex('social');

// Render checkboxes
{personaConfig.level1Personas.map(persona => (
  <label key={persona.id}>
    <input
      type="checkbox"
      id={\`persona-\${persona.id}\`}
      checked={selectedPersonas.includes(persona.id)}
      onChange={() => togglePersona(persona.id)}
    />
    {persona.name}
  </label>
))}`,
    relatedFiles: ['/components/CentralHexView.tsx', '/data/personas.ts']
  },

  'social-file-selection': {
    title: 'Research File Selection Not Working',
    symptom: 'No research files available for Social Voices hex',
    whatThisMeans: [
      'Knowledge Base has no research files',
      'Files not approved for use',
      'File selection step not working'
    ],
    commonCauses: [
      'No Files Uploaded - Knowledge Base is empty (expected for new workspace)',
      'No Approved Files - All files are pending approval (non-researchers see only approved)',
      'localStorage Empty - cohive_research_files not populated',
      'Filter Error - Files being filtered out incorrectly'
    ],
    howToFix: '1. Navigate to Knowledge Base hex\n2. Upload research files in Synthesis mode\n3. If non-researcher, ensure files are approved\n4. Return to Social Voices hex and verify files appear in Step 1',
    codeExample: `// Expected localStorage structure:
localStorage.setItem('cohive_research_files', JSON.stringify([
  {
    id: 'file-1',
    fileName: 'Social-Media-Insights.pdf',
    brand: 'Nike',
    projectType: 'Creative Messaging',
    isApproved: true,
    uploadDate: Date.now(),
    fileType: 'research'
  }
]));

// CentralHexView.tsx - File filtering
const relevantFiles = researchFiles.filter(file => file.isApproved);`,
    relatedFiles: ['/components/CentralHexView.tsx', '/components/ResearchView.tsx']
  },

  'social-assessment-type': {
    title: 'Assessment Type Configuration Missing',
    symptom: 'Cannot select recommend/assess/unified options',
    whatThisMeans: [
      'Assessment type controls not visible',
      'Default assessment type not set correctly',
      'Not on persona hex workflow'
    ],
    commonCauses: [
      'Not on Persona Hex - Social Voices should be treated as persona hex',
      'isPersonaHex Logic Broken - "social" not in isPersonaHex array',
      'Controls Not Rendered - Assessment type checkboxes/buttons missing',
      'Conditional Hidden - UI hidden by template or state logic'
    ],
    howToFix: '1. Navigate to Social Voices hex\n2. Check that "social" is in isPersonaHex array\n3. Verify assessment type controls render in Step 3\n4. Default should be "recommend" for persona hexes',
    codeExample: `// CentralHexView.tsx - Persona hex detection
const isPersonaHex = [
  'Consumers', 
  'Luminaries',
  'Colleagues', 
  'cultural',
  'Stories',
  'Competitors',
  'social',  // ← Ensure this is included
  'Grade'
].includes(hexId);

// Default assessment type for persona hexes
const [assessmentType, setAssessmentType] = useState<string[]>(
  isPersonaHex ? ["recommend"] : ["unified"]
);`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'social-workflow-nav': {
    title: '3-Step Workflow Navigation Broken',
    symptom: 'Cannot navigate between Step 1→2→3',
    whatThisMeans: [
      'Step navigation buttons not working',
      'Cannot progress through workflow',
      'Stuck on one step'
    ],
    commonCauses: [
      'Next Button Disabled - No files or personas selected',
      'State Not Updating - currentStep state not changing',
      'Navigation Logic Error - onClick handler not calling setCurrentStep',
      'Validation Blocking - Step requirements not met'
    ],
    howToFix: '1. Ensure at least one file is selected before clicking Next (Step 1→2)\n2. Ensure at least one persona is selected before clicking Next (Step 2→3)\n3. Check CentralHexView.tsx for step navigation logic\n4. Verify setCurrentStep is called on Next/Back button clicks',
    codeExample: `// CentralHexView.tsx - Step navigation
const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

// Step 1: Select Files
<button
  onClick={() => setCurrentStep(2)}
  disabled={selectedFiles.length === 0}
>
  Next
</button>

// Step 2: Select Personas
<button onClick={() => setCurrentStep(1)}>Back</button>
<button
  onClick={() => setCurrentStep(3)}
  disabled={selectedPersonas.length === 0}
>
  Next
</button>

// Step 3: Execute
<button onClick={() => setCurrentStep(2)}>Back</button>`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'social-results-persistence': {
    title: 'Execution Results Not Persisting',
    symptom: 'Social Voices hex results not saved or not appearing in history',
    whatThisMeans: [
      'Assessment results are lost',
      'Cannot view previous executions',
      'localStorage not saving hex executions'
    ],
    commonCauses: [
      'No Executions Yet - No assessments have been run (expected)',
      'localStorage Not Writing - onExecute function not saving to storage',
      'Wrong Key - Saving to wrong localStorage key (should be "social")',
      'Parse Error - Corrupted JSON in cohive_hex_executions',
      'Hex ID Mismatch - Saving under different hex ID'
    ],
    howToFix: '1. Run at least one assessment in Social Voices hex\n2. Check cohive_hex_executions in localStorage (DevTools)\n3. Verify executions are saved under "social" key (not "Social Voices")\n4. Check ProcessWireframe.tsx handleExecuteAssessment function',
    codeExample: `// ProcessWireframe.tsx - Save execution
const handleExecuteAssessment = (selectedFiles, assessmentType, assessment) => {
  const executionData = {
    id: Date.now().toString(),
    selectedFiles,
    assessmentType,
    assessment,
    timestamp: Date.now()
  };
  
  // Save to localStorage (note: key is "social" not "Social Voices")
  const executions = JSON.parse(
    localStorage.getItem('cohive_hex_executions') || '{}'
  );
  
  executions['social'] = [
    ...(executions['social'] || []),
    executionData
  ];
  
  localStorage.setItem('cohive_hex_executions', JSON.stringify(executions));
};

// Retrieve executions
const socialExecutions = JSON.parse(
  localStorage.getItem('cohive_hex_executions') || '{}'
)['social'] || [];`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/components/CentralHexView.tsx']
  },

  // ── CONSUMERS HEX TESTS ─────────────────────────────────────────────────────
  'consumers-persona-checkboxes': {
    title: 'Persona Selection Not Working',
    symptom: 'Cannot select consumer personas with checkboxes',
    whatThisMeans: [
      'Persona checkboxes not rendering',
      'Not on Consumers hex Step 2',
      'Persona library not loaded'
    ],
    commonCauses: [
      'Wrong Step - Must be on Step 2 (Select Personas) in Consumers hex',
      'Persona Data Missing - Persona library not loaded from /data/personas.ts',
      'Checkbox Rendering Error - CentralHexView not rendering persona checkboxes',
      'No Personas for Hex - getPersonasForHex() returning empty array for "Consumers"'
    ],
    howToFix: '1. Navigate to Consumers hex\n2. Complete Step 1 (select files) and click Next\n3. Verify Step 2 displays persona checkboxes\n4. Check /data/personas.ts has Consumers personas defined under "Consumers" key',
    codeExample: `// CentralHexView.tsx - Persona rendering
import { getPersonasForHex } from '../data/personas';

const personaConfig = getPersonasForHex('Consumers');

// Render checkboxes
{personaConfig.level1Personas.map(persona => (
  <label key={persona.id}>
    <input
      type="checkbox"
      id={\`persona-\${persona.id}\`}
      checked={selectedPersonas.includes(persona.id)}
      onChange={() => togglePersona(persona.id)}
    />
    {persona.name}
  </label>
))}`,
    relatedFiles: ['/components/CentralHexView.tsx', '/data/personas.ts']
  },

  'consumers-file-selection': {
    title: 'Research File Selection Not Working',
    symptom: 'No research files available for Consumers hex',
    whatThisMeans: [
      'Knowledge Base has no research files',
      'Files not approved for use',
      'File selection step not working'
    ],
    commonCauses: [
      'No Files Uploaded - Knowledge Base is empty (expected for new workspace)',
      'No Approved Files - All files are pending approval (non-researchers see only approved)',
      'localStorage Empty - cohive_research_files not populated',
      'Filter Error - Files being filtered out incorrectly'
    ],
    howToFix: '1. Navigate to Knowledge Base hex\n2. Upload research files in Synthesis mode\n3. If non-researcher, ensure files are approved\n4. Return to Consumers hex and verify files appear in Step 1',
    codeExample: `// Expected localStorage structure:
localStorage.setItem('cohive_research_files', JSON.stringify([
  {
    id: 'file-1',
    fileName: 'Consumer-Insights.pdf',
    brand: 'Nike',
    projectType: 'Creative Messaging',
    isApproved: true,
    uploadDate: Date.now(),
    fileType: 'research'
  }
]));

// CentralHexView.tsx - File filtering
const relevantFiles = researchFiles.filter(file => file.isApproved);`,
    relatedFiles: ['/components/CentralHexView.tsx', '/components/ResearchView.tsx']
  },

  'consumers-assessment-type': {
    title: 'Assessment Type Configuration Missing',
    symptom: 'Cannot select recommend/assess/unified options',
    whatThisMeans: [
      'Assessment type controls not visible',
      'Default assessment type not set correctly',
      'Not on persona hex workflow'
    ],
    commonCauses: [
      'Not on Persona Hex - Consumers should be treated as persona hex',
      'isPersonaHex Logic Broken - "Consumers" not in isPersonaHex array',
      'Controls Not Rendered - Assessment type checkboxes/buttons missing',
      'Conditional Hidden - UI hidden by template or state logic'
    ],
    howToFix: '1. Navigate to Consumers hex\n2. Check that "Consumers" is in isPersonaHex array\n3. Verify assessment type controls render in Step 3\n4. Default should be "recommend" for persona hexes',
    codeExample: `// CentralHexView.tsx - Persona hex detection
const isPersonaHex = [
  'Consumers',  // ← Ensure this is included
  'Luminaries',
  'Colleagues', 
  'cultural',
  'Stories',
  'Competitors',
  'social',
  'Grade'
].includes(hexId);

// Default assessment type for persona hexes
const [assessmentType, setAssessmentType] = useState<string[]>(
  isPersonaHex ? ["recommend"] : ["unified"]
);`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'consumers-workflow-nav': {
    title: '3-Step Workflow Navigation Broken',
    symptom: 'Cannot navigate between Step 1→2→3',
    whatThisMeans: [
      'Step navigation buttons not working',
      'Cannot progress through workflow',
      'Stuck on one step'
    ],
    commonCauses: [
      'Next Button Disabled - No files or personas selected',
      'State Not Updating - currentStep state not changing',
      'Navigation Logic Error - onClick handler not calling setCurrentStep',
      'Validation Blocking - Step requirements not met'
    ],
    howToFix: '1. Ensure at least one file is selected before clicking Next (Step 1→2)\n2. Ensure at least one persona is selected before clicking Next (Step 2→3)\n3. Check CentralHexView.tsx for step navigation logic\n4. Verify setCurrentStep is called on Next/Back button clicks',
    codeExample: `// CentralHexView.tsx - Step navigation
const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

// Step 1: Select Files
<button
  onClick={() => setCurrentStep(2)}
  disabled={selectedFiles.length === 0}
>
  Next
</button>

// Step 2: Select Personas
<button onClick={() => setCurrentStep(1)}>Back</button>
<button
  onClick={() => setCurrentStep(3)}
  disabled={selectedPersonas.length === 0}
>
  Next
</button>

// Step 3: Execute
<button onClick={() => setCurrentStep(2)}>Back</button>`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'consumers-results-persistence': {
    title: 'Execution Results Not Persisting',
    symptom: 'Consumers hex results not saved or not appearing in history',
    whatThisMeans: [
      'Assessment results are lost',
      'Cannot view previous executions',
      'localStorage not saving hex executions'
    ],
    commonCauses: [
      'No Executions Yet - No assessments have been run (expected)',
      'localStorage Not Writing - onExecute function not saving to storage',
      'Wrong Key - Saving to wrong localStorage key (should be "Consumers")',
      'Parse Error - Corrupted JSON in cohive_hex_executions',
      'Hex ID Mismatch - Saving under different hex ID'
    ],
    howToFix: '1. Run at least one assessment in Consumers hex\n2. Check cohive_hex_executions in localStorage (DevTools)\n3. Verify executions are saved under "Consumers" key\n4. Check ProcessWireframe.tsx handleExecuteAssessment function',
    codeExample: `// ProcessWireframe.tsx - Save execution
const handleExecuteAssessment = (selectedFiles, assessmentType, assessment) => {
  const executionData = {
    id: Date.now().toString(),
    selectedFiles,
    assessmentType,
    assessment,
    timestamp: Date.now()
  };
  
  // Save to localStorage
  const executions = JSON.parse(
    localStorage.getItem('cohive_hex_executions') || '{}'
  );
  
  executions['Consumers'] = [
    ...(executions['Consumers'] || []),
    executionData
  ];
  
  localStorage.setItem('cohive_hex_executions', JSON.stringify(executions));
};

// Retrieve executions
const consumersExecutions = JSON.parse(
  localStorage.getItem('cohive_hex_executions') || '{}'
)['Consumers'] || [];`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/components/CentralHexView.tsx']
  },

  // ── SCORE RESULTS (GRADE HEX) TESTS ─────────────────────────────────────────
  'score-grading-scale': {
    title: 'Grading Scale Selection Not Working',
    symptom: 'Cannot select grading scale options (1-5, 1-10, written, etc.)',
    whatThisMeans: [
      'Grading scale radio buttons not rendering',
      'Not on Grade hex Step 2',
      'testingScale state not initialized'
    ],
    commonCauses: [
      'Wrong Hex - Must be on Grade hex, not other persona hexes',
      'Wrong Step - Must be on Step 2 in Grade hex',
      'Conditional Render Error - CentralHexView not rendering scale options for Grade hex',
      'Radio Button Missing - name="testingScale" radio inputs not in DOM'
    ],
    howToFix: '1. Navigate to Grade hex\n2. Complete Step 1 (select target segments)\n3. Click Next to reach Step 2\n4. Verify grading scale radio buttons appear (should see 5 options)\n5. Check CentralHexView.tsx for hexId === "Grade" conditional',
    codeExample: `// CentralHexView.tsx - Grading scale rendering
{hexId === "Grade" ? (
  <>
    <h3>Step 2 of 2: What grading scale should be used?</h3>
    <div className="space-y-1">
      <label>
        <input 
          type="radio" 
          name="testingScale" 
          value="scale-1-5-written" 
          checked={testingScale === "scale-1-5-written"}
          onChange={(e) => setTestingScale(e.target.value)}
        />
        Scale of 1-5 with written assessments
      </label>
      <label>
        <input 
          type="radio" 
          name="testingScale" 
          value="scale-1-10-written"
          checked={testingScale === "scale-1-10-written"}
          onChange={(e) => setTestingScale(e.target.value)}
        />
        Scale of 1-10 written assessments
      </label>
      {/* Additional scale options... */}
    </div>
  </>
) : (
  // Other hex assessment types...
)}`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'score-segment-selection': {
    title: 'Target Segment Selection Not Working',
    symptom: 'Cannot select target segments for grading',
    whatThisMeans: [
      'Segment checkboxes not rendering in Grade hex',
      'Not on Grade hex Step 1',
      'Persona library not loaded for Grade hex'
    ],
    commonCauses: [
      'Wrong Step - Must be on Step 1 (Select Target Segments) in Grade hex',
      'Persona Data Missing - getPersonasForHex("Grade") returning empty array',
      'Checkbox Rendering Error - CentralHexView not rendering segment checkboxes',
      'isPersonaHex Missing Grade - "Grade" not in isPersonaHex array'
    ],
    howToFix: '1. Navigate to Grade hex\n2. Verify you are on Step 1\n3. Check /data/personas.ts has Grade segments defined under "Grade" key\n4. Ensure "Grade" is included in isPersonaHex array in CentralHexView.tsx\n5. Verify segment checkboxes render (labeled as "Target Segments" not "Personas")',
    codeExample: `// CentralHexView.tsx - Grade hex detection
const isPersonaHex = [
  'Consumers', 
  'Luminaries',
  'Colleagues', 
  'cultural',
  'Stories',
  'Competitors',
  'social',
  'Grade'  // ← Ensure this is included
].includes(hexId);

// Step 1 heading for Grade hex
<h3>
  Step 1 of 2: Select {
    hexId === 'Grade' ? 'Target Segment' : 'Consumer'
  } {hexId === 'Grade' ? 'Segments' : 'Personas'} to use in this hex
</h3>

// Render segment checkboxes
const personaConfig = getPersonasForHex('Grade');
{personaConfig.level1Personas.map(segment => (
  <label key={segment.id}>
    <input
      type="checkbox"
      id={\`persona-\${segment.id}\`}
      checked={selectedPersonas.includes(segment.id)}
      onChange={() => togglePersona(segment.id)}
    />
    {segment.name}
  </label>
))}`,
    relatedFiles: ['/components/CentralHexView.tsx', '/data/personas.ts']
  },

  'score-results-persistence': {
    title: 'Score Results Not Persisting',
    symptom: 'Grading executions not saved or not appearing in history',
    whatThisMeans: [
      'Score results are lost after execution',
      'Cannot view previous grading history',
      'localStorage not saving Grade executions'
    ],
    commonCauses: [
      'No Executions Yet - No grading assessments have been run (expected)',
      'localStorage Not Writing - onExecute function not saving Grade executions',
      'Wrong Key - Saving to wrong localStorage key (should be "Grade")',
      'Parse Error - Corrupted JSON in cohive_hex_executions',
      'Hex ID Mismatch - Grade hex using different hex ID internally'
    ],
    howToFix: '1. Run at least one grading assessment in Grade hex\n2. Open browser DevTools → Application → Local Storage\n3. Check cohive_hex_executions key\n4. Verify executions are saved under "Grade" key\n5. Check ProcessWireframe.tsx handleExecuteAssessment function',
    codeExample: `// ProcessWireframe.tsx - Save Grade execution
const handleExecuteAssessment = (selectedFiles, assessmentType, assessment, testingScale) => {
  const executionData = {
    id: Date.now().toString(),
    selectedFiles,
    assessmentType,
    assessment,
    testingScale,  // ← Important for Grade hex
    timestamp: Date.now()
  };
  
  // Save to localStorage under "Grade" key
  const executions = JSON.parse(
    localStorage.getItem('cohive_hex_executions') || '{}'
  );
  
  executions['Grade'] = [
    ...(executions['Grade'] || []),
    executionData
  ];
  
  localStorage.setItem('cohive_hex_executions', JSON.stringify(executions));
};

// Retrieve Grade executions
const gradeExecutions = JSON.parse(
  localStorage.getItem('cohive_hex_executions') || '{}'
)['Grade'] || [];`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/components/CentralHexView.tsx']
  },

  'score-scale-display': {
    title: 'Grading Scale Not Displaying',
    symptom: 'Selected grading scale not shown or not persisting',
    whatThisMeans: [
      'testingScale state not updating',
      'Radio button selection not working',
      'Selected scale value not displayed'
    ],
    commonCauses: [
      'No Scale Selected - User has not selected a grading scale yet (expected)',
      'State Not Updating - setTestingScale not being called on radio change',
      'Radio Checked Prop Error - checked={testingScale === value} not working',
      'Default Value Missing - testingScale state has no default value'
    ],
    howToFix: '1. Navigate to Grade hex Step 2\n2. Click on a grading scale radio button\n3. Verify the radio button shows as selected (filled circle)\n4. Check CentralHexView.tsx for testingScale state initialization\n5. Ensure onChange handler calls setTestingScale(e.target.value)',
    codeExample: `// CentralHexView.tsx - Grading scale state
const [testingScale, setTestingScale] = useState<string>("scale-1-5-written");

// Radio button with checked state
<input 
  type="radio" 
  name="testingScale" 
  value="scale-1-5-written"
  checked={testingScale === "scale-1-5-written"}
  onChange={(e) => setTestingScale(e.target.value)}
/>

// Display selected scale in Step 3 or execution
{testingScale && (
  <p>Using grading scale: {testingScale}</p>
)}`,
    relatedFiles: ['/components/CentralHexView.tsx']
  },

  'score-execution-format': {
    title: 'Score Execution Results Malformed',
    symptom: 'Grading results have incorrect format or missing data',
    whatThisMeans: [
      'Execution data structure is invalid',
      'Assessment field is missing or empty',
      'Score format does not match selected scale'
    ],
    commonCauses: [
      'No Executions Yet - No grading has been run (expected)',
      'Missing Assessment Field - executionData missing assessment property',
      'AI Response Error - Assessment not generated or empty string',
      'testingScale Not Passed - Scale selection not included in execution data',
      'Wrong Data Type - assessment should be string, not object or null'
    ],
    howToFix: '1. Run a grading assessment in Grade hex\n2. Check localStorage cohive_hex_executions["Grade"]\n3. Verify each execution has these fields:\n   - id (string)\n   - selectedFiles (array)\n   - assessmentType (array)\n   - assessment (string with score data)\n   - testingScale (string, e.g., "scale-1-5-written")\n   - timestamp (number)\n4. If assessment is empty, check AI prompt execution',
    codeExample: `// Expected execution format for Grade hex
{
  "Grade": [
    {
      "id": "1234567890",
      "selectedFiles": ["file-1", "file-2"],
      "assessmentType": ["recommend"],
      "assessment": "Segment 1: 4/5 - Strong alignment...\\nSegment 2: 3/5 - Moderate fit...",
      "testingScale": "scale-1-5-written",
      "timestamp": 1234567890000
    }
  ]
}

// Validation check
const lastExecution = gradeExecutions[gradeExecutions.length - 1];
const isValid = 
  lastExecution.assessment && 
  typeof lastExecution.assessment === 'string' &&
  lastExecution.testingScale;`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/components/CentralHexView.tsx']
  },

  // ── FINDINGS HEX TESTS ──────────────────────────────────────────────────────
  'findings-mode-choice': {
    title: 'Findings Mode Choice Not Working',
    symptom: 'Cannot select "Save Iteration" or "Summarize" mode',
    whatThisMeans: [
      'Findings mode radio buttons not rendering',
      'Not on Findings hex',
      'Mode selection state not initialized'
    ],
    commonCauses: [
      'Wrong Hex - Must be on Findings hex, not other workflow hexes',
      'Radio Buttons Missing - name="findingsChoice" inputs not in DOM',
      'Conditional Render Error - ProcessWireframe not rendering Findings questions',
      'No Hex Executions - "Save Iteration" only available if at least one workflow hex was executed'
    ],
    howToFix: '1. Navigate to Findings hex\n2. Verify Question 1 "Save Iteration or Summarize" appears\n3. Check if at least one workflow hex has been executed (required for Save Iteration)\n4. Verify radio buttons render for both modes\n5. Check ProcessWireframe.tsx for activeStepId === "Findings" conditional',
    codeExample: `// ProcessWireframe.tsx - Findings mode selection
if (activeStepId === 'Findings') {
  const workflowHexes = ['research', 'Luminaries', 'stories', 'Consumers', 
                        'competitors', 'Colleagues', 'cultural', 'social', 'Grade'];
  const hasHexExecutions = workflowHexes.some(hexId => {
    const executions = hexExecutions[hexId];
    return executions && executions.length > 0;
  });
  
  if (idx === 0 && question === 'Save Iteration or Summarize') {
    return (
      <div>
        {hasHexExecutions && (
          <label>
            <input 
              type="radio" 
              name="findingsChoice" 
              value="Save Iteration"
              checked={responses['Findings']?.[0] === 'Save Iteration'}
              onChange={(e) => handleResponseChange(0, e.target.value)}
            />
            Save Iteration
          </label>
        )}
        <label>
          <input 
            type="radio" 
            name="findingsChoice" 
            value="Summarize"
            checked={responses['Findings']?.[0] === 'Summarize'}
            onChange={(e) => handleResponseChange(0, e.target.value)}
          />
          Summarize
        </label>
      </div>
    );
  }
}`,
    relatedFiles: ['/components/ProcessWireframe.tsx']
  },

  'findings-file-selection': {
    title: 'Iteration File Selection Not Working',
    symptom: 'Cannot select iteration files for summary',
    whatThisMeans: [
      'Iteration file checkboxes not rendering',
      'No iteration files exist for current brand/projectType',
      'Not in Summarize mode'
    ],
    commonCauses: [
      'Wrong Mode - Must select "Summarize" mode first (not "Save Iteration")',
      'No Iteration Files - No matching files found for brand/projectType combination',
      'localStorage Empty - cohive_projects has no saved iteration files',
      'Brand/ProjectType Missing - Enter hex not completed with brand and project type',
      'File Filter Error - matchingFiles array filtering incorrectly'
    ],
    howToFix: '1. Navigate to Findings hex\n2. Select "Summarize" mode (not "Save Iteration")\n3. Ensure Enter hex has brand and projectType filled\n4. Check localStorage cohive_projects for iteration files\n5. Verify at least one iteration file matches current brand/projectType\n6. Save iterations from workflow hexes if none exist',
    codeExample: `// ProcessWireframe.tsx - Iteration file selection
if (findingsChoice === 'Summarize' && idx === 1) {
  const brand = responses['Enter']?.[0]?.trim();
  const projectType = responses['Enter']?.[1]?.trim();
  
  // Get matching iteration files
  const matchingFiles = projectFiles.filter(f => 
    f.brand === brand && f.projectType === projectType
  ).sort((a, b) => b.timestamp - a.timestamp);
  
  const selectedFiles = responses['Findings']?.[1]?.split(',').filter(Boolean) || [];
  
  return (
    <div>
      <label>Which files should we include in our findings?</label>
      {matchingFiles.length > 0 ? (
        matchingFiles.map((file, fileIdx) => (
          <label key={fileIdx}>
            <input 
              type="checkbox"
              checked={selectedFiles.includes(file.fileName)}
              onChange={(e) => {
                let newSelected = [...selectedFiles];
                if (e.target.checked) {
                  newSelected.push(file.fileName);
                } else {
                  newSelected = newSelected.filter(f => f !== file.fileName);
                }
                handleResponseChange(idx, newSelected.join(','));
              }}
            />
            {file.fileName} ({new Date(file.timestamp).toLocaleDateString()})
          </label>
        ))
      ) : (
        <p>No files found for {brand} - {projectType}</p>
      )}
    </div>
  );
}`,
    relatedFiles: ['/components/ProcessWireframe.tsx']
  },

  'findings-output-options': {
    title: 'Output Options Selection Not Working',
    symptom: 'Cannot select output options for summary (Executive Summary, Include Gems, etc.)',
    whatThisMeans: [
      'Output option checkboxes not rendering',
      'Not in Summarize mode',
      'Output options state not updating'
    ],
    commonCauses: [
      'Wrong Mode - Must select "Summarize" mode first',
      'Question Index Error - idx === 2 condition not matching',
      'Checkbox State Error - selectedOptions array not updating',
      'Options Array Missing - 5 predefined options not defined'
    ],
    howToFix: '1. Navigate to Findings hex\n2. Select "Summarize" mode\n3. Proceed to Question 3 "Output Options"\n4. Verify 5 checkboxes appear:\n   - Executive Summary\n   - Share all Ideas as a list\n   - Provide a grid with all "final" ideas with their scores\n   - Include Gems\n   - Include User Notes from all iterations as an Appendix\n5. Check ProcessWireframe.tsx for output options rendering',
    codeExample: `// ProcessWireframe.tsx - Output options selection
if (idx === 2 && question === 'Output Options') {
  const selectedOptions = responses['Findings']?.[2]?.split(',').filter(Boolean) || [];
  const options = [
    'Executive Summary',
    'Share all Ideas as a list',
    'Provide a grid with all "final" ideas with their scores',
    'Include Gems',
    'Include User Notes from all iterations as an Appendix'
  ];
  
  return (
    <div>
      <label>Output Options</label>
      {options.map((option, optIdx) => (
        <label key={optIdx}>
          <input 
            type="checkbox"
            checked={selectedOptions.includes(option)}
            onChange={(e) => {
              let newSelected = [...selectedOptions];
              if (e.target.checked) {
                newSelected.push(option);
              } else {
                newSelected = newSelected.filter(o => o !== option);
              }
              handleResponseChange(idx, newSelected.join(','));
            }}
          />
          {option}
        </label>
      ))}
    </div>
  );
}`,
    relatedFiles: ['/components/ProcessWireframe.tsx']
  },

  'findings-save-download': {
    title: 'Save/Download Options Not Working',
    symptom: 'Cannot select Read, SaveWorkspace, or Download options',
    whatThisMeans: [
      'Save/Download radio buttons not rendering',
      'Not in Summarize mode',
      'Question 4 not appearing'
    ],
    commonCauses: [
      'Wrong Mode - Must select "Summarize" mode first',
      'Previous Steps Incomplete - Must complete file selection and output options first',
      'Radio Buttons Missing - name="saveOrDownload" inputs not in DOM',
      'Question Index Error - idx === 3 condition not matching'
    ],
    howToFix: '1. Navigate to Findings hex\n2. Select "Summarize" mode\n3. Complete Question 2 (file selection)\n4. Complete Question 3 (output options)\n5. Verify Question 4 "Save or Download" appears with 3 radio options\n6. Check ProcessWireframe.tsx for save/download rendering',
    codeExample: `// ProcessWireframe.tsx - Save/Download options
if (idx === 3 && question === 'Save or Download') {
  return (
    <div>
      <label>Save or Download</label>
      <label>
        <input 
          type="radio" 
          name="saveOrDownload" 
          value="Read"
          checked={responses['Findings']?.[3] === 'Read'}
          onChange={async (e) => {
            handleResponseChange(idx, e.target.value);
            if (e.target.value === 'Read') {
              // Generate and display summary
              const result = await generateSummary({...});
              setMarkdownContent(result.summary);
              setShowMarkdownViewer(true);
            }
          }}
        />
        Read (Generate and view summary)
      </label>
      <label>
        <input 
          type="radio" 
          name="saveOrDownload" 
          value="SaveWorkspace"
          checked={responses['Findings']?.[3] === 'SaveWorkspace'}
          onChange={(e) => {
            handleResponseChange(idx, e.target.value);
            // Save to Databricks workspace
          }}
        />
        Save to Databricks Workspace
      </label>
      <label>
        <input 
          type="radio" 
          name="saveOrDownload" 
          value="Download"
          checked={responses['Findings']?.[3] === 'Download'}
          onChange={(e) => {
            handleResponseChange(idx, e.target.value);
            // Download to computer
            downloadFile(summaryFileName, summaryData, 'application/json');
          }}
        />
        Download to Computer
      </label>
    </div>
  );
}`,
    relatedFiles: ['/components/ProcessWireframe.tsx']
  },

  'findings-summary-validation': {
    title: 'Summary Generation Data Invalid',
    symptom: 'Missing required fields for summary generation (selectedFiles, outputOptions, summaryFileName)',
    whatThisMeans: [
      'Summary generation will fail due to missing data',
      'User has not completed all required fields',
      'Data structure in localStorage is incomplete'
    ],
    commonCauses: [
      'No Files Selected - User has not selected iteration files (Question 2)',
      'No Output Options - User has not selected output options (Question 3)',
      'No Summary Filename - summaryFileName field is empty or missing',
      'Wrong Mode - Not in Summarize mode (Save Iteration selected instead)',
      'localStorage Missing - cohive_responses not properly saved'
    ],
    howToFix: '1. Navigate to Findings hex\n2. Select "Summarize" mode\n3. Complete all required fields:\n   a. Select at least one iteration file (Question 2)\n   b. Select at least one output option (Question 3)\n   c. Enter or confirm summary filename\n4. Check localStorage cohive_responses["Findings"]\n5. Verify structure:\n   - [0]: "Summarize"\n   - [1]: "file1.json,file2.json" (comma-separated)\n   - [2]: "Executive Summary,Include Gems" (comma-separated)\n   - summaryFileName: "MyProject_Summary.json"',
    codeExample: `// Expected Findings data structure
{
  "Findings": {
    "0": "Summarize",  // Mode choice
    "1": "Nike_Creative_v1.json,Nike_Creative_v2.json",  // Selected files
    "2": "Executive Summary,Include Gems,Include User Notes",  // Output options
    "3": "",  // Save/Download choice (empty until selected)
    "summaryFileName": "Nike_Creative_Summary.json"  // Custom field
  }
}

// Validation check
const findingsData = responses['Findings'];
const isValid = 
  findingsData?.[0] === 'Summarize' &&
  findingsData?.[1]?.length > 0 &&
  findingsData?.[2]?.length > 0 &&
  findingsData?.summaryFileName?.length > 0;

// generateSummary call requires all fields
const result = await generateSummary({
  brand,
  projectType,
  fileName: responses['Findings']?.summaryFileName,
  selectedFiles: responses['Findings']?.[1]?.split(',').filter(Boolean),
  outputOptions: responses['Findings']?.[2]?.split(',').filter(Boolean),
  hexExecutions,
  completedSteps: Array.from(completedSteps),
  responses,
  userEmail,
  userRole
});`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/utils/databricksApi.ts']
  },

  // ── KNOWLEDGE BASE HEX TESTS ───────────────────────────────────────────────
  'kb-mode-selection': {
    title: 'Knowledge Base Mode Selection Not Working',
    symptom: 'Cannot switch between Synthesis, Personas, Read/Edit/Approve, and Workspace modes',
    whatThisMeans: [
      'Mode buttons not rendering',
      'Not on Knowledge Base (research) hex',
      'Mode state not persisting to localStorage'
    ],
    commonCauses: [
      'Wrong Hex - Must be on Knowledge Base hex (research), not workflow hexes',
      'User Role Restriction - Non-researchers/non-admins may see ResearchView instead of ResearcherModes',
      'Mode Buttons Missing - ResearcherModes component not rendering mode selection',
      'localStorage Not Saving - cohive_research_mode not being set on mode change'
    ],
    howToFix: '1. Navigate to Knowledge Base hex (research icon)\n2. Ensure user role is administrator, research-analyst, research-leader, or data-scientist\n3. Verify mode buttons appear at top of interface\n4. Click each mode button and verify selection persists\n5. Check localStorage cohive_research_mode for saved mode\n6. If non-researcher, verify ResearchView appears (limited interface)',
    codeExample: `// ProcessWireframe.tsx - Knowledge Base mode switching
{activeStepId === 'research' ? (
  (userRole === 'administrator' || 
   userRole === 'research-analyst' || 
   userRole === 'research-leader' || 
   userRole === 'data-scientist') ? (
    <ResearcherModes 
      brand={responses['Enter']?.[0]?.trim() || ''}
      projectType={responses['Enter']?.[1]?.trim() || ''}
      researchFiles={researchFiles}
      userRole={userRole}
      onModeChange={(mode) => setResearchMode(mode)}
      // ... other props
    />
  ) : (
    <ResearchView role="non-researcher" /> // Limited view for non-researchers
  )
) : (
  // Other hex content
)}

// ResearcherModes.tsx - Mode state management
const [mode, setMode] = useState<'synthesis' | 'personas' | 'read-edit-approve' | 'workspace' | null>(() => {
  const saved = localStorage.getItem('cohive_research_mode');
  return saved as typeof mode;
});

const handleModeChange = (newMode: typeof mode) => {
  setMode(newMode);
  localStorage.setItem('cohive_research_mode', newMode || '');
  onModeChange?.(newMode);
};`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/components/ResearcherModes.tsx', '/components/ResearchView.tsx']
  },

  'kb-workspace-access': {
    title: 'Workspace Mode Access Control Not Working',
    symptom: 'Workspace mode visible to non-admins OR hidden from administrators',
    whatThisMeans: [
      'Role-based access control failing',
      'Workspace button rendering incorrectly',
      'User role not properly detected'
    ],
    commonCauses: [
      'Role Check Error - currentTemplate?.role !== "administrator" check failing',
      'Wrong User Role - User assigned non-admin role in template',
      'Button Visibility Logic - Workspace button rendering for all users',
      'Template Missing - No active template or cohive_current_template_id not set'
    ],
    howToFix: '1. Check current template role:\n   - Open Template Manager\n   - View active template\n   - Verify role is set to "administrator"\n2. Navigate to Knowledge Base hex\n3. If admin: Verify Workspace button appears alongside Synthesis, Personas, Read/Edit/Approve\n4. If non-admin: Verify Workspace button is hidden\n5. Check localStorage cohive_templates and cohive_current_template_id\n6. Create admin template if needed with role: "administrator"',
    codeExample: `// ResearcherModes.tsx - Workspace mode conditional rendering
const templates = JSON.parse(localStorage.getItem('cohive_templates') || '[]');
const currentTemplateId = localStorage.getItem('cohive_current_template_id');
const currentTemplate = templates.find(t => t.id === currentTemplateId);
const isAdmin = currentTemplate?.role === 'administrator';

return (
  <div>
    <button onClick={() => handleModeChange('synthesis')}>Synthesis</button>
    <button onClick={() => handleModeChange('personas')}>Personas</button>
    <button onClick={() => handleModeChange('read-edit-approve')}>Read/Edit/Approve</button>
    
    {/* Workspace mode - admin only */}
    {isAdmin && (
      <button onClick={() => handleModeChange('workspace')}>
        Workspace (Admin Only)
      </button>
    )}
  </div>
);

// Template structure
{
  "id": "admin-template-1",
  "name": "Administrator Template",
  "role": "administrator",  // Must be "administrator" for Workspace access
  "visibleSteps": [...],
  "permissions": {
    "canApproveResearch": true
  }
}`,
    relatedFiles: ['/components/ResearcherModes.tsx', '/components/TemplateManager.tsx']
  },

  'kb-file-type-filtering': {
    title: 'File Type Filtering Not Working in Read/Edit/Approve Mode',
    symptom: 'Cannot filter files by All, Synthesis, or Personas types',
    whatThisMeans: [
      'Filter buttons not rendering',
      'Not in Read/Edit/Approve mode',
      'filterType state not updating'
    ],
    commonCauses: [
      'Wrong Mode - Must select Read/Edit/Approve mode first',
      'No Files Available - No files to display so filters hidden',
      'Filter Buttons Missing - filterType state not mapped to UI buttons',
      'State Not Updating - setFilterType not called on button click'
    ],
    howToFix: '1. Navigate to Knowledge Base hex\n2. Click "Read/Edit/Approve" mode button\n3. Verify at least one file exists (upload via Synthesis/Personas if needed)\n4. Check for filter buttons labeled "All files", "Synthesis", "Personas"\n5. Click each filter and verify file list updates\n6. Check ResearcherModes.tsx for filterType state management',
    codeExample: `// ResearcherModes.tsx - File type filtering
const [filterType, setFilterType] = useState<'all' | 'synthesis' | 'personas'>('all');

// Filter buttons in Read/Edit/Approve mode
{mode === 'read-edit-approve' && (
  <div className="filter-buttons">
    <button 
      onClick={() => setFilterType('all')}
      className={filterType === 'all' ? 'active' : ''}
    >
      All files
    </button>
    <button 
      onClick={() => setFilterType('synthesis')}
      className={filterType === 'synthesis' ? 'active' : ''}
    >
      Synthesis
    </button>
    <button 
      onClick={() => setFilterType('personas')}
      className={filterType === 'personas' ? 'active' : ''}
    >
      Personas
    </button>
  </div>
)}

// Apply filter to file list
const filteredFiles = researchFiles.filter(file => {
  if (filterType === 'all') return true;
  if (filterType === 'synthesis') return file.fileType === 'synthesis' || file.fileType === 'Synthesis';
  if (filterType === 'personas') return file.fileType === 'personas' || file.fileType === 'Personas';
  return true;
});`,
    relatedFiles: ['/components/ResearcherModes.tsx']
  },

  'kb-pending-queue': {
    title: 'Pending Approval Queue Not Loading',
    symptom: 'Cannot see unprocessed or pending files awaiting approval',
    whatThisMeans: [
      'Pending files not loading from Databricks',
      'Not in Read/Edit/Approve mode',
      'No pending files exist'
    ],
    commonCauses: [
      'Wrong Mode - Must select Read/Edit/Approve mode to see approval queue',
      'No Pending Files - All files already approved or no files uploaded',
      'API Call Failed - listKnowledgeBaseFiles with isApproved:false failed',
      'Databricks Not Authenticated - getValidSession returned null',
      'Queue State Missing - pendingKBFiles and pendingApprovalFiles not populated'
    ],
    howToFix: '1. Navigate to Knowledge Base hex\n2. Click "Read/Edit/Approve" mode\n3. Ensure Databricks authentication is active\n4. Check if any files are uploaded but not approved:\n   a. Upload file via Synthesis mode without auto-approve\n   b. Check pending queue appears\n5. Verify listKnowledgeBaseFiles({ isApproved: false }) API call\n6. Check browser console for API errors\n7. Pending queue sections:\n   - Unprocessed: Files without contentSummary\n   - Processed Pending: Files with contentSummary awaiting approval',
    codeExample: `// ResearcherModes.tsx - Load pending files
useEffect(() => {
  const loadPendingKBFiles = async () => {
    const session = await getValidSession();
    if (mode === 'read-edit-approve' && session) {
      try {
        // Fetch all unapproved files
        const files = await listKnowledgeBaseFiles({ 
          isApproved: false, 
          sortBy: 'upload_date', 
          sortOrder: 'DESC', 
          limit: 100 
        });
        
        // Exclude Findings files (iteration outputs)
        const unprocessedFiles = files.filter(f =>
          f.fileType !== 'Findings' &&
          (f.isApproved === null || f.isApproved === false) &&
          (!f.contentSummary || f.contentSummary.trim() === '')
        );
        
        const processedFiles = files.filter(f =>
          f.fileType !== 'Findings' &&
          f.isApproved === false &&
          f.contentSummary && f.contentSummary.trim() !== ''
        );
        
        setPendingKBFiles(unprocessedFiles);
        setPendingApprovalFiles(processedFiles);
        onPendingCountChange?.(unprocessedFiles.length + processedFiles.length);
      } catch (error) {
        console.error('Failed to load pending files:', error);
      }
    }
  };
  loadPendingKBFiles();
}, [mode]);

// Render pending queues
{mode === 'read-edit-approve' && (
  <>
    <h3>Unprocessed Files ({pendingKBFiles.length})</h3>
    {pendingKBFiles.map(file => (
      <div key={file.fileId}>{file.fileName}</div>
    ))}
    
    <h3>Processed - Awaiting Approval ({pendingApprovalFiles.length})</h3>
    {pendingApprovalFiles.map(file => (
      <div key={file.fileId}>{file.fileName}</div>
    ))}
  </>
)}`,
    relatedFiles: ['/components/ResearcherModes.tsx', '/utils/databricksAPI.ts']
  },

  'kb-project-type-prompts': {
    title: 'Project Type Prompt Creation Not Working (Data Scientists Only)',
    symptom: 'Cannot create custom project types with AI prompts OR option visible to non-data-scientists',
    whatThisMeans: [
      'Role-based access control failing',
      'Not in Synthesis mode',
      'New Project Type option not rendering'
    ],
    commonCauses: [
      'Wrong Role - User role is not "data-scientist"',
      'Wrong Mode - Must be in Synthesis mode to see project type creation',
      'Option Missing - synthesisOption state not including "new-project-type"',
      'Button Not Rendering - Conditional rendering check for data-scientist failing',
      'Template Role Error - Active template does not have role: "data-scientist"'
    ],
    howToFix: '1. Verify user role is data-scientist:\n   - Open Template Manager\n   - Check active template role\n   - Create/activate data-scientist template if needed\n2. Navigate to Knowledge Base hex\n3. Click "Synthesis" mode button\n4. Look for "New Project Type (Data Scientists Only)" option\n5. If data-scientist: Option should be visible\n6. If non-data-scientist: Option should be hidden\n7. Click option, enter project type name and custom AI prompt\n8. Verify project type appears in Enter hex dropdown workspace-wide',
    codeExample: `// ResearcherModes.tsx - Project type prompt creation (data scientists only)
const templates = JSON.parse(localStorage.getItem('cohive_templates') || '[]');
const currentTemplateId = localStorage.getItem('cohive_current_template_id');
const currentTemplate = templates.find(t => t.id === currentTemplateId);
const isDataScientist = currentTemplate?.role === 'data-scientist';

{mode === 'synthesis' && (
  <div>
    <h3>Synthesis Options</h3>
    <button onClick={() => setSynthesisOption('new-synthesis')}>New Synthesis</button>
    <button onClick={() => setSynthesisOption('add-studies')}>Add Studies</button>
    <button onClick={() => setSynthesisOption('new-brand')}>New Brand</button>
    
    {/* Only visible to data-scientist role */}
    {isDataScientist && (
      <button onClick={() => setSynthesisOption('new-project-type')}>
        New Project Type (Data Scientists Only)
      </button>
    )}
    
    <button onClick={() => setSynthesisOption('edit-existing')}>Edit Existing</button>
    <button onClick={() => setSynthesisOption('review-edits')}>Review Edits</button>
  </div>
)}

// New project type form
{synthesisOption === 'new-project-type' && (
  <div>
    <label>Project Type Name:</label>
    <input 
      type="text" 
      value={newProjectType}
      onChange={(e) => setNewProjectType(e.target.value)}
      placeholder="e.g., Creative Messaging"
    />
    
    <label>Custom AI Prompt:</label>
    <textarea 
      value={newProjectTypePrompt}
      onChange={(e) => setNewProjectTypePrompt(e.target.value)}
      placeholder="Describe what the AI should focus on when analyzing this project type..."
      rows={8}
    />
    
    <button onClick={handleAddProjectTypeWithPrompt}>
      Add Project Type
    </button>
  </div>
)}

// Template with data-scientist role
{
  "id": "ds-template-1",
  "name": "Data Scientist Template",
  "role": "data-scientist",  // Required for project type prompt creation
  "visibleSteps": [...],
  "permissions": {
    "canApproveResearch": true
  }
}`,
    relatedFiles: ['/components/ResearcherModes.tsx', '/components/TemplateManager.tsx', '/docs/PROJECT_TYPE_PROMPTS.md']
  },

  'kb-custom-personas-api': {
    title: 'Custom Personas API Not Responding',
    symptom: 'Custom personas not loading in KB Personas mode or hex pickers',
    whatThisMeans: [
      'Databricks not authenticated',
      'custom_personas table does not exist yet (created on first save)',
      'API route /api/databricks/personas/list returning error'
    ],
    commonCauses: [
      'Not Authenticated — Databricks session expired or not signed in',
      'First Use — table is auto-created on first save, returns empty list until then',
      'SQL Warehouse Offline — warehouse may be paused/stopped',
      'Schema Mismatch — DATABRICKS_CLIENT_SCHEMA env var points to wrong schema'
    ],
    howToFix: '1. Sign in to Databricks (click Sign In in the header)\n2. Navigate to Knowledge Base hex → Personas mode\n3. Try creating a persona — this auto-creates the custom_personas table\n4. If error persists, check Vercel function logs for the /api/databricks/personas/list route\n5. Verify DATABRICKS_HOST, DATABRICKS_TOKEN, DATABRICKS_WAREHOUSE_ID are set in Vercel env vars\n6. Confirm the Databricks SQL warehouse is running (check your Databricks workspace)',
    codeExample: `// api/databricks/personas/list.js
// Table auto-created on first call:
// CREATE TABLE IF NOT EXISTS knowledge_base.{schema}.custom_personas (
//   persona_id STRING, name STRING, hex_ids STRING,
//   content_json STRING, created_by STRING,
//   created_at TIMESTAMP, updated_at TIMESTAMP, is_active BOOLEAN
// )
// Custom persona IDs use prefix: custom-{uuid}`,
  },

  'kb-custom-personas-ui': {
    title: 'Custom Personas Not Appearing in Hex Pickers',
    symptom: 'Personas created in KB hex do not show up in Luminaries, Colleagues, Consumers, or Cultural Voices hex pickers',
    whatThisMeans: [
      'Custom personas not fetched on auth',
      'hex_ids field set to a specific hex but user is in a different hex',
      'Persona created but Databricks not authenticated when page loaded'
    ],
    commonCauses: [
      'Auth Timing — customPersonas fetched during loadSharedConfig which runs on auth; page refresh after sign-in may be needed',
      'Wrong Hex Assignment — persona hex_ids set to specific hex(es) not including current hex',
      'All Hexes — set hex_ids to "any" to appear in all persona hexes'
    ],
    howToFix: '1. Sign out and sign back in to Databricks to trigger a fresh fetch\n2. Navigate to KB hex → Personas mode → check the persona\'s "Available in" setting\n3. Change to "All hexes" to make it appear everywhere\n4. Navigate to the target hex and check the Custom Personas section below built-in categories\n5. Custom personas show with a [Custom] badge and work like built-in personas',
    codeExample: `// CentralHexView.tsx — custom persona filter
const matchingCustom = customPersonas.filter(p =>
  p.hexIds === 'any' ||
  p.hexIds.split(',').map(s => s.trim()).includes(hexId)
);
// hexId values: 'Luminaries', 'Colleagues', 'cultural', 'Consumers'`,
  },

  // ── SHARE YOUR WISDOM HEX TESTS ────────────────────────────────────────────
  'wisdom-voice-transcription': {
    title: 'Voice Recording Not Transcribing',
    symptom: 'Voice recording saves to KB but no transcript is generated when processed',
    whatThisMeans: [
      'OPENAI_API_KEY env var is missing or incorrect',
      'Audio file uploaded correctly but transcription step fails silently',
      'The _txt file will contain a placeholder instead of transcript text'
    ],
    commonCauses: [
      'Missing OPENAI_API_KEY - Not set in Vercel environment variables',
      'Missing OPENAI_API_KEY - Not set in local .env file for dev',
      'Key not redeployed - Added to Vercel but project not redeployed after adding',
      'Audio format issue - Browser recorded in unsupported format'
    ],
    howToFix: '1. Verify OPENAI_API_KEY is set in Vercel → Project → Settings → Environment Variables\n2. Verify OPENAI_API_KEY is set in local .env file\n3. Redeploy after adding the key (git push triggers auto-deploy)\n4. Process the audio file in KB → check _txt file content\n5. If _txt says "Transcription unavailable" → key is missing\n6. If _txt says "Transcription failed" → check server logs for OpenAI error detail\n7. Confirm key has access to Whisper-1 model (platform.openai.com → API keys)',
    codeExample: `// api/databricks/knowledge-base/process.js
// Audio files (.webm, .mp3, .wav, .ogg, .m4a) are transcribed via OpenAI Whisper-1
// Output format: "[Recorded: Monday, May 6, 2026]\\n\\n<transcript text>"
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// FormData sent to: https://api.openai.com/v1/audio/transcriptions
// model: 'whisper-1'`,
  },

  'wisdom-interview-mode': {
    title: 'Interview Mode Not Available in Wisdom Hex',
    symptom: 'Cannot see "Be Interviewed" option as 6th input method',
    whatThisMeans: [
      'Interview mode radio button not rendering',
      'Not on Wisdom hex',
      'Only 5 input methods showing instead of 6'
    ],
    commonCauses: [
      'Wrong Hex - Must navigate to Wisdom (Share Your Wisdom) hex',
      'Input Method Question Not Rendered - Wisdom hex question "Input Method" not showing',
      'InterviewDialog Component Missing - Interview integration not loaded',
      'Radio Button Missing - 6th input method (Interview) not in render list'
    ],
    howToFix: '1. Navigate to Wisdom hex (Share Your Wisdom icon)\n2. Look for "How would you like to share?" question\n3. Verify all 6 input method radio buttons:\n   - Text\n   - Voice\n   - Photo\n   - Video\n   - File\n   - Be Interviewed (6th option)\n4. Check ProcessWireframe.tsx for Interview option rendering\n5. Verify InterviewDialog component is imported and available\n6. Check if wisdomInputMethod state tracks "Interview" selection',
    codeExample: `// ProcessWireframe.tsx - Wisdom hex input methods
if (activeStepId === 'Wisdom') {
  if (idx === 0 && question === 'Input Method') {
    return (
      <div className="space-y-1">
        {['Text', 'Voice', 'Photo', 'Video', 'File', 'Interview'].map(method => (
          <label key={method} className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="inputMethod" 
              value={method} 
              checked={responses[activeStepId]?.[idx] === method}
              onChange={(e) => handleResponseChange(idx, e.target.value)}
              className="w-4 h-4" 
            />
            <span className="text-gray-700">
              {method === 'Interview' ? 'Be Interviewed' : method}
            </span>
          </label>
        ))}
      </div>
    );
  }
}

// Interview Dialog integration
const [showInterviewDialog, setShowInterviewDialog] = useState(false);
const [interviewContext, setInterviewContext] = useState<{
  insightType: 'Brand' | 'Category' | 'General';
  brand?: string;
  projectType?: string;
}>({ insightType: 'General' });

// When user selects "Interview" and clicks to start
if (inputMethod === 'Interview') {
  setInterviewContext({
    insightType: brand ? 'Brand' : (projectType ? 'Category' : 'General'),
    brand,
    projectType
  });
  setShowInterviewDialog(true);
}

// Render InterviewDialog
<InterviewDialog
  open={showInterviewDialog}
  onClose={() => setShowInterviewDialog(false)}
  insightType={interviewContext.insightType}
  brand={interviewContext.brand}
  projectType={interviewContext.projectType}
  userEmail={userEmail}
  userRole={userRole}
  onSaveTranscript={async (transcript, fileName) => {
    // Save interview transcript to Databricks KB
    const result = await uploadToKnowledgeBase({
      file: createFileFromBlob(new Blob([transcript]), fileName),
      scope: interviewContext.insightType === 'Brand' ? 'brand' : 
             interviewContext.insightType === 'Category' ? 'category' : 'general',
      fileType: 'Wisdom',
      tags: [interviewContext.insightType, 'Interview'],
      insightType: interviewContext.insightType,
      inputMethod: 'Interview',
      userEmail,
      userRole
    });
    return result.success;
  }}
/>`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/components/InterviewDialog.tsx', '/WISDOM_HEX_DOCUMENTATION.md']
  },

  'wisdom-insight-auto-detection': {
    title: 'Insight Type Auto-Detection Not Working',
    symptom: 'Insight type not automatically set based on Enter hex Brand/Project Type',
    whatThisMeans: [
      'Insight type (Brand, Category, General) not auto-detected',
      'Cross-hex data flow from Enter → Wisdom failing',
      'Wrong insight type used for Databricks upload'
    ],
    commonCauses: [
      'Enter Hex Not Completed - Brand and Project Type not selected in Enter hex',
      'localStorage Missing - cohive_responses not storing Enter hex answers',
      'Auto-Detection Logic Error - Insight type calculation incorrect',
      'Scope Mapping Wrong - Brand/Category/General not mapping to Databricks scope correctly'
    ],
    howToFix: '1. Complete Enter hex first:\n   - Select a Brand (e.g., "Nike")\n   - Select a Project Type (e.g., "Creative Messaging")\n2. Navigate to Wisdom hex\n3. Verify auto-detection logic:\n   - IF Brand selected → Insight Type = "Brand"\n   - IF no Brand BUT Project Type selected → Insight Type = "Category"\n   - IF neither → Insight Type = "General"\n4. Check localStorage cohive_responses for Enter hex data:\n   - responses["Enter"][0] = Brand\n   - responses["Enter"][1] = Project Type\n5. Verify scope mapping for Databricks upload:\n   - Brand insight → scope: "brand"\n   - Category insight → scope: "category"\n   - General insight → scope: "general"\n6. Test all three scenarios:\n   a. Select Brand + Project Type → Should be "Brand" insight\n   b. Clear Brand, keep Project Type → Should be "Category" insight\n   c. Clear both → Should be "General" insight',
    codeExample: `// ProcessWireframe.tsx - Insight type auto-detection
if (activeStepId === 'Wisdom') {
  const brand = responses['Enter']?.[0]?.trim() || '';
  const projectType = responses['Enter']?.[1]?.trim() || '';
  
  // Auto-detection logic
  const insightType = brand ? 'Brand' : (projectType ? 'Category' : 'General');
  
  // Used in save function
  const handleSaveWisdomToDatabricks = async (
    fileName: string, 
    content: string, 
    insightType: string, 
    inputMethod: string, 
    brand?: string, 
    projectType?: string
  ) => {
    // Map insight type to Databricks scope
    let scope: 'general' | 'category' | 'brand';
    if (insightType === 'General') scope = 'general';
    else if (insightType === 'Category') scope = 'category';
    else scope = 'brand';
    
    const result = await uploadToKnowledgeBase({
      file,
      scope,
      category: projectType,
      brand: scope === 'brand' ? (brand || undefined) : undefined,
      projectType: projectType || undefined,
      fileType: 'Wisdom',
      tags: [insightType, inputMethod],
      insightType: insightType as 'Brand' | 'Category' | 'General',
      inputMethod: inputMethod as 'Text' | 'Voice' | 'Photo' | 'Video' | 'File',
      userEmail,
      userRole
    });
    
    if (result.success) {
      setWisdomSuccessMessage(\`✅ "\${fileName}" saved to Knowledge Base\`);
      setTimeout(() => setWisdomSuccessMessage(null), 3000);
    }
  };
}

// Example scenarios:
// Scenario 1: Brand insight
// Enter hex: Brand = "Nike", Project Type = "Creative Messaging"
// Wisdom hex: insightType = "Brand", scope = "brand"

// Scenario 2: Category insight
// Enter hex: Brand = "", Project Type = "Product Launch"
// Wisdom hex: insightType = "Category", scope = "category"

// Scenario 3: General insight
// Enter hex: Brand = "", Project Type = ""
// Wisdom hex: insightType = "General", scope = "general"

// Verify in localStorage
const responses = JSON.parse(localStorage.getItem('cohive_responses') || '{}');
console.log('Brand:', responses['Enter']?.[0]);
console.log('Project Type:', responses['Enter']?.[1]);
console.log('Auto-detected Insight Type:', 
  responses['Enter']?.[0] ? 'Brand' : 
  responses['Enter']?.[1] ? 'Category' : 'General'
);`,
    relatedFiles: ['/components/ProcessWireframe.tsx', '/utils/databricksAPI.ts', '/WISDOM_HEX_DOCUMENTATION.md']
  },

  // ── MY FILES HEX TESTS ─────────────────────────────────────────────────────
  'myfiles-show-all-users': {
    title: '"Show All Users" Toggle Not Found in My Files',
    symptom: 'Cannot find toggle to switch between "My Files" and "All Users\' Files"',
    whatThisMeans: [
      'User scope filtering not visible',
      'Not on My Files (Review) hex',
      'Cannot switch between personal files and team files'
    ],
    commonCauses: [
      'Wrong Hex - Must navigate to My Files (Review) hex',
      'Toggle Not Rendered - showAllUsers state not implemented',
      'No Files Yet - ReviewView may not render if no authentication',
      'Databricks Not Authenticated - Must sign in to see files'
    ],
    howToFix: '1. Navigate to My Files hex (Review icon)\n2. Ensure Databricks authentication is complete\n3. Look for checkbox or toggle labeled "Show All Users" or "All Users"\n4. Default state should be OFF (showing only your files)\n5. When toggled ON, should show workspace-wide files\n6. Check ReviewView.tsx for showAllUsers state:\n   - Line 22: showAllUsers state variable\n   - Line 78-80: Filters files by currentUserEmail when OFF\n   - Shows all workspace files when ON\n7. Verify filter params sent to Databricks:\n   - When OFF: params.uploadedBy = currentUserEmail\n   - When ON: No uploadedBy filter (all users)',
    codeExample: `// ReviewView.tsx - Show All Users toggle
const [showAllUsers, setShowAllUsers] = useState(false);
const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

// Fetch files with user scope filtering
const fetchFiles = async () => {
  const params: any = {};
  
  // FILTER: Only show "Findings" files
  params.fileType = 'Findings';
  
  // If not showing all users, filter by current user
  if (!showAllUsers) {
    params.uploadedBy = currentUserEmail;
  }
  
  // Apply additional filters
  if (filterBrand) params.brand = filterBrand;
  if (filterProjectType) params.projectType = filterProjectType;
  
  const fetchedFiles = await listKnowledgeBaseFiles(params);
  setFiles(fetchedFiles);
};

// Toggle control in UI
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={showAllUsers}
    onChange={(e) => setShowAllUsers(e.target.checked)}
  />
  <span>Show All Users' Files</span>
</label>

// Example: Testing the toggle
// Default (OFF): Only your files show
// Toggle ON: All workspace users' files show
// Use case: See what teammates have created`,
    relatedFiles: ['/components/ReviewView.tsx', '/utils/databricksAPI.ts']
  },

  'myfiles-findings-filter': {
    title: 'Findings File Type Filter Not Working',
    symptom: 'Seeing Research, Wisdom, or other file types in My Files (should only show Findings)',
    whatThisMeans: [
      'File type filter not applied correctly',
      'Research or Wisdom files appearing in My Files',
      'Should only show assessment results and summaries (Findings)'
    ],
    commonCauses: [
      'Filter Not Hardcoded - ReviewView.tsx line 75 missing fileType: "Findings"',
      'API Not Filtering - Databricks not filtering by file type',
      'Wrong File Type on Upload - Files uploaded with wrong fileType tag',
      'Cache Issue - Old data showing non-Findings files'
    ],
    howToFix: '1. Verify ReviewView.tsx line 75 has hardcoded filter:\n   params.fileType = "Findings";\n2. Check Databricks API call includes fileType parameter\n3. Verify only assessment results appear (not raw research)\n4. Files should be from workflow hexes (Luminaries, Consumers, etc.)\n5. Check file metadata in Databricks:\n   - Findings: Assessment results and summaries\n   - Research: Raw research files (should NOT appear in My Files)\n   - Wisdom: Crowdsourced insights (should NOT appear in My Files)\n6. Refresh files list to clear cache\n7. Test with known Findings file - should appear\n8. Test with known Research file - should NOT appear',
    codeExample: `// ReviewView.tsx - Findings file type filter (line 68-75)
const fetchFiles = async () => {
  setLoading(true);
  try {
    const params: any = {};
    
    // FILTER: Only show "Findings" files in My Files (iterative and summary)
    params.fileType = 'Findings';
    
    // This excludes:
    // - Research files (fileType: 'Research')
    // - Wisdom files (fileType: 'Wisdom')
    // - Project files (fileType: 'Project')
    
    const fetchedFiles = await listKnowledgeBaseFiles(params);
    console.log('[ReviewView] Received files:', fetchedFiles.length);
    setFiles(fetchedFiles);
  } catch (error) {
    console.error('[ReviewView] Error fetching files:', error);
  }
};

// My Files should ONLY show:
// ✓ Assessment results from workflow hexes
// ✓ Summary findings
// ✗ NOT Research files (those are in Knowledge Base)
// ✗ NOT Wisdom contributions (those are in Knowledge Base)

// Verify file types in console
fetchedFiles.forEach(file => {
  console.log(\`File: \${file.fileName}, Type: \${file.fileType}\`);
  // All should show: Type: Findings
});`,
    relatedFiles: ['/components/ReviewView.tsx', '/utils/databricksAPI.ts', '/components/CentralHexView.tsx']
  },

  'myfiles-multi-select': {
    title: 'Multi-Select and Batch Operations Not Working',
    symptom: 'Cannot select multiple files or perform bulk download/delete',
    whatThisMeans: [
      'File checkboxes not appearing',
      'Select All control missing',
      'Bulk Download or Delete buttons not enabled',
      'Can only work with one file at a time'
    ],
    commonCauses: [
      'No Files to Display - Must have Findings files in My Files',
      'Checkboxes Not Rendering - selectedFiles state not working',
      'Buttons Disabled - Download/Delete buttons require file selection',
      'Not on My Files Hex - Must navigate to Review hex'
    ],
    howToFix: '1. Navigate to My Files (Review) hex\n2. Ensure you have Findings files (run assessments to create some)\n3. Look for checkboxes next to each file\n4. Look for "Select All" checkbox or button\n5. Select one or more files - checkboxes should check\n6. Verify Download and Delete buttons become enabled\n7. Test bulk download:\n   - Select 2+ files\n   - Click Download button\n   - All selected files should download\n8. Test bulk delete:\n   - Select 2+ files\n   - Click Delete button\n   - Confirm deletion\n   - All selected files should be removed\n9. Check ReviewView.tsx state:\n   - selectedFiles: Set<string> tracks selections\n   - toggleFileSelection adds/removes from set\n   - toggleSelectAll selects/deselects all files',
    codeExample: `// ReviewView.tsx - Multi-select and batch operations
const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

// Toggle individual file selection
const toggleFileSelection = (fileId: string) => {
  const newSelected = new Set(selectedFiles);
  if (newSelected.has(fileId)) {
    newSelected.delete(fileId);
  } else {
    newSelected.add(fileId);
  }
  setSelectedFiles(newSelected);
};

// Toggle select all
const toggleSelectAll = () => {
  if (selectedFiles.size === sortedFiles.length) {
    setSelectedFiles(new Set()); // Deselect all
  } else {
    setSelectedFiles(new Set(sortedFiles.map(f => f.fileId))); // Select all
  }
};

// File row with checkbox
{sortedFiles.map(file => (
  <tr key={file.fileId}>
    <td>
      <input
        type="checkbox"
        checked={selectedFiles.has(file.fileId)}
        onChange={() => toggleFileSelection(file.fileId)}
      />
    </td>
    <td>{file.fileName}</td>
    <td>{file.brand}</td>
  </tr>
))}

// Bulk download
const handleDownload = async () => {
  const filesToDownload = sortedFiles.filter(f => selectedFiles.has(f.fileId));
  
  if (filesToDownload.length === 0) {
    alert('No files selected for download');
    return;
  }

  for (const file of filesToDownload) {
    await downloadKnowledgeBaseFile(file.fileId, file.fileName);
  }
  
  alert(\`✅ Successfully downloaded \${filesToDownload.length} file(s)!\`);
};

// Bulk delete
const handleDelete = async () => {
  if (selectedFiles.size === 0) return;
  
  if (!confirm(\`Delete \${selectedFiles.size} file(s)? Cannot be undone.\`)) {
    return;
  }
  
  const filesToDelete = sortedFiles.filter(f => selectedFiles.has(f.fileId));
  
  for (const file of filesToDelete) {
    await deleteKnowledgeBaseFile(file.fileId, currentUserEmail, userRole);
  }
  
  fetchFiles(); // Refresh list
};`,
    relatedFiles: ['/components/ReviewView.tsx', '/utils/databricksAPI.ts']
  },

  'myfiles-advanced-filtering': {
    title: 'Advanced Filtering System Not Working',
    symptom: 'Cannot filter My Files by Brand, Project Type, Date Range, or Sort options',
    whatThisMeans: [
      'Filter controls not visible or not working',
      'Cannot narrow down file list by criteria',
      'Apply/Clear filter buttons missing',
      'Sort options not available'
    ],
    commonCauses: [
      'Not on My Files Hex - Must navigate to Review hex',
      'Filter UI Not Rendered - showFilters state controls visibility',
      'No Filter Data - Dropdown options populate from actual files',
      'Filters Not Applied - Apply button must be clicked to execute filters'
    ],
    howToFix: '1. Navigate to My Files (Review) hex\n2. Look for Filter button or icon to show filter controls\n3. Verify all filter inputs are available:\n   - Brand dropdown (populated from your files)\n   - Project Type dropdown (populated from your files)\n   - Date Range inputs (start/end dates)\n   - User filter (when "Show All Users" is ON)\n   - Sort dropdown (Date, Brand, Project Type, File Type)\n4. Select filter criteria (e.g., Brand = "Nike")\n5. Click "Apply Filters" button to execute\n6. Verify filtered results appear\n7. Test "Clear Filters" button - should reset all filters\n8. Test combined filters:\n   - Brand = "Nike" + Project Type = "Creative Messaging"\n   - Should show only files matching BOTH criteria (AND logic)\n9. Check ReviewView.tsx filter states:\n   - filterBrand, filterProjectType, filterFileType, filterUser\n   - filterDateRange with start/end\n   - availableBrands, availableProjectTypes (dynamic from data)\n10. Verify Databricks params include all active filters',
    codeExample: `// ReviewView.tsx - Advanced filtering system
// Filter states
const [showFilters, setShowFilters] = useState(false);
const [filterBrand, setFilterBrand] = useState<string>('');
const [filterProjectType, setFilterProjectType] = useState<string>('');
const [filterFileType, setFilterFileType] = useState<string>('');
const [filterUser, setFilterUser] = useState<string>('');
const [filterDateRange, setFilterDateRange] = useState<{ start: string; end: string }>({
  start: '', end: ''
});

// Available filter options (populated from actual data)
const [availableBrands, setAvailableBrands] = useState<string[]>([]);
const [availableProjectTypes, setAvailableProjectTypes] = useState<string[]>([]);
const [availableUsers, setAvailableUsers] = useState<string[]>([]);

// Sorting
const [sortBy, setSortBy] = useState<'date' | 'brand' | 'projectType' | 'fileType'>('date');

// Apply filters to Databricks query
const handleApplyFilters = () => {
  const params: any = {};
  params.fileType = 'Findings'; // Always filter to Findings
  
  // Apply user-selected filters
  if (filterBrand) params.brand = filterBrand;
  if (filterProjectType) params.projectType = filterProjectType;
  if (filterUser && showAllUsers) params.uploadedBy = filterUser;
  if (filterDateRange.start) params.startDate = filterDateRange.start;
  if (filterDateRange.end) params.endDate = filterDateRange.end;
  
  // Apply sort
  if (sortBy === 'date') {
    params.sortBy = 'upload_date';
    params.sortOrder = 'DESC'; // Newest first
  } else {
    params.sortBy = 'file_name';
    params.sortOrder = 'ASC';
  }
  
  fetchFiles(); // Execute query with filters
};

// Clear all filters
const handleClearFilters = () => {
  setFilterBrand('');
  setFilterProjectType('');
  setFilterFileType('');
  setFilterUser('');
  setFilterDateRange({ start: '', end: '' });
  fetchFiles();
};

// Filter UI
<div className="filter-controls">
  <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
    <option value="">All Brands</option>
    {availableBrands.map(brand => (
      <option key={brand} value={brand}>{brand}</option>
    ))}
  </select>
  
  <select value={filterProjectType} onChange={(e) => setFilterProjectType(e.target.value)}>
    <option value="">All Project Types</option>
    {availableProjectTypes.map(type => (
      <option key={type} value={type}>{type}</option>
    ))}
  </select>
  
  <input 
    type="date" 
    value={filterDateRange.start} 
    onChange={(e) => setFilterDateRange({...filterDateRange, start: e.target.value})}
  />
  <input 
    type="date" 
    value={filterDateRange.end} 
    onChange={(e) => setFilterDateRange({...filterDateRange, end: e.target.value})}
  />
  
  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
    <option value="date">Sort by Date</option>
    <option value="brand">Sort by Brand</option>
    <option value="projectType">Sort by Project Type</option>
    <option value="fileType">Sort by File Type</option>
  </select>
  
  <button onClick={handleApplyFilters}>Apply Filters</button>
  <button onClick={handleClearFilters}>Clear Filters</button>
</div>

// Example: Find all Nike Creative Messaging files from December 2024
// 1. Set Brand = "Nike"
// 2. Set Project Type = "Creative Messaging"
// 3. Set Date Range = 2024-12-01 to 2024-12-31
// 4. Click "Apply Filters"
// Result: Only files matching ALL criteria (AND logic)`,
    relatedFiles: ['/components/ReviewView.tsx', '/utils/databricksAPI.ts']
  },

  // ── INFO HEX TESTS ──────────────────────────────────────────────────────────
  'info-popup-display': {
    title: 'Info Popup Not Displaying or Missing Structure',
    symptom: 'Info popup does not appear when Info button clicked, or missing title/description/details',
    whatThisMeans: [
      'Info modal not rendering when button clicked',
      'Popup structure incomplete (missing title, description, or "What Happens" section)',
      'Info button state not toggling showInfo',
      'Hex guidance not visible to users'
    ],
    commonCauses: [
      'Info Button Not Clicked - Must click blue "Info" button in top-right to show popup',
      'showInfo State False - Popup only visible when showInfo state is true',
      'Popup Not Rendering - ProcessFlow.tsx lines 456-523 not rendering modal',
      'DOM Structure Issue - Missing h3 (title), p (description), or ul (details list)'
    ],
    howToFix: '1. Look for blue "Info" button in top-right corner of hex cluster\n2. Click the Info button to toggle popup visibility\n3. Verify popup appears with:\n   - Title (h3) showing hex name\n   - Description (p) explaining hex purpose\n   - "What Happens:" section\n   - Bullet list (ul) with details\n4. Check browser console for React errors\n5. Verify ProcessFlow.tsx lines 456-523 render conditional:\n   {showInfo && (...popup JSX...)}\n6. Test with different hexes - content should change\n7. Look for X button to close popup\n8. Verify popup positioned at top-right (absolute positioning)',
    codeExample: `// ProcessFlow.tsx - Info popup structure (lines 444-523)
const [showInfo, setShowInfo] = useState(false);

return (
  <div className="absolute top-0 right-0 z-50">
    {/* Info Button */}
    <button
      onClick={() => setShowInfo(!showInfo)}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
      title="View information about the current hexagon"
    >
      <Info className="w-4 h-4" />
      Info
    </button>

    {/* Info Popup - Only shows when showInfo is true */}
    {showInfo && (() => {
      const currentInfo = getCurrentStepInfo();
      return (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border-2 border-blue-600 rounded-lg shadow-xl z-50 p-4">
          <div className="flex items-start justify-between mb-2">
            {/* Title */}
            <h3 className="text-blue-900" style={{ fontSize: '8pt' }}>
              {currentInfo?.title || 'Hexagon Information'}
            </h3>
            {/* Close button */}
            <button onClick={() => setShowInfo(false)} aria-label="Close">
              <X className="w-3 h-3 text-gray-600" />
            </button>
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-3" style={{ fontSize: '6pt', lineHeight: '1.3' }}>
            {currentInfo?.description || 'No description available.'}
          </p>

          {/* Details section */}
          <div className="bg-gray-50 rounded p-2">
            <p className="text-gray-900 mb-2" style={{ fontSize: '7pt' }}>
              What Happens:
            </p>
            <ul className="space-y-1">
              {currentInfo?.details.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-1">
                  <div className="w-1 h-1 bg-blue-600 rounded-full mt-1"></div>
                  <span className="text-gray-700" style={{ fontSize: '6pt' }}>
                    {detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    })()}
  </div>
);

// Test checklist:
// ✓ Info button appears in top-right
// ✓ Click toggles showInfo state
// ✓ Popup shows with complete structure
// ✓ Title, description, and details all present
// ✓ X button closes popup`,
    relatedFiles: ['/components/ProcessFlow.tsx']
  },

  'info-hex-specific-content': {
    title: 'Info Content Not Changing Based on Active Hex',
    symptom: 'Info popup shows same content for all hexes, or shows generic/wrong information',
    whatThisMeans: [
      'Info content not dynamically updating when navigating between hexes',
      'getCurrentStepInfo() not returning hex-specific data',
      'Users seeing wrong guidance for current hex',
      'Hex navigation not triggering content update'
    ],
    commonCauses: [
      'Active Step Not Updating - activeStep prop not changing when hex clicked',
      'getCurrentStepInfo() Not Called - Popup not fetching current hex info',
      'hexInfo Object Missing Data - Hex ID not in hexInfo object',
      'Stale State - showInfo state not re-rendering with new hex data'
    ],
    howToFix: '1. Click on different hexes (Enter, Luminaries, Consumers, etc.)\n2. For each hex, click Info button\n3. Verify popup title matches hex name:\n   - On Enter → Title: "Enter"\n   - On Luminaries → Title: "Luminaries"\n   - On Knowledge Base → Title: "Knowledge Base"\n4. Verify description is hex-specific (not generic)\n5. Check that "What Happens:" details match hex purpose\n6. Test with at least 3 different hexes\n7. Verify getCurrentStepInfo() uses activeStep prop:\n   - Line 410: const currentInfo = getCurrentStepInfo();\n   - Line 416: return hexInfo[activeStep];\n8. Check hexInfo object (lines 163-432) has all hex IDs\n9. Verify activeStep prop updates on hex click',
    codeExample: `// ProcessFlow.tsx - Dynamic hex-specific content
// hexInfo object (lines 163-432) - Content for ALL hexes
const hexInfo: {
  [key: string]: {
    title: string;
    description: string;
    details: string[];
  };
} = {
  Enter: {
    title: 'Enter',
    description: 'The starting point for every CoHive project...',
    details: [
      'You must complete this step in order to continue',
      'Define your Brand and Project Type',
      'Create a new project or select an existing one',
      // ... more details
    ]
  },
  Luminaries: {
    title: 'Luminaries',
    description: 'Gather insights from industry experts...',
    details: [
      'Select relevant knowledge files for expert review',
      'Choose assessment type: Assess, Recommend, or Unified',
      // ... more details
    ]
  },
  Consumers: {
    title: 'Consumers',
    description: 'Get insights from your target consumer personas...',
    details: [
      'Select knowledge files for consumer analysis',
      // ... more details
    ]
  },
  // ... all 13 hexes defined
};

// getCurrentStepInfo() - Dynamically fetches active hex info
const getCurrentStepInfo = () => {
  // Special handling for Knowledge Base (role-based content)
  if (activeStep === 'research') {
    const isResearcher =
      userRole === 'administrator' ||
      userRole === 'research-analyst' ||
      userRole === 'research-leader' ||
      userRole === 'data-scientist';
    return isResearcher
      ? researchInfoForResearchers
      : researchInfoForNonResearchers;
  }
  return hexInfo[activeStep]; // Return hex-specific info
};

// Info popup uses getCurrentStepInfo() to show dynamic content
{showInfo && (() => {
  const currentInfo = getCurrentStepInfo(); // Fetches active hex info
  return (
    <div className="info-popup">
      <h3>{currentInfo?.title || 'Hexagon Information'}</h3>
      <p>{currentInfo?.description}</p>
      <ul>
        {currentInfo?.details.map(detail => (
          <li>{detail}</li>
        ))}
      </ul>
    </div>
  );
})()}

// Testing steps:
// 1. Click Enter hex → Info shows "Enter" title and Enter-specific details
// 2. Click Luminaries hex → Info shows "Luminaries" title and expert-specific details
// 3. Click Consumers hex → Info shows "Consumers" title and consumer-specific details
// 4. Content should be DIFFERENT for each hex`,
    relatedFiles: ['/components/ProcessFlow.tsx']
  },

  'info-role-based-content': {
    title: 'Role-Based Info Content Not Working (Knowledge Base)',
    symptom: 'Knowledge Base hex shows same info for all users, or wrong info for user role',
    whatThisMeans: [
      'Researchers and non-researchers seeing identical Knowledge Base info',
      'Info not reflecting user capabilities (Synthesis/Personas for researchers vs View/Suggest for non-researchers)',
      'Role-based content switching not working',
      'Users may try to access features they don\'t have permission for'
    ],
    commonCauses: [
      'Not on Knowledge Base Hex - Role-based content ONLY applies to Knowledge Base (research) hex',
      'userRole Prop Not Passed - ProcessFlow.tsx not receiving userRole prop',
      'Role Check Logic Broken - isResearcher boolean not evaluating correctly',
      'Wrong Info Object Returned - Not switching between researchInfoForResearchers and researchInfoForNonResearchers'
    ],
    howToFix: '1. Navigate to Knowledge Base hex (research icon)\n2. Click Info button\n3. Check your user role in header/settings\n4. Verify info content matches your role:\n   **Researchers (admin, research-analyst, research-leader, data-scientist):**\n   - Should see: "Synthesis", "Personas", "Create", "Approve"\n   - Description mentions creating synthesis and persona files\n   **Non-Researchers (marketing-manager, product-manager, executive-stakeholder):**\n   - Should see: "View", "Suggest edits", "Browse"\n   - Description mentions viewing and suggesting (not creating)\n5. Test by switching user roles if possible\n6. Verify ProcessFlow.tsx receives userRole prop (line 131)\n7. Check getCurrentStepInfo() lines 410-417:\n   - If activeStep === "research", check userRole\n   - Return researchInfoForResearchers or researchInfoForNonResearchers\n8. Verify both info objects defined (lines 134-160)\n9. Check role list in isResearcher check (lines 422-426)',
    codeExample: `// ProcessFlow.tsx - Role-based info content
// Researcher info (lines 134-147)
const researchInfoForResearchers = {
  title: 'Research',
  description: 'Create and manage comprehensive research assets including synthesis reports and persona files.',
  details: [
    'Choose between Synthesis and Personas modes',
    'Synthesis: Combine multiple studies, create new brand/project analyses',
    'Synthesis: Edit/approve existing synthesis files',
    'Personas: Create persona profiles for each hexagon',
    'Personas: Edit/read existing persona files',
    'Approve or reject research files for use in the workflow',
    'Upload and manage research documents'
  ]
};

// Non-researcher info (lines 150-160)
const researchInfoForNonResearchers = {
  title: 'Research',
  description: 'View research files, make suggestions, and access approved research assets.',
  details: [
    'View all research files in the system',
    'Browse synthesis reports and persona files',
    'Suggest edits to existing research files',
    'Track status of your edit suggestions (Pending, Approved, Rejected)'
  ]
};

// getCurrentStepInfo() with role-based switching (lines 410-417)
const getCurrentStepInfo = () => {
  if (activeStep === 'research') {
    // Check if user is researcher
    const isResearcher =
      userRole === 'administrator' ||
      userRole === 'research-analyst' ||
      userRole === 'research-leader' ||
      userRole === 'data-scientist';
    
    // Return appropriate info based on role
    return isResearcher
      ? researchInfoForResearchers  // Create, Approve, Synthesis, Personas
      : researchInfoForNonResearchers; // View, Suggest, Browse
  }
  return hexInfo[activeStep];
};

// Testing by role:
// Researcher sees:
// - "Create and manage comprehensive research assets"
// - "Choose between Synthesis and Personas modes"
// - "Approve or reject research files"

// Non-researcher sees:
// - "View research files, make suggestions"
// - "View all research files in the system"
// - "Suggest edits to existing research files"

// Key difference:
// Researchers: CREATE and APPROVE
// Non-researchers: VIEW and SUGGEST`,
    relatedFiles: ['/components/ProcessFlow.tsx']
  },

  'info-hex-coverage': {
    title: 'Missing Info Content for Some Hexes',
    symptom: 'Some hexes show "Hexagon Information" or "No description available" instead of specific content',
    whatThisMeans: [
      'hexInfo object missing entries for some hex IDs',
      'Incomplete documentation coverage',
      'Users unable to get guidance for certain hexes',
      'Some hexes show fallback/default content instead of specific info'
    ],
    commonCauses: [
      'Hex ID Mismatch - Hex ID in processSteps array doesn\'t match key in hexInfo object',
      'Missing hexInfo Entry - New hex added but info not defined',
      'Typo in Hex ID - Capitalization or spelling difference between step ID and hexInfo key',
      'Role-Based Content Missing - Knowledge Base missing researcher or non-researcher info'
    ],
    howToFix: '1. Navigate through ALL 13 hexes one by one\n2. For each hex, click Info button\n3. Verify specific (not generic) content appears:\n   - Title should match hex name (not "Hexagon Information")\n   - Description should be hex-specific (not "No description available")\n   - Details should explain hex-specific workflow\n4. Check hexInfo object (ProcessFlow.tsx lines 163-432) has ALL hex IDs:\n   **Required 13 hexes:**\n   - Enter\n   - research (Knowledge Base)\n   - Luminaries\n   - stories (Stories)\n   - Consumers\n   - competitors (Competitors)\n   - Colleagues\n   - cultural (Cultural Voices)\n   - social (Social Listening)\n   - Wisdom\n   - Grade (Score Results)\n   - Findings\n   - review (My Files)\n5. Verify each entry has complete structure:\n   - title: string\n   - description: string\n   - details: string[] (array with at least 1 item)\n6. Check for exact ID matching (case-sensitive)\n7. Special check: Knowledge Base (research) must have both:\n   - researchInfoForResearchers (line 134)\n   - researchInfoForNonResearchers (line 150)\n8. If hex shows fallback content, add missing entry to hexInfo',
    codeExample: `// ProcessFlow.tsx - Complete hex coverage
// ALL 13 hexes must be defined in hexInfo object
const hexInfo: {
  [key: string]: {
    title: string;
    description: string;
    details: string[];
  };
} = {
  // 1. Enter
  Enter: {
    title: 'Enter',
    description: 'The starting point for every CoHive project...',
    details: [
      'You must complete this step in order to continue',
      'Define your Brand and Project Type',
      // ... more details
    ]
  },
  
  // 2. Knowledge Base (research)
  // Has special role-based handling via researchInfoForResearchers and researchInfoForNonResearchers
  
  // 3. Luminaries
  Luminaries: {
    title: 'Luminaries',
    description: 'Gather insights from industry experts...',
    details: [/* ... */]
  },
  
  // 4. Stories
  stories: {
    title: 'Stories',
    description: 'Leverage data from consumer panel households...',
    details: [/* ... */]
  },
  
  // 5. Consumers
  Consumers: {
    title: 'Consumers',
    description: 'Get insights from target consumer personas...',
    details: [/* ... */]
  },
  
  // 6. Competitors
  competitors: {
    title: 'Competitors',
    description: 'Analyze competitive landscape...',
    details: [/* ... */]
  },
  
  // 7. Colleagues
  Colleagues: {
    title: 'Colleagues',
    description: 'Gather internal team perspectives...',
    details: [/* ... */]
  },
  
  // 8. Cultural Voices
  cultural: {
    title: 'Cultural Voices',
    description: 'Explore cultural trends and insights...',
    details: [/* ... */]
  },
  
  // 9. Social Listening
  social: {
    title: 'Social Listening',
    description: 'Analyze social media conversations...',
    details: [/* ... */]
  },
  
  // 10. Wisdom
  Wisdom: {
    title: 'Share Your Wisdom',
    description: 'Contribute insights to knowledge base...',
    details: [/* ... */]
  },
  
  // 11. Score Results
  Grade: {
    title: 'Score Results',
    description: 'Grade and evaluate assessment outcomes...',
    details: [/* ... */]
  },
  
  // 12. Findings
  Findings: {
    title: 'Findings',
    description: 'View and manage assessment results...',
    details: [/* ... */]
  },
  
  // 13. My Files
  review: {
    title: 'My Files',
    description: 'Review your assessment history...',
    details: [/* ... */]
  }
};

// Checklist for complete coverage:
// ✓ All 13 hex IDs present as keys
// ✓ Each entry has title, description, details[]
// ✓ Details array has at least 1 item
// ✓ Knowledge Base has both role-based info objects
// ✓ Hex IDs match exactly (case-sensitive) with processSteps array
// ✓ No typos in hex ID keys

// How to verify coverage:
// 1. Count entries in hexInfo: should be 12 (13 minus Knowledge Base which uses special objects)
// 2. Navigate to each hex and click Info
// 3. Should never see "Hexagon Information" or "No description available"
// 4. All info should be specific to that hex's purpose`,
    relatedFiles: ['/components/ProcessFlow.tsx']
  },

  // Add more test mappings as needed...
  'default': {
    title: 'Test Failure',
    symptom: 'Test did not pass',
    whatThisMeans: [
      'This feature is not working as expected',
      'Check the test details for specific information'
    ],
    commonCauses: [
      'Component not rendering correctly',
      'State management issue',
      'Missing or incorrect props',
      'Event handlers not attached'
    ],
    howToFix: '1. Check the "Expected" vs "Received" values in test details\n2. Look at the "Element" field for the specific DOM selector or file\n3. Check browser console for JavaScript errors\n4. Verify the component is rendering',
    relatedFiles: []
  }
};

export function TroubleshootingGuideModal({ onClose, testResults, selectedCategory }: TroubleshootingGuideModalProps) {
  // Filter to only failed or warning tests, and sort: failures first, then warnings
  const problemTests = testResults
    .filter(test => test.status === 'fail' || test.status === 'warning')
    .sort((a, b) => {
      // 'fail' comes before 'warning'
      if (a.status === 'fail' && b.status === 'warning') return -1;
      if (a.status === 'warning' && b.status === 'fail') return 1;
      return 0; // Keep original order within same status
    });
  
  // If no problems, show success message
  if (problemTests.length === 0) {
    return (
      <div className="fixed inset-y-0 left-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" style={{ right: 'var(--modal-r)', padding: 'var(--modal-p)' }}>
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl">
          <div className="px-6 py-4 border-b-2 border-gray-300 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50">
            <div>
              <h2 className="text-xl font-bold text-green-900">✓ All Tests Passed!</h2>
              <p className="text-sm text-green-700">No troubleshooting needed</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-gray-400 text-gray-700 rounded hover:bg-gray-50 font-medium"
            >
              Close
            </button>
          </div>
          <div className="p-6">
            <p className="text-gray-700 mb-4">
              Congratulations! All tests in this category have passed. No issues were detected.
            </p>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium">
                ✓ Everything is working correctly
              </p>
              <p className="text-sm text-gray-600 mt-2">
                You can continue testing other categories or close this panel.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 left-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" style={{ right: 'var(--modal-r)', padding: 'var(--modal-p)' }}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-gray-300 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Troubleshooting Guide</h2>
            <p className="text-sm text-gray-600">
              Showing fixes for {problemTests.length} failed/warning test{problemTests.length !== 1 ? 's' : ''}
              {selectedCategory && selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border-2 border-gray-400 text-gray-700 rounded hover:bg-gray-50 font-medium"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          
          {/* Quick Reference */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-blue-900 mb-2">How to Use This Guide</h3>
            <p className="text-sm text-gray-700 mb-3">
              Each section below corresponds to a test that failed or has a warning. Follow the step-by-step instructions to fix the issue.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="text-red-600 font-bold">✗</div>
                <div>
                  <div className="font-bold text-gray-900">Failed Tests</div>
                  <div className="text-gray-600">Feature is broken - fix immediately</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-yellow-600 font-bold">⚠</div>
                <div>
                  <div className="font-bold text-gray-900">Warning Tests</div>
                  <div className="text-gray-600">May need attention - review context</div>
                </div>
              </div>
            </div>
          </div>

          {/* Problem Tests */}
          {problemTests.map((test, index) => {
            const troubleshooting = TROUBLESHOOTING_DB[test.id] || TROUBLESHOOTING_DB['default'];
            const borderColor = test.status === 'fail' ? 'border-red-500' : 'border-yellow-500';
            const bgColor = test.status === 'fail' ? 'bg-red-50' : 'bg-yellow-50';
            const textColor = test.status === 'fail' ? 'text-red-700' : 'text-yellow-700';
            const badgeColor = test.status === 'fail' ? 'bg-red-600' : 'bg-yellow-600';

            return (
              <div key={test.id} className={`mb-6 border-l-4 ${borderColor} pl-4 ${bgColor} p-4 rounded-r-lg`}>
                
                {/* Test Name & Status */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className={`text-lg font-bold ${textColor}`}>
                      {index + 1}. {troubleshooting.title || test.name}
                    </h3>
                    <div className="text-sm text-gray-600 mt-1">
                      <strong>Test ID:</strong> {test.id} • <strong>Category:</strong> {test.category}
                    </div>
                  </div>
                  <span className={`${badgeColor} text-white px-3 py-1 rounded-full text-xs font-bold uppercase`}>
                    {test.status}
                  </span>
                </div>

                {/* Symptom */}
                <div className="mb-3">
                  <h4 className="font-bold text-gray-900 text-sm uppercase mb-1">Symptom:</h4>
                  <p className="text-sm text-gray-800 font-semibold">{troubleshooting.symptom}</p>
                </div>

                {/* Test Message */}
                <div className="mb-3 bg-white border-2 border-gray-300 rounded p-3">
                  <h4 className="font-bold text-gray-900 text-sm uppercase mb-1">Test Message:</h4>
                  <p className="text-sm text-gray-700">{test.message}</p>
                </div>

                {/* Expected vs Received */}
                {(test.expected || test.received) && (
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    {test.expected && (
                      <div className="bg-white border-2 border-green-300 rounded p-2">
                        <div className="text-xs font-bold text-green-700 uppercase mb-1">Expected:</div>
                        <code className="text-xs text-gray-900 font-mono break-words">{test.expected}</code>
                      </div>
                    )}
                    {test.received && (
                      <div className="bg-white border-2 border-red-300 rounded p-2">
                        <div className="text-xs font-bold text-red-700 uppercase mb-1">Received:</div>
                        <code className="text-xs text-gray-900 font-mono break-words">{test.received}</code>
                      </div>
                    )}
                  </div>
                )}

                {/* What This Means */}
                <div className="mb-3">
                  <h4 className="font-bold text-gray-900 text-sm uppercase mb-1">What This Means:</h4>
                  <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                    {troubleshooting.whatThisMeans.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Common Causes */}
                <div className="mb-3">
                  <h4 className="font-bold text-gray-900 text-sm uppercase mb-1">Common Causes:</h4>
                  <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                    {troubleshooting.commonCauses.map((cause, i) => (
                      <li key={i} className="ml-2">{cause}</li>
                    ))}
                  </ol>
                </div>

                {/* How to Fix */}
                <div className="mb-3">
                  <h4 className="font-bold text-gray-900 text-sm uppercase mb-1">How to Fix:</h4>
                  <div className="bg-blue-100 border-2 border-blue-300 rounded p-3 text-sm text-gray-800 whitespace-pre-line">
                    {troubleshooting.howToFix}
                  </div>
                </div>

                {/* Code Example */}
                {troubleshooting.codeExample && (
                  <div className="mb-3">
                    <h4 className="font-bold text-gray-900 text-sm uppercase mb-1">Code Example:</h4>
                    <div className="bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto">
                      <pre className="text-xs font-mono whitespace-pre">{troubleshooting.codeExample}</pre>
                    </div>
                  </div>
                )}

                {/* Related Files */}
                {troubleshooting.relatedFiles.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm uppercase mb-1">Files to Check:</h4>
                    <div className="flex flex-wrap gap-2">
                      {troubleshooting.relatedFiles.map((file, i) => (
                        <code key={i} className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-blue-600">
                          {file}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {/* Element */}
                {test.element && (
                  <div className="mt-3">
                    <h4 className="font-bold text-gray-900 text-sm uppercase mb-1">Target Element:</h4>
                    <div className="bg-white border-2 border-gray-300 rounded p-2">
                      <code className="text-xs text-gray-700 font-mono">{test.element}</code>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Best Practices Footer */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mt-6">
            <h3 className="text-lg font-bold text-green-900 mb-2">Best Practices</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Fix failures one at a time, starting with the first one</li>
              <li>Check browser console for additional error details</li>
              <li>Re-run tests after each fix to verify</li>
              <li>Clear cache if issues persist</li>
              <li>Export test results to share with team if needed</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}