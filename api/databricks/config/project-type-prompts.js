/**
 * Project Type Prompts API
 *
 * Manages project type configurations with custom AI prompts.
 * Only Data Scientists can create, update, or delete project type prompts.
 *
 * FIX: Replaced `import { systemProjectTypes } from '../../data/systemProjectTypes.ts'`
 * with an inline SYSTEM_PROJECT_TYPE_NAMES Set. The server cannot resolve .ts files
 * at runtime. The system type names are stable and small — inlining is correct here.
 *
 * Location: api/databricks/config/project-type-prompts.js
 */

import { getDatabricksConfig } from '../../utils/validateEnv.js';
import { logEvent } from '../../utils/logger.js';
import { getRoleForEmail, roleIsAllowed, ROLES_MANAGE_PROMPTS } from '../../utils/userRole.js';

// ── Inline system project type names ──────────────────────────────────────────
// Mirrors systemProjectTypes from src/data/systemProjectTypes.ts.
// Cannot import .ts at runtime — this list is the server-side source of truth
// for blocking name conflicts with user-defined types.
const SYSTEM_PROJECT_TYPE_NAMES = new Set([
  'Creative Messaging',
  'Product Launch',
  'War Games',
  'Packaging',
  'Brand Strategy',
  'Market Research',
  'Innovation Pipeline',
  'Big Idea',
  'Unique Assets',
  'Customer Experience',
  'How Do We Say and Do Things that Make Us Unique',
  'Retail Strategy',
  'Content Strategy',
  'Crisis Management',
  'Partnership Strategy',
  'Sustainability Initiative',
  'Rebranding',
  'Market Entry',
  'Customer Segmentation',
  'Brand Health Tracking',
]);

function isSystemProjectType(projectTypeName) {
  return SYSTEM_PROJECT_TYPE_NAMES.has(projectTypeName) ||
    [...SYSTEM_PROJECT_TYPE_NAMES].some(
      name => name.toLowerCase() === projectTypeName.toLowerCase()
    );
}

export default async function handler(req, res) {
  try {
    const { workspaceHost, accessToken, warehouseId, schema } = getDatabricksConfig();

    // ── GET: List all project type configurations ──────────────────────────
    if (req.method === 'GET') {
      console.log('[ProjectTypePrompts] Fetching all project type configurations...');

      const response = await fetch(
        `https://${workspaceHost}/api/2.0/sql/statements`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warehouse_id: warehouseId,
            statement: `
              SELECT
                project_type,
                prompt,
                created_by,
                created_at,
                updated_by,
                updated_at
              FROM knowledge_base.${schema}.project_type_configs
              WHERE is_active = TRUE
              ORDER BY project_type
            `,
            wait_timeout: '30s',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Query failed: ${response.statusText}`);
      }

      const result = await response.json();
      const rows = result.result?.data_array || [];

      const configs = rows.map(([projectType, prompt, createdBy, createdAt, updatedBy, updatedAt]) => ({
        projectType,
        prompt,
        createdBy,
        createdDate: createdAt ? new Date(createdAt).getTime() : Date.now(),
        updatedBy: updatedBy || undefined,
        updatedDate: updatedAt ? new Date(updatedAt).getTime() : undefined,
      }));

      console.log(`[ProjectTypePrompts] ✅ Found ${configs.length} project type configurations`);

      return res.status(200).json({ success: true, configs });
    }

    // ── POST: Add a new project type with prompt ────────────────────────────
    if (req.method === 'POST') {
      const { projectType, prompt, userEmail } = req.body;

      if (!projectType || !prompt || !userEmail) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['projectType', 'prompt', 'userEmail'],
        });
      }

      const resolvedRole = await getRoleForEmail(userEmail, workspaceHost, accessToken, warehouseId, schema);
      if (!roleIsAllowed(resolvedRole, ROLES_MANAGE_PROMPTS)) {
        logEvent({
          eventType: 'project_type_prompt_unauthorized',
          severity: 'warn',
          userEmail,
          message: `Unauthorized attempt to create project type prompt by ${resolvedRole}`,
          details: { projectType, resolvedRole },
        });
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only Data Scientists and Administrators can create project type prompts',
        });
      }

      const trimmedProjectType = projectType.trim();
      const trimmedPrompt = prompt.trim();

      if (!trimmedProjectType || !trimmedPrompt) {
        return res.status(400).json({ error: 'Project type and prompt cannot be empty' });
      }

      if (isSystemProjectType(trimmedProjectType)) {
        console.log(`[ProjectTypePrompts] ❌ Rejected: "${trimmedProjectType}" conflicts with system type`);
        logEvent({
          eventType: 'project_type_prompt_rejected',
          severity: 'warn',
          userEmail,
          message: `Attempt to create project type with system name: "${trimmedProjectType}"`,
          details: { projectType: trimmedProjectType, userRole },
        });
        return res.status(409).json({
          error: 'Name conflict with system project type',
          message: `Cannot use "${trimmedProjectType}" - this is a system project type. Please choose a different name.`,
        });
      }

      const configId = `pt_${trimmedProjectType.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

      console.log(`[ProjectTypePrompts] Adding new project type: "${trimmedProjectType}" by ${userEmail}`);

      // Check if already exists
      const checkResponse = await fetch(
        `https://${workspaceHost}/api/2.0/sql/statements`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouse_id: warehouseId,
            statement: `
              SELECT COUNT(*) as cnt
              FROM knowledge_base.${schema}.project_type_configs
              WHERE LOWER(project_type) = LOWER('${trimmedProjectType.replace(/'/g, "''")}')
              AND is_active = TRUE
            `,
            wait_timeout: '30s',
          }),
        }
      );

      if (checkResponse.ok) {
        const checkResult = await checkResponse.json();
        const count = checkResult.result?.data_array?.[0]?.[0] || 0;
        if (count > 0) {
          return res.status(409).json({
            error: 'Already exists',
            message: `Project type "${trimmedProjectType}" already exists`,
          });
        }
      }

      const insertResponse = await fetch(
        `https://${workspaceHost}/api/2.0/sql/statements`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouse_id: warehouseId,
            statement: `
              INSERT INTO knowledge_base.${schema}.project_type_configs
              (config_id, project_type, prompt, created_by)
              VALUES (
                '${configId}',
                '${trimmedProjectType.replace(/'/g, "''")}',
                '${trimmedPrompt.replace(/'/g, "''")}',
                '${userEmail.replace(/'/g, "''")}'
              )
            `,
            wait_timeout: '30s',
          }),
        }
      );

      if (!insertResponse.ok) {
        const error = await insertResponse.json().catch(() => ({}));
        throw new Error(error.message || `Insert failed: ${insertResponse.statusText}`);
      }

      console.log(`[ProjectTypePrompts] ✅ Added project type: "${trimmedProjectType}"`);

      logEvent({
        eventType: 'project_type_prompt_created',
        severity: 'info',
        userEmail,
        projectType: trimmedProjectType,
        message: `Created project type "${trimmedProjectType}" with custom prompt`,
        details: { promptLength: trimmedPrompt.length },
      });

      return res.status(201).json({
        success: true,
        projectType: trimmedProjectType,
        message: `Project type "${trimmedProjectType}" created successfully`,
      });
    }

    // ── PATCH: Update an existing project type's prompt ─────────────────────
    if (req.method === 'PATCH') {
      const { projectType, prompt, userEmail } = req.body;

      if (!projectType || !prompt || !userEmail) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['projectType', 'prompt', 'userEmail'],
        });
      }

      const resolvedRole = await getRoleForEmail(userEmail, workspaceHost, accessToken, warehouseId, schema);
      if (!roleIsAllowed(resolvedRole, ROLES_MANAGE_PROMPTS)) {
        logEvent({
          eventType: 'project_type_prompt_unauthorized',
          severity: 'warn',
          userEmail,
          message: `Unauthorized attempt to update project type prompt by ${resolvedRole}`,
          details: { projectType, resolvedRole },
        });
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only Data Scientists and Administrators can update project type prompts',
        });
      }

      const trimmedProjectType = projectType.trim();
      const trimmedPrompt = prompt.trim();

      if (!trimmedProjectType || !trimmedPrompt) {
        return res.status(400).json({ error: 'Project type and prompt cannot be empty' });
      }

      console.log(`[ProjectTypePrompts] Updating prompt for: "${trimmedProjectType}" by ${userEmail}`);

      const checkResponse = await fetch(
        `https://${workspaceHost}/api/2.0/sql/statements`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouse_id: warehouseId,
            statement: `
              SELECT COUNT(*) as cnt
              FROM knowledge_base.${schema}.project_type_configs
              WHERE LOWER(project_type) = LOWER('${trimmedProjectType.replace(/'/g, "''")}')
              AND is_active = TRUE
            `,
            wait_timeout: '30s',
          }),
        }
      );

      if (checkResponse.ok) {
        const checkResult = await checkResponse.json();
        const count = checkResult.result?.data_array?.[0]?.[0] || 0;
        if (count === 0) {
          return res.status(404).json({
            error: 'Not found',
            message: `Project type "${trimmedProjectType}" does not exist`,
          });
        }
      }

      const updateResponse = await fetch(
        `https://${workspaceHost}/api/2.0/sql/statements`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouse_id: warehouseId,
            statement: `
              UPDATE knowledge_base.${schema}.project_type_configs
              SET
                prompt = '${trimmedPrompt.replace(/'/g, "''")}',
                updated_by = '${userEmail.replace(/'/g, "''")}',
                updated_at = CURRENT_TIMESTAMP()
              WHERE LOWER(project_type) = LOWER('${trimmedProjectType.replace(/'/g, "''")}')
              AND is_active = TRUE
            `,
            wait_timeout: '30s',
          }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json().catch(() => ({}));
        throw new Error(error.message || `Update failed: ${updateResponse.statusText}`);
      }

      console.log(`[ProjectTypePrompts] ✅ Updated prompt for: "${trimmedProjectType}"`);

      logEvent({
        eventType: 'project_type_prompt_updated',
        severity: 'info',
        userEmail,
        projectType: trimmedProjectType,
        message: `Updated prompt for project type "${trimmedProjectType}"`,
        details: { promptLength: trimmedPrompt.length },
      });

      return res.status(200).json({
        success: true,
        projectType: trimmedProjectType,
        message: `Project type "${trimmedProjectType}" updated successfully`,
      });
    }

    // ── DELETE: Soft-delete a project type configuration ────────────────────
    if (req.method === 'DELETE') {
      const { projectType, userEmail } = req.body;

      if (!projectType || !userEmail) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['projectType', 'userEmail'],
        });
      }

      const resolvedRole = await getRoleForEmail(userEmail, workspaceHost, accessToken, warehouseId, schema);
      if (!roleIsAllowed(resolvedRole, ROLES_MANAGE_PROMPTS)) {
        logEvent({
          eventType: 'project_type_prompt_unauthorized',
          severity: 'warn',
          userEmail,
          message: `Unauthorized attempt to delete project type prompt by ${resolvedRole}`,
          details: { projectType, resolvedRole },
        });
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only Data Scientists and Administrators can delete project type prompts',
        });
      }

      const trimmedProjectType = projectType.trim();
      if (!trimmedProjectType) {
        return res.status(400).json({ error: 'Project type cannot be empty' });
      }

      console.log(`[ProjectTypePrompts] Deleting project type: "${trimmedProjectType}" by ${userEmail}`);

      const deleteResponse = await fetch(
        `https://${workspaceHost}/api/2.0/sql/statements`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouse_id: warehouseId,
            statement: `
              UPDATE knowledge_base.${schema}.project_type_configs
              SET
                is_active = FALSE,
                updated_by = '${userEmail.replace(/'/g, "''")}',
                updated_at = CURRENT_TIMESTAMP()
              WHERE LOWER(project_type) = LOWER('${trimmedProjectType.replace(/'/g, "''")}')
              AND is_active = TRUE
            `,
            wait_timeout: '30s',
          }),
        }
      );

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json().catch(() => ({}));
        throw new Error(error.message || `Delete failed: ${deleteResponse.statusText}`);
      }

      console.log(`[ProjectTypePrompts] ✅ Deleted project type: "${trimmedProjectType}"`);

      logEvent({
        eventType: 'project_type_prompt_deleted',
        severity: 'info',
        userEmail,
        projectType: trimmedProjectType,
        message: `Deleted project type "${trimmedProjectType}"`,
      });

      return res.status(200).json({
        success: true,
        projectType: trimmedProjectType,
        message: `Project type "${trimmedProjectType}" deleted successfully`,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[ProjectTypePrompts] Error:', error);
    return res.status(500).json({
      error: 'Project type prompt operation failed',
      message: error.message,
    });
  }
}
