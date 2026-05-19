/**
 * AIHelpWidget.tsx
 *
 * Contextual AI assistant for CoHive — visible on all authenticated pages:
 * - Launch/Enter page
 * - All hex steps (Luminaries, Consumers, Colleagues, etc.)
 * - Knowledge Base (research)
 * - My Files (review)
 * - Wisdom
 * - Non-hex content steps (Findings, social, stories, etc.)
 *
 * Receives rich page context via props so it always knows exactly
 * what the user is doing and can give precise, relevant help.
 */

import { useState, useRef, useEffect } from "react";
import { executeAIPrompt } from "../utils/databricksAI";
import { getDocumentationForHex } from "../utils/documentationLoader";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: "ai" | "user";
  content: string;
  chips?: Chip[];
  steps?: string[];
}

interface Chip {
  label: string;
  value: string;
}

export interface AIHelpWidgetProps {
  // Core identity
  activeHexId: string;
  activeHexLabel: string;
  userEmail: string;
  userRole: string;

  // Hex-step context (central hexes only)
  selectedFiles?: string[];
  currentStep?: 1 | 2 | 3;

  // Knowledge Base context
  researchMode?: string | null;        // 'synthesis'|'personas'|'read-edit-approve'|'workspace'|'custom-prompt'
  selectedKBFile?: string | null;      // name of file open in read/edit view
  pendingApprovalCount?: number;       // files waiting to be approved

  // Wisdom context
  wisdomInputMethod?: string | null;   // 'Text'|'Voice'|'Photo'|'Video'|'File'|'Interview'

  // My Files context
  projectFileCount?: number;

  // Global context (available on every step)
  brand?: string;
  projectType?: string;
  selectedResearchFiles?: string[];    // KB files chosen in Enter step
  canManageExamples?: boolean;         // Researcher role — can upload/manage Example files
}

// ── Help Manual ───────────────────────────────────────────────────────────────

const HELP_MANUAL: Record<string, { guess: string; steps: string[] }> = {
  Enter: {
    guess: "set up your project in the Enter step",
    steps: [
      "Step 1: Select your Brand from the dropdown.",
      "Step 2: Select your Project Type (e.g. Creative Messaging, War Games, Brand Strategy).",
      "Step 3: Your filename is auto-generated — you can edit it.",
      "Step 4 (non-War Games): Choose 'Get Inspired' (AI generates ideas) or 'Load Current Ideas' (upload your own for assessment).",
      "Step 5: Select Knowledge Base files to use across all hexes. Both regular research files and Example files can be selected.",
      "Example Files (amber section): Cross-brand quality and format references. If the selected AI model supports documents (Claude, GPT, Gemini), it will read the original PDF or DOCX directly to replicate its format. Other models receive the extracted text version.",
      "Once all fields are complete, all other hexes unlock.",
    ],
  },
  Luminaries: {
    guess: "run a Luminaries (External Expert) analysis",
    steps: [
      "Step 1: Select one or more Luminary personas — advertising legends and thought leaders like David Ogilvy, Bill Bernbach, Seth Godin, Byron Sharp, and others.",
      "Living Persons (*): Personas marked with an asterisk (*) — e.g. 'Seth Godin's Published Works' — are built solely from that person's books, articles, and documented public statements. They do not represent the person's actual current views. A disclaimer is shown in the picker and included in the AI prompt.",
      "Step 2: Choose your assessment type — Assess, Recommend, or Unified.",
      "Click Execute. Each Luminary responds from their own philosophy in Round 1 independently, then debates the others in subsequent rounds.",
      "The Moderator frames each round and closes with a decisive synthesis.",
      "Highlight text in the results to save as a Gem (keep this direction) or Coal (avoid this direction).",
      "Fact-Checker Model: A separate, independent AI model reviews the results for factual accuracy. The fact-checker model can be configured per-hex in Model Templates → Fact Checking row (default: GPT-4o Mini, different from the main assessment model).",
      "Fullscreen: Click the expand icon (⤢) in the top-right corner of the results window to make it cover the full screen. Click the compress icon to return to normal size.",
      "Report Suggestions or Bugs: Check the 'Report Suggestions or Bugs' checkbox below the Knowledge Base option. A text box will appear — type your message and click Send. Your feedback is sent privately to the CoHive team along with your current hex and session context.",
    ],
  },
  stories: {
    guess: "run a Stories (Panel Homes) analysis",
    steps: [
      "Step 1: Select one or more stories household personas.",
      "Step 2: Choose your assessment type — Assess, Recommend, or Unified.",
      "Click Execute. Each stories evaluates from their specific household context — routines, family dynamics, purchase patterns.",
      "Storiess compare their household realities directly in debate rounds.",
      "Fullscreen: Click the expand icon (⤢) in the top-right corner of the results window to make it cover the full screen. Click the compress icon to return to normal size.",
      "Report Suggestions or Bugs: Check the 'Report Suggestions or Bugs' checkbox in the stories panel. A text box will appear — type your message and click Send. Your feedback is sent privately to the CoHive team with your current context.",
    ],
  },
  Consumers: {
    guess: "run a Consumer persona analysis",
    steps: [
      "Step 1: Select Consumer personas — expand Purchase (Heavy, Medium, Light Brand Buyers), Loyalty (Loyal, Triers, Non-Buyers), B2C Profiles (Impulse, Brand Loyalist, Research-Driven), and Needs categories to pick specific profiles.",
      "Step 2: Choose Assess, Recommend, or Unified.",
      "Click Execute. Each persona responds from their lived purchase experience.",
      "In debate rounds, personas compare purchase realities and challenge each other directly.",
      "Fact-Checker Model: A separate AI model reviews results for factual accuracy. Configurable per-hex in Model Templates → Fact Checking row (default: GPT-4o Mini).",
      "Fullscreen: Click the expand icon (⤢) in the top-right corner of the results window to fill the screen. Click the compress icon to return to normal size.",
      "Report Suggestions or Bugs: Check 'Report Suggestions or Bugs' below the Knowledge Base checkbox. A text box appears — type your feedback and click Send.",
    ],
  },
  competitors: {
    guess: "run a Competitor analysis",
    steps: [
      "Select a competitor from the dropdown.",
      "In standard mode: choose an analysis type (Compare Assets, Strengths/Weaknesses, Propose Improvements).",
      "In War Games mode: describe your competitive scenario or strategic question.",
      "Click Execute. Results cover differentiation, competitive threats, defensive positions, and offensive moves.",
      "Run again with a different competitor to compare — all executions are kept in history.",
      "Fullscreen: Click the expand icon (⤢) in the top-right corner of the results window to fill the screen. Click compress to return.",
      "Report Suggestions or Bugs: Check 'Report Suggestions or Bugs' below the Knowledge Base checkbox to send feedback to the CoHive team.",
    ],
  },
  Colleagues: {
    guess: "get input from Internal Colleague personas",
    steps: [
      "Step 1: Select colleague roles — CMO, CFO, Sales Director, Product Manager, etc.",
      "Each colleague evaluates from their functional responsibility — budget, feasibility, cross-functional dependencies.",
      "Step 2: Choose assessment type.",
      "Click Execute. In debate rounds, colleagues surface cross-functional tensions the strategy must resolve.",
      "Fact-Checker Model: A separate AI model reviews results for factual accuracy. Configurable per-hex in Model Templates → Fact Checking row (default: GPT-4o Mini).",
      "Fullscreen: Click the expand icon (⤢) in the top-right corner of the results window to fill the screen. Click compress to return.",
      "Report Suggestions or Bugs: Check 'Report Suggestions or Bugs' below the Knowledge Base checkbox to send feedback to the CoHive team.",
    ],
  },
  cultural: {
    guess: "run a Cultural Voice analysis",
    steps: [
      "Step 1: Select cultural personas — Content Creator, Environmental Advocate, Street Artist, Suburban Family Voice, Rural Community Leader, etc.",
      "Step 2: Choose Assess, Recommend, or Unified.",
      "Click Execute. Each cultural persona evaluates for resonance, potential misreadings, and cultural fit.",
      "Personas compare their community realities directly in debate rounds.",
      "Fact-Checker Model: A separate AI model reviews results for factual accuracy. Configurable per-hex in Model Templates → Fact Checking row (default: GPT-4o Mini).",
      "Fullscreen: Click the expand icon (⤢) in the top-right corner of the results window to fill the screen. Click compress to return.",
      "Report Suggestions or Bugs: Check 'Report Suggestions or Bugs' below the Knowledge Base checkbox to send feedback to the CoHive team.",
    ],
  },
  social: {
    guess: "run a Social Listening analysis",
    steps: [
      "Step 1: Select social listening and media research files from your Knowledge Base.",
      "Step 2: Choose Assess, Recommend, or Unified.",
      "Click Execute to analyse social sentiment and trends from your research files.",
      "Fullscreen: Click the expand icon (⤢) in the top-right corner of the results window to fill the screen. Click compress to return.",
      "Report Suggestions or Bugs: Check 'Report Suggestions or Bugs' below the Knowledge Base checkbox to send feedback to the CoHive team.",
    ],
  },
  Grade: {
    guess: "score iteration ideas against consumer segments (Grade hex)",
    steps: [
      "The Grade hex scores the ideas and strategies produced in this iteration against target consumer segments — it is not a persona dialogue.",
      "Step 1 of 3 — Select Ideas: When you open the Grade hex, it automatically extracts idea candidates from all hex discussions in this iteration (including Stories). Check or uncheck ideas to include. You can also type and add ideas manually.",
      "Zappi Questions (optional, default OFF): Also in Step 1, check 'Include Zappi Questions' to add 7 standardised concept-testing questions to each segment's assessment. The questions cover Brand Fit, Standout, Emotion, Relevance, Ease of Understanding, Purchase Intent, and Brand Appeal — all on a 1–5 scale (5 = best). When Zappi is enabled, ideas are optional — you can run Zappi scoring against segments with no ideas selected.",
      "Step 2 of 3 — Select Segments: Choose which consumer segments will evaluate the ideas. Segments are grouped by Lifestyle (Activities, Consumption, Life Stage), Demographic (Age Groups, Income, Geography, Household), and Psychographic (Values, Personality, Attitudes). Where available, a US market population percentage is shown next to each segment.",
      "Step 3 of 3 — Choose Scoring Scale: Pick from five options: Scale of 1–5 with written assessments, Scale of 1–5 scores only, Scale of 1–10 with written assessments, Scale of 1–10 scores only, or Written assessments only (no numeric score).",
      "Click 'Run Scoring'. A full-screen rotating hex appears while Databricks processes the scoring.",
      "Results are formatted topic-first: each idea (TOPIC) is shown as a heading, followed by each segment's scores and written assessment beneath it — making it easy to compare how all segments responded to one idea.",
      "If written assessments are requested, one paragraph per idea × segment pair explains why that segment would or would not respond.",
      "Score results are appended to the iteration file as two separate labeled blocks — [Grade: Score Grid] and [Grade: Written Assessments] — so each can be independently included in Findings reports.",
      "Score results and extracted ideas are cleared when you save the iteration or return to the Enter hex.",
      "Fullscreen: Click the expand icon (⤢) in the top-right corner of the scoring results window to fill the screen. Click compress to return.",
      "Report Suggestions or Bugs: Check 'Report Suggestions or Bugs' below the Knowledge Base checkbox to send feedback or bug reports privately to the CoHive team.",
    ],
  },
  research: {
    guess: "manage files in the Knowledge Base",
    steps: [
      "Choose a mode from the tabs: Synthesis, Personas, Read/Edit/Approve, Workspace, or Custom Prompt.",
      "Synthesis: Upload files from your computer or import from Databricks.",
      "Personas: Researchers can create custom personas that appear in any hex's persona picker for all workspace users. Click 'New Persona', fill in the name and any optional fields (background, tone, what they champion, what they reject, questions they always ask, scoring lens), choose which hexes they appear in, and save. Custom personas show with a [Custom] badge in the hex picker and work exactly like built-in personas in assessments.",
      "Read/Edit/Approve: Select any file to preview it. Research Leaders can edit metadata, rename, approve, unapprove, or delete files. The list refreshes automatically after every action.",
      "Files must be processed (click 'Process') then approved before they appear in hex file selectors for non-researcher users.",
      "Example Files: Researchers (research-analyst, research-leader, data-scientist, administrator) can upload Example files directly via 'Upload as Example' — these are auto-processed and auto-approved immediately. Example files are cross-brand quality and format references available to all brands.",
      "Example Files panel: In Read/Edit/Approve mode, an Example Files section shows all approved examples. Researchers can delete them. You can also change any file's type to 'Example' in the preview modal — it will be auto-processed and auto-approved.",
      "Workspace and Custom Prompt modes are available to Administrators and Data Scientists only.",
    ],
  },
  review: {
    guess: "review saved project files (My Files)",
    steps: [
      "My Files shows Findings files saved via the Findings hex — not uploaded files.",
      "Click the eye icon on any row to view the full file contents.",
      "Click the pencil (✏) icon on your own files to rename them. You can only rename files you uploaded — the icon does not appear on other people's files.",
      "Select one or more files and use the Download or Delete buttons that appear in the toolbar.",
      "Toggle 'Show All Users' Files' to see files saved by others in your organisation.",
      "Use the Filters panel (Show Filters) to narrow by Brand, Project Type, File Type, User, or Date Range.",
      "Files are saved in Databricks and persist across sessions.",
    ],
  },
  Wisdom: {
    guess: "contribute wisdom or insights to the Knowledge Base",
    steps: [
      "Step 1: Choose your input method — Text, Voice, Photo, Video, File, or Interview.",
      "Text: Type your insight and click Save. Use the microphone icon for voice-to-text.",
      "Voice: Click Start Recording, speak, click Stop — saves automatically.",
      "File: Upload any document up to 37MB (PDF, Word, Excel, etc.).",
      "Interview: An AI interviewer asks targeted questions, transcribes your answers, generates a structured summary you can edit before saving.",
      "All wisdom saves to the Knowledge Base. A Research Leader must then process and approve it before others can use it in hex analyses.",
    ],
  },
  Findings: {
    guess: "save your iteration or generate a summary",
    steps: [
      "Choose 'Save Iteration' to save all current hex results to Databricks. At least one hex must have been executed.",
      "Choose 'Summarise' to generate an AI-powered summary across selected iteration files.",
      "For a summary: select files to include, choose output options (Executive Summary, ideas list, gems, etc.), then click Read, Save to Workspace, or Download.",
      "Make sure you are signed into Databricks before saving.",
      "Saving an iteration clears your Gems, Tracks, and Coal ready for the next iteration.",
    ],
  },
};

const FALLBACK_HELP = {
  guess: "work with this COhive feature",
  steps: [
    "Make sure you have completed the Enter step first (Brand, Project Type, and files selected).",
    "Select the relevant files or personas for your analysis.",
    "Choose your assessment type and provide instructions.",
    "Click Execute to run the analysis.",
    "Fullscreen: Every assessment results window has an expand icon (⤢) next to the close button. Click it to make the results cover the full screen. Click the compress icon to return to normal size.",
    "Report Suggestions or Bugs: Every hex panel has a 'Report Suggestions or Bugs' checkbox below the Knowledge Base option. Check it to open a text box, type your feedback, and click Send. Your message is sent privately to the CoHive team — they receive your email address, current hex, brand, project type, and role for context.",
  ],
};

// ── Context banner ────────────────────────────────────────────────────────────

function buildContextBanner(props: AIHelpWidgetProps): string {
  const parts: string[] = [];

  if (props.brand) parts.push(`Brand: ${props.brand}`);
  if (props.projectType) parts.push(props.projectType);

  if (props.activeHexId === 'research') {
    const modeLabels: Record<string, string> = {
      synthesis: 'Synthesis', personas: 'Personas',
      'read-edit-approve': 'Read/Edit/Approve',
      workspace: 'Workspace', 'custom-prompt': 'Custom Prompt',
    };
    if (props.researchMode) parts.push(modeLabels[props.researchMode] || props.researchMode);
    if (props.selectedKBFile) parts.push(`Open: ${props.selectedKBFile}`);
    if (props.pendingApprovalCount && props.pendingApprovalCount > 0)
      parts.push(`${props.pendingApprovalCount} pending`);
  } else if (props.activeHexId === 'Wisdom') {
    if (props.wisdomInputMethod) parts.push(`Method: ${props.wisdomInputMethod}`);
  } else if (props.activeHexId === 'review') {
    if (props.projectFileCount !== undefined)
      parts.push(`${props.projectFileCount} file${props.projectFileCount !== 1 ? 's' : ''}`);
  } else {
    // Persona hexes have 2 steps, others have 3
    const personaHexes = ['Luminaries', 'Consumers', 'Colleagues', 'cultural'];
    const maxSteps = personaHexes.includes(props.activeHexId) ? 2 : 3;
    if (props.currentStep) parts.push(`Step ${props.currentStep}/${maxSteps}`);
    if (props.selectedFiles && props.selectedFiles.length > 0)
      parts.push(`${props.selectedFiles.length} selected`);
  }

  if (
    props.selectedResearchFiles &&
    props.selectedResearchFiles.length > 0 &&
    props.activeHexId !== 'research'
  ) {
    parts.push(`${props.selectedResearchFiles.length} KB file${props.selectedResearchFiles.length !== 1 ? 's' : ''}`);
  }

  return parts.join(' · ');
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(props: AIHelpWidgetProps): string {
  const manualText = Object.entries(HELP_MANUAL)
    .map(([id, m]) => `### ${id}\nGoal: ${m.guess}\nSteps:\n${m.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`)
    .join("\n\n");

  let pageContext = `- Active page: ${props.activeHexLabel} (id: ${props.activeHexId})\n`;
  pageContext += `- User role: ${props.userRole}\n`;
  if (props.canManageExamples) pageContext += `- Can manage Example files: yes (Upload as Example button is visible)\n`;
  if (props.brand) pageContext += `- Brand: ${props.brand}\n`;
  if (props.projectType) pageContext += `- Project type: ${props.projectType}\n`;
  if (props.selectedResearchFiles?.length)
    pageContext += `- KB files loaded from Enter step: ${props.selectedResearchFiles.join(', ')}\n`;

  if (props.activeHexId === 'research') {
    pageContext += `- Knowledge Base mode: ${props.researchMode || 'none selected yet'}\n`;
    if (props.selectedKBFile) pageContext += `- File currently open: ${props.selectedKBFile}\n`;
    if (props.pendingApprovalCount) pageContext += `- Files pending approval: ${props.pendingApprovalCount}\n`;
  } else if (props.activeHexId === 'Wisdom') {
    pageContext += `- Wisdom input method: ${props.wisdomInputMethod || 'none selected yet'}\n`;
  } else if (props.activeHexId === 'review') {
    pageContext += `- Saved project files: ${props.projectFileCount ?? 0}\n`;
  } else if (!['Findings', 'Enter'].includes(props.activeHexId)) {
    // Persona hexes have 2 steps, others have 3
    const personaHexes = ['Luminaries', 'Consumers', 'Colleagues', 'cultural'];
    const maxSteps = personaHexes.includes(props.activeHexId) ? 2 : 3;
    pageContext += `- Current step within hex: ${props.currentStep ?? 1} of ${maxSteps}\n`;
    pageContext += `- Files/personas selected: ${props.selectedFiles?.length ? props.selectedFiles.join(', ') : 'none yet'}\n`;
  }

  // Get full documentation
  const documentation = getDocumentationForHex(props.activeHexId);
  return `You are the COhive AI assistant embedded in the main application. You can see exactly what the user is doing.

CURRENT PAGE STATE:
${pageContext}

YOUR JOB:
- Answer questions about how to use COhive features on the current page
- Be concise and specific — reference what you can see
- Use step-by-step instructions from the help manual when asked how to do something
- Reference detailed documentation when users ask about features, policies, or workflows
- Never make up features that don't exist in COhive
- If the user seems stuck, suggest they type "help"

COHIVE HELP MANUAL (Quick Steps):
${manualText}

COHIVE COMPLETE DOCUMENTATION:
${documentation}

Keep responses under 200 words unless detailed explanation is requested. Use plain language. No markdown headers.`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AIHelpWidget(props: AIHelpWidgetProps) {
  const { activeHexId, activeHexLabel, userEmail, userRole } = props;

  const [isExpanded, setIsExpanded] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: `Hi! I can see you're on <strong>${activeHexLabel}</strong>. Ask me anything, or type <strong>help</strong> and I'll figure out what to do here.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [awaitingHelpConfirm, setAwaitingHelpConfirm] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) { messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  }, [messages, isThinking]);

  // Nudge when page changes
  const prevHexId = useRef(activeHexId);
  useEffect(() => {
    if (prevHexId.current !== activeHexId && prevHexId.current !== "") {
      addAIMessage(
        `I see you switched to <strong>${activeHexLabel}</strong>. Type <strong>help</strong> if you need guidance.`
      );
    }
    prevHexId.current = activeHexId;
  }, [activeHexId]);

  // Nudge when KB mode changes
  const prevResearchMode = useRef(props.researchMode);
  useEffect(() => {
    if (
      activeHexId === 'research' &&
      props.researchMode &&
      prevResearchMode.current !== props.researchMode &&
      prevResearchMode.current !== undefined
    ) {
      const labels: Record<string, string> = {
        synthesis: 'Synthesis', personas: 'Personas',
        'read-edit-approve': 'Read/Edit/Approve',
        workspace: 'Workspace', 'custom-prompt': 'Custom Prompt',
      };
      addAIMessage(
        `Switched to <strong>${labels[props.researchMode] || props.researchMode}</strong> mode. Type <strong>help</strong> for guidance.`
      );
    }
    prevResearchMode.current = props.researchMode;
  }, [props.researchMode]);

  function addUserMessage(content: string) {
    setMessages([{ role: "user", content }]);
  }

  function addAIMessage(content: string, chips?: Chip[], steps?: string[]) {
    setMessages([{ role: "ai", content, chips, steps }]);
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || isThinking) return;
    setInput("");
    addUserMessage(text);
    setIsThinking(true);
    try { await handleAIResponse(text); } finally { setIsThinking(false); }
  }

  async function handleAIResponse(text: string) {
    const lower = text.toLowerCase().trim();

    if (lower === "help") {
      setAwaitingHelpConfirm(true);
      const manual = HELP_MANUAL[activeHexId] || FALLBACK_HELP;
      addAIMessage(
        `It looks like you're trying to <strong>${manual.guess}</strong>. Is that right?`,
        [
          { label: "Yes, walk me through it", value: "yes" },
          { label: "No, something else", value: "no" },
        ]
      );
      return;
    }

    if (awaitingHelpConfirm && ["yes", "yeah", "yep", "correct", "right", "yes, walk me through it"].includes(lower)) {
      setAwaitingHelpConfirm(false);
      showSteps(activeHexId);
      return;
    }

    if (awaitingHelpConfirm && ["no", "nope", "nah", "no, something else"].includes(lower)) {
      setAwaitingHelpConfirm(false);
      addAIMessage(
        "No problem — what are you trying to do? Pick a page:",
        Object.entries(HELP_MANUAL).map(([id, val]) => ({ label: val.guess, value: `help_${id}` }))
      );
      return;
    }

    setAwaitingHelpConfirm(false);

    const newHistory = [...conversationHistory, { role: "user", content: text }];
    const result = await executeAIPrompt({
      prompt: text,
      systemPrompt: buildSystemPrompt(props),
      conversationHistory,
      userEmail,
      userRole,
      includeKnowledgeBase: false,
    });

    if (result.success) {
      setConversationHistory([...newHistory, { role: "assistant", content: result.response }]);
      addAIMessage(result.response);
    } else {
      addAIMessage("I had trouble reaching the AI — please try again.");
    }
  }

  function showSteps(hexId: string) {
    const manual = HELP_MANUAL[hexId] || FALLBACK_HELP;
    addAIMessage(`Here's how to <strong>${manual.guess}</strong>:`, undefined, manual.steps);
  }

  function handleChipClick(chip: Chip) {
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, chips: undefined } : m)));
    if (chip.value.startsWith("help_")) {
      addUserMessage(chip.label);
      showSteps(chip.value.replace("help_", ""));
    } else {
      handleSend(chip.value);
    }
  }

  const contextBanner = buildContextBanner(props);

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg mb-4 overflow-hidden flex flex-col w-80" style={{ height: "300px" }}>

      {/* Header — blue ✦ icon on left, "Ask Help" on right, clickable to collapse */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b-2 cursor-pointer flex-shrink-0" style={{ backgroundColor: "#0A78AA", borderBottomColor: "#085f87" }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {/* AI sparkle emoji */}
          <span className="text-2xl leading-none flex-shrink-0">✨</span>
          {/* Context pill — shows current page/mode, hidden when collapsed */}
          {isExpanded && contextBanner && (
            <span className="text-xs text-teal-100 truncate max-w-[140px]">{contextBanner}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-semibold">Ask Help</span>
          <span className="text-teal-100 text-xs">{isExpanded ? "▾" : "▴"}</span>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Chat messages area — scrollable, fills available space */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 italic">
                Ask a question or type <strong>help</strong> for guided assistance.
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-0.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`px-2.5 py-1.5 rounded-lg text-xs leading-relaxed max-w-[90%] ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                  dangerouslySetInnerHTML={{ __html: msg.content }}
                />

                {/* Step list */}
                {msg.steps && msg.steps.length > 0 && (
                  <div className="w-full space-y-1 mt-1">
                    {msg.steps.map((step, si) => (
                      <div key={si} className="flex items-start gap-1.5 text-xs text-gray-700">
                        <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{si + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggestion chips */}
                {msg.chips && msg.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 max-w-full">
                    {msg.chips.map((chip, ci) => (
                      <button
                        key={ci}
                        onClick={() => handleChipClick(chip)}
                        className="px-2 py-0.5 rounded-full border border-blue-300 bg-blue-50 text-blue-700 text-xs hover:bg-blue-100 transition-colors"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isThinking && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 rounded-lg w-fit">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area — fixed 60px height, textarea + send button */}
          <div
            className="flex items-start gap-2 px-3 py-2 border-t-2 border-gray-300 flex-shrink-0 bg-white"
            style={{ height: "60px" }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isThinking) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask anything, or type 'help'…"
              disabled={isThinking}
              rows={2}
              className="flex-1 bg-gray-50 border-2 border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50 resize-none"
              style={{ height: "44px" }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isThinking}
              className="w-7 h-7 mt-0.5 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <span className="text-xs">➤</span>
            </button>
          </div>
        </>
      )}

      {/* Collapsed state — show a hint */}
      {!isExpanded && (
        <div className="flex-1 flex items-center px-3">
          <p className="text-xs text-gray-400 italic">Click to expand AI help</p>
        </div>
      )}
    </div>
  );
}