/**
 * Lightweight geofence endpoint for client-side gating.
 *
 * Returns whether screening (health-data) submission is allowed from the visitor's country.
 * Cloudflare provides `request.cf.country` (ISO 3166-1 alpha-2) when running on Pages.
 */

const EU_UK_COUNTRIES = new Set([
  // EU-27
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // UK
  'GB', 'UK'
]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // This response varies by request geography; avoid caching surprises.
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequest(context) {
  const { request } = context;
  const cf = request && request.cf ? request.cf : null;
  const rawCountry = cf && cf.country ? String(cf.country) : '';
  const country = rawCountry.trim().toUpperCase();
  const allowed = country ? EU_UK_COUNTRIES.has(country) : false;

  return json({
    ok: true,
    allowed,
    zone: allowed ? 'eu_uk' : 'global',
    country: country || null
  });
}
