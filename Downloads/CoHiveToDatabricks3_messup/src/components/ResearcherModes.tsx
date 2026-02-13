import { useState, useEffect } from 'react';
import { DatabricksFileBrowser } from './DatabricksFileBrowser';
import { uploadToKnowledgeBase } from '../utils/databricksAPI';
import { Upload } from 'lucide-react';

interface ResearchFile {
  id: string;
  brand: string;
  projectType: string;
  fileName: string;
  isApproved: boolean;
  uploadDate: number;
  fileType: string;
  content?: string; // Optional: actual file content from Databricks
  source?: string; // Optional: source path in Databricks
}

interface EditSuggestion {
  id: string;
  researchFileId: string;
  fileName: string;
  suggestedBy: string;
  suggestion: string;
  timestamp: number;
  status: 'pending' | 'reviewed' | 'implemented';
}

interface ResearcherModesProps {
  brand: string;
  projectType: string;
  researchFiles: ResearchFile[];
  editSuggestions?: EditSuggestion[];
  canApproveResearch: boolean;
  onCreateResearchFile: (file: Omit<ResearchFile, 'id' | 'uploadDate'>) => void;
  onToggleApproval: (fileId: string) => void;
  onUpdateResearchFile?: (fileId: string, content: string) => void;
  onUpdateSuggestionStatus?: (suggestionId: string, status: 'pending' | 'reviewed' | 'implemented') => void;
  availableBrands?: string[];
  availableProjectTypes?: string[];
  onAddBrand?: (brand: string) => void;
  onAddProjectType?: (projectType: string) => void;
}

// Central hexagon steps (excluding Enter, Research, Findings)
const centralHexagons = [
  { id: 'Luminaries', label: 'Luminaries', color: 'bg-teal-100', borderColor: 'border-teal-300' },
  { id: 'panelist', label: 'Panelist', color: 'bg-cyan-100', borderColor: 'border-cyan-300' },
  { id: 'Consumers', label: 'Consumers', color: 'bg-sky-100', borderColor: 'border-sky-300' },
  { id: 'competitors', label: 'Competitors', color: 'bg-indigo-100', borderColor: 'border-indigo-300' },
  { id: 'Colleagues', label: 'Colleagues', color: 'bg-violet-100', borderColor: 'border-violet-300' },
  { id: 'cultural', label: 'Cultural Voices', color: 'bg-purple-100', borderColor: 'border-purple-300' },
  { id: 'social', label: 'Social Listening', color: 'bg-fuchsia-100', borderColor: 'border-fuchsia-300' },
  { id: 'Grade', label: 'Score Results', color: 'bg-pink-100', borderColor: 'border-pink-300' }
];

export function ResearcherModes({
  brand,
  projectType,
  researchFiles,
  editSuggestions = [],
  canApproveResearch,
  onCreateResearchFile,
  onToggleApproval,
  onUpdateResearchFile,
  onUpdateSuggestionStatus,
  availableBrands = [],
  availableProjectTypes = [],
  onAddBrand,
  onAddProjectType
}: ResearcherModesProps) {
  const [mode, setMode] = useState<'synthesis' | 'personas' | 'read-edit-approve' | null>(() => {
    // Load saved mode from localStorage
    const saved = localStorage.getItem('cohive_research_mode');
    return saved as 'synthesis' | 'personas' | 'read-edit-approve' | null;
  });
  
  // Synthesis state
  const [synthesisOption, setSynthesisOption] = useState<'new-synthesis' | 'add-studies' | 'new-brand' | 'new-project-type' | 'edit-existing' | 'review-edits' | null>(null);
  const [synthesisResponses, setSynthesisResponses] = useState<{ [key: string]: string }>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // New Synthesis state
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedProjectType, setSelectedProjectType] = useState<string>('');
  const [selectedDatabricksFiles, setSelectedDatabricksFiles] = useState<ResearchFile[]>([]);
  const [showDatabricksBrowser, setShowDatabricksBrowser] = useState(false);
  
  // Brand/Project Type management
  const [newBrand, setNewBrand] = useState('');
  const [newProjectType, setNewProjectType] = useState('');
  
  // Edit file popup state
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingFile, setEditingFile] = useState<ResearchFile | null>(null);
  const [editedContent, setEditedContent] = useState('');

  // Personas state
  const [selectedHexagon, setSelectedHexagon] = useState<string | null>(null);
  const [personaView, setPersonaView] = useState<'create' | 'edit'>('create');
  const [selectedFileToEdit, setSelectedFileToEdit] = useState<ResearchFile | null>(null);
  const [personaFileForm, setPersonaFileForm] = useState({
    brandScope: 'single' as 'single' | 'category' | 'all',
    brandName: brand,
    categoryName: '',
    fileName: '',
    fileType: ''
  });

  // Read/Edit/Approve state
  const [selectedFile, setSelectedFile] = useState<ResearchFile | null>(null);
  const [editContent, setEditContent] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'synthesis' | 'personas'>('all');

  // Save mode to localStorage whenever it changes
  useEffect(() => {
    if (mode) {
      localStorage.setItem('cohive_research_mode', mode);
    } else {
      localStorage.removeItem('cohive_research_mode');
    }
  }, [mode]);

  // Update selectedFile when researchFiles changes (e.g., approval status)
  useEffect(() => {
    if (selectedFile) {
      const updatedFile = researchFiles.find(f => f.id === selectedFile.id);
      if (updatedFile) {
        setSelectedFile(updatedFile);
      }
    }
  }, [researchFiles]);

  // Helper function to generate default filename
  const generateDefaultFileName = (brand: string, projectType: string) => {
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    };
    
    const cleanName = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '');
    
    // Map "Grade" to "Score" for filenames
    const mappedProjectType = projectType === 'Grade' ? 'Score' : projectType;
    
    const brandPart = cleanName(brand) || 'Brand';
    const projectTypePart = cleanName(mappedProjectType) || 'ProjectType';
    const creationPart = formatDate(Date.now());
    
    return `${brandPart}_${projectTypePart}_${creationPart}`;
  };

  // Get files created for personas mode (for central hexagons)
  const getPersonaFiles = (hexagonId: string) => {
    return researchFiles.filter(file => file.fileType === hexagonId);
  };

  const handleSynthesisQuestionChange = (questionKey: string, value: string) => {
    setSynthesisResponses(prev => ({
      ...prev,
      [questionKey]: value
    }));
  };

  // Handle files selected from Databricks browser
  const handleDatabricksFilesSelected = (files: Array<{ name: string; content: string; source: string }>, autoApprove: boolean) => {
    if (!selectedBrand || !selectedProjectType) {
      console.error('Brand and Project Type must be selected before importing files');
      return;
    }

    // Convert the Databricks files to ResearchFile format and add them
    files.forEach((file) => {
      const newFile: Omit<ResearchFile, 'id' | 'uploadDate'> = {
        brand: selectedBrand, // Use the currently selected brand
        projectType: selectedProjectType, // Use the currently selected project type
        fileName: file.name,
        isApproved: autoApprove,
        fileType: 'synthesis',
        content: file.content,
        source: file.source
      };
      
      onCreateResearchFile(newFile);
    });
    
    setShowDatabricksBrowser(false);
  };

  // Handle uploading file from computer to Databricks
  const handleUploadToDatabricks = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBrand || !selectedProjectType) {
      if (!selectedBrand || !selectedProjectType) {
        alert('Please select Brand and Project Type first');
      }
      return;
    }

    try {
      // Upload to Databricks Knowledge Base using the File object directly
      const result = await uploadToKnowledgeBase({
        file: file,
        scope: 'brand',
        category: selectedProjectType,
        brand: selectedBrand,
        projectType: selectedProjectType,
        fileType: 'Synthesis',
        tags: [],
        userEmail: 'user@company.com',
        userRole: canApproveResearch ? 'research-leader' : 'research-analyst',
      });
        
      if (result.success) {
        console.log('File uploaded to Databricks:', file.name);
        
        // Read file content for local reference only
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          
          const newFile: Omit<ResearchFile, 'id' | 'uploadDate'> = {
            brand: selectedBrand,
            projectType: selectedProjectType,
            fileName: file.name,
            isApproved: false,
            fileType: 'synthesis',
            content: content,
            source: result.filePath ? `Databricks: ${result.filePath}` : `Databricks KB: ${file.name}`
          };
          
          onCreateResearchFile(newFile);
        };
        reader.readAsDataURL(file);
      } else {
        alert('Failed to upload: ' + (result.error || 'Unknown error'));
      }
      
      event.target.value = '';

    } catch (error) {
      console.error('Error uploading file to Databricks:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  const handleCreatePersonaFile = () => {
    if (!selectedHexagon || !personaFileForm.fileName.trim()) return;

    let brandValue = '';
    if (personaFileForm.brandScope === 'single') {
      brandValue = personaFileForm.brandName;
    } else if (personaFileForm.brandScope === 'category') {
      brandValue = `Category: ${personaFileForm.categoryName}`;
    } else {
      brandValue = 'All Brands';
    }

    const newFile: Omit<ResearchFile, 'id' | 'uploadDate'> = {
      brand: brandValue,
      projectType: selectedHexagon, // Store hexagon type in projectType for personas
      fileName: personaFileForm.fileName,
      isApproved: false,
      fileType: selectedHexagon // Also store in fileType for easy filtering
    };

    onCreateResearchFile(newFile);

    // Reset form
    setPersonaFileForm({
      brandScope: 'single',
      brandName: brand,
      categoryName: '',
      fileName: '',
      fileType: ''
    });
  };

  // If no mode selected, show mode selection
  if (!mode) {
    return (
      <div className="space-y-4">
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="text-purple-900 leading-tight">Research Mode Selection</h3>
          <p className="text-purple-700 text-sm">
            Build, Edit and Approve Research Files and Persona Files
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Synthesis Mode */}
          <button
            onClick={() => setMode('synthesis')}
            className="bg-white border-2 border-gray-300 rounded-lg p-6 hover:border-purple-500 hover:bg-purple-50 transition-colors text-left group"
          >
            <div>
              <h4 className="text-gray-900">Synthesis</h4>
              <p className="text-gray-600 text-sm">
                Combine and analyze multiple research studies to generate comprehensive insights
              </p>
              <div className="mt-3 text-xs text-purple-600 group-hover:text-purple-700">
                • Add Studies • New Brand • New Project Type • {canApproveResearch ? 'Review/Edit/Approve' : 'View Files'}
              </div>
            </div>
          </button>

          {/* Personas Mode */}
          <button
            onClick={() => setMode('personas')}
            className="bg-white border-2 border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group"
          >
            <div>
              <h4 className="text-gray-900">Personas</h4>
              <p className="text-gray-600 text-sm">
               Create lists of Personas for each Hexagon with key characteristics for each Persona
              </p>
              <div className="mt-3 text-xs text-blue-600 group-hover:text-blue-700">
                Files can be for single brands, categories, or all brands • {canApproveResearch ? 'Review/Edit/Approve' : 'Create Personas'}
              </div>
            </div>
          </button>

          {/* Read Files Mode - Available for all researchers, with different permissions */}
          <button
            onClick={() => setMode('read-edit-approve')}
            className="bg-white border-2 border-gray-300 rounded-lg p-6 hover:border-green-500 hover:bg-green-50 transition-colors text-left group"
          >
            <div>
              <h4 className="text-gray-900">
                {canApproveResearch ? 'Read, Edit, or Approve' : 'Read Files'}
              </h4>
              <p className="text-gray-600 text-sm">
                {canApproveResearch 
                  ? 'Read, edit, or approve any synthesis or persona file'
                  : 'View all synthesis and persona files in the knowledge base'
                }
              </p>
              <div className="mt-3 text-xs text-green-600 group-hover:text-green-700">
                {canApproveResearch 
                  ? '• View all files • Edit content • Approve/unapprove'
                  : '• View all files • Read content • Learn from existing research'
                }
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Synthesis Mode
  if (mode === 'synthesis') {
    return (
      <div className="space-y-4">
        {/* Mode Switcher - Always visible at top */}
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <span className="text-gray-700 text-sm font-semibold">Research Mode:</span>
            <div className="flex gap-2 flex-1">
              <button
                onClick={() => setMode('synthesis')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg cursor-default"
              >
                Synthesis
              </button>
              <button
                onClick={() => {
                  setMode('personas');
                  setSynthesisOption(null);
                  setSynthesisResponses({});
                  setUploadedFiles([]);
                }}
                className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                Personas
              </button>
              <button
                onClick={() => {
                  setMode('read-edit-approve');
                  setSynthesisOption(null);
                  setSynthesisResponses({});
                  setUploadedFiles([]);
                }}
                className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                {canApproveResearch ? 'Read/Edit/Approve' : 'Read Files'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-purple-900 leading-tight">
                Synthesis Mode
              </h3>
              <p className="text-purple-700 text-sm">
                Combine research studies to generate insights
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Choose synthesis option */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
          <label className="block text-gray-900 mb-3">
            1. Select Synthesis Approach
          </label>
          
          {/* Show full list if no selection made */}
          {!synthesisOption && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="synthesisOption"
                  value="new-synthesis"
                  checked={synthesisOption === 'new-synthesis'}
                  onChange={(e) => setSynthesisOption(e.target.value as 'new-synthesis')}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-gray-900 font-semibold">New Synthesis</div>
                  <p className="text-gray-600 text-sm">Start a new synthesis for an existing brand and project type</p>
                </div>
              </label>
              <label className="flex items-center gap-2 p-3 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="synthesisOption"
                  value="new-brand"
                  checked={synthesisOption === 'new-brand'}
                  onChange={(e) => setSynthesisOption(e.target.value as 'new-brand')}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-gray-900 font-semibold">New Brand</div>
                  <p className="text-gray-600 text-sm">Start synthesis for a new brand with existing project type</p>
                </div>
              </label>
              <label className="flex items-center gap-2 p-3 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="synthesisOption"
                  value="new-project-type"
                  checked={synthesisOption === 'new-project-type'}
                  onChange={(e) => setSynthesisOption(e.target.value as 'new-project-type')}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-gray-900 font-semibold">New Project Type</div>
                  <p className="text-gray-600 text-sm">Start synthesis for existing brand with new project type</p>
                </div>
              </label>
              <label className="flex items-center gap-2 p-3 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="synthesisOption"
                  value="edit-existing"
                  checked={synthesisOption === 'edit-existing'}
                  onChange={(e) => setSynthesisOption(e.target.value as 'edit-existing')}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-gray-900 font-semibold">Edit Existing Synthesis</div>
                  <p className="text-gray-600 text-sm">Modify an existing synthesis file</p>
                </div>
              </label>
              <label className="flex items-center gap-2 p-3 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="synthesisOption"
                  value="add-studies"
                  checked={synthesisOption === 'add-studies'}
                  onChange={(e) => setSynthesisOption(e.target.value as 'add-studies')}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-gray-900 font-semibold">Add Studies to Existing Synthesis</div>
                  <p className="text-gray-600 text-sm">Incorporate additional research studies into existing analysis</p>
                </div>
              </label>
              <label className="flex items-center gap-2 p-3 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="synthesisOption"
                  value="review-edits"
                  checked={synthesisOption === 'review-edits'}
                  onChange={(e) => setSynthesisOption(e.target.value as 'review-edits')}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-gray-900 font-semibold">Review Suggested Edits</div>
                  <p className="text-gray-600 text-sm">Review and approve suggested edits to synthesis files</p>
                </div>
              </label>
            </div>
          )}
          
          {/* Show only selected option with change button */}
          {synthesisOption && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded bg-blue-50 border-2 border-blue-300">
                <div className="flex-1">
                  <div className="text-gray-900 font-semibold">
                    {synthesisOption === 'new-synthesis' && 'New Synthesis'}
                    {synthesisOption === 'new-brand' && 'New Brand'}
                    {synthesisOption === 'new-project-type' && 'New Project Type'}
                    {synthesisOption === 'edit-existing' && 'Edit Existing Synthesis'}
                    {synthesisOption === 'add-studies' && 'Add Studies to Existing Synthesis'}
                    {synthesisOption === 'review-edits' && 'Review Suggested Edits'}
                  </div>
                  <p className="text-gray-600 text-sm">
                    {synthesisOption === 'new-synthesis' && 'Start a new synthesis for an existing brand and project type'}
                    {synthesisOption === 'new-brand' && 'Start synthesis for a new brand with existing project type'}
                    {synthesisOption === 'new-project-type' && 'Start synthesis for existing brand with new project type'}
                    {synthesisOption === 'edit-existing' && 'Modify an existing synthesis file'}
                    {synthesisOption === 'add-studies' && 'Incorporate additional research studies into existing analysis'}
                    {synthesisOption === 'review-edits' && 'Review and approve suggested edits to synthesis files'}
                  </p>
                </div>
                <button
                  onClick={() => setSynthesisOption(null)}
                  className="px-3 py-1 text-sm bg-white border-2 border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Brand and Project Type Management */}
        {onAddBrand && onAddProjectType && (synthesisOption === 'new-brand' || synthesisOption === 'new-project-type') && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <h3 className="text-blue-900 mb-3">Manage Brands & Project Types</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Add Brand - Only show when "New Brand Synthesis" is selected */}
              {synthesisOption === 'new-brand' && (
                <div>
                  <label className="block text-gray-900 text-sm mb-2">Add New Brand</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                      placeholder="Enter brand name..."
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newBrand.trim()) {
                          onAddBrand(newBrand);
                          setNewBrand('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newBrand.trim()) {
                          onAddBrand(newBrand);
                          setNewBrand('');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Available Brands ({availableBrands.length}):</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {availableBrands.map((b, idx) => (
                        <span key={idx} className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Add Project Type - Only show when "New Project Type" is selected */}
              {synthesisOption === 'new-project-type' && (
                <div>
                  <label className="block text-gray-900 text-sm mb-2">Add New Project Type</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                      placeholder="Enter project type..."
                      value={newProjectType}
                      onChange={(e) => setNewProjectType(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newProjectType.trim()) {
                          onAddProjectType(newProjectType);
                          setNewProjectType('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newProjectType.trim()) {
                          onAddProjectType(newProjectType);
                          setNewProjectType('');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Available Types ({availableProjectTypes.length}):</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {availableProjectTypes.map((type, idx) => (
                        <span key={idx} className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Questions based on selected option */}
        {synthesisOption === 'new-synthesis' && (
          <div className="space-y-4">
            {/* Step 2: Select Brand */}
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
              <label className="block text-gray-900 mb-3">
                2. Select Brand
              </label>
              <select
                className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-purple-500"
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setSelectedDatabricksFiles([]); // Reset files when brand changes
                }}
              >
                <option value="">-- Select Brand --</option>
                {availableBrands.map((b, idx) => (
                  <option key={idx} value={b}>{b}</option>
                ))}
              </select>
              {availableBrands.length === 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  No brands available. Create a brand using "New Brand" option above.
                </p>
              )}
            </div>

            {/* Step 3: Select Project Type */}
            {selectedBrand && (
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                <label className="block text-gray-900 mb-3">
                  3. Select Project Type
                </label>
                <select
                  className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-purple-500"
                  value={selectedProjectType}
                  onChange={(e) => {
                    setSelectedProjectType(e.target.value);
                    setSelectedDatabricksFiles([]); // Reset files when project type changes
                  }}
                >
                  <option value="">-- Select Project Type --</option>
                  {availableProjectTypes.map((type, idx) => (
                    <option key={idx} value={type}>{type}</option>
                  ))}
                </select>
                {availableProjectTypes.length === 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    No project types available. Create a project type using "New Project Type" option above.
                  </p>
                )}
              </div>
            )}

            {/* Step 4: Select Files */}
            {selectedBrand && selectedProjectType && (
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                <label className="block text-gray-900 mb-3">
                  4. Select Research Files for {selectedBrand}
                </label>
                
                {/* File selection from existing research files */}
                <div className="mb-4">
                  <h5 className="text-sm text-gray-700 mb-2">From Existing Approved Files:</h5>
                  {researchFiles.filter(f => f.isApproved && f.brand === selectedBrand).length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {researchFiles
                        .filter(f => f.isApproved && f.brand === selectedBrand)
                        .map((file) => {
                          const isSelected = selectedDatabricksFiles.some(sf => sf.id === file.id);
                          return (
                            <div
                              key={file.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedDatabricksFiles(prev => prev.filter(sf => sf.id !== file.id));
                                } else {
                                  setSelectedDatabricksFiles(prev => [...prev, file]);
                                }
                              }}
                              className={`p-3 border-2 rounded cursor-pointer transition-colors ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-300 bg-white hover:border-gray-400'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // Handled by parent div onClick
                                  className="w-4 h-4"
                                />
                                <div className="flex-1">
                                  <div className="text-sm text-gray-900">{file.fileName}</div>
                                  <div className="text-xs text-gray-600">
                                    {file.source && (
                                      <span className="text-blue-600">{file.source} • </span>
                                    )}
                                    {new Date(file.uploadDate).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 italic">
                      No approved files available for {selectedBrand}
                    </p>
                  )}
                </div>

                {/* Upload file to Databricks */}
                <div className="mt-4">
                  <label className="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-5 h-5" />
                    Upload File to Databricks
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.ppt,.pptx"
                      className="hidden"
                      onChange={handleUploadToDatabricks}
                    />
                  </label>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Upload a file from your computer to Databricks Knowledge Base
                  </p>
                </div>

                {/* Databricks file browser button */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowDatabricksBrowser(true)}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    Import from Databricks
                  </button>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Browse and import files from Databricks that match this brand
                  </p>
                </div>

                {/* Selected files summary */}
                {selectedDatabricksFiles.length > 0 && (
                  <div className="mt-4 p-3 bg-purple-50 border-2 border-purple-200 rounded">
                    <h5 className="text-sm text-purple-900 mb-2">
                      Selected Files ({selectedDatabricksFiles.length}):
                    </h5>
                    <div className="space-y-1">
                      {selectedDatabricksFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between text-xs text-purple-800">
                          <span>{file.fileName}</span>
                          <button
                            onClick={() => setSelectedDatabricksFiles(prev => prev.filter(sf => sf.id !== file.id))}
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Execute Button */}
            {selectedBrand && selectedProjectType && selectedDatabricksFiles.length > 0 && (
              <button
                onClick={() => {
                  console.log('Executing New Synthesis:', {
                    brand: selectedBrand,
                    projectType: selectedProjectType,
                    files: selectedDatabricksFiles.map(f => f.fileName)
                  });
                  alert(`Creating synthesis for ${selectedBrand} - ${selectedProjectType} with ${selectedDatabricksFiles.length} file(s)`);
                  // Reset form
                  setSelectedBrand('');
                  setSelectedProjectType('');
                  setSelectedDatabricksFiles([]);
                }}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Execute - New Synthesis
              </button>
            )}
          </div>
        )}

        {synthesisOption === 'add-studies' && (
          <div className="space-y-4">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
              <label className="block text-gray-900 mb-3">
                2. Select existing synthesis to add studies to
              </label>
              <select
                className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-purple-500"
                value={synthesisResponses.targetSynthesis || ''}
                onChange={(e) => handleSynthesisQuestionChange('targetSynthesis', e.target.value)}
              >
                <option value="">-- Select synthesis --</option>
                {researchFiles.map((file, idx) => (
                  <option key={idx} value={file.id}>{file.fileName}</option>
                ))}
              </select>
            </div>

            <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
              <label className="block text-gray-900 mb-3">
                3. Select files to add to synthesis
              </label>
              <div className="flex items-start gap-3">
                <input
                  type="text"
                  className="flex-1 border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-purple-500"
                  placeholder="Enter filename or select from Databricks..."
                  value={synthesisResponses.addStudiesFilename || ''}
                  onChange={(e) => handleSynthesisQuestionChange('addStudiesFilename', e.target.value)}
                />
                <button
                  onClick={() => setShowDatabricksBrowser(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                  title="Browse Databricks files"
                >
                  Browse Files
                </button>
              </div>

              {/* Display selected Databricks files for add studies */}
              {selectedDatabricksFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-gray-700">Selected files:</p>
                  {selectedDatabricksFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded">
                      <span className="text-sm text-gray-700 flex-1">{file.fileName}</span>
                      <button
                        onClick={() => setSelectedDatabricksFiles(selectedDatabricksFiles.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {synthesisOption === 'new-brand' && (
          <div className="space-y-4">
            {/* No additional content - brands are managed in the blue box above */}
          </div>
        )}

        {synthesisOption === 'new-project-type' && (
          <div className="space-y-4">
            {/* No additional content - project types are managed in the blue box above */}
          </div>
        )}

        {synthesisOption === 'edit-existing' && (
          <div className="space-y-4">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
              <label className="block text-gray-900 mb-3">
                2. Select the file to edit
              </label>
              <select
                className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-purple-500"
                value={synthesisResponses.editFile || ''}
                onChange={(e) => {
                  const fileId = e.target.value;
                  handleSynthesisQuestionChange('editFile', fileId);
                  
                  // Open popup if file is selected
                  if (fileId) {
                    const file = researchFiles.find(f => f.id === fileId);
                    if (file) {
                      setEditingFile(file);
                      setEditedContent(file.content || '');
                      setShowEditPopup(true);
                    }
                  }
                }}
              >
                <option value="">-- Select file --</option>
                {researchFiles.map((file, idx) => (
                  <option key={idx} value={file.id}>{file.fileName}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {synthesisOption === 'review-edits' && (
          <div className="space-y-4">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
              <h3 className="text-gray-900 mb-4">Suggested Edits from Non-Researchers</h3>
              
              {editSuggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No edit suggestions yet. Non-researchers can suggest edits to Knowledge Base files.
                </div>
              ) : (
                <div className="space-y-3">
                  {editSuggestions.map((suggestion) => {
                    const file = researchFiles.find(f => f.id === suggestion.researchFileId);
                    
                    return (
                      <div 
                        key={suggestion.id} 
                        className={`border-2 rounded-lg p-4 ${
                          suggestion.status === 'pending' ? 'border-orange-300 bg-orange-50' :
                          suggestion.status === 'reviewed' ? 'border-blue-300 bg-blue-50' :
                          'border-green-300 bg-green-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-gray-900">{suggestion.fileName}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                suggestion.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                suggestion.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {suggestion.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Suggested by {suggestion.suggestedBy} on {new Date(suggestion.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                          
                          {suggestion.status === 'pending' && onUpdateSuggestionStatus && (
                            <div className="flex gap-2">
                              <button
                                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                onClick={() => onUpdateSuggestionStatus(suggestion.id, 'reviewed')}
                                title="Mark as reviewed"
                              >
                                Mark Reviewed
                              </button>
                              <button
                                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                onClick={() => onUpdateSuggestionStatus(suggestion.id, 'implemented')}
                                title="Mark as implemented"
                              >
                                Mark Implemented
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-white border border-gray-300 rounded p-3">
                          <div className="text-sm text-gray-900">
                            <strong>Suggestion:</strong>
                          </div>
                          <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                            {suggestion.suggestion}
                          </div>
                        </div>
                        
                        {file && (
                          <div className="mt-2 text-xs text-gray-500">
                            File: {file.brand} / {file.projectType} / {file.fileName}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Databricks File Browser */}
        <DatabricksFileBrowser
          open={showDatabricksBrowser}
          onClose={() => setShowDatabricksBrowser(false)}
          onFilesSelected={handleDatabricksFilesSelected}
        />

        {/* Edit File Popup Modal */}
        {showEditPopup && editingFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit File: {editingFile.fileName}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Brand: {editingFile.brand} | Project Type: {editingFile.projectType}
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <textarea
                  className="w-full h-96 border-2 border-gray-300 bg-white rounded p-4 text-gray-700 font-mono text-sm focus:outline-none focus:border-purple-500"
                  placeholder="Enter file content..."
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                />
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditPopup(false);
                    setEditingFile(null);
                    setEditedContent('');
                    setSynthesisResponses(prev => ({ ...prev, editFile: '' }));
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onUpdateResearchFile && editingFile) {
                      onUpdateResearchFile(editingFile.id, editedContent);
                      setShowEditPopup(false);
                      setEditingFile(null);
                      setEditedContent('');
                      setSynthesisResponses(prev => ({ ...prev, editFile: '' }));
                      alert('File updated successfully!');
                    }
                  }}
                  className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Personas Mode
  if (mode === 'personas') {
    return (
      <div className="space-y-4">
        {/* Mode Switcher - Always visible at top */}
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <span className="text-gray-700 text-sm font-semibold">Research Mode:</span>
            <div className="flex gap-2 flex-1">
              <button
                onClick={() => {
                  setMode('synthesis');
                  setSelectedHexagon(null);
                  setPersonaFileForm({
                    brandScope: 'single',
                    brandName: brand,
                    categoryName: '',
                    fileName: '',
                    fileType: ''
                  });
                }}
                className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
              >
                Synthesis
              </button>
              <button
                onClick={() => setMode('personas')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-default"
              >
                Personas
              </button>
              <button
                onClick={() => {
                  setMode('read-edit-approve');
                  setSelectedHexagon(null);
                  setPersonaFileForm({
                    brandScope: 'single',
                    brandName: brand,
                    categoryName: '',
                    fileName: '',
                    fileType: ''
                  });
                }}
                className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                {canApproveResearch ? 'Read/Edit/Approve' : 'Read Files'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-blue-900 leading-tight">
                Personas Mode
              </h3>
              <p className="text-blue-700 text-sm">
                Create lists of Personas for each Hexagon with key characteristics for each Persona
              </p>
            </div>
          </div>
        </div>

        {/* Hexagon Grid */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
          <h4 className="text-gray-900 mb-4">Select Workflow Step</h4>
          
          {/* Show full grid if no selection made */}
          {!selectedHexagon && (
            <div className="grid grid-cols-2 gap-3">
              {centralHexagons.map((hexagon) => {
                const existingFiles = getPersonaFiles(hexagon.id);
                
                return (
                  <button
                    key={hexagon.id}
                    onClick={() => setSelectedHexagon(hexagon.id)}
                    className="p-4 border-2 rounded-lg text-left transition-all border-gray-300 bg-white hover:border-gray-400"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-gray-900 mb-1">{hexagon.label}</div>
                        <div className="text-xs text-gray-600">
                          {existingFiles.length} file{existingFiles.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          
          {/* Show only selected hexagon with change button */}
          {selectedHexagon && (
            <div className="space-y-2">
              {(() => {
                const hexagon = centralHexagons.find(h => h.id === selectedHexagon);
                const existingFiles = getPersonaFiles(selectedHexagon);
                
                return (
                  <div className={`flex items-center gap-2 p-4 border-2 rounded-lg ${hexagon?.borderColor} ${hexagon?.color}`}>
                    <div className="flex-1">
                      <div className="text-gray-900 mb-1">{hexagon?.label}</div>
                      <div className="text-xs text-gray-600">
                        {existingFiles.length} file{existingFiles.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedHexagon(null)}
                      className="px-3 py-1 text-sm bg-white border-2 border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                      Change
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* File Creation Form */}
        {selectedHexagon && personaView === 'create' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
            <h4 className="text-gray-900 mb-4">
              Create New File for {centralHexagons.find(h => h.id === selectedHexagon)?.label}
            </h4>

            <div className="space-y-4">
              {/* Brand Scope */}
              <div>
                <label className="block text-gray-700 mb-2 text-sm">Brand Scope</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="brandScope"
                      value="single"
                      checked={personaFileForm.brandScope === 'single'}
                      onChange={(e) => setPersonaFileForm({ ...personaFileForm, brandScope: e.target.value as 'single', fileName: '' })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 text-sm">Single Brand</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="brandScope"
                      value="category"
                      checked={personaFileForm.brandScope === 'category'}
                      onChange={(e) => setPersonaFileForm({ ...personaFileForm, brandScope: e.target.value as 'category', fileName: '' })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 text-sm">Category of Brands</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="brandScope"
                      value="all"
                      checked={personaFileForm.brandScope === 'all'}
                      onChange={(e) => setPersonaFileForm({ ...personaFileForm, brandScope: e.target.value as 'all', fileName: '' })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 text-sm">All Brands</span>
                  </label>
                </div>
              </div>

              {/* Brand/Category Name */}
              {personaFileForm.brandScope === 'single' && (
                <div>
                  <label className="block text-gray-700 mb-1 text-sm">Brand Name</label>
                  <input
                    type="text"
                    className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                    placeholder="Enter brand name..."
                    value={personaFileForm.brandName}
                    onChange={(e) => {
                      const newBrandName = e.target.value;
                      // Auto-update filename as user types
                      const newFileName = selectedHexagon ? generateDefaultFileName(newBrandName, selectedHexagon) : '';
                      setPersonaFileForm({ ...personaFileForm, brandName: newBrandName, fileName: newFileName });
                    }}
                  />
                </div>
              )}

              {personaFileForm.brandScope === 'category' && (
                <div>
                  <label className="block text-gray-700 mb-1 text-sm">Category Name</label>
                  <input
                    type="text"
                    className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                    placeholder="Enter category name (e.g., Athletic Footwear)..."
                    value={personaFileForm.categoryName}
                    onChange={(e) => {
                      const newCategoryName = e.target.value;
                      // Auto-update filename as user types
                      const newFileName = selectedHexagon ? generateDefaultFileName(newCategoryName, selectedHexagon) : '';
                      setPersonaFileForm({ ...personaFileForm, categoryName: newCategoryName, fileName: newFileName });
                    }}
                  />
                </div>
              )}

              {/* Filename */}
              <div>
                <label className="block text-gray-700 mb-1 text-sm">Filename (editable)</label>
                {(() => {
                  let currentBrand = '';
                  let currentProjectType = selectedHexagon || '';
                  
                  if (personaFileForm.brandScope === 'single') {
                    currentBrand = personaFileForm.brandName;
                  } else if (personaFileForm.brandScope === 'category') {
                    currentBrand = personaFileForm.categoryName;
                  } else {
                    currentBrand = 'AllBrands';
                  }
                  
                  const defaultFileName = currentBrand && currentProjectType ? 
                    generateDefaultFileName(currentBrand, currentProjectType) : 
                    '';
                  
                  // Auto-populate filename when default changes and field is empty
                  if (defaultFileName && !personaFileForm.fileName) {
                    setTimeout(() => {
                      setPersonaFileForm({ ...personaFileForm, fileName: defaultFileName });
                    }, 0);
                  }
                  
                  return (
                    <input
                      type="text"
                      className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                      placeholder="Enter filename..."
                      value={personaFileForm.fileName}
                      onChange={(e) => setPersonaFileForm({ ...personaFileForm, fileName: e.target.value })}
                    />
                  );
                })()}
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-gray-700 mb-1 text-sm">Upload File</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.csv"
                  className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && !personaFileForm.fileName) {
                      setPersonaFileForm({ ...personaFileForm, fileName: file.name, fileType: file.type });
                    }
                  }}
                />
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreatePersonaFile}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!personaFileForm.fileName.trim() || 
                         (personaFileForm.brandScope === 'single' && !personaFileForm.brandName.trim()) ||
                         (personaFileForm.brandScope === 'category' && !personaFileForm.categoryName.trim())}
              >
                Create Research File
              </button>
            </div>
          </div>
        )}

        {/* Existing Files for Selected Hexagon */}
        {selectedHexagon && getPersonaFiles(selectedHexagon).length > 0 && (
          <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
            <h4 className="text-gray-900 mb-4">
              Existing Files for {centralHexagons.find(h => h.id === selectedHexagon)?.label}
            </h4>
            <div className="space-y-2">
              {getPersonaFiles(selectedHexagon).map((file) => (
                <div key={file.id} className="border-2 border-gray-300 rounded p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-gray-900 text-sm">{file.fileName}</h5>
                        {file.isApproved ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                            Pending Approval
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {file.brand} • Uploaded: {new Date(file.uploadDate).toLocaleDateString()}
                      </div>
                    </div>
                    {canApproveResearch && (
                      <button
                        onClick={() => onToggleApproval(file.id)}
                        className={`px-3 py-1 rounded text-xs ml-2 ${
                          file.isApproved 
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {file.isApproved ? 'Unapprove' : 'Approve'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Read/Edit/Approve Mode
  if (mode === 'read-edit-approve') {
    const getSynthesisFiles = () => {
      return researchFiles.filter(f => !f.fileType || f.fileType === 'synthesis' || !centralHexagons.find(h => h.id === f.fileType));
    };

    const getPersonasFiles = () => {
      return researchFiles.filter(f => centralHexagons.find(h => h.id === f.fileType));
    };

    const getFilteredFiles = () => {
      const files = filterType === 'synthesis' ? getSynthesisFiles() 
        : filterType === 'personas' ? getPersonasFiles() 
        : researchFiles;
      
      // Sort by most recent first
      return [...files].sort((a, b) => b.uploadDate - a.uploadDate);
    };

    return (
      <div className="space-y-4">
        {/* Mode Switcher - Always visible at top */}
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <span className="text-gray-700 text-sm font-semibold">Research Mode:</span>
            <div className="flex gap-2 flex-1">
              <button
                onClick={() => setMode('synthesis')}
                className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
              >
                Synthesis
              </button>
              <button
                onClick={() => setMode('personas')}
                className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                Personas
              </button>
              <button
                onClick={() => setMode('read-edit-approve')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg cursor-default"
              >
                {canApproveResearch ? 'Read/Edit/Approve' : 'Read Files'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-green-900 leading-tight">
                {canApproveResearch ? 'Read/Edit/Approve Mode' : 'Read Files Mode'}
              </h3>
              <p className="text-green-700 text-sm">
                {canApproveResearch 
                  ? 'Read, edit, or approve any synthesis or persona file'
                  : 'View all synthesis and persona files in the knowledge base'
                }
              </p>
            </div>
          </div>
        </div>

        {/* File Actions - Now at the top */}
        {selectedFile && (
          <div className="space-y-4">
            {/* Read/View Section */}
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
              <h4 className="text-gray-900 mb-3">
                View File: {selectedFile.fileName}
              </h4>
              <div className="bg-gray-50 border-2 border-gray-300 rounded p-3 text-gray-700 text-sm min-h-[100px]">
                <p className="italic text-gray-500">File content would be displayed here...</p>
                <p className="mt-2 text-xs text-gray-600">
                  Brand: {selectedFile.brand} | Project Type: {selectedFile.projectType}
                </p>
              </div>
            </div>

            {/* Edit Section - Only for Research Leaders */}
            {canApproveResearch && (
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                <h4 className="text-gray-900 mb-3">
                  Edit File
                </h4>
                <textarea
                  className="w-full h-32 border-2 border-gray-300 bg-white rounded p-3 text-gray-700 resize-none focus:outline-none focus:border-green-500"
                  placeholder="Enter your edits here..."
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <button
                  onClick={() => {
                    console.log('Saving edits for file:', selectedFile.id, editContent);
                    alert(`Edits saved for: ${selectedFile.fileName}`);
                    setEditContent('');
                  }}
                  disabled={!editContent.trim()}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Save Edits
                </button>
              </div>
            )}

            {/* Approval Section */}
            {canApproveResearch && (
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                <h4 className="text-gray-900 mb-3">
                  Approval Status
                </h4>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Current Status: {selectedFile.isApproved ? (
                      <span className="text-green-600 font-semibold">Approved</span>
                    ) : (
                      <span className="text-yellow-600 font-semibold">Pending Approval</span>
                    )}
                  </div>
                  <button
                    onClick={() => onToggleApproval(selectedFile.id)}
                    className={`px-4 py-2 rounded text-sm ${
                      selectedFile.isApproved
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {selectedFile.isApproved ? 'Unapprove File' : 'Approve File'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter Tabs and Files List - Now at the bottom */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterType === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Files ({researchFiles.length})
            </button>
            <button
              onClick={() => setFilterType('synthesis')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterType === 'synthesis'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Synthesis ({getSynthesisFiles().length})
            </button>
            <button
              onClick={() => setFilterType('personas')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterType === 'personas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Personas ({getPersonasFiles().length})
            </button>
          </div>

          {/* Files List */}
          <div className="space-y-2">
            <h4 className="text-gray-900 mb-3">Select a File</h4>
            {getFilteredFiles().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No files available
              </div>
            ) : (
              getFilteredFiles().map((file) => (
                <div
                  key={file.id}
                  className={`border-2 rounded p-3 cursor-pointer transition-all ${
                    selectedFile?.id === file.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  onClick={() => {
                    setSelectedFile(file);
                    setEditContent('');
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-gray-900 text-sm">{file.fileName}</h5>
                        {file.isApproved ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                            Pending Approval
                          </span>
                        )}
                        {file.fileType && centralHexagons.find(h => h.id === file.fileType) && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                            Persona
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        Brand: {file.brand} • Project Type: {file.projectType} • Uploaded: {new Date(file.uploadDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}