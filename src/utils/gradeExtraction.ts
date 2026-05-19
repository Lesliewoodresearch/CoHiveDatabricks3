/**
 * Grade hex scoring utilities — kept out of ProcessWireframe to manage file size.
 *
 * Exports:
 *   extractIdeasFromHexResults  — async AI call to pull idea candidates from hex output text
 *   buildGradeScoringPrompt     — pure function; builds the scoring prompt
 *   parseGradeResults           — splits AI response into scoreGrid + assessments blocks
 */

import { executeAIPrompt } from './databricksAI';
import { getPersonasForHex } from '../data/personas';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GradeSegment {
  id: string;
  name: string;
  populationEstimate?: number;
}

export interface GradeResults {
  scoreGrid: string;   // markdown table section
  assessments: string; // written assessment paragraphs (empty if numeric-only)
}

interface HexExecution {
  id: string;
  selectedFiles: string[];
  assessmentType: string[];
  assessment: string;
  timestamp: number;
}

// ── Idea extraction ───────────────────────────────────────────────────────────

/**
 * Calls a fast AI model to extract distinct ideas/strategies from all hex
 * output text in the current iteration (including stories).
 * Returns a clean string array, one idea per entry.
 */
export async function extractIdeasFromHexResults(
  hexExecutions: Record<string, HexExecution[]>,
  userEmail: string,
  userRole: string,
  modelEndpoint = 'databricks-claude-haiku-4-5',
): Promise<string[]> {
  // Collect all hex output text — all hexes including stories
  const sections: string[] = [];
  for (const [hexId, executions] of Object.entries(hexExecutions)) {
    if (!executions || executions.length === 0) continue;
    for (const exec of executions) {
      if (!exec.assessment?.trim()) continue;
      sections.push(`[${hexId}]\n${exec.assessment.trim()}`);
    }
  }

  if (sections.length === 0) return [];

  const combinedText = sections.join('\n\n---\n\n');

  const extractionPrompt = `Extract the key ideas and concepts from these discussions to be scored and graded.

Structure your output as follows:
1. First line: the single core concept or Big Idea — the overarching premise or strategic direction.
2. Lines 2–5: group all remaining distinct elements, themes, or strategies into 3–4 combined entries. Each entry should cluster related ideas together into one concise description.

Rules:
- Return exactly 4–5 numbered items total (1 core concept + 3–4 grouped elements).
- Each item is one sentence max, no explanation.
- Do not list methodology, process steps, or questions — only actual ideas and themes.
- Consolidate overlapping ideas; do not repeat the same concept in different words.

DISCUSSIONS:
${combinedText}`;

  try {
    const result = await executeAIPrompt({
      prompt: extractionPrompt,
      modelEndpoint,
      maxTokens: 1000,
      temperature: 0.1,
      userEmail,
      userRole,
    });

    if (!result.success || !result.response) return [];

    // Parse numbered list: "1. Idea text" or "- Idea text"
    return result.response
      .split('\n')
      .map(line => line.replace(/^[\d]+\.\s*/, '').replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim())
      .filter(line => {
        if (line.length <= 10) return false;
        if (line.endsWith(':')) return false;        // heading/label line
        if (line.startsWith('#')) return false;      // markdown header
        if (line === line.toUpperCase() && /[A-Z]{3}/.test(line)) return false; // ALL-CAPS label
        return true;
      });
  } catch {
    return [];
  }
}

// ── Segment lookup ────────────────────────────────────────────────────────────

/**
 * Given an array of selected persona IDs from the Grade hex segment picker,
 * returns GradeSegment objects with name and populationEstimate.
 */
export function resolveGradeSegments(selectedPersonaIds: string[]): GradeSegment[] {
  const config = getPersonasForHex('Grade');
  if (!config) return selectedPersonaIds.map(id => ({ id, name: id }));

  const lookup = new Map<string, { name: string; populationEstimate?: number }>();
  for (const level1 of config.options) {
    for (const level2 of level1.subcategories ?? []) {
      for (const role of level2.roles ?? []) {
        lookup.set(role.id, { name: role.name, populationEstimate: role.populationEstimate });
      }
    }
    for (const role of level1.roles ?? []) {
      lookup.set(role.id, { name: role.name, populationEstimate: role.populationEstimate });
    }
  }

  return selectedPersonaIds.map(id => {
    const found = lookup.get(id);
    return { id, name: found?.name ?? id, populationEstimate: found?.populationEstimate };
  });
}

// ── Prompt builder ────────────────────────────────────────────────────────────

const ZAPPI_QUESTIONS = [
  'Brand Fit',
  'Standout',
  'Emotion',
  'Relevance',
  'Understanding',
  'Purchase Intent',
  'Brand Appeal',
] as const;

/**
 * Builds the scoring prompt. Pure function — no side effects.
 * `scale` is one of the testingScale radio values from CentralHexView.
 * `includeZappiQuestions` adds the 7 Zappi concept-testing dimensions per segment.
 * `ideas` may be empty when Zappi-only mode is active.
 */
export function buildGradeScoringPrompt(
  ideas: string[],
  segments: GradeSegment[],
  scale: string,
  brand: string,
  projectType: string,
  includeZappiQuestions = false,
): string {
  const scaleLabel = scale.startsWith('scale-1-5')
    ? '1 to 5 (1 = would not respond, 5 = would respond very strongly)'
    : scale.startsWith('scale-1-10')
    ? '1 to 10 (1 = would not respond, 10 = would respond very strongly)'
    : null;

  const includeWritten = scale === 'no-scale-written' || (scale.includes('written') && !scale.includes('no-written'));
  const hasIdeas = ideas.length > 0;

  const segmentLines = segments
    .map(s => `- ${s.name}${s.populationEstimate != null ? ` (${s.populationEstimate}% of US market)` : ''}`)
    .join('\n');

  const scaleInstruction = scaleLabel
    ? `Rate responses on a scale of ${scaleLabel}.`
    : `Do not assign a numeric score — provide written assessments only.`;

  const zappiInstruction = includeZappiQuestions
    ? `\nFor each segment, score all 7 Zappi concept-testing dimensions:\n${ZAPPI_QUESTIONS.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}`
    : '';

  const zappiScoreLines = includeZappiQuestions
    ? ZAPPI_QUESTIONS.map(q => `  • ${q}: [score]`).join('\n') + '\n'
    : '';

  let outputInstructions: string;

  if (hasIdeas) {
    const ideaLines = ideas.map((idea, i) => `${i + 1}. ${idea}`).join('\n');
    const segmentBlock = scaleLabel
      ? `[Segment Name]${includeZappiQuestions ? ' ([pop%]) — Overall: [score]' : ' ([pop%]) — [score]'}\n${zappiScoreLines}${includeWritten ? '[One paragraph: why this segment would or would not respond to this idea]\n' : ''}`
      : `[Segment Name] ([pop%])\n${zappiScoreLines}${includeWritten ? '[One paragraph: why this segment would or would not respond to this idea]\n' : ''}`;

    outputInstructions = `OUTPUT FORMAT — follow exactly:

TOPIC: [Exact idea text]

${segmentBlock}
(repeat block for each segment, separated by a blank line)

---

(repeat TOPIC section for each idea)

IDEAS TO EVALUATE:
${ideaLines}

TARGET SEGMENTS:
${segmentLines}`;
  } else {
    // Zappi-only: no ideas, evaluate each segment on Zappi dimensions
    const segmentBlock = scaleLabel
      ? `SEGMENT: [Segment Name] ([pop%]) — Overall: [score]\n${zappiScoreLines}${includeWritten ? '[One paragraph: how this segment relates to the brand overall]\n' : ''}`
      : `SEGMENT: [Segment Name] ([pop%])\n${zappiScoreLines}${includeWritten ? '[One paragraph: how this segment relates to the brand overall]\n' : ''}`;

    outputInstructions = `OUTPUT FORMAT — follow exactly:

${segmentBlock}
---

(repeat for each segment)

TARGET SEGMENTS:
${segmentLines}`;
  }

  return `You are a market research scoring tool.
Brand: ${brand}${projectType ? `\nProject type: ${projectType}` : ''}

Your task: evaluate how each target consumer segment would respond to${hasIdeas ? ' each idea as a way to market' : ''} ${brand}.

${scaleInstruction}${zappiInstruction}

${outputInstructions}`;
}

// ── Result parser ─────────────────────────────────────────────────────────────

/**
 * Splits the raw AI scoring response into two labeled blocks for separate
 * storage in the iteration file.
 */
export function parseGradeResults(rawResponse: string): GradeResults {
  const gridMarker = /SCORE\s*GRID\s*:/i;
  const assessmentMarker = /WRITTEN\s*ASSESSMENTS?\s*:/i;

  const gridMatch = rawResponse.search(gridMarker);
  const assessmentMatch = rawResponse.search(assessmentMarker);

  if (gridMatch === -1 && assessmentMatch === -1) {
    // No markers — treat entire response as assessments
    return { scoreGrid: '', assessments: rawResponse.trim() };
  }

  if (gridMatch !== -1 && assessmentMatch === -1) {
    // Only a grid (numeric-only mode)
    const gridText = rawResponse.slice(gridMatch).replace(gridMarker, '').trim();
    return { scoreGrid: gridText, assessments: '' };
  }

  if (gridMatch === -1 && assessmentMatch !== -1) {
    // Only written assessments (no-scale mode)
    const assessText = rawResponse.slice(assessmentMatch).replace(assessmentMarker, '').trim();
    return { scoreGrid: '', assessments: assessText };
  }

  // Both sections present
  const gridText = rawResponse
    .slice(gridMatch, assessmentMatch)
    .replace(gridMarker, '')
    .trim();
  const assessText = rawResponse
    .slice(assessmentMatch)
    .replace(assessmentMarker, '')
    .trim();

  return { scoreGrid: gridText, assessments: assessText };
}

// ── Iteration file formatter ──────────────────────────────────────────────────

/**
 * Formats grade results into two clearly labeled blocks for the iteration .txt.
 * Each block can be independently included in Findings output.
 */
export function formatGradeForIteration(results: GradeResults): string {
  const parts: string[] = [];

  if (results.scoreGrid) {
    parts.push(`[Grade: Score Grid]\n${results.scoreGrid}`);
  }

  if (results.assessments) {
    parts.push(`[Grade: Written Assessments]\n${results.assessments}`);
  }

  return parts.join('\n\n');
}
