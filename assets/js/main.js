(function(){
  // ----- Config -----
  const DURATION_MS = 1200;           // << make this bigger for slower scroll
  const HEADER = document.querySelector('header.site-header');
  const OFFSET = HEADER ? HEADER.offsetHeight : 72;
  const DOC_LANG = ((document.documentElement && document.documentElement.lang) || '').toLowerCase();
  const IS_EN = true;
  const WEBSITE_LEAD_INPUT = 'Website - English Side';
  let guidesModal = null;

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
  clinicalCutoff,
  buildCutoffLine,
  gateWithLeadForm = false,
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
    const interpretationEl = interpretationId ? document.getElementById(interpretationId) : null;
    const resetButton = form.querySelector('.adhd-screening__reset');
    const getFormLocale = () => resolveLocale(form);
    const getLocaleCopy = () => (getFormLocale() || 'sv').toLowerCase().startsWith('en') ? 'en' : 'sv';
    let hideTimeout = null;

    function getProgressCopy(locale) {
      const isEn = locale === 'en';
      return {
        answered: isEn ? 'Answered' : 'Besvarade',
        incomplete: isEn ? 'Please answer all questions to calculate your score.' : 'Besvara alla frågor för att räkna ut din poäng.',
        inProgress: isEn ? 'Complete all questions to see your result.' : 'Besvara alla frågor för att se ditt resultat.'
      };
    }

    function ensureProgressUI() {
      let box = form.querySelector('[data-test-progress]');
      if (box) return box;
      box = document.createElement('div');
      box.className = 'adhd-progress';
      box.setAttribute('data-test-progress', 'true');
      box.innerHTML = `
        <div class="adhd-progress__head">
          <span class="adhd-progress__label" data-progress-label></span>
          <span class="adhd-progress__percent" data-progress-percent>0%</span>
        </div>
        <div class="adhd-progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <span data-progress-fill></span>
        </div>
        <p class="adhd-progress__hint" data-progress-hint></p>
      `;
      const summaryBlock = form.querySelector('.adhd-section, .adhd-question-list');
      if (summaryBlock && summaryBlock.parentNode) {
        summaryBlock.parentNode.insertBefore(box, summaryBlock);
      } else {
        form.insertBefore(box, form.firstChild);
      }
      return box;
    }

    function setProgressHint(message) {
      const progressBox = ensureProgressUI();
      const hint = progressBox.querySelector('[data-progress-hint]');
      if (!hint) return;
      hint.textContent = message || '';
    }

    function updateProgressUI({ hint } = {}) {
      const progressBox = ensureProgressUI();
      const label = progressBox.querySelector('[data-progress-label]');
      const percentEl = progressBox.querySelector('[data-progress-percent]');
      const fill = progressBox.querySelector('[data-progress-fill]');
      const bar = progressBox.querySelector('.adhd-progress__bar');
      const { answered } = calculateScore();
      const locale = getLocaleCopy();
      const copy = getProgressCopy(locale);
      const percent = Math.round((answered / totalQuestions) * 100);
      if (label) label.textContent = `${copy.answered}: ${answered}/${totalQuestions}`;
      if (percentEl) percentEl.textContent = `${percent}%`;
      if (fill) fill.style.width = `${percent}%`;
      if (bar) bar.setAttribute('aria-valuenow', String(percent));
      if (typeof hint === 'string') {
        setProgressHint(hint);
      } else if (answered > 0 && answered < totalQuestions) {
        setProgressHint(copy.inProgress);
      } else {
        setProgressHint('');
      }
    }

    function firstMissingQuestion() {
      for (let i = 1; i <= totalQuestions; i += 1) {
        const selected = form.querySelector(`input[name="q${i}"]:checked`);
        if (!selected) return i;
      }
      return null;
    }

    function ensureResultActions(scoreData, locale) {
      if (!scoreBox) return;
      let actions = scoreBox.querySelector('.adhd-score__actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'adhd-score__actions';
        scoreBox.appendChild(actions);
      }
      const isEn = locale === 'en';
      const isAutismForm = /autism|aq|raads/i.test(formId);
      const assessmentHref = isEn
        ? (isAutismForm ? '/autism-assessment/' : '/adhd-assessment/')
        : (isAutismForm ? '/autism-utredning/' : '/adhd-utredning/');
      const contactHref = isEn ? '/contact/' : '/kontakta-oss/';
      const pricingHref = isEn ? '/pricing/' : '/priser/';
      const heading = isEn ? 'Recommended next step' : 'Rekommenderat nästa steg';
      const description = isEn
        ? 'Use your result as a guide and book a specialist conversation for a full clinical assessment.'
        : 'Använd resultatet som vägledning och boka ett specialistsamtal för en full klinisk bedömning.';
      const ctaPrimary = isEn ? 'Book consultation' : 'Boka rådgivning';
      const ctaSecondary = isEn ? 'Assessment details' : 'Se utredning';
      const ctaTertiary = isEn ? 'See pricing' : 'Se priser';
      actions.innerHTML = `
        <h3>${heading}</h3>
        <p>${description}</p>
        <div class="adhd-score__action-buttons">
          <a class="btn primary" href="${contactHref}">${ctaPrimary}</a>
          <a class="btn secondary" href="${assessmentHref}">${ctaSecondary}</a>
          <a class="btn link" href="${pricingHref}">${ctaTertiary}</a>
        </div>
      `;
    }

    function resolveClinicalCutoff(locale) {
      const activeLocale = (locale || getFormLocale() || 'sv').toLowerCase();
      if (typeof clinicalCutoff === 'function') {
        return clinicalCutoff(activeLocale, form);
      }
      if (clinicalCutoff && typeof clinicalCutoff === 'object') {
        return clinicalCutoff[activeLocale]
          || clinicalCutoff[activeLocale.startsWith('en') ? 'en' : 'sv']
          || clinicalCutoff.en
          || clinicalCutoff.sv
          || null;
      }
      return clinicalCutoff;
    }

    function ensureCutoffElement() {
      if (!scoreBox) return null;
      const existing = scoreBox.querySelector('.adhd-score__cutoff');
      if (existing) return existing;
      const el = document.createElement('p');
      el.className = 'adhd-score__cutoff';
      el.hidden = true;
      if (interpretationEl && interpretationEl.parentNode === scoreBox) {
        scoreBox.insertBefore(el, interpretationEl);
      } else {
        scoreBox.appendChild(el);
      }
      return el;
    }

    function formatCutoffLine({ score, cutoff, locale } = {}) {
      const activeLocale = (locale || getFormLocale() || 'sv').toLowerCase();
      const isEn = activeLocale.startsWith('en');
      if (cutoff === null || typeof cutoff === 'undefined' || cutoff === '') {
        return isEn
          ? `You scored ${score}. There is no single established clinical cutoff for this questionnaire.`
          : `Du fick ${score}. Det finns ingen enskild etablerad klinisk gräns för det här formuläret.`;
      }
      return isEn
        ? `You scored ${score}. The clinical threshold for further investigation is ${cutoff} or higher.`
        : `Du fick ${score}. Den kliniska gränsen för vidare utredning är ${cutoff} eller högre.`;
    }

    function updateCutoffLine(scoreData, locale) {
      if (!scoreBox) return;
      const el = ensureCutoffElement();
      if (!el) return;
      const numericScore = scoreData && typeof scoreData.total !== 'undefined'
        ? Number(scoreData.total)
        : Number(scoreData);
      const safeScore = Number.isFinite(numericScore) ? numericScore : 0;
      const activeLocale = (locale || getFormLocale() || 'sv').toLowerCase();
      let message = '';
      if (typeof buildCutoffLine === 'function') {
        message = buildCutoffLine({
          score: safeScore,
          scoreData,
          locale: activeLocale,
          form
        }) || '';
      }
      if (!message) {
        const cutoff = resolveClinicalCutoff(activeLocale);
        message = formatCutoffLine({ score: safeScore, cutoff, locale: activeLocale });
      }
      el.textContent = message;
      el.hidden = !message;
    }

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
      if (!scoreBox || !scoreValue) return;
      const activeLocale = locale || getFormLocale();
      scoreValue.textContent = String(score);
      if (!interpretationEl) return;
      const activeRanges = getRanges(activeLocale);
      removeInterpretationClasses();
      const match = interpretationObj || activeRanges.find(range => score <= range.max) || activeRanges[activeRanges.length - 1];
      const nextText = (match && match.text) ? match.text : getDefaultInterpretation(activeLocale);
      interpretationEl.textContent = nextText;
      interpretationEl.hidden = !nextText;
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
          const localeKey = (locale || 'sv').toLowerCase().startsWith('en') ? 'en' : 'sv';
	        const resolvedTestName = typeof testName === 'function'
	          ? testName(locale, form)
	          : (testName && typeof testName === 'object')
	            ? (testName[locale] || testName.en || testName.sv || '')
	            : (testName || '');
	        const interpretation = getInterpretation(total, locale);
	        const renderResult = () => {
	          updateScoreDisplay(total, interpretation, locale);
            updateCutoffLine(scoreData, locale);
            ensureResultActions(scoreData, localeKey);
          if (typeof metaUpdater === 'function') {
            metaUpdater({ ...scoreData, interpretation });
          }
          updateProgressUI({ hint: '' });
          showScoreBox();
	        };
	        const payload = {
	          testName: resolvedTestName,
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
          if (guidesModal && typeof guidesModal.open === 'function') {
            guidesModal.open({ score: total });
          }
        }
      } else {
        const localeKey = getLocaleCopy();
        const copy = getProgressCopy(localeKey);
        const missing = firstMissingQuestion();
        updateProgressUI({ hint: copy.incomplete });
        if (missing !== null) {
          const firstMissingInput = form.querySelector(`input[name="q${missing}"]`);
          const missingQuestion = firstMissingInput ? firstMissingInput.closest('.adhd-question') : null;
          if (missingQuestion) {
            missingQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    });

      if (resetButton) {
      resetButton.addEventListener('click', () => {
        form.reset();
        if (scoreBox) {
          scoreValue.textContent = '0';
          if (interpretationEl) {
            interpretationEl.textContent = getDefaultInterpretation(getFormLocale());
            removeInterpretationClasses();
            interpretationEl.hidden = !interpretationEl.textContent;
          }
          const cutoffEl = scoreBox.querySelector('.adhd-score__cutoff');
          if (cutoffEl) {
            cutoffEl.hidden = true;
            cutoffEl.textContent = '';
          }
          hideScoreBox();
        }
        if (typeof metaUpdater === 'function') {
          metaUpdater({ total: 0, answered: 0, meta: {} });
        }
        updateProgressUI({ hint: '' });
      });
    }

    form.addEventListener('change', () => {
      updateProgressUI();
      if (!scoreBox || scoreBox.hasAttribute('hidden')) return;
      const scoreData = calculateScore();
      const { total, answered } = scoreData;
      if (answered === totalQuestions) {
        const locale = getFormLocale();
        const interpretation = getInterpretation(total, locale);
        updateScoreDisplay(total, interpretation, locale);
        updateCutoffLine(scoreData, locale);
        if (typeof metaUpdater === 'function') {
          metaUpdater({ ...scoreData, interpretation });
        }
      }
    });

    updateProgressUI({ hint: '' });
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
      timestamp: new Date().toISOString(),
      policyUrl: policyUrl || undefined,
      termsUrl: termsUrl || undefined,
      policyVersion: policyVersion || undefined,
      statementVersion: statementVersion || undefined,
      // Store the exact consent copy shown to the user (trimmed). Keep it short to avoid payload bloat.
      statement: statement ? statement.slice(0, 800) : undefined
    };
  }

  function buildContactPayload(form){
    ['leadSource', 'LEADCF2'].forEach((name) => {
      let input = form.querySelector(`input[name="${name}"]`);
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        form.prepend(input);
      }
      input.value = WEBSITE_LEAD_INPUT;
    });
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
    let description = (
      formData.get('reason')
      || formData.get('description')
      || formData.get('Description')
      || formData.get('message')
      || ''
    ).trim();
    const ratingRaw = formData.get('rating');
    const locale = resolveLocale(form);
    const hasNewsletterOptIn = formData.get('newsletterOptIn') !== null;
    if (hasNewsletterOptIn) {
      const optInCopy = locale.startsWith('en')
        ? 'Marketing opt-in: YES.'
        : 'Samtycke nyhetsbrev: JA.';
      description = description ? `${description}\n\n${optInCopy}` : optInCopy;
    }
    const baseMetadata = {
      path: window.location.pathname,
      formContext: form.dataset.formContext || form.dataset.kaddioForm || null,
      locale
    };
    const policyAck = form.querySelector('input[name="policyAcknowledgement"]');
    if (policyAck) {
      baseMetadata.consentRequired = true;
      baseMetadata.consent = buildConsentMetadata({
        screeningForm: form,
        formContext: baseMetadata.formContext,
        locale,
        checkboxName: 'policyAcknowledgement',
        purpose: CONSENT_PURPOSE_CONTACT
      });
    }
    const payload = {
      fullName,
      email,
      description,
      leadSource: WEBSITE_LEAD_INPUT,
      LEADCF2: WEBSITE_LEAD_INPUT,
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

  // ----- Guides Modal (show score + collect email for guides) -----
  function initGuidesModal(){
    const modal = document.getElementById('guides-modal');
    if (!modal) return null;
    const scoreEl = modal.querySelector('[data-guides-score]');
    const closeTriggers = modal.querySelectorAll('[data-guides-close]');
    const focusTarget = modal.querySelector('[data-guides-focus]');
    const statusEl = modal.querySelector('[data-form-status]');
    let isOpen = false;
    let lastFocused = null;

    function focusables(){
      return Array.from(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
    }

    function setScore(score){
      if (!scoreEl) return;
      const numeric = Number(score);
      scoreEl.textContent = Number.isFinite(numeric) ? String(numeric) : String(score || '');
    }

    function show(){
      modal.dataset.modalState = 'visible';
      modal.removeAttribute('aria-hidden');
      document.body.classList.add('guides-modal--locked');
    }

    function hide(){
      modal.dataset.modalState = 'hidden';
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('guides-modal--locked');
    }

    function open({ score } = {}){
      if (typeof score !== 'undefined') {
        setScore(score);
      }
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.hidden = true;
        statusEl.classList.remove('form-status--success', 'form-status--error', 'form-status--info', 'is-visible');
      }
      if (isOpen) return;
      isOpen = true;
      lastFocused = document.activeElement;
      show();
      const target = focusTarget || focusables()[0];
      if (target && typeof target.focus === 'function') {
        target.focus();
      }
    }

    function close(){
      if (!isOpen) return;
      isOpen = false;
      hide();
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    closeTriggers.forEach(trigger => trigger.addEventListener('click', close));

    document.addEventListener('keydown', (event) => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    });

    modal.addEventListener('keydown', (event) => {
      if (!isOpen) return;
      if (event.key !== 'Tab') return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    });

    return { open, close };
  }

  guidesModal = initGuidesModal();

  const guideForms = document.querySelectorAll('[data-kaddio-form="guides"]');
  guideForms.forEach(form => bindKaddioForm(form, {
    augmentPayload: () => ({
      metadata: {
        // Do not store which test page the user was on.
        path: undefined
      }
    })
  }));

  const contactForms = document.querySelectorAll('[data-kaddio-form="contact"]');
  contactForms.forEach(form => bindKaddioForm(form));

  initScreeningForm({
    formId: 'adhd-screening-form',
    totalQuestions: 12,
    scoreBoxId: 'adhd-score',
    scoreValueId: 'adhd-score-value',
    interpretationId: 'adhd-score-interpretation',
    defaultInterpretation: '',
    clinicalCutoff: null,
    ranges: [],
    testName: {
      en: 'Attention & Regulation Scale (R-ARS-12)',
      sv: 'R-ARS-12 (självskattning)'
    }
  });

  initScreeningForm({
    formId: 'autism-screening-form',
    totalQuestions: 10,
    scoreBoxId: 'autism-score',
    scoreValueId: 'autism-score-value',
    interpretationId: 'autism-score-interpretation',
    defaultInterpretation: '',
    clinicalCutoff: 6,
    ranges: [],
    testName: {
      en: 'Autism Screening (AQ-10)',
      sv: 'AQ-10 – självtest för autism'
    }
  });

  initScreeningForm({
    formId: 'autism-child-screening-form',
    totalQuestions: 10,
    scoreBoxId: 'autism-child-score',
    scoreValueId: 'autism-child-score-value',
    interpretationId: 'autism-child-score-interpretation',
    defaultInterpretation: '',
    clinicalCutoff: 6,
    ranges: [],
    testName: {
      en: 'AQ-10 (Child version)',
      sv: 'AQ-10 (barnversionen)'
    }
  });

  initScreeningForm({
    formId: 'snap-child-adhd-form',
    totalQuestions: 26,
    scoreBoxId: 'snap-score',
    scoreValueId: 'snap-total-score',
    interpretationId: 'snap-score-interpretation',
    defaultInterpretation: '',
    clinicalCutoff: null,
    buildInterpretation() {
      return { text: '' };
    },
    scoreCalculator(formData) {
      let total = 0;
      let answered = 0;
      let inattention = 0;
      let hyperactivity = 0;
      let opposition = 0;
      for (let i = 1; i <= 26; i += 1) {
        const value = formData.get(`q${i}`);
        if (value !== null) {
          const numeric = Number(value);
          total += numeric;
          answered += 1;
          if (i <= 9) {
            inattention += numeric;
          } else if (i <= 18) {
            hyperactivity += numeric;
          } else {
            opposition += numeric;
          }
        }
      }
      return {
        total,
        answered,
        meta: {
          inattention,
          hyperactivity,
          opposition
        }
      };
    },
    metaUpdater({ meta } = {}) {
      const inattentionEl = document.getElementById('snap-inattention-score');
      const hyperEl = document.getElementById('snap-hyper-score');
      const oppositionEl = document.getElementById('snap-opposition-score');
      const inattention = meta && typeof meta.inattention === 'number' ? meta.inattention : 0;
      const hyperactivity = meta && typeof meta.hyperactivity === 'number' ? meta.hyperactivity : 0;
      const opposition = meta && typeof meta.opposition === 'number' ? meta.opposition : 0;
      if (inattentionEl) inattentionEl.textContent = String(inattention);
      if (hyperEl) hyperEl.textContent = String(hyperactivity);
      if (oppositionEl) oppositionEl.textContent = String(opposition);
    },
    testName: {
      en: 'SNAP-IV 26-Item Parent Rating Scale',
      sv: 'SNAP-IV 26-Item Parent Rating Scale'
    }
  });

  initScreeningForm({
    formId: 'add-screening-form',
    totalQuestions: 9,
    scoreBoxId: 'add-score',
    scoreValueId: 'add-score-value',
    interpretationId: 'add-score-interpretation',
    defaultInterpretation: '',
    clinicalCutoff: null,
    ranges: [],
    testName: {
      en: 'ADD Inattentive Symptoms',
      sv: 'ADD – ouppmärksamhetssymtom'
    }
  });

  initScreeningForm({
    formId: 'asrs-vuxna-form',
    totalQuestions: 18,
    scoreBoxId: 'asrs-vuxna-score',
    scoreValueId: 'asrs-vuxna-score-value',
    interpretationId: 'asrs-vuxna-score-interpretation',
    defaultInterpretation: '',
    clinicalCutoff: 4,
    buildInterpretation() {
      return { text: '' };
    },
    scoreCalculator(formData) {
      let total = 0;
      let answered = 0;
      let partAPositive = 0;
      const thresholdForPartA = (questionNumber) => {
        // ASRS v1.1 Part A (Q1–Q6): a positive item depends on response category.
        // Values: 0=Never, 1=Rarely, 2=Sometimes, 3=Often, 4=Very Often.
        // Q1, Q3: Sometimes+ (>=2). Q2, Q4–Q6: Often+ (>=3).
        if (questionNumber === 1 || questionNumber === 3) return 2;
        return 3;
      };
      for (let i = 1; i <= totalQuestions; i += 1) {
        const value = formData.get(`q${i}`);
        if (value !== null) {
          const numeric = Number(value);
          total += numeric;
          answered += 1;
          if (i <= 6 && numeric >= thresholdForPartA(i)) {
            partAPositive += 1;
          }
        }
      }
      return {
        total,
        answered,
        meta: {
          partAPositive
        }
      };
    },
    buildCutoffLine({ scoreData, locale } = {}) {
      const activeLocale = (locale || '').toLowerCase();
      const isEn = activeLocale.startsWith('en');
      const partAPositive = scoreData && scoreData.meta && typeof scoreData.meta.partAPositive === 'number'
        ? scoreData.meta.partAPositive
        : 0;
      return isEn
        ? `ASRS Part A: ${partAPositive}/6 items meet the screening threshold. The clinical screening threshold for further investigation is ≥4/6.`
        : `ASRS del A: ${partAPositive}/6 items uppfyller screeningtröskeln. Klinisk screeninggräns för vidare utredning är ≥4/6.`;
    },
    testName: {
      sv: 'ASRS v1.1 (vuxna)',
      en: 'ASRS v1.1 (adults)'
    }
  });

  initScreeningForm({
    formId: 'snap-barn-form',
    totalQuestions: 30,
    scoreBoxId: 'snap-barn-score',
    scoreValueId: 'snap-barn-score-value',
    interpretationId: 'snap-barn-score-interpretation',
    defaultInterpretation: '',
    clinicalCutoff: null,
    buildInterpretation() {
      return { text: '' };
    },
    testName: {
      sv: 'SNAP-IV (barn)',
      en: 'SNAP-IV (child)'
    }
  });

  initScreeningForm({
    formId: 'raads14-adult-form',
    totalQuestions: 14,
    scoreBoxId: 'raads14-score',
    scoreValueId: 'raads14-score-value',
    interpretationId: 'raads14-score-interpretation',
    defaultInterpretation: '',
    clinicalCutoff: 14,
    ranges: [],
    testName: {
      en: 'RAADS-14 Screen (adult)'
    }
  });

  initScreeningForm({
    formId: 'raads14-vuxna-form',
    totalQuestions: 14,
    scoreBoxId: 'raads14-vuxna-score',
    scoreValueId: 'raads14-vuxna-score-value',
    interpretationId: 'raads14-vuxna-score-interpretation',
    defaultInterpretation: '',
    clinicalCutoff: 14,
    ranges: [],
    transformValue(value, questionNumber) {
      const numeric = Number(value);
      if (questionNumber === 6) {
        return 3 - numeric;
      }
      return numeric;
    },
    testName: {
      sv: 'RAADS-14 Screen (vuxna)',
      en: 'RAADS-14 Screen (adult)'
    }
  });

  initScreeningForm({
    formId: 'procrastination-screening-form',
    totalQuestions: 15,
    scoreBoxId: 'procrastination-score',
    scoreValueId: 'procrastination-score-value',
    interpretationId: 'procrastination-score-interpretation',
    defaultInterpretation: '',
    clinicalCutoff: null,
    ranges: [],
    transformValue(value, questionNumber){
      // Question 12 is reverse-scored (agreeing reduces procrastination score)
      if(questionNumber === 12){
        const num = Number(value);
        return 6 - num; // invert 1-5 to 5-1
      }
      return Number(value);
    },
    testName: {
      en: 'Procrastination Test (GPS)',
      sv: 'Prokrastineringstest (GPS)'
    }
  });

  initScreeningForm({
    formId: 'gad7-screening-form',
    totalQuestions: 7,
    scoreBoxId: 'gad7-score',
    scoreValueId: 'gad7-score-value',
    interpretationId: 'gad7-score-interpretation',
    defaultInterpretation: '',
    clinicalCutoff: 10,
    buildInterpretation() {
      return { text: '' };
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
    testName: {
      en: 'GAD-7 Anxiety',
      sv: 'GAD-7 – ångest'
    },
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
      const functionalLabel = isSv ? 'Funktionspåverkan' : 'Functional difficulty';

      const listItems = rows.map(row => (
        `<li><strong>${row.number}. ${row.prompt}</strong><br>` +
        `${responseLabel}: ${row.answerText} (${row.numeric})</li>`
      )).join('');

      resultsEl.innerHTML =
        `<h3>${resultsLabel}</h3>` +
        `<ul>${listItems}</ul>` +
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
    const q3ThresholdValue = isSv ? 'Problem' : 'Moderate problem';

    function ensureCutoffElement() {
      if (!scoreBox) return null;
      const existing = scoreBox.querySelector('.adhd-score__cutoff');
      if (existing) return existing;
      const el = document.createElement('p');
      el.className = 'adhd-score__cutoff';
      el.hidden = true;
      if (interpretationEl && interpretationEl.parentNode === scoreBox) {
        scoreBox.insertBefore(el, interpretationEl);
      } else {
        scoreBox.appendChild(el);
      }
      return el;
    }

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
      scoreValue.textContent = String(result.q1YesCount);
      interpretationEl.textContent = isSv
        ? 'Detta är ett resultat från en självskattning och inte en diagnos.'
        : 'This is a screening result, not a diagnosis.';

      const cutoffEl = ensureCutoffElement();
      if (cutoffEl) {
        const criteriaQ1 = result.q1YesCount >= 7;
        const criteriaQ2 = String(result.q2 || '') === yesValue;
        const criteriaQ3 = String(result.q3 || '') === q3ThresholdValue || String(result.q3 || '') === (isSv ? 'Allvarliga problem' : 'Serious problem');
        const copy = isSv
          ? `Du svarade Ja på ${result.q1YesCount} av 13. Klinisk screeninggräns (positiv MDQ) är vanligtvis ≥7 Ja-svar, samt “Ja” på fråga 2 och minst “Problem” på fråga 3.`
          : `You answered YES to ${result.q1YesCount} of 13. A positive MDQ screen is typically ≥7 YES answers, plus “Yes” on question 2 and at least “Moderate problem” on question 3.`;
        cutoffEl.textContent = copy;
        cutoffEl.hidden = false;
        cutoffEl.dataset.mdqPositive = (criteriaQ1 && criteriaQ2 && criteriaQ3) ? 'true' : 'false';
      }

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
        `<p><strong>${isSv ? 'Detta är ett resultat från en självskattning och inte en diagnos.' : 'This is a screening result, not a diagnosis.'}</strong></p>`;
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const q1Items = collectQ1Responses();
      const q1YesCount = q1Items.filter(item => item.answer === yesValue).length;
      const q2 = (form.querySelector('input[name="q2"]:checked') || {}).value || '';
      const q3 = (form.querySelector('input[name="q3"]:checked') || {}).value || '';

      const resultPayload = {
        q1Items,
        q1YesCount,
        q2,
        q3
      };

      renderResults(resultPayload);
      if (guidesModal && typeof guidesModal.open === 'function') {
        guidesModal.open({ score: q1YesCount });
      }
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
            ? 'Detta är ett resultat från en självskattning och inte en diagnos.'
            : 'This is a screening result, not a diagnosis.';
        }
        if (scoreBox) {
          const cutoffEl = scoreBox.querySelector('.adhd-score__cutoff');
          if (cutoffEl) {
            cutoffEl.hidden = true;
            cutoffEl.textContent = '';
          }
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

    const SHOW_DELAY_MS = 13000;
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
