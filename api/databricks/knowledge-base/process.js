/**
 * Knowledge Base Process API
 *
 * Converts non-text KB files to .txt format with:
 *   - Faithful full text extraction (no summarisation)
 *   - AI image descriptions inline as [IMAGE: description]
 *   - Saves result as a new _txt file with its own file_id
 *   - Original file is preserved unchanged
 *   - Generates content_summary, tags, suggestedBrand, suggestedProjectTypes
 *   - Both original and _txt records get cleaning_status = 'processed'
 *
 * Location: api/databricks/knowledge-base/process.js
 */

import { getDatabricksConfig } from '../../utils/validateEnv.js';

const MAX_CONTENT_CHARS = 200_000;

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']);
const AUDIO_EXTENSIONS = new Set(['webm', 'mp3', 'wav', 'ogg', 'm4a']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const isMockMode = !process.env.DATABRICKS_HOST ||
                       !process.env.DATABRICKS_TOKEN ||
                       process.env.VITE_MOCK_MODE === 'true';

    if (isMockMode) {
      console.log('[Mock Mode] Knowledge Base process - simulating file processing');
      const { fileId } = req.body;
      if (!fileId) return res.status(400).json({ error: 'Missing required field: fileId' });
      const txtFileId = fileId + '_txt';
      const mockFileName = 'mock-file.pdf';
      const txtFileName = mockFileName.replace(/\.[^/.]+$/, '') + '_txt.txt';
      return res.status(200).json({
        success: true, fileId, txtFileId, fileName: mockFileName, txtFileName,
        txtFilePath: '/mock/volumes/knowledge_base/cohive/files/' + txtFileName,
        summary: 'Mock file processed successfully', tags: 'processed, mock',
        extractionMethod: 'mock', cleaningStatus: 'processed',
        suggestedBrand: 'Mock Brand', suggestedProjectTypes: ['Brand Essence'],
        message: 'Mock processing complete',
      });
    }

    const { workspaceHost, accessToken, warehouseId, schema } = getDatabricksConfig();
    const { fileId, processingModelEndpoint, availableBrands = [], availableProjectTypes = [] } = req.body;

    console.log('[KB Process] req.body keys: ' + Object.keys(req.body || {}).join(', '));
    console.log('[KB Process] fileId: "' + fileId + '"');
    console.log('[KB Process] processingModelEndpoint: "' + processingModelEndpoint + '"');
    console.log('[KB Process] availableBrands count: ' + availableBrands.length);
    console.log('[KB Process] availableProjectTypes count: ' + availableProjectTypes.length);

    if (!fileId) {
      return res.status(400).json({ error: 'Missing required field: fileId', receivedKeys: Object.keys(req.body || {}) });
    }
    if (!processingModelEndpoint) {
      return res.status(400).json({
        error: 'Missing required field: processingModelEndpoint. Please configure a model in Model Template settings.',
      });
    }

    console.log('[KB Process] Starting processing for fileId: ' + fileId);
    console.log('[KB Process] Processing model: ' + processingModelEndpoint);

    // ── Step 1: Fetch file metadata ──────────────────────────────────────────
    const metaResp = await fetch('https://' + workspaceHost + '/api/2.0/sql/statements', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        statement:
          'SELECT file_id, file_name, file_path, file_type, file_size_bytes, ' +
          'scope, brand, project_type, category, uploaded_by, tags, insight_type, input_method, upload_date ' +
          'FROM knowledge_base.' + schema + '.file_metadata ' +
          "WHERE file_id = '" + fileId.replace(/'/g, "''") + "' LIMIT 1",
        wait_timeout: '30s',
      }),
    });

    if (!metaResp.ok) {
      const err = await metaResp.json().catch(() => ({}));
      throw new Error('Metadata query failed: ' + metaResp.status + ' ' + (err.message || ''));
    }

    const metaResult = await metaResp.json();
    const rows = metaResult.result?.data_array || [];
    if (rows.length === 0) return res.status(404).json({ error: 'File not found: ' + fileId });

    const [, fileName, filePath, fileType, fileSizeBytes,
      scope, brand, projectType, category, uploadedBy, tagsRaw,
      insightType, inputMethod, uploadDate] = rows[0];
    const isWisdomFile = fileType === 'Wisdom';

    console.log('[KB Process] File: ' + fileName);
    console.log('[KB Process] filePath: ' + filePath);
    console.log('[KB Process] fileType: ' + fileType);
    console.log('[KB Process] Existing brand: ' + (brand || 'none'));
    console.log('[KB Process] Existing projectType: ' + (projectType || 'none'));

    if (fileType === 'Findings') {
      return res.status(400).json({ error: 'Cannot process Findings files' });
    }

    // ── Step 2: Download ─────────────────────────────────────────────────────
    const downloadUrl = 'https://' + workspaceHost + '/api/2.0/fs/files' + filePath;
    console.log('[KB Process] Downloading from: ' + downloadUrl);

    const fileResp = await fetch(downloadUrl, { headers: { Authorization: 'Bearer ' + accessToken } });
    if (!fileResp.ok) {
      const errText = await fileResp.text().catch(() => '');
      throw new Error('File download failed: ' + fileResp.status + ' ' + errText.substring(0, 200));
    }

    const fileBuffer = Buffer.from(await fileResp.arrayBuffer());
    const ext = fileName.toLowerCase().split('.').pop() || '';
    console.log('[KB Process] Downloaded ' + fileBuffer.length + ' bytes, ext: ' + ext);

    // ── Step 3: Extract text ─────────────────────────────────────────────────
    let extractedText = '';
    let extractionMethod = 'unknown';

    if (TEXT_EXTENSIONS.has(ext)) {
      extractedText = fileBuffer.toString('utf-8');
      extractionMethod = 'plain-text';
    } else if (IMAGE_EXTENSIONS.has(ext)) {
      extractedText = await extractTextFromImage(fileBuffer, ext, fileName, workspaceHost, accessToken, processingModelEndpoint);
      extractionMethod = 'vision-model-image';
    } else if (ext === 'pdf') {
      extractedText = await extractTextFromPDF(fileBuffer, fileName, workspaceHost, accessToken, processingModelEndpoint);
      extractionMethod = 'pdf-extraction';
    } else if (ext === 'docx' || ext === 'doc') {
      extractedText = await extractTextFromDocx(fileBuffer, fileName);
      extractionMethod = 'docx-extraction';
    } else if (ext === 'xlsx' || ext === 'xls') {
      extractedText = await extractTextFromXlsx(fileBuffer, fileName);
      extractionMethod = 'xlsx-extraction';
    } else if (ext === 'pptx' || ext === 'ppt') {
      extractedText = await extractTextFromPptx(fileBuffer, fileName, workspaceHost, accessToken, processingModelEndpoint);
      extractionMethod = 'pptx-extraction';
    } else if (AUDIO_EXTENSIONS.has(ext)) {
      extractedText = await extractTextFromAudio(fileBuffer, fileName, ext, workspaceHost, accessToken, uploadDate);
      extractionMethod = 'audio-transcription';
    } else {
      try {
        extractedText = fileBuffer.toString('utf-8');
        extractionMethod = 'fallback-utf8';
      } catch {
        extractedText = '[Could not extract text from ' + fileName + ' — unsupported format]';
        extractionMethod = 'unsupported';
      }
    }

    if (extractedText.length > MAX_CONTENT_CHARS) {
      extractedText = extractedText.slice(0, MAX_CONTENT_CHARS) + '\n\n[... Content truncated ...]';
    }

    console.log('[KB Process] Extracted ' + extractedText.length + ' chars via ' + extractionMethod);

    // ── Step 4: Generate summary, tags, metadata suggestions ─────────────────
    const { summary, tags, suggestedBrand, suggestedProjectTypes, suggestedMonth, suggestedYear } = await generateSummaryTagsAndMetadata(
      extractedText, fileName, workspaceHost, accessToken, processingModelEndpoint,
      availableBrands, availableProjectTypes, brand, projectType,
      uploadDate, isWisdomFile
    );

    // ── Step 5: Derive _txt path ──────────────────────────────────────────────
    const txtFileName = fileName.replace(/\.[^/.]+$/, '') + '_txt.txt';
    const txtFileId = fileId + '_txt';
    const txtFilePath = filePath.replace(/\.[^/.]+$/, '') + '_txt.txt';

    // ── Step 6: Upload _txt to storage ───────────────────────────────────────
    const txtUploadUrl = 'https://' + workspaceHost + '/api/2.0/fs/files' + txtFilePath;
    console.log('[KB Process] PUT to: ' + txtUploadUrl + ' (' + Buffer.byteLength(extractedText, 'utf8') + ' bytes)');

    const uploadResp = await fetch(txtUploadUrl, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'text/plain; charset=utf-8' },
      body: extractedText,
    });

    const uploadRespText = await uploadResp.text().catch(() => '');
    console.log('[KB Process] PUT response: ' + uploadResp.status);

    if (!uploadResp.ok) {
      throw new Error('Could not save _txt file (' + uploadResp.status + '). Path: ' + txtFilePath + '. Detail: ' + uploadRespText.substring(0, 200));
    }

    console.log('[KB Process] _txt uploaded (status ' + uploadResp.status + ')');

    // ── Step 7: Register _txt in file_metadata ────────────────────────────────
    // CRITICAL: upload_date MUST be included — if omitted Databricks stores NULL
    // which causes list.js (which reads columns by position index) to misalign
    // all subsequent fields, making brand/summary/tags appear empty in the UI.
    let existingTagsArr = [];
    if (tagsRaw) {
      try { existingTagsArr = JSON.parse(tagsRaw); }
      catch { existingTagsArr = String(tagsRaw).split(',').map(t => t.trim()).filter(Boolean); }
    }
    const txtTagsArr = [...new Set([...existingTagsArr, 'processed', 'txt-conversion'])];
    const safeSummaryForInsert = summary.replace(/'/g, "''").substring(0, 500);

    // Column order must exactly match the SELECT order in list.js:
    // file_id(0), file_path(1), file_name(2), scope(3), category(4), brand(5),
    // project_type(6), file_type(7), is_approved(8), upload_date(9), uploaded_by(10),
    // approver_email(11), approval_date(12), approval_notes(13), tags(14),
    // citation_count(15), gem_inclusion_count(16), file_size_bytes(17),
    // content_summary(18), insight_type(19), input_method(20),
    // created_at(21), updated_at(22), cleaning_status(23)
    const insertStatement =
      'INSERT INTO knowledge_base.' + schema + '.file_metadata (' +
      'file_id, file_path, file_name, scope, category, brand, project_type, ' +
      'file_type, is_approved, upload_date, uploaded_by, ' +
      'content_summary, tags, cleaning_status, content_month, content_year, ' +
      'insight_type, input_method, created_at, updated_at' +
      ') VALUES (' +
      "'" + txtFileId.replace(/'/g, "''") + "', " +
      "'" + txtFilePath.replace(/'/g, "''") + "', " +
      "'" + txtFileName.replace(/'/g, "''") + "', " +
      "'" + (scope || 'general').replace(/'/g, "''") + "', " +
      (category ? "'" + category.replace(/'/g, "''") + "'" : 'NULL') + ', ' +
      (brand ? "'" + brand.replace(/'/g, "''") + "'" : 'NULL') + ', ' +
      (projectType ? "'" + projectType.replace(/'/g, "''") + "'" : 'NULL') + ', ' +
      "'" + (fileType || 'Synthesis').replace(/'/g, "''") + "', " +
      'FALSE, ' +
      'CURRENT_TIMESTAMP(), ' +                                          // upload_date — MUST be set
      "'" + (uploadedBy || 'system').replace(/'/g, "''") + "', " +
      "'" + safeSummaryForInsert + "', " +
      'ARRAY(' + txtTagsArr.map(t => "'" + t.replace(/'/g, "''") + "'").join(', ') + '), ' +
      "'processed', " +                                                  // cleaning_status
      (suggestedMonth ? String(suggestedMonth) : 'NULL') + ', ' +              // content_month
      (suggestedYear ? String(suggestedYear) : 'NULL') + ', ' +                // content_year
      (insightType ? "'" + insightType.replace(/'/g, "''") + "'" : 'NULL') + ', ' +
      (inputMethod ? "'" + inputMethod.replace(/'/g, "''") + "'" : 'NULL') + ', ' +
      'CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()' +
      ')';

    console.log('[KB Process] Inserting _txt record with upload_date=CURRENT_TIMESTAMP');

    const insertResp = await fetch('https://' + workspaceHost + '/api/2.0/sql/statements', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ warehouse_id: warehouseId, statement: insertStatement, wait_timeout: '30s' }),
    });

    if (!insertResp.ok) {
      const insertErr = await insertResp.json().catch(() => ({}));
      console.warn('[KB Process] Could not register _txt in file_metadata: ' + (insertErr.message || JSON.stringify(insertErr)));
    } else {
      const insertResult = await insertResp.json().catch(() => ({}));
      console.log('[KB Process] _txt registered: ' + txtFileName + ' (rows: ' + (insertResult.result?.row_count || '?') + ')');
    }

    // ── Step 8: Verify original file exists ──────────────────────────────────
    const verifyResp = await fetch('https://' + workspaceHost + '/api/2.0/sql/statements', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        statement: 'SELECT file_id, file_name FROM knowledge_base.' + schema + '.file_metadata ' +
          "WHERE file_id = '" + fileId.replace(/'/g, "''") + "' LIMIT 1",
        wait_timeout: '30s',
      }),
    });

    const verifyResult = await verifyResp.json().catch(() => ({}));
    if (verifyResp.ok) {
      const verifyRows = verifyResult.result?.data_array || [];
      if (verifyRows.length === 0) {
        throw new Error("File ID mismatch: Cannot find file_id '" + fileId + "' in database.");
      }
      console.log('[KB Process] Verified original file exists: ' + verifyRows[0][1]);
    }

    // ── Step 9: Update ORIGINAL file — set cleaning_status = 'processed' ─────
    const safeSummary = summary.replace(/'/g, "''").replace(/\\/g, '\\\\').substring(0, 500);
    const tagsList = tags
      .split(',')
      .map(t => t.trim().replace(/'/g, "''").replace(/[^\w\s-]/g, '').trim())
      .filter(Boolean)
      .slice(0, 10);
    const tagsArraySQL = tagsList.length > 0
      ? 'ARRAY(' + tagsList.map(t => "'" + t + "'").join(', ') + ')'
      : "ARRAY('processed')";

    const updateStatement =
      'UPDATE knowledge_base.' + schema + '.file_metadata ' +
      "SET content_summary = '" + safeSummary + "', " +
      'tags = ' + tagsArraySQL + ', ' +
      "cleaning_status = 'processed', " +
      (suggestedMonth ? 'content_month = ' + suggestedMonth + ', ' : '') +
      (suggestedYear ? 'content_year = ' + suggestedYear + ', ' : '') +
      'updated_at = CURRENT_TIMESTAMP() ' +
      "WHERE file_id = '" + fileId.replace(/'/g, "''") + "'";

    console.log('[KB Process] Updating original — setting cleaning_status=processed...');

    const updateResp = await fetch('https://' + workspaceHost + '/api/2.0/sql/statements', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ warehouse_id: warehouseId, statement: updateStatement, wait_timeout: '30s' }),
    });

    const updateResult = await updateResp.json().catch(() => ({}));
    if (!updateResp.ok) {
      console.error('[KB Process] UPDATE failed:', JSON.stringify(updateResult, null, 2));
      throw new Error('Metadata update failed: ' + (updateResult.message || updateResp.statusText));
    }

    const rowsAffected = updateResult.result?.row_count || 0;
    console.log('[KB Process] UPDATE affected ' + rowsAffected + ' row(s)');
    if (rowsAffected === 0) {
      console.warn('[KB Process] WARNING: UPDATE affected 0 rows for fileId: ' + fileId);
    }

    console.log('[KB Process] ✅ Processing complete for: ' + fileName);

    return res.status(200).json({
      success: true, fileId, txtFileId, fileName, txtFileName, txtFilePath,
      summary, tags, extractionMethod, cleaningStatus: 'processed',
      suggestedBrand, suggestedProjectTypes, suggestedMonth, suggestedYear,
      message: '"' + fileName + '" processed to "' + txtFileName + '"',
    });

  } catch (error) {
    console.error('[KB Process] Error:', error);
    return res.status(500).json({ error: 'Processing failed', message: error.message });
  }
}

// ── Text extractors ────────────────────────────────────────────────────────────

async function extractTextFromImage(buffer, ext, fileName, workspaceHost, accessToken, modelEndpoint) {
  try {
    const base64 = buffer.toString('base64');
    const mimeType = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
      : ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif'
      : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    const resp = await fetch('https://' + workspaceHost + '/serving-endpoints/' + modelEndpoint + '/invocations', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64 } },
          { type: 'text', text: 'Extract ALL content from this image faithfully. Extract every word of visible text exactly as written. Describe charts, graphs, tables, and diagrams in full detail. Prefix image descriptions with [IMAGE: ...]. Do NOT summarise.' },
        ]}],
        max_tokens: 4000, temperature: 0.1,
      }),
    });

    if (!resp.ok) throw new Error('Vision model error: ' + resp.status);
    const result = await resp.json();
    return '[IMAGE FILE: ' + fileName + ']\n\n' + (result.choices?.[0]?.message?.content || '[Image content could not be extracted]');
  } catch (e) {
    console.warn('[KB Process] Image extraction failed: ' + e.message);
    return '[IMAGE FILE: ' + fileName + ']\n[Image extraction failed: ' + e.message + ']';
  }
}

async function extractTextFromPDF(buffer, fileName, workspaceHost, accessToken, modelEndpoint) {
  console.log('[KB Process] PDF: sending to vision model (' + buffer.length + ' bytes)');
  try {
    const base64 = buffer.toString('base64');
    const resp = await fetch('https://' + workspaceHost + '/serving-endpoints/' + modelEndpoint + '/invocations', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: 'Extract ALL content from this PDF faithfully, page by page. Every word of text exactly as written. For images/charts/graphs/diagrams describe them fully, prefixed with [IMAGE: ...]. For tables reproduce all rows and columns. Do NOT summarise or skip anything.' },
        ]}],
        max_tokens: 8000, temperature: 0.1,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error('Vision model returned ' + resp.status + ': ' + errText.substring(0, 200));
    }
    const result = await resp.json();
    const extracted = result.choices?.[0]?.message?.content || '';
    console.log('[KB Process] PDF extraction: ' + extracted.length + ' chars');
    return extracted || '[PDF extraction produced no content for ' + fileName + ']';
  } catch (e) {
    console.warn('[KB Process] PDF extraction failed: ' + e.message);
    return '[PDF extraction failed for ' + fileName + ': ' + e.message + ']';
  }
}

async function extractTextFromDocx(buffer, fileName) {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (e) {
    console.warn('[KB Process] DOCX extraction error: ' + e.message);
    return '[DOCX extraction failed for ' + fileName + ': ' + e.message + ']';
  }
}

async function extractTextFromXlsx(buffer, fileName) {
  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheets = wb.SheetNames.map(sheetName => {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
      return '=== Sheet: ' + sheetName + ' ===\n' + csv;
    });
    return sheets.join('\n\n');
  } catch (e) {
    console.warn('[KB Process] XLSX extraction error: ' + e.message);
    return '[XLSX extraction failed for ' + fileName + ': ' + e.message + ']';
  }
}

async function extractTextFromPptx(buffer, fileName, workspaceHost, accessToken, modelEndpoint) {
  let zip = null;
  try {
    const JSZip = (await import('jszip')).default;
    zip = await JSZip.loadAsync(buffer);

    const slideFiles = Object.keys(zip.files)
      .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

    const slides = await Promise.all(slideFiles.map(async (slideFile, idx) => {
      const xml = await zip.files[slideFile].async('string');
      const texts = (xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [])
        .map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
      const allText = [...new Set(texts)].join(' ');
      return '--- Slide ' + (idx + 1) + ' ---\n' + (allText || '[No text on this slide]');
    }));

    const extracted = slides.join('\n\n');
    console.log('[KB Process] PPTX extracted ' + extracted.length + ' chars from ' + slideFiles.length + ' slide(s)');

    if (extracted.replace(/--- Slide \d+ ---\n/g, '').trim().length < 200 && modelEndpoint) {
      console.log('[KB Process] PPTX text sparse — falling back to embedded image vision');
      return await extractTextFromPptxViaVision(zip, fileName, workspaceHost, accessToken, modelEndpoint);
    }
    return extracted;
  } catch (e) {
    console.warn('[KB Process] PPTX XML error: ' + e.message);
    if (modelEndpoint && zip) {
      return await extractTextFromPptxViaVision(zip, fileName, workspaceHost, accessToken, modelEndpoint);
    }
    return '[PPTX extraction failed for ' + fileName + ': ' + e.message + ']';
  }
}

async function extractTextFromPptxViaVision(zip, fileName, workspaceHost, accessToken, modelEndpoint) {
  console.log('[KB Process] PPTX vision fallback — extracting embedded images');
  try {
    const mediaFiles = Object.keys(zip.files)
      .filter(name => name.startsWith('ppt/media/') && /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(name))
      .sort();

    console.log('[KB Process] Found ' + mediaFiles.length + ' embedded image(s)');
    if (mediaFiles.length === 0) return '[PPTX has no extractable text or embedded images: ' + fileName + ']';

    const results = [];
    for (let i = 0; i < mediaFiles.length; i++) {
      const mediaFile = mediaFiles[i];
      const imgExt = mediaFile.split('.').pop().toLowerCase();
      const mimeType = (imgExt === 'jpg' || imgExt === 'jpeg') ? 'image/jpeg'
        : imgExt === 'png' ? 'image/png' : imgExt === 'gif' ? 'image/gif'
        : imgExt === 'webp' ? 'image/webp' : 'image/jpeg';

      const imgBuffer = await zip.files[mediaFile].async('nodebuffer');
      const imgBase64 = imgBuffer.toString('base64');

      try {
        const resp = await fetch('https://' + workspaceHost + '/serving-endpoints/' + modelEndpoint + '/invocations', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: [
              { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + imgBase64 } },
              { type: 'text', text: 'This is a slide image from a PowerPoint. Extract ALL visible content: every word of text exactly as written, headlines, body text, chart labels, data values, table contents. Do NOT summarise.' },
            ]}],
            max_tokens: 4000, temperature: 0.1,
          }),
        });

        if (!resp.ok) {
          results.push('--- Image ' + (i + 1) + ' ---\n[Vision failed: ' + resp.status + ']');
        } else {
          const result = await resp.json();
          results.push('--- Image ' + (i + 1) + ' ---\n' + (result.choices?.[0]?.message?.content || '[No content]'));
        }
      } catch (imgErr) {
        results.push('--- Image ' + (i + 1) + ' ---\n[Error: ' + imgErr.message + ']');
      }
    }

    const extracted = results.join('\n\n');
    console.log('[KB Process] PPTX vision complete: ' + extracted.length + ' chars from ' + results.length + ' image(s)');
    return extracted;
  } catch (e) {
    console.warn('[KB Process] PPTX vision fallback failed: ' + e.message);
    return '[PPTX extraction failed for ' + fileName + ': ' + e.message + ']';
  }
}

async function extractTextFromAudio(buffer, fileName, ext, workspaceHost, accessToken, uploadDate) {
  const recordedLabel = uploadDate
    ? new Date(uploadDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown date';

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.warn('[KB Process] OPENAI_API_KEY not set — cannot transcribe audio');
    return '[AUDIO RECORDING: ' + fileName + ']\n[Recorded: ' + recordedLabel + ']\n[Transcription unavailable — OPENAI_API_KEY not configured]';
  }

  try {
    const mimeType = ext === 'mp3' ? 'audio/mpeg'
      : ext === 'wav' ? 'audio/wav'
      : ext === 'm4a' ? 'audio/mp4'
      : ext === 'ogg' ? 'audio/ogg'
      : 'audio/webm';

    const formData = new FormData();
    const audioBlob = new Blob([buffer], { type: mimeType });
    formData.append('file', audioBlob, fileName);
    formData.append('model', 'whisper-1');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + openaiKey },
      body: formData,
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error('OpenAI transcription returned ' + resp.status + ': ' + errText.substring(0, 200));
    }

    const result = await resp.json();
    const transcript = result.text || '';

    if (!transcript) throw new Error('No transcript in response: ' + JSON.stringify(result).substring(0, 200));

    console.log('[KB Process] Audio transcribed via OpenAI Whisper: ' + transcript.length + ' chars');
    return '[Recorded: ' + recordedLabel + ']\n\n' + transcript;
  } catch (e) {
    console.warn('[KB Process] Audio transcription failed: ' + e.message);
    return '[AUDIO RECORDING: ' + fileName + ']\n[Recorded: ' + recordedLabel + ']\n[Transcription failed — please transcribe manually: ' + e.message + ']';
  }
}

async function generateSummaryTagsAndMetadata(
  text, fileName, workspaceHost, accessToken, modelEndpoint,
  availableBrands, availableProjectTypes, existingBrand, existingProjectType,
  uploadDate, isWisdomFile
) {
  const meaningfulText = text
    .replace(/\[.*?\]/g, '')
    .replace(/--- (Slide|Image) \d+ ---/g, '')
    .trim();

  if (meaningfulText.length < 100) {
    console.warn('[KB Process] Extracted text too sparse (' + meaningfulText.length + ' chars) — skipping AI metadata');
    return {
      summary: 'Document processed — content extraction was limited. Please assign brand, project type and summary manually.',
      tags: 'processed',
      suggestedBrand: existingBrand || '',
      suggestedProjectTypes: existingProjectType ? [existingProjectType] : [],
      suggestedMonth: null,
      suggestedYear: null,
    };
  }

  try {
    const preview = text.substring(0, 5000);

    const brandsHint = availableBrands.length > 0
      ? 'Known brands in this system: ' + availableBrands.join(', ') + '. Match exactly if possible.'
      : 'No brand list provided — infer from content.';

    const projectTypesHint = availableProjectTypes.length > 0
      ? 'Known project types in this system: ' + availableProjectTypes.join(', ') + '. Match exactly if possible.'
      : 'No project type list provided — infer from content.';

    const existingHint = (existingBrand || existingProjectType)
      ? 'This file already has brand="' + (existingBrand || '') + '" and project_type="' + (existingProjectType || '') + '" — confirm or suggest better matches.'
      : 'This file has no brand or project type assigned yet — infer from content.';

    // For wisdom files, provide the upload date as a fallback reference
    const uploadDateObj = uploadDate ? new Date(uploadDate) : null;
    const uploadYear = uploadDateObj && !isNaN(uploadDateObj.getTime()) ? uploadDateObj.getFullYear() : null;
    const uploadMonth = uploadDateObj && !isNaN(uploadDateObj.getTime()) ? uploadDateObj.getMonth() + 1 : null;

    const dateHint = isWisdomFile
      ? 'This is a Wisdom/Interview file uploaded on ' + (uploadDate || 'unknown date') + '. ' +
        'Check the content for an explicit "Date:" field or date references. ' +
        'If the content contains a date that is DIFFERENT from the upload date, use the date from the content. ' +
        'If no explicit date appears in the content or it matches the upload date, use the upload date: ' +
        'YEAR=' + (uploadYear || 'Unknown') + ', MONTH=' + (uploadMonth || 'Unknown') + '.'
      : 'Determine the date from the document content and filename. ' +
        'Compare any date found in the filename against any date found in the document body. ' +
        'If the filename suggests one year and the document body suggests a DIFFERENT year, set YEAR to "Unknown". ' +
        'If only one source has a year, use that year. If both agree, use that year. ' +
        'Leave MONTH blank (use "Unknown") if it cannot be determined with confidence.';

    const brandHint = isWisdomFile
      ? 'Determine the brand from the document CONTENT only (ignore the filename). Look for brand names, company names, or topics discussed. Set to "Unknown" if no brand is clearly mentioned.'
      : 'Determine the brand from the document CONTENT first. Only use the filename as a secondary hint if the content does not clearly indicate a brand. Set to "Unknown" if neither is conclusive.';

    const prompt =
      'Analyse this document and provide the following based ONLY on the document content:\n' +
      '1. A concise 2-3 sentence summary of the key content and insights\n' +
      '2. 3-5 relevant tags (comma-separated, lowercase, no hashtags)\n' +
      '3. The most likely brand this document is about (one name only, or "Unknown")\n' +
      '4. The top 3 most likely project types this document belongs to, in order of likelihood\n' +
      '5. The month this content was created or published (1-12, or "Unknown" if not determinable)\n' +
      '6. The year this content was created or published (4-digit year, or "Unknown" if title and content disagree or if not determinable)\n\n' +
      brandsHint + '\n' + projectTypesHint + '\n' + existingHint + '\n' + dateHint + '\n' + brandHint + '\n\n' +
      'Document filename: ' + fileName + '\n\n' +
      'Document content:\n' + preview +
      (text.length > 5000 ? '\n\n[Content continues...]' : '') +
      '\n\nRespond in this EXACT format with no extra text:\n' +
      'SUMMARY: [your summary here]\n' +
      'TAGS: [tag1, tag2, tag3]\n' +
      'BRAND: [brand name or Unknown]\n' +
      'PROJECT_TYPES: [type1, type2, type3]\n' +
      'MONTH: [1-12 or Unknown]\n' +
      'YEAR: [4-digit year or Unknown]';

    const resp = await fetch('https://' + workspaceHost + '/serving-endpoints/' + modelEndpoint + '/invocations', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], max_tokens: 500, temperature: 0.2 }),
    });

    if (!resp.ok) throw new Error('AI metadata call failed: ' + resp.status);
    const result = await resp.json();
    const aiContent = result.choices?.[0]?.message?.content || '';

    let summary = 'Document processed and ready for review';
    let tags = 'processed';
    let suggestedBrand = existingBrand || '';
    let suggestedProjectTypes = existingProjectType ? [existingProjectType] : [];
    let suggestedMonth = null;
    let suggestedYear = null;

    const summaryMatch = aiContent.match(/SUMMARY:\s*(.+?)(?=\nTAGS:|$)/s);
    const tagsMatch = aiContent.match(/TAGS:\s*(.+?)(?=\nBRAND:|$)/s);
    const brandMatch = aiContent.match(/BRAND:\s*(.+?)(?=\nPROJECT_TYPES:|$)/s);
    const projectTypesMatch = aiContent.match(/PROJECT_TYPES:\s*(.+?)(?=\nMONTH:|$)/s);
    const monthMatch = aiContent.match(/MONTH:\s*(.+?)(?=\nYEAR:|$)/s);
    const yearMatch = aiContent.match(/YEAR:\s*(.+?)$/s);

    if (summaryMatch) summary = summaryMatch[1].trim();
    if (tagsMatch) tags = tagsMatch[1].trim();

    if (brandMatch) {
      const rawBrand = brandMatch[1].trim();
      if (rawBrand && rawBrand.toLowerCase() !== 'unknown') {
        const matched = availableBrands.find(b => b.toLowerCase() === rawBrand.toLowerCase());
        suggestedBrand = matched || rawBrand;
      }
    }

    if (projectTypesMatch) {
      const rawTypes = projectTypesMatch[1].trim().split(',').map(t => t.trim()).filter(Boolean);
      suggestedProjectTypes = rawTypes.map(rawType => {
        const matched = availableProjectTypes.find(pt => pt.toLowerCase() === rawType.toLowerCase());
        return matched || rawType;
      }).slice(0, 3);
    }

    if (monthMatch) {
      const rawMonth = monthMatch[1].trim();
      const parsed = parseInt(rawMonth);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) suggestedMonth = parsed;
    }

    if (yearMatch) {
      const rawYear = yearMatch[1].trim();
      const parsed = parseInt(rawYear);
      if (!isNaN(parsed) && parsed >= 1900 && parsed <= 2100) suggestedYear = parsed;
    }

    console.log('[KB Process] Suggested brand: "' + suggestedBrand + '"');
    console.log('[KB Process] Suggested month/year: ' + suggestedMonth + '/' + suggestedYear);
    console.log('[KB Process] Suggested project types: ' + suggestedProjectTypes.join(', '));

    return { summary, tags, suggestedBrand, suggestedProjectTypes, suggestedMonth, suggestedYear };
  } catch (e) {
    console.warn('[KB Process] Metadata generation failed (non-fatal): ' + e.message);
    return {
      summary: 'Document processed — metadata generation failed',
      tags: 'processed',
      suggestedBrand: existingBrand || '',
      suggestedProjectTypes: existingProjectType ? [existingProjectType] : [],
      suggestedMonth: null,
      suggestedYear: null,
    };
  }
}
