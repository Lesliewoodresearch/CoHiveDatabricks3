/**
 * Knowledge Base List API
 *
 * Lists files from the Knowledge Base with optional filters.
 * All Databricks credentials read from environment variables.
 *
 * Location: api/databricks/knowledge-base/list.js
 */

import { getDatabricksConfig } from '../../utils/validateEnv.js';


// Parse tags from Databricks — may be an array, a JSON string, or null
function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; }
    catch { return raw.split(',').map(t => t.trim()).filter(Boolean); }
  }
  return [];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const isMockMode = !process.env.DATABRICKS_HOST ||
                       !process.env.DATABRICKS_TOKEN ||
                       process.env.VITE_MOCK_MODE === 'true';

    if (isMockMode) {
      console.log('[Mock Mode] Knowledge Base list - returning empty array');
      return res.status(200).json({ success: true, files: [], message: 'Mock mode - no files available' });
    }

    const { workspaceHost, accessToken, warehouseId, schema } = getDatabricksConfig();

    const {
      scope, category, brand, fileType, isApproved,
      projectType, uploadedBy, searchTerm,
      includeGeneral, includeCategory,
      limit = 50, offset = 0,
      sortBy = 'upload_date', sortOrder = 'DESC',
    } = req.query;

    console.log('[Knowledge Base List] Query params:', { scope, category, brand, fileType, isApproved, projectType });

    const esc = (s) => String(s || '').replace(/'/g, "''");
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
    const safeOffset = Math.max(parseInt(offset) || 0, 0);

    const conditions = [];
    if (scope) conditions.push(`scope = '${esc(scope)}'`);
    if (category) conditions.push(`category = '${esc(category)}'`);
    if (brand) conditions.push(`brand = '${esc(brand)}'`);
    if (fileType) conditions.push(`file_type = '${esc(fileType)}'`);
    if (isApproved !== undefined && isApproved !== '') {
      if (isApproved === 'true') {
        conditions.push(`is_approved = TRUE`);
      } else if (isApproved === 'false') {
        conditions.push(`(is_approved = FALSE OR is_approved IS NULL)`);
      }
    }
    if (projectType) conditions.push(`project_type = '${esc(projectType)}'`);
    if (uploadedBy) conditions.push(`uploaded_by = '${esc(uploadedBy)}'`);
    if (searchTerm) {
      const s = esc(searchTerm);
      conditions.push(`(file_name LIKE '%${s}%' OR content_summary LIKE '%${s}%')`);
    }

    if (includeGeneral === 'true' || includeCategory === 'true') {
      const scopeConditions = [];
      if (includeGeneral === 'true') scopeConditions.push("scope = 'general'");
      if (includeCategory === 'true' && category) scopeConditions.push(`(scope = 'category' AND category = '${esc(category)}')`);
      if (brand) scopeConditions.push(`(scope = 'brand' AND brand = '${esc(brand)}')`);
      if (scopeConditions.length > 0) {
        const other = conditions.filter(c => !c.startsWith('scope ='));
        conditions.length = 0;
        conditions.push(...other);
        conditions.push(`(${scopeConditions.join(' OR ')})`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const validSortColumns = ['upload_date', 'citation_count', 'file_name', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'upload_date';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // cleaning_status added at index 23
    const selectQuery =
      'SELECT file_id, file_path, file_name, scope, category, brand, project_type, ' +
      'file_type, is_approved, upload_date, uploaded_by, approver_email, approval_date, ' +
      'approval_notes, tags, citation_count, gem_inclusion_count, file_size_bytes, ' +
      'content_summary, insight_type, input_method, created_at, updated_at, cleaning_status, content_month, content_year ' +
      'FROM knowledge_base.' + schema + '.file_metadata ' +
      whereClause + ' ' +
      'ORDER BY ' + sortColumn + ' ' + sortDirection + ' ' +
      'LIMIT ' + safeLimit + ' OFFSET ' + safeOffset;

    console.log('[Knowledge Base List] Executing SQL query');

    const sqlResponse = await fetch(
      'https://' + workspaceHost + '/api/2.0/sql/statements',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouse_id: warehouseId, statement: selectQuery, wait_timeout: '30s' }),
      }
    );

    if (!sqlResponse.ok) {
      const errorData = await sqlResponse.json();
      console.error('[Knowledge Base List] SQL Response not OK:', errorData);
      throw new Error('SQL failed: ' + (errorData.message || sqlResponse.statusText));
    }

    const sqlResult = await sqlResponse.json();
    console.log('[Knowledge Base List] SQL Status:', sqlResult.status?.state);
    console.log('[Knowledge Base List] Row count:', sqlResult.result?.row_count);

    if (sqlResult.status?.state === 'FAILED') {
      console.error('[Knowledge Base List] SQL FAILED:', sqlResult.status.error);
      throw new Error('SQL execution failed: ' + (sqlResult.status.error?.message || 'Unknown error'));
    }

    const rows = sqlResult.result?.data_array || [];

    const files = rows.map(row => ({
      fileId:           row[0],
      filePath:         row[1],
      fileName:         row[2],
      scope:            row[3],
      category:         row[4],
      brand:            row[5],
      projectType:      row[6],
      fileType:         row[7],
      isApproved:       row[8] === true || row[8] === 'true' ? true : row[8] === null ? null : false,
      uploadDate:       row[9] || null,
      uploadedBy:       row[10],
      approverEmail:    row[11],
      approvalDate:     row[12],
      approvalNotes:    row[13],
      tags:             parseTags(row[14]),
      citationCount:    row[15] || 0,
      gemInclusionCount: row[16] || 0,
      fileSizeBytes:    row[17] || 0,
      contentSummary:   row[18] || null,
      insightType:      row[19],
      inputMethod:      row[20],
      createdAt:        row[21],
      updatedAt:        row[22],
      cleaningStatus:   row[23] || null,
      contentMonth:     row[24] ? parseInt(row[24]) : null,
      contentYear:      row[25] ? parseInt(row[25]) : null,
    }));

    console.log('[Knowledge Base List] Found ' + files.length + ' files');
    // Prevent Vercel edge caching — list results must always be fresh
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    return res.status(200).json({
      success: true,
      files,
      pagination: { total: files.length, limit: safeLimit, offset: safeOffset },
    });

  } catch (error) {
    console.error('[Knowledge Base List] Error:', error);
    return res.status(500).json({ error: 'Query failed', message: error.message });
  }
}
