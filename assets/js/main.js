(function(){
  // ----- Config -----
  const DURATION_MS = 1200;           // << make this bigger for slower scroll
  const HEADER = document.querySelector('header.site-header');
  const OFFSET = HEADER ? HEADER.offsetHeight : 72;
  const DOC_LANG = ((document.documentElement && document.documentElement.lang) || '').toLowerCase();
  const IS_EN = DOC_LANG.startsWith('en') || window.location.pathname.startsWith('/en/');

  function resolveLocale(form){
    const formLocale = ((form && form.dataset && form.dataset.locale) || '').toLowerCase();
    if (formLocale) return formLocale;
    return IS_EN ? 'en' : 'sv';
  }

  // ----- Geo gating (EU/UK only; applies to screening submissions) -----
  const GEO_ENDPOINT = '/api/geo';
  const GEO_CACHE_KEY = 'rk_geo_gate_v1';
  const GEO_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
  const geoGate = {
    allowed: false,
    country: '',
    resolved: false
  };

  function safeJsonParse(raw){
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (_err) {
      return null;
    }
  }

  function readGeoCache(){
    try {
      const stored = safeJsonParse(sessionStorage.getItem(GEO_CACHE_KEY));
      if (!stored || typeof stored.timestamp !== 'number') return null;
      if (Date.now() - stored.timestamp > GEO_CACHE_TTL_MS) return null;
      return stored;
    } catch (_err) {
      return null;
    }
  }

  function writeGeoCache({ allowed, country } = {}){
    try {
      sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify({
        allowed: allowed === true,
        country: country || '',
        timestamp: Date.now()
      }));
    } catch (_err) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }

  function applyGeoGateClasses(){
    const html = document.documentElement;
    if (!html) return;
    html.classList.remove('rk-pii-pending');
    html.classList.toggle('rk-pii-allowed', geoGate.allowed === true);
    html.classList.toggle('rk-pii-blocked', geoGate.allowed !== true);
  }

  function setGeoGate({ allowed, country } = {}){
    geoGate.allowed = allowed === true;
    geoGate.country = String(country || '').trim().toUpperCase();
    geoGate.resolved = true;
    writeGeoCache({ allowed: geoGate.allowed, country: geoGate.country });
    applyGeoGateClasses();
  }

  function isPiiAllowed(){
    return geoGate.allowed === true;
  }

  async function resolveGeoGate(){
    const cached = readGeoCache();
    if (cached) {
      setGeoGate({ allowed: cached.allowed, country: cached.country });
      return geoGate;
    }
    try {
      const res = await fetch(GEO_ENDPOINT, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });
      const data = await res.json().catch(() => null);
      setGeoGate({
        allowed: !!(data && data.allowed),
        country: data && data.country ? data.country : ''
      });
    } catch (_err) {
      // Safe default: block PII collection when we cannot determine geography.
      setGeoGate({ allowed: false, country: '' });
    }
    return geoGate;
  }

  const geoGateReady = resolveGeoGate();

  // ----- Smooth scroll (custom duration) -----
  function easeInOutCubic(t){ return t<0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
  function smoothScrollTo(yTarget){
    const startY = window.scrollY || window.pageYOffset;
    const dist = yTarget - startY;
    const start = performance.now();
    function step(now){
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = easeInOutCubic(t);
      window.scrollTo(0, startY + dist * eased);
      if(t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Intercept nav anchor clicks
  const links = Array.from(document.querySelectorAll('a[href^="#"]'));
  links.forEach(a=>{
    a.addEventListener('click', function(e){
      const hash = this.getAttribute('href');
      if(!hash || hash === '#') return;
      const target = hash === '#top' ? null : document.querySelector(hash);
      if(!target && hash !== '#top') return; // no target, bail to default
      e.preventDefault();
      const targetY = hash === '#top' ? 0 : (target.getBoundingClientRect().top + window.pageYOffset - OFFSET);
      smoothScrollTo(targetY);
      history.replaceState(null, '', hash); // update URL hash
    });
  });

  // ----- Active link highlight while scrolling -----
  const sectionLinks = links.filter(a => a.hash && a.hash !== '#top' && document.querySelector(a.hash));
  const sections = sectionLinks.map(a => document.querySelector(a.hash));
  const observer = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      const i = sections.indexOf(entry.target);
      if(i>=0){
        const a = sectionLinks[i];
        if(entry.isIntersecting){ a.classList.add('active'); }
        else { a.classList.remove('active'); }
      }
    });
  }, { rootMargin: "-60% 0px -35% 0px", threshold: 0.01 });
  sections.forEach(el=>observer.observe(el));

  // ----- Mobile Menu Toggle -----
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  
  if (mobileMenuToggle && mobileNav) {
    mobileMenuToggle.addEventListener('click', function() {
      const isOpen = mobileNav.classList.contains('show');
      
      if (isOpen) {
        // Close menu
        mobileNav.classList.remove('show');
        // Reset hamburger icon
        const spans = this.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      } else {
        // Open menu
        mobileNav.classList.add('show');
        // Animate hamburger to X
        const spans = this.querySelectorAll('span');
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
      }
    });
    
    // Close mobile menu when clicking on links
    const mobileLinks = mobileNav.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', function() {
        mobileNav.classList.remove('show');
        const spans = mobileMenuToggle.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      });
    });
  }

  // ----- Hydrate email links (avoid Cloudflare rewriting) -----
  const emailLinks = document.querySelectorAll('[data-email-user][data-email-domain]');
  emailLinks.forEach(link => {
    const user = link.dataset.emailUser;
    const domain = link.dataset.emailDomain;
    if (!user || !domain) return;
    const email = `${user}@${domain}`;
    link.href = `mailto:${email}`;
    if (!link.dataset.emailPreserveText) {
      link.textContent = email;
    }
  });

  // ----- Screening Test Logic (ADHD + Autism) -----
function initScreeningForm({
  formId,
  totalQuestions,
  scoreBoxId,
  scoreValueId,
  interpretationId,
  ranges,
  defaultInterpretation,
  gateWithLeadForm = true,
  onLeadRequired,
  scoreCalculator,
  buildInterpretation,
  metaUpdater,
  testName,
  transformValue,
  onCompleted
}) {
    const form = document.getElementById(formId);
    if (!form) return;

    const scoreBox = document.getElementById(scoreBoxId);
    const scoreValue = document.getElementById(scoreValueId);
    const interpretationEl = document.getElementById(interpretationId);
    const resetButton = form.querySelector('.adhd-screening__reset');
    const getFormLocale = () => resolveLocale(form);
    let hideTimeout = null;

    function getDefaultInterpretation(locale) {
      if (typeof defaultInterpretation === 'function') {
        return defaultInterpretation(locale);
      }
      if (defaultInterpretation && typeof defaultInterpretation === 'object') {
        return defaultInterpretation[locale] || defaultInterpretation.en || defaultInterpretation.sv || '';
      }
      return defaultInterpretation || '';
    }

    function getRanges(locale) {
      if (typeof ranges === 'function') {
        return ranges(locale) || [];
      }
      return ranges || [];
    }

    function removeInterpretationClasses() {
      if (!interpretationEl) return;
      const baseClass = 'adhd-score__interpretation';
      interpretationEl.className = interpretationEl.className
        .split(' ')
        .filter(cls => cls === baseClass)
        .join(' ') || baseClass;
    }

    function showScoreBox() {
      if (!scoreBox) return;
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      scoreBox.hidden = false;
      requestAnimationFrame(() => {
        scoreBox.dataset.state = 'visible';
      });
    }

    function hideScoreBox() {
      if (!scoreBox) return;
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      scoreBox.removeAttribute('data-state');
      hideTimeout = setTimeout(() => {
        scoreBox.hidden = true;
        hideTimeout = null;
      }, 350);
    }

    function updateScoreDisplay(score, interpretationObj, locale) {
      if (!scoreBox || !scoreValue || !interpretationEl) return;
      const activeLocale = locale || getFormLocale();
      const activeRanges = getRanges(activeLocale);
      scoreValue.textContent = String(score);
      removeInterpretationClasses();
      const match = interpretationObj || activeRanges.find(range => score <= range.max) || activeRanges[activeRanges.length - 1];
      interpretationEl.textContent = (match && match.text) ? match.text : getDefaultInterpretation(activeLocale);
      if (match && match.className) {
        interpretationEl.classList.add(match.className);
      }
    }

    function getInterpretation(score, locale) {
      const numericScore = (score && typeof score === 'object' && typeof score.total !== 'undefined')
        ? Number(score.total)
        : Number(score);
      const safeScore = Number.isFinite(numericScore) ? numericScore : 0;
      const activeLocale = locale || getFormLocale();
      if (typeof buildInterpretation === 'function') {
        return buildInterpretation(safeScore, activeLocale);
      }
      const activeRanges = getRanges(activeLocale);
      return activeRanges.find(range => safeScore <= range.max) || activeRanges[activeRanges.length - 1];
    }

    function calculateScore() {
      const formData = new FormData(form);
      if (typeof scoreCalculator === 'function') {
        return scoreCalculator(formData, totalQuestions);
      }
      let total = 0;
      let answered = 0;
      for (let i = 1; i <= totalQuestions; i += 1) {
        const value = formData.get(`q${i}`);
        if (value !== null) {
          const numeric = transformValue ? transformValue(value, i) : Number(value);
          total += numeric;
          answered += 1;
        }
      }
      return { total, answered };
    }

    function collectAnswerDetails() {
      const answers = [];
      const questions = form.querySelectorAll('.adhd-question');
      questions.forEach((question, index) => {
        const promptEl = question.querySelector('.adhd-question__prompt');
        const prompt = ((promptEl && promptEl.textContent) || '').replace(/\s+/g, ' ').trim();
        const selected = question.querySelector('input[type="radio"]:checked');
        let answerText = '';
        if (selected) {
          const label = selected.closest('label');
          const textEl = label ? label.querySelector('span') : null;
          answerText = textEl ? textEl.textContent.trim() : selected.value;
        }
        answers.push({ number: index + 1, prompt, answer: answerText });
      });
      return answers;
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const scoreData = calculateScore();
      const { total, answered } = scoreData;
      if (answered === totalQuestions) {
        const locale = getFormLocale();
        const interpretation = getInterpretation(total, locale);
        const renderResult = () => {
          updateScoreDisplay(total, interpretation, locale);
          if (typeof metaUpdater === 'function') {
            metaUpdater({ ...scoreData, interpretation });
          }
          showScoreBox();
        };
        const payload = {
          testName,
          total: scoreData.total,
          answered: scoreData.answered,
          meta: scoreData.meta || {},
          interpretation: interpretation ? interpretation.text : '',
          answers: collectAnswerDetails(),
          locale,
          renderResult,
          onCompleted,
          form
        };

        const shouldGate = typeof gateWithLeadForm === 'function'
          ? gateWithLeadForm(payload, form)
          : gateWithLeadForm;

        if (shouldGate && typeof onLeadRequired === 'function') {
          onLeadRequired(payload);
        } else {
          renderResult();
          if (typeof onCompleted === 'function') {
            onCompleted(payload, form);
          }
        }
      }
    });

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        form.reset();
        if (scoreBox && interpretationEl) {
          scoreValue.textContent = '0';
          interpretationEl.textContent = getDefaultInterpretation(getFormLocale());
          removeInterpretationClasses();
          hideScoreBox();
        }
        if (typeof metaUpdater === 'function') {
          metaUpdater({ total: 0, answered: 0, meta: {} });
        }
      });
    }

    form.addEventListener('change', () => {
      if (!scoreBox || scoreBox.hasAttribute('hidden')) return;
      const scoreData = calculateScore();
      const { total, answered } = scoreData;
      if (answered === totalQuestions) {
        const locale = getFormLocale();
        const interpretation = getInterpretation(total, locale);
        updateScoreDisplay(total, interpretation, locale);
        if (typeof metaUpdater === 'function') {
          metaUpdater({ ...scoreData, interpretation });
        }
      }
    });
  }

  // ----- Kaddio form helpers -----
  const KADDIO_ENDPOINT = '/api/kaddio/contact';
  const SUBMITTING_ATTR = 'data-submitting';

  function toggleFormDisabled(form, disabled){
    form.setAttribute(SUBMITTING_ATTR, disabled ? 'true' : 'false');
    const controls = form.querySelectorAll('input, textarea, select, button');
    controls.forEach(ctrl => {
      if (disabled) {
        ctrl.setAttribute('disabled', 'true');
      } else {
        ctrl.removeAttribute('disabled');
      }
    });
  }

  function setFormStatus(form, message, type){
    const statusEl = form.querySelector('[data-form-status]');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    const normalizedType = (type || 'info').toLowerCase();
    statusEl.dataset.statusType = normalizedType;
    statusEl.classList.remove('form-status--success', 'form-status--error', 'form-status--info', 'is-visible');
    statusEl.classList.add('form-status--' + normalizedType, 'is-visible');
    statusEl.hidden = !message;
    if (!message) {
      statusEl.classList.remove('is-visible');
    }
  }

  function mergeMetadata(baseMeta, extraMeta){
    if (!extraMeta) return baseMeta;
    return { ...(baseMeta || {}), ...extraMeta };
  }

  const CONSENT_PURPOSE_ASSESSMENT = 'preliminary_assessment';
  const CONSENT_PURPOSE_CONTACT = 'contact_request';

  function getMetaContent(name){
    const el = document.querySelector(`meta[name="${name}"]`);
    return el ? String(el.getAttribute('content') || '').trim() : '';
  }

  function squashText(value){
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function buildConsentMetadata({
    screeningForm,
    testName,
    formContext,
    locale,
    checkboxName = 'consentAcknowledgement',
    purpose = CONSENT_PURPOSE_ASSESSMENT
  } = {}){
    if (!screeningForm) return null;
    const checkbox = screeningForm.querySelector(`input[name="${checkboxName}"]`);
    const status = !!(checkbox && checkbox.checked);
    const label = checkbox ? checkbox.closest('label') : null;
    const statement = label ? squashText(label.textContent) : '';
    const linkEls = label ? Array.from(label.querySelectorAll('a.privacy-link')) : [];
    const policyUrl = linkEls[0] ? squashText(linkEls[0].getAttribute('href')) : '';
    const termsUrl = linkEls[1] ? squashText(linkEls[1].getAttribute('href')) : '';
    const policyVersion = getMetaContent('rk-privacy-policy-version');
    const statementVersion = getMetaContent('rk-consent-statement-version');
    const resolvedLocale = (locale || resolveLocale(screeningForm) || (IS_EN ? 'en' : 'sv')).toLowerCase();
    const source = formContext
      ? (testName ? `Web Form: ${formContext} (${testName})` : `Web Form: ${formContext}`)
      : (testName ? `Web Form: ${testName}` : 'Web Form');

    return {
      status,
      purpose,
      source,
      locale: resolvedLocale,
      policyUrl: policyUrl || undefined,
      termsUrl: termsUrl || undefined,
      policyVersion: policyVersion || undefined,
      statementVersion: statementVersion || undefined,
      // Store the exact consent copy shown to the user (trimmed). Keep it short to avoid payload bloat.
      statement: statement ? statement.slice(0, 800) : undefined
    };
  }

  function buildContactPayload(form){
    const formData = new FormData(form);
    const firstName = (formData.get('firstName') || '').trim();
    const lastName = (formData.get('lastName') || '').trim();
    const fullNameField = (formData.get('fullName') || '').trim();
    const nameSuffix = (formData.get('nameSuffix') || form.dataset.nameSuffix || '').trim();
    const appendSuffix = (value, suffix) => {
      if (!suffix) return value;
      if (!value) return suffix;
      const normalized = value.trim();
      const target = suffix.trim();
      if (!target) return normalized;
      if (normalized.toLowerCase().endsWith(target.toLowerCase())) {
        return normalized;
      }
      return `${normalized} ${target}`.trim();
    };
    const lastNameWithSuffix = appendSuffix(lastName, nameSuffix);
    const fullNameSeed = fullNameField || [firstName, lastNameWithSuffix].filter(Boolean).join(' ');
    const fullName = appendSuffix(fullNameSeed, nameSuffix);
    // Accept both "email" and legacy "Email" field names to avoid missed submissions.
    const email = (formData.get('email') || formData.get('Email') || '').trim();
    const description = (formData.get('description') || formData.get('message') || '').trim();
    const leadSource = (formData.get('leadSource') || '').trim();
    const ratingRaw = formData.get('rating');
    const baseMetadata = {
      path: window.location.pathname,
      formContext: form.dataset.formContext || form.dataset.kaddioForm || null
    };
    const policyAck = form.querySelector('input[name="policyAcknowledgement"]');
    if (policyAck) {
      baseMetadata.consentRequired = true;
      baseMetadata.consent = buildConsentMetadata({
        screeningForm: form,
        formContext: baseMetadata.formContext,
        locale: resolveLocale(form),
        checkboxName: 'policyAcknowledgement',
        purpose: CONSENT_PURPOSE_CONTACT
      });
    }
    const payload = {
      fullName,
      email,
      description,
      leadSource: leadSource || undefined,
      metadata: baseMetadata
    };
    if (ratingRaw !== null && ratingRaw !== '') {
      payload.rating = Number(ratingRaw);
    }
    return payload;
  }

  async function postToBackend(payload){
    const response = await fetch(KADDIO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    let body = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await response.json().catch(() => null);
    }
    if (!response.ok) {
      const message = (body && (body.error || body.message)) || 'Could not submit the form just now.';
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return body;
  }

  function bindKaddioForm(form, { augmentPayload, onSuccess } = {}){
    if (!form) return;
    // Some pages include an inline fallback handler; avoid double-submitting to Kaddio.
    if (form.dataset.kaddioInlineBound === 'true') return;
    if (form.dataset.kaddioBound === 'true') return;
    form.dataset.kaddioBound = 'true';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (typeof form.reportValidity === 'function') {
        if (!form.reportValidity()) return;
      } else if (typeof form.checkValidity === 'function') {
        if (!form.checkValidity()) return;
      }
      const thankYou = form.querySelector('[data-thank-you]');
      if (thankYou) {
        thankYou.hidden = true;
      }
      setFormStatus(form, form.dataset.sendingMessage || 'Skickar...', 'info');

      try {
        const basePayload = buildContactPayload(form);
        if (!basePayload.email) {
          const missingEmailCopy = form.dataset.missingEmailMessage
            || (IS_EN ? 'Please add your email before submitting.' : 'Lägg till din e-post innan du skickar.');
          setFormStatus(form, missingEmailCopy, 'error');
          return;
        }
        toggleFormDisabled(form, true);
        const extra = typeof augmentPayload === 'function' ? augmentPayload(basePayload) : null;
        const merged = { ...basePayload, ...(extra || {}) };
        merged.metadata = mergeMetadata(basePayload.metadata, extra && extra.metadata);
        await postToBackend(merged);
        if (thankYou) {
          thankYou.hidden = false;
        }
        const successCopy = form.dataset.successMessage || 'Tack! Vi hör av oss snart.';
        setFormStatus(form, successCopy, 'success');
        form.reset();
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
        form.dispatchEvent(new CustomEvent('kaddio:success', {
          detail: { payload: merged },
          bubbles: true
        }));
        const redirectUrl = form.dataset.redirectUrl;
        if (redirectUrl) {
          window.setTimeout(() => {
            window.location.assign(redirectUrl);
          }, 400);
        }
      } catch (error) {
        const busyMessage = form.dataset.rateLimitMessage
          || (IS_EN
            ? 'We are handling many requests right now. Please try again in a moment.'
            : 'Vi hanterar många förfrågningar just nu. Försök igen om en stund.');
        const fallbackError = form.dataset.errorMessage
          || (IS_EN
            ? 'We could not send your request. Please try again.'
            : 'Vi kunde inte skicka din förfrågan. Försök igen.');
        const status = error && error.status;
        const message = error && error.message;
        const msg = status === 429
          ? busyMessage
          : (message || fallbackError);
        setFormStatus(form, msg, 'error');
      } finally {
        toggleFormDisabled(form, false);
      }
    });
  }

  // ----- Zoho CRM (WebToLead) bridge -----
  const ZOHO_WEBTOLEAD_ENDPOINT = 'https://crm.zoho.eu/crm/WebToLeadForm';
  const ZOHO_WEBTOLEAD_FIELDS = {
    xnQsjsdp: 'fd28655d146975d2aa0afe4be1e837490b74bd86670e415c1fbd1db2ca1ee9c3',
    zc_gad: '',
    xmIwtLD: 'fdc584738800610bea5facb3757dea684c5df902d73ceb78d6df3492192a2d6839c8a59ba489c3762746fdcd6bd54aa5',
    actionType: 'TGVhZHM=',
    returnURL: 'https://riktapsykiatri.se',
    aG9uZXlwb3Q: ''
  };
  const ZOHO_FALLBACK_NAME = 'Customer';
  const ZOHO_FALLBACK_EMAIL = 'customer@gmail.com';
  let zohoForm = null;
  let zohoFields = null;

  function ensureZohoForm(){
    if (zohoForm || !document.body) return;
    const iframe = document.createElement('iframe');
    iframe.name = 'zoho-webtolead-frame';
    iframe.title = '';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    zohoForm = document.createElement('form');
    zohoForm.method = 'POST';
    zohoForm.action = ZOHO_WEBTOLEAD_ENDPOINT;
    zohoForm.acceptCharset = 'UTF-8';
    zohoForm.target = iframe.name;
    zohoForm.style.display = 'none';
    document.body.appendChild(zohoForm);

    zohoFields = {};
    const addField = (name, value) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value || '';
      zohoForm.appendChild(input);
      zohoFields[name] = input;
    };
    Object.entries(ZOHO_WEBTOLEAD_FIELDS).forEach(([name, value]) => addField(name, value));
    addField('First Name', '');
    addField('Last Name', '');
    addField('Email', '');
    addField('Lead Source', '');
  }

  function readFormValue(form, selectors){
    if (!form) return '';
    for (const selector of selectors) {
      const field = form.querySelector(selector);
      if (field && typeof field.value === 'string' && field.value.trim()) {
        return field.value.trim();
      }
    }
    return '';
  }

  function splitName(fullName){
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  function buildZohoLeadData(form, payload){
    const payloadFullName = ((payload && payload.fullName) || '').trim();
    const payloadEmail = ((payload && payload.email) || '').trim();
    const payloadLeadSource = ((payload && payload.leadSource) || '').trim();

    let firstName = readFormValue(form, [
      'input[name="firstName"]',
      'input[name="First Name"]',
      '#First_Name'
    ]);
    let lastName = readFormValue(form, [
      'input[name="lastName"]',
      'input[name="Last Name"]',
      '#Last_Name'
    ]);
    const formFullName = readFormValue(form, [
      'input[name="fullName"]',
      'input[name="Full Name"]'
    ]);
    const formEmail = readFormValue(form, [
      'input[name="email"]',
      'input[name="Email"]',
      '#Email'
    ]);
    const fullName = payloadFullName || formFullName || [firstName, lastName].filter(Boolean).join(' ');
    if ((!firstName || !lastName) && fullName) {
      const parsed = splitName(fullName);
      if (!firstName) firstName = parsed.firstName;
      if (!lastName) lastName = parsed.lastName;
    }

    if (!firstName) firstName = ZOHO_FALLBACK_NAME;
    if (!lastName) lastName = ZOHO_FALLBACK_NAME;

    const email = payloadEmail || formEmail || ZOHO_FALLBACK_EMAIL;
    const leadSource = payloadLeadSource;

    return { firstName, lastName, email, leadSource };
  }

  function sendZohoLead({ form, payload } = {}){
    try {
      ensureZohoForm();
      if (!zohoForm || !zohoFields) return;
      const data = buildZohoLeadData(form, payload);
      zohoFields['First Name'].value = data.firstName;
      zohoFields['Last Name'].value = data.lastName;
      zohoFields['Email'].value = data.email;
      zohoFields['Lead Source'].value = data.leadSource || '';
      zohoForm.submit();
    } catch (_err) {
      // Best-effort only: avoid interfering with primary form submission.
    }
  }

  async function sendScreeningToKaddio({ form, payload, formContext, leadSourceOverride, statusTarget }){
    if (!form) return;
    const firstNameInput = form.querySelector('input[name="firstName"]');
    const lastNameInput = form.querySelector('input[name="lastName"]');
    const emailInput = form.querySelector('input[name="email"]');
    const firstName = ((firstNameInput && firstNameInput.value) || '').trim();
    const lastName = ((lastNameInput && lastNameInput.value) || '').trim();
    const email = ((emailInput && emailInput.value) || '').trim();
    const statusEl = statusTarget || form.querySelector('[data-form-status]');
    const lang = ((document.documentElement && document.documentElement.lang) || 'sv').toLowerCase();
    const isEn = lang.startsWith('en');

    const setStatus = (msg, type = 'info') => {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.dataset.statusType = type;
      statusEl.hidden = !msg;
    };

    if (!email) {
      setStatus(isEn ? 'Please add your email.' : 'Lägg till din e-post.', 'error');
      return;
    }
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || firstName || lastName || '';
    if (!fullName) {
      setStatus(isEn ? 'Please add your name.' : 'Lägg till ditt namn.', 'error');
      return;
    }

    const lines = [];
    if (payload && payload.testName) lines.push(`Test: ${payload.testName}`);
    lines.push(`Total: ${payload.total || 0}`);
    if (payload && payload.interpretation) lines.push(`Tolkning: ${payload.interpretation}`);
    lines.push('Svar:');
    ((payload && payload.answers) || []).forEach(item => {
      lines.push(`${item.number}. ${item.prompt} — ${item.answer || 'Ej angivet'}`);
    });
    const description = lines.join('\n');

    const body = {
      fullName,
      email,
      description,
      leadSource: leadSourceOverride || 'Procrastination Test',
      metadata: {
        path: window.location.pathname,
        formContext: formContext || 'procrastination-test'
      }
    };

    try {
      setStatus(isEn ? 'Sending your results…' : 'Skickar dina resultat…', 'info');
      await postToBackend(body);
      setStatus(isEn ? 'Thank you! We’ll contact you with your results.' : 'Tack! Vi kontaktar dig med dina resultat.', 'success');
    } catch (err) {
      const status = err && err.status;
      const message = err && err.message;
      const msg = status === 429
        ? (isEn ? 'We are handling many requests right now. Please try again shortly.' : 'Vi hanterar många förfrågningar just nu. Försök igen om en stund.')
        : (message || (isEn ? 'Could not submit right now.' : 'Det gick inte att skicka just nu.'));
      setStatus(msg, 'error');
    }
  }

  const contactForms = document.querySelectorAll('[data-kaddio-form="contact"]');
  contactForms.forEach(form => bindKaddioForm(form));

  // ----- Lead capture modal (Kaddio) -----
  const leadModal = document.getElementById('adhd-lead-modal');
  const leadForm = document.getElementById('kaddio-lead-form');
  const leadDescription = document.getElementById('adhd-lead-description');
  const leadSource = document.getElementById('adhd-lead-source');
  const leadRating = document.getElementById('adhd-lead-rating');
  const leadSubmitButton = document.getElementById('adhd-lead-submit');
  const leadCloseTriggers = document.querySelectorAll('[data-close-lead]');
  let leadResultPayload = null;

  function buildLeadDescription(result) {
    if (!result) return '';
    const locale = (((result && result.locale) || (IS_EN ? 'en' : 'sv'))).toLowerCase();
    const isEn = locale.startsWith('en');
    const lines = [
      result.testName || (isEn ? 'Screening results' : 'Screeningresultat'),
      `${isEn ? 'Total score' : 'Totalpoäng'}: ${result.total}`,
      `${isEn ? 'Interpretation' : 'Tolkning'}: ${result.interpretation}`,
      isEn ? 'Answers:' : 'Svar:'
    ];
    (result.answers || []).forEach(item => {
      const prompt = item.prompt || '';
      const answer = item.answer || (isEn ? 'Not provided' : 'Ej angivet');
      lines.push(`${item.number}. ${prompt} — ${answer}`);
    });
    if (result.meta && result.meta.screenResult) {
      lines.push(`${isEn ? 'MDQ screen result' : 'MDQ-screenresultat'}: ${result.meta.screenResult}`);
    }
    if (result.meta && typeof result.meta.q1YesCount !== 'undefined') {
      lines.push(`${isEn ? 'Question 1 YES count' : 'Antal JA i fråga 1'}: ${result.meta.q1YesCount}`);
    }
    if (result.meta && result.meta.functionalDifficulty) {
      lines.push(`${isEn ? 'Functional difficulty' : 'Funktionell svårighet'}: ${result.meta.functionalDifficulty}`);
    }
    return lines.join('\n');
  }

  function openLeadModal(result) {
    // Outside EU/UK we do not collect or submit screening (health) data. Still show the local score.
    if (!isPiiAllowed()) {
      if (result && typeof result.renderResult === 'function') {
        result.renderResult();
        if (typeof result.onCompleted === 'function') {
          result.onCompleted(result, result.form);
        }
      }
      return;
    }
    if (!leadModal || !leadForm) return;
    setFormStatus(leadForm, '', 'info');
    leadResultPayload = result;
    if (leadSource) {
      const derivedSource = (((result && result.testName) || '').toLowerCase().includes('autism'))
        ? 'Autism Investigation'
        : 'ADHD Investigation';
      if (!leadSource.value || leadSource.value === 'ADHD Investigation') {
        leadSource.value = derivedSource;
      }
    }
    if (leadRating) {
      const ratingValue = Math.min(result.total || 0, 50);
      leadRating.value = ratingValue;
    }
    if (leadDescription) {
      leadDescription.value = buildLeadDescription(result);
    }
    leadModal.removeAttribute('hidden');
    document.body.classList.add('lead-modal-open');
    const emailInput = leadForm.querySelector('#Email, #lead-email');
    if (emailInput && typeof emailInput.focus === 'function') {
      emailInput.focus({ preventScroll: true });
    }
  }

  function closeLeadModal() {
    if (!leadModal) return;
    leadModal.setAttribute('hidden', true);
    document.body.classList.remove('lead-modal-open');
    if (leadSubmitButton) {
      leadSubmitButton.removeAttribute('disabled');
    }
  }

  function handleLeadSuccess() {
    closeLeadModal();
    if (leadResultPayload && typeof leadResultPayload.renderResult === 'function') {
      leadResultPayload.renderResult();
      if (typeof leadResultPayload.onCompleted === 'function') {
        leadResultPayload.onCompleted(leadResultPayload, leadResultPayload.form);
      }
      const scoreBox = document.getElementById('adhd-score');
      if (scoreBox) {
        const targetY = scoreBox.getBoundingClientRect().top + window.pageYOffset - OFFSET;
        smoothScrollTo(targetY);
      }
      leadResultPayload = null;
    }
  }

  leadCloseTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      closeLeadModal();
    });
  });

  if (leadForm) {
    geoGateReady.then(() => {
      if (!isPiiAllowed()) return;
      bindKaddioForm(leadForm, {
        augmentPayload(basePayload){
          if (!leadResultPayload) {
            const lang = ((document.documentElement && document.documentElement.lang) || 'sv').toLowerCase();
            const message = lang.startsWith('en')
              ? 'Please complete the screening before sending.'
              : 'Slutför självtestet innan du skickar.';
            throw new Error(message);
          }
          const lang = ((document.documentElement && document.documentElement.lang) || 'sv').toLowerCase();
          const screeningMeta = {
            testName: leadResultPayload.testName,
            total: leadResultPayload.total,
            interpretation: leadResultPayload.interpretation,
            answers: leadResultPayload.answers
          };
          const consentMeta = buildConsentMetadata({
            // Consent checkbox lives in the lead modal (same place as personal details).
            screeningForm: leadForm,
            testName: leadResultPayload.testName,
            formContext: basePayload && basePayload.metadata ? basePayload.metadata.formContext : '',
            locale: leadResultPayload.locale
          });
          if (!consentMeta || consentMeta.status !== true) {
            const msg = lang.startsWith('en')
              ? 'Please confirm the consent checkbox before sending your results.'
              : 'Bekräfta samtycke-rutan innan du skickar dina resultat.';
            throw new Error(msg);
          }
          const derivedDescription = (leadDescription && leadDescription.value)
            || buildLeadDescription(leadResultPayload)
            || basePayload.description;
          return {
            description: derivedDescription,
            leadSource: (((leadSource && leadSource.value) || basePayload.leadSource || 'Screening form')).trim(),
            metadata: mergeMetadata(basePayload.metadata, {
              screening: screeningMeta,
              consent: consentMeta
            })
          };
        },
        onSuccess: handleLeadSuccess
      });
    });
  }

  initScreeningForm({
    formId: 'adhd-screening-form',
    totalQuestions: 12,
    scoreBoxId: 'adhd-score',
    scoreValueId: 'adhd-score-value',
    interpretationId: 'adhd-score-interpretation',
    defaultInterpretation: {
      en: 'Answer all questions to see your R-ARS-12 score.',
      sv: 'Besvara alla frågor för att se din R-ARS-12 poäng.'
    },
    ranges: (locale) => (locale === 'en'
      ? [
          { max: 27, text: '12–27: low level of attention/self-regulation difficulties.' },
          { max: 41, text: '28–41: moderate level — can affect daily life. Planning support or coaching may help.', className: 'is-amber' },
          { max: Infinity, text: '42–60: high level. We recommend further evaluation or a neuropsychiatric assessment.', className: 'is-red' }
        ]
      : [
          { max: 27, text: '12–27: låg grad av uppmärksamhets-/regleringssvårigheter.' },
          { max: 41, text: '28–41: måttlig nivå – kan påverka vardagen. Planeringsstöd eller coachning kan hjälpa.', className: 'is-amber' },
          { max: Infinity, text: '42–60: hög nivå. Rekommenderar vidare bedömning eller neuropsykiatrisk utredning.', className: 'is-red' }
        ]),
    gateWithLeadForm: () => isPiiAllowed(),
    onLeadRequired: openLeadModal,
    testName: 'Attention & Regulation Scale (R-ARS-12)'
  });

  initScreeningForm({
    formId: 'autism-screening-form',
    totalQuestions: 10,
    scoreBoxId: 'autism-score',
    scoreValueId: 'autism-score-value',
    interpretationId: 'autism-score-interpretation',
    defaultInterpretation: {
      en: 'Answer all questions to see your AQ-10 score.',
      sv: 'Besvara alla frågor för att se din AQ-10 poäng.'
    },
    ranges: (locale) => (locale === 'en'
      ? [
          { max: 5, text: '0–5 points: no clear indication in this screening. Seek care if you still experience difficulties.' },
          { max: Infinity, text: '6–10 points: elevated likelihood. We recommend a professional autism assessment for a clear evaluation.', className: 'is-amber' }
        ]
      : [
          { max: 5, text: '0–5 poäng: inget tydligt utslag i denna screening. Sök vård om du ändå upplever svårigheter.' },
          { max: Infinity, text: '6–10 poäng: förhöjd sannolikhet. Rekommenderar professionell autismutredning för säker bedömning.', className: 'is-amber' }
        ]),
    gateWithLeadForm: () => isPiiAllowed(),
    onLeadRequired: openLeadModal,
    testName: 'Autism Screening (AQ-10)'
  });

  initScreeningForm({
    formId: 'autism-child-screening-form',
    totalQuestions: 10,
    scoreBoxId: 'autism-child-score',
    scoreValueId: 'autism-child-score-value',
    interpretationId: 'autism-child-score-interpretation',
    defaultInterpretation: {
      sv: 'Besvara alla frågor för att se din AQ-10 (barn) poäng.',
      en: 'Answer all questions to see your AQ-10 (child) score.'
    },
    ranges: (locale) => (locale === 'sv'
      ? [
          { max: 5, text: '0–5 poäng: inget tydligt utslag i denna screening. Sök vård om du ändå upplever svårigheter.' },
          { max: Infinity, text: '6–10 poäng: förhöjd sannolikhet. Rekommenderar professionell bedömning.', className: 'is-amber' }
        ]
      : [
          { max: 5, text: '0–5 points: no clear indication in this screening. Seek care if you still have concerns.' },
          { max: Infinity, text: '6–10 points: elevated likelihood. We recommend a professional assessment.', className: 'is-amber' }
        ]),
    gateWithLeadForm: () => isPiiAllowed(),
    onLeadRequired: openLeadModal,
    testName: 'AQ-10 (Barnversionen)'
  });

  initScreeningForm({
    formId: 'add-screening-form',
    totalQuestions: 9,
    scoreBoxId: 'add-score',
    scoreValueId: 'add-score-value',
    interpretationId: 'add-score-interpretation',
    defaultInterpretation: {
      en: 'Answer all questions to see your inattentive symptoms score.',
      sv: 'Besvara alla frågor för att se din ouppmärksamhetspoäng.'
    },
    ranges: (locale) => (locale === 'en'
      ? [
          { max: 20, text: '9–20: lower frequency of inattentive symptoms in this checklist.' },
          { max: 32, text: '21–32: moderate frequency. If this impacts daily life, consider a professional assessment.', className: 'is-amber' },
          { max: Infinity, text: '33–45: higher frequency. We recommend discussing these symptoms with a clinician.', className: 'is-red' }
        ]
      : [
          { max: 20, text: '9–20: lägre frekvens av ouppmärksamhetssymtom i denna checklista.' },
          { max: 32, text: '21–32: måttlig frekvens. Om det påverkar vardagen, överväg professionell bedömning.', className: 'is-amber' },
          { max: Infinity, text: '33–45: högre frekvens. Rekommenderar att diskutera symtomen med vårdpersonal.', className: 'is-red' }
        ]),
    gateWithLeadForm: () => isPiiAllowed(),
    onLeadRequired: openLeadModal,
    testName: 'ADD Inattentive Symptoms'
  });

  initScreeningForm({
    formId: 'procrastination-screening-form',
    totalQuestions: 15,
    scoreBoxId: 'procrastination-score',
    scoreValueId: 'procrastination-score-value',
    interpretationId: 'procrastination-score-interpretation',
    defaultInterpretation: {
      en: 'Answer all questions to see your GPS score.',
      sv: 'Besvara alla frågor för att se din GPS-poäng.'
    },
    ranges: (locale) => (locale === 'en'
      ? [
          { max: 35, text: '15–35: low level of procrastination. Keep the routines that work.' },
          { max: 50, text: '36–50: moderate level. Planning support, time blocking, or coaching may help.', className: 'is-amber' },
          { max: Infinity, text: '51–75: high level. We recommend targeted strategies and possibly NPF-focused coaching.', className: 'is-red' }
        ]
      : [
          { max: 35, text: '15–35: låg nivå av prokrastinering. Fortsätt med de rutiner som fungerar.' },
          { max: 50, text: '36–50: måttlig nivå. Du kan ha nytta av planeringsstöd, tidsblockering eller coachning.', className: 'is-amber' },
          { max: Infinity, text: '51–75: hög nivå. Rekommenderar riktade strategier och eventuell NPF-inriktad coaching.', className: 'is-red' }
        ]),
    transformValue(value, questionNumber){
      // Question 12 is reverse-scored (agreeing reduces procrastination score)
      if(questionNumber === 12){
        const num = Number(value);
        return 6 - num; // invert 1-5 to 5-1
      }
      return Number(value);
    },
    gateWithLeadForm: () => isPiiAllowed(),
    onLeadRequired: openLeadModal,
    testName: 'Procrastination Test (GPS)'
  });

  initScreeningForm({
    formId: 'gad7-screening-form',
    totalQuestions: 7,
    scoreBoxId: 'gad7-score',
    scoreValueId: 'gad7-score-value',
    interpretationId: 'gad7-score-interpretation',
    defaultInterpretation: {
      en: 'Answer all questions to see your GAD-7 score.',
      sv: 'Räkna samman poängen. Summa poäng:'
    },
    buildInterpretation(score, locale){
      const isSv = (locale || '').toLowerCase().startsWith('sv');
      if (score <= 4) return { text: isSv ? 'Minimal ångest' : 'Minimal anxiety' };
      if (score <= 9) return { text: isSv ? 'Lindrig ångest' : 'Mild anxiety' };
      if (score <= 14) return { text: isSv ? 'Måttlig ångest' : 'Moderate anxiety' };
      return { text: isSv ? 'Svår ångest' : 'Severe anxiety' };
    },
    scoreCalculator(formData){
      let total = 0;
      let answered = 0;
      for (let i = 1; i <= 7; i += 1) {
        const value = formData.get(`q${i}`);
        if (value !== null) {
          total += Number(value);
          answered += 1;
        }
      }
      return {
        total,
        answered,
        meta: {
          functionalDifficulty: formData.get('functional') || ''
        }
      };
    },
    gateWithLeadForm: () => isPiiAllowed(),
    onLeadRequired: openLeadModal,
    testName: 'GAD-7 Anxiety',
    onCompleted(payload, form){
      const resultsEl = document.getElementById('gad7-results');
      if (!resultsEl || !form) return;
      const formData = new FormData(form);
      const locale = ((payload && payload.locale) || '').toLowerCase();
      const isSv = locale.startsWith('sv');
      const questions = Array.from(form.querySelectorAll('.adhd-question'));
      const rows = questions.map((question, index) => {
        const promptEl = question.querySelector('.adhd-question__prompt');
        const prompt = ((promptEl && promptEl.textContent) || '').replace(/\s+/g, ' ').trim();
        const selected = question.querySelector('input[type=\"radio\"]:checked');
        const label = selected ? selected.closest('label') : null;
        const textEl = label ? label.querySelector('span') : null;
        const answerText = textEl ? textEl.textContent.trim() : '';
        const numeric = selected ? selected.value : '';
        return {
          number: index + 1,
          prompt,
          answerText,
          numeric
        };
      });
      const functionalAnswer = formData.get('functional') || '';
      const severity = payload && payload.interpretation ? payload.interpretation : '';
      const resultsLabel = isSv ? 'Resultat' : 'Results';
      const responseLabel = isSv ? 'Svar' : 'Response';
      const severityLabel = isSv ? 'Ångestnivå' : 'Severity';
      const functionalLabel = isSv ? 'Funktionspåverkan' : 'Functional difficulty';

      const listItems = rows.map(row => (
        `<li><strong>${row.number}. ${row.prompt}</strong><br>` +
        `${responseLabel}: ${row.answerText} (${row.numeric})</li>`
      )).join('');

      resultsEl.innerHTML =
        `<h3>${resultsLabel}</h3>` +
        `<ul>${listItems}</ul>` +
        `<p><strong>${severityLabel}:</strong> ${severity}</p>` +
        `<p><strong>${functionalLabel}:</strong> ${functionalAnswer}</p>`;
    }
  });

  (function initMdqForm(){
    const form = document.getElementById('mdq-screening-form');
    if (!form) return;
    const scoreBox = document.getElementById('mdq-score');
    const scoreValue = document.getElementById('mdq-score-value');
    const interpretationEl = document.getElementById('mdq-score-interpretation');
    const resultsEl = document.getElementById('mdq-results');
    const resetButton = form.querySelector('.adhd-screening__reset');
    const locale = ((form.dataset.locale || document.documentElement.lang || 'sv') || '').toLowerCase();
    const isSv = locale.startsWith('sv');
    const yesValue = isSv ? 'Ja' : 'Yes';
    const positiveImpactValues = isSv ? ['Problem', 'Allvarliga problem'] : ['Moderate problem', 'Serious problem'];
    const positiveLabel = isSv ? 'Positiv screening för bipolaritet' : 'Positive screen';
    const negativeLabel = isSv ? 'Negativ screening för bipolaritet' : 'Negative screen';

    function collectQ1Responses() {
      const items = [];
      for (let i = 1; i <= 13; i += 1) {
        const name = `q1_${i}`;
        const selected = form.querySelector(`input[name="${name}"]:checked`);
        const answer = selected ? selected.value : '';
        const promptEl = selected ? selected.closest('.adhd-question')?.querySelector('.adhd-question__prompt') : null;
        const prompt = promptEl ? promptEl.textContent.trim() : '';
        items.push({ number: i, prompt, answer });
      }
      return items;
    }

    function renderResults(result) {
      if (!scoreBox || !scoreValue || !interpretationEl || !resultsEl) return;
      scoreBox.hidden = false;
      scoreBox.dataset.state = 'visible';
      scoreValue.textContent = result.screenResult;
      interpretationEl.textContent = isSv
        ? 'Detta är ett screeningresultat och inte en diagnos.'
        : 'This is a screening result, not a diagnosis.';

      const q1Items = result.q1Items.map(item => (
        `<li><strong>${item.number}. ${item.prompt}</strong><br>` +
        `${isSv ? 'Svar' : 'Response'}: ${item.answer}</li>`
      )).join('');

      const resultsLabel = isSv ? 'Resultat' : 'Results';
      const q1CountLabel = isSv ? 'Antal Ja-svar i Fråga 1' : 'Question 1 YES count';
      const q2Label = isSv ? 'Svar på Fråga 2' : 'Question 2 response';
      const q3Label = isSv ? 'Svar på Fråga 3' : 'Question 3 response';

      resultsEl.innerHTML =
        `<h3>${resultsLabel}</h3>` +
        `<p><strong>${q1CountLabel}:</strong> ${result.q1YesCount}</p>` +
        `<ul>${q1Items}</ul>` +
        `<p><strong>${q2Label}:</strong> ${result.q2}</p>` +
        `<p><strong>${q3Label}:</strong> ${result.q3}</p>` +
        `<p><strong>${isSv ? 'Detta är ett screeningresultat och inte en diagnos.' : 'This is a screening result, not a diagnosis.'}</strong></p>`;
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const q1Items = collectQ1Responses();
      const q1YesCount = q1Items.filter(item => item.answer === yesValue).length;
      const q2 = (form.querySelector('input[name="q2"]:checked') || {}).value || '';
      const q3 = (form.querySelector('input[name="q3"]:checked') || {}).value || '';

      const positive = q1YesCount >= 7 && q2 === yesValue && positiveImpactValues.includes(q3);
      const screenResult = positive ? positiveLabel : negativeLabel;

      const resultPayload = {
        q1Items,
        q1YesCount,
        q2,
        q3,
        screenResult
      };

      const answers = [
        ...q1Items.map(item => ({ number: item.number, prompt: item.prompt, answer: item.answer })),
        { number: 14, prompt: isSv ? 'Fråga 2' : 'Question 2', answer: q2 },
        { number: 15, prompt: isSv ? 'Fråga 3' : 'Question 3', answer: q3 }
      ];

      const payload = {
        testName: 'MDQ Bipolar Screening',
        total: 0,
        answered: 2 + q1Items.length,
        meta: {
          q1YesCount,
          q2,
          q3,
          screenResult
        },
        interpretation: screenResult,
        answers,
        locale,
        renderResult: () => renderResults(resultPayload)
      };

      openLeadModal(payload);
    });

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        form.reset();
        if (scoreBox) {
          scoreBox.hidden = true;
          scoreBox.removeAttribute('data-state');
        }
        if (scoreValue) scoreValue.textContent = '-';
        if (interpretationEl) {
          interpretationEl.textContent = isSv
            ? 'Detta är ett screeningresultat och inte en diagnos.'
            : 'This is a screening result, not a diagnosis.';
        }
        if (resultsEl) resultsEl.innerHTML = '';
      });
    }
  })();

  // ----- Newsletter Popup -----
  (function initNewsletterPopup(){
    const DISABLE_POPUP = false;
    if (DISABLE_POPUP) return;

    const popup = document.getElementById('newsletter-popup');
    if (!popup) return;

    const SHOW_DELAY_MS = 10000;
    const langKey = IS_EN ? 'en' : 'sv';
    const STORAGE_KEY = `rk_newsletter_popup_${langKey}`;
    const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
    const FORCE_POPUP = new URLSearchParams(window.location.search).get('forcePopup') === '1';
    let openTimeout = null;
    let isOpen = false;
    let lastFocused = null;

    function now(){ return Date.now(); }

    function readState(){
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        return null;
      }
    }

    function writeState(reason){
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ reason, timestamp: now() }));
      } catch (err) {
        // ignore write errors (e.g. private mode)
      }
    }

    function shouldShow(){
      if (FORCE_POPUP) return true;
      const record = readState();
      if (!record || !record.timestamp) return true;
      return now() - record.timestamp > COOLDOWN_MS;
    }

    function focusables(){
      return Array.from(popup.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled') && isVisible(el));
    }

    function isVisible(el){
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }

    function openPopup(){
      if (isOpen) return;
      isOpen = true;
      lastFocused = document.activeElement;
      popup.dataset.popupState = 'visible';
      popup.removeAttribute('aria-hidden');
      document.body.classList.add('newsletter-popup--locked');
      const focusTarget = popup.querySelector('[data-popup-focus]') || focusables()[0];
      if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus({ preventScroll: true });
      }
      document.addEventListener('keydown', handleKeydown, true);
    }

    function closePopup(reason){
      if (!isOpen) return;
      popup.dataset.popupState = 'hidden';
      popup.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('newsletter-popup--locked');
      document.removeEventListener('keydown', handleKeydown, true);
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus({ preventScroll: true });
      }
      isOpen = false;
      if (reason) {
        writeState(reason);
      }
    }

    function handleKeydown(event){
      if (!isOpen) return;
      if (event.key === 'Escape'){
        event.preventDefault();
        closePopup('dismissed');
        return;
      }
      if (event.key === 'Tab'){
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey){
          if (document.activeElement === first){
            event.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last){
          event.preventDefault();
          first.focus();
        }
      }
    }

    function scheduleOpen(){
      if (!shouldShow()) return;
      openTimeout = window.setTimeout(() => {
        geoGateReady.then(() => {
          if (!isPiiAllowed()) return;
          openPopup();
        });
      }, SHOW_DELAY_MS);
    }

    const closeTriggers = popup.querySelectorAll('[data-popup-close]');
    closeTriggers.forEach(btn => btn.addEventListener('click', () => closePopup('dismissed')));

    const form = popup.querySelector('form');
    const isMultiStepSv = !IS_EN && popup.dataset.popupMultistep === 'true';

    if (isMultiStepSv && form) {
      const phaseNodes = Array.from(form.querySelectorAll('[data-phase]'));
      const phase2Groups = {
        adhd: form.querySelector('[data-phase2="adhd"]'),
        autism: form.querySelector('[data-phase2="autism"]')
      };
      const choiceButtons = form.querySelectorAll('[data-select]');
      const backButtons = form.querySelectorAll('[data-popup-back]');
      const complianceNote = popup.querySelector('.newsletter-popup__compliance');
      let currentPhase = 1;

      function setPhase(next){
        currentPhase = next;
        popup.dataset.currentPhase = String(next);
        phaseNodes.forEach(node => {
          const isTarget = Number(node.dataset.phase) === next;
          node.hidden = !isTarget;
        });
        if (complianceNote) {
          complianceNote.hidden = next === 2;
        }
        const focusTarget = phaseNodes.find(n => !n.hidden)?.querySelector('[data-popup-focus], .popup-choice, a.popup-choice, button.popup-choice');
        if (focusTarget && typeof focusTarget.focus === 'function') {
          focusTarget.focus({ preventScroll: true });
        }
      }

      function showPhase2(track){
        popup.dataset.selectedTrack = track;
        if (phase2Groups.adhd){
          const show = track === 'adhd';
          phase2Groups.adhd.hidden = !show;
          phase2Groups.adhd.style.display = show ? 'grid' : 'none';
          phase2Groups.adhd.setAttribute('aria-hidden', show ? 'false' : 'true');
        }
        if (phase2Groups.autism){
          const show = track === 'autism';
          phase2Groups.autism.hidden = !show;
          phase2Groups.autism.style.display = show ? 'grid' : 'none';
          phase2Groups.autism.setAttribute('aria-hidden', show ? 'false' : 'true');
        }
        setPhase(2);
      }

      choiceButtons.forEach(btn => {
        btn.addEventListener('click', () => showPhase2(btn.dataset.select));
      });
      backButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          popup.dataset.selectedTrack = '';
          setPhase(1);
        });
      });
      const finalLinks = form.querySelectorAll('[data-final]');
      finalLinks.forEach(link => {
        link.addEventListener('click', () => {
          writeState('submitted');
          closePopup('submitted');
        });
      });
      setPhase(1);
    } else if (form) {
      const handleSubmitted = () => {
        if (openTimeout) {
          clearTimeout(openTimeout);
          openTimeout = null;
        }
        closePopup('submitted');
      };
      form.addEventListener('kaddio:success', handleSubmitted);
    }

    scheduleOpen();
  })();

  // ----- Payment estimate calculator -----
  (function initPaymentCalculator(){
    const calculators = document.querySelectorAll('[data-payment-calculator]');
    if (!calculators.length) return;

    const CONSTANTS = {
      interestRate: 0,
      monthlyAdminFee: 55,
      setupFee: 575
    };

    function roundTo(value, decimals){
      const factor = Math.pow(10, decimals);
      return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    calculators.forEach(calculator => {
      const loanInput = calculator.querySelector('[data-payment-input="loan"]');
      const termInput = calculator.querySelector('[data-payment-input="term"]');
      if (!loanInput || !termInput) return;

      const locale = calculator.dataset.locale || document.documentElement.lang || 'en-GB';
      const currency = calculator.dataset.currency || (locale.toLowerCase().startsWith('sv') ? 'SEK' : 'GBP');
      const formatWhole = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      const formatTwo = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      const termUnit = calculator.dataset.termUnit
        || (locale.toLowerCase().startsWith('sv') ? 'månader' : 'months');

      const display = {
        loan: calculator.querySelector('[data-payment-display="loan"]'),
        term: calculator.querySelector('[data-payment-display="term"]'),
        monthly: calculator.querySelector('[data-payment-display="monthly"]'),
        interestRate: calculator.querySelector('[data-payment-display="interest-rate"]'),
        setupFee: calculator.querySelector('[data-payment-display="setup-fee"]'),
        setupMonthly: calculator.querySelector('[data-payment-display="setup-monthly"]'),
        adminFee: calculator.querySelector('[data-payment-display="admin-fee"]'),
        total: calculator.querySelector('[data-payment-display="total"]')
      };

      function formatCurrency(value, digits){
        return digits === 0 ? formatWhole.format(value) : formatTwo.format(value);
      }

      function update(){
        const loanAmount = Number(loanInput.value);
        const termMonths = Number(termInput.value);

        const baseMonthlyRepayment = loanAmount / termMonths;
        const monthlySetupCost = CONSTANTS.setupFee / termMonths;
        const estimatedMonthlyCost = baseMonthlyRepayment + CONSTANTS.monthlyAdminFee + monthlySetupCost;
        const estimatedMonthlyRounded = roundTo(estimatedMonthlyCost, 2);
        const totalPayable = loanAmount + CONSTANTS.setupFee + (CONSTANTS.monthlyAdminFee * termMonths);
        const totalPayableRounded = roundTo(totalPayable, 2);

        if (display.loan) display.loan.textContent = formatCurrency(loanAmount, 0);
        if (display.term) display.term.textContent = `${termMonths} ${termUnit}`;
        if (display.monthly) display.monthly.textContent = formatCurrency(estimatedMonthlyRounded, 2);
        if (display.interestRate) display.interestRate.textContent = `${CONSTANTS.interestRate}%`;
        if (display.setupFee) display.setupFee.textContent = formatCurrency(CONSTANTS.setupFee, 0);
        if (display.setupMonthly) display.setupMonthly.textContent = formatCurrency(roundTo(monthlySetupCost, 2), 2);
        if (display.adminFee) display.adminFee.textContent = formatCurrency(CONSTANTS.monthlyAdminFee, 0);
        if (display.total) display.total.textContent = formatCurrency(totalPayableRounded, 2);
      }

      loanInput.addEventListener('input', update);
      termInput.addEventListener('input', update);
      update();
    });
  })();
})();
