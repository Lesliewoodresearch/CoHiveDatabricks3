import { useState, useEffect, useRef, useCallback } from 'react';
import { X, CircleCheck, CircleAlert, BookOpen, Tag, Globe, Building2, Maximize2, Minimize2 } from 'lucide-react';
import gemIcon from 'figma:asset/53dc6cf554f69e479cfbd60a46741f158d11dd21.png';
import { GemCheckCoalReviewPanel, CoalIcon, type ReviewItem } from './GemCheckCoalReviewPanel';
import { saveGem, readKnowledgeBaseFile } from '../utils/databricksAPI';
import { getValidSession } from '../utils/databricksAuth';
import { LoadingGem, SpinHex } from './LoadingGem';
import { executeAIPrompt } from '../utils/databricksAI';
import type { StoryCategory, StorySubtype } from '../data/storyTypes';
import type { KbMode, Scope, IterationGem } from './AssessmentModal';

interface ResearchFile {
  id: string;
  brand: string;
  projectType: string;
  fileName: string;
  isApproved: boolean;
  uploadDate: number;
  fileType: string;
  content?: string;
  scope?: 'general' | 'category' | 'brand';
}

interface StoryRound {
  roundNumber: number;
  label: string;
  content: string;
}

interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: string;
  projectType: string;
  projectTypePrompt?: string;
  category: StoryCategory;
  subtype: StorySubtype;
  researchFiles: ResearchFile[];
  kbFileNames: string[];
  userEmail: string;
  userRole?: string;
  modelEndpoint?: string;
  iterationGems?: IterationGem[];
  iterationChecks?: Array<{ text: string; hexId: string; hexLabel: string }>;
  iterationCoal?: Array<{ text: string; hexId: string; hexLabel: string }>;
  iterationDirections?: string[];
  onGemSaved?: (gem: IterationGem) => void;
  onReviewConfirmed?: (items: ReviewItem[]) => void;
  onAcceptResults?: (results: { rounds: StoryRound[]; hexId: string; hexLabel: string }) => void;
}

// ─── KB / Scope config (mirrors AssessmentModal) ──────────────────────────────

const KB_MODE_OPTIONS: { value: KbMode; label: string; description: string; activeClasses: string }[] = [
  {
    value: 'hard-forbidden',
    label: 'Knowledge Base Only',
    description: 'Every claim must come from KB files — general knowledge strictly forbidden',
    activeClasses: 'bg-red-50 border-red-400 text-red-800',
  },
  {
    value: 'strong-preference',
    label: 'Knowledge Base Preferred',
    description: 'Strongly prefer KB — general knowledge only when KB is completely silent',
    activeClasses: 'bg-amber-50 border-amber-400 text-amber-800',
  },
  {
    value: 'equal-weight',
    label: 'Knowledge Base + General',
    description: 'KB and general knowledge equally weighted — all claims cited',
    activeClasses: 'bg-blue-50 border-blue-400 text-blue-800',
  },
];

const SCOPE_OPTIONS: { value: Scope; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'brand', label: 'Brand', description: 'Brand-specific data only', icon: <Building2 className="w-3.5 h-3.5" /> },
  { value: 'category', label: 'Category', description: 'Brand + category benchmarks', icon: <Tag className="w-3.5 h-3.5" /> },
  { value: 'general', label: 'General', description: 'Broad market + brand + category', icon: <Globe className="w-3.5 h-3.5" /> },
];

// ─── Story prompt builder ─────────────────────────────────────────────────────

function buildStoryPrompt(params: {
  brand: string;
  projectType: string;
  projectTypePrompt?: string;
  category: StoryCategory;
  subtype: StorySubtype;
  kbMode: KbMode;
  scope: Scope;
  kbContent: string;
  roundIndex: number;
  iterationDirections?: string[];
}): { systemPrompt: string; prompt: string } {
  const { brand, projectType, projectTypePrompt, category, subtype, kbMode, scope, kbContent, roundIndex, iterationDirections } = params;

  const hasKbContent = kbContent.trim().length > 0;

  const kbInstruction = !hasKbContent
    ? 'No Knowledge Base files were loaded. Use your general knowledge about the brand carefully and conservatively — do not invent product names, campaigns, or attributes that you are not confident are real.'
    : kbMode === 'hard-forbidden'
    ? 'You MUST draw exclusively from the provided Knowledge Base content below. General knowledge is strictly forbidden. Every brand name, product name, campaign, attribute, and claim must come directly from the KB files. If a detail is not in the KB, omit it rather than invent it.'
    : kbMode === 'strong-preference'
    ? 'The provided Knowledge Base content is your primary source. Ground all brand-specific details — names, products, campaigns, attributes — in the KB files. Only supplement with general knowledge when the KB is completely silent on a topic, and flag when you do.'
    : 'Ground all brand-specific details — names, products, campaigns, attributes — in the provided Knowledge Base content. You may supplement with general market knowledge, but every specific brand claim must be traceable to the KB files.';

  const scopeInstruction = scope === 'brand'
    ? `Focus exclusively on ${brand} brand data and brand-specific insights.`
    : scope === 'category'
    ? `Draw from ${brand} brand data and broader category benchmarks.`
    : `Draw from ${brand} brand data, category context, and broad market knowledge.`;

  const isDualPOV = subtype.dualPOV;
  const povLabel = isDualPOV
    ? roundIndex === 0
      ? "Tell the story from the PROTAGONIST's perspective — the hero, the brand, the challenger, or the one seeking transformation."
      : "Tell the story from the ANTAGONIST or CHALLENGER's perspective — the force of opposition, the incumbent, or the contrasting viewpoint."
    : '';

  const ptContext = projectTypePrompt ? projectTypePrompt.split('\n\n')[0].trim() : '';

  const systemPrompt = `You are a master narrative storyteller creating brand strategy stories for ${brand}.

Your role is to write compelling, structured narrative stories that reveal brand truths through archetypal storytelling frameworks. The stories should be vivid, specific to the brand, and professionally useful as strategic tools.

CRITICAL STORYTELLING PRINCIPLE — apply this to every story without exception:
The CONSUMER (customer, user, audience member) is ALWAYS the protagonist and hero of the story. The brand plays a supporting role as one of two things:
- THE HELPER / GUIDE / MAGIC (the fairy godmother, the mentor, the enabling force): The brand gives the consumer what they need to succeed, enables their transformation, or awakens their potential. The consumer's journey and growth is the story — the brand is the reason it became possible.
- THE VILLAIN / ANTAGONIST / INCUMBENT (the oppressive force, the trap, the thing to overcome): The brand (or a named competitor) is what the consumer must confront, escape from, or outsmart. The consumer's victory is the story.
Never make the brand the protagonist. The brand's power is revealed entirely through what it does FOR or AGAINST the consumer.
${ptContext ? `\nSTRATEGIC CONTEXT — This story is being created in service of the following type of work. Let this shape the story's strategic purpose and what it is designed to reveal:\n${ptContext}` : ''}
KNOWLEDGE BASE GROUNDING — this is non-negotiable:
${kbInstruction}
${hasKbContent ? `You have been given Knowledge Base files below. Read them carefully before writing. Every specific brand detail in your story (product names, campaigns, slogans, consumer insights, competitive facts) must be drawn from those files. Do not substitute fictional or generic brand details when real ones are available in the KB.` : ''}

${scopeInstruction}

Writing style:
- Write in fluid, engaging prose — not bullet points
- Each story step should flow into the next as a continuous narrative
- Be specific: use concrete details drawn from the Knowledge Base
- Stories should be 400–600 words total
- Each story step should be clearly labeled with a heading`;

  const stepsBlock = subtype.steps.map((step, i) =>
    `**Step ${i + 1}: ${step.label}**\n${step.instruction}`
  ).join('\n\n');

  const kbSection = kbContent.trim()
    ? `\n\n## Knowledge Base Content\n${kbContent.trim()}`
    : '';

  const directionsSection = iterationDirections && iterationDirections.length > 0
    ? `\n\n## Additional Focus & Direction\n${iterationDirections.map(d => `- ${d}`).join('\n')}`
    : '';

  const prompt = `Generate a ${subtype.label} story (${category.label} category) for ${brand}.

${isDualPOV ? `**Perspective:** ${povLabel}\n\n` : ''}Project type: ${projectType || 'Brand strategy'}

Follow these story steps exactly:

${stepsBlock}
${kbSection}${directionsSection}

Write the complete story now, with each step as a clearly labeled section. Make it vivid, brand-specific, and strategically useful.`;

  return { systemPrompt, prompt };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StoryModal({
  isOpen,
  onClose,
  brand,
  projectType,
  projectTypePrompt,
  category,
  subtype,
  researchFiles,
  kbFileNames,
  userEmail,
  userRole = 'user',
  modelEndpoint = 'databricks-claude-sonnet-4-6',
  iterationDirections = [],
  onGemSaved,
  onReviewConfirmed,
  onAcceptResults,
}: StoryModalProps) {
  // Settings state — shown before generation starts
  const [showSettings, setShowSettings] = useState(true);
  const [kbMode, setKbMode] = useState<KbMode>('hard-forbidden');
  const [scope, setScope] = useState<Scope>('brand');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [synopsisLoading, setSynopsisLoading] = useState(false);

  const [rounds, setRounds] = useState<StoryRound[]>([]);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading knowledge base files…');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floatingBtn, setFloatingBtn] = useState<{
    x: number; y: number; text: string;
  } | null>(null);
  const [savingGem, setSavingGem] = useState(false);
  const [savingCheck, setSavingCheck] = useState(false);
  const [savingCoal, setSavingCoal] = useState(false);
  const [savedGemItems, setSavedGemItems] = useState<Array<{ text: string }>>([]);
  const [savedCheckItems, setSavedCheckItems] = useState<Array<{ text: string }>>([]);
  const [savedCoalItems, setSavedCoalItems] = useState<Array<{ text: string }>>([]);
  const [gemToasts, setGemToasts] = useState<Array<{ id: string; text: string }>>([]);
  const [checkToasts, setCheckToasts] = useState<Array<{ id: string; text: string }>>([]);
  const [coalToasts, setCoalToasts] = useState<Array<{ id: string; text: string }>>([]);
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  const hexId = 'stories';
  const hexLabel = 'Stories';

  const activeRound = rounds.find(r => r.roundNumber === activeTab);

  const runStory = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setIsRunning(true);
    setError(null);
    setRounds([]);
    setActiveTab(null);

    try {
      // Fetch actual file content from Databricks for selected KB files
      const selectedFiles = researchFiles.filter(
        f => f.isApproved && kbFileNames.includes(f.fileName)
      );

      setLoadingMessage('Loading knowledge base files…');

      const fileContents = await Promise.all(
        selectedFiles.map(async f => {
          const result = await readKnowledgeBaseFile(f.id);
          if (result.success && result.content?.trim()) {
            // Truncate large files to keep prompt manageable (~3000 chars each)
            const text = result.content.trim();
            const truncated = text.length > 3000 ? text.slice(0, 3000) + '\n[... content truncated ...]' : text;
            return `[FILE: ${f.fileName}]\n${truncated}`;
          }
          return null;
        })
      );

      const kbContent = fileContents.filter(Boolean).join('\n\n---\n\n');

      setLoadingMessage(`Generating ${subtype.label} story…`);

      const totalRounds = subtype.dualPOV ? 2 : 1;
      const generatedRounds: StoryRound[] = [];

      for (let i = 0; i < totalRounds; i++) {
        const roundLabel = totalRounds === 1
          ? subtype.label
          : i === 0 ? `${subtype.label} — Protagonist` : `${subtype.label} — Challenger`;

        const { systemPrompt, prompt } = buildStoryPrompt({
          brand, projectType, projectTypePrompt, category, subtype, kbMode, scope, kbContent, roundIndex: i, iterationDirections,
        });

        const result = await executeAIPrompt({
          prompt, systemPrompt, modelEndpoint, maxTokens: 1200, temperature: 0.75, userEmail, userRole,
        });

        if (!result.success) throw new Error(result.error || 'Story generation failed');

        const round: StoryRound = { roundNumber: i + 1, label: roundLabel, content: result.response };
        generatedRounds.push(round);
        setRounds(prev => [...prev, round]);
        setActiveTab(prev => prev === null ? round.roundNumber : prev);
      }

      setIsComplete(true);

      // Generate synopsis after all rounds complete
      setSynopsisLoading(true);
      try {
        const allContent = generatedRounds.map(r => r.content).join('\n\n') || '';
        const synopsisResult = await executeAIPrompt({
          prompt: `In 2 concise sentences, summarize the following ${subtype.label} story for ${brand}. Focus on the strategic insight it reveals — not on retelling the plot.\n\n${allContent.slice(0, 2000)}`,
          systemPrompt: 'You are a brand strategy editor. Write a crisp 2-sentence strategic synopsis.',
          modelEndpoint,
          maxTokens: 120,
          temperature: 0.4,
          userEmail,
          userRole,
        });
        if (synopsisResult.success) setSynopsis(synopsisResult.response.trim());
      } catch (_) {}
      setSynopsisLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Story generation failed');
    } finally {
      setIsRunning(false);
    }
  }, [brand, projectType, category, subtype, kbMode, scope, researchFiles, kbFileNames, userEmail, userRole, modelEndpoint, iterationDirections]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      hasStarted.current = false;
      setShowSettings(true);
      setKbMode('hard-forbidden');
      setScope('brand');
      setIsFullscreen(false);
      setSynopsis(null);
      setSynopsisLoading(false);
      setRounds([]);
      setActiveTab(null);
      setIsComplete(false);
      setError(null);
      setLoadingMessage('Loading knowledge base files…');
      setFloatingBtn(null);
      setSavedGemItems([]);
      setSavedCheckItems([]);
      setSavedCoalItems([]);
      setShowReviewPanel(false);
    }
  }, [isOpen]);

  // Text selection → floating action buttons
  useEffect(() => {
    const handleSelectionChange = () => {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) { setFloatingBtn(null); return; }
        const text = selection.toString().trim();
        if (text.length < 10) { setFloatingBtn(null); return; }
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (!range || !contentRef.current?.contains(range.commonAncestorContainer)) { setFloatingBtn(null); return; }
        const rect = range.getBoundingClientRect();
        setFloatingBtn({ x: rect.left + rect.width / 2, y: rect.bottom, text });
      }, 50);
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (floatingBtn && (e.key === 'Enter' || (e.key === 's' && (e.metaKey || e.ctrlKey)))) { e.preventDefault(); handleSaveGem(); }
      if (e.key === 'Escape') { setFloatingBtn(null); window.getSelection()?.removeAllRanges(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [floatingBtn]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) { setFloatingBtn(null); return; }
    const text = selection.toString().trim();
    if (text.length < 10) { setFloatingBtn(null); return; }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setFloatingBtn({ x: rect.left + rect.width / 2, y: rect.bottom, text });
  }, []);

  const handleSaveGem = async () => {
    if (!floatingBtn) return;
    setSavingGem(true);
    try {
      const session = await getValidSession();
      if (!session) throw new Error('Not authenticated');
      const result = await saveGem({ gemText: floatingBtn.text, assessmentType: subtype.label, hexId, hexLabel, brand, projectType, createdBy: userEmail, accessToken: session.accessToken, workspaceHost: session.workspaceHost });
      if (result.success) {
        setSavedGemItems(prev => [...prev, { text: floatingBtn.text }]);
        onGemSaved?.({ gemText: floatingBtn.text, fileName: null, hexId, hexLabel });
        const toastId = Date.now().toString();
        setGemToasts(prev => [...prev, { id: toastId, text: floatingBtn.text.substring(0, 60) + (floatingBtn.text.length > 60 ? '…' : '') }]);
        setTimeout(() => setGemToasts(prev => prev.filter(t => t.id !== toastId)), 3500);
      } else throw new Error(result.error || 'Save failed');
    } catch (err) {
      alert(`Failed to save gem: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingGem(false);
      setFloatingBtn(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleSaveCoal = () => {
    if (!floatingBtn) return;
    setSavingCoal(true);
    try {
      const existing = JSON.parse(localStorage.getItem('cohive_coal') || '[]');
      localStorage.setItem('cohive_coal', JSON.stringify([...existing, { id: Date.now().toString(), text: floatingBtn.text, hexId, hexLabel, timestamp: Date.now() }]));
      setSavedCoalItems(prev => [...prev, { text: floatingBtn.text }]);
      const toastId = `coal-${Date.now()}`;
      setCoalToasts(prev => [...prev, { id: toastId, text: floatingBtn.text.substring(0, 60) + (floatingBtn.text.length > 60 ? '…' : '') }]);
      setTimeout(() => setCoalToasts(prev => prev.filter(t => t.id !== toastId)), 3500);
      setFloatingBtn(null);
      window.getSelection()?.removeAllRanges();
    } finally { setSavingCoal(false); }
  };

  const handleSaveCheck = () => {
    if (!floatingBtn) return;
    setSavingCheck(true);
    try {
      const existing = JSON.parse(localStorage.getItem('cohive_checks') || '[]');
      localStorage.setItem('cohive_checks', JSON.stringify([...existing, { id: Date.now().toString(), text: floatingBtn.text, hexId, hexLabel, timestamp: Date.now() }]));
      setSavedCheckItems(prev => [...prev, { text: floatingBtn.text }]);
      const toastId = `check-${Date.now()}`;
      setCheckToasts(prev => [...prev, { id: toastId, text: floatingBtn.text.substring(0, 60) + (floatingBtn.text.length > 60 ? '…' : '') }]);
      setTimeout(() => setCheckToasts(prev => prev.filter(t => t.id !== toastId)), 3500);
      setFloatingBtn(null);
      window.getSelection()?.removeAllRanges();
    } finally { setSavingCheck(false); }
  };

  const handleAcceptAndClose = () => {
    const items: ReviewItem[] = [
      ...savedGemItems.map((g, i) => ({ id: `gem-${i}`, type: 'gem' as const, text: g.text, hexId, hexLabel, included: true, rank: i })),
      ...savedCheckItems.map((c, i) => ({ id: `check-${i}`, type: 'check' as const, text: c.text, hexId, hexLabel, included: true, rank: i })),
      ...savedCoalItems.map((c, i) => ({ id: `coal-${i}`, type: 'coal' as const, text: c.text, hexId, hexLabel, included: true, rank: i })),
    ];
    if (items.length > 0) {
      setShowReviewPanel(true);
    } else {
      onAcceptResults?.({ rounds, hexId, hexLabel });
      onClose();
    }
  };

  const handleReviewConfirmed = (items: ReviewItem[]) => {
    onReviewConfirmed?.(items);
    onAcceptResults?.({ rounds, hexId, hexLabel });
    setShowReviewPanel(false);
    onClose();
  };

  if (!isOpen) return null;

  if (showReviewPanel) {
    const reviewItems: ReviewItem[] = [
      ...savedGemItems.map((g, i) => ({ id: `gem-${i}`, type: 'gem' as const, text: g.text, hexId, hexLabel, included: true, rank: i })),
      ...savedCheckItems.map((c, i) => ({ id: `check-${i}`, type: 'check' as const, text: c.text, hexId, hexLabel, included: true, rank: i })),
      ...savedCoalItems.map((c, i) => ({ id: `coal-${i}`, type: 'coal' as const, text: c.text, hexId, hexLabel, included: true, rank: i })),
    ];
    return (
      <GemCheckCoalReviewPanel
        isOpen={true}
        items={reviewItems}
        brand={brand}
        projectType={projectType}
        hexLabel={hexLabel}
        userEmail={userEmail}
        userRole={userRole}
        onConfirm={handleReviewConfirmed}
        onClose={() => setShowReviewPanel(false)}
      />
    );
  }

  // ── Settings panel (shown before generation) ────────────────────────────────
  if (showSettings) {
    const activeKbOption = KB_MODE_OPTIONS.find(o => o.value === kbMode) ?? KB_MODE_OPTIONS[2];
    const activeScopeOption = SCOPE_OPTIONS.find(o => o.value === scope) ?? SCOPE_OPTIONS[0];

    return (
      <div className="fixed inset-y-0 left-0 z-50 flex items-center justify-center"
        style={isFullscreen ? { inset: 0, padding: 0, backgroundColor: 'rgba(0,0,0,0.6)' } : { right: 'var(--modal-r)', padding: '4px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
        <div className="bg-white flex flex-col w-full"
          style={isFullscreen ? { width: '100%', height: '100%', borderRadius: 0 } : { maxWidth: '600px', maxHeight: '90vh', borderRadius: '0.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

          {/* Header */}
          <div className="bg-white border-b-2 border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0"
            style={{ borderRadius: isFullscreen ? 0 : '0.75rem 0.75rem 0 0' }}>
            <div>
              <h2 className="text-gray-900 font-semibold modal-heading">Story Settings</h2>
              <p className="text-gray-500 text-sm mt-0.5">{brand} · {category.label} · {subtype.label}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsFullscreen(f => !f)} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={onClose} aria-label="Close" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Story info */}
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-800 font-medium mb-1">
                {subtype.label} · {subtype.arcDescription}
              </p>
              <p className="text-xs text-purple-600">
                {subtype.steps.length} steps · {subtype.dualPOV ? '2 rounds (dual perspective)' : '1 round'}
              </p>
            </div>

            {/* KB Mode */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <label className="block text-sm font-semibold text-gray-800">Knowledge Base Usage</label>
              </div>
              <p className="text-xs text-gray-500 mb-3">Controls how strictly the story draws from your KB files.</p>
              <div className="space-y-2">
                {KB_MODE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setKbMode(opt.value)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${kbMode === opt.value ? opt.activeClasses : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${kbMode === opt.value ? 'border-current' : 'border-gray-300'}`}>
                      {kbMode === opt.value && <div className="w-2 h-2 rounded-full bg-current" />}
                    </div>
                    <div>
                      <span className="font-semibold text-sm block">{opt.label}</span>
                      <span className="text-xs opacity-80 leading-snug">{opt.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scope */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Information Scope</label>
              <p className="text-xs text-gray-500 mb-3">How broadly should the story draw when generating?</p>
              <div className="grid grid-cols-3 gap-2">
                {SCOPE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setScope(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-center transition-all ${scope === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className={scope === opt.value ? 'text-blue-600' : 'text-gray-400'}>{opt.icon}</span>
                    <span className={`font-semibold text-xs ${scope === opt.value ? 'text-blue-800' : 'text-gray-700'}`}>{opt.label}</span>
                    <span className="text-xs text-gray-500 leading-tight">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* KB files preview */}
            {kbFileNames.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium mb-2">📚 Knowledge Base files ({kbFileNames.length}):</p>
                <div className="flex flex-wrap gap-1.5">
                  {kbFileNames.map((name, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-600">{name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t-2 border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0"
            style={{ borderRadius: isFullscreen ? 0 : '0 0 0.75rem 0.75rem' }}>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium border ${activeKbOption.activeClasses}`}>
                {activeKbOption.label}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 border border-blue-300 text-blue-800 flex items-center gap-1">
                {activeScopeOption.icon}
                {activeScopeOption.label}
              </span>
            </div>
            <button
              onClick={() => { setShowSettings(false); runStory(); }}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium text-sm"
            >
              Start Story →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Story content ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-y-0 left-0 z-50 flex items-center justify-center"
      style={isFullscreen ? { inset: 0, padding: 0, backgroundColor: 'rgba(0,0,0,0.6)' } : { right: 'var(--modal-r)', padding: '4px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
      <div className="bg-white flex flex-col w-full"
        style={isFullscreen ? { width: '100%', height: '100%', borderRadius: 0 } : { maxWidth: '960px', height: '90vh', borderRadius: '0.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div className="bg-white border-b-2 border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderRadius: isFullscreen ? 0 : '0.75rem 0.75rem 0 0' }}>
          <div>
            <h2 className="text-gray-900 font-semibold modal-heading">
              {category.label} · {subtype.label}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {brand}{subtype.dualPOV ? ' · Dual perspective' : ''}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsFullscreen(f => !f)} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button onClick={onClose} aria-label="Close" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Synopsis */}
        {(synopsis || synopsisLoading) && (
          <div className="px-6 py-3 bg-purple-50 border-b border-purple-100 flex-shrink-0">
            {synopsisLoading ? (
              <p className="text-xs text-purple-400 italic">Generating synopsis…</p>
            ) : (
              <p className="text-sm text-purple-800 leading-snug">{synopsis}</p>
            )}
          </div>
        )}

        {/* Loading */}
        {isRunning && rounds.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
            <LoadingGem size="large" />
            <p className="text-gray-700 font-medium">{loadingMessage}</p>
            <p className="text-gray-400 text-sm">Writing for {brand}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
            <CircleAlert className="w-10 h-10 text-red-500" />
            <p className="text-red-700 font-medium text-center">{error}</p>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300">Close</button>
          </div>
        )}

        {/* Tabs + content */}
        {rounds.length > 0 && (
          <>
            <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-gray-200 overflow-x-auto flex-shrink-0">
              {rounds.map(r => (
                <button key={r.roundNumber} onClick={() => setActiveTab(r.roundNumber)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 transition-colors whitespace-nowrap ${
                    activeTab === r.roundNumber
                      ? 'bg-white text-gray-900 border-gray-300 -mb-px'
                      : 'bg-gray-50 text-gray-500 border-transparent hover:text-gray-700'
                  }`}>
                  {r.label}
                </button>
              ))}
              {isRunning && rounds.length < (subtype.dualPOV ? 2 : 1) && (
                <div className="px-3 py-1.5 text-xs text-gray-400 flex items-center gap-1.5">
                  <SpinHex className="w-3 h-3" /> Generating…
                </div>
              )}
            </div>

            <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-5" onMouseUp={handleMouseUp}>
              {activeRound && (
                <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/40 whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                  {activeRound.content}
                </div>
              )}
            </div>

            {/* Floating gem/check/coal — fixed to viewport so overflow-y:auto can't clip it */}
            {floatingBtn && (
              <div className="fixed z-[60] flex items-center gap-1 bg-white border border-gray-300 rounded-lg shadow-lg px-2 py-1.5"
                style={{ left: floatingBtn.x - 60, top: floatingBtn.y + 8 }}>
                <button onClick={handleSaveGem} disabled={savingGem} title="Save as Gem"
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-yellow-50 text-xs font-medium text-yellow-800 transition-colors">
                  <img src={gemIcon} alt="Gem" className="w-3.5 h-3.5" />
                  {savingGem ? '…' : 'Gem'}
                </button>
                <div className="w-px h-4 bg-gray-300" />
                <button onClick={handleSaveCheck} disabled={savingCheck} title="Save as Track"
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 text-xs font-medium text-green-800 transition-colors">
                  <CircleCheck className="w-3.5 h-3.5" />
                  {savingCheck ? '…' : 'Track'}
                </button>
                <div className="w-px h-4 bg-gray-300" />
                <button onClick={handleSaveCoal} disabled={savingCoal} title="Save as Coal"
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-xs font-medium text-gray-700 transition-colors">
                  <CoalIcon size={14} /> {savingCoal ? '…' : 'Coal'}
                </button>
              </div>
            )}

            {/* Saved counts */}
            {isComplete && (savedGemItems.length + savedCheckItems.length + savedCoalItems.length) > 0 && (
              <div className="px-6 py-2 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                {savedGemItems.length > 0 && (
                  <span className="flex items-center gap-1">
                    <img src={gemIcon} alt="Gems" className="w-3 h-3" />
                    {savedGemItems.length} gem{savedGemItems.length !== 1 ? 's' : ''}
                  </span>
                )}
                {savedCheckItems.length > 0 && (
                  <span className="flex items-center gap-1 text-green-700">
                    <CircleCheck className="w-3 h-3" />
                    {savedCheckItems.length} track{savedCheckItems.length !== 1 ? 's' : ''}
                  </span>
                )}
                {savedCoalItems.length > 0 && (
                  <span className="flex items-center gap-1"><CoalIcon size={13} /> {savedCoalItems.length} coal{savedCoalItems.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            )}

            {isComplete && (
              <div className="bg-white border-t-2 border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0"
                style={{ borderRadius: isFullscreen ? 0 : '0 0 0.75rem 0.75rem' }}>
                <button onClick={onClose}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
                  Discard
                </button>
                <button onClick={handleAcceptAndClose}
                  className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium text-sm">
                  <CircleCheck className="w-4 h-4" />
                  Accept &amp; Close
                </button>
              </div>
            )}
          </>
        )}

        {/* Toasts */}
        <div className="fixed bottom-6 z-60 flex flex-col gap-2 pointer-events-none" style={{ right: 'calc(var(--modal-r) + 20px)' }}>
          {gemToasts.map(t => (
            <div key={t.id} className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 shadow-md text-xs text-yellow-800">
              <img src={gemIcon} alt="Gem" className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="max-w-[200px] truncate">{t.text}</span>
            </div>
          ))}
          {checkToasts.map(t => (
            <div key={t.id} className="flex items-center gap-2 bg-green-50 border border-green-300 rounded-lg px-3 py-2 shadow-md text-xs text-green-800">
              <CircleCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="max-w-[200px] truncate">{t.text}</span>
            </div>
          ))}
          {coalToasts.map(t => (
            <div key={t.id} className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 shadow-md text-xs text-gray-100">
              <CoalIcon size={16} />
              <span className="max-w-[200px] truncate">{t.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
