/* Researcher Modes.tsx */

import { useState, useEffect } from 'react';
import { DatabricksFileBrowser } from './DatabricksFileBrowser';
import { uploadToKnowledgeBase, approveKnowledgeBaseFile, deleteKnowledgeBaseFile, updateKnowledgeBaseMetadata, listKnowledgeBaseFiles, readKnowledgeBaseFile, processKnowledgeBaseFile, fetchCustomPersonas, saveCustomPersona, deleteCustomPersona, type KnowledgeBaseFile, type CustomPersona } from '../utils/databricksAPI';
import { executeAIPrompt, runAIAgent } from '../utils/databricksAI';
import { isAuthenticated, getCurrentUserEmail, getValidSession } from '../utils/databricksAuth';
import { Upload, CircleCheck, Trash2, Edit, Bot, Sparkles, X, Loader, FileText, Download, Save, RefreshCw, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import gemIcon from 'figma:asset/53dc6cf554f69e479cfbd60a46741f158d11dd21.png';
import { SpinHex } from './LoadingGem';

interface ResearchFile {
  id: string;
  brand: string;
  projectType: string;
  fileName: string;
  isApproved: boolean;
  uploadDate: number;
  fileType: string;
  content?: string;
  source?: string;
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
  canManageExamples?: boolean;
  onCreateResearchFile: (file: Omit<ResearchFile, 'id' | 'uploadDate'>) => void;
  onToggleApproval: (fileId: string) => void;
  onUpdateResearchFile?: (fileId: string, content: string) => void;
  onUpdateSuggestionStatus?: (suggestionId: string, status: 'pending' | 'reviewed' | 'implemented') => void;
  availableBrands?: string[];
  availableProjectTypes?: string[];
  projectTypeConfigs?: Array<{ projectType: string; prompt: string; createdBy: string; createdDate: number }>;
  onAddBrand?: (brand: string) => void;
  onAddProjectType?: (projectType: string) => void;
  onAddProjectTypeWithPrompt?: (projectType: string, prompt: string) => Promise<void>;
  userRole?: 'administrator' | 'research-analyst' | 'research-leader' | 'data-scientist' | 'marketing-manager' | 'product-manager' | 'executive-stakeholder';
  onModeChange?: (mode: string | null) => void;
  onFileOpen?: (fileName: string | null) => void;
  onPendingCountChange?: (count: number) => void;
  processingModelEndpoint?: string;
  onRefreshFiles?: () => void;
  onLoadingChange?: (loading: boolean, message?: string) => void;
}

const centralHexagons = [
  { id: 'Luminaries', label: 'Luminaries', color: 'bg-teal-100', borderColor: 'border-teal-300' },
  { id: 'stories', label: 'Stories', color: 'bg-cyan-100', borderColor: 'border-cyan-300' },
  { id: 'Consumers', label: 'Consumers', color: 'bg-sky-100', borderColor: 'border-sky-300' },
  { id: 'competitors', label: 'Competitors', color: 'bg-indigo-100', borderColor: 'border-indigo-300' },
  { id: 'Colleagues', label: 'Colleagues', color: 'bg-violet-100', borderColor: 'border-violet-300' },
  { id: 'cultural', label: 'Cultural Voices', color: 'bg-purple-100', borderColor: 'border-purple-300' },
  { id: 'social', label: 'Social Listening', color: 'bg-fuchsia-100', borderColor: 'border-fuchsia-300' },
  { id: 'Grade', label: 'Score Results', color: 'bg-pink-100', borderColor: 'border-pink-300' }
];

// ── File classification helpers ───────────────────────────────────────────────

const isTxtFile = (f: KnowledgeBaseFile) => f.fileName.endsWith('_txt.txt');

// A file is considered "processed" if:
//   - cleaning_status === 'processed' (new column, once ALTER TABLE runs), OR
const isProcessed = (f: KnowledgeBaseFile) => f.cleaningStatus === 'processed';

// Pending Processing: original files (not _txt) with no processing signal
const filterUnprocessed = (files: KnowledgeBaseFile[]) =>
  files.filter(f =>
    f.fileType !== 'Findings' &&
    !isTxtFile(f) &&
    (f.isApproved === null || f.isApproved === false) &&
    !isProcessed(f)
  );

// Pending Approval: original files (not _txt) that have been processed
const filterPendingApproval = (files: KnowledgeBaseFile[]) =>
  files.filter(f =>
    f.fileType !== 'Findings' &&
    !isTxtFile(f) &&
    f.isApproved === false &&
    isProcessed(f)
  );

// For a list of files, find the _txt companion of a given original.
// Primary match: fileId === original.fileId + '_txt'
// Fallback match: fileName === original baseName + '_txt.txt'
const findTxtCompanion = (original: KnowledgeBaseFile, allFiles: KnowledgeBaseFile[]): KnowledgeBaseFile | null => {
  // Primary: exact fileId match
  const byId = allFiles.find(f => f.fileId === original.fileId + '_txt');
  if (byId) return byId;
  // Fallback: match by derived file name (handles edge cases where _txt was
  // created with a slightly different fileId convention)
  const baseName = original.fileName.replace(/\.[^/.]+$/, '');
  const expectedTxtName = baseName + '_txt.txt';
  return allFiles.find(f => f.fileName === expectedTxtName) || null;
};

interface AIResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  meta?: string;
}


function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      nodes.push(<h2 key={i} className="text-lg font-bold text-gray-900 mt-5 mb-2 pb-1 border-b border-gray-200">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      nodes.push(<h3 key={i} className="text-base font-semibold text-gray-800 mt-4 mb-1">{line.slice(4)}</h3>);
    } else if (line.trim() === '---') {
      nodes.push(<hr key={i} className="my-3 border-gray-200" />);
    } else if (line.trim() === '') {
      nodes.push(<div key={i} className="h-2" />);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2)); i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2 ml-2">{items.map((item, j) => <li key={j} className="text-sm text-gray-700">{inlineFormat(item)}</li>)}</ul>);
      continue;
    } else {
      nodes.push(<p key={i} className="text-sm text-gray-700 leading-relaxed my-1">{inlineFormat(line)}</p>);
    }
    i++;
  }
  return nodes;
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\[Source:[^\]]+\]|\[General Knowledge\]|\[COLLABORATION COMPLETE\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    if (part.startsWith('[Source:')) return <span key={i} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 mx-0.5 font-mono">📎 {part.slice(1, -1)}</span>;
    if (part === '[General Knowledge]') return <span key={i} className="inline-flex items-center text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 mx-0.5">🌐 General Knowledge</span>;
    if (part === '[COLLABORATION COMPLETE]') return <span key={i} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5 mx-0.5 font-semibold">✅ Collaboration Complete</span>;
    return <span key={i}>{part}</span>;
  });
}

function downloadAsMarkdown(title: string, content: string) {
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const markdown = `# ${title}\n_${date}_\n\n---\n\n${content}`;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_').slice(0, 60)}_${Date.now()}.md`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function AIResponseModal({ isOpen, onClose, title, content, meta }: AIResponseModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-y-0 left-0 z-50 flex items-center justify-center" style={{ right: 'var(--modal-r)', padding: 'var(--modal-p)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-3xl" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-600" />{title}</h2>
            {meta && <p className="text-xs text-gray-500 mt-0.5">{meta}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadAsMarkdown(title, content)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Download className="w-4 h-4" />Download</button>
            <button onClick={onClose} aria-label="Close" className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{renderMarkdown(content)}</div>
        <div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl flex-shrink-0">
          <button onClick={() => downloadAsMarkdown(title, content)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Download className="w-4 h-4" />Download Markdown</button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

export function ResearcherModes({
  brand, projectType, researchFiles, editSuggestions = [], canApproveResearch, canManageExamples = false,
  onCreateResearchFile, onToggleApproval, onUpdateResearchFile, onUpdateSuggestionStatus,
  availableBrands = [], availableProjectTypes = [], projectTypeConfigs = [],
  onAddBrand, onAddProjectType, onAddProjectTypeWithPrompt,
  userRole = 'marketing-manager', onModeChange, onFileOpen, onPendingCountChange,
  processingModelEndpoint, onRefreshFiles, onLoadingChange,
}: ResearcherModesProps) {

  const [mode, setMode] = useState<'synthesis' | 'personas' | 'read-edit-approve' | 'workspace' | 'custom-prompt' | null>(() => {
    const saved = localStorage.getItem('cohive_research_mode');
    return saved as 'synthesis' | 'personas' | 'read-edit-approve' | 'workspace' | 'custom-prompt' | null;
  });

  const handleModeChange = (newMode: typeof mode) => { setMode(newMode); onModeChange?.(newMode); };

  const [userEmail, setUserEmail] = useState('unknown@databricks.com');
  const [aiModal, setAiModal] = useState<{ isOpen: boolean; title: string; content: string; meta?: string }>({ isOpen: false, title: '', content: '' });
  const openAiModal = (title: string, content: string, meta?: string) => setAiModal({ isOpen: true, title, content, meta });
  const closeAiModal = () => setAiModal(prev => ({ ...prev, isOpen: false }));

  const [synthesisOption, setSynthesisOption] = useState<'new-synthesis' | 'add-studies' | 'new-brand' | 'new-project-type' | 'edit-existing' | 'review-edits' | null>(null);
  const [synthesisResponses, setSynthesisResponses] = useState<{ [key: string]: string }>({});
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedProjectType, setSelectedProjectType] = useState('');
  const [selectedDatabricksFiles, setSelectedDatabricksFiles] = useState<ResearchFile[]>([]);
  const [showDatabricksBrowser, setShowDatabricksBrowser] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newProjectType, setNewProjectType] = useState('');
  const [newProjectTypePrompt, setNewProjectTypePrompt] = useState('');
  const [ptTask, setPtTask] = useState('');
  const [ptWhatItIs, setPtWhatItIs] = useState('');
  const [ptWhatItIsNot, setPtWhatItIsNot] = useState('');
  const [ptHowItWorks, setPtHowItWorks] = useState('');
  const [ptFocusAreas, setPtFocusAreas] = useState('');
  const [ptScoring, setPtScoring] = useState('');
  const [ptOutputFormat, setPtOutputFormat] = useState('');
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingFile, setEditingFile] = useState<ResearchFile | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [selectedHexagon, setSelectedHexagon] = useState<string | null>(null);
  const [personaFileForm, setPersonaFileForm] = useState({ brandScope: 'single' as 'single' | 'category' | 'all', brandName: brand, categoryName: '', fileName: '', fileType: '' });

  // Custom personas state
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
  const [customPersonasLoading, setCustomPersonasLoading] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<CustomPersona | null>(null);
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [personaForm, setPersonaForm] = useState({
    name: '',
    background: '',
    tone: '',
    style: '',
    praises: '',
    dislikes: '',
    alwaysAsks: '',
    reactsToIdeas: '',
    scoringLens: '',
    hexIds: 'any',
  });

  const [selectedFile, setSelectedFile] = useState<ResearchFile | null>(null);
  const [editContent, setEditContent] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'synthesis' | 'personas'>('all');
  const [isLoadingFileContent, setIsLoadingFileContent] = useState(false);
  const [fileLoadError, setFileLoadError] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

  // All unapproved files (used for grouping — includes _txt files)
  const [allPendingFiles, setAllPendingFiles] = useState<KnowledgeBaseFile[]>([]);
  const [pendingKBFiles, setPendingKBFiles] = useState<KnowledgeBaseFile[]>([]);
  const [pendingApprovalFiles, setPendingApprovalFiles] = useState<KnowledgeBaseFile[]>([]);
  // Track which original files have their _txt row expanded
  const [expandedPairIds, setExpandedPairIds] = useState<Set<string>>(new Set());

  const [selectedKBFiles, setSelectedKBFiles] = useState<Set<string>>(new Set());
  const [selectedApprovalFiles, setSelectedApprovalFiles] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApprovalDeleting, setIsApprovalDeleting] = useState(false);
  const [isBulkActioning, setIsBulkActioning] = useState(false);
  const [selectedProcessedFiles, setSelectedProcessedFiles] = useState<Set<string>>(new Set());

  const toggleProcessedFileSelection = (fileId: string) => {
    setSelectedProcessedFiles(prev => {
      const next = new Set(prev);
      next.has(fileId) ? next.delete(fileId) : next.add(fileId);
      return next;
    });
  };
  const [processingStatus, setProcessingStatus] = useState<{ [fileId: string]: 'pending' | 'processing' | 'success' | 'error' }>({});

  const [previewFile, setPreviewFile] = useState<KnowledgeBaseFile | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [editedKBFileName, setEditedKBFileName] = useState('');
  const [editedKBContent, setEditedKBContent] = useState('');
  const [editedKBSummary, setEditedKBSummary] = useState('');
  const [editedKBTags, setEditedKBTags] = useState('');
  const [editedKBBrand, setEditedKBBrand] = useState('');
  const [editedKBProjectType, setEditedKBProjectType] = useState('');
  const [editedKBFileType, setEditedKBFileType] = useState('Synthesis');
  const [editedKBIsExample, setEditedKBIsExample] = useState(false);
  const [editedKBMonth, setEditedKBMonth] = useState<string>('');
  const [editedKBYear, setEditedKBYear] = useState<string>('');
  const [isSavingKBChanges, setIsSavingKBChanges] = useState(false);


  interface SavedCustomPrompt { id: string; name: string; prompt: string; createdAt: number; updatedAt: number; }
  const loadSavedPrompts = (): SavedCustomPrompt[] => { try { const raw = localStorage.getItem(`cohive_custom_prompts_${userEmail}`); return raw ? JSON.parse(raw) : []; } catch { return []; } };
  const [savedPrompts, setSavedPrompts] = useState<SavedCustomPrompt[]>([]);
  const [cpView, setCpView] = useState<'list' | 'create' | 'edit' | 'run'>('list');
  const [cpActivePrompt, setCpActivePrompt] = useState<SavedCustomPrompt | null>(null);
  const [cpPromptName, setCpPromptName] = useState('');
  const [cpPromptText, setCpPromptText] = useState('');
  const [cpRunInput, setCpRunInput] = useState('');
  const [cpSelectedFiles, setCpSelectedFiles] = useState<string[]>([]);
  const [cpIsRunning, setCpIsRunning] = useState(false);
  const [cpResult, setCpResult] = useState<string | null>(null);
  const [cpError, setCpError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserEmail = async () => {
      if (isAuthenticated()) { try { setUserEmail(await getCurrentUserEmail()); } catch { setUserEmail('unknown@databricks.com'); } }
    };
    fetchUserEmail();
  }, []);

  useEffect(() => { if (userEmail && userEmail !== 'unknown@databricks.com') setSavedPrompts(loadSavedPrompts()); }, [userEmail]);
  useEffect(() => { if (mode) localStorage.setItem('cohive_research_mode', mode); else localStorage.removeItem('cohive_research_mode'); }, [mode]);

  useEffect(() => {
    if (mode === 'personas') {
      setCustomPersonasLoading(true);
      fetchCustomPersonas().then(p => { setCustomPersonas(p); setCustomPersonasLoading(false); });
    }
  }, [mode]);
  useEffect(() => { if (selectedFile) { const u = researchFiles.find(f => f.id === selectedFile.id); if (u) setSelectedFile(u); } }, [researchFiles]);

  const updatePendingQueues = (allUnapproved: KnowledgeBaseFile[]) => {
    setAllPendingFiles(allUnapproved);
    const unprocessed = filterUnprocessed(allUnapproved);
    const pendingApproval = filterPendingApproval(allUnapproved);
    setPendingKBFiles(unprocessed);
    setPendingApprovalFiles(pendingApproval);
    // Auto-expand all pairs that have a _txt companion so user sees them without needing to click chevron
    const autoExpand = new Set(pendingApproval.map(f => f.fileId).filter(id => allUnapproved.some(f => f.fileId === id + '_txt')));
    setExpandedPairIds(autoExpand);
    onPendingCountChange?.(unprocessed.length + pendingApproval.length);
    console.log("[KB Queues] All unapproved (" + allUnapproved.length + "):", allUnapproved.map(f => ({ id: f.fileId, name: f.fileName, cs: f.cleaningStatus, sum: !!f.contentSummary })));
    console.log("[KB Queues] Unprocessed:", unprocessed.length, "| Pending approval:", pendingApproval.length);
  };

  const [isLoadingQueues, setIsLoadingQueues] = useState(false);

  const refreshPendingQueues = async () => {
    setIsLoadingQueues(true);
    try {
      // Force fresh fetch — avoids Vercel edge cache returning stale data after delete/approve
      const files = await listKnowledgeBaseFiles({ isApproved: false, sortBy: 'upload_date', sortOrder: 'DESC', limit: 200 });
      // Always create new array references so React triggers re-render
      updatePendingQueues([...files]);
    } finally {
      setIsLoadingQueues(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewFile(null); setPreviewContent(''); setEditedKBContent('');
    setEditedKBFileName(''); setEditedKBSummary(''); setEditedKBTags('');
    setEditedKBBrand(''); setEditedKBProjectType(''); setEditedKBFileType('Synthesis');
    setEditedKBIsExample(false); setEditedKBMonth(''); setEditedKBYear('');
    onFileOpen?.(null);
  };

  useEffect(() => {
    const load = async () => {
      const session = await getValidSession();
      if (mode === 'read-edit-approve' && session) {
        setIsLoadingQueues(true);
        try {
          const files = await listKnowledgeBaseFiles({ isApproved: false, sortBy: 'upload_date', sortOrder: 'DESC', limit: 200 });
          updatePendingQueues(files);
          console.log(`✅ Loaded: ${filterUnprocessed(files).length} unprocessed, ${filterPendingApproval(files).length} pending approval`);
        } catch (e) { console.error('Failed to load pending KB files:', e); }
        finally { setIsLoadingQueues(false); }
      }
    };
    load();
  }, [mode]);

  const generateDefaultFileName = (b: string, pt: string) => {
    const d = new Date().toISOString().split('T')[0];
    const c = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');
    return `${c(b) || 'Brand'}_${c(pt === 'Grade' ? 'Score' : pt) || 'ProjectType'}_${d}`;
  };

  const handleEditApprovedFile = async (file: ResearchFile) => {
    const kbFile: KnowledgeBaseFile = {
      fileId: file.id, fileName: file.fileName, filePath: file.source || '',
      scope: (file.scope as any) || 'brand', brand: file.brand, projectType: file.projectType,
      fileType: file.fileType as any, isApproved: file.isApproved,
      uploadDate: new Date(file.uploadDate).toISOString(), uploadedBy: '',
      tags: [], citationCount: 0, gemInclusionCount: 0, fileSizeBytes: 0,
      createdAt: new Date(file.uploadDate).toISOString(), updatedAt: new Date(file.uploadDate).toISOString(),
    };
    await handlePreviewKBFile(kbFile);
  };

  const handleRenameFile = async (fileId: string, newName: string) => {
    if (!newName.trim()) return;
    setIsSavingRename(true);
    try {
      const r = await updateKnowledgeBaseMetadata(fileId, { fileName: newName.trim() }, userEmail, userRole);
      if (!r.success) throw new Error(r.error || 'Rename failed');
      setRenamingFileId(null); setRenameValue('');
      onRefreshFiles?.();
    } catch (e) { alert(`❌ Rename failed: ${e instanceof Error ? e.message : 'Unknown'}`); }
    finally { setIsSavingRename(false); }
  };

  const handleSelectFile = async (file: ResearchFile) => {
    setSelectedFile(file); setEditContent(''); setFileLoadError(null); onFileOpen?.(file.fileName);
    if (file.content) { setEditContent(file.content); return; }
    setIsLoadingFileContent(true);
    try {
      const r = await readKnowledgeBaseFile(file.id);
      if (r.success && r.content) setEditContent(r.content); else setFileLoadError(r.error || 'Could not load.');
    } catch (e) { setFileLoadError(e instanceof Error ? e.message : 'Unknown error'); }
    finally { setIsLoadingFileContent(false); }
  };

  const getPersonaFiles = (hexId: string) => researchFiles.filter(f => f.fileType === hexId);
  const toggleKBFileSelection = (fileId: string) => setSelectedKBFiles(prev => { const s = new Set(prev); if (s.has(fileId)) s.delete(fileId); else s.add(fileId); return s; });
  const toggleApprovalFileSelection = (fileId: string) => setSelectedApprovalFiles(prev => { const s = new Set(prev); if (s.has(fileId)) s.delete(fileId); else s.add(fileId); return s; });
  const togglePairExpand = (fileId: string) => setExpandedPairIds(prev => { const s = new Set(prev); if (s.has(fileId)) s.delete(fileId); else s.add(fileId); return s; });

  const handleDeleteSelectedFiles = async () => {
    if (selectedKBFiles.size === 0) return;
    const count = selectedKBFiles.size;
    const confirmed = confirm(`Delete ${count} selected file${count !== 1 ? 's' : ''}? This cannot be undone.`);
    if (!confirmed) return;
    const selectedArray = Array.from(selectedKBFiles);
    let ok = 0; let fail = 0;
    setIsDeleting(true);
    try {
      for (const fileId of selectedArray) {
        try {
          const r = await deleteKnowledgeBaseFile(fileId, userEmail, 'research-leader');
          if (r.success) ok++;
          else fail++;
        } catch { fail++; }
      }
      setSelectedKBFiles(new Set());
      await refreshPendingQueues();
    } finally {
      setIsDeleting(false);
    }
    alert(ok > 0
      ? `✅ ${ok} file${ok !== 1 ? 's' : ''} deleted${fail > 0 ? `\n❌ ${fail} failed` : ''}`
      : `❌ Failed to delete files`
    );
  };

  const handleDeleteSelectedApprovalFiles = async () => {
    if (selectedApprovalFiles.size === 0) return;
    const count = selectedApprovalFiles.size;
    const confirmed = confirm(`Delete ${count} selected file${count !== 1 ? 's' : ''} and their processed versions? This cannot be undone.`);
    if (!confirmed) return;
    const selectedArray = Array.from(selectedApprovalFiles);
    let ok = 0; let fail = 0;
    setIsApprovalDeleting(true);
    try {
      for (const fileId of selectedArray) {
        try {
          // Delete the original file
          const r = await deleteKnowledgeBaseFile(fileId, userEmail, 'research-leader');
          if (r.success) {
            ok++;
            // Also delete the _txt companion if it exists
            const txtFile = allPendingFiles.find(f => f.fileId === fileId + '_txt');
            if (txtFile) {
              await deleteKnowledgeBaseFile(txtFile.fileId, userEmail, 'research-leader').catch(() => {});
            }
          } else fail++;
        } catch { fail++; }
      }
      setSelectedApprovalFiles(new Set());
      await refreshPendingQueues();
    } finally {
      setIsApprovalDeleting(false);
    }
    alert(ok > 0
      ? `✅ ${ok} file${ok !== 1 ? 's' : ''} deleted${fail > 0 ? `\n❌ ${fail} failed` : ''}`
      : `❌ Failed to delete files`
    );
  };

  const handleBulkApproveProcessed = async (approve: boolean) => {
    if (selectedProcessedFiles.size === 0) return;
    const label = approve ? 'approve' : 'unapprove';
    const confirmed = confirm(`${approve ? 'Approve' : 'Unapprove'} ${selectedProcessedFiles.size} selected file${selectedProcessedFiles.size !== 1 ? 's' : ''}?`);
    if (!confirmed) return;
    setIsBulkActioning(true);
    let ok = 0; let fail = 0;
    try {
      for (const fileId of Array.from(selectedProcessedFiles)) {
        try {
          if (onToggleApproval) {
            // Pass forceValue so per-file toggle doesn't flip files already in target state
            await onToggleApproval(fileId, approve);
            ok++;
          }
        } catch { fail++; }
      }
      setSelectedProcessedFiles(new Set());
      // Refresh once after all files are done rather than once per file
      await refreshPendingQueues();
      if (onRefreshFiles) await onRefreshFiles();
    } finally {
      setIsBulkActioning(false);
    }
    alert(ok > 0
      ? `✅ ${ok} file${ok !== 1 ? 's' : ''} ${label}d${fail > 0 ? `\n❌ ${fail} failed` : ''}`
      : `❌ Failed to ${label} files`
    );
  };

  const handleBulkDeleteProcessed = async () => {
    if (selectedProcessedFiles.size === 0) return;
    const count = selectedProcessedFiles.size;
    const confirmed = confirm(`Delete ${count} selected file${count !== 1 ? 's' : ''}? This cannot be undone.`);
    if (!confirmed) return;
    setIsBulkActioning(true);
    let ok = 0; let fail = 0;
    try {
      for (const fileId of Array.from(selectedProcessedFiles)) {
        try {
          const r = await deleteKnowledgeBaseFile(fileId, userEmail, 'research-leader');
          if (r.success) ok++;
          else fail++;
        } catch { fail++; }
      }
      setSelectedProcessedFiles(new Set());
      await refreshPendingQueues();
      if (onRefreshFiles) await onRefreshFiles();
    } finally {
      setIsBulkActioning(false);
    }
    alert(ok > 0
      ? `✅ ${ok} file${ok !== 1 ? 's' : ''} deleted${fail > 0 ? `\n❌ ${fail} failed` : ''}`
      : `❌ Failed to delete files`
    );
  };

  const handleProcessSelectedFiles = async () => {
    if (selectedKBFiles.size === 0) { alert('Please select at least one file to process'); return; }
    if (!processingModelEndpoint) { alert('No model configured.\n\nPlease open Model Templates and assign a model to Knowledge Base → Synthesis.'); return; }

    setIsProcessing(true);
    const selectedArray = Array.from(selectedKBFiles);
    const init: { [id: string]: 'pending' | 'processing' | 'success' | 'error' } = {};
    selectedArray.forEach(id => { init[id] = 'pending'; });
    setProcessingStatus(init);
    onLoadingChange?.(true, `Processing 1 of ${selectedArray.length}…`);

    type ProcessedEntry = { fileId: string; txtFileId: string; fileName: string; brand: string; projectType: string; month: string; year: string; };
    const metadataEntries: ProcessedEntry[] = [];
    let doneCount = 0;

    try {
      const processFile = async (fileId: string) => {
        setProcessingStatus(prev => ({ ...prev, [fileId]: 'processing' }));
        const result = await processKnowledgeBaseFile(fileId, processingModelEndpoint, availableBrands, availableProjectTypes);
        doneCount++;
        onLoadingChange?.(true, `Processing ${doneCount} of ${selectedArray.length}: ${result.fileName || fileId}`);
        if (result.success) {
          setProcessingStatus(prev => ({ ...prev, [fileId]: 'success' }));
          metadataEntries.push({
            fileId,
            txtFileId: result.txtFileId || (fileId + '_txt'),
            fileName: result.fileName || fileId,
            brand: result.suggestedBrand || '',
            projectType: (result.suggestedProjectTypes || [])[0] || '',
            month: result.suggestedMonth ? String(result.suggestedMonth) : '',
            year: result.suggestedYear ? String(result.suggestedYear) : '',
          });
        } else {
          setProcessingStatus(prev => ({ ...prev, [fileId]: 'error' }));
          console.error(`Failed to process ${fileId}:`, result.error);
        }
      };

      if (selectedArray.length > 10) {
        for (let i = 0; i < selectedArray.length; i += 3) await Promise.all(selectedArray.slice(i, i + 3).map(processFile));
      } else {
        for (const id of selectedArray) await processFile(id);
      }

      // Auto-save AI-suggested metadata so reviewers see pre-filled fields
      for (const entry of metadataEntries) {
        try {
          const metaUpdate: Parameters<typeof updateKnowledgeBaseMetadata>[1] = { fileType: 'Synthesis' };
          if (entry.brand) metaUpdate.brand = entry.brand;
          if (entry.projectType) metaUpdate.projectType = entry.projectType;
          if (entry.month) metaUpdate.contentMonth = parseInt(entry.month);
          if (entry.year) metaUpdate.contentYear = parseInt(entry.year);
          await updateKnowledgeBaseMetadata(entry.fileId, metaUpdate, userEmail, userRole);
          await updateKnowledgeBaseMetadata(entry.txtFileId, metaUpdate, userEmail, userRole);
        } catch (e) { console.warn(`Could not auto-save metadata for ${entry.fileName}:`, e); }
      }

      await refreshPendingQueues();
      setSelectedKBFiles(new Set());

      if (metadataEntries.length > 0) {
        alert(`✅ ${metadataEntries.length} file(s) processed successfully. AI-suggested metadata has been pre-filled and is ready to review in Read/Edit/Approve.`);
      } else {
        alert('Processing complete, but no files succeeded.');
      }
    } catch (e) { alert(`❌ Processing failed: ${e instanceof Error ? e.message : 'Unknown'}`); }
    finally { setIsProcessing(false); setProcessingStatus({}); onLoadingChange?.(false); }
  };

  const handlePreviewKBFile = async (file: KnowledgeBaseFile) => {
    // Always re-fetch latest metadata from DB before opening modal.
    // The object in allPendingFiles may be stale — e.g. brand/summary were
    // saved via the metadata modal after processing but the list was not
    // refreshed, so the in-memory object still has empty fields.
    setIsLoadingPreview(true);
    setPreviewContent('');
    setEditedKBContent('');
    onFileOpen?.(file.fileName);

    let freshFile = file;
    try {
      // Re-fetch the latest metadata for this specific file from Databricks.
      // The in-memory object from allPendingFiles may be stale — brand/summary/tags
      // may have been saved after the list was last fetched.
      // Search by filename to avoid fetching 200 records just to find one.
      const results = await listKnowledgeBaseFiles({
        searchTerm: file.fileName,
        limit: 10,
        sortBy: 'upload_date',
        sortOrder: 'DESC',
      });
      const found = results.find(f => f.fileId === file.fileId);
      if (found) {
        freshFile = found;
        console.log('[KB Preview] Fresh metadata — brand:', freshFile.brand, '| summary:', (freshFile.contentSummary || '').substring(0, 60));
      } else {
        // File may already be approved — search approved files too
        const approvedResults = await listKnowledgeBaseFiles({
          searchTerm: file.fileName,
          isApproved: true,
          limit: 10,
          sortBy: 'upload_date',
          sortOrder: 'DESC',
        });
        const foundApproved = approvedResults.find(f => f.fileId === file.fileId);
        if (foundApproved) {
          freshFile = foundApproved;
          console.log('[KB Preview] Found as approved — brand:', freshFile.brand);
        }
      }
    } catch (e) {
      console.warn('[KB Preview] Could not re-fetch metadata, using cached object:', e);
    }

    setPreviewFile(freshFile);
    setEditedKBFileName(freshFile.fileName);
    setEditedKBSummary(freshFile.contentSummary || '');
    setEditedKBTags(Array.isArray(freshFile.tags) ? freshFile.tags.join(', ') : (freshFile.tags || ''));
    setEditedKBBrand(freshFile.brand || '');
    setEditedKBProjectType(freshFile.projectType || '');
    setEditedKBFileType(freshFile.fileType === 'Example' ? 'Example' : (freshFile.fileType || 'Synthesis'));
    setEditedKBIsExample(freshFile.fileType === 'Example');
    setEditedKBMonth(freshFile.contentMonth ? String(freshFile.contentMonth) : '');
    setEditedKBYear(freshFile.contentYear ? String(freshFile.contentYear) : '');

    try {
      const r = await readKnowledgeBaseFile(freshFile.fileId);
      if (r.success && r.content) { setPreviewContent(r.content); setEditedKBContent(r.content); }
      else setPreviewContent(`Failed to load: ${r.error || 'Unknown'}`);
    } catch (e) { setPreviewContent(`Error: ${e instanceof Error ? e.message : 'Unknown'}`); }
    finally { setIsLoadingPreview(false); }
  };

  // Always saves all fields — no change detection (avoids stale-state skipping)
  const handleSaveKBChanges = async () => {
    if (!previewFile) return;
    setIsSavingKBChanges(true);
    const wasExample = previewFile.fileType === 'Example';
    const nowExample = editedKBIsExample;
    const becameExample = !wasExample && nowExample && canManageExamples;
    try {
      const resolvedFileType = editedKBIsExample ? 'Example' : editedKBFileType;
      const r = await updateKnowledgeBaseMetadata(previewFile.fileId, {
        fileName: editedKBFileName, contentSummary: editedKBSummary,
        brand: editedKBBrand, projectType: editedKBProjectType,
        fileType: resolvedFileType, tags: editedKBTags.split(',').map(t => t.trim()).filter(Boolean),
        contentMonth: editedKBMonth ? parseInt(editedKBMonth) : null,
        contentYear: editedKBYear ? parseInt(editedKBYear) : null,
      }, userEmail, userRole);
      if (!r.success) throw new Error(r.error || 'Failed');

      // When a file is newly set to Example type, auto-process and auto-approve it
      if (becameExample) {
        if (processingModelEndpoint && previewFile.cleaningStatus !== 'processed') {
          onLoadingChange?.(true, 'Processing new Example file…');
          await processKnowledgeBaseFile(previewFile.fileId, processingModelEndpoint, availableBrands, availableProjectTypes);
        }
        if (!previewFile.isApproved) {
          onLoadingChange?.(true, 'Approving Example file…');
          await approveKnowledgeBaseFile(previewFile.fileId, userEmail, userRole || 'research-leader');
        }
        onLoadingChange?.(false);
      }

      alert(becameExample ? '✅ Saved and approved as Example file. Available to all brands immediately.' : '✅ Changes saved!');
      onRefreshFiles?.(); await refreshPendingQueues();
      setPreviewFile({ ...previewFile, fileName: editedKBFileName, contentSummary: editedKBSummary, brand: editedKBBrand, projectType: editedKBProjectType, tags: editedKBTags.split(',').map(t => t.trim()).filter(Boolean), fileType: resolvedFileType as any });
    } catch (e) { alert(`❌ Failed: ${e instanceof Error ? e.message : 'Unknown'}`); onLoadingChange?.(false); }
    finally { setIsSavingKBChanges(false); }
  };

  const handleApproveKBFile = async (fileId: string) => {
    console.log("[KB Approve] Approving fileId:", fileId, "userEmail:", userEmail, "userRole:", userRole);
    try {
      const r = await approveKnowledgeBaseFile(fileId, userEmail, userRole || "research-leader");
      console.log("[KB Approve] Result:", r);
      if (r.success) {
        alert("✅ File approved!");
        handleClosePreview();
        await refreshPendingQueues();
        onRefreshFiles?.();
      } else {
        alert("❌ Approval failed: " + (r.error || "Unknown error — check server logs"));
      }
    } catch (e) { alert("❌ Approve error: " + (e instanceof Error ? e.message : "Unknown")); }
  };








  const handleRejectKBFile = async (fileId: string) => {
    if (!confirm('Reject and delete this file?')) return;
    try {
      const r = await deleteKnowledgeBaseFile(fileId, userEmail, 'research-leader');
      if (r.success) { await refreshPendingQueues(); handleClosePreview(); alert('✅ Deleted'); }
      else alert(`❌ Failed: ${r.error}`);
    } catch (e) { alert(`❌ Error: ${e instanceof Error ? e.message : 'Unknown'}`); }
  };

  const handleSynthesisQuestionChange = (key: string, value: string) => setSynthesisResponses(prev => ({ ...prev, [key]: value }));

  const handleDatabricksFilesSelected = (files: Array<{ name: string; content: string; source: string }>, autoApprove: boolean) => {
    if (!selectedBrand || !selectedProjectType) return;
    files.forEach(f => onCreateResearchFile({ brand: selectedBrand, projectType: selectedProjectType, fileName: f.name, isApproved: autoApprove, fileType: 'synthesis', content: f.content, source: f.source }));
    setShowDatabricksBrowser(false);
  };

  const handleUploadToDatabricks = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!isAuthenticated()) { alert('⚠️ Please sign in to Databricks first.'); event.target.value = ''; return; }
    const fileArray = Array.from(files);
    let ok = 0; let fail = 0; const failed: string[] = [];
    onLoadingChange?.(true, fileArray.length === 1 ? `Uploading "${fileArray[0].name}"…` : `Uploading 1 of ${fileArray.length}: ${fileArray[0].name}`);
    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        onLoadingChange?.(true, fileArray.length === 1 ? `Uploading "${file.name}"…` : `Uploading ${i + 1} of ${fileArray.length}: ${file.name}`);
        try {
          const r = await uploadToKnowledgeBase({ file, scope: 'general', fileType: 'Synthesis', tags: ['unprocessed'], userEmail, userRole: canApproveResearch ? 'research-leader' : 'research-analyst' });
          if (r.success) {
            ok++;
            const reader = new FileReader();
            reader.onload = e => onCreateResearchFile({ brand: '', projectType: '', fileName: file.name, isApproved: false, fileType: 'synthesis', content: e.target?.result as string, source: r.filePath ? `Databricks: ${r.filePath}` : `Databricks KB: ${file.name}` });
            reader.readAsDataURL(file);
          } else { fail++; failed.push(file.name); }
        } catch { fail++; failed.push(file.name); }
      }
      onLoadingChange?.(true, 'Refreshing knowledge base…');
      await refreshPendingQueues();
      event.target.value = '';
      alert(fileArray.length === 1
        ? ok === 1 ? `✅ "${fileArray[0].name}" uploaded. Go to Read/Edit/Approve to process it.` : `❌ Failed to upload "${fileArray[0].name}".`
        : `✅ ${ok} uploaded${fail > 0 ? `, ❌ ${fail} failed:\n${failed.join('\n')}` : ''}\n\nProcess files in Read/Edit/Approve.`
      );
    } catch { alert('Failed to upload. Please try again.'); event.target.value = ''; }
    finally { onLoadingChange?.(false); }
  };

  // Upload file directly as an Example — auto-processes and auto-approves
  const handleUploadAsExample = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!isAuthenticated()) { alert('⚠️ Please sign in to Databricks first.'); event.target.value = ''; return; }
    const fileArray = Array.from(files);
    onLoadingChange?.(true, `Uploading example file${fileArray.length > 1 ? 's' : ''}…`);
    let ok = 0; let fail = 0;
    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        onLoadingChange?.(true, `Uploading example ${i + 1} of ${fileArray.length}: ${file.name}`);
        try {
          const r = await uploadToKnowledgeBase({ file, scope: 'general', fileType: 'Example', tags: ['example'], userEmail, userRole: 'research-leader' });
          if (r.success && r.fileId) {
            if (processingModelEndpoint) {
              onLoadingChange?.(true, `Processing example: ${file.name}`);
              await processKnowledgeBaseFile(r.fileId, processingModelEndpoint, availableBrands, availableProjectTypes);
            }
            onLoadingChange?.(true, `Approving example: ${file.name}`);
            await approveKnowledgeBaseFile(r.fileId, userEmail, userRole || 'research-leader');
            ok++;
          } else { fail++; }
        } catch { fail++; }
      }
      await refreshPendingQueues();
      onRefreshFiles?.();
      event.target.value = '';
      alert(ok > 0
        ? `✅ ${ok} Example file${ok !== 1 ? 's' : ''} uploaded and approved. ${fail > 0 ? `\n❌ ${fail} failed.` : 'Available to all brands immediately.'}`
        : `❌ Failed to upload example file.`
      );
    } catch { alert('Failed to upload. Please try again.'); event.target.value = ''; }
    finally { onLoadingChange?.(false); }
  };

  // Upload directly to KB as approved brand-scoped file — bypasses read/edit/approve

  const handleCreatePersonaFile = () => {
    if (!selectedHexagon || !personaFileForm.fileName.trim()) return;
    const bv = personaFileForm.brandScope === 'single' ? personaFileForm.brandName : personaFileForm.brandScope === 'category' ? `Category: ${personaFileForm.categoryName}` : 'All Brands';
    onCreateResearchFile({ brand: bv, projectType: selectedHexagon, fileName: personaFileForm.fileName, isApproved: false, fileType: selectedHexagon });
    setPersonaFileForm({ brandScope: 'single', brandName: brand, categoryName: '', fileName: '', fileType: '' });
  };

  const resetPersonaForm = () => setPersonaForm({ name: '', background: '', tone: '', style: '', praises: '', dislikes: '', alwaysAsks: '', reactsToIdeas: '', scoringLens: '', hexIds: 'any' });

  const openPersonaCreate = () => { resetPersonaForm(); setEditingPersona(null); setShowPersonaModal(true); };

  const openPersonaEdit = (p: CustomPersona) => {
    const c = p.contentJson as any;
    setPersonaForm({
      name: p.name,
      background: c.context || '',
      tone: c.voiceCharacteristics?.tone || '',
      style: c.voiceCharacteristics?.style || '',
      praises: (c.psychographics?.praises || []).join('\n'),
      dislikes: (c.psychographics?.dislikes || []).join('\n'),
      alwaysAsks: (c.evaluationCriteria?.alwaysAsks || []).join('\n'),
      reactsToIdeas: c.evaluationCriteria?.reactsToEarlyIdeas || '',
      scoringLens: c.evaluationCriteria?.scoringRubric || '',
      hexIds: p.hexIds || 'any',
    });
    setEditingPersona(p);
    setShowPersonaModal(true);
  };

  const handleSavePersona = async () => {
    if (!personaForm.name.trim()) return;
    setIsSavingPersona(true);
    const contentJson = {
      context: personaForm.background || undefined,
      voiceCharacteristics: (personaForm.tone || personaForm.style) ? { tone: personaForm.tone || undefined, style: personaForm.style || undefined } : undefined,
      psychographics: {
        praises: personaForm.praises ? personaForm.praises.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
        dislikes: personaForm.dislikes ? personaForm.dislikes.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
      },
      evaluationCriteria: {
        alwaysAsks: personaForm.alwaysAsks ? personaForm.alwaysAsks.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
        reactsToEarlyIdeas: personaForm.reactsToIdeas || undefined,
        scoringRubric: personaForm.scoringLens || undefined,
      },
    };
    const result = await saveCustomPersona({ personaId: editingPersona?.personaId, name: personaForm.name.trim(), hexIds: personaForm.hexIds, contentJson, createdBy: userEmail });
    if (result.success) {
      const updated = await fetchCustomPersonas();
      setCustomPersonas(updated);
      setShowPersonaModal(false);
      resetPersonaForm();
      setEditingPersona(null);
    } else {
      alert('Failed to save persona: ' + (result.error || 'Unknown error'));
    }
    setIsSavingPersona(false);
  };

  const handleDeletePersona = async (personaId: string, name: string) => {
    if (!confirm(`Delete persona "${name}"? This cannot be undone.`)) return;
    const result = await deleteCustomPersona(personaId);
    if (result.success) setCustomPersonas(prev => prev.filter(p => p.personaId !== personaId));
    else alert('Failed to delete persona: ' + (result.error || 'Unknown error'));
  };

  const persistPrompts = (prompts: ReturnType<typeof loadSavedPrompts>) => { localStorage.setItem(`cohive_custom_prompts_${userEmail}`, JSON.stringify(prompts)); setSavedPrompts(prompts); };
  const handleCpSavePrompt = () => {
    if (!cpPromptName.trim() || !cpPromptText.trim()) return;
    if (cpActivePrompt) persistPrompts(savedPrompts.map(p => p.id === cpActivePrompt.id ? { ...p, name: cpPromptName, prompt: cpPromptText, updatedAt: Date.now() } : p));
    else persistPrompts([...savedPrompts, { id: `cp_${Date.now()}`, name: cpPromptName, prompt: cpPromptText, createdAt: Date.now(), updatedAt: Date.now() }]);
    setCpView('list'); setCpActivePrompt(null); setCpPromptName(''); setCpPromptText('');
  };
  const handleCpDeletePrompt = (id: string) => {
    if (!confirm('Delete this prompt?')) return;
    persistPrompts(savedPrompts.filter(p => p.id !== id));
    if (cpActivePrompt?.id === id) { setCpActivePrompt(null); setCpView('list'); }
  };
  const handleCpRunPrompt = async (prompt: SavedCustomPrompt) => {
    if (cpSelectedFiles.length === 0) { setCpError('Please select at least one file.'); return; }
    const kw = ['search the web', 'look up online', 'outside the knowledge base', 'ignore the files'];
    if (kw.some(k => (prompt.prompt + ' ' + cpRunInput).toLowerCase().includes(k))) { setCpError('Prompt references external sources — not allowed.'); return; }
    setCpIsRunning(true); setCpResult(null); setCpError(null);
    const names = researchFiles.filter(f => cpSelectedFiles.includes(f.id)).map(f => f.fileName).join(', ');
    try {
      const r = await executeAIPrompt({ prompt: cpRunInput.trim() ? `${prompt.prompt}\n\nContext: ${cpRunInput}` : prompt.prompt, systemPrompt: `Use ONLY: ${names}.`, includeKnowledgeBase: true, knowledgeBaseQuery: names, userEmail, userRole: 'administrator' });
      if (r.success) setCpResult(r.response); else setCpError(r.error || 'Unknown error');
    } catch { setCpError('Failed. Please try again.'); } finally { setCpIsRunning(false); }
  };

  const cpApprovedFiles = researchFiles.filter(f => f.isApproved);
  const FILE_TYPES = ['Synthesis', 'Research', 'Persona', 'Wisdom', 'Example'];

  const ModeSwitcher = ({ current }: { current: string }) => (
    <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <span className="text-gray-700 text-sm font-semibold">Research Mode:</span>
        <div className="flex gap-2 flex-1 flex-wrap">
          {[['synthesis','Synthesis','purple'],['personas','Personas','blue'],['read-edit-approve', canApproveResearch ? 'Read/Edit/Approve' : 'Read Files','green']].map(([id, label, color]) => (
            <button key={id} onClick={() => handleModeChange(id as any)} className={`px-4 py-2 rounded-lg transition-colors ${current === id ? `bg-${color}-600 text-white` : `bg-white border-2 border-gray-300 text-gray-700 hover:border-${color}-500 hover:bg-${color}-50`}`}>{label}</button>
          ))}
          {(userRole === 'administrator' || userRole === 'data-scientist') && <button onClick={() => handleModeChange('workspace')} className={`px-4 py-2 rounded-lg transition-colors ${current === 'workspace' ? 'bg-orange-600 text-white' : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-orange-500 hover:bg-orange-50'}`}>Workspace</button>}
          {(userRole === 'administrator' || userRole === 'data-scientist') && <button onClick={() => { handleModeChange('custom-prompt'); setCpView('list'); setCpResult(null); setCpError(null); }} className={`px-4 py-2 rounded-lg transition-colors ${current === 'custom-prompt' ? 'bg-teal-600 text-white' : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-teal-500 hover:bg-teal-50'}`}>Custom Prompt</button>}
        </div>
        <button onClick={async () => { onRefreshFiles?.(); await refreshPendingQueues(); alert('✓ Refreshed!'); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><RefreshCw className="w-4 h-4" />Refresh</button>
      </div>
    </div>
  );


  // ── Preview Modal ──────────────────────────────────────────────────────────
  const PreviewModal = () => {
    if (!previewFile) return null;
    return (
      <div className="fixed inset-y-0 left-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ right: 'var(--modal-r)', padding: 'var(--modal-p)' }}>
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="border-b-2 border-gray-300 p-4 flex items-center justify-between">
            <div className="flex-1 mr-4">
              <input type="text" value={editedKBFileName} onChange={e => setEditedKBFileName(e.target.value)} className="text-gray-900 font-medium w-full bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-green-500 focus:outline-none px-1 py-0.5" />
              <p className="text-gray-500 text-xs mt-1">
                {isTxtFile(previewFile) && <span className="mr-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">Processed Text</span>}
                Uploaded by {previewFile.uploadedBy} · {new Date(previewFile.uploadDate).toLocaleDateString()}
              </p>
            </div>
            <button onClick={handleClosePreview} aria-label="Close preview" className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold text-sm mb-1">Brand</label>
                {canApproveResearch ? <select value={editedKBBrand} onChange={e => setEditedKBBrand(e.target.value)} className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-green-500"><option value="">— No brand —</option>{availableBrands.map(b => <option key={b} value={b}>{b}</option>)}</select> : <p className="text-gray-700 text-sm py-2">{previewFile.brand || '—'}</p>}
              </div>
              <div>
                <label className="block text-gray-700 font-semibold text-sm mb-1">Project Type</label>
                {canApproveResearch ? <select value={editedKBProjectType} onChange={e => setEditedKBProjectType(e.target.value)} className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-green-500"><option value="">— No project type —</option>{availableProjectTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}</select> : <p className="text-gray-700 text-sm py-2">{previewFile.projectType || '—'}</p>}
              </div>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold text-sm mb-1">File Type</label>
              {canApproveResearch ? <select value={editedKBIsExample ? 'Example' : editedKBFileType} onChange={e => { setEditedKBIsExample(e.target.value === 'Example'); setEditedKBFileType(e.target.value); }} className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-green-500">{FILE_TYPES.map(ft => <option key={ft} value={ft}>{ft}</option>)}</select> : <p className="text-gray-700 text-sm py-2">{previewFile.fileType || '—'}</p>}
              {editedKBIsExample && <p className="text-xs text-amber-700 mt-1">✦ Available to all brands as cross-brand reference.</p>}
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h4 className="text-blue-900 font-medium mb-2 flex items-center justify-between">AI Summary {canApproveResearch && <span className="text-xs text-blue-600 font-normal">Editable</span>}</h4>
              {canApproveResearch ? <textarea value={editedKBSummary} onChange={e => setEditedKBSummary(e.target.value)} className="w-full bg-white border-2 border-blue-200 rounded p-2 text-blue-800 text-sm resize-y focus:outline-none focus:border-blue-400" rows={3} placeholder="Edit or enter the AI summary..." /> : <p className="text-blue-800 text-sm">{previewFile.contentSummary || '—'}</p>}
            </div>
            <div>
              <h4 className="text-gray-900 font-medium mb-2 text-sm flex items-center justify-between">Tags {canApproveResearch && <span className="text-xs text-gray-500 font-normal">comma-separated</span>}</h4>
              {canApproveResearch ? <input type="text" value={editedKBTags} onChange={e => setEditedKBTags(e.target.value)} className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 text-sm focus:outline-none focus:border-green-500" placeholder="e.g. brand-strategy, 2024" /> : <div className="flex flex-wrap gap-2">{(previewFile.tags || []).map((t, i) => <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{t}</span>)}</div>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold text-sm mb-1">Month <span className="font-normal text-gray-400 text-xs">(optional)</span></label>
                {canApproveResearch ? (
                  <select value={editedKBMonth} onChange={e => setEditedKBMonth(e.target.value)} className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-green-500">
                    <option value="">— Unknown —</option>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                  </select>
                ) : <p className="text-gray-700 text-sm py-2">{previewFile.contentMonth ? ['January','February','March','April','May','June','July','August','September','October','November','December'][previewFile.contentMonth - 1] : '—'}</p>}
              </div>
              <div>
                <label className="block text-gray-700 font-semibold text-sm mb-1">Year <span className="font-normal text-gray-400 text-xs">(optional)</span></label>
                {canApproveResearch ? (
                  <input type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="e.g. 2024" value={editedKBYear} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setEditedKBYear(v); }} className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-green-500" />
                ) : <p className="text-gray-700 text-sm py-2">{previewFile.contentYear || '—'}</p>}
              </div>
            </div>
            <div>
              <h4 className="text-gray-900 font-medium mb-2 text-sm">File Content</h4>
              {isLoadingPreview ? <div className="flex items-center justify-center py-8"><SpinHex className="w-6 h-6" /><span className="ml-2 text-gray-500">Loading...</span></div> : <textarea value={editedKBContent} onChange={e => setEditedKBContent(e.target.value)} className="w-full min-h-[300px] bg-gray-50 border-2 border-gray-300 rounded p-4 text-gray-700 text-sm resize-y focus:outline-none focus:border-green-500" />}
            </div>
          </div>
          {canApproveResearch && (
            <div className="border-t-2 border-gray-300 p-4 flex items-center justify-between">
              <button onClick={handleSaveKBChanges} disabled={isSavingKBChanges} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2">
                {isSavingKBChanges ? <><SpinHex className="w-4 h-4" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => handleRejectKBFile(previewFile.fileId)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"><Trash2 className="w-4 h-4" />Reject & Delete</button>
                {isTxtFile(previewFile) && (
                  <button onClick={() => handleApproveKBFile(previewFile.fileId)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"><CircleCheck className="w-4 h-4" />Approve File</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!mode) {
    return (
      <div className="space-y-4">
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="text-purple-900 leading-tight">Research Mode Selection</h3>
          <p className="text-purple-700 text-sm">Build, Edit and Approve Research Files and Persona Files</p>
        </div>
        <div className={`grid ${(userRole === 'administrator' || userRole === 'data-scientist') ? 'grid-cols-5' : 'grid-cols-3'} gap-4`}>
          <button onClick={() => handleModeChange('synthesis')} className="bg-white border-2 border-gray-300 rounded-lg p-6 hover:border-purple-500 hover:bg-purple-50 text-left"><h4 className="text-gray-900">Synthesis</h4><p className="text-gray-600 text-sm">Combine and analyze multiple research studies</p></button>
          <button onClick={() => handleModeChange('personas')} className="bg-white border-2 border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 text-left"><h4 className="text-gray-900">Personas</h4><p className="text-gray-600 text-sm">Create persona files for each Hexagon</p></button>
          <button onClick={() => handleModeChange('read-edit-approve')} className="bg-white border-2 border-gray-300 rounded-lg p-6 hover:border-green-500 hover:bg-green-50 text-left"><h4 className="text-gray-900">{canApproveResearch ? 'Read, Edit, or Approve' : 'Read Files'}</h4><p className="text-gray-600 text-sm">{canApproveResearch ? 'Process, assign metadata and approve files' : 'View knowledge base files'}</p></button>
          {(userRole === 'administrator' || userRole === 'data-scientist') && <button onClick={() => handleModeChange('workspace')} className="bg-white border-2 border-gray-300 rounded-lg p-6 hover:border-orange-500 hover:bg-orange-50 text-left"><h4 className="text-gray-900">Workspace</h4><p className="text-gray-600 text-sm">Advanced operations — Admin &amp; Data Scientist</p></button>}
          {(userRole === 'administrator' || userRole === 'data-scientist') && <button onClick={() => handleModeChange('custom-prompt')} className="bg-white border-2 border-gray-300 rounded-lg p-6 hover:border-teal-500 hover:bg-teal-50 text-left"><h4 className="text-gray-900">Custom Prompt</h4><p className="text-gray-600 text-sm">Save and run AI prompts — Admin &amp; Data Scientist</p></button>}
        </div>
      </div>
    );
  }

  if (mode === 'read-edit-approve') {
    // Exclude files that are in Pending Processing — they haven't been processed yet
    // and shouldn't appear in the Select a File list until approved.
    const pendingProcessingIds = new Set(pendingKBFiles.map(f => f.fileId));
    const selectableFiles = researchFiles.filter(f => !pendingProcessingIds.has(f.id));
    const getSynthesisFiles = () => selectableFiles.filter(f => !f.fileType || f.fileType === 'synthesis' || !centralHexagons.find(h => h.id === f.fileType));
    const getPersonasFiles = () => selectableFiles.filter(f => centralHexagons.find(h => h.id === f.fileType));
    const getFilteredFiles = () => [...(filterType === 'synthesis' ? getSynthesisFiles() : filterType === 'personas' ? getPersonasFiles() : selectableFiles)].sort((a, b) => b.uploadDate - a.uploadDate);

    return (
      <div className="space-y-4">
        <AIResponseModal {...aiModal} onClose={closeAiModal} />
        {PreviewModal()}
        <ModeSwitcher current="read-edit-approve" />

        <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-gray-900 font-medium">Upload Files</h4>
            <span className="text-xs text-gray-500">Brand & project type assigned after processing</span>
          </div>
          <div className="flex gap-2">
            <label className="flex-1 px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-5 h-5" />Upload Files to Knowledge Base
              <input type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.ppt,.pptx" multiple className="hidden" onChange={handleUploadToDatabricks} />
            </label>
            {canManageExamples && (
              <label className="px-4 py-3 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap">
                <Upload className="w-5 h-5" />Upload as Example
                <input type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.ppt,.pptx,.png,.jpg,.jpeg" multiple className="hidden" onChange={handleUploadAsExample} />
              </label>
            )}
          </div>
          {canManageExamples && (
            <p className="text-xs text-amber-700 mt-2">✦ Example files are auto-processed and auto-approved — no review needed. Available to all brands immediately.</p>
          )}
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-green-900 leading-tight">{canApproveResearch ? 'Read/Edit/Approve Mode' : 'Read Files Mode'}</h3>
              <p className="text-green-700 text-sm">{canApproveResearch ? 'Process, assign metadata, and approve files for use' : 'View knowledge base files'}</p>
            </div>
            <button onClick={refreshPendingQueues} disabled={isLoadingQueues} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 flex items-center gap-1.5 flex-shrink-0">
              {isLoadingQueues
                ? <SpinHex className="w-4 h-4" />
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
              {isLoadingQueues ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Pending Processing */}
        {pendingKBFiles.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-yellow-900 leading-tight">Pending Processing ({pendingKBFiles.length})</h3>
                <p className="text-yellow-700 text-sm">Select original files to extract content and suggest metadata</p>
              </div>
              {selectedKBFiles.size > 0 && (
                <div className="flex items-center gap-2">
                  {selectedKBFiles.size === 1 && (() => { const f = pendingKBFiles.find(f => selectedKBFiles.has(f.fileId)); return f ? <button onClick={() => handlePreviewKBFile(f)} disabled={isProcessing} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 flex items-center gap-2"><Eye className="w-4 h-4" />Read</button> : null; })()}
                  <button onClick={handleProcessSelectedFiles} disabled={isProcessing} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2">
                    {isProcessing ? <><SpinHex className="w-5 h-5" />Processing {selectedKBFiles.size}...</> : <><Sparkles className="w-5 h-5" />Process Selected ({selectedKBFiles.size})</>}
                  </button>
                  {canApproveResearch && <button onClick={handleDeleteSelectedFiles} disabled={isProcessing || isDeleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2">
                    {isDeleting ? <><SpinHex className="w-4 h-4" />Deleting {selectedKBFiles.size}...</> : <><Trash2 className="w-4 h-4" />Delete Selected ({selectedKBFiles.size})</>}
                  </button>}
                </div>
              )}
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {pendingKBFiles.map(file => {
                const status = processingStatus[file.fileId];
                const isSelected = selectedKBFiles.has(file.fileId);
                return (
                  <div key={file.fileId} className={`border-2 rounded p-3 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'} ${status === 'processing' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleKBFileSelection(file.fileId)} disabled={isProcessing} className="w-5 h-5 mt-1 cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="text-gray-900 text-sm font-medium truncate">{file.fileName}</h5>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                              <span>{file.fileType}</span>
                              {file.brand && <><span>•</span><span>{file.brand}</span></>}
                              <span>•</span><span>{file.uploadedBy}</span>
                              <span>•</span><span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {status && <div className="flex-shrink-0">
                            {status === 'processing' && <SpinHex className="w-6 h-6" />}
                            {status === 'success' && <CircleCheck className="w-6 h-6 text-green-600" />}
                            {status === 'error' && <X className="w-6 h-6 text-red-600" />}
                          </div>}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => handlePreviewKBFile(file)} disabled={status === 'processing'} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"><Eye className="w-3 h-3" />Read</button>
                          {canApproveResearch && <button onClick={() => handleRejectKBFile(file.fileId)} disabled={status === 'processing'} className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"><Trash2 className="w-3 h-3" />Delete</button>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Approval — grouped pairs */}
        {pendingApprovalFiles.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-blue-900 leading-tight">Pending Approval ({pendingApprovalFiles.length})</h3>
                <p className="text-blue-700 text-sm">Processed files ready for review. Approve the <strong>_txt</strong> version — the original stays as archive.</p>
              </div>
              {selectedApprovalFiles.size > 0 && canApproveResearch && (
                <button onClick={handleDeleteSelectedApprovalFiles} disabled={isApprovalDeleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2 flex-shrink-0">
                  {isApprovalDeleting ? <><SpinHex className="w-4 h-4" />Deleting {selectedApprovalFiles.size}...</> : <><Trash2 className="w-4 h-4" />Delete Selected ({selectedApprovalFiles.size})</>}
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {pendingApprovalFiles.map(file => {
                const txtCompanion = findTxtCompanion(file, allPendingFiles);
                const isPairExpanded = expandedPairIds.has(file.fileId);
                return (
                  <div key={file.fileId} className={`border-2 rounded-lg overflow-hidden ${selectedApprovalFiles.has(file.fileId) ? 'border-red-300' : 'border-blue-200'}`}>
                    {/* Original file row */}
                    <div className={`p-3 ${selectedApprovalFiles.has(file.fileId) ? 'bg-red-50' : 'bg-white'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {canApproveResearch && <input type="checkbox" checked={selectedApprovalFiles.has(file.fileId)} onChange={() => toggleApprovalFileSelection(file.fileId)} disabled={isApprovalDeleting} className="w-5 h-5 mt-1 cursor-pointer flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">orig</span>
                            <h5 className="text-gray-900 text-sm font-medium truncate">{file.fileName}</h5>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {file.brand && <span className="text-xs text-gray-600">{file.brand}</span>}
                            {file.projectType && <><span className="text-xs text-gray-400">·</span><span className="text-xs text-gray-600">{file.projectType}</span></>}
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-600">{new Date(file.uploadDate).toLocaleDateString()}</span>
                          </div>
                          {file.contentSummary && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{file.contentSummary}</p>}
                        </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          {canApproveResearch && (
                            <>
                              <button onClick={() => handlePreviewKBFile(file)} className="px-2 py-1 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50 flex items-center gap-1"><FileText className="w-3 h-3" />View</button>
                              <button onClick={() => handleRejectKBFile(file.fileId)} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 flex items-center gap-1"><Trash2 className="w-3 h-3" />Delete</button>
                            </>
                          )}
                          {txtCompanion && (
                            <button onClick={() => togglePairExpand(file.fileId)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title={isPairExpanded ? 'Hide _txt version' : 'Show _txt version'}>
                              {isPairExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* _txt companion row — expanded */}
                    {txtCompanion && isPairExpanded && (
                      <div className="border-t-2 border-blue-100 bg-blue-50 p-3 pl-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded text-xs font-mono">_txt</span>
                              <h5 className="text-blue-900 text-sm font-medium truncate">{txtCompanion.fileName}</h5>
                            </div>
                            <p className="text-xs text-blue-700 mt-0.5">Extracted text — this is the version used by the AI</p>
                            {(!file.brand || !file.projectType) && <p className="text-xs text-amber-600 mt-1">⚠ Brand or project type not assigned — edit before approving</p>}
                          </div>
                          {canApproveResearch && (
                            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                              <button onClick={() => handlePreviewKBFile(txtCompanion)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1 whitespace-nowrap"><FileText className="w-3 h-3" />Review & Approve</button>
                              <button onClick={() => handleRejectKBFile(txtCompanion.fileId)} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 flex items-center gap-1"><Trash2 className="w-3 h-3" />Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* No _txt found yet */}
                    {!txtCompanion && (
                      <div className="border-t-2 border-yellow-100 bg-yellow-50 p-2 pl-6">
                        <p className="text-xs text-yellow-700">⏳ _txt version not yet created — process this file to generate it</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state when loaded but nothing pending */}
        {!isLoadingQueues && pendingKBFiles.length === 0 && pendingApprovalFiles.length === 0 && (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-500 text-sm">No files pending processing or approval.</p>
            <p className="text-gray-400 text-xs mt-1">Files uploaded from the Wisdom hex or via Upload above will appear here.</p>
          </div>
        )}

        {/* Example Files panel — visible to users who can manage examples */}
        {canManageExamples && (() => {
          const exFiles = researchFiles.filter(f => f.isApproved && f.fileType === 'Example' && !f.fileName.endsWith('_txt.txt'));
          if (exFiles.length === 0) return null;
          return (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-amber-900 leading-tight">✦ Example Files ({exFiles.length})</h3>
                  <p className="text-amber-700 text-sm">Cross-brand quality and format references — available to all brands in the Enter hex.</p>
                </div>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {exFiles.map(file => (
                  <div key={file.id} className="bg-white border-2 border-amber-200 rounded p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-gray-900 text-sm font-medium truncate">{file.fileName}</h5>
                      <div className="text-xs text-gray-500 mt-0.5">{new Date(file.uploadDate).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={async () => {
                          const kbFile = { fileId: file.id, fileName: file.fileName, filePath: file.source || '', scope: 'general' as any, brand: file.brand, projectType: file.projectType, fileType: 'Example' as any, isApproved: file.isApproved, uploadDate: new Date(file.uploadDate).toISOString(), uploadedBy: '', tags: [], citationCount: 0, gemInclusionCount: 0, fileSizeBytes: 0, createdAt: new Date(file.uploadDate).toISOString(), updatedAt: new Date(file.uploadDate).toISOString(), cleaningStatus: 'processed' };
                          await handlePreviewKBFile(kbFile);
                        }}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />Read
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete example file "${file.fileName}"? This cannot be undone.`)) return;
                          const r = await deleteKnowledgeBaseFile(file.id, userEmail, 'research-leader');
                          if (r.success) { onRefreshFiles?.(); alert('✅ Example file deleted.'); }
                          else alert(`❌ Delete failed: ${r.error}`);
                        }}
                        className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Approved files list */}
        {selectedFile && (
          <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div><h4 className="text-gray-900 font-medium">{selectedFile.fileName}</h4><p className="text-xs text-gray-500 mt-0.5">Brand: {selectedFile.brand || '—'} · Project Type: {selectedFile.projectType || '—'}</p></div>
              <div className="flex items-center gap-2">
                {selectedFile.isApproved ? <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Approved</span> : <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Pending</span>}
                {canApproveResearch && <button onClick={() => onToggleApproval(selectedFile.id)} className={`px-3 py-1 rounded text-xs ${selectedFile.isApproved ? 'bg-yellow-500 text-white' : 'bg-green-600 text-white'}`}>{selectedFile.isApproved ? 'Unapprove' : 'Approve'}</button>}
              </div>
            </div>
            {isLoadingFileContent ? <div className="flex items-center justify-center py-10"><SpinHex className="w-5 h-5 mr-2" /><span className="text-gray-500 text-sm">Loading...</span></div>
              : fileLoadError ? <div className="bg-red-50 border-2 border-red-200 rounded p-4 text-red-700 text-sm">{fileLoadError}</div>
              : <textarea className={`w-full min-h-[300px] border-2 rounded p-3 text-gray-700 text-sm font-mono resize-y focus:outline-none ${canApproveResearch ? 'border-gray-300 bg-white focus:border-green-500' : 'border-gray-200 bg-gray-50'}`} value={editContent} onChange={e => canApproveResearch && setEditContent(e.target.value)} readOnly={!canApproveResearch} />
            }
            {canApproveResearch && !isLoadingFileContent && !fileLoadError && <div className="mt-3"><button onClick={() => { if (onUpdateResearchFile) onUpdateResearchFile(selectedFile.id, editContent); alert(`Saved: ${selectedFile.fileName}`); }} disabled={!editContent.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 text-sm"><Save className="w-4 h-4" />Save Changes</button></div>}
          </div>
        )}

        <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
          {canApproveResearch && selectedProcessedFiles.size > 0 && (
            <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-sm text-gray-600 mr-1">{selectedProcessedFiles.size} selected</span>
              <button onClick={() => handleBulkApproveProcessed(true)} disabled={isBulkActioning} className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-1.5 text-sm">
                {isBulkActioning ? <SpinHex className="w-4 h-4" /> : <CircleCheck className="w-4 h-4" />}Approve
              </button>
              <button onClick={() => handleBulkApproveProcessed(false)} disabled={isBulkActioning} className="px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400 flex items-center gap-1.5 text-sm">
                {isBulkActioning ? <SpinHex className="w-4 h-4" /> : <X className="w-4 h-4" />}Unapprove
              </button>
              <button onClick={handleBulkDeleteProcessed} disabled={isBulkActioning} className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-1.5 text-sm">
                {isBulkActioning ? <SpinHex className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}Delete
              </button>
              <button onClick={() => setSelectedProcessedFiles(new Set())} className="ml-auto px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm">Clear</button>
            </div>
          )}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded-lg ${filterType === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All ({selectableFiles.length})</button>
            <button onClick={() => setFilterType('synthesis')} className={`px-4 py-2 rounded-lg ${filterType === 'synthesis' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Synthesis ({getSynthesisFiles().length})</button>
            <button onClick={() => setFilterType('personas')} className={`px-4 py-2 rounded-lg ${filterType === 'personas' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Personas ({getPersonasFiles().length})</button>
          </div>
          <h4 className="text-gray-900 mb-3">Select a File</h4>
          {getFilteredFiles().length === 0 ? <div className="text-center py-8 text-gray-500">No files available</div> : (
            getFilteredFiles().map(file => (
              <div key={file.id} className={`border-2 rounded transition-all mb-2 ${selectedFile?.id === file.id ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white hover:border-gray-400'} ${file.fileType === 'Example' ? 'border-l-4 border-l-amber-400' : ''}`}>
                <div className="flex items-start gap-2 p-3">
                  {canApproveResearch && (
                    <input
                      type="checkbox"
                      checked={selectedProcessedFiles.has(file.id)}
                      onChange={e => { e.stopPropagation(); toggleProcessedFileSelection(file.id); }}
                      onClick={e => e.stopPropagation()}
                      disabled={isBulkActioning}
                      className="w-4 h-4 mt-1 cursor-pointer flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => renamingFileId !== file.id && handleSelectFile(file)}>
                    {renamingFileId === file.id ? (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRenameFile(file.id, renameValue); if (e.key === 'Escape') { setRenamingFileId(null); setRenameValue(''); } }} className="flex-1 border-2 border-green-400 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none" autoFocus />
                        <button onClick={() => handleRenameFile(file.id, renameValue)} disabled={isSavingRename || !renameValue.trim()} className="px-3 py-1 bg-green-600 text-white text-xs rounded disabled:bg-gray-300 flex items-center gap-1">{isSavingRename ? <SpinHex className="w-3 h-3" /> : <Save className="w-3 h-3" />}Save</button>
                        <button onClick={() => { setRenamingFileId(null); setRenameValue(''); }} className="px-3 py-1 border-2 border-gray-300 text-gray-600 text-xs rounded">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h5 className="text-gray-900 text-sm font-medium">{file.fileName}</h5>
                          {file.isApproved ? <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Approved</span> : <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Pending</span>}
                          {file.fileType === 'Example' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">✦ Example</span>}
                          {file.fileType && centralHexagons.find(h => h.id === file.fileType) && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Persona</span>}
                        </div>
                        <div className="text-xs text-gray-500">{file.brand || '—'}{file.projectType ? ` · ${file.projectType}` : ''} · {new Date(file.uploadDate).toLocaleDateString()}</div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); setExpandedFileId(expandedFileId === file.id ? null : file.id); }} className={`p-1.5 rounded text-xs ${expandedFileId === file.id ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>{expandedFileId === file.id ? '▲' : '▼'}</button>
                    {renamingFileId !== file.id && (
                      <>
                        <button onClick={e => { e.stopPropagation(); setRenamingFileId(file.id); setRenameValue(file.fileName); }} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded" title="Rename"><Edit className="w-3.5 h-3.5" /></button>
                        {canApproveResearch && <button onClick={e => { e.stopPropagation(); handleEditApprovedFile(file); }} className="p-1.5 text-gray-400 hover:text-indigo-700 hover:bg-indigo-50 rounded" title="Edit metadata"><FileText className="w-3.5 h-3.5" /></button>}
                      </>
                    )}
                  </div>
                </div>
                {expandedFileId === file.id && (
                  <div className="border-t-2 border-gray-100 px-3 pb-3 pt-2 bg-gray-50 rounded-b space-y-1">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div><span className="text-gray-500 font-medium">Type:</span> <span className="text-gray-700">{file.fileType || 'Synthesis'}</span></div>
                      <div><span className="text-gray-500 font-medium">Brand:</span> <span className="text-gray-700">{file.brand || '—'}</span></div>
                      <div><span className="text-gray-500 font-medium">Project Type:</span> <span className="text-gray-700">{file.projectType || '—'}</span></div>
                      <div><span className="text-gray-500 font-medium">Uploaded:</span> <span className="text-gray-700">{new Date(file.uploadDate).toLocaleDateString()}</span></div>
                    </div>
                    {canApproveResearch && <button onClick={e => { e.stopPropagation(); handleEditApprovedFile(file); }} className="text-xs text-indigo-600 hover:text-indigo-800 underline">Edit summary, tags & metadata →</button>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Synthesis, Personas, Workspace, Custom Prompt modes — unchanged from previous version
  if (mode === 'synthesis') {
    return (
      <div className="space-y-4">
        <AIResponseModal {...aiModal} onClose={closeAiModal} />
        <ModeSwitcher current="synthesis" />
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
          <h3 className="text-purple-900 leading-tight">Synthesis Mode</h3>
          <p className="text-purple-700 text-sm">Combine research studies to generate insights</p>
        </div>
        <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
          <label className="block text-gray-900 mb-3">1. Select Synthesis Approach</label>
          {!synthesisOption ? (
            <div className="space-y-2">
              {[
                { value: 'new-synthesis', label: 'New Synthesis', desc: 'Start a new synthesis for an existing brand and project type' },
                { value: 'new-brand', label: 'New Brand', desc: 'Start synthesis for a new brand' },
                { value: 'new-project-type', label: 'New Project Type (Data Scientists Only)', desc: 'Create a new project type with custom AI prompt' },
                { value: 'edit-existing', label: 'Edit Existing Synthesis', desc: 'Modify an existing synthesis file' },
                { value: 'review-edits', label: 'Review Suggested Edits', desc: 'Review and approve suggested edits' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 p-3 rounded cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="synthesisOption" value={opt.value} checked={synthesisOption === opt.value} onChange={e => setSynthesisOption(e.target.value as any)} className="w-4 h-4" />
                  <div><div className="text-gray-900 font-semibold">{opt.label}</div><p className="text-gray-600 text-sm">{opt.desc}</p></div>
                </label>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded bg-blue-50 border-2 border-blue-300">
              <div className="flex-1 text-gray-900 font-semibold">{synthesisOption.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
              <button onClick={() => setSynthesisOption(null)} className="px-3 py-1 text-sm bg-white border-2 border-gray-300 text-gray-700 rounded">Change</button>
            </div>
          )}
        </div>
        {onAddBrand && (synthesisOption === 'new-brand') && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <label className="block text-gray-900 text-sm mb-2">Add New Brand</label>
            <div className="flex gap-2">
              <input type="text" className="flex-1 border-2 border-gray-300 bg-white rounded p-2 text-gray-700" placeholder="Brand name..." value={newBrand} onChange={e => setNewBrand(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newBrand.trim()) { onAddBrand(newBrand); setNewBrand(''); } }} />
              <button onClick={() => { if (newBrand.trim()) { onAddBrand(newBrand); setNewBrand(''); } }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
            </div>
          </div>
        )}
        {synthesisOption === 'new-project-type' && onAddProjectTypeWithPrompt && userRole === 'data-scientist' && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 space-y-3">
            <input type="text" className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700" placeholder="Project type name (required)..." value={newProjectType} onChange={e => setNewProjectType(e.target.value)} />
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide pt-1">Prompt elements — fill any that apply</p>
            {[
              { label: 'The Task', hint: 'What is this project type asking personas to do?', value: ptTask, set: setPtTask, rows: 2 },
              { label: 'What It Is', hint: 'Key characteristics — one per line (becomes a bullet list)', value: ptWhatItIs, set: setPtWhatItIs, rows: 3 },
              { label: 'What It Is Not', hint: 'Common confusions to avoid — one per line', value: ptWhatItIsNot, set: setPtWhatItIsNot, rows: 3 },
              { label: 'How the Session Works', hint: 'Describe the round structure, e.g. Round 1 — Generation: ... Round 2+ — Debate: ...', value: ptHowItWorks, set: setPtHowItWorks, rows: 3 },
              { label: 'Focus Areas / Evaluation Criteria', hint: 'What should be assessed — one per line (becomes a bullet list)', value: ptFocusAreas, set: setPtFocusAreas, rows: 3 },
              { label: 'Scoring Criteria', hint: 'Dimensions to score, e.g. Brand Truth, Cultural Relevance, Longevity — with scale if needed', value: ptScoring, set: setPtScoring, rows: 2 },
              { label: 'Output Format', hint: 'How should responses be structured? e.g. "Format: Action 1: [Name] — [Description] — [Rationale]"', value: ptOutputFormat, set: setPtOutputFormat, rows: 2 },
              { label: 'Additional Prompt Text', hint: 'Any other instructions not covered above', value: newProjectTypePrompt, set: setNewProjectTypePrompt, rows: 3 },
            ].map(({ label, hint, value, set, rows }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <textarea
                  rows={rows}
                  className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 text-sm resize-y"
                  placeholder={hint}
                  value={value}
                  onChange={e => set(e.target.value)}
                />
              </div>
            ))}
            <button
              onClick={async () => {
                const toBullets = (text: string) =>
                  text.trim().split('\n').map(l => l.trim()).filter(Boolean).map(l => `- ${l}`).join('\n');
                const sections: string[] = [];
                if (ptTask.trim()) sections.push(`THE TASK: ${ptTask.trim()}`);
                if (ptWhatItIs.trim()) sections.push(`WHAT IT IS:\n${toBullets(ptWhatItIs)}`);
                if (ptWhatItIsNot.trim()) sections.push(`WHAT IT IS NOT:\n${toBullets(ptWhatItIsNot)}`);
                if (ptHowItWorks.trim()) sections.push(`HOW THIS SESSION WORKS:\n${ptHowItWorks.trim()}`);
                if (ptFocusAreas.trim()) sections.push(`FOCUS AREAS:\n${toBullets(ptFocusAreas)}`);
                if (ptScoring.trim()) sections.push(`SCORING CRITERIA:\n${ptScoring.trim()}`);
                if (ptOutputFormat.trim()) sections.push(`OUTPUT FORMAT:\n${ptOutputFormat.trim()}`);
                if (newProjectTypePrompt.trim()) sections.push(newProjectTypePrompt.trim());
                const assembled = sections.join('\n\n');
                if (newProjectType.trim() && assembled.trim()) {
                  await onAddProjectTypeWithPrompt(newProjectType.trim(), assembled);
                  setNewProjectType(''); setNewProjectTypePrompt('');
                  setPtTask(''); setPtWhatItIs(''); setPtWhatItIsNot('');
                  setPtHowItWorks(''); setPtFocusAreas(''); setPtScoring(''); setPtOutputFormat('');
                }
              }}
              disabled={!newProjectType.trim() || !(ptTask || ptWhatItIs || ptWhatItIsNot || ptHowItWorks || ptFocusAreas || ptScoring || ptOutputFormat || newProjectTypePrompt).trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >Add Project Type</button>
          </div>
        )}
        {synthesisOption === 'new-project-type' && userRole !== 'data-scientist' && <div className="bg-red-50 border-2 border-red-200 rounded p-4"><p className="text-red-900 text-sm">❌ Only Data Scientists can create new project types.</p></div>}
        {synthesisOption === 'new-synthesis' && (
          <div className="space-y-4">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
              <label className="block text-gray-900 mb-3">2. Select Brand</label>
              <select className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-purple-500" value={selectedBrand} onChange={e => { setSelectedBrand(e.target.value); setSelectedDatabricksFiles([]); }}>
                <option value="">-- Select Brand --</option>
                {availableBrands.map((b, i) => <option key={i} value={b}>{b}</option>)}
              </select>
            </div>
            {selectedBrand && (
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                <label className="block text-gray-900 mb-3">3. Select Project Type</label>
                <select className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-purple-500" value={selectedProjectType} onChange={e => { setSelectedProjectType(e.target.value); setSelectedDatabricksFiles([]); }}>
                  <option value="">-- Select Project Type --</option>
                  {availableProjectTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {selectedBrand && selectedProjectType && (
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                <label className="block text-gray-900 mb-3">4. Select Research Files</label>
                {(() => {
                  const brandLower = selectedBrand.toLowerCase();
                  const ptLower = selectedProjectType.toLowerCase();
                  // Include files for this brand (case-insensitive) OR files with no brand (general/category)
                  const eligible = researchFiles.filter(f =>
                    f.isApproved &&
                    (!f.brand || f.brand.toLowerCase() === brandLower)
                  );
                  // Sort: matched project type first, then others
                  const matched = eligible.filter(f => (f.projectType || '').toLowerCase() === ptLower);
                  const others  = eligible.filter(f => (f.projectType || '').toLowerCase() !== ptLower);
                  const sorted  = [...matched, ...others];
                  return sorted.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                      {sorted.map((file, idx) => {
                        const isSel = selectedDatabricksFiles.some(sf => sf.id === file.id);
                        const isOtherPT = matched.length > 0 && idx === matched.length;
                        return (
                          <div key={file.id}>
                            {isOtherPT && (
                              <div className="flex items-center gap-2 my-2">
                                <div className="flex-1 border-t border-gray-200" />
                                <span className="text-xs text-gray-400 whitespace-nowrap">Other project types</span>
                                <div className="flex-1 border-t border-gray-200" />
                              </div>
                            )}
                            <div onClick={() => setSelectedDatabricksFiles(prev => isSel ? prev.filter(sf => sf.id !== file.id) : [...prev, file])} className={`p-3 border-2 rounded cursor-pointer ${isSel ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={isSel} onChange={() => {}} className="w-4 h-4" />
                                <span className="text-sm text-gray-900">{file.fileName}</span>
                                {file.projectType && (file.projectType || '').toLowerCase() !== ptLower && <span className="text-xs text-gray-400 ml-auto">{file.projectType}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="text-sm text-gray-500 italic mb-4">No approved files for {selectedBrand}</p>;
                })()}

              </div>
            )}
            {selectedBrand && selectedProjectType && selectedDatabricksFiles.length > 0 && (
              <button onClick={async () => {
                try {
                  setIsProcessing(true);
                  const contents = await Promise.all(selectedDatabricksFiles.map(async f => { try { const r = await readKnowledgeBaseFile(f.id); return { fileName: f.fileName, content: r.content || '' }; } catch { return { fileName: f.fileName, content: '[unavailable]' }; } }));
                  const resp = await fetch('/api/databricks/ai/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `Synthesize for ${selectedBrand} - ${selectedProjectType}:\n\n${contents.map((f, i) => `## ${i+1}. ${f.fileName}\n\n${f.content}`).join('\n\n---\n\n')}`, modelEndpoint: processingModelEndpoint, maxTokens: 8000, temperature: 0.3, userEmail, userRole }) });
                  if (!resp.ok) throw new Error(resp.statusText);
                  const result = await resp.json();
                  const content = result.content || result.response || 'Synthesis failed';
                  setAiModal({ isOpen: true, title: `Synthesis: ${selectedBrand} - ${selectedProjectType}`, content });
                  const fname = `Synthesis_${selectedBrand}_${selectedProjectType}_${Date.now()}.txt`;
                  await uploadToKnowledgeBase({ file: new File([content], fname, { type: 'text/plain' }), brand: selectedBrand, projectType: selectedProjectType, fileType: 'Synthesis', scope: 'brand', tags: ['synthesis', 'ai-generated'], userEmail, userRole });
                  alert(`✅ Synthesis created: ${fname}`);
                  setSelectedBrand(''); setSelectedProjectType(''); setSelectedDatabricksFiles([]);
                } catch (e) { alert(`❌ Synthesis failed: ${e instanceof Error ? e.message : 'Unknown'}`); }
                finally { setIsProcessing(false); }
              }} disabled={isProcessing} className="w-full px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center gap-2">
                {isProcessing && <SpinHex className="w-5 h-5" />}
                {isProcessing ? 'Generating...' : 'Execute - New Synthesis'}
              </button>
            )}
          </div>
        )}
        {synthesisOption === 'edit-existing' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
            <label className="block text-gray-900 mb-3">2. Select file to edit</label>
            <select className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700" value={synthesisResponses.editFile || ''} onChange={e => { const id = e.target.value; handleSynthesisQuestionChange('editFile', id); if (id) { const f = researchFiles.find(f => f.id === id); if (f) { setEditingFile(f); setEditedContent(f.content || ''); setShowEditPopup(true); } } }}>
              <option value="">-- Select file --</option>
              {researchFiles.map((f, i) => <option key={i} value={f.id}>{f.fileName}</option>)}
            </select>
          </div>
        )}
        {synthesisOption === 'review-edits' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
            <h3 className="text-gray-900 mb-4">Suggested Edits</h3>
            {editSuggestions.length === 0 ? <div className="text-center py-8 text-gray-500">No edit suggestions yet.</div> : editSuggestions.map(s => (
              <div key={s.id} className={`border-2 rounded-lg p-4 mb-3 ${s.status === 'pending' ? 'border-orange-300 bg-orange-50' : s.status === 'reviewed' ? 'border-blue-300 bg-blue-50' : 'border-green-300 bg-green-50'}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div><span className="text-gray-900">{s.fileName}</span><span className={`ml-2 px-2 py-0.5 rounded text-xs ${s.status === 'pending' ? 'bg-orange-100 text-orange-800' : s.status === 'reviewed' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{s.status.toUpperCase()}</span></div>
                  {s.status === 'pending' && onUpdateSuggestionStatus && <div className="flex gap-2"><button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm" onClick={() => onUpdateSuggestionStatus(s.id, 'reviewed')}>Reviewed</button><button className="px-3 py-1.5 bg-green-600 text-white rounded text-sm" onClick={() => onUpdateSuggestionStatus(s.id, 'implemented')}>Implemented</button></div>}
                </div>
                <div className="bg-white border border-gray-300 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap">{s.suggestion}</div>
              </div>
            ))}
          </div>
        )}
        <DatabricksFileBrowser open={showDatabricksBrowser} onClose={() => setShowDatabricksBrowser(false)} onFilesSelected={handleDatabricksFilesSelected} userRole={canApproveResearch ? 'researcher' : 'non-researcher'} />
        {showEditPopup && editingFile && (
          <div className="fixed inset-y-0 left-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ right: 'var(--modal-r)', padding: 'var(--modal-p)' }}>
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-xl font-semibold text-gray-900">Edit: {editingFile.fileName}</h2></div>
              <div className="flex-1 overflow-y-auto px-6 py-4"><textarea className="w-full h-96 border-2 border-gray-300 bg-white rounded p-4 text-gray-700 font-mono text-sm focus:outline-none focus:border-purple-500" value={editedContent} onChange={e => setEditedContent(e.target.value)} /></div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => { setShowEditPopup(false); setEditingFile(null); setEditedContent(''); setSynthesisResponses(prev => ({ ...prev, editFile: '' })); }} className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Cancel</button>
                <button onClick={() => { if (onUpdateResearchFile && editingFile) { onUpdateResearchFile(editingFile.id, editedContent); setShowEditPopup(false); setEditingFile(null); setEditedContent(''); setSynthesisResponses(prev => ({ ...prev, editFile: '' })); alert('Saved!'); } }} className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'personas') {
    const PERSONA_HEX_OPTIONS = [
      { id: 'any', label: 'All hexes' },
      { id: 'Luminaries', label: 'Luminaries' },
      { id: 'Colleagues', label: 'Colleagues' },
      { id: 'cultural', label: 'Cultural Voices' },
      { id: 'Consumers', label: 'Consumers' },
    ];

    return (
      <div className="space-y-4">
        <AIResponseModal {...aiModal} onClose={closeAiModal} />
        <ModeSwitcher current="personas" />
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div><h3 className="text-blue-900 leading-tight">Custom Personas</h3><p className="text-blue-700 text-sm">Create personas that appear in hex assessments for all workspace users</p></div>
          <button onClick={openPersonaCreate} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap">+ New Persona</button>
        </div>

        {customPersonasLoading && <div className="text-center text-gray-500 py-6"><SpinHex className="w-6 h-6 mx-auto mb-2" />Loading personas…</div>}

        {!customPersonasLoading && customPersonas.length === 0 && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-3">No custom personas yet.</p>
            <button onClick={openPersonaCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Create your first persona</button>
          </div>
        )}

        {!customPersonasLoading && customPersonas.map(p => (
          <div key={p.personaId} className="bg-white border-2 border-gray-200 rounded-lg p-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-900 font-semibold">{p.name}</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {p.hexIds === 'any' ? 'All hexes' : p.hexIds.split(',').map(id => PERSONA_HEX_OPTIONS.find(o => o.id === id.trim())?.label || id.trim()).join(', ')}
                </span>
              </div>
              {(p.contentJson as any).context && <p className="text-gray-600 text-sm mt-1 line-clamp-2">{(p.contentJson as any).context}</p>}
              <p className="text-gray-400 text-xs mt-1">Created by {p.createdBy} · {new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => openPersonaEdit(p)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDeletePersona(p.personaId, p.name)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}

        {/* Persona create/edit modal */}
        {showPersonaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" style={{ right: 'var(--modal-r)' }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-gray-900 font-semibold modal-heading">{editingPersona ? 'Edit Persona' : 'New Persona'}</h2>
                <button onClick={() => { setShowPersonaModal(false); setEditingPersona(null); resetPersonaForm(); }} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">All fields except Name are optional — leave blank if not needed. Blanks are fine.</p>

                <div>
                  <label className="block text-gray-900 font-semibold text-sm mb-1">Name <span className="text-red-500">*</span></label>
                  <input type="text" value={personaForm.name} onChange={e => setPersonaForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-400" placeholder="e.g. The Skeptical Consumer" />
                </div>

                <div>
                  <label className="block text-gray-900 font-semibold text-sm mb-1">Role / Background <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea value={personaForm.background} onChange={e => setPersonaForm(f => ({ ...f, background: e.target.value }))} rows={2} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm resize-y focus:outline-none focus:border-blue-400" placeholder="Who are they? What is their professional background or life context?" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-900 font-semibold text-sm mb-1">Tone <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="text" value={personaForm.tone} onChange={e => setPersonaForm(f => ({ ...f, tone: e.target.value }))} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-400" placeholder="e.g. Direct, warm, cynical" />
                  </div>
                  <div>
                    <label className="block text-gray-900 font-semibold text-sm mb-1">Communication Style <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="text" value={personaForm.style} onChange={e => setPersonaForm(f => ({ ...f, style: e.target.value }))} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-400" placeholder="e.g. Data-driven, storytelling" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-900 font-semibold text-sm mb-1">What they champion <span className="text-gray-400 font-normal">(optional — one per line)</span></label>
                  <textarea value={personaForm.praises} onChange={e => setPersonaForm(f => ({ ...f, praises: e.target.value }))} rows={3} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm resize-y focus:outline-none focus:border-blue-400" placeholder="Ideas, values or qualities they praise and support" />
                </div>

                <div>
                  <label className="block text-gray-900 font-semibold text-sm mb-1">What they reject <span className="text-gray-400 font-normal">(optional — one per line)</span></label>
                  <textarea value={personaForm.dislikes} onChange={e => setPersonaForm(f => ({ ...f, dislikes: e.target.value }))} rows={3} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm resize-y focus:outline-none focus:border-blue-400" placeholder="Things they criticise, push back on, or won't accept" />
                </div>

                <div>
                  <label className="block text-gray-900 font-semibold text-sm mb-1">Questions they always ask <span className="text-gray-400 font-normal">(optional — one per line)</span></label>
                  <textarea value={personaForm.alwaysAsks} onChange={e => setPersonaForm(f => ({ ...f, alwaysAsks: e.target.value }))} rows={3} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm resize-y focus:outline-none focus:border-blue-400" placeholder="Recurring challenges or questions they raise in every review" />
                </div>

                <div>
                  <label className="block text-gray-900 font-semibold text-sm mb-1">How they evaluate ideas <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea value={personaForm.reactsToIdeas} onChange={e => setPersonaForm(f => ({ ...f, reactsToIdeas: e.target.value }))} rows={2} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm resize-y focus:outline-none focus:border-blue-400" placeholder="How do they approach new ideas? What lens do they use?" />
                </div>

                <div>
                  <label className="block text-gray-900 font-semibold text-sm mb-1">Scoring lens <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea value={personaForm.scoringLens} onChange={e => setPersonaForm(f => ({ ...f, scoringLens: e.target.value }))} rows={2} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm resize-y focus:outline-none focus:border-blue-400" placeholder="What criteria do they use to rate or score work?" />
                </div>

                <div>
                  <label className="block text-gray-900 font-semibold text-sm mb-1">Available in</label>
                  <div className="flex flex-wrap gap-2">
                    {PERSONA_HEX_OPTIONS.map(opt => (
                      <label key={opt.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="hexIds"
                          value={opt.id}
                          checked={personaForm.hexIds === opt.id}
                          onChange={() => setPersonaForm(f => ({ ...f, hexIds: opt.id }))}
                          className="w-3.5 h-3.5"
                        />
                        <span className="text-sm text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button onClick={() => { setShowPersonaModal(false); setEditingPersona(null); resetPersonaForm(); }} className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={handleSavePersona} disabled={!personaForm.name.trim() || isSavingPersona} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 text-sm font-semibold">
                  {isSavingPersona ? <><SpinHex className="w-4 h-4" />Saving…</> : <><Save className="w-4 h-4" />{editingPersona ? 'Update' : 'Save Persona'}</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'workspace') {
    return (
      <div className="space-y-4">
        <AIResponseModal {...aiModal} onClose={closeAiModal} />
        <ModeSwitcher current="workspace" />
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4"><h3 className="text-orange-900 leading-tight">Workspace Mode</h3><p className="text-orange-700 text-sm">Advanced operations — Admin &amp; Data Scientist</p></div>
        <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
          <label className="block text-gray-900 mb-3">Upload Files</label>
          <label className="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 cursor-pointer"><Upload className="w-5 h-5" />Upload Files<input type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.ppt,.pptx" multiple className="hidden" onChange={handleUploadToDatabricks} /></label>
        </div>
        {showDatabricksBrowser && <DatabricksFileBrowser onClose={() => setShowDatabricksBrowser(false)} onSelectFiles={files => { setSelectedDatabricksFiles(files); setShowDatabricksBrowser(false); }} brand={brand} projectType={projectType} allowMultiSelect={true} />}
      </div>
    );
  }

  if (mode === 'custom-prompt') {
    if (cpView === 'create' || cpView === 'edit') {
      return (
        <div className="space-y-4">
          <AIResponseModal {...aiModal} onClose={closeAiModal} />
          <ModeSwitcher current="custom-prompt" />
          <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4 flex items-center justify-between"><h3 className="text-teal-900 font-semibold">{cpView === 'create' ? 'Create Prompt' : 'Edit Prompt'}</h3><button onClick={() => { setCpView('list'); setCpActivePrompt(null); setCpPromptName(''); setCpPromptText(''); }} className="text-teal-600 text-sm underline">← Back</button></div>
          <div className="bg-white border-2 border-gray-300 rounded-lg p-5 space-y-4">
            <div><label className="block text-gray-900 font-semibold text-sm mb-1">Name *</label><input type="text" value={cpPromptName} onChange={e => setCpPromptName(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-teal-400" /></div>
            <div><label className="block text-gray-900 font-semibold text-sm mb-1">Prompt *</label><textarea value={cpPromptText} onChange={e => setCpPromptText(e.target.value)} rows={8} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm resize-y focus:outline-none focus:border-teal-400 font-mono" /></div>
            <div className="flex gap-3"><button onClick={handleCpSavePrompt} disabled={!cpPromptName.trim() || !cpPromptText.trim()} className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 text-sm font-semibold"><Save className="w-4 h-4" />{cpView === 'create' ? 'Save' : 'Update'}</button><button onClick={() => { setCpView('list'); setCpActivePrompt(null); setCpPromptName(''); setCpPromptText(''); }} className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-lg text-sm">Cancel</button></div>
          </div>
        </div>
      );
    }
    if (cpView === 'run' && cpActivePrompt) {
      return (
        <div className="space-y-4">
          <AIResponseModal {...aiModal} onClose={closeAiModal} />
          <ModeSwitcher current="custom-prompt" />
          <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4 flex items-center justify-between"><h3 className="text-teal-900 font-semibold">Run: {cpActivePrompt.name}</h3><button onClick={() => { setCpView('list'); setCpActivePrompt(null); setCpResult(null); setCpError(null); setCpSelectedFiles([]); setCpRunInput(''); }} className="text-teal-600 text-sm underline">← Back</button></div>
          <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3"><h4 className="text-gray-900 font-semibold text-sm">Select KB Files *</h4><span className="text-xs text-gray-500">{cpSelectedFiles.length}/{cpApprovedFiles.length}</span></div>
            {cpApprovedFiles.length === 0 ? <div className="bg-yellow-50 border-2 border-yellow-200 rounded p-3 text-yellow-800 text-sm">No approved files.</div> : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cpApprovedFiles.map(f => <label key={f.id} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${cpSelectedFiles.includes(f.id) ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-white'}`}><input type="checkbox" checked={cpSelectedFiles.includes(f.id)} onChange={() => { setCpSelectedFiles(prev => prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id]); setCpError(null); }} className="mt-0.5 accent-teal-600" /><div><p className="text-sm text-gray-900 font-medium truncate">{f.fileName}</p><p className="text-xs text-gray-500">{f.brand} · {f.projectType}</p></div></label>)}
              </div>
            )}
          </div>
          <div className="bg-white border-2 border-gray-300 rounded-lg p-4"><label className="block text-gray-900 font-semibold text-sm mb-1">Additional Context (optional)</label><textarea value={cpRunInput} onChange={e => setCpRunInput(e.target.value)} rows={3} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 text-sm resize-y focus:outline-none focus:border-teal-400" /></div>
          {cpError && <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3"><X className="w-5 h-5 text-red-600 flex-shrink-0" /><p className="text-red-700 text-sm">{cpError}</p></div>}
          <div className="flex gap-3">
            <button onClick={() => handleCpRunPrompt(cpActivePrompt)} disabled={cpIsRunning || cpSelectedFiles.length === 0} className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 text-sm font-semibold">{cpIsRunning ? <><SpinHex className="w-4 h-4" />Running…</> : <><Bot className="w-4 h-4" />Run Prompt</>}</button>
            {cpResult && <button onClick={() => openAiModal(cpActivePrompt.name, cpResult)} className="flex items-center gap-2 px-5 py-2.5 border-2 border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 text-sm"><FileText className="w-4 h-4" />View Full</button>}
          </div>
          {cpResult && <div className="bg-white border-2 border-teal-200 rounded-lg p-5"><div className="flex items-center justify-between mb-3"><h4 className="text-gray-900 font-semibold text-sm flex items-center gap-2"><CircleCheck className="w-4 h-4 text-green-600" />Result</h4><button onClick={() => downloadAsMarkdown(cpActivePrompt.name, cpResult)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg"><Download className="w-3.5 h-3.5" />Download</button></div><div className="max-h-80 overflow-y-auto">{renderMarkdown(cpResult)}</div></div>}
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <AIResponseModal {...aiModal} onClose={closeAiModal} />
        <ModeSwitcher current="custom-prompt" />
        <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4 flex items-center justify-between"><div><h3 className="text-teal-900 font-semibold">Custom Prompt</h3><p className="text-teal-700 text-sm mt-1">Save and run AI prompts against KB files.</p></div><button onClick={() => { setCpView('create'); setCpActivePrompt(null); setCpPromptName(''); setCpPromptText(''); }} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold ml-4"><Sparkles className="w-4 h-4" />New Prompt</button></div>
        {savedPrompts.length === 0 ? <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-10 text-center"><Bot className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No prompts saved yet</p><button onClick={() => { setCpView('create'); setCpActivePrompt(null); setCpPromptName(''); setCpPromptText(''); }} className="inline-flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold mt-4"><Sparkles className="w-4 h-4" />Create First</button></div> : (
          <div className="space-y-3">{savedPrompts.map(p => <div key={p.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-teal-200"><div className="flex items-start justify-between gap-4"><div className="flex-1 min-w-0"><h4 className="text-gray-900 font-semibold text-sm">{p.name}</h4><p className="text-gray-500 text-xs mt-0.5">Created {new Date(p.createdAt).toLocaleDateString()}</p><p className="text-gray-600 text-sm mt-2 line-clamp-2 font-mono bg-gray-50 rounded p-2 border border-gray-100">{p.prompt.length > 160 ? p.prompt.slice(0, 160) + '…' : p.prompt}</p></div><div className="flex items-center gap-2 flex-shrink-0"><button onClick={() => { setCpActivePrompt(p); setCpSelectedFiles([]); setCpRunInput(''); setCpResult(null); setCpError(null); setCpView('run'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold"><Bot className="w-3.5 h-3.5" />Run</button><button onClick={() => { setCpActivePrompt(p); setCpPromptName(p.name); setCpPromptText(p.prompt); setCpView('edit'); }} className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-teal-300 text-xs"><Edit className="w-3.5 h-3.5" />Edit</button><button onClick={() => handleCpDeletePrompt(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-gray-300 text-gray-500 rounded-lg hover:border-red-300 hover:text-red-600 text-xs"><Trash2 className="w-3.5 h-3.5" />Delete</button></div></div></div>)}</div>
        )}
      </div>
    );
  }

  return <><AIResponseModal {...aiModal} onClose={closeAiModal} /></>;
}
