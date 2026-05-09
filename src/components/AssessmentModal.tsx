/**
 * AssessmentModal
 *
 * Full-screen overlay that:
 * 1. Shows a loading state while AI rounds complete (streaming feel)
 * 2. Displays each round as it arrives via SSE — no waiting for all rounds to finish
 * 3. Allows text highlight → floating "Save as Gem 💎" button
 * 4. Saves gems to Databricks with citation tracking
 * 5. BJS: Shows neutral summary tab after assessment completes
 * 6. v3: Sends kbMode, requestMode, ideaElements, scope to run.js
 *
 * Location: src/components/AssessmentModal.tsx
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  X,
  CircleCheck,
  CircleAlert,
  BookOpen,
  Globe,
  Tag,
  Building2,
} from "lucide-react";
import gemIcon from "figma:asset/53dc6cf554f69e479cfbd60a46741f158d11dd21.png";
import { GemCheckCoalReviewPanel, CoalIcon, type ReviewItem } from "./GemCheckCoalReviewPanel";
import {
  saveGem,
  type AssessmentRound,
  type CitedFile,
} from "../utils/databricksAPI";
import { getValidSession } from "../utils/databricksAuth";
import { availableModels } from "./ModelTemplateManager";
import { LoadingGem, SpinHex } from "./LoadingGem";

// ─── Types ─────────────────────────────────────────────────────────────────────

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

interface FloatingButtonPos {
  x: number;
  y: number;
  text: string;
  fileId: string | null;
  fileName: string | null;
}

interface GemToast {
  id: string;
  text: string;
  fileName: string;
}

interface CoalToast {
  id: string;
  text: string;
}

interface CheckToast {
  id: string;
  text: string;
}

/**
 * A gem saved during the current iteration — accumulated in AssessmentModal
 * and passed to run.js so prompts can reference what's already been highlighted
 * as exemplary this session.
 */
export interface IterationGem {
  gemText: string;
  fileName: string | null;
  hexId: string;
  hexLabel: string;
}

/**
 * A single idea/element when the user loads multiple ideas for comparison.
 * Populated by the parent component from the user's loaded content.
 */
export interface IdeaElement {
  id: string;
  label: string;
  content: string;
}

/**
 * Knowledge Base usage strictness.
 * hard-forbidden  — model may not use general knowledge at all
 * strong-preference — general knowledge only if KB is silent
 * equal-weight    — both sources valid, both must be cited
 */
export type KbMode = "hard-forbidden" | "strong-preference" | "equal-weight";

/**
 * What the user wants to do in this session.
 * Derived by the parent from responses['Enter'][ideasSourceIdx]:
 *   "Get Inspired"        → "get-inspired"
 *   "Load Current Ideas"  → "load-ideas"
 *
 * Never selected inside the modal — always passed in as a prop.
 */
export type RequestMode = "get-inspired" | "load-ideas";

/**
 * How broadly the model should draw when generating/assessing.
 * brand    — brand-specific KB data only
 * category — brand + category benchmarks
 * general  — broad market knowledge + brand + category
 */
export type Scope = "brand" | "category" | "general";

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcceptResults?: (results: {
    rounds: AssessmentRound[];
    citedFiles: CitedFile[];
    summary: string | null;
    hexId: string;
    hexLabel: string;
  }) => void;
  hexId: string;
  hexLabel: string;
  brand: string;
  projectType: string;
  assessmentType: string;
  userSolution: string;
  ideasFile: {
    fileName: string;
    content: string; // Base64 encoded
    fileType: string;
  } | null;
  selectedPersonas: string[];
  kbFileNames: string[];
  researchFiles: ResearchFile[];
  modelEndpoint?: string;
  userEmail?: string;
  projectTypeConfigs?: { projectType: string; prompt: string }[];

  // ── v3 additions ──────────────────────────────────────────────────────────
  /** Multiple idea elements when user has loaded 2+ ideas for comparison */
  ideaElements?: IdeaElement[];
  /** Pre-configured KB mode — if not provided, user selects in modal */
  defaultKbMode?: KbMode;
  /**
   * Request mode — REQUIRED, derived by parent from Enter hex responses.
   *   responses['Enter'][baseQuestions.indexOf('Ideas Source')]
   *   "Get Inspired"       → "get-inspired"
   *   "Load Current Ideas" → "load-ideas"
   */
  requestMode: RequestMode;
  /** Pre-configured scope — if not provided, user selects in modal */
  defaultScope?: Scope;
  /** Number of debate rounds (1–3) */
  numDebateRounds?: number;
  /**
   * All hex executions for this iteration, keyed by hexId.
   * Passed from ProcessWireframe so run.js can inject prior hex results
   * into prompts as "what this iteration has already established."
   */
  hexExecutions?: Record<string, Array<{
    id: string;
    selectedFiles: string[];
    assessmentType: string[];
    assessment: string;
    timestamp: number;
  }>>;
  /**
   * Gems accumulated so far in this iteration — owned by ProcessWireframe,
   * persists across multiple modal opens within the same iteration.
   */
  iterationGems?: IterationGem[];
  iterationChecks?: Array<{ text: string; hexId: string; hexLabel: string }>;
  iterationCoal?: Array<{ text: string; hexId: string; hexLabel: string }>;
  iterationDirections?: string[];
  /**
   * Called whenever the user saves a new gem — lets ProcessWireframe
   * accumulate it into the iteration-level gems array.
   */
  onGemSaved?: (gem: IterationGem) => void;
  /** Called when review panel is confirmed — passes all confirmed items */
  onReviewConfirmed?: (items: ReviewItem[]) => void;
  /** Whether the current user can manage Example files */
  canManageExamples?: boolean;
  /** Custom persona data map — id → contentJson — for custom- prefixed persona IDs */
  customPersonaData?: Record<string, unknown>;
}

// ─── KB Mode config ────────────────────────────────────────────────────────────

const KB_MODE_OPTIONS: {
  value: KbMode;
  label: string;
  description: string;
  color: string;
  borderColor: string;
  activeClasses: string;
}[] = [
  {
    value: "hard-forbidden",
    label: "Knowledge Base Only",
    description: "General knowledge strictly forbidden — every claim must come from the KB files",
    color: "text-red-700",
    borderColor: "border-red-300",
    activeClasses: "bg-red-50 border-red-400 text-red-800",
  },
  {
    value: "strong-preference",
    label: "Knowledge Base Preferred",
    description: "Strongly prefer Knowledge Base — general knowledge only when Knowledge Base is completely silent",
    color: "text-amber-700",
    borderColor: "border-amber-300",
    activeClasses: "bg-amber-50 border-amber-400 text-amber-800",
  },
  {
    value: "equal-weight",
    label: "Knowledge Base + General",
    description: "Knowledge Base and general knowledge equally weighted — all claims must be cited",
    color: "text-blue-700",
    borderColor: "border-blue-300",
    activeClasses: "bg-blue-50 border-blue-400 text-blue-800",
  },
];

const SCOPE_OPTIONS: {
  value: Scope;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "brand",
    label: "Brand",
    description: `Brand-specific data only`,
    icon: <Building2 className="w-3.5 h-3.5" />,
  },
  {
    value: "category",
    label: "Category",
    description: "Brand + category benchmarks",
    icon: <Tag className="w-3.5 h-3.5" />,
  },
  {
    value: "general",
    label: "General",
    description: "Broad market + brand + category",
    icon: <Globe className="w-3.5 h-3.5" />,
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function AssessmentModal({
  isOpen,
  onClose,
  onAcceptResults,
  hexId,
  hexLabel,
  brand,
  projectType,
  assessmentType,
  userSolution,
  ideasFile,
  selectedPersonas,
  kbFileNames,
  researchFiles,
  modelEndpoint = "databricks-claude-sonnet-4-6",
  userEmail = "",
  projectTypeConfigs = [],
  ideaElements = [],
  defaultKbMode,
  requestMode,           // always from Enter hex — never selected in modal
  defaultScope,
  numDebateRounds = 1,
  hexExecutions = {},
  iterationGems = [],
  iterationChecks = [],
  iterationCoal = [],
  iterationDirections = [],
  onGemSaved,
  onReviewConfirmed,
  canManageExamples = false,
  customPersonaData = {},
}: AssessmentModalProps) {

  // ── Format as Example state ──────────────────────────────────────────────
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [formatExampleFileId, setFormatExampleFileId] = useState('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattedResult, setFormattedResult] = useState<string | null>(null);

  // ── v3 settings state ────────────────────────────────────────────────────
  // requestMode comes from the Enter hex and is never editable here.
  // kbMode and scope are user-selectable in the settings panel unless defaults provided.
  const hasDefaults = !!defaultKbMode && !!defaultScope;

  const [kbMode, setKbMode] = useState<KbMode>(defaultKbMode ?? "kb-only");
  const [scope, setScope] = useState<Scope>(defaultScope ?? "brand");

  // Show settings panel before running if no defaults provided
  const [showSettings, setShowSettings] = useState(!hasDefaults);

  // ── Assessment state ─────────────────────────────────────────────────────
  const [rounds, setRounds] = useState<AssessmentRound[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [citedFiles, setCitedFiles] = useState<CitedFile[]>([]);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());
  const [floatingBtn, setFloatingBtn] = useState<FloatingButtonPos | null>(null);
  const [savingGem, setSavingGem] = useState(false);
  const [savingCoal, setSavingCoal] = useState(false);
  const [savingCheck, setSavingCheck] = useState(false);
  const [gemToasts, setGemToasts] = useState<GemToast[]>([]);
  const [coalToasts, setCoalToasts] = useState<CoalToast[]>([]);
  const [checkToasts, setCheckToasts] = useState<CheckToast[]>([]);
  const [savedGemCount, setSavedGemCount] = useState(0);
  const [savedCoalCount, setSavedCoalCount] = useState(0);
  const [savedCheckCount, setSavedCheckCount] = useState(0);
  // Persistent item lists — survive toast expiry, used to build the review panel
  const [savedGemItems,   setSavedGemItems]   = useState<Array<{ text: string; fileName: string | null }>>([]);
  const [savedCheckItems, setSavedCheckItems] = useState<Array<{ text: string }>>([]);
  const [savedCoalItems,  setSavedCoalItems]  = useState<Array<{ text: string }>>([]);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  // null = no rounds yet; number = that round's tab; "summary" = summary tab
  const [activeTab, setActiveTab] = useState<number | "summary" | null>(null);

  // iterationGems is now owned by ProcessWireframe and passed as a prop —
  // it persists across multiple modal opens within the same iteration.

  // v3 metadata from complete event
  const [sessionMeta, setSessionMeta] = useState<{
    kbMode?: KbMode;
    requestMode?: RequestMode;
    scope?: Scope;
    durationMs?: number;
  }>({});

  const contentRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getModelDisplayName = (modelId: string): string => {
    const model = availableModels.find((m) => m.id === modelId);
    if (model) return `${model.name} · ${model.provider}`;
    return modelId
      .replace("databricks-", "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const getKbModeOption = (mode: KbMode) =>
    KB_MODE_OPTIONS.find((o) => o.value === mode) ?? KB_MODE_OPTIONS[2];

  const getScopeOption = (s: Scope) =>
    SCOPE_OPTIONS.find((o) => o.value === s) ?? SCOPE_OPTIONS[0];

  // ── runAssessment ─────────────────────────────────────────────────────────

  const runAssessment = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setRounds([]);
    setCurrentRound(0);
    setIsComplete(false);
    setCitedFiles([]);
    setSummary(null);
    setActiveTab(null);
    setSessionMeta({});
    // Don't reset sessionGems here — gems accumulate across re-runs within the same iteration

    try {
      const session = await getValidSession();
      if (!session) throw new Error("Not authenticated");

      const kbFiles = kbFileNames.map((name) => {
        const match = researchFiles.find(
          (f) =>
            f.fileName === name ||
            f.fileName.toLowerCase() === name.toLowerCase(),
        );
        return {
          fileId: match?.id || "",
          fileName: match?.fileName || name,
          fileType: match?.fileType || "Synthesis", // passed to run.js so Example files get distinct prompt treatment
        };
      });

      if (kbFiles.length === 0) {
        throw new Error(
          `No knowledge base files were selected. Please go back to the Enter hex and select at least one Research File.\n\nDebugging info:\n- Hex: ${hexId}\n- KB file names received: ${JSON.stringify(kbFileNames)}\n- Research files available: ${researchFiles.length}`,
        );
      }

      console.log(`[AssessmentModal] Starting v3 assessment`);
      console.log(`[AssessmentModal] kbMode: ${kbMode} | requestMode: ${requestMode} | scope: ${scope}`);
      console.log(`[AssessmentModal] ideaElements: ${ideaElements.length} | debateRounds: ${numDebateRounds}`);
      console.log(`[AssessmentModal] kbFiles: ${kbFiles.map((f) => f.fileName).join(", ")}`);
      console.log(`[AssessmentModal] workspaceHost: ${session.workspaceHost}`);

      const response = await fetch("/api/databricks/assessment/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hexId,
          hexLabel,
          brand,
          projectType,
          assessmentTypes: [assessmentType],
          userSolution,
          ideasFile,
          ideaElements,
          selectedPersonas,
          customPersonaData,
          kbFiles,
          userEmail,
          modelEndpoint,
          projectTypeConfigs,
          // Auth credentials — required by run.js
          accessToken: session.accessToken,
          workspaceHost: session.workspaceHost,
          // v3 additions
          kbMode,
          requestMode,
          scope,
          numDebateRounds,
          // Iteration context — prior hex results and gems/checks/coal saved this iteration
          hexExecutions,
          iterationGems,
          iterationChecks,
          iterationCoal,
          iterationDirections,
        }),
      });

      if (!response.ok || !response.body) {
        const err = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(err.message || "Assessment failed");
      }

      // ── SSE streaming ─────────────────────────────────────────────────────
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const eventMatch = part.match(/^event: (.+)$/m);
          const dataMatch = part.match(/^data: (.+)$/m);
          if (!dataMatch) continue;

          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(dataMatch[1]);
          } catch {
            console.warn("[AssessmentModal] Failed to parse SSE payload:", dataMatch[1]);
            continue;
          }

          const event = eventMatch?.[1];

          if (event === "round") {
            const round = payload as AssessmentRound;
            setCurrentRound(round.roundNumber);
            setRounds((prev) => [...prev, round]);
            // Auto-select the first round tab only; user controls navigation after that
            setActiveTab((prev) => (prev === null ? round.roundNumber : prev));
          } else if (event === "complete") {
            setCitedFiles((payload.citedFiles as CitedFile[]) || []);
            if (payload.summary) {
              setSummary(payload.summary as string);
              // Don't auto-switch — user chooses when to read summary
            }
            // Store v3 session metadata for display
            setSessionMeta({
              kbMode: payload.kbMode as KbMode,
              requestMode: payload.requestMode as RequestMode,
              scope: payload.scope as Scope,
              durationMs: payload.durationMs as number,
            });
            setIsComplete(true);
          } else if (event === "error") {
            throw new Error((payload.message as string) || "Assessment failed");
          }
        }
      }
    } catch (err) {
      console.error("[AssessmentModal] Error:", err);
      setError(err instanceof Error ? err.message : "Assessment failed");
    } finally {
      setIsRunning(false);
      setCurrentRound(0);
    }
  }, [
    hexId, hexLabel, brand, projectType, assessmentType,
    userSolution, ideasFile, ideaElements, selectedPersonas,
    kbFileNames, researchFiles, userEmail, modelEndpoint,
    projectTypeConfigs, kbMode, requestMode, scope, numDebateRounds,
  ]);

  useEffect(() => {
    if (isOpen && !hasStarted.current && !showSettings) {
      hasStarted.current = true;
      setCollapsedRounds(new Set());
      setFloatingBtn(null);
      setSavedGemCount(0);
      setSavedCoalCount(0);
      setSavedCheckCount(0);
      setSavedGemItems([]);
      setSavedCheckItems([]);
      setSavedCoalItems([]);
      setGemToasts([]);
      setCoalToasts([]);
      setCheckToasts([]);
      runAssessment();
    }
    if (!isOpen) {
      hasStarted.current = false;
      // iterationGems live in ProcessWireframe — cleared there on iteration boundary
    }
  }, [isOpen, showSettings, runAssessment]);

  // ── Text selection / gem handlers ─────────────────────────────────────────

  useEffect(() => {
    const handleSelectionChange = () => {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
          setFloatingBtn(null);
          return;
        }
        const text = selection.toString().trim();
        if (text.length < 10) { setFloatingBtn(null); return; }

        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (!range || !contentRef.current?.contains(range.commonAncestorContainer)) {
          setFloatingBtn(null);
          return;
        }

        const allContent = rounds.map((r) => r.content).join("\n");
        const selectionContext = text.substring(0, 100);
        const textIdx = allContent.indexOf(selectionContext);

        let fileId: string | null = null;
        let fileName: string | null = null;

        if (textIdx >= 0) {
          const citationRegex = /\[Source:\s*([^\]]+)\]/g;
          let match: RegExpExecArray | null;
          let lastCitationName: string | null = null;
          while ((match = citationRegex.exec(allContent)) !== null) {
            if (match.index < textIdx + selectionContext.length) {
              lastCitationName = match[1].trim();
            }
          }
          if (lastCitationName) {
            const cited = citedFiles.find(
              (f) => f.fileName?.toLowerCase() === lastCitationName!.toLowerCase()
            );
            fileId = cited?.fileId || null;
            fileName = lastCitationName;
          }
        }

        const rect = range.getBoundingClientRect();
        const modalRect = contentRef.current?.getBoundingClientRect();
        if (modalRect) {
          setFloatingBtn({
            x: rect.left - modalRect.left + rect.width / 2,
            y: rect.bottom - modalRect.top,
            text, fileId, fileName,
          });
        }
      }, 50);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [rounds, citedFiles, activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (floatingBtn && (e.key === "Enter" || (e.key === "s" && (e.metaKey || e.ctrlKey)))) {
        e.preventDefault();
        handleSaveGem();
      }
      if (e.key === "Escape") {
        setFloatingBtn(null);
        window.getSelection()?.removeAllRanges();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [floatingBtn]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setFloatingBtn(null);
      return;
    }
    const text = selection.toString().trim();
    if (text.length < 10) { setFloatingBtn(null); return; }

    const allContent = rounds.map((r) => r.content).join("\n");
    const selectionContext = text.substring(0, 100);
    const textIdx = allContent.indexOf(selectionContext);

    let fileId: string | null = null;
    let fileName: string | null = null;

    if (textIdx >= 0) {
      const citationRegex = /\[Source:\s*([^\]]+)\]/g;
      let match: RegExpExecArray | null;
      let lastCitationName: string | null = null;
      while ((match = citationRegex.exec(allContent)) !== null) {
        if (match.index < textIdx + selectionContext.length) {
          lastCitationName = match[1].trim();
        }
      }
      if (lastCitationName) {
        const cited = citedFiles.find(
          (f) => f.fileName?.toLowerCase() === lastCitationName!.toLowerCase()
        );
        fileId = cited?.fileId || null;
        fileName = lastCitationName;
      }
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const modalRect = contentRef.current?.getBoundingClientRect();
    if (modalRect) {
      setFloatingBtn({
        x: rect.left - modalRect.left + rect.width / 2,
        y: rect.bottom - modalRect.top,
        text, fileId, fileName,
      });
    }
  }, [rounds, citedFiles, activeTab]);

  const handleMouseDown = useCallback((_e: React.MouseEvent) => {}, []);

  const handleSaveGem = async () => {
    if (!floatingBtn) return;
    setSavingGem(true);
    try {
      const session = await getValidSession();
      if (!session) throw new Error("Not authenticated");
      const result = await saveGem({
        gemText: floatingBtn.text,
        fileId: floatingBtn.fileId || undefined,
        fileName: floatingBtn.fileName || undefined,
        assessmentType,
        hexId, hexLabel, brand, projectType,
        createdBy: userEmail,
        accessToken: session.accessToken,
        workspaceHost: session.workspaceHost,
      });
      if (result.success) {
        setSavedGemCount((prev) => prev + 1);
        setSavedGemItems(prev => [...prev, { text: floatingBtn.text, fileName: floatingBtn.fileName }]);
        // Notify ProcessWireframe to accumulate gem into iteration-level array
        onGemSaved?.({
          gemText: floatingBtn.text,
          fileName: floatingBtn.fileName,
          hexId,
          hexLabel,
        });
        const toastId = Date.now().toString();
        setGemToasts((prev) => [
          ...prev,
          {
            id: toastId,
            text: floatingBtn.text.substring(0, 60) + (floatingBtn.text.length > 60 ? "…" : ""),
            fileName: floatingBtn.fileName || "Unknown source",
          },
        ]);
        setTimeout(() => setGemToasts((prev) => prev.filter((t) => t.id !== toastId)), 3500);
      } else {
        throw new Error(result.error || "Save failed");
      }
    } catch (err) {
      alert(`Failed to save gem: ${err instanceof Error ? err.message : "Unknown error"}`);
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
      const newCoal = {
        id: Date.now().toString(),
        text: floatingBtn.text,
        hexId,
        hexLabel,
        timestamp: Date.now(),
      };
      localStorage.setItem('cohive_coal', JSON.stringify([...existing, newCoal]));
      setSavedCoalCount(prev => prev + 1);
      setSavedCoalItems(prev => [...prev, { text: floatingBtn.text }]);
      const toastId = `coal-${Date.now()}`;
      setCoalToasts(prev => [...prev, {
        id: toastId,
        text: floatingBtn.text.substring(0, 60) + (floatingBtn.text.length > 60 ? '…' : ''),
      }]);
      setTimeout(() => setCoalToasts(prev => prev.filter(t => t.id !== toastId)), 3500);
      setFloatingBtn(null);
      window.getSelection()?.removeAllRanges();
    } finally {
      setSavingCoal(false);
    }
  };

  const handleSaveCheck = () => {
    if (!floatingBtn) return;
    setSavingCheck(true);
    try {
      const existing = JSON.parse(localStorage.getItem('cohive_checks') || '[]');
      const newCheck = {
        id: Date.now().toString(),
        text: floatingBtn.text,
        hexId,
        hexLabel,
        fileName: floatingBtn.fileName,
        timestamp: Date.now(),
      };
      localStorage.setItem('cohive_checks', JSON.stringify([...existing, newCheck]));
      setSavedCheckCount(prev => prev + 1);
      setSavedCheckItems(prev => [...prev, { text: floatingBtn.text }]);
      const toastId = `check-${Date.now()}`;
      setCheckToasts(prev => [...prev, {
        id: toastId,
        text: floatingBtn.text.substring(0, 60) + (floatingBtn.text.length > 60 ? '…' : ''),
      }]);
      setTimeout(() => setCheckToasts(prev => prev.filter(t => t.id !== toastId)), 3500);
      setFloatingBtn(null);
      window.getSelection()?.removeAllRanges();
    } finally {
      setSavingCheck(false);
    }
  };


  // Returns a descriptive subtitle for each round type
  const getRoundTabLabel = (label: string): string => {
    const l = label.toLowerCase();
    if (l.includes('moderator opening')) return 'Intro';
    if (l.includes('moderator recap')) return 'Recap';
    if (l.includes('moderator synthesis') || l.includes('moderator closing')) return 'Close';
    if (l.includes('moderator')) return 'Mod';
    if (l.includes('fact')) return 'Fact';
    const stripped = label.replace(/^R\d+:\s*/i, '').replace(/^Round \d+ [—\-] /i, '');
    return stripped.length > 13 ? stripped.substring(0, 12) + '…' : stripped;
  };

  const getRoundSubtitle = (label: string): string => {
    const l = label.toLowerCase();
    if (l.includes('moderator opening')) return 'Session framing & objectives';
    if (l.includes('moderator recap')) return 'Round recap & next direction';
    if (l.includes('moderator synthesis') || l.includes('moderator closing')) return 'Final synthesis & recommendations';
    if (l.includes('moderator')) return 'Moderator';
    if (l.includes('fact-checker') || l.includes('fact checker')) return 'Citation audit';
    if (l.includes('summary') || l.includes('neutral')) return 'Neutral summary';
    // Persona rounds
    const r1 = label.match(/^R1:/i) || label.match(/round 1/i);
    const rN = label.match(/^R(\d+):/i) || label.match(/round (\d+)/i);
    if (r1) return 'Independent expert views';
    if (rN) return `Debate round — direct engagement`;
    return '';
  };
  const toggleRoundCollapse = (roundNum: number) => {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundNum)) next.delete(roundNum);
      else next.add(roundNum);
      return next;
    });
  };

  // ── Formatters ────────────────────────────────────────────────────────────

  const formatCitations = (text: string): React.ReactNode => {
    const parts = text.split(
      /(\[Source:[^\]]+\]|\[General Knowledge[^\]]*\]|\[COLLABORATION COMPLETE\])/g
    );
    return parts.map((part, i) => {
      if (part.startsWith("[Source:")) {
        const name = part.replace("[Source:", "").replace("]", "").trim();
        const cited = citedFiles.find(
          (f) => f.fileName?.toLowerCase() === name.toLowerCase()
        );
        return (
          <span
            key={i}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium mx-0.5 ${
              cited?.fileId
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-blue-100 text-blue-700 border border-blue-200"
            }`}
          >
            📄 {name}
          </span>
        );
      }
      if (part.startsWith("[General Knowledge")) {
        // Handle both [General Knowledge] and [General Knowledge — KB silent on this point]
        const isKbSilent = part.includes("KB silent");
        return (
          <span
            key={i}
            className={`inline px-1 py-0.5 text-xs rounded mx-0.5 ${
              isKbSilent
                ? "bg-amber-50 text-amber-600 border border-amber-200"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {isKbSilent ? "⚠ General Knowledge" : "General Knowledge"}
          </span>
        );
      }
      if (part === "[COLLABORATION COMPLETE]") return <span key={i} />;
      return <span key={i}>{part}</span>;
    });
  };

  const formatContent = (content: string): React.ReactNode => {
    const lines = content
      .split("\n")
      .filter((line) => !line.startsWith("## Round") && !line.startsWith("## Moderator") && !line.startsWith("## Fact-Checker"));
    return lines.map((line, i) => {
      // Persona / section headers: ### Name or ### Name — Round N
      const h3Match = line.match(/^###\s+(.+)$/);
      if (h3Match) {
        const heading = h3Match[1];
        const isFactChecker = heading.toLowerCase().includes("fact");
        const isModerator = heading.toLowerCase().includes("moderator");
        const tagColor = isFactChecker
          ? "bg-amber-100 text-amber-800 border border-amber-300"
          : isModerator
          ? "bg-green-100 text-green-800 border border-green-300"
          : "bg-purple-100 text-purple-800 border border-purple-300";
        return (
          <div key={i} className="mb-2 mt-4">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${tagColor}`}>
              {heading}
            </span>
          </div>
        );
      }
      // Bold heading: **Text:**
      const boldHeadingMatch = line.match(/^\*\*([^*]+):\*\*$/);
      if (boldHeadingMatch) {
        return (
          <h4 key={i} className="font-semibold text-gray-900 text-sm mt-3 mb-1">
            {boldHeadingMatch[1]}:
          </h4>
        );
      }
      // Bold heading with content: **Text:** rest
      const boldWithContent = line.match(/^\*\*([^*]+):\*\*\s*(.+)$/);
      if (boldWithContent) {
        return (
          <p key={i} className="text-gray-700 text-sm leading-relaxed mb-1">
            <strong>{boldWithContent[1]}:</strong>{" "}
            {formatCitations(boldWithContent[2])}
          </p>
        );
      }
      // Bullet points
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const bulletText = line.trim().substring(2);
        return (
          <div key={i} className="flex items-start gap-2 ml-4 mb-1">
            <span className="text-gray-400 text-xs mt-0.5 flex-shrink-0">•</span>
            <p className="text-gray-700 text-sm leading-relaxed flex-1">
              {formatCitations(bulletText)}
            </p>
          </div>
        );
      }
      // Numbered list items
      const numberedMatch = line.trim().match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        return (
          <div key={i} className="flex items-start gap-2 ml-4 mb-1">
            <span className="text-gray-400 text-xs mt-0.5 flex-shrink-0 w-4">
              {numberedMatch[1]}.
            </span>
            <p className="text-gray-700 text-sm leading-relaxed flex-1">
              {formatCitations(numberedMatch[2])}
            </p>
          </div>
        );
      }
      if (line.trim() === "---") return <hr key={i} className="border-gray-200 my-3" />;
      if (!line.trim()) return <div key={i} className="h-1" />;
      return (
        <p key={i} className="text-gray-700 text-sm leading-relaxed mb-1">
          {formatCitations(line)}
        </p>
      );
    });
  };

  const formatSummary = (text: string): React.ReactNode => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("# "))
        return <h2 key={i} className="text-gray-900 font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>;
      if (line.startsWith("## "))
        return <h3 key={i} className="text-gray-900 font-semibold text-base mt-4 mb-2">{line.slice(3)}</h3>;
      if (line.startsWith("### "))
        return <h4 key={i} className="text-gray-800 font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>;
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const bulletText = line.trim().substring(2);
        const formatted = bulletText.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        return (
          <div key={i} className="flex items-start gap-2 ml-4 mb-1">
            <span className="text-gray-400 text-xs mt-1 flex-shrink-0">•</span>
            <p className="text-gray-700 text-sm leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: formatted }} />
          </div>
        );
      }
      if (line.trim() === "---") return <hr key={i} className="border-gray-200 my-3" />;
      if (!line.trim()) return <div key={i} className="h-2" />;
      const formatted = line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      return <p key={i} className="text-gray-700 text-sm leading-relaxed mb-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  // ── Early return ──────────────────────────────────────────────────────────

  if (!isOpen) return null;

  // ── Settings panel ────────────────────────────────────────────────────────

  if (showSettings) {
    const activeModeOption = getKbModeOption(kbMode);
    const activeScopeOption = getScopeOption(scope);

    return (
      <div
        className="fixed inset-y-0 left-0 z-50 flex items-center justify-center"
        style={{ right: 'var(--modal-r)', padding: 'var(--modal-p-lg)', backgroundColor: "rgba(0, 0, 0, 0.2)" }}
      >
        <div
          className="bg-white rounded-xl shadow-2xl flex flex-col"
          style={{ width: "560px", maxHeight: "85vh" }}
        >
          {/* Settings header */}
          <div className="bg-white border-b-2 border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-xl">
            <div>
              <h2 className="text-gray-900 font-semibold modal-heading">
                Assessment Settings
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">
                {brand} · {hexLabel}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Settings body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* ── Request mode read-only display ── */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                requestMode === "get-inspired"
                  ? "bg-purple-50 border-purple-300 text-purple-800"
                  : "bg-indigo-50 border-indigo-300 text-indigo-800"
              }`}>
                {requestMode === "get-inspired" ? "✦ Get Inspired" : "⊞ Load Ideas"}
              </span>
              <p className="text-xs text-gray-500">
                {requestMode === "get-inspired"
                  ? "Personas will generate new ideas from the Knowledge Base."
                  : ideaElements.length > 1
                    ? `Personas will assess and compare ${ideaElements.length} loaded elements.`
                    : "Personas will critically assess your loaded idea."}
              </p>
            </div>

            {/* Show loaded elements if in load-ideas mode */}
            {requestMode === "load-ideas" && ideaElements.length > 0 && (
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium mb-2">
                  {ideaElements.length === 1 ? "Idea to assess:" : `${ideaElements.length} elements to compare:`}
                </p>
                <div className="space-y-1">
                  {ideaElements.map((el, i) => (
                    <div key={el.id} className="flex items-center gap-2">
                      <span className="w-4 h-4 bg-indigo-100 text-indigo-700 rounded text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs text-gray-700 truncate">{el.label || `Element ${i + 1}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Knowledge Base Mode ── */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <label className="block text-sm font-semibold text-gray-800">
                  Knowledge Base Usage
                </label>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Controls how strictly personas must stay within the KB files. All modes enforce mandatory citations.
              </p>
              <div className="space-y-2">
                {KB_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setKbMode(opt.value)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                      kbMode === opt.value
                        ? opt.activeClasses
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${
                      kbMode === opt.value ? "border-current" : "border-gray-300"
                    }`}>
                      {kbMode === opt.value && (
                        <div className="w-2 h-2 rounded-full bg-current" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-sm block">{opt.label}</span>
                      <span className="text-xs opacity-80 leading-snug">{opt.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Scope ── */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Information Scope
              </label>
              <p className="text-xs text-gray-500 mb-3">
                How broadly should personas draw when generating or assessing?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {SCOPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setScope(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-center transition-all ${
                      scope === opt.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className={scope === opt.value ? "text-blue-600" : "text-gray-400"}>
                      {opt.icon}
                    </span>
                    <span className={`font-semibold text-xs ${scope === opt.value ? "text-blue-800" : "text-gray-700"}`}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-gray-500 leading-tight">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── KB files preview ── */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 font-medium mb-2">
                📚 Knowledge Base files ({kbFileNames.length}):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {kbFileNames.map((name, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-600">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Settings footer */}
          <div className="bg-white border-t-2 border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-b-xl">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium border ${getKbModeOption(kbMode).activeClasses}`}>
                {getKbModeOption(kbMode).label}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 border border-blue-300 text-blue-800 flex items-center gap-1">
                {getScopeOption(scope).icon}
                {getScopeOption(scope).label}
              </span>
            </div>
            <button
              onClick={() => {
                setShowSettings(false);
                // Trigger run after settings panel closes
                setTimeout(() => {
                  hasStarted.current = false;
                }, 0);
              }}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium text-sm"
            >
              Start Assessment →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Format as Example ────────────────────────────────────────────────────

  const handleFormatAsExample = async () => {
    const textToFormat = summary || rounds.map(r => r.content).join('\n\n---\n\n');
    if (!textToFormat.trim()) return;
    setIsFormatting(true);
    setFormattedResult(null);
    try {
      const session = await getValidSession();
      const resp = await fetch('/api/databricks/ai/format-as-example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: textToFormat,
          exampleFileId: formatExampleFileId || undefined,
          modelEndpoint,
          brand,
          userEmail,
          accessToken: session?.accessToken,
          workspaceHost: session?.workspaceHost,
        }),
      });
      if (!resp.ok) throw new Error('Format request failed');
      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No response stream');
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const dataMatch = part.match(/^data: (.+)$/m);
          if (!dataMatch) continue;
          try {
            const payload = JSON.parse(dataMatch[1]);
            if (payload.formatted) setFormattedResult(payload.formatted);
            if (payload.message) throw new Error(payload.message);
          } catch (e) { if (e instanceof SyntaxError) continue; throw e; }
        }
      }
    } catch (e) {
      setFormattedResult(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsFormatting(false);
    }
  };

  // ── Main modal ────────────────────────────────────────────────────────────

  const activeKbMode = sessionMeta.kbMode ?? kbMode;
  const kbModeOption = getKbModeOption(activeKbMode);

  return (
    <>
      {isRunning && rounds.length === 0 && (
        <LoadingGem message="Starting assessment collaboration..." />
      )}

      <div
        className="fixed inset-y-0 left-0 z-50 flex items-center justify-center"
        style={{ right: 'var(--modal-r)', padding: 'var(--modal-p-lg)', backgroundColor: "rgba(0, 0, 0, 0.2)" }}
      >
        <div
          className="bg-white rounded-xl shadow-2xl flex flex-col"
          style={{ width: "75%", height: "75vh", maxWidth: "1200px" }}
        >
          {/* Header */}
          <div className="bg-white border-b-2 border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-xl">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-gray-900 font-semibold modal-heading">
                  {hexLabel} Assessment
                </h2>
                <p className="text-gray-500 text-sm">
                  {brand} ·{" "}
                  {assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)}
                  {selectedPersonas.length > 0 &&
                    ` · ${selectedPersonas.length} persona${selectedPersonas.length !== 1 ? "s" : ""}`}
                </p>
                {/* v3: session settings summary */}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-purple-600 text-xs font-medium flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-purple-600 rounded-full" />
                    {getModelDisplayName(modelEndpoint)}
                  </p>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${kbModeOption.activeClasses}`}>
                    {kbModeOption.label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 border border-blue-300 text-blue-800 flex items-center gap-1">
                    {getScopeOption(sessionMeta.scope ?? scope).icon}
                    {getScopeOption(sessionMeta.scope ?? scope).label}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${
                    (sessionMeta.requestMode ?? requestMode) === "get-inspired"
                      ? "bg-purple-50 border-purple-300 text-purple-800"
                      : "bg-indigo-50 border-indigo-300 text-indigo-800"
                  }`}>
                    {(sessionMeta.requestMode ?? requestMode) === "get-inspired" ? "✦ Inspire" : "⊞ Assess"}
                  </span>
                  {sessionMeta.durationMs && (
                    <span className="text-gray-400 text-xs">
                      {Math.round(sessionMeta.durationMs / 1000)}s
                    </span>
                  )}
                </div>
              </div>
              {isComplete && (savedGemCount > 0 || savedCheckCount > 0 || savedCoalCount > 0) && (
                <div className="flex items-center gap-1.5">
                  {savedGemCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full">
                      <img src={gemIcon} alt="CoHive gem icon" style={{ width: "16px", height: "16px", objectFit: "contain" }} />
                      <span className="text-amber-800 text-xs font-semibold">{savedGemCount}</span>
                    </div>
                  )}
                  {savedCheckCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-full">
                      <svg viewBox="0 0 32 32" style={{ width: "16px", height: "16px", flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="hdrCheckBg" x1="0%" y1="50%" x2="100%" y2="50%">
                            <stop offset="0%" stopColor="#0F766E" />
                            <stop offset="50%" stopColor="#7C3AED" />
                            <stop offset="100%" stopColor="#DC2626" />
                          </linearGradient>
                          <radialGradient id="hdrCheckGold" cx="50%" cy="50%" r="30%">
                            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#hdrCheckBg)" />
                        <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#hdrCheckGold)" />
                        <path d="M9 16.5l5 5 9.5-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                      <span className="text-purple-800 text-xs font-semibold">{savedCheckCount}</span>
                    </div>
                  )}
                  {savedCoalCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 border border-gray-300 rounded-full">
                      <CoalIcon size={16} />
                      <span className="text-gray-700 text-xs font-semibold">{savedCoalCount}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isComplete && (
                <span className="flex items-center gap-1.5 text-green-700 text-sm font-medium">
                  <CircleCheck className="w-4 h-4" />
                  Complete · {rounds.length} round{rounds.length !== 1 ? "s" : ""}
                </span>
              )}
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {isRunning && (
            <div className="bg-purple-50 border-b border-purple-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
              <SpinHex className="w-4 h-4" />
              <span className="text-purple-800 text-sm font-medium">
                {currentRound > 0 ? (() => {
                  const lastRound = rounds[rounds.length - 1];
                  const lbl = (lastRound as any)?.label || `Round ${currentRound}`;
                  // Determine if this is a final housekeeping round (not a user-visible debate round)
                  const isFinal = lbl.toLowerCase().includes('moderator') || lbl.toLowerCase().includes('fact');
                  if (isFinal) return `${lbl} complete…`;
                  // Count how many user-visible debate/persona rounds have completed
                  // (exclude Moderator Opening roundNumber=0, Fact-Checker, Moderator Synthesis)
                  const completedDebateRounds = rounds.filter(r =>
                    r.roundNumber > 0 &&
                    !(r as any).label?.toLowerCase().includes('moderator') &&
                    !(r as any).label?.toLowerCase().includes('fact')
                  ).length;
                  const nextRoundNum = completedDebateRounds + 1;
                  return `${lbl} complete — starting Round ${nextRoundNum}…`;
                })() : "Starting collaboration…"}
              </span>
              <div className="flex gap-1 ml-2">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`w-2 h-2 rounded-full transition-all ${currentRound >= n ? "bg-purple-600" : "bg-purple-200"}`}
                  />
                ))}
                <div className="w-2 h-2 rounded-full bg-purple-100 animate-pulse" />
              </div>
            </div>
          )}

          {/* Per-round tabs — appear as rounds arrive, stay visible through completion */}
          {rounds.length > 0 && (
            <div className="bg-white border-b-2 border-gray-200 px-4 flex items-center flex-shrink-0 overflow-x-auto">
              {rounds.map((round) => {
                const roundLabel = (round as any).label || `Round ${round.roundNumber}`;
                const isActive = activeTab === round.roundNumber;
                const isMod = roundLabel.toLowerCase().includes('moderator');
                const activeColor = isMod ? "border-green-600 text-green-700" : "border-purple-600 text-purple-700";
                return (
                  <button
                    key={round.roundNumber}
                    onClick={() => setActiveTab(round.roundNumber)}
                    title={roundLabel}
                    className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-0.5 whitespace-nowrap flex-shrink-0 ${
                      isActive ? activeColor : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {getRoundTabLabel(roundLabel)}
                  </button>
                );
              })}
              {/* Spinner tab while next round is generating */}
              {isRunning && (
                <div className="px-3 py-2.5 -mb-0.5 flex items-center gap-1.5 text-gray-400 flex-shrink-0">
                  <SpinHex className="w-3 h-3" />
                </div>
              )}
              {/* Summary tab — appears when summary is ready */}
              {summary && (
                <button
                  onClick={() => setActiveTab("summary")}
                  title="Neutral Summary"
                  className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-0.5 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
                    activeTab === "summary"
                      ? "border-green-600 text-green-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Summary
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block flex-shrink-0" />
                </button>
              )}
            </div>
          )}

          {/* Selection hint */}
          {isComplete && (
            <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-4 flex-shrink-0 flex-wrap">
              <span className="text-gray-500 text-sm font-medium">Select any text:</span>
              <span className="flex items-center gap-1.5 text-sm text-gray-800 font-medium">
                <img src={gemIcon} alt="CoHive gem icon" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
                Highlight elements you like
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-800 font-medium">
                <svg viewBox="0 0 32 32" style={{ width: "18px", height: "18px", flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="hintCheckBg" x1="0%" y1="50%" x2="100%" y2="50%">
                      <stop offset="0%" stopColor="#0F766E" />
                      <stop offset="50%" stopColor="#7C3AED" />
                      <stop offset="100%" stopColor="#DC2626" />
                    </linearGradient>
                    <radialGradient id="hintCheckGold" cx="50%" cy="50%" r="30%">
                      <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#hintCheckBg)" />
                  <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#hintCheckGold)" />
                  <path d="M9 16.5l5 5 9.5-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                Check elements of interest
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-800 font-medium">
                <CoalIcon size={18} />
                Flag elements you want to avoid
              </span>
            </div>
          )}

          {/* Scrollable content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto bg-gray-50" style={{ position: "relative" }}>

            {/* Error */}
            {error && (
              <div className="m-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3">
                <CircleAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">Assessment Failed</p>
                  <p className="text-red-700 text-sm mt-1 whitespace-pre-wrap">{error}</p>
                  <button
                    onClick={() => {
                      hasStarted.current = false;
                      runAssessment();
                    }}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {isRunning && rounds.length === 0 && (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-5/6" />
                      <div className="h-3 bg-gray-100 rounded w-4/6" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Single round view */}
            {typeof activeTab === "number" && (() => {
              const round = rounds.find((r) => r.roundNumber === activeTab);
              if (!round) return null;
              const roundLabel = (round as any).label || `Round ${round.roundNumber}`;
              const isModerator = roundLabel.toLowerCase().includes("moderator");
              const isFactChecker = roundLabel.toLowerCase().includes("fact");
              const headerColor = isModerator ? "text-green-800" : isFactChecker ? "text-amber-800" : "text-purple-900";
              const borderColor = isModerator ? "border-green-200" : isFactChecker ? "border-amber-200" : "border-purple-200";
              return (
                <div
                  className="p-6 max-w-4xl mx-auto space-y-4"
                  onMouseUp={handleMouseUp}
                  onMouseDown={handleMouseDown}
                >
                  <div className={`text-xs font-medium uppercase tracking-wide ${headerColor} mb-1`}>
                    {roundLabel.replace(/^Round \d+ [—\-] /i, '')}
                    {getRoundSubtitle(roundLabel) && (
                      <span className="ml-2 text-gray-400 normal-case font-normal tracking-normal">
                        · {getRoundSubtitle(roundLabel)}
                      </span>
                    )}
                  </div>
                  <div className={`bg-white border-2 ${borderColor} rounded-lg p-6`}>
                    {formatContent(round.content)}
                  </div>
                </div>
              );
            })()}

            {/* Summary tab */}
            {activeTab === "summary" && (
              <div className="p-6 max-w-4xl mx-auto">
                <div className="bg-white border-2 border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-green-100">
                    <CircleCheck className="w-5 h-5 text-green-600" />
                    <h3 className="text-green-800 font-semibold">Neutral Summary</h3>
                    <span className="text-green-600 text-xs ml-auto">
                      Generated by neutral summarizer · not a persona
                    </span>
                  </div>
                  <div>{formatSummary(summary ?? '')}</div>
                </div>
              </div>
            )}

            {/* Citations + gem/check/coal counts — shown at bottom when complete, any tab */}
            {isComplete && (
              <div className="px-6 pb-6 max-w-4xl mx-auto space-y-3">
                {citedFiles.length > 0 && (
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                    <h4 className="text-gray-700 font-medium text-sm mb-3">
                      📚 Knowledge Base Citations Used
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {citedFiles.map((f, i) => (
                        <span
                          key={i}
                          className={`px-2.5 py-1 rounded text-xs font-medium ${
                            f.fileId
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}
                        >
                          📄 {f.fileName}
                          {f.fileId && <span className="ml-1 text-green-600">✓</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(savedGemCount > 0 || savedCheckCount > 0 || savedCoalCount > 0) && (
                  <div className="space-y-2">
                    {savedGemCount > 0 && (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3 flex items-center gap-2">
                        <img src={gemIcon} alt="CoHive gem icon" style={{ width: "20px", height: "20px", objectFit: "contain" }} />
                        <span className="text-amber-800 font-medium text-sm">
                          {savedGemCount} element{savedGemCount !== 1 ? "s" : ""} highlighted
                        </span>
                      </div>
                    )}
                    {savedCheckCount > 0 && (
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 flex items-center gap-2">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="none">
                          <defs>
                            <linearGradient id="checkSummGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#E879F9" />
                              <stop offset="50%" stopColor="#C026D3" />
                              <stop offset="100%" stopColor="#FACC15" />
                            </linearGradient>
                          </defs>
                          <path d="M4 13l5 5L20 7" stroke="url(#checkSummGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-purple-800 font-medium text-sm">
                          {savedCheckCount} element{savedCheckCount !== 1 ? "s" : ""} checked for interest
                        </span>
                      </div>
                    )}
                    {savedCoalCount > 0 && (
                      <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-3 flex items-center gap-2">
                        <CoalIcon size={18} />
                        <span className="text-gray-800 font-medium text-sm">
                          {savedCoalCount} element{savedCoalCount !== 1 ? "s" : ""} flagged to avoid
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Floating gem button */}
            {floatingBtn && (
              <div
                data-gem-button="true"
                style={{
                  position: "absolute",
                  left: `${floatingBtn.x}px`,
                  top: `${floatingBtn.y + (contentRef.current?.scrollTop || 0) + 6}px`,
                  transform: "translateX(-50%)",
                  zIndex: 100,
                  pointerEvents: "auto",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <button onClick={handleSaveGem} disabled={savingGem} title="Highlight elements you like"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-800 text-xs font-medium rounded-full shadow border border-amber-400 disabled:opacity-60 transition-all whitespace-nowrap">
                    {savingGem ? <SpinHex className="w-3.5 h-3.5" /> : <img src={gemIcon} alt="Gem" style={{ width: "14px", height: "14px", objectFit: "contain" }} />}
                    Gem
                  </button>
                  <button onClick={handleSaveCheck} disabled={savingCheck} title="Check elements of interest"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-800 text-xs font-medium rounded-full shadow border border-purple-400 disabled:opacity-60 transition-all whitespace-nowrap">
                    {savingCheck ? <SpinHex className="w-3.5 h-3.5" /> : (
                      <svg viewBox="0 0 32 32" style={{ width: "14px", height: "14px", flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="floatCheckBg" x1="0%" y1="50%" x2="100%" y2="50%">
                            <stop offset="0%" stopColor="#0F766E" /><stop offset="50%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#DC2626" />
                          </linearGradient>
                          <radialGradient id="floatCheckGold" cx="50%" cy="50%" r="30%">
                            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" /><stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#floatCheckBg)" />
                        <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#floatCheckGold)" />
                        <path d="M9 16.5l5 5 9.5-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    )}
                    Check
                  </button>
                  <button onClick={handleSaveCoal} disabled={savingCoal} title="Flag elements you want to avoid"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-medium rounded-full shadow border border-gray-400 disabled:opacity-60 transition-all whitespace-nowrap">
                    {savingCoal ? <SpinHex className="w-3.5 h-3.5" /> : <CoalIcon size={14} />}
                    Coal
                  </button>
                  {floatingBtn.fileName && (
                    <span className="text-white text-xs bg-black/40 rounded-full px-2 py-1 truncate max-w-[120px]">
                      {floatingBtn.fileName.length > 20 ? floatingBtn.fileName.substring(0, 20) + "…" : floatingBtn.fileName}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {isComplete && (
            <div className="bg-white border-t-2 border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              {canManageExamples ? (
                <button
                  onClick={() => { setShowFormatModal(true); setFormattedResult(null); }}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm flex items-center gap-2"
                >
                  ✦ Format as Example
                </button>
              ) : <div />}
              <button
                onClick={() => {
                  if (onAcceptResults) {
                    onAcceptResults({ rounds, citedFiles, summary, hexId, hexLabel });
                  }
                  // Build review items from persistent arrays — not toasts,
                  // which expire after 3.5s and would cause the panel to not appear.
                  const ts = Date.now();
                  const allNew = [
                    ...savedGemItems.map((g, i) => ({
                      id: `gem-${ts}-${i}`,
                      text: g.text,
                      type: 'gem' as const,
                      included: true,
                      hexId, hexLabel,
                      fileName: g.fileName,
                      fileId: null as null,
                      rank: i,
                    })),
                    ...savedCheckItems.map((c, i) => ({
                      id: `chk-${ts}-${i}`,
                      text: c.text,
                      type: 'check' as const,
                      included: true,
                      hexId, hexLabel,
                      rank: i,
                    })),
                    ...savedCoalItems.map((c, i) => ({
                      id: `coal-${ts}-${i}`,
                      text: c.text,
                      type: 'coal' as const,
                      included: true,
                      hexId, hexLabel,
                      rank: i,
                    })),
                  ];
                  if (allNew.length > 0) {
                    setReviewItems(allNew);
                    setShowReviewPanel(true);
                  } else {
                    onClose();
                  }
                }}
                className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                Accept & Close
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Format as Example Modal */}
      {showFormatModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-8" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">✦ Format as Example</h2>
              <button onClick={() => setShowFormatModal(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Reformat this assessment output to match a specific Example file's structure and presentation.
                The AI will preserve all insights but apply the format of the chosen example.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Example file to match <span className="text-gray-400 font-normal">(optional)</span></label>
                <select
                  value={formatExampleFileId}
                  onChange={e => setFormatExampleFileId(e.target.value)}
                  className="w-full border-2 border-gray-300 bg-white rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-amber-500"
                >
                  <option value="">— No example, just clean it up —</option>
                  {researchFiles.filter(f => f.isApproved && f.fileType === 'Example' && !f.fileName.endsWith('_txt.txt')).map(f => (
                    <option key={f.id} value={f.id}>{f.fileName}</option>
                  ))}
                </select>
              </div>
              {!formattedResult && !isFormatting && (
                <button
                  onClick={handleFormatAsExample}
                  className="w-full px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
                >
                  Format Now
                </button>
              )}
              {isFormatting && (
                <div className="flex items-center justify-center py-8 gap-3 text-amber-700">
                  <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  Formatting…
                </div>
              )}
              {formattedResult && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                    <h4 className="text-amber-900 font-medium text-sm mb-2">Formatted Result</h4>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed max-h-[40vh] overflow-y-auto">{formattedResult}</pre>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(formattedResult).then(() => alert('✅ Copied to clipboard'))}
                      className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm"
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([formattedResult], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `${brand}_${projectType}_formatted.txt`;
                        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Download
                    </button>
                    <button onClick={() => { setFormattedResult(null); }} className="px-4 py-2 border-2 border-amber-400 text-amber-700 rounded-lg hover:bg-amber-50 text-sm">
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gem/Check/Coal Review Panel */}
      {showReviewPanel && (
        <GemCheckCoalReviewPanel
          isOpen={showReviewPanel}
          items={reviewItems}
          brand={brand}
          projectType={projectType}
          hexLabel={hexLabel}
          userEmail={userEmail || ''}
          userRole={'research-leader'}
          onConfirm={(confirmed) => {
            setShowReviewPanel(false);
            onReviewConfirmed?.(confirmed);
            onClose();
          }}
          onClose={() => {
            setShowReviewPanel(false);
            onClose();
          }}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 space-y-2 z-[200] pointer-events-none">
        {gemToasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-lg shadow-lg text-sm max-w-xs"
          >
            <img src={gemIcon} alt="CoHive gem icon" style={{ width: "16px", height: "16px", objectFit: "contain", flexShrink: 0 }} />
            <div className="min-w-0">
              <div className="font-medium">Highlighted!</div>
              <div className="text-amber-100 text-xs truncate">{toast.text}</div>
            </div>
          </div>
        ))}
        {checkToasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg shadow-lg text-sm max-w-xs"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none">
              <defs>
                <linearGradient id="checkToastGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E879F9" />
                  <stop offset="50%" stopColor="#C026D3" />
                  <stop offset="100%" stopColor="#FACC15" />
                </linearGradient>
              </defs>
              <path d="M4 13l5 5L20 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="min-w-0">
              <div className="font-medium">Checked!</div>
              <div className="text-purple-200 text-xs truncate">{toast.text}</div>
            </div>
          </div>
        ))}
        {coalToasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-lg shadow-lg text-sm max-w-xs"
          >
            <CoalIcon size={16} />
            <div className="min-w-0">
              <div className="font-medium">Flagged to avoid!</div>
              <div className="text-gray-300 text-xs truncate">{toast.text}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
