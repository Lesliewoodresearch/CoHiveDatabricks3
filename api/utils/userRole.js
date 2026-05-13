/**
 * Server-side role resolution for CoHive users.
 *
 * Looks up role from the user_roles table using email-first, domain-fallback
 * priority. Results are cached in memory for 5 minutes per cold-start to avoid
 * a warehouse round-trip on every request.
 *
 * Resolution order:
 *   1. Exact email match  (match_type = 'email')
 *   2. Domain match       (match_type = 'domain')
 *   3. Hard-coded default ('marketing-manager')
 */

const CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

const VALID_ROLES = new Set([
  'administrator',
  'research-analyst',
  'research-leader',
  'data-scientist',
  'marketing-manager',
  'product-manager',
  'executive-stakeholder',
]);

const DEFAULT_ROLE = 'marketing-manager';

/**
 * Resolve the CoHive role for a given email address.
 * Never throws — returns DEFAULT_ROLE on any failure.
 */
export async function getRoleForEmail(email, workspaceHost, accessToken, warehouseId, schema) {
  if (!email) return DEFAULT_ROLE;

  const cached = CACHE.get(email);
  if (cached && Date.now() < cached.expiresAt) return cached.role;

  try {
    const domain = email.split('@')[1] || '';
    const esc = (s) => String(s).replace(/'/g, "''");

    const statement =
      `SELECT role FROM knowledge_base.${schema}.user_roles ` +
      `WHERE is_active = TRUE ` +
      `AND match_value IN ('${esc(email)}', '${esc(domain)}') ` +
      `ORDER BY CASE match_type WHEN 'email' THEN 0 ELSE 1 END ` +
      `LIMIT 1`;

    const resp = await fetch(`https://${workspaceHost}/api/2.0/sql/statements`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ warehouse_id: warehouseId, statement, wait_timeout: '10s' }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const result = await resp.json();
    const rawRole = result.result?.data_array?.[0]?.[0] || DEFAULT_ROLE;
    const role = VALID_ROLES.has(rawRole) ? rawRole : DEFAULT_ROLE;

    CACHE.set(email, { role, expiresAt: Date.now() + CACHE_TTL_MS });
    return role;
  } catch (err) {
    console.warn(`[UserRole] Lookup failed for ${email}, defaulting to ${DEFAULT_ROLE}:`, err.message);
    return DEFAULT_ROLE;
  }
}

/**
 * Returns true if the resolved role is in the allowed set.
 */
export function roleIsAllowed(role, allowedRoles) {
  return allowedRoles.includes(role);
}

// Role sets used by permission checks across routes
export const ROLES_APPROVE_RESEARCH = ['administrator', 'research-leader'];
export const ROLES_DELETE_FILES     = ['administrator', 'research-leader', 'data-scientist'];
export const ROLES_MANAGE_PROMPTS   = ['administrator', 'data-scientist'];
export const ROLES_MANAGE_ROLES     = ['administrator'];
