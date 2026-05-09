import { getDatabricksConfig } from '../../utils/validateEnv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { personaId } = req.body;
    if (!personaId) return res.status(400).json({ error: 'personaId is required' });

    const isMockMode = !process.env.DATABRICKS_HOST || !process.env.DATABRICKS_TOKEN || process.env.VITE_MOCK_MODE === 'true';
    if (isMockMode) return res.status(200).json({ success: true });

    const { workspaceHost, accessToken, warehouseId, schema } = getDatabricksConfig();

    const safeId = personaId.replace(/'/g, "''");
    const resp = await fetch('https://' + workspaceHost + '/api/2.0/sql/statements', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        statement:
          'UPDATE knowledge_base.' + schema + '.custom_personas ' +
          'SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP() ' +
          "WHERE persona_id = '" + safeId + "'",
        wait_timeout: '30s',
      }),
    });

    if (!resp.ok) throw new Error('Delete failed: ' + resp.status);

    console.log('[Personas Delete] Soft-deleted persona: ' + personaId);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Personas Delete] Error:', error);
    return res.status(500).json({ error: 'Failed to delete persona', message: error.message });
  }
}
