/**
 * Feedback / Bug Report API
 *
 * Receives a user-submitted message and:
 *   1. Logs it to the activity_log table (always, even if email fails)
 *   2. Sends an email to Help@CohiveSolutions.com via Resend
 *
 * POST /api/feedback/report
 * Body: { message, userEmail, hexId, hexLabel, brand, projectType, userRole }
 *
 * Always returns 200 — the UI clears regardless of email outcome.
 * Requires RESEND_API_KEY in Vercel environment variables.
 */

import { getDatabricksConfig } from '../utils/validateEnv.js';

const REPORT_TO = 'Help@CohiveSolutions.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    message = '',
    userEmail = 'unknown',
    hexId = 'unknown',
    hexLabel = 'unknown',
    brand = '',
    projectType = '',
    userRole = '',
  } = req.body || {};

  if (!message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const timestamp = new Date().toISOString();

  // ── 1. Log to activity_log (best-effort, non-blocking) ────────────────────
  try {
    const { workspaceHost, accessToken, warehouseId, schema } = getDatabricksConfig();
    const esc = (s) => String(s || '').replace(/'/g, "''");
    const logId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const details = JSON.stringify({ hexId, hexLabel, brand, projectType, userRole, message }).replace(/'/g, "''");

    await fetch(`https://${workspaceHost}/api/2.0/sql/statements`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        statement:
          `INSERT INTO knowledge_base.${schema}.activity_log ` +
          `(log_id, event_type, severity, user_email, brand, project_type, hex_id, message, details, created_at) VALUES ` +
          `('${esc(logId)}', 'feedback_report', 'info', '${esc(userEmail)}', '${esc(brand)}', '${esc(projectType)}', '${esc(hexId)}', '${esc(message.substring(0, 2000))}', '${details}', CURRENT_TIMESTAMP())`,
        wait_timeout: '10s',
      }),
    });
  } catch (logErr) {
    console.warn('[Feedback] Could not log to activity_log:', logErr.message);
  }

  // ── 2. Send email via Resend ───────────────────────────────────────────────
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Feedback] RESEND_API_KEY not set — email not sent');
    return res.status(200).json({ success: true, emailed: false });
  }

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#7c3aed">CoHive Feedback Report</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:6px 12px;background:#f5f3ff;font-weight:600;width:140px">From</td><td style="padding:6px 12px;border-bottom:1px solid #ede9fe">${userEmail}</td></tr>
        <tr><td style="padding:6px 12px;background:#f5f3ff;font-weight:600">Hex</td><td style="padding:6px 12px;border-bottom:1px solid #ede9fe">${hexLabel} (${hexId})</td></tr>
        <tr><td style="padding:6px 12px;background:#f5f3ff;font-weight:600">Brand</td><td style="padding:6px 12px;border-bottom:1px solid #ede9fe">${brand || '—'}</td></tr>
        <tr><td style="padding:6px 12px;background:#f5f3ff;font-weight:600">Project Type</td><td style="padding:6px 12px;border-bottom:1px solid #ede9fe">${projectType || '—'}</td></tr>
        <tr><td style="padding:6px 12px;background:#f5f3ff;font-weight:600">Role</td><td style="padding:6px 12px;border-bottom:1px solid #ede9fe">${userRole || '—'}</td></tr>
        <tr><td style="padding:6px 12px;background:#f5f3ff;font-weight:600">Submitted</td><td style="padding:6px 12px;border-bottom:1px solid #ede9fe">${timestamp}</td></tr>
      </table>
      <div style="margin-top:20px;padding:16px;background:#faf5ff;border-left:4px solid #7c3aed;border-radius:4px">
        <p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
    </div>
  `;

  try {
    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CoHive Feedback <feedback@cohivesolutions.com>',
        to: [REPORT_TO],
        reply_to: userEmail !== 'unknown' ? userEmail : undefined,
        subject: `[CoHive Feedback] ${hexLabel} · ${userEmail}`,
        html: htmlBody,
      }),
    });

    if (!emailResp.ok) {
      const err = await emailResp.text();
      console.error('[Feedback] Resend error:', emailResp.status, err);
      return res.status(200).json({ success: true, emailed: false });
    }

    console.log(`[Feedback] Report sent from ${userEmail} in ${hexId}`);
    return res.status(200).json({ success: true, emailed: true });
  } catch (emailErr) {
    console.error('[Feedback] Email send failed:', emailErr.message);
    return res.status(200).json({ success: true, emailed: false });
  }
}
