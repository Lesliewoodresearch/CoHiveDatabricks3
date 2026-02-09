import { Database, Cpu, GitBranch, BarChart3, Rocket, PlayCircle, Settings, FileText, Users, Globe, MessageSquare, TestTube, CheckCircle, Save, AlertCircle, User, Download, Upload, RotateCcw, Mic, Camera, Video, StopCircle, File } from 'lucide-react';
import { ProcessFlow, processSteps } from './ProcessFlow';
import { useState, useEffect } from 'react';
import React from 'react';
import { ResearchView } from './ResearchView';
import { TemplateManager, UserTemplate, defaultTemplates } from './TemplateManager';
import { ResearcherModes } from './ResearcherModes';
import { CentralHexView } from './CentralHexView';
import { ReviewView } from './ReviewView';
import cohiveLogo from 'figma:asset/88105c0c8621f3d41d65e5be3ae75558f9de1753.png';
import { saveToKnowledgeBase, KnowledgeBaseFile, saveToUserFolder, UserFile, downloadFile } from '../utils/databricksAPI';

interface StepContent {
  id: string;
  title: string;
  description: string;
  questions: string[];
}

interface StepResponses {
  [stepId: string]: {
    [questionIndex: number]: string;
  };
}

interface ProjectFile {
  brand: string;
  projectType: string;
  fileName: string;
  timestamp: number;
}

interface IdeasFile {
  brand: string;
  projectType: string;
  fileName: string;
  content: string; // Base64 encoded file content
  fileType: string; // MIME type
  uploadDate: number;
}

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

interface HexExecution {
  id: string;
  selectedFiles: string[];
  assessmentType: string[]; // Changed to array to support multiple selections
  assessment: string;
  timestamp: number;
}

interface HexExecutions {
  [hexId: string]: HexExecution[];
}


//Definitions for each hexagon - questions, steps, details

const stepContent: StepContent[] = [
  {
    id: 'Enter', //LW edit
    title: 'Begin Project - Initialize your AI project',
    description: 'Define the brand, the project type and the knowledge files to use',
    questions: [
      'Brand',
      'Project Type'
    ]
  },
  {
    id: 'research',
    title: 'Manage Knowledge Assets',
    description: 'Define the knowledge files your project will be based on',
    questions: [
      'Which research studies to synthesize?',
      'Which personas to have available?',
      'Edit and Approve sytheses and personas.',
    ]
  },
  {
    id: 'Luminaries',
    title: 'Luminary Personas',
    description: 'Gather insights and recommendations from industry experts',
    questions: [
      'Which external experts should be consulted?',
      'What are their assessments?',
      'What are their recommendations?',
      'Can they produce a single unified review?'
    ]
  },
  {
    id: 'panelist',
    title: 'Panelist Personas',
    description: 'Leverage data from consumer panel households',
    questions: [
      'How would various panel members respond?',
      'What would various panel members recommend?',
      'What additional research would be helpful to collect from these panel households?',
    ]
  },
  {
    id: 'Consumers',
    title: 'Consumer Personas',
    description: 'Understand consumer preferences',
    questions: [
      'What are the key consumer personas?',
      'Does what is shared resonate with these key buyers?',
      'What message are they looking for?',
    ]
  },
  {
    id: 'competitors',
    title: 'Competitive Analysis',
    description: 'Analyze competitor strategies and market position',
    questions: [
      'Who are your main competitors?',
      'What are their key differentiators?',
      'What market share do they hold?',
      'What are their strengths and weaknesses?'
    ]
  },
  {
    id: 'Colleagues',
    title: 'Colleague Personas',
    description: 'Leverage knowledge from internal stakeholders',
    questions: [
      'Which departments should be consulted?',
      'What internal data sources are available?',
      'What institutional knowledge exists?',
      'How will internal insights be validated?'
    ]
  },
  {
    id: 'cultural',
    title: 'Cultural Personas',
    description: 'Understand cultural trends and influences',
    questions: [
      'What cultural trends are relevant?',
      'How do cultural factors influence behavior?',
      'What cultural segments should be analyzed?',
      'What cultural barriers might exist?'
    ]
  },
  {
    id: 'social',
    title: 'Social Listening',
    description: 'Social Listening monitored by agents will be added in the future.',
    questions: []
  },
  {
    id: 'Wisdom',
    title: 'Wisdom',
    description: 'Add your insights about brands, markets, flavors, consumers and any other insights that would help build a better foundation for results. This will also be deployed as a mobile app soon.',
    questions: [
      'Insight Type',
      'Input Method',
      'Share Your Wisdom'
    ]
  },
  {
    id: 'Grade',
    title: 'Segment Testing',
    description: 'Score hypotheses against target segments',
    questions: [
      'What segments have been identified?',
      'What hypotheses need grading?',
      'What grading methodology will be used?',
      'What success metrics are defined?'
    ]
  },
  {
    id: 'Findings',
    title: 'Findings', //LW Edit
    description: 'Save iteration or create comprehensive findings report',
    questions: [
      'Save Iteration or Summarize',
      'Which files should we include in our findings?',
      'Output Options',
      'Save or Download'
    ]
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Review all my saved files and execution results',
    questions: [
      'Review all saved files',
      'Validate results accuracy',
      'Make final adjustments if needed'
    ]
  }
  
];

export default function ProcessWireframe() {
  const [activeStepId, setActiveStepId] = useState<string>('Enter');
  const [responses, setResponses] = useState<StepResponses>({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string>('');
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [ideasFiles, setIdeasFiles] = useState<IdeasFile[]>([]);
  const [researchFiles, setResearchFiles] = useState<ResearchFile[]>([]);
  const [editSuggestions, setEditSuggestions] = useState<EditSuggestion[]>([]);
  const [hexExecutions, setHexExecutions] = useState<{ [hexId: string]: HexExecution[] }>({});
  const [showValidation, setShowValidation] = useState(false);
  const [selectedResearchFiles, setSelectedResearchFiles] = useState<string[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [userRole, setUserRole] = useState<'administrator' | 'research-analyst' | 'research-leader' | 'marketing-manager' | 'product-manager' | 'executive-stakeholder'>('marketing-manager');
  const [currentTemplate, setCurrentTemplate] = useState<UserTemplate | null>(null);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableProjectTypes, setAvailableProjectTypes] = useState<string[]>([]);
  const [iterationSaved, setIterationSaved] = useState<boolean>(false);

  // Wisdom hex recording/capturing states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [captureMethod, setCaptureMethod] = useState<'upload' | 'capture' | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Helper function to generate default filename
  const generateDefaultFileName = (brand: string, projectType: string, creationDate?: number, editDate?: number) => {
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    };
    
    const cleanName = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '');
    
    const brandPart = cleanName(brand) || 'Brand';
    const projectTypePart = cleanName(projectType) || 'ProjectType';
    const creationPart = formatDate(creationDate || Date.now());
    const editPart = editDate ? `_${formatDate(editDate)}` : '';
    
    return `${brandPart}_${projectTypePart}_${creationPart}${editPart}`;
  };

  // Load responses from localStorage on mount
  useEffect(() => {
    const savedResponses = localStorage.getItem('cohive_responses');
    if (savedResponses) {
      try {
        setResponses(JSON.parse(savedResponses));
      } catch (e) {
        console.error('Failed to load saved responses', e);
      }
    }

    // Load iteration saved flag
    const savedIterationFlag = localStorage.getItem('cohive_iteration_saved');
    if (savedIterationFlag) {
      setIterationSaved(savedIterationFlag === 'true');
    }

    // Load templates or initialize with defaults
    const savedTemplates = localStorage.getItem('cohive_templates');
    if (savedTemplates) {
      try {
        const templates = JSON.parse(savedTemplates);
        setTemplates(templates);
      } catch (e) {
        console.error('Failed to load saved templates', e);
        // Initialize with default templates
        setTemplates(defaultTemplates);
        localStorage.setItem('cohive_templates', JSON.stringify(defaultTemplates));
      }
    } else {
      // Initialize with default templates
      setTemplates(defaultTemplates);
      localStorage.setItem('cohive_templates', JSON.stringify(defaultTemplates));
    }

    // Load current template selection or set default
    const savedCurrentTemplateId = localStorage.getItem('cohive_current_template_id');
    if (savedCurrentTemplateId) {
      try {
        setCurrentTemplateId(savedCurrentTemplateId);
      } catch (e) {
        console.error('Failed to load current template', e);
        // Set default template
        setCurrentTemplateId('admin');
        localStorage.setItem('cohive_current_template_id', 'admin');
      }
    } else {
      // Set default template
      setCurrentTemplateId('admin');
      localStorage.setItem('cohive_current_template_id', 'admin');
    }

    // Load project files
    const savedProjects = localStorage.getItem('cohive_projects');
    if (savedProjects) {
      try {
        setProjectFiles(JSON.parse(savedProjects));
      } catch (e) {
        console.error('Failed to load saved projects', e);
      }
    }

    // Load ideas files
    const savedIdeasFiles = localStorage.getItem('cohive_ideas_files');
    if (savedIdeasFiles) {
      try {
        setIdeasFiles(JSON.parse(savedIdeasFiles));
      } catch (e) {
        console.error('Failed to load saved ideas files', e);
      }
    }

    // Load or initialize research files with mock data
    const savedResearch = localStorage.getItem('cohive_research_files');
    if (savedResearch) {
      try {
        setResearchFiles(JSON.parse(savedResearch));
      } catch (e) {
        console.error('Failed to load saved research files', e);
      }
    } else {
      // Initialize with mock research files for demonstration
      const mockResearchFiles: ResearchFile[] = [
        {
          id: '1',
          brand: 'Nike',
          projectType: 'Creative Messaging',
          fileName: 'Nike_Q4_2024_Consumer_Insights.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 10,
          fileType: 'Consumer Insights'
        },
        {
          id: '2',
          brand: 'Nike',
          projectType: 'Creative Messaging',
          fileName: 'Nike_Competitor_Analysis_2024.xlsx',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 15,
          fileType: 'Competitive Analysis'
        },
        {
          id: '3',
          brand: 'Nike',
          projectType: 'Creative Messaging',
          fileName: 'Nike_Social_Listening_Report_Nov.pdf',
          isApproved: false,
          uploadDate: Date.now() - 86400000 * 5,
          fileType: 'Social Media'
        },
        {
          id: '4',
          brand: 'Adidas',
          projectType: 'Creative Messaging',
          fileName: 'Adidas_Brand_Perception_Study.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 20,
          fileType: 'Brand Research'
        },
        {
          id: '5',
          brand: 'Nike',
          projectType: 'Product Launch',
          fileName: 'Nike_Product_Testing_Results.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 7,
          fileType: 'Product Testing'
        },
        // War Games files for Nike
        {
          id: 'wg1',
          brand: 'Nike',
          projectType: 'War Games',
          fileName: 'Nike_Competitive_Scenario_Analysis_2024.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 12,
          fileType: 'Competitive Analysis'
        },
        {
          id: 'wg2',
          brand: 'Nike',
          projectType: 'War Games',
          fileName: 'Nike_Market_Response_Strategies.xlsx',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 8,
          fileType: 'Strategic Planning'
        },
        // War Games files for Adidas
        {
          id: 'wg3',
          brand: 'Adidas',
          projectType: 'War Games',
          fileName: 'Adidas_Competitor_Move_Projections.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 15,
          fileType: 'Competitive Intelligence'
        },
        {
          id: 'wg4',
          brand: 'Adidas',
          projectType: 'War Games',
          fileName: 'Adidas_Strategic_Response_Framework.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 10,
          fileType: 'Strategic Planning'
        },
        // Packaging files for Nike
        {
          id: 'pkg1',
          brand: 'Nike',
          projectType: 'Packaging',
          fileName: 'Nike_Sustainability_Packaging_Guidelines.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 9,
          fileType: 'Design Guidelines'
        },
        {
          id: 'pkg2',
          brand: 'Nike',
          projectType: 'Packaging',
          fileName: 'Nike_Consumer_Unboxing_Experience_Study.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 6,
          fileType: 'Consumer Research'
        },
        // Packaging files for Adidas
        {
          id: 'pkg3',
          brand: 'Adidas',
          projectType: 'Packaging',
          fileName: 'Adidas_Eco_Packaging_Materials_Research.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 11,
          fileType: 'Materials Research'
        },
        {
          id: 'pkg4',
          brand: 'Adidas',
          projectType: 'Packaging',
          fileName: 'Adidas_Packaging_Design_Benchmarks.xlsx',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 13,
          fileType: 'Competitive Analysis'
        },
        // Mock files for central hexagons
        {
          id: '6',
          brand: 'Nike',
          projectType: 'Luminaries',
          fileName: 'Industry_Expert_Panel_Roster.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 12,
          fileType: 'Luminaries'
        },
        {
          id: '7',
          brand: 'Nike',
          projectType: 'Luminaries',
          fileName: 'Expert_Feedback_Summary_Q3.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 8,
          fileType: 'Luminaries'
        },
        {
          id: '8',
          brand: 'Nike',
          projectType: 'panelist',
          fileName: 'Consumer_Panel_Demographics.xlsx',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 14,
          fileType: 'panelist'
        },
        {
          id: '9',
          brand: 'Nike',
          projectType: 'Consumers',
          fileName: 'Consumers_Persona_Profiles_2024.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 11,
          fileType: 'Consumers'
        },
        {
          id: '10',
          brand: 'Nike',
          projectType: 'competitors',
          fileName: 'Competitive_Landscape_Analysis.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 9,
          fileType: 'competitors'
        },
        {
          id: '11',
          brand: 'Nike',
          projectType: 'Colleagues',
          fileName: 'Colleagues_Stakeholder_Interviews.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 13,
          fileType: 'Colleagues'
        },
        {
          id: '12',
          brand: 'Nike',
          projectType: 'social',
          fileName: 'Social_Media_Sentiment_Analysis.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 6,
          fileType: 'social'
        },
        {
          id: '13',
          brand: 'Nike',
          projectType: 'Grade',
          fileName: 'Segment_Test_Methodology.pdf',
          isApproved: true,
          uploadDate: Date.now() - 86400000 * 4,
          fileType: 'Grade'
        }
      ];
      setResearchFiles(mockResearchFiles);
      localStorage.setItem('cohive_research_files', JSON.stringify(mockResearchFiles));
    }

    // Load edit suggestions
    const savedSuggestions = localStorage.getItem('cohive_edit_suggestions');
    if (savedSuggestions) {
      try {
        setEditSuggestions(JSON.parse(savedSuggestions));
      } catch (e) {
        console.error('Failed to load saved edit suggestions', e);
      }
    }

    // Load hex executions
    const savedHexExecutions = localStorage.getItem('cohive_hex_executions');
    if (savedHexExecutions) {
      try {
        setHexExecutions(JSON.parse(savedHexExecutions));
      } catch (e) {
        console.error('Failed to load saved hex executions', e);
      }
    }

    // Load available brands and project types
    const savedBrands = localStorage.getItem('cohive_available_brands');
    const savedProjectTypes = localStorage.getItem('cohive_available_project_types');
    const projectTypesVersion = localStorage.getItem('cohive_project_types_version');
    
    // Version 3: Added War Games
    const CURRENT_VERSION = '3';
    
    if (savedBrands) {
      try {
        setAvailableBrands(JSON.parse(savedBrands));
      } catch (e) {
        console.error('Failed to load saved brands', e);
        setAvailableBrands(['Nike', 'Adidas']);
        localStorage.setItem('cohive_available_brands', JSON.stringify(['Nike', 'Adidas']));
      }
    } else {
      setAvailableBrands(['Nike', 'Adidas']);
      localStorage.setItem('cohive_available_brands', JSON.stringify(['Nike', 'Adidas']));
    }
    
    // Force update if version doesn't match or doesn't exist
    if (projectTypesVersion !== CURRENT_VERSION) {
      setAvailableProjectTypes(['Creative Messaging', 'Packaging', 'Product Launch', 'War Games']);
      localStorage.setItem('cohive_available_project_types', JSON.stringify(['Creative Messaging', 'Packaging', 'Product Launch', 'War Games']));
      localStorage.setItem('cohive_project_types_version', CURRENT_VERSION);
    } else if (savedProjectTypes) {
      try {
        setAvailableProjectTypes(JSON.parse(savedProjectTypes));
      } catch (e) {
        console.error('Failed to load saved project types', e);
        setAvailableProjectTypes(['Creative Messaging', 'Packaging', 'Product Launch', 'War Games']);
        localStorage.setItem('cohive_available_project_types', JSON.stringify(['Creative Messaging', 'Packaging', 'Product Launch', 'War Games']));
        localStorage.setItem('cohive_project_types_version', CURRENT_VERSION);
      }
    } else {
      setAvailableProjectTypes(['Creative Messaging', 'Packaging', 'Product Launch', 'War Games']);
      localStorage.setItem('cohive_available_project_types', JSON.stringify(['Creative Messaging', 'Packaging', 'Product Launch', 'War Games']));
      localStorage.setItem('cohive_project_types_version', CURRENT_VERSION);
    }
  }, []);

  // Save responses to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      localStorage.setItem('cohive_responses', JSON.stringify(responses));
      setShowSaveNotification(true);
      const timer = setTimeout(() => setShowSaveNotification(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [responses]);

  // Sync currentTemplate when currentTemplateId or templates change
  useEffect(() => {
    if (currentTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === currentTemplateId);
      setCurrentTemplate(template || null);
      if (template) {
        setUserRole(template.role);
      }
    }
  }, [currentTemplateId, templates]);

  // Helper function to get existing files for a brand/project type
  const getExistingFiles = (brand: string, projectType: string): ProjectFile[] => {
    if (!brand || !projectType) return [];
    return projectFiles.filter(
      file => file.brand.toLowerCase() === brand.toLowerCase() && 
              file.projectType.toLowerCase() === projectType.toLowerCase()
    );
  };

  // Helper function to get ideas file for a brand/project type
  const getIdeasFile = (brand: string, projectType: string): IdeasFile | null => {
    if (!brand || !projectType) return null;
    const file = ideasFiles.find(
      f => f.brand.toLowerCase() === brand.toLowerCase() && 
           f.projectType.toLowerCase() === projectType.toLowerCase()
    );
    return file || null;
  };

  // Helper function to increment filename version if it already exists
  const getUniqueFileName = (fileName: string, brand: string, projectType: string): string => {
    // Check if the filename already exists in projectFiles
    const existingFiles = projectFiles.filter(
      file => file.brand.toLowerCase() === brand.toLowerCase() && 
              file.projectType.toLowerCase() === projectType.toLowerCase()
    );
    
    // Extract base name and current version
    const versionMatch = fileName.match(/^(.+?)_[vV](\d+)$/);
    
    if (versionMatch) {
      // File has version pattern like "name_v1" or "name_V1"
      const baseName = versionMatch[1];
      let currentVersion = parseInt(versionMatch[2], 10);
      
      // Find the highest version for this base name
      let highestVersion = currentVersion;
      existingFiles.forEach(file => {
        const fileVersionMatch = file.fileName.match(/^(.+?)_[vV](\d+)$/);
        if (fileVersionMatch && fileVersionMatch[1] === baseName) {
          const version = parseInt(fileVersionMatch[2], 10);
          if (version > highestVersion) {
            highestVersion = version;
          }
        }
      });
      
      // If current version doesn't exist, return it; otherwise increment
      const fileExists = existingFiles.some(file => file.fileName === fileName);
      if (!fileExists) {
        return fileName;
      }
      
      // Return incremented version
      return `${baseName}_v${highestVersion + 1}`;
    } else {
      // File doesn't have version pattern - start with v1
      const baseV1 = `${fileName}_v1`;
      
      // Check if v1 already exists
      if (existingFiles.some(file => file.fileName === baseV1)) {
        // Find highest version
        let highestVersion = 1;
        existingFiles.forEach(file => {
          const fileVersionMatch = file.fileName.match(/^(.+?)_[vV](\d+)$/);
          if (fileVersionMatch && fileVersionMatch[1] === fileName) {
            const version = parseInt(fileVersionMatch[2], 10);
            if (version > highestVersion) {
              highestVersion = version;
            }
          }
        });
        return `${fileName}_v${highestVersion + 1}`;
      } else {
        // Return with _v1 appended
        return baseV1;
      }
    }
  };

  // Helper function to get approved research files for a brand/project type
  const getApprovedResearchFiles = (brand: string, projectType: string): ResearchFile[] => {
    if (!brand || !projectType) return [];
    return researchFiles.filter(
      file => file.brand.toLowerCase() === brand.toLowerCase() && 
              file.projectType.toLowerCase() === projectType.toLowerCase() &&
              file.isApproved === true
    );
  };

  // Helper function to generate summary filename (removes version, adds _sum)
  const getSummaryFileName = (fileName: string): string => {
    // Remove version suffix (_v1, _v2, etc.) if present
    const versionMatch = fileName.match(/^(.+?)_[vV]\d+$/);
    const baseName = versionMatch ? versionMatch[1] : fileName;
    return `${baseName}_sum`;
  };

  // Get dynamic questions for Enter step
  const getEnterQuestions = (): string[] => {
    const baseQuestions = ['Brand', 'Project Type'];
    const brand = responses['Enter']?.[0]?.trim();
    const projectType = responses['Enter']?.[1]?.trim();

    if (brand && projectType) {
      baseQuestions.push('Filename for this iteration');
    }

    // Add Ideas question after file selection is complete (skip for War Games)
    const lastQuestionIndex = baseQuestions.length - 1;
    if (lastQuestionIndex >= 2 && responses['Enter']?.[lastQuestionIndex]?.trim()) {
      // For War Games, skip Ideas Source and always show Research Files
      if (projectType === 'War Games') {
        baseQuestions.push('Research Files');
      } else {
        // For all other project types, show Ideas Source first
        baseQuestions.push('Ideas Source');
        
        // Add research files question after Ideas Source is complete
        const ideasSourceIdx = baseQuestions.indexOf('Ideas Source');
        if (ideasSourceIdx !== -1) {
          const ideasChoice = responses['Enter']?.[ideasSourceIdx];
          // For "Load Current Ideas", need to check if file was uploaded
          // For "Get Inspired", can proceed immediately
          const ideasComplete = ideasChoice === 'Get Inspired' || 
                               (ideasChoice === 'Load Current Ideas' && responses['Enter']?.[ideasSourceIdx + 1]?.trim());
          
          if (ideasComplete && brand && projectType) {
            baseQuestions.push('Research Files');
          }
        }
      }
    }

    return baseQuestions;
  };

  // Auto-fill filename when Brand and Project Type are selected
  useEffect(() => {
    if (activeStepId === 'Enter') {
      const brand = responses['Enter']?.[0]?.trim();
      const projectType = responses['Enter']?.[1]?.trim();
      
      if (brand && projectType) {
        const existingFiles = getExistingFiles(brand, projectType);
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        // Find the highest version number for this brand/projectType/date combination
        let highestVersion = 0;
        const basePattern = `CoHive_${brand}_${projectType}_${dateStr}_V`;
        
        projectFiles.forEach(file => {
          if (file.fileName.startsWith(basePattern)) {
            const versionMatch = file.fileName.match(/_V(\d+)$/);
            if (versionMatch) {
              const version = parseInt(versionMatch[1], 10);
              if (version > highestVersion) {
                highestVersion = version;
              }
            }
          }
        });
        
        // Increment to next version
        const nextVersion = highestVersion + 1;
        const suggestedFilename = `CoHive_${brand}_${projectType}_${dateStr}_V${nextVersion}`;
        
        // Auto-fill if no existing files and field is empty
        if (existingFiles.length === 0 && !responses['Enter']?.[2]) {
          setResponses(prev => ({
            ...prev,
            Enter: {
              ...prev.Enter,
              2: suggestedFilename
            }
          }));
        }
        
        // Update filename if brand/projectType changed and user chose "New"
        if (existingFiles.length > 0) {
          const projectChoice = responses['Enter']?.[2]?.trim();
          if (projectChoice === 'New') {
            // Check if filename exists at index 3
            const currentFilename = responses['Enter']?.[3];
            // Only update if filename doesn't match current brand/projectType pattern
            if (currentFilename && !currentFilename.includes(`${brand}_${projectType}`)) {
              setResponses(prev => ({
                ...prev,
                Enter: {
                  ...prev.Enter,
                  3: suggestedFilename
                }
              }));
            } else if (!currentFilename) {
              // Auto-fill if empty
              setResponses(prev => ({
                ...prev,
                Enter: {
                  ...prev.Enter,
                  3: suggestedFilename
                }
              }));
            }
          }
        }
      }
    }
  }, [activeStepId, responses['Enter']?.[0], responses['Enter']?.[1], responses['Enter']?.[2], projectFiles]);

  const currentContent = activeStepId === 'Enter' 
    ? { ...stepContent[0], questions: getEnterQuestions() }
    : stepContent.find(s => s.id === activeStepId) || stepContent[0];
  
  const currentStepIndex = processSteps.findIndex(s => s.id === activeStepId);

  const handleResponseChange = (questionIndex: number, value: string) => {
    setResponses(prev => ({
      ...prev,
      [activeStepId]: {
        ...prev[activeStepId],
        [questionIndex]: value
      }
    }));
    setShowValidation(false);
    
    // If user changes Brand or Project Type in Enter hex, clear selected research files
    if (activeStepId === 'Enter' && (questionIndex === 0 || questionIndex === 1)) {
      setSelectedResearchFiles([]);
    }
    
    // If user is filling out Enter, mark iteration as not saved (in progress)
    if (activeStepId === 'Enter' && iterationSaved) {
      setIterationSaved(false);
      localStorage.setItem('cohive_iteration_saved', 'false');
    }
  };

  const isStepComplete = (stepId: string): boolean => {
    if (stepId === 'Enter') {
      // For Enter step, check the dynamic questions
      const EnterQuestions = getEnterQuestions();
      const stepResponses = responses[stepId];
      if (!stepResponses) return false;

      // Brand and Project Type must be selected (questions 0 and 1)
      if (!stepResponses[0]?.trim() || !stepResponses[1]?.trim()) return false;

      const brand = stepResponses[0]?.trim();
      const projectType = stepResponses[1]?.trim();
      const existingFiles = brand && projectType ? getExistingFiles(brand, projectType) : [];

      // Check if New/Existing question exists and is answered (question 2)
      if (existingFiles.length > 0) {
        const projectChoice = stepResponses[2];
        if (!projectChoice?.trim()) return false;

        // If "New" is selected, check Filename (question 3)
        if (projectChoice === 'New') {
          if (!stepResponses[3]?.trim()) return false;
        }
        // If "Existing" is selected, check that a file is selected (question 3)
        else if (projectChoice === 'Existing') {
          if (!stepResponses[3]?.trim()) return false;
        }
      } else {
        // No existing files, so Filename must be filled (question 2)
        if (!stepResponses[2]?.trim()) return false;
      }

      // Find Ideas Source question index in the current responses
      const ideasSourceIdx = EnterQuestions.indexOf('Ideas Source');
      if (ideasSourceIdx !== -1) {
        const ideasChoice = stepResponses[ideasSourceIdx];
        if (!ideasChoice?.trim()) return false;

        // If "Load Current Ideas" is selected, ensure file is uploaded
        if (ideasChoice === 'Load Current Ideas') {
          const fileResponse = stepResponses[ideasSourceIdx + 1];
          if (!fileResponse?.trim()) return false;
        }
        // If "Get Inspired" is selected, no file needed - continue to check research files
      }

      // Check Research Files if they exist as a question
      const researchFilesIdx = EnterQuestions.indexOf('Research Files');
      if (researchFilesIdx !== -1) {
        // Research Files uses selectedResearchFiles state, but also stores in responses
        // Check if at least one file is selected (stored as comma-separated or checked elsewhere)
        if (selectedResearchFiles.length === 0) return false;
      }

      return true;
    }

    const content = stepContent.find(s => s.id === stepId);
    if (!content) return false;
    
    const stepResponses = responses[stepId];
    if (!stepResponses) return false;

    // Check if all questions have non-empty responses
    return content.questions.every((_, idx) => {
      const response = stepResponses[idx];
      return response && response.trim().length > 0;
    });
  };

  const isCurrentStepComplete = isStepComplete(activeStepId);

  const getCompletedStepsCount = (): number => {
    return processSteps.filter(step => isStepComplete(step.id)).length;
  };

  const handleNext = () => {
    // Enter step requires validation, all other steps allow free navigation
    if (activeStepId === 'Enter' && !isCurrentStepComplete) {
      setShowValidation(true);
      return;
    }

    if (currentStepIndex < processSteps.length - 1) {
      setActiveStepId(processSteps[currentStepIndex + 1].id);
      setShowValidation(false);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setActiveStepId(processSteps[currentStepIndex - 1].id);
      setShowValidation(false);
    }
  };

  const getStepStatus = (stepId: string): 'completed' | 'active' | 'upcoming' => {
    if (stepId === activeStepId) return 'active';
    if (isStepComplete(stepId)) return 'completed';
    
    // New logic: No "upcoming" blocking after Enter is complete
    // Enter must be completed first
    if (stepId === 'Enter') {
      return 'upcoming'; // Enter is upcoming if not completed
    }
    
    // If Enter is complete, all hexagons are accessible
    if (isStepComplete('Enter')) {
      // Review is always accessible after Enter
      if (stepId === 'review') {
        return 'upcoming'; // Will be clickable
      }
      
      // Findings requires Enter + at least one other completed step
      if (stepId === 'Findings') {
        const otherCompletedSteps = processSteps.filter(
          step => step.id !== 'Enter' && step.id !== 'Findings' && step.id !== 'review' && isStepComplete(step.id)
        ).length;
        
        // If at least one other step is complete, Findings is accessible
        if (otherCompletedSteps >= 1) {
          return 'upcoming'; // Will be clickable but shows as not completed
        }
        return 'upcoming'; // Not yet accessible
      }
      
      // All other steps are accessible after Enter
      return 'upcoming'; // Will be clickable
    }
    
    // If Enter is not complete, everything else is blocked
    return 'upcoming';
  };

  // Handle adding edit suggestions
  const handleAddSuggestion = (fileId: string, suggestion: string) => {
    const file = researchFiles.find(f => f.id === fileId);
    if (!file) return;

    const newSuggestion: EditSuggestion = {
      id: Date.now().toString(),
      researchFileId: fileId,
      fileName: file.fileName,
      suggestedBy: 'Current User',  // In production, this would be the actual user name
      suggestion,
      timestamp: Date.now(),
      status: 'pending'
    };

    setEditSuggestions(prev => [...prev, newSuggestion]);
    localStorage.setItem('cohive_edit_suggestions', JSON.stringify([...editSuggestions, newSuggestion]));
  };

  // Handle updating suggestion status
  const handleUpdateSuggestionStatus = (suggestionId: string, status: 'pending' | 'reviewed' | 'implemented') => {
    setEditSuggestions(prev => 
      prev.map(s => s.id === suggestionId ? { ...s, status } : s)
    );
    const updated = editSuggestions.map(s => s.id === suggestionId ? { ...s, status } : s);
    localStorage.setItem('cohive_edit_suggestions', JSON.stringify(updated));
  };

  // Handle toggling file approval
  const handleToggleApproval = (fileId: string) => {
    setResearchFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, isApproved: !f.isApproved } : f)
    );
    const updated = researchFiles.map(f => f.id === fileId ? { ...f, isApproved: !f.isApproved } : f);
    localStorage.setItem('cohive_research_files', JSON.stringify(updated));
  };

  // Handle creating new research file
  const handleCreateResearchFile = (file: Omit<ResearchFile, 'id' | 'uploadDate'>) => {
    const newFile: ResearchFile = {
      ...file,
      id: Date.now().toString(),
      uploadDate: Date.now()
    };
    setResearchFiles(prev => [...prev, newFile]);
    localStorage.setItem('cohive_research_files', JSON.stringify([...researchFiles, newFile]));
  };

  // Handle updating existing research file
  const handleUpdateResearchFile = (fileId: string, content: string) => {
    const updated = researchFiles.map(f => f.id === fileId ? { ...f, content } : f);
    setResearchFiles(updated);
    localStorage.setItem('cohive_research_files', JSON.stringify(updated));
  };

  // Handle deleting project files
  const handleDeleteProjectFiles = (fileNames: string[]) => {
    const updatedFiles = projectFiles.filter(file => !fileNames.includes(file.fileName));
    setProjectFiles(updatedFiles);
    localStorage.setItem('cohive_projects', JSON.stringify(updatedFiles));
  };

  // Handle central hexagon execution
  const handleCentralHexExecute = (selectedFiles: string[], assessmentType: string[], assessment: string) => {
    // Get brand and project type for ideas file lookup
    const brand = responses['Enter']?.[0]?.trim() || '';
    const projectType = responses['Enter']?.[1]?.trim() || '';
    
    // Get the ideas file if one exists for this project
    const ideasFile = getIdeasFile(brand, projectType);
    
    // Store the execution data
    const executionData: HexExecution = {
      id: Date.now().toString(),
      selectedFiles,
      assessmentType, // Now it's already an array
      assessment,
      timestamp: Date.now()
    };
    
    // Save to responses to mark step as complete
    setResponses(prev => ({
      ...prev,
      [activeStepId]: {
        0: `Files: ${selectedFiles.join(', ')}`,
        1: assessment
      }
    }));

    // Add to hex executions
    setHexExecutions(prev => ({
      ...prev,
      [activeStepId]: [...(prev[activeStepId] || []), executionData]
    }));
    localStorage.setItem('cohive_hex_executions', JSON.stringify({
      ...hexExecutions,
      [activeStepId]: [...(hexExecutions[activeStepId] || []), executionData]
    }));

    console.log('Executing central hex process:', activeStepId, executionData);
    
    // Prepare data for Databricks
    const databricksPayload = {
      hexId: activeStepId,
      brand,
      projectType,
      selectedFiles,
      assessmentType,
      assessment,
      timestamp: Date.now(),
      ideasFile: ideasFile ? {
        fileName: ideasFile.fileName,
        content: ideasFile.content,
        fileType: ideasFile.fileType
      } : null
    };
    
    console.log('Data prepared for Databricks:', databricksPayload);
    // In production, this would send databricksPayload to Databricks via API
    // Example: await fetch('/api/databricks-execute', { method: 'POST', body: JSON.stringify(databricksPayload) });
  };

  // Handle saving recommendation to knowledge base
  const handleSaveRecommendation = (recommendation: string, hexId: string) => {
    const brand = responses['Enter']?.[0]?.trim() || 'General';
    const projectType = responses['Enter']?.[1]?.trim() || 'General';
    
    const newRecommendationFile: ResearchFile = {
      id: Date.now().toString(),
      brand,
      projectType,
      fileName: `Recommendation_${hexId}_${Date.now()}`,
      isApproved: true,
      uploadDate: Date.now(),
      fileType: 'Research',
      content: recommendation
    };
    
    const updatedFiles = [...researchFiles, newRecommendationFile];
    setResearchFiles(updatedFiles);
    localStorage.setItem('cohive_research_files', JSON.stringify(updatedFiles));
  };

  // Handle saving wisdom to Databricks Knowledge Base
  const handleSaveWisdomToDatabricks = async (
    fileName: string,
    content: string,
    insightType: string,
    inputMethod: string,
    brand?: string,
    projectType?: string
  ) => {
    const wisdomFile: KnowledgeBaseFile = {
      id: Date.now().toString(),
      brand: brand || 'General',
      projectType: projectType || 'General',
      fileName,
      isApproved: true,
      uploadDate: Date.now(),
      fileType: 'Wisdom',
      content,
      insightType,
      inputMethod
    };

    const result = await saveToKnowledgeBase(wisdomFile);
    
    if (result.success) {
      console.log('✅ Wisdom successfully saved to Databricks:', wisdomFile);
      return true;
    } else {
      console.error('❌ Failed to save wisdom to Databricks:', result.error);
      alert(`Failed to save to Knowledge Base: ${result.error || 'Unknown error'}`);
      return false;
    }
  };

  // Check if current step is a central hexagon
  const centralHexIds = ['Luminaries', 'panelist', 'Consumers', 'competitors', 'Colleagues', 'cultural', 'test', 'Grade'];
  const isCentralHex = centralHexIds.includes(activeStepId);

  // Template handlers
  const handleTemplateChange = (templateId: string) => {
    const newTemplate = templates.find(t => t.id === templateId);
    if (newTemplate) {
      setCurrentTemplateId(templateId);
      localStorage.setItem('cohive_current_template_id', templateId);
    }
  };

  const handleTemplateUpdate = (template: UserTemplate) => {
    const updatedTemplates = templates.map(t => 
      t.id === template.id ? template : t
    );
    setTemplates(updatedTemplates);
    if (currentTemplateId === template.id) {
      setCurrentTemplateId(template.id);
      localStorage.setItem('cohive_current_template_id', template.id);
    }
    localStorage.setItem('cohive_templates', JSON.stringify(updatedTemplates));
  };

  const handleTemplateCreate = (template: UserTemplate) => {
    const updatedTemplates = [...templates, template];
    setTemplates(updatedTemplates);
    localStorage.setItem('cohive_templates', JSON.stringify(updatedTemplates));
  };

  // Brand and Project Type handlers
  const handleAddBrand = (brand: string) => {
    if (!brand.trim() || availableBrands.includes(brand.trim())) return;
    const updated = [...availableBrands, brand.trim()].sort();
    setAvailableBrands(updated);
    localStorage.setItem('cohive_available_brands', JSON.stringify(updated));
  };

  const handleAddProjectType = (projectType: string) => {
    if (!projectType.trim() || availableProjectTypes.includes(projectType.trim())) return;
    const updated = [...availableProjectTypes, projectType.trim()].sort();
    setAvailableProjectTypes(updated);
    localStorage.setItem('cohive_available_project_types', JSON.stringify(updated));
  };

  // Export all project data
  const handleExportData = () => {
    // Get brand and project type from Enter responses
    const brandName = responses['Enter']?.[0] || 'Brand';
    const projectType = responses['Enter']?.[1] || 'ProjectType';
    
    // Format date as YYYY-MM-DD
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // Gets YYYY-MM-DD
    
    // Create base filename
    const baseFilename = `CoHive_${brandName}_${projectType}_${dateStr}`;
    
    // For now, we'll suggest V1 as the version
    // In a real implementation, you could track versions in localStorage
    const filename = `${baseFilename}_V1.json`;
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      projectName: responses['Enter']?.[0] || 'CoHive Project',
      responses,
      researchFiles,
      ideasFiles,
      hexExecutions,
      editSuggestions,
      projectFiles,
      currentTemplateId,
      templates
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import project data
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        // Validate data structure
        if (!importData.version || !importData.responses) {
          alert('Invalid project file format');
          return;
        }

        // Confirm before overwriting
        if (Object.keys(responses).length > 0) {
          const confirmed = confirm('This will replace your current project data. Continue?');
          if (!confirmed) return;
        }

        // Import all data
        setResponses(importData.responses || {});
        setResearchFiles(importData.researchFiles || []);
        setIdeasFiles(importData.ideasFiles || []);
        setHexExecutions(importData.hexExecutions || {});
        setEditSuggestions(importData.editSuggestions || []);
        setProjectFiles(importData.projectFiles || []);
        
        if (importData.currentTemplateId) {
          setCurrentTemplateId(importData.currentTemplateId);
        }
        
        if (importData.templates) {
          setTemplates(importData.templates);
        }

        // Save to localStorage
        localStorage.setItem('cohive_responses', JSON.stringify(importData.responses || {}));
        localStorage.setItem('cohive_research_files', JSON.stringify(importData.researchFiles || []));
        localStorage.setItem('cohive_ideas_files', JSON.stringify(importData.ideasFiles || []));
        localStorage.setItem('cohive_hex_executions', JSON.stringify(importData.hexExecutions || {}));
        localStorage.setItem('cohive_edit_suggestions', JSON.stringify(importData.editSuggestions || []));
        localStorage.setItem('cohive_projects', JSON.stringify(importData.projectFiles || []));
        
        if (importData.currentTemplateId) {
          localStorage.setItem('cohive_current_template_id', importData.currentTemplateId);
        }
        
        if (importData.templates) {
          localStorage.setItem('cohive_templates', JSON.stringify(importData.templates));
        }

        alert(`Project "${importData.projectName}" imported successfully!`);
      } catch (error) {
        alert('Failed to import project file. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  // Restart the entire project
  const handleRestart = () => {
    const confirmed = confirm('⚠️ WARNING: Restart Project\n\nThis action will permanently delete:\n• All workflow steps and progress\n• All responses and data entered\n• All execution history\n• All uploaded ideas files\n• Templates, research files, and project files will be preserved.\n\nThis action CANNOT be undone.\n\nAre you sure you want to restart?');
    if (!confirmed) return;

    // Clear all state
    setResponses({});
    setActiveStepId('Enter');
    setShowValidation(false);
    setIdeasFiles([]);
    
    // Clear localStorage (but keep templates, research files, and project files)
    localStorage.removeItem('cohive_responses');
    localStorage.removeItem('cohive_hex_executions');
    localStorage.removeItem('cohive_ideas_files');
    
    alert('Project has been restarted. All data has been cleared.');
  };

  return (
    <div className="p-8">
      {/* Top Section: Hex Box on Left, Content Area on Right */}
      <div className="flex gap-6 mb-6">
        {/* Left Side: Hexagonal Breadcrumb Navigation */}
        <div className="flex-shrink-0">
          <ProcessFlow 
            activeStep={activeStepId} 
            onStepChange={(stepId) => {
              // If navigating to Enter and the last iteration was saved, increment the filename
              if (stepId === 'Enter' && iterationSaved) {
                const brand = responses['Enter']?.[0];
                const projectType = responses['Enter']?.[1];
                const currentFileName = responses['Enter']?.[2];
                
                if (brand && projectType && currentFileName) {
                  // Get the next incremented filename
                  const nextFileName = getUniqueFileName(currentFileName, brand, projectType);
                  
                  setResponses(prev => ({
                    ...prev,
                    'Enter': {
                      ...prev['Enter'],
                      [2]: nextFileName
                    },
                    // Clear the "Save Iteration" selection from Findings
                    'Findings': {
                      ...prev['Findings'],
                      [0]: '' // Clear "Save Iteration or Summarize" choice
                    }
                  }));
                }
                
                setIterationSaved(false);
                localStorage.setItem('cohive_iteration_saved', 'false');
              }
              
              // Always clear "Save Iteration" selection when navigating to Enter
              if (stepId === 'Enter' && !iterationSaved) {
                setResponses(prev => ({
                  ...prev,
                  'Findings': {
                    ...prev['Findings'],
                    [0]: '' // Clear "Save Iteration or Summarize" choice
                  }
                }));
              }
              
              setActiveStepId(stepId);
              setShowValidation(false);
            }}
            completedSteps={processSteps.filter(step => isStepComplete(step.id)).map(step => step.id)}
            isEnterComplete={isStepComplete('Enter')}
            userRole={userRole}
            hexExecutions={hexExecutions}
            projectType={responses['Enter']?.[1] || ''}
          />
          
          {/* Bottom Section: Control Buttons - positioned below hex box */}
          <div className="flex flex-col gap-3 mt-4">
            {/* Save Notification */}
            {showSaveNotification && (
              <span className="flex items-center gap-2 text-green-600 text-sm px-3 py-2 bg-green-50 rounded">
                <Save className="w-4 h-4" />
                Saved
              </span>
            )}

            {/* Export Project Button */}
            <button 
              className="px-4 py-2 border-2 border-blue-500 text-blue-700 rounded flex items-center gap-2 hover:bg-gray-50"
              onClick={handleExportData}
              title="Export project data to JSON file"
            >
              <Download className="w-4 h-4" />
              Export Project
            </button>

            {/* Import Project Button */}
            <label className="px-4 py-2 border-2 border-green-500 text-green-700 rounded flex items-center gap-2 hover:bg-gray-50 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import Project
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportData}
              />
            </label>

            {/* Restart Button */}
            <button 
              className="px-4 py-2 border-2 border-red-500 text-red-700 rounded flex items-center gap-2 hover:bg-gray-50"
              onClick={handleRestart}
              title="Restart the project and clear all data"
            >
              <RotateCcw className="w-4 h-4" />
              Restart Project
            </button>

            {/* Current Template Info */}
            <div className="flex items-center gap-2 px-3 py-2 border-2 border-gray-300 rounded">
              <User className="w-4 h-4 text-gray-600" />
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Template</span>
                <span className="text-sm text-gray-900">{currentTemplateId}</span>
              </div>
            </div>

            {/* Manage Templates Button */}
            <div className="relative">
              <button 
                className="w-full px-4 py-2 border-2 border-gray-400 text-gray-700 rounded flex items-center gap-2 hover:bg-gray-50"
                onClick={() => setShowTemplateManager(true)}
              >
                <Settings className="w-4 h-4" />
                Manage Templates
              </button>

              {/* Template Manager Modal */}
              {showTemplateManager && currentTemplate && (
                <TemplateManager
                  currentTemplate={currentTemplate}
                  availableTemplates={templates}
                  onTemplateChange={handleTemplateChange}
                  onTemplateUpdate={handleTemplateUpdate}
                  onTemplateCreate={handleTemplateCreate}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Content Area with Questions and User Notes */}
        <div className="flex-1 flex gap-6">
          {/* Main Content Area */}
          <div className="flex-1">
            {/* CoHive Logo */}
            <div className="mb-4 -mt-8 flex justify-center">
              <img src={cohiveLogo} alt="CoHive - Insight into Inspiration" className="h-24" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-gray-900">
                  {activeStepId === 'research' && !currentTemplate?.permissions?.canApproveResearch
                    ? 'View Knowledge Assets'
                    : currentContent.title}
                </h2>
                <div className="flex items-center gap-2">
                  {isCurrentStepComplete && (
                    <span className="flex items-center gap-1 px-3 py-1 text-green-800 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Complete
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-gray-600 mb-6">
                {activeStepId === 'research' && !currentTemplate?.permissions?.canApproveResearch
                  ? 'Review and suggest edits to the knowledge assets your projects will be based on'
                  : currentContent.description}
              </p>

              {/* Validation Message - Only for Enter step */}
              {activeStepId === 'Enter' && showValidation && !isCurrentStepComplete && (
                <div className="mb-4 p-4 border-2 border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-red-900">Please complete the Enter step</div>
                    <div className="text-red-700 text-sm">All Enter questions must be answered before proceeding to the next step.</div>
                  </div>
                </div>
              )}

              {/* Questions Section */}
              <div className="space-y-4">
                {/* Special handling for Research step - different views for researchers vs non-researchers */}
                {activeStepId === 'research' ? (
                (userRole === 'administrator' || userRole === 'research-analyst' || userRole === 'research-leader') ? (
                  <ResearcherModes
                    brand={responses['Enter']?.[0]?.trim() || ''}
                    projectType={responses['Enter']?.[1]?.trim() || ''}
                    researchFiles={researchFiles}
                    editSuggestions={editSuggestions}
                    canApproveResearch={currentTemplate?.permissions?.canApproveResearch || false}
                    onCreateResearchFile={handleCreateResearchFile}
                    onToggleApproval={handleToggleApproval}
                    onUpdateResearchFile={handleUpdateResearchFile}
                    onUpdateSuggestionStatus={handleUpdateSuggestionStatus}
                    availableBrands={availableBrands}
                    availableProjectTypes={availableProjectTypes}
                    onAddBrand={handleAddBrand}
                    onAddProjectType={handleAddProjectType}
                  />
                ) : (
                  <ResearchView
                    role="non-researcher"
                    brand={responses['Enter']?.[0]?.trim() || ''}
                    projectType={responses['Enter']?.[1]?.trim() || ''}
                    researchFiles={researchFiles}
                    editSuggestions={editSuggestions}
                    onAddSuggestion={handleAddSuggestion}
                    onUpdateSuggestionStatus={handleUpdateSuggestionStatus}
                    onToggleApproval={handleToggleApproval}
                    canApproveResearch={currentTemplate?.permissions?.canApproveResearch || false}
                    onCreateResearchFile={handleCreateResearchFile}
                  />
                )
              ) : activeStepId === 'review' ? (
                <ReviewView
                  projectFiles={projectFiles}
                  onDeleteFiles={handleDeleteProjectFiles}
                />
              ) : isCentralHex ? (
                <CentralHexView
                  key={activeStepId}
                  hexId={activeStepId}
                  hexLabel={currentContent.title}
                  researchFiles={researchFiles}
                  onExecute={handleCentralHexExecute}
                  databricksInstructions={currentTemplate?.databricksInstructions?.[activeStepId] || ''}
                  previousExecutions={hexExecutions[activeStepId] || []}
                  onSaveRecommendation={handleSaveRecommendation}
                  projectType={responses['Enter']?.[1] || ''}
                />
              ) : (
                currentContent.questions.map((question, idx) => {
                  const hasResponse = responses[activeStepId]?.[idx]?.trim().length > 0;
                  const showError = false; // Allow free navigation - no validation errors
                  
                  // Special handling for Enter step dynamic questions
                  if (activeStepId === 'Enter') {
                    const brand = responses['Enter']?.[0]?.trim();
                    const projectType = responses['Enter']?.[1]?.trim();
                    const existingFiles = brand && projectType ? getExistingFiles(brand, projectType) : [];
                    


                    // Ideas Source question: Load Current Ideas or Get Inspired
                    // Skip this question for War Games project type
                    if (question === 'Ideas Source') {
                      const projectType = responses['Enter']?.[1];
                      if (projectType === 'War Games') {
                        return null; // Skip this question for War Games
                      }
                      
                      const ideasChoice = responses[activeStepId]?.[idx];
                      const nextQuestionIdx = idx + 1;
                      
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. Load Current Ideas or Get Inspired?</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="ideasSource"
                                value="Load Current Ideas"
                                checked={responses[activeStepId]?.[idx] === 'Load Current Ideas'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Load Current Ideas</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="ideasSource"
                                value="Get Inspired"
                                checked={responses[activeStepId]?.[idx] === 'Get Inspired'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Get Inspired</span>
                            </label>
                          </div>
                          {showError && (
                            <p className="text-red-600 text-sm mt-2">Please select an option</p>
                          )}

                          {/* File upload if "Load Current Ideas" is selected */}
                          {ideasChoice === 'Load Current Ideas' && (
                            <div className="mt-2">
                              <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                <span>{idx + 2}. Upload Ideas File</span>
                                {responses[activeStepId]?.[nextQuestionIdx] && (
                                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                )}
                              </label>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                                className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  
                                  const fileName = file.name;
                                  const fileType = file.type || 'application/octet-stream';
                                  
                                  // Read file content as base64
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const base64Content = event.target?.result as string;
                                    
                                    // Store the ideas file with content
                                    const newIdeasFile: IdeasFile = {
                                      brand: brand || '',
                                      projectType: projectType || '',
                                      fileName,
                                      content: base64Content,
                                      fileType,
                                      uploadDate: Date.now()
                                    };
                                    
                                    // Remove any existing ideas file for this brand/project
                                    const updatedIdeasFiles = ideasFiles.filter(
                                      f => !(f.brand.toLowerCase() === brand?.toLowerCase() && 
                                             f.projectType.toLowerCase() === projectType?.toLowerCase())
                                    );
                                    
                                    // Add the new file
                                    updatedIdeasFiles.push(newIdeasFile);
                                    setIdeasFiles(updatedIdeasFiles);
                                    
                                    // Save to localStorage
                                    localStorage.setItem('cohive_ideas_files', JSON.stringify(updatedIdeasFiles));
                                    
                                    // Store filename in responses
                                    handleResponseChange(nextQuestionIdx, fileName);
                                  };
                                  
                                  reader.onerror = () => {
                                    alert('Failed to read file. Please try again.');
                                  };
                                  
                                  reader.readAsDataURL(file);
                                }}
                              />
                              {responses[activeStepId]?.[nextQuestionIdx] && (() => {
                                const currentIdeasFile = getIdeasFile(brand || '', projectType || '');
                                return (
                                  <div className="text-sm mt-2">
                                    <p className="text-green-700 flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4" />
                                      Selected: {responses[activeStepId][nextQuestionIdx]}
                                    </p>
                                    {currentIdeasFile && (
                                      <p className="text-blue-600 text-xs mt-1">
                                        ✓ File content stored ({(currentIdeasFile.content.length / 1024).toFixed(1)} KB) - Will be sent to Databricks on execution
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}


                        </div>
                      );
                    }

                    // Research Files question: Select approved knowledge files
                    if (question === 'Research Files') {
                      const nextQuestionIdx = idx + 1;
                      const approvedFiles = brand && projectType ? getApprovedResearchFiles(brand, projectType) : [];
                      
                      return (
                        <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>{idx + 1}. Select Approved Knowledge Files</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            <div className="space-y-1">
                              {approvedFiles.length > 0 ? (
                                approvedFiles.map((file, fileIdx) => (
                                  <label key={fileIdx} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      name="researchFiles"
                                      value={file.fileName}
                                      checked={selectedResearchFiles.includes(file.fileName)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedResearchFiles([...selectedResearchFiles, file.fileName]);
                                        } else {
                                          setSelectedResearchFiles(selectedResearchFiles.filter(f => f !== file.fileName));
                                        }
                                      }}
                                      className="w-4 h-4"
                                    />
                                    <span className="text-gray-700">{file.fileName} (Uploaded: {new Date(file.uploadDate).toLocaleDateString()})</span>
                                  </label>
                                ))
                              ) : (
                                <p className="text-gray-600 text-sm italic">No approved research files available for {brand} - {projectType}. You can upload files in the Research section.</p>
                              )}
                            </div>
                            {showError && (
                              <p className="text-red-600 text-sm mt-1">Please select at least one file</p>
                            )}
                        </div>
                      );
                    }

                    // Filename question: Use input with default filename
                    if (idx === 3 && question === 'Filename' && brand && projectType) {
                      const defaultFileName = generateDefaultFileName(brand, projectType);
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <input
                            type="text"
                            className={`w-full border-2 ${showError ? 'border-red-300' : 'border-gray-300'} bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500`}
                            placeholder={defaultFileName}
                            value={responses[activeStepId]?.[idx] || ''}
                            onChange={(e) => handleResponseChange(idx, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !responses[activeStepId]?.[idx]) {
                                handleResponseChange(idx, defaultFileName);
                              }
                            }}
                          />
                          {showError && (
                            <p className="text-red-600 text-sm mt-2">Please enter a filename</p>
                          )}
                        </div>
                      );
                    }
                  }

                  // Special handling for Wisdom hex questions
                  if (activeStepId === 'Wisdom') {
                    const brand = responses['Enter']?.[0]?.trim() || '';
                    const projectType = responses['Enter']?.[1]?.trim() || '';
                    
                    // Question 0: Insight Type
                    if (idx === 0 && question === 'Insight Type') {
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. What type of insight are you sharing?</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="insightType"
                                value="Brand"
                                checked={responses[activeStepId]?.[idx] === 'Brand'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">About a Brand</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="insightType"
                                value="Category"
                                checked={responses[activeStepId]?.[idx] === 'Category'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">About a Category</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="insightType"
                                value="General"
                                checked={responses[activeStepId]?.[idx] === 'General'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">General Insight</span>
                            </label>
                          </div>
                          {showError && (
                            <p className="text-red-600 text-sm mt-2">Please select an insight type</p>
                          )}
                        </div>
                      );
                    }

                    // Question 1: Input Method
                    if (idx === 1 && question === 'Input Method') {
                      const insightType = responses[activeStepId]?.[0];
                      if (!insightType) return null; // Only show after insight type is selected
                      
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. How would you like to share?</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="inputMethod"
                                value="Text"
                                checked={responses[activeStepId]?.[idx] === 'Text'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Type Text</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="inputMethod"
                                value="Voice"
                                checked={responses[activeStepId]?.[idx] === 'Voice'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Record Voice</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="inputMethod"
                                value="Photo"
                                checked={responses[activeStepId]?.[idx] === 'Photo'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Upload Photo</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="inputMethod"
                                value="Video"
                                checked={responses[activeStepId]?.[idx] === 'Video'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Upload Video</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="inputMethod"
                                value="File"
                                checked={responses[activeStepId]?.[idx] === 'File'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Upload File</span>
                            </label>
                          </div>
                          {showError && (
                            <p className="text-red-600 text-sm mt-2">Please select an input method</p>
                          )}
                        </div>
                      );
                    }

                    // Question 2: Share Your Wisdom
                    if (idx === 2 && question === 'Share Your Wisdom') {
                      const insightType = responses[activeStepId]?.[0];
                      const inputMethod = responses[activeStepId]?.[1];
                      if (!insightType || !inputMethod) return null; // Only show after both are selected
                      
                      // Text input
                      if (inputMethod === 'Text') {
                        return (
                          <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>{idx + 1}. Share Your Wisdom</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            <textarea
                              className={`w-full border-2 ${showError ? 'border-red-300' : 'border-gray-300'} bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500`}
                              placeholder={`Share your ${insightType.toLowerCase()} insight here...`}
                              rows={6}
                              value={responses[activeStepId]?.[idx] || ''}
                              onChange={(e) => handleResponseChange(idx, e.target.value)}
                            />
                            {showError && (
                              <p className="text-red-600 text-sm mt-2">Please enter your wisdom</p>
                            )}
                            {hasResponse && (
                              <button
                                onClick={async () => {
                                  const wisdom = responses[activeStepId]?.[idx];
                                  if (!wisdom) return;
                                  
                                  // Save to Databricks Knowledge Base
                                  const fileName = `Wisdom_${insightType}_${Date.now()}.txt`;
                                  const success = await handleSaveWisdomToDatabricks(
                                    fileName,
                                    wisdom,
                                    insightType,
                                    'Text',
                                    brand,
                                    projectType
                                  );
                                  
                                  if (success) {
                                    alert('✓ Wisdom saved to Databricks Knowledge Base!');
                                  }
                                }}
                                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Save to Knowledge Base
                              </button>
                            )}
                          </div>
                        );
                      }
                      
                      // Voice recording
                      if (inputMethod === 'Voice') {
                        return (
                          <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>{idx + 1}. Share Your Wisdom</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            
                            <div className="space-y-3">
                              {!isRecording && !responses[activeStepId]?.[idx] && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                      setStream(audioStream);
                                      
                                      const recorder = new MediaRecorder(audioStream);
                                      const chunks: Blob[] = [];
                                      
                                      recorder.ondataavailable = (e) => {
                                        if (e.data.size > 0) {
                                          chunks.push(e.data);
                                        }
                                      };
                                      
                                      recorder.onstop = async () => {
                                        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                                        
                                        // Convert blob to base64
                                        const reader = new FileReader();
                                        reader.onload = async () => {
                                          const base64Content = reader.result as string;
                                          const fileName = `Wisdom_${insightType}_Voice_${Date.now()}.webm`;
                                          
                                          // Store in responses
                                          handleResponseChange(idx, fileName);
                                          
                                          // Save to Databricks Knowledge Base
                                          const success = await handleSaveWisdomToDatabricks(
                                            fileName,
                                            base64Content,
                                            insightType,
                                            'Voice',
                                            brand,
                                            projectType
                                          );
                                          
                                          if (success) {
                                            alert('✓ Voice wisdom saved to Databricks Knowledge Base!');
                                          }
                                        };
                                        
                                        reader.readAsDataURL(audioBlob);
                                        
                                        // Stop all tracks
                                        audioStream.getTracks().forEach(track => track.stop());
                                        setStream(null);
                                      };
                                      
                                      setMediaRecorder(recorder);
                                      setRecordedChunks(chunks);
                                      recorder.start();
                                      setIsRecording(true);
                                    } catch (err) {
                                      alert('Unable to access microphone. Please check your browser permissions.');
                                      console.error('Microphone error:', err);
                                    }
                                  }}
                                  className="w-full px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2"
                                >
                                  <Mic className="w-5 h-5" />
                                  Start Recording
                                </button>
                              )}
                              
                              {isRecording && (
                                <div className="space-y-2">
                                  <div className="bg-red-50 border-2 border-red-500 rounded p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                                      <span className="text-red-700 font-medium">Recording...</span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                                          mediaRecorder.stop();
                                          setIsRecording(false);
                                          setMediaRecorder(null);
                                        }
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                                    >
                                      <StopCircle className="w-4 h-4" />
                                      Stop
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {responses[activeStepId]?.[idx] && (
                                <div className="bg-green-50 border border-green-200 rounded p-2">
                                  <p className="text-sm text-green-700">
                                    ✓ Recorded: {responses[activeStepId][idx]}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Photo upload
                      if (inputMethod === 'Photo') {
                        const photoMethod = responses[activeStepId]?.photoMethod;
                        
                        return (
                          <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>{idx + 1}. Share Your Wisdom</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            
                            {!photoMethod && (
                              <div className="space-y-2">
                                <button
                                  onClick={() => {
                                    setResponses(prev => ({
                                      ...prev,
                                      [activeStepId]: {
                                        ...prev[activeStepId],
                                        photoMethod: 'upload'
                                      }
                                    }));
                                  }}
                                  className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                                >
                                  <Upload className="w-5 h-5" />
                                  Upload Photo
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                                      setStream(videoStream);
                                      setResponses(prev => ({
                                        ...prev,
                                        [activeStepId]: {
                                          ...prev[activeStepId],
                                          photoMethod: 'capture'
                                        }
                                      }));
                                    } catch (err) {
                                      alert('Unable to access camera. Please check your browser permissions.');
                                      console.error('Camera error:', err);
                                    }
                                  }}
                                  className="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                  <Camera className="w-5 h-5" />
                                  Capture with Camera
                                </button>
                              </div>
                            )}
                            
                            {photoMethod === 'upload' && !responses[activeStepId]?.[idx] && (
                              <div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    const fileName = file.name;
                                    
                                    // Read file content as base64
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      const base64Content = event.target?.result as string;
                                      
                                      // Store in responses
                                      handleResponseChange(idx, fileName);
                                      
                                      // Save to Databricks Knowledge Base
                                      const wisdomFileName = `Wisdom_${insightType}_Photo_${fileName}`;
                                      const success = await handleSaveWisdomToDatabricks(
                                        wisdomFileName,
                                        base64Content,
                                        insightType,
                                        'Photo',
                                        brand,
                                        projectType
                                      );
                                      
                                      if (success) {
                                        alert('✓ Photo wisdom saved to Databricks Knowledge Base!');
                                      }
                                    };
                                    
                                    reader.onerror = () => {
                                      alert('Failed to read photo file. Please try again.');
                                    };
                                    
                                    reader.readAsDataURL(file);
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    setResponses(prev => ({
                                      ...prev,
                                      [activeStepId]: {
                                        ...prev[activeStepId],
                                        photoMethod: undefined
                                      }
                                    }));
                                  }}
                                  className="mt-2 text-sm text-blue-600 hover:underline"
                                >
                                  ← Back to options
                                </button>
                              </div>
                            )}
                            
                            {photoMethod === 'capture' && !responses[activeStepId]?.[idx] && stream && (
                              <div className="space-y-2">
                                <video
                                  ref={(video) => {
                                    if (video && stream) {
                                      video.srcObject = stream;
                                      video.play();
                                    }
                                  }}
                                  className="w-full rounded border-2 border-gray-300"
                                  autoPlay
                                  playsInline
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      const video = document.querySelector('video');
                                      if (!video) return;
                                      
                                      // Create canvas to capture frame
                                      const canvas = document.createElement('canvas');
                                      canvas.width = video.videoWidth;
                                      canvas.height = video.videoHeight;
                                      const ctx = canvas.getContext('2d');
                                      if (!ctx) return;
                                      
                                      ctx.drawImage(video, 0, 0);
                                      
                                      // Convert to blob and save
                                      canvas.toBlob((blob) => {
                                        if (!blob) return;
                                        
                                        const reader = new FileReader();
                                        reader.onload = async () => {
                                          const base64Content = reader.result as string;
                                          const fileName = `Wisdom_${insightType}_Captured_${Date.now()}.jpg`;
                                          
                                          // Store in responses
                                          handleResponseChange(idx, fileName);
                                          
                                          // Save to Databricks Knowledge Base
                                          const success = await handleSaveWisdomToDatabricks(
                                            fileName,
                                            base64Content,
                                            insightType,
                                            'Photo',
                                            brand,
                                            projectType
                                          );
                                          
                                          if (success) {
                                            alert('✓ Photo wisdom saved to Databricks Knowledge Base!');
                                          }
                                          
                                          // Stop camera
                                          stream.getTracks().forEach(track => track.stop());
                                          setStream(null);
                                        };
                                        
                                        reader.readAsDataURL(blob);
                                      }, 'image/jpeg', 0.9);
                                    }}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                                  >
                                    <Camera className="w-5 h-5" />
                                    Capture Photo
                                  </button>
                                  <button
                                    onClick={() => {
                                      stream.getTracks().forEach(track => track.stop());
                                      setStream(null);
                                      setResponses(prev => ({
                                        ...prev,
                                        [activeStepId]: {
                                          ...prev[activeStepId],
                                          photoMethod: undefined
                                        }
                                      }));
                                    }}
                                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {responses[activeStepId]?.[idx] && (
                              <div className="bg-green-50 border border-green-200 rounded p-2">
                                <p className="text-sm text-green-700">
                                  ✓ Saved: {responses[activeStepId][idx]}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // Video upload
                      if (inputMethod === 'Video') {
                        const videoMethod = responses[activeStepId]?.videoMethod;
                        
                        return (
                          <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>{idx + 1}. Share Your Wisdom</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            
                            {!videoMethod && (
                              <div className="space-y-2">
                                <button
                                  onClick={() => {
                                    setResponses(prev => ({
                                      ...prev,
                                      [activeStepId]: {
                                        ...prev[activeStepId],
                                        videoMethod: 'upload'
                                      }
                                    }));
                                  }}
                                  className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                                >
                                  <Upload className="w-5 h-5" />
                                  Upload Video
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                                      setStream(videoStream);
                                      
                                      // Start recording
                                      const recorder = new MediaRecorder(videoStream);
                                      const chunks: Blob[] = [];
                                      
                                      recorder.ondataavailable = (e) => {
                                        if (e.data.size > 0) {
                                          chunks.push(e.data);
                                        }
                                      };
                                      
                                      setMediaRecorder(recorder);
                                      setRecordedChunks(chunks);
                                      
                                      setResponses(prev => ({
                                        ...prev,
                                        [activeStepId]: {
                                          ...prev[activeStepId],
                                          videoMethod: 'capture'
                                        }
                                      }));
                                    } catch (err) {
                                      alert('Unable to access camera. Please check your browser permissions.');
                                      console.error('Camera error:', err);
                                    }
                                  }}
                                  className="w-full px-4 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center gap-2"
                                >
                                  <Video className="w-5 h-5" />
                                  Record Video
                                </button>
                              </div>
                            )}
                            
                            {videoMethod === 'upload' && !responses[activeStepId]?.[idx] && (
                              <div>
                                <input
                                  type="file"
                                  accept="video/*"
                                  className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    const fileName = file.name;
                                    
                                    // Read file content as base64
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      const base64Content = event.target?.result as string;
                                      
                                      // Store in responses
                                      handleResponseChange(idx, fileName);
                                      
                                      // Save to Databricks Knowledge Base
                                      const wisdomFileName = `Wisdom_${insightType}_Video_${fileName}`;
                                      const success = await handleSaveWisdomToDatabricks(
                                        wisdomFileName,
                                        base64Content,
                                        insightType,
                                        'Video',
                                        brand,
                                        projectType
                                      );
                                      
                                      if (success) {
                                        alert('✓ Video wisdom saved to Databricks Knowledge Base!');
                                      }
                                    };
                                    
                                    reader.onerror = () => {
                                      alert('Failed to read video file. Please try again.');
                                    };
                                    
                                    reader.readAsDataURL(file);
                                  }}
                                />
                                <p className="text-amber-600 text-xs mt-1">
                                  Note: Large video files may exceed storage limits. Consider smaller files or shorter clips.
                                </p>
                                <button
                                  onClick={() => {
                                    setResponses(prev => ({
                                      ...prev,
                                      [activeStepId]: {
                                        ...prev[activeStepId],
                                        videoMethod: undefined
                                      }
                                    }));
                                  }}
                                  className="mt-2 text-sm text-blue-600 hover:underline"
                                >
                                  ← Back to options
                                </button>
                              </div>
                            )}
                            
                            {videoMethod === 'capture' && !responses[activeStepId]?.[idx] && stream && (
                              <div className="space-y-2">
                                <video
                                  ref={(video) => {
                                    if (video && stream) {
                                      video.srcObject = stream;
                                      video.play();
                                    }
                                  }}
                                  className="w-full rounded border-2 border-gray-300"
                                  autoPlay
                                  playsInline
                                  muted
                                />
                                
                                {!isRecording && mediaRecorder && mediaRecorder.state === 'inactive' && (
                                  <button
                                    onClick={() => {
                                      if (mediaRecorder) {
                                        mediaRecorder.start();
                                        setIsRecording(true);
                                      }
                                    }}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2"
                                  >
                                    <Video className="w-5 h-5" />
                                    Start Recording
                                  </button>
                                )}
                                
                                {isRecording && (
                                  <div className="bg-red-50 border-2 border-red-500 rounded p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                                      <span className="text-red-700 font-medium">Recording...</span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        if (mediaRecorder && mediaRecorder.state === 'recording') {
                                          mediaRecorder.onstop = async () => {
                                            const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                                            
                                            // Convert blob to base64
                                            const reader = new FileReader();
                                            reader.onload = async () => {
                                              const base64Content = reader.result as string;
                                              const fileName = `Wisdom_${insightType}_Recorded_${Date.now()}.webm`;
                                              
                                              // Store in responses
                                              handleResponseChange(idx, fileName);
                                              
                                              // Save to Databricks Knowledge Base
                                              const success = await handleSaveWisdomToDatabricks(
                                                fileName,
                                                base64Content,
                                                insightType,
                                                'Video',
                                                brand,
                                                projectType
                                              );
                                              
                                              if (success) {
                                                alert('✓ Video wisdom saved to Databricks Knowledge Base!');
                                              }
                                              
                                              // Stop camera
                                              stream.getTracks().forEach(track => track.stop());
                                              setStream(null);
                                              setIsRecording(false);
                                              setMediaRecorder(null);
                                              setRecordedChunks([]);
                                            };
                                            
                                            reader.readAsDataURL(videoBlob);
                                          };
                                          
                                          mediaRecorder.stop();
                                        }
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                                    >
                                      <StopCircle className="w-4 h-4" />
                                      Stop & Save
                                    </button>
                                  </div>
                                )}
                                
                                {!isRecording && (
                                  <button
                                    onClick={() => {
                                      stream.getTracks().forEach(track => track.stop());
                                      setStream(null);
                                      setMediaRecorder(null);
                                      setRecordedChunks([]);
                                      setResponses(prev => ({
                                        ...prev,
                                        [activeStepId]: {
                                          ...prev[activeStepId],
                                          videoMethod: undefined
                                        }
                                      }));
                                    }}
                                    className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {responses[activeStepId]?.[idx] && (
                              <div className="bg-green-50 border border-green-200 rounded p-2">
                                <p className="text-sm text-green-700">
                                  ✓ Saved: {responses[activeStepId][idx]}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // File upload
                      if (inputMethod === 'File') {
                        return (
                          <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>{idx + 1}. Share Your Wisdom</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            
                            <div className="space-y-2">
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                                className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  
                                  const fileName = file.name;
                                  
                                  // Read file content as base64
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                    const base64Content = event.target?.result as string;
                                    
                                    // Store in responses
                                    handleResponseChange(idx, fileName);
                                    
                                    // Save to Databricks Knowledge Base
                                    const wisdomFileName = `Wisdom_${insightType}_File_${fileName}`;
                                    const success = await handleSaveWisdomToDatabricks(
                                      wisdomFileName,
                                      base64Content,
                                      insightType,
                                      'File',
                                      brand,
                                      projectType
                                    );
                                    
                                    if (success) {
                                      alert('✓ File wisdom saved to Databricks Knowledge Base!');
                                    }
                                  };
                                  
                                  reader.onerror = () => {
                                    alert('Failed to read file. Please try again.');
                                  };
                                  
                                  reader.readAsDataURL(file);
                                }}
                              />
                              <p className="text-gray-600 text-xs">
                                Supported formats: PDF, Word, Excel, PowerPoint, Text, CSV
                              </p>
                              {responses[activeStepId]?.[idx] && (
                                <div className="bg-green-50 border border-green-200 rounded p-2">
                                  <p className="text-sm text-green-700">
                                    ✓ Saved: {responses[activeStepId][idx]}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                    }
                  }
                  
                  // Special handling for Enter Brand question (dropdown)
                  if (activeStepId === 'Enter' && idx === 0 && question === 'Brand') {
                    return (
                      <div key={idx} className="mb-2">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-gray-900 whitespace-nowrap">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <select
                            className={`flex-1 border-2 ${showError ? 'border-red-300' : 'border-gray-300'} bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500`}
                            value={responses[activeStepId]?.[idx] || ''}
                            onChange={(e) => handleResponseChange(idx, e.target.value)}
                          >
                            <option value="">-- Select a Brand --</option>
                            {availableBrands.map((brand, brandIdx) => (
                              <option key={brandIdx} value={brand}>
                                {brand}
                              </option>
                            ))}
                          </select>
                        </div>
                        {showError && (
                          <p className="text-red-600 text-sm mt-1">Please select a brand</p>
                        )}
                      </div>
                    );
                  }

                  // Special handling for Enter Project Type question (dropdown)
                  if (activeStepId === 'Enter' && idx === 1 && question === 'Project Type') {
                    return (
                      <div key={idx} className="mb-2">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-gray-900 whitespace-nowrap">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <select
                            className={`flex-1 border-2 ${showError ? 'border-red-300' : 'border-gray-300'} bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500`}
                            value={responses[activeStepId]?.[idx] || ''}
                            onChange={(e) => handleResponseChange(idx, e.target.value)}
                          >
                            <option value="">-- Select a Project Type --</option>
                            {availableProjectTypes.map((type, typeIdx) => (
                              <option key={typeIdx} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        {showError && (
                          <p className="text-red-600 text-sm mt-1">Please select a project type</p>
                        )}
                      </div>
                    );
                  }

                  // Filename for this iteration: Use input with suggested filename pre-filled
                  if (activeStepId === 'Enter' && idx === 2 && question === 'Filename for this iteration') {
                    const brand = responses['Enter']?.[0];
                    const projectType = responses['Enter']?.[1];
                    const currentFileName = responses[activeStepId]?.[idx] || '';
                    
                    // Generate suggested filename with versioning
                    let suggestedFileName = '';
                    if (brand && projectType) {
                      // Generate base filename with date
                      const baseFileName = generateDefaultFileName(brand, projectType);
                      
                      // Check for existing iterations with same base name and add version
                      const matchingFiles = projectFiles.filter(file => 
                        file.brand === brand && 
                        file.projectType === projectType &&
                        file.fileName.startsWith(baseFileName)
                      );
                      
                      if (matchingFiles.length > 0) {
                        // Find highest version number
                        let highestVersion = 0;
                        matchingFiles.forEach(file => {
                          // Check for _v1, _v2, etc. at the end
                          const versionMatch = file.fileName.match(/_v(\d+)$/);
                          if (versionMatch) {
                            const version = parseInt(versionMatch[1], 10);
                            if (version > highestVersion) {
                              highestVersion = version;
                            }
                          } else if (file.fileName === baseFileName) {
                            // File without version number counts as v1
                            highestVersion = Math.max(highestVersion, 1);
                          }
                        });
                        
                        // Increment to next version
                        suggestedFileName = `${baseFileName}_v${highestVersion + 1}`;
                      } else {
                        // No existing files, no version suffix needed
                        suggestedFileName = baseFileName;
                      }
                      
                      // Auto-fill the filename only if field is empty
                      if (suggestedFileName && !currentFileName) {
                        setTimeout(() => {
                          handleResponseChange(idx, suggestedFileName);
                        }, 0);
                      }
                    }
                    
                    return (
                      <div key={idx} className="mb-2">
                        <label className="block text-gray-900 mb-1 flex items-start justify-between">
                          <span>{idx + 1}. {question}</span>
                          {hasResponse && (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          )}
                        </label>
                        <input
                          type="text"
                          className={`w-full border-2 ${showError ? 'border-red-300' : 'border-gray-300'} bg-white rounded p-2 text-gray-700 font-mono focus:outline-none focus:border-blue-500`}
                          value={responses[activeStepId]?.[idx] || suggestedFileName}
                          onChange={(e) => handleResponseChange(idx, e.target.value)}
                          placeholder={suggestedFileName}
                        />
                        <p className="text-gray-600 text-xs mt-1">
                          You can edit this filename or keep the suggested name
                        </p>
                        {showError && (
                          <p className="text-red-600 text-sm mt-1">Please enter a filename</p>
                        )}
                      </div>
                    );
                  }

                  // Special handling for Findings step
                  if (activeStepId === 'Findings') {
                    const brand = responses['Enter']?.[0]?.trim();
                    const projectType = responses['Enter']?.[1]?.trim();
                    const currentFileName = responses['Enter']?.[2]?.trim();
                    const findingsChoice = responses['Findings']?.[0];
                    
                    // Check if any hexes after Enter have been executed
                    const workflowHexes = ['research', 'Luminaries', 'panelist', 'Consumers', 'competitors', 'Colleagues', 'cultural', 'social', 'Grade'];
                    const hasHexExecutions = workflowHexes.some(hexId => {
                      const executions = hexExecutions[hexId];
                      return executions && executions.length > 0;
                    });
                    
                    // Question 1: Save Iteration or Summarize (radio buttons)
                    if (idx === 0 && question === 'Save Iteration or Summarize') {
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="space-y-1">
                            {hasHexExecutions && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="findingsChoice"
                                  value="Save Iteration"
                                  checked={responses[activeStepId]?.[idx] === 'Save Iteration'}
                                  onChange={async (e) => {
                                    handleResponseChange(idx, e.target.value);
                                    // If Save Iteration, save to Databricks and add file to projectFiles
                                    if (e.target.value === 'Save Iteration' && brand && projectType && currentFileName) {
                                      // Save the CURRENT filename (not incremented)
                                      const newFile: ProjectFile = {
                                        brand,
                                        projectType,
                                        fileName: currentFileName,
                                        timestamp: Date.now()
                                      };
                                      
                                      // Save to Databricks user folder
                                      const userFile: UserFile = {
                                        id: Date.now().toString(),
                                        brand,
                                        projectType,
                                        fileName: currentFileName,
                                        timestamp: Date.now(),
                                        fileType: 'Iteration',
                                        content: JSON.stringify({
                                          responses,
                                          hexExecutions,
                                          completedSteps: Array.from(completedSteps)
                                        }),
                                        hexExecutions
                                      };
                                      
                                      const result = await saveToUserFolder(userFile);
                                      
                                      if (result.success) {
                                        console.log('✅ Iteration saved to Databricks user folder:', currentFileName);
                                        
                                        // Also keep in localStorage for local reference
                                        const updatedFiles = [...projectFiles, newFile];
                                        setProjectFiles(updatedFiles);
                                        localStorage.setItem('cohive_projects', JSON.stringify(updatedFiles));
                                        
                                        // Mark iteration as saved
                                        setIterationSaved(true);
                                        localStorage.setItem('cohive_iteration_saved', 'true');
                                      } else {
                                        alert(`Failed to save to Databricks: ${result.error || 'Unknown error'}`);
                                      }
                                    }
                                  }}
                                  className="w-4 h-4"
                                />
                                <span className="text-gray-700">Save Iteration</span>
                              </label>
                            )}
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="findingsChoice"
                                value="Summarize"
                                checked={responses[activeStepId]?.[idx] === 'Summarize'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Summarize</span>
                            </label>
                          </div>
                          {findingsChoice === 'Save Iteration' && currentFileName && (
                            <p className="text-green-600 text-sm mt-2">
                              ✓ File saved to Databricks user folder: {currentFileName}
                            </p>
                          )}
                          {!hasHexExecutions && findingsChoice !== 'Summarize' && (
                            <p className="text-amber-600 text-sm mt-2">
                              ℹ️ Save Iteration requires at least one workflow hex to be executed. Only Summarize is available.
                            </p>
                          )}
                        </div>
                      );
                    }
                    
                    // ONLY show remaining questions/details AFTER "Summarize" is selected
                    // This ensures Save Iteration and Summarize are shown first, then details appear
                    if (findingsChoice !== 'Summarize') {
                      return null;
                    }
                    
                    // Show suggested summary filename when Summarize is selected (replaces question 1)
                    if (findingsChoice === 'Summarize' && idx === 1 && question === 'Which files should we include in our findings?' && currentFileName) {
                      const suggestedSummaryName = getSummaryFileName(currentFileName);
                      
                      return (
                        <div key={idx}>
                          <div className="mb-2">
                            <label className="block text-gray-900 mb-1">
                              Suggested Summary Filename
                            </label>
                            <input
                              type="text"
                              className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                              value={responses[activeStepId]?.[`summaryFileName`] || suggestedSummaryName}
                              onChange={(e) => {
                                setResponses(prev => ({
                                  ...prev,
                                  [activeStepId]: {
                                    ...prev[activeStepId],
                                    summaryFileName: e.target.value,
                                    [3]: '' // Clear "Save or Download" selection when filename changes
                                  }
                                }));
                              }}
                              placeholder="Enter summary filename..."
                            />
                            <p className="text-sm text-gray-500 mt-1">
                              You can edit this filename or keep the suggested name
                            </p>
                          </div>
                          {/* Render the actual question */}
                          {(() => {
                            const matchingFiles = projectFiles
                              .filter(file => file.brand === brand && file.projectType === projectType)
                              .sort((a, b) => b.timestamp - a.timestamp); // Sort by date, most recent first
                            const selectedFiles = responses[activeStepId]?.[idx]?.split(',').filter(Boolean) || [];
                            
                            return (
                              <div className="mb-2">
                                <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                  <span>{idx + 1}. {question}</span>
                                  {responses[activeStepId]?.[idx]?.trim().length > 0 && (
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                  )}
                                </label>
                                <div className="border-2 border-gray-300 rounded p-2 bg-white max-h-40 overflow-y-auto">
                                  {matchingFiles.length > 0 ? (
                                    matchingFiles.map((file, fileIdx) => (
                                      <label key={fileIdx} className="flex items-center gap-2 cursor-pointer py-1">
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
                                          className="w-4 h-4"
                                        />
                                        <span className="text-gray-700">
                                          {file.fileName} ({new Date(file.timestamp).toLocaleDateString()})
                                        </span>
                                      </label>
                                    ))
                                  ) : (
                                    <p className="text-gray-500 text-sm">No files found for {brand} - {projectType}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    }
                    
                    // Question 2: Which files should we include in our findings?
                    if (idx === 1 && question === 'Which files should we include in our findings?') {
                      const matchingFiles = projectFiles
                        .filter(file => file.brand === brand && file.projectType === projectType)
                        .sort((a, b) => b.timestamp - a.timestamp); // Sort by date, most recent first
                      const selectedFiles = responses[activeStepId]?.[idx]?.split(',').filter(Boolean) || [];
                      
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="border-2 border-gray-300 rounded p-2 bg-white max-h-40 overflow-y-auto">
                            {matchingFiles.length > 0 ? (
                              matchingFiles.map((file, fileIdx) => (
                                <label key={fileIdx} className="flex items-center gap-2 cursor-pointer py-1">
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
                                    className="w-4 h-4 flex-shrink-0"
                                  />
                                  <span className="text-gray-700">
                                    {file.fileName} ({new Date(file.timestamp).toLocaleDateString()})
                                  </span>
                                </label>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">No files found for {brand} - {projectType}</p>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    // Question 3: Output Options (checkboxes)
                    if (idx === 2 && question === 'Output Options') {
                      const selectedOptions = responses[activeStepId]?.[idx]?.split(',').filter(Boolean) || [];
                      const options = [
                        'Executive Summary',
                        'Share all Ideas as a list',
                        'Provide a grid with all "final" ideas with their scores',
                        'Include Gems',
                        'Include User Notes from all iterations as an Appendix'
                      ];
                      
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="space-y-1">
                            {options.map((option, optIdx) => (
                              <label key={optIdx} className="flex items-center gap-2 cursor-pointer">
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
                                  className="w-4 h-4 flex-shrink-0"
                                />
                                <span className="text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    
                    // Question 4: Save or Download (radio buttons)
                    if (idx === 3 && question === 'Save or Download') {
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="saveOrDownload"
                                value="Save"
                                checked={responses[activeStepId]?.[idx] === 'Save'}
                                onChange={async (e) => {
                                  handleResponseChange(idx, e.target.value);
                                  // Save the summary file to Databricks user folder
                                  if (e.target.value === 'Save' && brand && projectType) {
                                    const summaryFileName = responses[activeStepId]?.['summaryFileName'] || getSummaryFileName(currentFileName || '');
                                    if (summaryFileName) {
                                      // Save to Databricks
                                      const userFile: UserFile = {
                                        id: Date.now().toString(),
                                        brand,
                                        projectType,
                                        fileName: summaryFileName,
                                        timestamp: Date.now(),
                                        fileType: 'Summary',
                                        content: JSON.stringify({
                                          responses,
                                          selectedFiles: responses[activeStepId]?.[1]?.split(',').filter(Boolean) || [],
                                          outputOptions: responses[activeStepId]?.[2]?.split(',').filter(Boolean) || [],
                                          hexExecutions,
                                          completedSteps: Array.from(completedSteps)
                                        }),
                                        hexExecutions
                                      };
                                      
                                      const result = await saveToUserFolder(userFile);
                                      
                                      if (result.success) {
                                        console.log('✅ Summary saved to Databricks user folder:', summaryFileName);
                                        
                                        // Also keep in localStorage for local reference
                                        const newFile: ProjectFile = {
                                          brand,
                                          projectType,
                                          fileName: summaryFileName,
                                          timestamp: Date.now()
                                        };
                                        const updatedFiles = [...projectFiles, newFile];
                                        setProjectFiles(updatedFiles);
                                        localStorage.setItem('cohive_projects', JSON.stringify(updatedFiles));
                                        
                                        alert('✅ Summary saved to Databricks user folder!');
                                        
                                        // Clear the radio button selection so it can be used again
                                        handleResponseChange(idx, '');
                                      } else {
                                        alert(`Failed to save to Databricks: ${result.error || 'Unknown error'}`);
                                        // Clear the radio button on error too
                                        handleResponseChange(idx, '');
                                      }
                                    }
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Save to Databricks</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="saveOrDownload"
                                value="Download"
                                checked={responses[activeStepId]?.[idx] === 'Download'}
                                onChange={(e) => {
                                  handleResponseChange(idx, e.target.value);
                                  // Download the summary file to user's computer
                                  if (e.target.value === 'Download' && brand && projectType) {
                                    const summaryFileName = responses[activeStepId]?.['summaryFileName'] || getSummaryFileName(currentFileName || '');
                                    if (summaryFileName) {
                                      const summaryData = {
                                        brand,
                                        projectType,
                                        fileName: summaryFileName,
                                        timestamp: Date.now(),
                                        responses,
                                        selectedFiles: responses[activeStepId]?.[1]?.split(',').filter(Boolean) || [],
                                        outputOptions: responses[activeStepId]?.[2]?.split(',').filter(Boolean) || [],
                                        hexExecutions,
                                        completedSteps: Array.from(completedSteps)
                                      };
                                      
                                      downloadFile(
                                        summaryFileName.endsWith('.json') ? summaryFileName : `${summaryFileName}.json`,
                                        JSON.stringify(summaryData, null, 2),
                                        'application/json'
                                      );
                                      
                                      alert('✅ Summary downloaded to your computer!');
                                      
                                      // Clear the radio button selection so it can be used again
                                      handleResponseChange(idx, '');
                                    }
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Download to Computer</span>
                            </label>
                          </div>
                        </div>
                      );
                    }
                  }
                  
                  // Default textarea for all other questions
                  return (
                    <div key={idx} className="mb-2">
                      <label className="block text-gray-900 mb-1 flex items-start justify-between">
                        <span>
                          {idx + 1}. {question}
                        </span>
                        {hasResponse && (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </label>
                      <textarea 
                        className={`w-full h-20 border-2 ${showError ? 'border-red-300' : 'border-gray-300'} bg-white rounded p-2 text-gray-700 resize-none focus:outline-none focus:border-blue-500`}
                        placeholder="Enter your response..."
                        value={responses[activeStepId]?.[idx] || ''}
                        onChange={(e) => handleResponseChange(idx, e.target.value)}
                      />
                      {showError && (
                        <p className="text-red-600 text-sm mt-1">This question is required</p>
                      )}
                    </div>
                  );
                })
              )}
              </div>
            </div>
          </div>

          {/* User Notes Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4" style={{ height: '650px' }}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-gray-600" />
                <h3 className="text-gray-900">User Notes</h3>
              </div>
              <textarea 
                className="w-full border-2 border-gray-300 bg-gray-50 rounded p-2 text-sm resize-none"
                style={{ height: 'calc(650px - 80px)' }}
                placeholder="Add notes to be saved with each iteration..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}