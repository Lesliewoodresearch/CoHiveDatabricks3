/**
 * CoHive Databricks Setup Script
 *
 * One-time initialization for a new client deployment.
 * Creates all required tables and volumes in the client's Databricks workspace.
 *
 * Usage: GET /api/setup/init
 * Only runs if tables don't already exist (safe to call multiple times).
 * Protect this endpoint — only call it during initial client setup.
 *
 * Location: api/setup/init.js
 */

import { getDatabricksConfig } from '../utils/validateEnv.js';

async function runSQL(workspaceHost, accessToken, warehouseId, statement, label) {
  console.log(`[Setup] Running: ${label}`);
  const resp = await fetch(`https://${workspaceHost}/api/2.0/sql/statements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      warehouse_id: warehouseId,
      statement,
      wait_timeout: '50s',
    }),
  });

  const result = await resp.json();

  if (!resp.ok) {
    throw new Error(`${label} failed: ${result.message || resp.statusText}`);
  }

  console.log(`[Setup] ✅ ${label}`);
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workspaceHost, accessToken, warehouseId, schema, clientName } = getDatabricksConfig();

    console.log(`[Setup] Initializing CoHive for client: ${clientName}`);
    console.log(`[Setup] Workspace: ${workspaceHost}`);
    console.log(`[Setup] Schema: knowledge_base.${schema}`);

    const steps = [];

    // ── Step 1: Create catalog if it doesn't exist ─────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE CATALOG IF NOT EXISTS knowledge_base`,
      'Create catalog'
    );
    steps.push('catalog');

    // ── Step 2: Create schema ──────────────────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE SCHEMA IF NOT EXISTS knowledge_base.${schema}`,
      'Create schema'
    );
    steps.push('schema');

    // ── Step 3: Create volume for file storage ─────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE VOLUME IF NOT EXISTS knowledge_base.${schema}.default`,
      'Create volume'
    );
    steps.push('volume');

    // ── Step 4: Create file_metadata table ────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.file_metadata (
        file_id            STRING NOT NULL,
        file_path          STRING,
        file_name          STRING,
        scope              STRING,
        category           STRING,
        brand              STRING,
        project_type       STRING,
        file_type          STRING,
        is_approved        BOOLEAN DEFAULT FALSE,
        upload_date        TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        uploaded_by        STRING,
        approver_email     STRING,
        approval_date      TIMESTAMP,
        approval_notes     STRING,
        tags               ARRAY<STRING>,
        citation_count     INT DEFAULT 0,
        gem_inclusion_count INT DEFAULT 0,
        file_size_bytes    BIGINT,
        content_summary    STRING,
        insight_type       STRING,
        input_method       STRING,
        cleaning_status    STRING DEFAULT 'pending',
        created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        CONSTRAINT pk_file_metadata PRIMARY KEY (file_id)
      )`,
      'Create file_metadata table'
    );
    steps.push('file_metadata table');

    // ── Step 5: Create gems table ──────────────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.gems (
        gem_id             STRING NOT NULL,
        gem_text           STRING,
        file_id            STRING,
        file_name          STRING,
        assessment_type    STRING,
        hex_id             STRING,
        hex_label          STRING,
        brand              STRING,
        project_type       STRING,
        created_by         STRING,
        created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        CONSTRAINT pk_gems PRIMARY KEY (gem_id)
      )`,
      'Create gems table'
    );
    steps.push('gems table');

    // ── Step 6: Create users table ─────────────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.users (
        user_email         STRING NOT NULL,
        role               STRING DEFAULT 'analyst',
        is_active          BOOLEAN DEFAULT TRUE,
        created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        last_login         TIMESTAMP,
        CONSTRAINT pk_users PRIMARY KEY (user_email)
      )`,
      'Create users table'
    );
    steps.push('users table');

    // ── Step 7: Create activity_log table ──────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.activity_log (
        log_id             STRING NOT NULL,
        event_type         STRING,
        severity           STRING DEFAULT 'info',
        user_email         STRING,
        brand              STRING,
        project_type       STRING,
        hex_id             STRING,
        message            STRING,
        details            STRING,
        duration_ms        INT,
        created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        CONSTRAINT pk_activity_log PRIMARY KEY (log_id)
      )`,
      'Create activity_log table'
    );
    steps.push('activity_log table');

    // ── Step 8: Create shared_config table for brands and project types ─────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.shared_config (
        config_id          STRING NOT NULL,
        config_type        STRING NOT NULL,
        config_value       STRING NOT NULL,
        display_order      INT DEFAULT 0,
        is_active          BOOLEAN DEFAULT TRUE,
        created_by         STRING,
        created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        CONSTRAINT pk_shared_config PRIMARY KEY (config_id)
      )`,
      'Create shared_config table'
    );
    steps.push('shared_config table');

    // ── Step 9: Insert default brands and project types ─────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `MERGE INTO knowledge_base.${schema}.shared_config AS target
       USING (
         SELECT 'brand_nike' AS config_id, 'brand' AS config_type, 'Nike' AS config_value, 1 AS display_order
         UNION ALL SELECT 'brand_adidas', 'brand', 'Adidas', 2
         UNION ALL SELECT 'project_creative', 'project_type', 'Creative Messaging', 1
         UNION ALL SELECT 'project_packaging', 'project_type', 'Packaging', 2
         UNION ALL SELECT 'project_launch', 'project_type', 'Product Launch', 3
         UNION ALL SELECT 'project_wargames', 'project_type', 'War Games', 4
       ) AS source
       ON target.config_id = source.config_id
       WHEN NOT MATCHED THEN INSERT (config_id, config_type, config_value, display_order, created_by)
       VALUES (source.config_id, source.config_type, source.config_value, source.display_order, 'system')`,
      'Insert default brands and project types'
    );
    steps.push('default config values');

    // ── Step 10: Create user_roles table ──────────────────────────────────
    await runSQL(workspaceHost, accessToken, warehouseId,
      `CREATE TABLE IF NOT EXISTS knowledge_base.${schema}.user_roles (
        id           STRING NOT NULL,
        match_type   STRING NOT NULL,
        match_value  STRING NOT NULL,
        role         STRING NOT NULL,
        created_by   STRING,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        is_active    BOOLEAN DEFAULT TRUE,
        CONSTRAINT pk_user_roles PRIMARY KEY (id)
      )`,
      'Create user_roles table'
    );
    steps.push('user_roles table');

    console.log(`[Setup] ✅ All setup steps complete for ${clientName}`);

    return res.status(200).json({
      success: true,
      clientName,
      schema: `knowledge_base.${schema}`,
      workspaceHost,
      stepsCompleted: steps,
      message: `CoHive successfully initialized for ${clientName}. All tables and volumes are ready.`,
    });

  } catch (error) {
    console.error('[Setup] Error:', error);
    return res.status(500).json({
      error: 'Setup failed',
      message: error.message,
    });
  }
}