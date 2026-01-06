/**
 * Cloudflare Pages Function to create a Contact/Lead in Kaddio.
 * Exposed at /api/kaddio/contact
 *
 * Required env vars (set in Pages project settings):
 * - KADDIO_GRAPHQL_URL  e.g. https://<org>.kaddio.com/graphql
 * - KADDIO_API_TOKEN    personal API token from /my-profile
 * - KADDIO_IMPERSONATION_ID (optional) host id to impersonate
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

const UPDATE_USER_MUTATION = `
mutation UpdateUser($userId: ID!, $customProperties: [CustomFieldValueInput]) {
  updateUser(
    userId: $userId
    customProperties: $customProperties
  )
}
`;

const ZOHO_WEBTOLEAD_ENDPOINT = 'https://crm.zoho.eu/crm/WebToLeadForm';
const ZOHO_WEBTOLEAD_FIELDS = {
  xnQsjsdp: 'fd28655d146975d2aa0afe4be1e837490b74bd86670e415c1fbd1db2ca1ee9c3',
  zc_gad: '',
  xmIwtLD: 'fdc584738800610bea5facb3757dea684c5df902d73ceb78d6df3492192a2d6839c8a59ba489c3762746fdcd6bd54aa5',
  actionType: 'TGVhZHM=',
  returnURL: 'https://riktapsykiatri.se/tack/',
  aG9uZXlwb3Q: ''
};

const MAX_BODY_SIZE = 8000; // guardrail against oversized payloads
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const ZOHO_RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }));
  }

  if (request.method !== 'POST') {
    return withCors(json({ error: 'Method not allowed' }, 405));
  }

  const rawText = await request.text();
  if (!rawText || rawText.length > MAX_BODY_SIZE) {
    return withCors(json({ error: 'Invalid payload' }, 400));
  }

  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch (_err) {
    return withCors(json({ error: 'Malformed JSON' }, 400));
  }

  const normalized = normalizeInput(parsed);
  if (!normalized) {
    return withCors(json({ error: 'Missing required fields' }, 400));
  }

  const clientInput = {
    firstname: normalized.firstname,
    lastname: normalized.lastname,
    email: normalized.email,
    notification: normalized.description || 'Website enquiry',
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
      return withCors(json({ error: message || 'Kaddio rejected the request' }, 502));
    }

    const clientId = createResponse.data?.createClient || null;
    if (!clientId) {
      return withCors(json({ error: 'Kaddio did not return a client id' }, 502));
    }

    const message = normalized.description || 'Website enquiry';
    const customProps = [
      { field: 'Reason_Field', valueString: message }
    ];
    let updateWarning = null;
    let updatedCustomProperties = true;

    try {
      const updateUserResponse = await callKaddio({
        query: UPDATE_USER_MUTATION,
        variables: {
          userId: clientId,
          customProperties: customProps
        },
        env
      });

      if (updateUserResponse.errors?.length) {
        const messageText = updateUserResponse.errors.map(err => err.message).join('; ');
        updateWarning = messageText || 'Client created but custom field not updated';
        updatedCustomProperties = false;
      }
    } catch (err) {
      updateWarning = err?.message || 'Client created; custom field update failed';
      updatedCustomProperties = false;
    }

    try {
      await sendZohoLead(normalized);
    } catch (_err) {
      return withCors(json({ error: 'Could not submit the form just now.' }, 502));
    }

    return withCors(json({
      ok: true,
      clientId,
      updatedCustomProperties,
      ...(updateWarning ? { warning: updateWarning } : {})
    }));
  } catch (error) {
    return withCors(json({ error: error.message || 'Failed to reach Kaddio' }, error.statusCode || 502));
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(response.body, { status: response.status, headers });
}

function normalizeInput(body) {
  if (!body || typeof body !== 'object') return null;

  const fullName = (body.fullName || [body.firstName, body.lastName].filter(Boolean).join(' ') || '').trim();
  const email = (body.email || '').trim();
  const description = (body.description || body.Description || body.message || '').trim();
  if (!fullName || !email) return null;

  const [first, ...rest] = fullName.split(/\s+/);
  const lastname = rest.join(' ') || (body.lastName || 'N/A');
  const firstname = first || (body.firstName || 'N/A');
  const leadSource = (body.leadSource || 'Website form').trim();
  const metadata = body.metadata || {};

  const metaNote = [
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
  } catch (_err) {
    return '[unserializable metadata]';
  }
}

function buildZohoParams(normalized) {
  const params = new URLSearchParams();
  Object.entries(ZOHO_WEBTOLEAD_FIELDS).forEach(([key, value]) => {
    params.set(key, value || '');
  });
  params.set('First Name', normalized.firstname || '');
  params.set('Last Name', normalized.lastname || '');
  params.set('Email', normalized.email || '');
  if (normalized.leadSource) {
    params.set('Lead Source', normalized.leadSource);
  }
  return params;
}

async function sendZohoLead(normalized) {
  const params = buildZohoParams(normalized);
  const response = await postZoho(params);
  if (!response) {
    const err = new Error('Zoho request failed');
    err.statusCode = 502;
    throw err;
  }
  if (!(response.ok || (response.status >= 300 && response.status < 400))) {
    const err = new Error(`Zoho rejected lead [status ${response.status}]`);
    err.statusCode = response.status;
    throw err;
  }
}

async function postZoho(params) {
  let lastResponse = null;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
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
      if (!ZOHO_RETRYABLE_STATUS.has(response.status) || attempt === maxAttempts) {
        return response;
      }
    } catch (_err) {
      if (attempt === maxAttempts) {
        return lastResponse;
      }
    }
    await wait(300 * attempt);
  }
  return lastResponse;
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
      const waitMs = 400 * attempt; // sliding window/rate-limit friendly backoff
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
