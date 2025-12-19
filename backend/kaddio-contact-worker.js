/**
 * Cloudflare Worker / Service Worker style handler for posting website forms to Kaddio.
 *
 * Expected environment variables (configure in your platform secrets):
 * - KADDIO_GRAPHQL_URL: https://<org>.kaddio.com/graphql
 * - KADDIO_API_TOKEN: Personal API token generated in Kaddio (/my-profile)
 * - KADDIO_IMPERSONATION_ID: (optional) host id to impersonate when creating contacts
 */

const CREATE_CLIENT_MUTATION = `
mutation CreateClient(
  $firstname: String
  $lastname: String
  $email: String
  $notification: String
  $pnr: String
  $zip: String
  $city: String
  $streetAdress: String
  $cellphone: String
) {
  createClient(
    firstname: $firstname
    lastname: $lastname
    email: $email
    notification: $notification
    pnr: $pnr
    zip: $zip
    city: $city
    streetAdress: $streetAdress
    cellphone: $cellphone
  )
}
`;

const MAX_BODY_SIZE = 8000; // basic guardrail against oversized payloads
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return buildCorsResponse(new Response(null, { status: 204 }));
    }

    if (request.method !== 'POST') {
      return buildCorsResponse(json({ error: 'Method not allowed' }, 405));
    }

    const rawText = await request.text();
    if (!rawText || rawText.length > MAX_BODY_SIZE) {
      return buildCorsResponse(json({ error: 'Invalid payload' }, 400));
    }

    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      return buildCorsResponse(json({ error: 'Malformed JSON' }, 400));
    }

    const normalized = normalizeInput(parsed);
    if (!normalized) {
      return buildCorsResponse(json({ error: 'Missing required fields' }, 400));
    }

    const notification = normalized.description || 'Website enquiry';
    const clientInput = {
      firstname: normalized.firstname,
      lastname: normalized.lastname,
      email: normalized.email,
      notification,
      pnr: null,
      zip: null,
      city: null,
      streetAdress: null,
      cellphone: null
    };

    try {
      const createResponse = await callKaddio({
        query: CREATE_CLIENT_MUTATION,
        variables: clientInput,
        env
      });

      if (createResponse.errors?.length) {
        const message = createResponse.errors.map(err => err.message).join('; ');
        return buildCorsResponse(json({ error: message || 'Kaddio rejected the request' }, 502));
      }

      const clientId = createResponse.data?.createClient || null;
      if (!clientId) {
        return buildCorsResponse(json({ error: 'Kaddio did not return a client id' }, 502));
      }

      // Simplify: only create the client. Skip customProperties to avoid Kaddio rejections.
      return buildCorsResponse(json({ ok: true, clientId }));
    } catch (error) {
      return buildCorsResponse(json({ error: error.message || 'Failed to reach Kaddio' }, error.statusCode || 502));
    }
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function buildCorsResponse(response, originHeader) {
  const headers = new Headers(response.headers);
  const origin = originHeader || headers.get('Access-Control-Allow-Origin') || '*';
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(response.body, { status: response.status, headers });
}

function normalizeInput(body) {
  if (!body || typeof body !== 'object') return null;

  const fullName = (body.fullName || [body.firstName, body.lastName].filter(Boolean).join(' ') || '').trim();
  const email = (body.email || '').trim();
  const description = (body.description || '').trim();
  if (!fullName || !email) return null;

  const [first, ...rest] = fullName.split(/\s+/);
  const lastname = rest.join(' ') || (body.lastName || 'N/A');
  const firstname = first || (body.firstName || 'N/A');
  const leadSource = (body.leadSource || 'Website form').trim();
  const metadata = body.metadata || {};

  // Avoid logging PII. Combine metadata into a single human-readable note instead.
  const metaNote = [
    description ? `Message: ${description}` : '',
    metadata.path ? `Path: ${metadata.path}` : '',
    metadata.formContext ? `Form: ${metadata.formContext}` : '',
    metadata.screening ? `Screening: ${safeStringify(metadata.screening)}` : ''
  ].filter(Boolean).join(' | ');

  return {
    firstname,
    lastname,
    email,
    description,
    leadSource,
    note: metaNote
  };
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (err) {
    return '[unserializable metadata]';
  }
}

async function callKaddio({ query, variables, env }) {
  const url = env.KADDIO_GRAPHQL_URL;
  const token = env.KADDIO_API_TOKEN;
  if (!url || !token) {
    const err = new Error('Missing Kaddio configuration');
    err.statusCode = 500;
    throw err;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: token
  };
  if (env.KADDIO_IMPERSONATION_ID) {
    headers.ImpersonationId = env.KADDIO_IMPERSONATION_ID;
  }

  const body = JSON.stringify({ query, variables });
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url, { method: 'POST', headers, body });
    if (RETRYABLE_STATUS.has(response.status) && attempt < maxAttempts) {
      // Sliding window/rate-limit protection: backoff before retrying.
      const waitMs = 400 * attempt;
      await wait(waitMs);
      continue;
    }
    const parsed = await response.json().catch(() => ({}));
    if (!response.ok) {
      const raw = typeof parsed === 'object' ? JSON.stringify(parsed) : String(parsed || '');
      const err = new Error(`${parsed?.error || parsed?.message || 'Kaddio API error'} [status ${response.status}] ${raw ? `| ${raw}` : ''}`);
      err.statusCode = response.status;
      throw err;
    }
    return parsed;
  }

  const err = new Error('Kaddio request failed after retries');
  err.statusCode = 504;
  throw err;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
