/**
 * Knowledge Base Approve API
 * 
 * Approves a pending file in the Knowledge Base.
 * Logs the action but does not enforce role restrictions (per user request).
 * 
 * Location: api/databricks/knowledge-base/approve.js
 */

import { createClient } from '@databricks/sql';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      fileId,
      approvalNotes = '',
      
      // User info (for logging only, no enforcement)
      userEmail,
      userRole,
      
      // Auth
      accessToken,
      workspaceHost,
    } = req.body;

    // Validate required fields
    if (!fileId || !userEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['fileId', 'userEmail']
      });
    }

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Log the approval action (audit trail - no blocking)
    console.log(`[KB Approve] User: ${userEmail} (${userRole}) approved file: ${fileId}`);
    if (approvalNotes) {
      console.log(`[KB Approve] Notes: ${approvalNotes}`);
    }

    // Connect to Databricks SQL
    const client = createClient({
      host: workspaceHost,
      path: '/sql/1.0/warehouses/52742af9db71826d', // User needs to replace with their warehouse ID
      token: accessToken,
    });

    await client.connect();

    // Update file metadata
    const updateQuery = `
      UPDATE knowledge_base.cohive.file_metadata
      SET 
        is_approved = TRUE,
        approver_email = '${userEmail}',
        approval_date = CURRENT_TIMESTAMP(),
        approval_notes = '${approvalNotes.replace(/'/g, "''")}',
        updated_at = CURRENT_TIMESTAMP()
      WHERE file_id = '${fileId}'
    `;

    await client.executeStatement(updateQuery);

    // Get the updated file info
    const selectQuery = `
      SELECT file_name, file_path, scope, category, brand
      FROM knowledge_base.cohive.file_metadata
      WHERE file_id = '${fileId}'
    `;

    const result = await client.executeStatement(selectQuery);
    await client.close();

    if (result.result.data_array.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const [fileName, filePath, scope, category, brand] = result.result.data_array[0];

    console.log(`[KB Approve] SUCCESS: ${fileName} approved by ${userEmail}`);

    return res.status(200).json({
      success: true,
      fileId,
      fileName,
      isApproved: true,
      approvedBy: userEmail,
      approvalDate: new Date().toISOString(),
      message: `File "${fileName}" has been approved`,
    });

  } catch (error) {
    console.error('[KB Approve] Error:', error);
    return res.status(500).json({ 
      error: 'Approval failed',
      message: error.message 
    });
  }
}
