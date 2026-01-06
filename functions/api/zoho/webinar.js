const ZOHO_WEBTOLEAD_ENDPOINT = 'https://crm.zoho.eu/crm/WebToLeadForm';
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const REQUIRED_FIELDS = ['xnQsjsdp', 'xmIwtLD', 'actionType', 'Last Name', 'Email'];

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (_err) {
    return new Response('Invalid form submission', { status: 400 });
  }

  const params = new URLSearchParams();
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      params.append(key, value);
    }
  }

  if (!params.get('Last Name')) {
    params.set('Last Name', 'Webbinarium');
  }

  const missing = REQUIRED_FIELDS.filter((name) => {
    const value = params.get(name);
    return !value || !String(value).trim();
  });
  if (missing.length) {
    return new Response('Missing required fields', { status: 400 });
  }

  const response = await postToZoho(params);
  if (!response) {
    return new Response('Could not reach the lead system', { status: 502 });
  }

  if (!(response.ok || (response.status >= 300 && response.status < 400))) {
    return new Response('Lead submission failed', { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function postToZoho(params) {
  let lastResponse = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(ZOHO_WEBTOLEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      lastResponse = response;
      if (response.ok || (response.status >= 300 && response.status < 400)) {
        return response;
      }
      if (!RETRYABLE_STATUS.has(response.status)) {
        return response;
      }
    } catch (_err) {
      // Retry below.
    }

    const delayMs = 300 * (attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return lastResponse;
}
