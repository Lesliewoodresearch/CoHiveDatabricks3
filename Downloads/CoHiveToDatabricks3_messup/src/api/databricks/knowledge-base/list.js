/**
 * Knowledge Base List API
 * 
 * Queries files from the metadata table with filters.
 * Returns files based on scope, approval status, brand, category, etc.
 * 
 * Location: api/databricks/knowledge-base/list.js
 */

import { createClient } from '@databricks/sql';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      // Filters (all optional)
      scope,           // 'general', 'category', 'brand'
      category,        // Filter by category
      brand,           // Filter by brand
      fileType,        // 'Synthesis', 'Wisdom'
      isApproved,      // 'true', 'false', or omit for all
      projectType,
      uploadedBy,      // Filter by uploader email
      searchTerm,      // Search in file name or summary
      
      // For hierarchical retrieval (get all relevant files for a brand)
      includeGeneral,  // 'true' to include general files
      includeCategory, // 'true' to include category files
      
      // Pagination
      limit = 50,
      offset = 0,
      
      // Sorting
      sortBy = 'upload_date',  // 'upload_date', 'citation_count', 'file_name'
      sortOrder = 'DESC',      // 'ASC' or 'DESC'
      
      // Auth
      accessToken,
      workspaceHost,
      userEmail,
      userRole,
    } = req.query;

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Log the query (audit trail)
    console.log(`[KB List] User: ${userEmail} (${userRole})`);
    console.log(`[KB List] Filters: scope=${scope}, category=${category}, brand=${brand}, approved=${isApproved}`);

    // Build WHERE clause dynamically
    const conditions = [];
    
    if (scope) {
      conditions.push(`scope = '${scope}'`);
    }
    
    if (category) {
      conditions.push(`category = '${category}'`);
    }
    
    if (brand) {
      conditions.push(`brand = '${brand}'`);
    }
    
    if (fileType) {
      conditions.push(`file_type = '${fileType}'`);
    }
    
    if (isApproved !== undefined) {
      conditions.push(`is_approved = ${isApproved === 'true' ? 'TRUE' : 'FALSE'}`);
    }
    
    if (projectType) {
      conditions.push(`project_type = '${projectType}'`);
    }
    
    if (uploadedBy) {
      conditions.push(`uploaded_by = '${uploadedBy}'`);
    }
    
    if (searchTerm) {
      const sanitized = searchTerm.replace(/'/g, "''");
      conditions.push(`(file_name LIKE '%${sanitized}%' OR content_summary LIKE '%${sanitized}%')`);
    }

    // For hierarchical retrieval: get general + category + brand files
    if (includeGeneral === 'true' || includeCategory === 'true') {
      const scopeConditions = [];
      
      if (includeGeneral === 'true') {
        scopeConditions.push("scope = 'general'");
      }
      
      if (includeCategory === 'true' && category) {
        scopeConditions.push(`(scope = 'category' AND category = '${category}')`);
      }
      
      if (brand) {
        scopeConditions.push(`(scope = 'brand' AND brand = '${brand}')`);
      }
      
      if (scopeConditions.length > 0) {
        // Replace existing scope condition with OR of all scopes
        const otherConditions = conditions.filter(c => !c.startsWith('scope ='));
        conditions.length = 0;
        conditions.push(...otherConditions);
        conditions.push(`(${scopeConditions.join(' OR ')})`);
      }
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Validate sort column
    const validSortColumns = ['upload_date', 'citation_count', 'file_name', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'upload_date';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Connect to Databricks SQL
    const client = createClient({
      host: workspaceHost,
      path: '/sql/1.0/warehouses/52742af9db71826d', // User needs to replace with their warehouse ID
      token: accessToken,
    });

    await client.connect();

    // Get count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM knowledge_base.cohive.file_metadata
      ${whereClause}
    `;
    
    const countResult = await client.executeStatement(countQuery);
    const totalCount = countResult.result.data_array[0][0];

    // Get files
    const selectQuery = `
      SELECT 
        file_id,
        file_path,
        file_name,
        scope,
        category,
        brand,
        project_type,
        file_type,
        is_approved,
        upload_date,
        uploaded_by,
        approver_email,
        approval_date,
        approval_notes,
        tags,
        citation_count,
        gem_inclusion_count,
        file_size_bytes,
        content_summary,
        insight_type,
        input_method,
        created_at,
        updated_at
      FROM knowledge_base.cohive.file_metadata
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    console.log('[KB List] Query:', selectQuery);

    const result = await client.executeStatement(selectQuery);
    await client.close();

    // Transform result to JSON objects
    const files = result.result.data_array.map(row => ({
      fileId: row[0],
      filePath: row[1],
      fileName: row[2],
      scope: row[3],
      category: row[4],
      brand: row[5],
      projectType: row[6],
      fileType: row[7],
      isApproved: row[8],
      uploadDate: row[9],
      uploadedBy: row[10],
      approverEmail: row[11],
      approvalDate: row[12],
      approvalNotes: row[13],
      tags: row[14],
      citationCount: row[15],
      gemInclusionCount: row[16],
      fileSizeBytes: row[17],
      contentSummary: row[18],
      insightType: row[19],
      inputMethod: row[20],
      createdAt: row[21],
      updatedAt: row[22],
    }));

    console.log(`[KB List] Found ${files.length} files (total: ${totalCount})`);

    return res.status(200).json({
      success: true,
      files,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + files.length < totalCount,
      },
    });

  } catch (error) {
    console.error('[KB List] Error:', error);
    return res.status(500).json({ 
      error: 'Query failed',
      message: error.message 
    });
  }
}
