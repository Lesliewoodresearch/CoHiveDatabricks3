/**
 * Activity Log Query API
 *
 * Returns rows from knowledge_base.{schema}.activity_log with optional filters.
 * Restricted to administrators and research leaders.
 *
 * Location: api/databricks/logs/query.js
 */

import { getDatabricksConfig } from '../../utils/validateEnv.js';
import { getRoleForEmail, roleIsAllowed, ROLES_APPROVE_RESEARCH } from '../../utils/userRole.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workspaceHost, accessToken, warehouseId, schema } = getDatabricksConfig();

    const { userEmail, startDate, endDate, eventType, severity, filterEmail, hexId, limit = 100, offset = 0 } = req.query;

    if (!userEmail) {
      return res.status(400).json({ error: 'Missing required field: userEmail' });
    }

    const resolvedRole = await getRoleForEmail(userEmail, workspaceHost, accessToken, warehouseId, schema);
    if (!roleIsAllowed(resolvedRole, ROLES_APPROVE_RESEARCH)) {
      return res.status(403).json({ error: 'Access denied', message: 'Only Research Leaders and Administrators can view logs' });
    }

    const esc = (s) => String(s || '').replace(/'/g, "''");
    const safeLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
    const safeOffset = Math.max(parseInt(offset) || 0, 0);

    const conditions = [];
    if (startDate) conditions.push(`created_at >= '${esc(startDate)}'`);
    if (endDate)   conditions.push(`created_at < date_add('${esc(endDate)}', 1)`);
    if (eventType) conditions.push(`event_type = '${esc(eventType)}'`);
    if (severity)  conditions.push(`severity = '${esc(severity)}'`);
    if (filterEmail) conditions.push(`user_email LIKE '%${esc(filterEmail)}%'`);
    if (hexId)     conditions.push(`hex_id = '${esc(hexId)}'`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const statement =
      `SELECT log_id, event_type, severity, user_email, brand, project_type, ` +
      `hex_id, message, details, duration_ms, created_at ` +
      `FROM knowledge_base.${schema}.activity_log ` +
      `${whereClause} ` +
      `ORDER BY created_at DESC ` +
      `LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    console.log(`[Logs Query] User: ${userEmail} (${resolvedRole}), filters: ${JSON.stringify({ startDate, endDate, eventType, severity, filterEmail, hexId })}`);

    const sqlResponse = await fetch(`https://${workspaceHost}/api/2.0/sql/statements`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ warehouse_id: warehouseId, statement, wait_timeout: '30s' }),
    });

    if (!sqlResponse.ok) {
      const err = await sqlResponse.json();
      throw new Error(`SQL HTTP ${sqlResponse.status}: ${err.message || sqlResponse.statusText}`);
    }

    const sqlResult = await sqlResponse.json();
    if (sqlResult.status?.state === 'FAILED') {
      throw new Error(`SQL execution failed: ${sqlResult.status.error?.message || 'Unknown error'}`);
    }

    const rows = (sqlResult.result?.data_array || []).map(row => ({
      logId:       row[0],
      eventType:   row[1],
      severity:    row[2] || 'info',
      userEmail:   row[3],
      brand:       row[4] || '',
      projectType: row[5] || '',
      hexId:       row[6] || '',
      message:     row[7],
      details:     row[8] || null,
      durationMs:  row[9] != null ? parseInt(row[9]) : null,
      createdAt:   row[10],
    }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, logs: rows, pagination: { limit: safeLimit, offset: safeOffset, count: rows.length } });

  } catch (error) {
    console.error('[Logs Query] Error:', error);
    return res.status(500).json({ error: 'Query failed', message: error.message });
  }
}
