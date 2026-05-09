import { getDatabricksConfig } from '../../utils/validateEnv.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const isMockMode = !process.env.DATABRICKS_HOST || !process.env.DATABRICKS_TOKEN || process.env.VITE_MOCK_MODE === 'true';
    if (isMockMode) return res.status(200).json({ personas: [] });

    const { workspaceHost, accessToken, warehouseId, schema } = getDatabricksConfig();

    await ensurePersonasTable(workspaceHost, accessToken, warehouseId, schema);

    const resp = await fetch('https://' + workspaceHost + '/api/2.0/sql/statements', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        statement:
          'SELECT persona_id, name, hex_ids, content_json, created_by, created_at ' +
          'FROM knowledge_base.' + schema + '.custom_personas ' +
          'WHERE is_active = TRUE ORDER BY created_at DESC',
        wait_timeout: '30s',
      }),
    });

    if (!resp.ok) throw new Error('Query failed: ' + resp.status);
    const result = await resp.json();
    const rows = result.result?.data_array || [];

    const personas = rows.map(row => ({
      personaId: row[0],
      name: row[1],
      hexIds: row[2] || 'any',
      contentJson: (() => { try { return JSON.parse(row[3] || '{}'); } catch { return {}; } })(),
      createdBy: row[4],
      createdAt: row[5],
    }));

    return res.status(200).json({ personas });
  } catch (error) {
    console.error('[Personas List] Error:', error);
    return res.status(500).json({ error: 'Failed to list personas', message: error.message });
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
