/**
 * Assessment Run API
 *
 * Runs a multi-round AI collaboration assessment using personas and KB files.
 * - Fetches file content directly from Databricks (never trusts frontend content)
 * - System prompt and KB content stay server-side, never sent to client
 * - Returns only the AI-generated round outputs to the frontend
 *
 * BJS additions:
 *   - shuffleArray(): mirrors random.shuffle(roundtable.names) in cohive.py.
 *     Prevents the first persona from always anchoring the conversation.
 *   - Summarizer pass: after all rounds, runs a neutral summarizer agent using
 *     SUMMARIZER_SYSTEM_PROMPT. Maps to Conversation.summarize_conversation()
 *     in cohive.py. The summarizer receives only the round outputs — never the
 *     system prompt or KB content — so it cannot be biased by framing.
 *
 * Location: api/databricks/assessment/run.js
 */

const { getPersonaContent } = require('../../../src/data/personaContentData.cjs');

// BJS: LUMINARY_PERSONAS and SUMMARIZER_SYSTEM_PROMPT are defined in
// src/utils/personas.ts for the frontend. We duplicate the summarizer prompt
// here server-side so the API never depends on a client-side import.
const SUMMARIZER_SYSTEM_PROMPT = `You are a neutral summarization agent. Your task is to summarize the provided conversation accurately, concisely, and without interpretation, judgment, or emotional coloring.`;

// BJS: Mirrors random.shuffle() from Python cohive.py Conversation class.
// Fisher-Yates in-place shuffle — returns the same array shuffled.
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      hexId,
      hexLabel,
      brand,
      projectType,
      assessmentTypes,
      userSolution,
      ideasFile,
      selectedPersonas,
      kbFiles,
      userEmail,
      accessToken,
      workspaceHost,
      // BJS: Conversation settings from template
      conversationMode = 'multi-round',
      modelEndpoint = 'databricks-claude-sonnet-4-6',
    } = req.body;

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!kbFiles || kbFiles.length === 0) {
      return res.status(400).json({ error: 'At least one knowledge base file is required' });
    }

    console.log(`[Assessment] Starting — hex: ${hexId}, brand: ${brand}`);
    console.log(`[Assessment] Types: ${assessmentTypes?.join(', ')}`);
    console.log(`[Assessment] selectedPersonas RECEIVED:`, JSON.stringify(selectedPersonas));
    console.log(`[Assessment] selectedPersonas type:`, typeof selectedPersonas, 'Array?', Array.isArray(selectedPersonas));
    console.log(`[Assessment] selectedPersonas length:`, selectedPersonas?.length);
    console.log(`[Assessment] Personas (pre-shuffle): ${selectedPersonas?.join(', ')}`);
    console.log(`[Assessment] KB files: ${kbFiles?.map(f => f.fileName).join(', ')}`);
    // BJS: Log conversation settings
    console.log(`[Assessment] Conversation mode: ${conversationMode}`);
    console.log(`[Assessment] Model endpoint: ${modelEndpoint}`);

    const warehouseId = '52742af9db71826d';

    // ── Step 1: Fetch actual file content from Databricks ─────────────────
    console.log(`[Assessment] ──────────────────────────────────────────────────`);
    console.log(`[Assessment] Step 1: Fetching ${kbFiles.length} file(s) from Databricks...`);
    console.log(`[Assessment] Warehouse ID: ${warehouseId}`);
    console.log(`[Assessment] Workspace: ${workspaceHost}`);
    
    const kbFilesWithContent = await Promise.all(
      kbFiles.map(async (kbFile) => {
        try {
          console.log(`[Assessment] ──────────────────────────────────────────────────`);
          console.log(`[Assessment] Fetching: ${kbFile.fileName}`);
          console.log(`[Assessment] File ID: ${kbFile.fileId || 'NOT PROVIDED'}`);
          console.log(`[Assessment] File brand: ${kbFile.brand || 'N/A'}`);
          console.log(`[Assessment] File projectType: ${kbFile.projectType || 'N/A'}`);

          const idClause = kbFile.fileId
            ? `file_id = '${kbFile.fileId.replace(/'/g, "''")}'`
            : `file_name = '${kbFile.fileName.replace(/'/g, "''")}'`;

          console.log(`[Assessment] SQL WHERE clause: ${idClause}`);

          const metaResp = await fetch(
            `https://${workspaceHost}/api/2.0/sql/statements`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                warehouse_id: warehouseId,
                statement: `SELECT file_id, file_path, file_name, file_type, file_size_bytes
                            FROM knowledge_base.cohive.file_metadata
                            WHERE ${idClause} LIMIT 1`,
                wait_timeout: '30s',
              }),
            }
          );

          if (!metaResp.ok) {
            const errorBody = await metaResp.text();
            console.error(`[Assessment] ❌ Metadata query HTTP error: ${metaResp.status}`);
            console.error(`[Assessment] Error body:`, errorBody);
            throw new Error(`Metadata query failed: ${metaResp.status} ${metaResp.statusText}`);
          }

          const metaResult = await metaResp.json();
          console.log(`[Assessment] Metadata query response:`, JSON.stringify(metaResult, null, 2));
          
          const rows = metaResult.result?.data_array || [];
          console.log(`[Assessment] Query returned ${rows.length} row(s)`);

          if (rows.length === 0) {
            console.error(`[Assessment] ❌ File not found in knowledge_base.cohive.file_metadata`);
            console.error(`[Assessment] Searched using: ${idClause}`);
            throw new Error(`File not found in knowledge base: "${kbFile.fileName}". Please refresh the file list and try again.`);
          }

          const [resolvedFileId, filePath, fileName, fileType, fileSizeBytes] = rows[0];
          console.log(`[Assessment] ✅ File metadata found:`);
          console.log(`[Assessment]    - Resolved ID: ${resolvedFileId}`);
          console.log(`[Assessment]    - File path: ${filePath}`);
          console.log(`[Assessment]    - File name: ${fileName}`);
          console.log(`[Assessment]    - File type: ${fileType}`);
          console.log(`[Assessment]    - Size: ${fileSizeBytes} bytes`);

          const downloadUrl = `https://${workspaceHost}/api/2.0/fs/files${filePath}`;
          console.log(`[Assessment] Downloading from: ${downloadUrl}`);

          const fileResp = await fetch(
            downloadUrl,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (!fileResp.ok) {
            console.error(`[Assessment] ❌ File download failed: ${fileResp.status} ${fileResp.statusText}`);
            throw new Error(`File download failed: ${fileResp.status} ${fileResp.statusText}`);
          }

          const fileBuffer = Buffer.from(await fileResp.arrayBuffer());
          console.log(`[Assessment] ✅ Downloaded ${fileBuffer.length} bytes for ${fileName}`);

          const ext = fileName.toLowerCase().split('.').pop();
          let textContent = '';

          if (['txt', 'md', 'csv'].includes(ext)) {
            textContent = fileBuffer.toString('utf-8');

          } else if (ext === 'pdf') {
            try {
              console.log(`[Assessment] Starting PDF extraction for ${fileName}...`);
              const pdfParse = (await import('pdf-parse')).default;
              console.log(`[Assessment] pdf-parse module loaded successfully`);
              const parsed = await pdfParse(fileBuffer);
              textContent = parsed.text || '';
              console.log(`[Assessment] ✅ PDF extraction successful: ${textContent.length} chars from ${fileName}`);
            } catch (e) {
              console.error(`[Assessment] ❌ PDF extraction error for ${fileName}:`, e);
              textContent = `[PDF extraction failed for ${fileName}: ${e.message}. This may be due to a corrupted PDF or unsupported format. Please try converting to .txt, .docx, or uploading a different PDF.]`;
            }

          } else if (['docx', 'doc'].includes(ext)) {
            try {
              const mammoth = await import('mammoth');
              const result = await mammoth.extractRawText({ buffer: fileBuffer });
              textContent = result.value || '';
              console.log(`[Assessment] DOCX: ${textContent.length} chars`);
            } catch (e) {
              textContent = `[DOCX extraction failed for ${fileName}: ${e.message}]`;
            }

          } else if (['xlsx', 'xls'].includes(ext)) {
            try {
              const XLSX = await import('xlsx');
              const wb = XLSX.read(fileBuffer, { type: 'buffer' });
              const lines = [];
              wb.SheetNames.forEach(sheet => {
                lines.push(`=== ${sheet} ===`);
                lines.push(XLSX.utils.sheet_to_csv(wb.Sheets[sheet]));
              });
              textContent = lines.join('\n\n');
            } catch (e) {
              textContent = `[XLSX extraction failed for ${fileName}: ${e.message}]`;
            }

          } else {
            try {
              textContent = fileBuffer.toString('utf-8');
            } catch {
              textContent = `[Cannot extract text from ${fileName}]`;
            }
          }

          if (textContent.length > 80000) {
            textContent = textContent.slice(0, 80000) + '\n\n[... content truncated ...]';
          }

          return { fileId: resolvedFileId, fileName, content: textContent };

        } catch (err) {
          console.error(`[Assessment] Error loading ${kbFile.fileName}:`, err.message);
          console.error(`[Assessment] Full error:`, err);
          console.error(`[Assessment] Stack trace:`, err.stack);
          throw err;
        }
      })
    );

    // ── Step 2: Build prompts (server-side only, never returned to client) ─
    const assessmentTypeLabel = assessmentTypes?.includes('recommend') ? 'Recommend'
      : assessmentTypes?.includes('assess') ? 'Assess'
      : 'Unified';

    // Decode ideas file (base64 data URL) if the user chose "Load Current Ideas"
    let ideasContent = '';
    if (ideasFile?.content) {
      try {
        const b64 = ideasFile.content.includes(',')
          ? ideasFile.content.split(',')[1]
          : ideasFile.content;
        ideasContent = Buffer.from(b64, 'base64').toString('utf-8');
        console.log(`[Assessment] Ideas file decoded: ${ideasContent.length} chars from ${ideasFile.fileName}`);
      } catch (e) {
        console.warn('[Assessment] Could not decode ideas file:', e.message);
        ideasContent = ideasFile.content;
      }
    }

    let taskDescription = '';
    if (assessmentTypes?.includes('recommend')) {
      taskDescription = `Generate creative, specific recommendations for ${brand} in the context of ${hexLabel || hexId}. Ground every recommendation in the knowledge base files.`;
      if (ideasContent) {
        taskDescription += `\n\nCurrent ideas/work to build on:\n${ideasContent}`;
      }
    } else if (assessmentTypes?.includes('assess')) {
      const contentToAssess = ideasContent || userSolution || 'No content provided';
      taskDescription = `Critically assess the following content and provide detailed, constructive feedback:\n\n${contentToAssess}`;
    } else {
      taskDescription = `Collaborate to produce a unified, actionable recommendation for ${brand} in the ${hexLabel || hexId} context.`;
      if (ideasContent) {
        taskDescription += `\n\nCurrent ideas/work to assess and build on:\n${ideasContent}`;
      } else if (userSolution) {
        taskDescription += `\n\nSolution to consider: "${userSolution}"`;
      }
    }

    // ── BJS: Shuffle persona order ─────────────────────────────────────────
    // Mirrors random.shuffle(roundtable.names) in cohive.py Conversation class.
    // Prevents any single persona from consistently anchoring the discussion.
    // Fact-Checker is always appended after the shuffle so it never leads.
    const basePersonas = selectedPersonas?.length > 0 ? [...selectedPersonas] : ['General Expert'];
    
    // Load persona content from JSON files
    console.log(`[Assessment] Loading persona content for ${basePersonas.length} personas...`);
    const personaData = basePersonas.map(personaId => {
      const content = getPersonaContent(personaId);
      console.log(`[Assessment] Loaded persona: ${content.name} (${personaId})`);
      return content;
    });
    
    const shuffledPersonaData = shuffleArray(personaData);
    const personaNames = shuffledPersonaData.map(p => p.name);
    const personaList = [...personaNames, 'Fact-Checker'].join(', ');

    console.log(`[Assessment] Personas (post-shuffle): ${personaList}`);

    // Build persona context section with each persona's background
    const personaContextSection = shuffledPersonaData.map(persona => {
      return `### ${persona.name}
Context: ${persona.context}
${persona.description ? `Description: ${persona.description}` : ''}
${persona.detailedProfile ? `Profile: ${persona.detailedProfile.substring(0, 500)}...` : ''}`;
    }).join('\n\n');

    const kbContext = kbFilesWithContent
      .map(f => `--- BEGIN FILE: ${f.fileName} ---\n${f.content}\n--- END FILE: ${f.fileName} ---`)
      .join('\n\n');

    const systemPrompt = `You are facilitating a multi-persona collaborative assessment for ${brand}.

KNOWLEDGE BASE:
${kbContext}

PERSONA DETAILS:
${personaContextSection}

CRITICAL CITATION RULES - MANDATORY FOR EVERY RESPONSE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  EVERY factual claim, data point, or insight MUST include an inline citation
⚠️  Citation format: [Source: exact_filename.ext] immediately after the claim
⚠️  You MUST cite one of these exact files (copy the name exactly):
${kbFilesWithContent.map(f => `    • ${f.fileName}`).join('\n')}
⚠️  For general knowledge not from files: [General Knowledge]
⚠️  NO EXCEPTIONS - if you make a claim, you MUST cite it
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE OF CORRECT CITATION FORMAT:
"Nike's market share increased 15% [Source: Nike_Q3_Report.pdf] while competitor brands declined [Source: Market_Analysis_2024.xlsx]. The brand appeals to younger demographics [General Knowledge]."

ASSESSMENT TYPE: ${assessmentTypeLabel}
BRAND: ${brand}
PROJECT TYPE: ${projectType || 'General'}
CONTEXT: ${hexLabel || hexId}

OUTPUT FORMAT: Use clean, structured Markdown for every round.

## Round [N]

### [Persona Name]

[Detailed contribution with inline citations after EVERY claim]

**Key Insights:**
- Insight 1 with supporting data [Source: filename.ext]
- Insight 2 from research [Source: filename.ext]

**Recommendations:**
- Recommendation 1 based on findings [Source: filename.ext]
- Recommendation 2 grounded in data [Source: filename.ext]

---

### Fact-Checker

**Citation Verification:**
- ✅ [Source: filename.ext] - Verified in KB, accurately reflects content
- ✅ [Source: filename.ext] - Confirmed and accurate

**Summary:** All citations verified and accurate.

---

Run minimum 2 rounds. When output is complete and high-quality, end with:

## Assessment Complete

[COLLABORATION COMPLETE]`;

    const initialPrompt = `Begin a multi-round collaborative assessment. Each persona reviews the knowledge base and contributes their expert perspective.

Always include a "Fact-Checker" whose only job is verifying every citation exists in the KB and accurately reflects the source.

Task: ${taskDescription}
Personas (in this order): ${personaList}

Begin Round 1 now.`;

    // ── Step 3: Run multi-round collaboration ──────────────────────────────
    const rounds = [];
    let conversationHistory = [{ role: 'user', content: initialPrompt }];
    let roundNumber = 1;
    let isComplete = false;
    const maxRounds = 3;

    // BJS: Branching logic — Incremental vs Multi-Round conversation modes
    if (conversationMode === 'incremental') {
      // ── BJS: INCREMENTAL CONVERSATION MODE ──────────────────────────────
      // Mirrors Conversation class from Python cohive.py
      // Each persona responds sequentially, seeing all prior responses
      console.log('[Assessment] Using INCREMENTAL conversation mode');
      
      let conversation = `## ${brand} Assessment - ${assessmentTypeLabel}\n\n**Task:** ${taskDescription}\n\n---\n\n`;
      
      // BJS: Process each persona sequentially
      for (let i = 0; i < shuffledPersonaData.length; i++) {
        const persona = shuffledPersonaData[i];
        console.log(`[Assessment] Incremental: ${persona.name} responding...`);
        
        // BJS: Build prompt for this persona including KB context, citation rules, and conversation
        const personaPrompt = `You are ${persona.name}.

KNOWLEDGE BASE FILES (you MUST cite these):
${kbContext}

⚠️  CRITICAL CITATION RULES - MANDATORY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• EVERY factual claim MUST have [Source: filename.ext]
• Use these EXACT filenames (copy precisely):
${kbFilesWithContent.map(f => `  - ${f.fileName}`).join('\n')}
• Format: Your claim here [Source: exact_filename.ext]
• For general knowledge: [General Knowledge]
• NO EXCEPTIONS - cite everything or don't say it
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE: "Nike's Q3 revenue grew 12% [Source: Nike_Report.pdf] while Adidas declined [Source: Market_Data.xlsx]. Brand loyalty remains strong [General Knowledge]."

YOUR BACKGROUND:
${persona.context}
${persona.description ? `\n${persona.description}` : ''}

TASK: ${taskDescription}

BRAND: ${brand}
PROJECT TYPE: ${projectType || 'General'}
CONTEXT: ${hexLabel || hexId}

CONVERSATION SO FAR:
${i === 0 ? '(You are the first to speak)' : conversation}

Provide your detailed analysis as ${persona.name}. REMEMBER: Every single claim needs [Source: filename.ext] immediately after it.

Format clearly with:
- Main insights with citations
- Specific recommendations with citations
- All facts cited as [Source: filename.ext]`;

        const personaResp = await fetch(
          `https://${workspaceHost}/serving-endpoints/${modelEndpoint}/invocations`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [
                { role: 'user', content: personaPrompt },
              ],
              max_tokens: 2000,
              temperature: 0.8,
            }),
          }
        );

        if (!personaResp.ok) {
          const errData = await personaResp.json().catch(() => ({}));
          throw new Error(`Incremental conversation failed for ${persona.name}: ${errData.message || personaResp.statusText}`);
        }

        const personaResult = await personaResp.json();
        const personaResponse = personaResult.choices?.[0]?.message?.content || '';

        // BJS: Append to conversation history
        conversation += `### ${persona.name}\n\n${personaResponse}\n\n---\n\n`;
        
        console.log(`[Assessment] Incremental: ${persona.name} done (${personaResponse.length} chars)`);
      }

      // BJS: Add Fact-Checker at the end
      console.log(`[Assessment] Incremental: Fact-Checker verifying citations...`);
      
      const factCheckerPrompt = `You are a Fact-Checker. Your only job is to verify that all citations in the conversation are accurate.

KNOWLEDGE BASE FILES AVAILABLE:
${kbFilesWithContent.map(f => `- ${f.fileName}`).join('\n')}

CONVERSATION TO VERIFY:
${conversation}

TASK:
1. List every [Source: filename.ext] citation used
2. Verify each one exists in the knowledge base files listed above
3. Flag any citations that don't match exactly
4. Confirm all claims are properly supported

Format:
**Citation Verification:**
- ✅ [Source: filename.ext] - Verified in KB
- ✅ [Source: filename.ext] - Verified in KB
- ❌ [Source: wrong.pdf] - NOT FOUND in KB (if any are wrong)

**Summary:** [Your verification summary]`;

      const factCheckResp = await fetch(
        `https://${workspaceHost}/serving-endpoints/${modelEndpoint}/invocations`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: 'user', content: factCheckerPrompt },
            ],
            max_tokens: 1500,
            temperature: 0.3,
          }),
        }
      );

      if (factCheckResp.ok) {
        const factCheckResult = await factCheckResp.json();
        const factCheckResponse = factCheckResult.choices?.[0]?.message?.content || '';
        conversation += `### Fact-Checker\n\n${factCheckResponse}\n\n---\n\n`;
        console.log(`[Assessment] Fact-Checker done (${factCheckResponse.length} chars)`);
      }

      // BJS: For unified mode, add consensus-building step
      if (assessmentTypes?.includes('unified')) {
        console.log('[Assessment] Incremental: Running consensus builder for unified mode...');
        
        const consensusPrompt = `Review the entire conversation above from all personas.

Your task is to synthesize their insights into ONE unified, actionable recommendation for ${brand}.

Requirements:
- Create a single coherent recommendation (not multiple options)
- Incorporate the strongest insights from all personas
- Cite knowledge base sources for all claims [Source: filename.ext]
- Be specific and actionable
- Resolve any disagreements with data-driven reasoning

Conversation to synthesize:
${conversation}`;

        const consensusResp = await fetch(
          `https://${workspaceHost}/serving-endpoints/${modelEndpoint}/invocations`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [
                { role: 'user', content: consensusPrompt },
              ],
              max_tokens: 2500,
              temperature: 0.7,
              stream: true,
            }),
          }
        );

        if (!consensusResp.ok) {
          const errData = await consensusResp.json().catch(() => ({}));
          throw new Error(`Consensus building failed: ${errData.message || consensusResp.statusText}`);
        }

        let consensusResponse = '';
        const reader = consensusResp.body.getReader();
        const decoder = new TextDecoder();

        res.write(`data: ${JSON.stringify({ type: 'persona_start', persona: 'Consensus Builder' })}\n\n`);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

          for (const line of lines) {
            const jsonStr = line.replace(/^data:\s*/, '');
            if (jsonStr === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                consensusResponse += delta;
                res.write(`data: ${JSON.stringify({ type: 'stream', content: delta, persona: 'Consensus Builder' })}\n\n`);
              }
            } catch (e) {
              // Skip unparseable chunks
            }
          }
        }

        res.write(`data: ${JSON.stringify({ type: 'persona_complete', persona: 'Consensus Builder' })}\n\n`);

        conversation += `\n\n### Unified Recommendation\n\n${consensusResponse}`;
        console.log(`[Assessment] Consensus builder done (${consensusResponse.length} chars)`);
      }

      // BJS: Store the incremental conversation as a single "round"
      rounds.push({
        roundNumber: 1,
        content: conversation,
        timestamp: new Date().toISOString(),
      });

    } else {
      // ── BJS: MULTI-ROUND CONVERSATION MODE (existing logic) ──────────────

    while (!isComplete && roundNumber <= maxRounds) {
      console.log(`[Assessment] Round ${roundNumber}...`);

      const aiResp = await fetch(
        `https://${workspaceHost}/serving-endpoints/${modelEndpoint}/invocations`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
            ],
            max_tokens: 3000,
            temperature: 0.8,
          }),
        }
      );

      if (!aiResp.ok) {
        const errData = await aiResp.json().catch(() => ({}));
        throw new Error(`AI call failed (round ${roundNumber}): ${errData.message || aiResp.statusText}`);
      }

      const aiResult = await aiResp.json();
      const roundContent = aiResult.choices?.[0]?.message?.content || '';

      // Only store the AI output — prompts and KB content are never included
      rounds.push({
        roundNumber,
        content: roundContent,
        timestamp: new Date().toISOString(),
      });

      console.log(`[Assessment] Round ${roundNumber} done (${roundContent.length} chars)`);

      if (roundContent.includes('[COLLABORATION COMPLETE]') || roundNumber >= maxRounds) {
        isComplete = true;
      } else {
        conversationHistory = [
          ...conversationHistory,
          { role: 'assistant', content: roundContent },
          {
            role: 'user',
            content: `Good work on Round ${roundNumber}. Continue with Round ${roundNumber + 1}. Deepen the analysis, build on previous contributions, and cite all KB references as [Source: filename.ext]. If the output is complete and high-quality, end with [COLLABORATION COMPLETE].`,
          },
        ];
      }

      roundNumber++;
    }
    }

    // ── Step 4: BJS Summarizer pass ───────────────────────────────────────
    // Maps to Conversation.summarize_conversation() in cohive.py.
    // A separate neutral agent reads only the round outputs — it never sees
    // the system prompt, KB content, or conversation scaffolding — so it
    // cannot be anchored by the framing used to guide the personas.
    let summary = null;
    try {
      console.log(`[Assessment] Running summarizer pass...`);

      const allRoundContent = rounds
        .map(r => `## Round ${r.roundNumber}\n\n${r.content}`)
        .join('\n\n---\n\n');

      const summaryResp = await fetch(
        `https://${workspaceHost}/serving-endpoints/${modelEndpoint}/invocations`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: SUMMARIZER_SYSTEM_PROMPT },
              {
                role: 'user',
                content: `Summarize the following multi-persona assessment for ${brand} (${assessmentTypeLabel}):\n\n${allRoundContent}`,
              },
            ],
            max_tokens: 1500,
            temperature: 0.3, // BJS: low temperature for factual, stable summaries
          }),
        }
      );

      if (summaryResp.ok) {
        const summaryResult = await summaryResp.json();
        summary = summaryResult.choices?.[0]?.message?.content || null;
        console.log(`[Assessment] Summarizer done (${summary?.length || 0} chars)`);
      } else {
        // Non-fatal — rounds still returned even if summarizer fails
        console.warn(`[Assessment] Summarizer failed: ${summaryResp.status} — continuing without summary`);
      }
    } catch (summaryErr) {
      console.warn(`[Assessment] Summarizer error (non-fatal):`, summaryErr.message);
    }

    // ── Step 5: Extract cited files ────────────────────────────────────────
    const allContent = rounds.map(r => r.content).join('\n');
    const citationMatches = [...allContent.matchAll(/\[Source:\s*([^\]]+)\]/g)];
    const citedFileNames = [...new Set(citationMatches.map(m => m[1].trim()))];

    const citedFiles = citedFileNames.map(name => {
      const match = kbFilesWithContent.find(
        f => f.fileName === name || f.fileName.toLowerCase() === name.toLowerCase()
      );
      return { fileName: name, fileId: match?.fileId || null };
    });

    console.log(`[Assessment] Complete — ${rounds.length} rounds, ${citedFiles.length} citations, summary: ${summary ? 'yes' : 'no'}`);

    // ── Step 6: Increment citation_count for cited files ──────────────────
    // Track which files were actually cited in the assessment
    console.log(`[Assessment] Incrementing citation counts for ${citedFiles.length} files...`);
    
    for (const citedFile of citedFiles) {
      if (citedFile.fileId) {
        try {
          const incrementSQL = `
            UPDATE knowledge_base.cohive.file_metadata
            SET 
              citation_count = citation_count + 1,
              updated_at = CURRENT_TIMESTAMP()
            WHERE file_id = '${citedFile.fileId.replace(/'/g, "''")}'
          `;
          
          await fetch(
            `https://${workspaceHost}/api/2.0/sql/statements`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                warehouse_id: warehouseId,
                statement: incrementSQL,
                wait_timeout: '10s',
              }),
            }
          );
          
          console.log(`[Assessment] ✅ Incremented citation_count for: ${citedFile.fileName}`);
        } catch (err) {
          // Non-fatal — assessment already complete
          console.warn(`[Assessment] ⚠️ Failed to increment citation for ${citedFile.fileName}:`, err.message);
        }
      }
    }

    // Return ONLY AI outputs. System prompt, KB content, and conversation
    // scaffolding are never included in the response to the browser.
    return res.status(200).json({
      success: true,
      hexId,
      brand,
      projectType,
      assessmentType: assessmentTypeLabel,
      rounds,
      totalRounds: rounds.length,
      citedFiles,
      summary,         // BJS: neutral summary from summarizer pass (may be null if summarizer failed)
      personaOrder: personaList, // BJS: the shuffled order used — useful for debugging
      completedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Assessment] Error:', error);
    return res.status(500).json({
      error: 'Assessment failed',
      message: error.message,
    });
  }
}