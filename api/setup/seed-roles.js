/**
 * CoHive Role Seeding Script
 *
 * Seeds the user_roles table with domain-level defaults for a new client
 * deployment. Run once after /api/setup/init completes.
 *
 * Usage: POST /api/setup/seed-roles
 * Body:  { "callerEmail": "admin@cohivesolutions.com", "assignments": [...] }
 *
 * assignments format:
 *   [
 *     { "matchType": "domain", "matchValue": "client.com",       "role": "marketing-manager" },
 *     { "matchType": "domain", "matchValue": "clientresearch.com","role": "research-analyst" },
 *     { "matchType": "email",  "matchValue": "lead@client.com",  "role": "research-leader" }
 *   ]
 *
 * Only administrators can call this endpoint (enforced server-side).
 * Safe to call multiple times — skips rows where match_value already exists.
 */

import { getDatabricksConfig } from '../utils/validateEnv.js';
import { getRoleForEmail, roleIsAllowed, ROLES_MANAGE_ROLES } from '../utils/userRole.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workspaceHost, accessToken, warehouseId, schema } = getDatabricksConfig();
    const { callerEmail, assignments } = req.body;

    if (!callerEmail || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['callerEmail', 'assignments (array)'],
        example: {
          callerEmail: 'admin@cohivesolutions.com',
          assignments: [
            { matchType: 'domain', matchValue: 'client.com', role: 'marketing-manager' },
            { matchType: 'email',  matchValue: 'lead@client.com', role: 'research-leader' },
          ],
        },
      });
    }

    const callerRole = await getRoleForEmail(callerEmail, workspaceHost, accessToken, warehouseId, schema);
    if (!roleIsAllowed(callerRole, ROLES_MANAGE_ROLES)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only administrators can seed role assignments',
      });
    }

    const validRoles = new Set(['administrator','research-analyst','research-leader','data-scientist','marketing-manager','product-manager','executive-stakeholder']);
    const esc = (s) => String(s || '').replace(/'/g, "''");
    const results = [];

    for (const a of assignments) {
      if (!['email', 'domain'].includes(a.matchType) || !a.matchValue || !validRoles.has(a.role)) {
        results.push({ ...a, status: 'skipped', reason: 'invalid matchType, matchValue, or role' });
        continue;
      }

      // Check if match_value already has an active row — skip if so
      const checkResp = await fetch(`https://${workspaceHost}/api/2.0/sql/statements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          statement: `SELECT id FROM knowledge_base.${schema}.user_roles WHERE match_value = '${esc(a.matchValue)}' AND is_active = TRUE LIMIT 1`,
          wait_timeout: '10s',
        }),
      });
      const checkResult = await checkResp.json();
      if (checkResult.result?.data_array?.length > 0) {
        results.push({ ...a, status: 'skipped', reason: 'already exists' });
        continue;
      }

      const id = randomUUID();
      const insertResp = await fetch(`https://${workspaceHost}/api/2.0/sql/statements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          statement:
            `INSERT INTO knowledge_base.${schema}.user_roles ` +
            `(id, match_type, match_value, role, created_by, created_at, updated_at, is_active) VALUES ` +
            `('${esc(id)}', '${esc(a.matchType)}', '${esc(a.matchValue)}', '${esc(a.role)}', ` +
            `'${esc(callerEmail)}', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), TRUE)`,
          wait_timeout: '10s',
        }),
      });
      const insertResult = await insertResp.json();
      if (insertResult.status?.state === 'FAILED') {
        results.push({ ...a, status: 'error', reason: insertResult.status.error?.message });
      } else {
        results.push({ ...a, status: 'inserted', id });
      }
    }

    const inserted = results.filter(r => r.status === 'inserted').length;
    const skipped  = results.filter(r => r.status === 'skipped').length;
    const errors   = results.filter(r => r.status === 'error').length;

    return res.status(200).json({ success: true, inserted, skipped, errors, results });

  } catch (error) {
    console.error('[SeedRoles] Error:', error);
    return res.status(500).json({ error: 'Seed failed', message: error.message });
  }
}
