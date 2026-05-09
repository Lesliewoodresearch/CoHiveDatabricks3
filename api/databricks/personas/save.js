import { getDatabricksConfig } from '../../utils/validateEnv.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { personaId, name, hexIds, contentJson, createdBy } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const isMockMode = !process.env.DATABRICKS_HOST || !process.env.DATABRICKS_TOKEN || process.env.VITE_MOCK_MODE === 'true';
    if (isMockMode) return res.status(200).json({ success: true, personaId: personaId || ('custom-' + randomUUID()) });

    const { workspaceHost, accessToken, warehouseId, schema } = getDatabricksConfig();

    await ensurePersonasTable(workspaceHost, accessToken, warehouseId, schema);

    const id = personaId || ('custom-' + randomUUID());
    const content = { ...contentJson, id, name: name.trim() };
    const safeContent = JSON.stringify(content).replace(/'/g, "''");
    const safeName = name.trim().replace(/'/g, "''");
    const safeHexIds = (hexIds || 'any').replace(/'/g, "''");
    const safeCreatedBy = (createdBy || 'unknown').replace(/'/g, "''");
    const safeId = id.replace(/'/g, "''");

    let statement;
    if (personaId) {
      statement =
        'UPDATE knowledge_base.' + schema + '.custom_personas ' +
        "SET name = '" + safeName + "', " +
        "hex_ids = '" + safeHexIds + "', " +
        "content_json = '" + safeContent + "', " +
        'updated_at = CURRENT_TIMESTAMP() ' +
        "WHERE persona_id = '" + safeId + "'";
    } else {
      statement =
        'INSERT INTO knowledge_base.' + schema + '.custom_personas ' +
        '(persona_id, name, hex_ids, content_json, created_by, created_at, updated_at, is_active) VALUES (' +
        "'" + safeId + "', '" + safeName + "', '" + safeHexIds + "', '" + safeContent + "', " +
        "'" + safeCreatedBy + "', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), TRUE)";
    }

    const resp = await fetch('https://' + workspaceHost + '/api/2.0/sql/statements', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ warehouse_id: warehouseId, statement, wait_timeout: '30s' }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error('Save failed (' + resp.status + '): ' + (err.message || ''));
    }

    console.log('[Personas Save] Saved persona: ' + id);
    return res.status(200).json({ success: true, personaId: id });
  } catch (error) {
    console.error('[Personas Save] Error:', error);
    return res.status(500).json({ error: 'Failed to save persona', message: error.message });
  }
}

async function ensurePersonasTable(workspaceHost, accessToken, warehouseId, schema) {
  try {
    await fetch('https://' + workspaceHost + '/api/2.0/sql/statements', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        statement:
          'CREATE TABLE IF NOT EXISTS knowledge_base.' + schema + '.custom_personas (' +
          'persona_id STRING, name STRING, hex_ids STRING, content_json STRING, ' +
          'created_by STRING, created_at TIMESTAMP, updated_at TIMESTAMP, is_active BOOLEAN)',
        wait_timeout: '30s',
      }),
    });
  } catch (e) {
    console.warn('[Personas] Could not ensure table:', e.message);
  }
}
