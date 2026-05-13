/**
 * User Roles Management API
 *
 * GET  — list all active role assignments
 * POST — create a new assignment (email or domain)
 * DELETE — deactivate an assignment by id
 *
 * All write operations require the caller to have the 'administrator' role
 * (derived server-side — the client-supplied userRole is ignored).
 */

import { getDatabricksConfig } from '../../utils/validateEnv.js';
import { getRoleForEmail, roleIsAllowed, ROLES_MANAGE_ROLES } from '../../utils/userRole.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workspaceHost, accessToken, warehouseId, schema } = getDatabricksConfig();
    const esc = (s) => String(s || '').replace(/'/g, "''");

    // ── GET: list all role assignments ──────────────────────────────────────
    if (req.method === 'GET') {
      const statement =
        `SELECT id, match_type, match_value, role, created_by, created_at ` +
        `FROM knowledge_base.${schema}.user_roles ` +
        `WHERE is_active = TRUE ` +
        `ORDER BY match_type, match_value`;

      const resp = await fetch(`https://${workspaceHost}/api/2.0/sql/statements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouse_id: warehouseId, statement, wait_timeout: '15s' }),
      });

      const result = await resp.json();
      if (result.status?.state === 'FAILED') {
        throw new Error(result.status.error?.message || 'Query failed');
      }

      const rows = (result.result?.data_array || []).map(r => ({
        id: r[0], matchType: r[1], matchValue: r[2], role: r[3], createdBy: r[4], createdAt: r[5],
      }));

      return res.status(200).json({ success: true, assignments: rows });
    }

    // ── POST: create a new assignment ───────────────────────────────────────
    if (req.method === 'POST') {
      const { matchType, matchValue, role, callerEmail } = req.body;

      if (!matchType || !matchValue || !role || !callerEmail) {
        return res.status(400).json({ error: 'Missing required fields: matchType, matchValue, role, callerEmail' });
      }

      const callerRole = await getRoleForEmail(callerEmail, workspaceHost, accessToken, warehouseId, schema);
      if (!roleIsAllowed(callerRole, ROLES_MANAGE_ROLES)) {
        return res.status(403).json({ error: 'Access denied', message: 'Only administrators can manage role assignments' });
      }

      if (!['email', 'domain'].includes(matchType)) {
        return res.status(400).json({ error: 'matchType must be "email" or "domain"' });
      }

      const validRoles = ['administrator','research-analyst','research-leader','data-scientist','marketing-manager','product-manager','executive-stakeholder'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role', validRoles });
      }

      const id = randomUUID();
      const statement =
        `INSERT INTO knowledge_base.${schema}.user_roles ` +
        `(id, match_type, match_value, role, created_by, created_at, updated_at, is_active) VALUES ` +
        `('${esc(id)}', '${esc(matchType)}', '${esc(matchValue)}', '${esc(role)}', ` +
        `'${esc(callerEmail)}', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), TRUE)`;

      const resp = await fetch(`https://${workspaceHost}/api/2.0/sql/statements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouse_id: warehouseId, statement, wait_timeout: '15s' }),
      });

      const result = await resp.json();
      if (result.status?.state === 'FAILED') {
        throw new Error(result.status.error?.message || 'Insert failed');
      }

      return res.status(200).json({ success: true, id, matchType, matchValue, role });
    }

    // ── DELETE: deactivate an assignment ────────────────────────────────────
    if (req.method === 'DELETE') {
      const { id, callerEmail } = req.body;

      if (!id || !callerEmail) {
        return res.status(400).json({ error: 'Missing required fields: id, callerEmail' });
      }

      const callerRole = await getRoleForEmail(callerEmail, workspaceHost, accessToken, warehouseId, schema);
      if (!roleIsAllowed(callerRole, ROLES_MANAGE_ROLES)) {
        return res.status(403).json({ error: 'Access denied', message: 'Only administrators can manage role assignments' });
      }

      const statement =
        `UPDATE knowledge_base.${schema}.user_roles ` +
        `SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP() ` +
        `WHERE id = '${esc(id)}'`;

      const resp = await fetch(`https://${workspaceHost}/api/2.0/sql/statements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouse_id: warehouseId, statement, wait_timeout: '15s' }),
      });

      const result = await resp.json();
      if (result.status?.state === 'FAILED') {
        throw new Error(result.status.error?.message || 'Update failed');
      }

      return res.status(200).json({ success: true, id, deactivated: true });
    }

  } catch (error) {
    console.error('[UserRoles] Error:', error);
    return res.status(500).json({ error: 'Operation failed', message: error.message });
  }
}
