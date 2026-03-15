/**
 * Cloudflare Pages Function to create a Contact/Lead in Kaddio.
 * Exposed at /api/kaddio/contact
 *
 * Required env vars (set in Pages project settings):
 * - KADDIO_GRAPHQL_URL  e.g. https://<org>.kaddio.com/graphql
 * - KADDIO_API_TOKEN    personal API token from /my-profile
 * - KADDIO_IMPERSONATION_ID (optional) host id to impersonate
 * - KADDIO_GRAPHQL_URL_SWEDEN (optional) Sweden org endpoint for sv locale
 * - KADDIO_API_TOKEN_SWEDEN (optional) Sweden org token for sv locale
 * - KADDIO_IMPERSONATION_ID_SWEDEN (optional) Sweden impersonation id
 *
 * Optional consent field mapping (CustomFieldValueInput.field identifiers in Kaddio):
 * - KADDIO_CONSENT_STATUS_FIELD
 * - KADDIO_CONSENT_TIMESTAMP_FIELD
 * - KADDIO_CONSENT_SOURCE_FIELD
 * - KADDIO_CONSENT_POLICY_URL_FIELD
 * - KADDIO_CONSENT_POLICY_VERSION_FIELD
 * - KADDIO_CONSENT_STATEMENT_VERSION_FIELD
 * - KADDIO_CONSENT_METADATA_FIELD
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

// Allow screening (health-data) submissions only from GDPR/UK-GDPR zones.
const EU_UK_COUNTRIES = new Set([
  // EU-27
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // UK
  'GB', 'UK'
]);

export async function onRequest(context) {
  const { request, env } = context;

  try {
    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (request.method !== 'POST') {
      return withCors(json({ error: 'Method not allowed' }, 405));
    }

    const parsed = await parseRequestPayload(request);
    if (parsed.error) {
      return withCors(json({ error: parsed.error }, 400));
    }

    const receivedAt = new Date().toISOString();
    const incoming = parsed.data || {};
    if (!incoming.metadata || typeof incoming.metadata !== 'object') {
      incoming.metadata = {};
    }
    if (!incoming.metadata.path || !incoming.metadata.locale) {
      const referer = request.headers.get('referer') || '';
      if (referer) {
        try {
          const url = new URL(referer);
          if (!incoming.metadata.path) incoming.metadata.path = url.pathname || undefined;
          if (!incoming.metadata.locale && url.pathname) {
            incoming.metadata.locale = url.pathname.toLowerCase().startsWith('/en') ? 'en' : 'sv';
          }
        } catch (_err) {}
      }
    }
    if (!incoming.metadata.locale) {
      const acceptLanguage = (request.headers.get('accept-language') || '').toLowerCase();
      if (acceptLanguage.startsWith('en')) {
        incoming.metadata.locale = 'en';
      } else if (acceptLanguage) {
        incoming.metadata.locale = 'sv';
      }
    }

    const normalized = normalizeInput(incoming);
    if (!normalized) {
      return withCors(json({ error: 'Missing required fields (name, email, description)' }, 400));
    }

    const geo = getGeofenceDecision(request);
    if (!geo.allowed && normalized.hasScreening) {
      return withCors(json({ error: 'Screening submissions are not available in your region.' }, 403));
    }

    // Explicit consent is required for screening submissions and for our primary contact forms.
    const formContext = normalized.meta && normalized.meta.formContext ? String(normalized.meta.formContext).toLowerCase() : '';
    const isContactFormContext = formContext.startsWith('contact-page') || formContext.startsWith('homepage-reviews');
    const requiresConsent = normalized.hasScreening
      || (normalized.meta && normalized.meta.consentRequired === true)
      || isContactFormContext;
    if (requiresConsent && (!normalized.consent || normalized.consent.status !== true)) {
      const errorMessage = normalized.hasScreening
        ? 'Explicit consent is required to submit screening results.'
        : 'Explicit consent is required to submit this form.';
      return withCors(json({ error: errorMessage }, 400));
    }

    const kaddioEnv = selectKaddioEnv(normalized, env);
    const kaddioResult = await sendKaddioLead(normalized, kaddioEnv, { receivedAt });
    const zohoResult = await sendZohoLeadSafe(normalized);

    const warnings = [kaddioResult.warning, zohoResult.warning].filter(Boolean);
    if (!kaddioResult.ok && !zohoResult.ok) {
      return withCors(json({ error: warnings[0] || 'Could not submit the form just now.' }, 502));
    }

    const response = {
      ok: true,
      clientId: kaddioResult.clientId,
      updatedCustomProperties: kaddioResult.updatedCustomProperties,
      delivery: kaddioResult.ok ? 'kaddio' : 'zoho'
    };

    if (warnings.length) {
      response.warning = warnings.join(' | ');
    }

    return withCors(json(response));
  } catch (_err) {
    return withCors(json({ error: 'Could not submit the form just now.' }, 502));
  }
}

function resolveSubmissionLocale(normalized) {
  const consentLocale = normalized && normalized.consent && normalized.consent.locale ? String(normalized.consent.locale) : '';
  const metaLocale = normalized && normalized.meta && normalized.meta.locale ? String(normalized.meta.locale) : '';
  const path = normalized && normalized.meta && normalized.meta.path ? String(normalized.meta.path) : '';
  const locale = (consentLocale || metaLocale).trim().toLowerCase();

  if (locale) return locale;
  if (path && path.toLowerCase().startsWith('/en')) return 'en';
  if (path) return 'sv';
  return '';
}

function selectKaddioEnv(normalized, env) {
  const locale = resolveSubmissionLocale(normalized);
  const useSweden = locale ? !locale.startsWith('en') : true;
  if (!useSweden) return env;

  return {
    ...env,
    KADDIO_GRAPHQL_URL: env.KADDIO_GRAPHQL_URL_SWEDEN || env.KADDIO_GRAPHQL_URL,
    KADDIO_API_TOKEN: env.KADDIO_API_TOKEN_SWEDEN || env.KADDIO_API_TOKEN,
    KADDIO_IMPERSONATION_ID: env.KADDIO_IMPERSONATION_ID_SWEDEN || env.KADDIO_IMPERSONATION_ID
  };
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

async function parseRequestPayload(request) {
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    return parseJsonBody(request);
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return parseUrlEncodedBody(request);
  }

  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData();
      const data = formDataToObject(formData);
      if (estimatePayloadSize(data) > MAX_BODY_SIZE) {
        return { error: 'Invalid payload' };
      }
      return { data };
    } catch (_err) {
      return { error: 'Invalid form submission' };
    }
  }

  const rawText = await safeReadText(request);
  if (!rawText || rawText.length > MAX_BODY_SIZE) {
    return { error: 'Invalid payload' };
  }
  try {
    return { data: JSON.parse(rawText) };
  } catch (_err) {
    if (rawText.includes('=')) {
      return { data: Object.fromEntries(new URLSearchParams(rawText)) };
    }
  }

  return { error: 'Invalid payload' };
}

async function parseJsonBody(request) {
  const rawText = await safeReadText(request);
  if (!rawText || rawText.length > MAX_BODY_SIZE) {
    return { error: 'Invalid payload' };
  }
  try {
    return { data: JSON.parse(rawText) };
  } catch (_err) {
    return { error: 'Malformed JSON' };
  }
}

async function parseUrlEncodedBody(request) {
  const rawText = await safeReadText(request);
  if (!rawText || rawText.length > MAX_BODY_SIZE) {
    return { error: 'Invalid payload' };
  }
  return { data: Object.fromEntries(new URLSearchParams(rawText)) };
}

async function safeReadText(request) {
  try {
    return await request.text();
  } catch (_err) {
    return '';
  }
}

function formDataToObject(formData) {
  const data = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      data[key] = value;
    }
  }
  return data;
}

function estimatePayloadSize(data) {
  if (!data || typeof data !== 'object') return 0;
  return Object.values(data).reduce((total, value) => {
    if (value === null || value === undefined) return total;
    return total + String(value).length;
  }, 0);
}

function normalizeCountryCode(value) {
  return (value === null || value === undefined) ? '' : String(value).trim().toUpperCase();
}

function getGeofenceDecision(request) {
  // Prefer Worker-provided cf object; fall back to request header when available.
  const cfCountry = request && request.cf && request.cf.country ? request.cf.country : '';
  const headerCountry = request && request.headers ? (request.headers.get('cf-ipcountry') || request.headers.get('CF-IPCountry') || '') : '';
  const country = normalizeCountryCode(cfCountry || headerCountry);

  // When running locally (no Cloudflare metadata), allow submissions so development flows still work.
  if (!country) {
    return { allowed: true, country: '' };
  }

  return { allowed: EU_UK_COUNTRIES.has(country), country };
}

function coerceString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function coerceBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  const normalized = coerceString(value).toLowerCase();
  if (normalized === 'on') return true;
  if (normalized === 'off') return false;
  if (normalized === 'true' || normalized === 'yes' || normalized === 'y') return true;
  if (normalized === 'false' || normalized === 'no' || normalized === 'n') return false;
  return null;
}

function normalizeConsent(consent) {
  if (!consent || typeof consent !== 'object') return null;
  const statusCoerced = coerceBoolean(consent.status);
  if (statusCoerced === null) return null;
  const purpose = coerceString(consent.purpose);
  const source = coerceString(consent.source);
  const locale = coerceString(consent.locale);
  const policyUrl = coerceString(consent.policyUrl);
  const termsUrl = coerceString(consent.termsUrl);
  const policyVersion = coerceString(consent.policyVersion);
  const statementVersion = coerceString(consent.statementVersion);
  const statement = coerceString(consent.statement);

  return {
    status: statusCoerced,
    purpose: purpose || undefined,
    source: source || undefined,
    locale: locale || undefined,
    policyUrl: policyUrl || undefined,
    termsUrl: termsUrl || undefined,
    policyVersion: policyVersion || undefined,
    statementVersion: statementVersion || undefined,
    statement: statement || undefined
  };
}

function normalizeInput(body) {
  if (!body || typeof body !== 'object') return null;

  const firstNameInput = coerceString(body.firstName || body['First Name']);
  const lastNameInput = coerceString(body.lastName || body['Last Name']);
  const fullNameInput = coerceString(body.fullName || body['Full Name']);
  const nameSuffix = coerceString(body.nameSuffix || body['Name Suffix']);
  const appendSuffix = (value, suffix) => {
    if (!suffix) return value;
    if (!value) return suffix;
    const normalized = String(value).trim();
    const target = String(suffix).trim();
    if (!target) return normalized;
    if (normalized.toLowerCase().endsWith(target.toLowerCase())) {
      return normalized;
    }
    return `${normalized} ${target}`.trim();
  };
  const lastNameWithSuffix = appendSuffix(lastNameInput, nameSuffix);
  const fullNameSeed = fullNameInput || [firstNameInput, lastNameWithSuffix].filter(Boolean).join(' ');
  const fullName = appendSuffix(fullNameSeed, nameSuffix);
  const email = coerceString(body.email || body.Email);
  const description = coerceString(
    body.reason
    || body.Reason
    || body.description
    || body.Description
    || body.message
  );
  if (!fullName || !email || !description) return null;

  const [first, ...rest] = fullName.split(/\s+/);
  const lastFallback = lastNameInput || nameSuffix || 'N/A';
  const firstname = first || firstNameInput || 'N/A';
  const lastname = rest.join(' ') || lastFallback;
  const leadSource = coerceString(body.leadSource || body['Lead Source'] || 'Lead input Website - English side');
  const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
  const path = coerceString(metadata.path);
  const formContext = coerceString(metadata.formContext);
  const locale = coerceString(metadata.locale);
  const consentRequired = coerceBoolean(metadata.consentRequired) === true;
  const screening = metadata.screening && typeof metadata.screening === 'object' ? metadata.screening : null;
  const screeningLabel = screening ? coerceString(screening.testName || screening.name || screening.title) : '';
  const consent = normalizeConsent(metadata.consent);

  const metaNote = [
    path ? `Path: ${path}` : '',
    formContext ? `Form: ${formContext}` : '',
    screeningLabel ? `Screening: ${screeningLabel}` : ''
  ].filter(Boolean).join(' | ');

  return {
    firstname,
    lastname,
    email,
    description,
    leadSource,
    note: metaNote,
    hasScreening: Boolean(screening),
    meta: {
      path: path || undefined,
      formContext: formContext || undefined,
      screeningLabel: screeningLabel || undefined,
      locale: locale || undefined,
      consentRequired: consentRequired || undefined
    },
    consent
  };
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (_err) {
    return '[unserializable metadata]';
  }
}

function buildConsentRecord(normalized, receivedAt) {
  const consent = normalized && normalized.consent;
  if (!consent || consent.status !== true) return null;

  const timestamp = receivedAt || new Date().toISOString();
  const source = consent.source
    || (normalized.meta && normalized.meta.formContext ? `Web Form: ${normalized.meta.formContext}` : '')
    || (normalized.leadSource ? `Web Form: ${normalized.leadSource}` : 'Web Form');

  return {
    status: true,
    timestamp,
    subject: {
      name: [normalized.firstname, normalized.lastname].filter(Boolean).join(' ').trim() || undefined,
      email: normalized.email || undefined
    },
    purpose: consent.purpose || undefined,
    source,
    locale: consent.locale || undefined,
    policyUrl: consent.policyUrl || undefined,
    termsUrl: consent.termsUrl || undefined,
    policyVersion: consent.policyVersion || undefined,
    statementVersion: consent.statementVersion || undefined,
    statement: consent.statement || undefined,
    context: {
      path: normalized.meta && normalized.meta.path ? normalized.meta.path : undefined,
      formContext: normalized.meta && normalized.meta.formContext ? normalized.meta.formContext : undefined,
      screeningLabel: normalized.meta && normalized.meta.screeningLabel ? normalized.meta.screeningLabel : undefined
    }
  };
}

function formatConsentBlock(record) {
  if (!record) return '';
  const subjectName = record.subject && record.subject.name ? coerceString(record.subject.name) : '';
  const subjectEmail = record.subject && record.subject.email ? coerceString(record.subject.email) : '';
  const statement = coerceString(record.statement);
  const lines = [
    'Consent (explicit):',
    subjectName ? `subject_name: ${subjectName}` : '',
    subjectEmail ? `subject_email: ${subjectEmail}` : '',
    'consent_status: TRUE',
    `consent_timestamp: ${record.timestamp}`,
    record.purpose ? `consent_purpose: ${record.purpose}` : '',
    record.source ? `consent_source: ${record.source}` : '',
    record.locale ? `consent_locale: ${record.locale}` : '',
    record.policyUrl ? `privacy_policy_url: ${record.policyUrl}` : '',
    record.termsUrl ? `terms_url: ${record.termsUrl}` : '',
    record.policyVersion ? `privacy_policy_version: ${record.policyVersion}` : '',
    statement ? `consent_statement: ${statement.slice(0, 500)}` : '',
    record.statementVersion ? `consent_statement_version: ${record.statementVersion}` : ''
  ].filter(Boolean);
  return lines.join('\n');
}

function appendConsentToMessage(message, record) {
  const base = coerceString(message);
  const block = formatConsentBlock(record);
  if (!block) return base;
  return base ? `${base}\n\n${block}` : block;
}

function pushCustomProp(list, field, value) {
  const key = coerceString(field);
  if (!key) return;
  if (value === null || value === undefined) return;
  const str = coerceString(value);
  if (!str) return;
  list.push({ field: key, valueString: str });
}

function buildConsentCustomProps(record, env) {
  const props = [];
  if (!record || !env) return props;

  pushCustomProp(props, env.KADDIO_CONSENT_STATUS_FIELD, 'TRUE');
  pushCustomProp(props, env.KADDIO_CONSENT_TIMESTAMP_FIELD, record.timestamp);
  pushCustomProp(props, env.KADDIO_CONSENT_SOURCE_FIELD, record.source);
  pushCustomProp(props, env.KADDIO_CONSENT_POLICY_URL_FIELD, record.policyUrl);
  pushCustomProp(props, env.KADDIO_CONSENT_POLICY_VERSION_FIELD, record.policyVersion);
  pushCustomProp(props, env.KADDIO_CONSENT_STATEMENT_VERSION_FIELD, record.statementVersion);
  pushCustomProp(props, env.KADDIO_CONSENT_METADATA_FIELD, safeStringify(record));

  return props;
}

async function sendKaddioLead(normalized, env, { receivedAt } = {}) {
  const result = {
    ok: false,
    clientId: null,
    updatedCustomProperties: false,
    warning: null
  };

  if (!env?.KADDIO_GRAPHQL_URL || !env?.KADDIO_API_TOKEN) {
    result.warning = 'Kaddio configuration missing';
    return result;
  }

  const consentRecord = buildConsentRecord(normalized, receivedAt);
  const message = appendConsentToMessage(normalized.description || 'Website enquiry', consentRecord);
  const clientInput = {
    firstname: normalized.firstname,
    lastname: normalized.lastname,
    email: normalized.email,
    notification: message || 'Website enquiry',
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
      result.warning = createResponse.errors.map(err => err.message).join('; ') || 'Kaddio rejected the request';
      return result;
    }

    const clientId = createResponse.data?.createClient || null;
    if (!clientId) {
      result.warning = 'Kaddio did not return a client id';
      return result;
    }

    result.ok = true;
    result.clientId = clientId;
    result.updatedCustomProperties = true;

    const warnings = [];
    const customProps = [
      { field: 'Reason_Field', valueString: message }
    ];

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
        warnings.push(messageText || 'Client created but custom field not updated');
        result.updatedCustomProperties = false;
      }
    } catch (err) {
      warnings.push(err?.message || 'Client created; custom field update failed');
      result.updatedCustomProperties = false;
    }

    // Best-effort: record explicit consent in dedicated fields if configured.
    const consentProps = buildConsentCustomProps(consentRecord, env);
    if (consentProps.length) {
      try {
        const consentUpdateResponse = await callKaddio({
          query: UPDATE_USER_MUTATION,
          variables: {
            userId: clientId,
            customProperties: consentProps
          },
          env
        });
        if (consentUpdateResponse.errors?.length) {
          const messageText = consentUpdateResponse.errors.map(err => err.message).join('; ');
          warnings.push(messageText || 'Consent fields could not be updated');
        }
      } catch (err) {
        warnings.push(err?.message || 'Consent fields could not be updated');
      }
    }

    if (warnings.length) {
      result.warning = warnings.join(' | ');
    }
  } catch (error) {
    result.warning = error?.message || 'Failed to reach Kaddio';
  }

  return result;
}

async function sendZohoLeadSafe(normalized) {
  try {
    await sendZohoLead(normalized);
    return { ok: true, warning: null };
  } catch (err) {
    return { ok: false, warning: err?.message || 'Zoho lead submission failed' };
  }
}

function buildZohoParams(normalized) {
  const params = new URLSearchParams();
  Object.entries(ZOHO_WEBTOLEAD_FIELDS).forEach(([key, value]) => {
    params.set(key, value || '');
  });

  // Privacy boundary:
  // Zoho receives identity only (name + email), while detailed context stays in Kaddio.
  params.set('First Name', normalized.firstname || '');
  params.set('Last Name', normalized.lastname || '');
  params.set('Email', normalized.email || '');
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
