(function(){
  // ----- Config -----
  const DURATION_MS = 1200;           // << make this bigger for slower scroll
  const HEADER = document.querySelector('header.site-header');
  const OFFSET = HEADER ? HEADER.offsetHeight : 72;

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
    gateWithLeadForm = false,
    onLeadRequired,
    scoreCalculator,
    buildInterpretation,
    metaUpdater,
    testName,
    transformValue
  }) {
    const form = document.getElementById(formId);
    if (!form) return;

    const scoreBox = document.getElementById(scoreBoxId);
    const scoreValue = document.getElementById(scoreValueId);
    const interpretationEl = document.getElementById(interpretationId);
    const resetButton = form.querySelector('.adhd-screening__reset');
    let hideTimeout = null;

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

    function updateScoreDisplay(score, interpretationObj) {
      if (!scoreBox || !scoreValue || !interpretationEl) return;
      scoreValue.textContent = String(score);
      removeInterpretationClasses();
      const match = interpretationObj || ranges.find(range => score <= range.max) || ranges[ranges.length - 1];
      interpretationEl.textContent = (match && match.text) ? match.text : defaultInterpretation;
      if (match && match.className) {
        interpretationEl.classList.add(match.className);
      }
    }

    function getInterpretation(score) {
      if (typeof buildInterpretation === 'function') {
        return buildInterpretation(score);
      }
      return ranges.find(range => score <= range.max) || ranges[ranges.length - 1];
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
        const prompt = (question.querySelector('.adhd-question__prompt')?.textContent || '').replace(/\s+/g, ' ').trim();
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
        const interpretation = getInterpretation(scoreData);
        const renderResult = () => {
          updateScoreDisplay(total, interpretation);
          if (typeof metaUpdater === 'function') {
            metaUpdater(scoreData);
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
          renderResult
        };

        if (gateWithLeadForm && typeof onLeadRequired === 'function') {
          onLeadRequired(payload);
        } else {
          renderResult();
        }
      }
    });

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        form.reset();
        if (scoreBox && interpretationEl) {
          scoreValue.textContent = '0';
          interpretationEl.textContent = defaultInterpretation;
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
        const interpretation = getInterpretation(scoreData);
        updateScoreDisplay(total, interpretation);
        if (typeof metaUpdater === 'function') {
          metaUpdater(scoreData);
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
    statusEl.dataset.statusType = type || 'info';
    statusEl.hidden = !message;
  }

  function mergeMetadata(baseMeta, extraMeta){
    if (!extraMeta) return baseMeta;
    return { ...(baseMeta || {}), ...extraMeta };
  }

  function buildContactPayload(form){
    const formData = new FormData(form);
    const firstName = (formData.get('firstName') || '').trim();
    const lastName = (formData.get('lastName') || '').trim();
    const fullNameField = (formData.get('fullName') || '').trim();
    const fullName = (fullNameField || [firstName, lastName].filter(Boolean).join(' ') || '').trim();
    // Accept both "email" and legacy "Email" field names to avoid missed submissions.
    const email = (formData.get('email') || formData.get('Email') || '').trim();
    const description = (formData.get('description') || formData.get('message') || '').trim();
    const leadSource = (formData.get('leadSource') || '').trim();
    const ratingRaw = formData.get('rating');
    const baseMetadata = {
      path: window.location.pathname,
      formContext: form.dataset.formContext || form.dataset.kaddioForm || null
    };
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
      const error = new Error(body?.error || body?.message || 'Could not submit the form just now.');
      error.status = response.status;
      throw error;
    }
    return body;
  }

  function bindKaddioForm(form, { augmentPayload, onSuccess } = {}){
    if (!form) return;
    // Some pages include an inline fallback handler; avoid double-submitting to Kaddio.
    if (form.dataset.kaddioInlineBound === 'true') return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const thankYou = form.querySelector('[data-thank-you]');
      if (thankYou) {
        thankYou.hidden = true;
      }
      setFormStatus(form, form.dataset.sendingMessage || 'Skickar...', 'info');
      toggleFormDisabled(form, true);

      try {
        const basePayload = buildContactPayload(form);
        if (!basePayload.email) {
          setFormStatus(form, 'Please add your email before submitting.', 'error');
          toggleFormDisabled(form, false);
          return;
        }
        const extra = typeof augmentPayload === 'function' ? augmentPayload(basePayload) : null;
        const merged = { ...basePayload, ...(extra || {}) };
        merged.metadata = mergeMetadata(basePayload.metadata, extra?.metadata);
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
      } catch (error) {
        const msg = error?.status === 429
          ? 'We are handling many requests right now. Please try again in a moment.'
          : (error?.message || 'We could not send your request. Please try again.');
        setFormStatus(form, msg, 'error');
      } finally {
        toggleFormDisabled(form, false);
      }
    });
  }

  const contactForms = document.querySelectorAll('[data-kaddio-form="contact"]');
  contactForms.forEach(form => {
    bindKaddioForm(form);
  });

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
    const lines = [
      result.testName || 'Screeningresultat',
      `Totalpoäng: ${result.total}`,
      `Tolkning: ${result.interpretation}`,
      'Svar:'
    ];
    (result.answers || []).forEach(item => {
      const prompt = item.prompt || '';
      const answer = item.answer || 'Ej angivet';
      lines.push(`${item.number}. ${prompt} — ${answer}`);
    });
    return lines.join('\n');
  }

  function openLeadModal(result) {
    if (!leadModal || !leadForm) return;
    leadResultPayload = result;
    if (leadSource) {
      const derivedSource = (result?.testName || '').toLowerCase().includes('autism')
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
    bindKaddioForm(leadForm, {
      augmentPayload(basePayload){
        const screeningMeta = leadResultPayload ? {
          testName: leadResultPayload.testName,
          total: leadResultPayload.total,
          interpretation: leadResultPayload.interpretation,
          answers: leadResultPayload.answers
        } : null;
        const derivedDescription = leadDescription?.value || basePayload.description;
        return {
          description: derivedDescription,
          leadSource: (leadSource?.value || basePayload.leadSource || 'Screening form').trim(),
          metadata: mergeMetadata(basePayload.metadata, {
            screening: screeningMeta
          })
        };
      },
      onSuccess: handleLeadSuccess
    });
  }

  initScreeningForm({
    formId: 'adhd-screening-form',
    totalQuestions: 12,
    scoreBoxId: 'adhd-score',
    scoreValueId: 'adhd-score-value',
    interpretationId: 'adhd-score-interpretation',
    defaultInterpretation: 'Besvara alla frågor för att se din R-ARS-12 poäng.',
    ranges: [
      { max: 27, text: '12–27: låg grad av uppmärksamhets-/regleringssvårigheter.' },
      { max: 41, text: '28–41: måttlig nivå – kan påverka vardagen. Planeringsstöd eller coachning kan hjälpa.', className: 'is-amber' },
      { max: Infinity, text: '42–60: hög nivå. Rekommenderar vidare bedömning eller neuropsykiatrisk utredning.', className: 'is-red' }
    ],
    gateWithLeadForm: true,
    onLeadRequired: openLeadModal,
    testName: 'Attention & Regulation Scale (R-ARS-12)'
  });

  initScreeningForm({
    formId: 'autism-screening-form',
    totalQuestions: 10,
    scoreBoxId: 'autism-score',
    scoreValueId: 'autism-score-value',
    interpretationId: 'autism-score-interpretation',
    defaultInterpretation: 'Besvara alla frågor för att se din AQ-10 poäng.',
    ranges: [
      { max: 5, text: '0–5 poäng: inget tydligt utslag i denna screening. Sök vård om du ändå upplever svårigheter.' },
      { max: Infinity, text: '6–10 poäng: förhöjd sannolikhet. Rekommenderar professionell autismutredning för säker bedömning.', className: 'is-amber' }
    ],
    gateWithLeadForm: true,
    onLeadRequired: openLeadModal,
    testName: 'Autism Screening (AQ-10)'
  });

  initScreeningForm({
    formId: 'procrastination-screening-form',
    totalQuestions: 15,
    scoreBoxId: 'procrastination-score',
    scoreValueId: 'procrastination-score-value',
    interpretationId: 'procrastination-score-interpretation',
    defaultInterpretation: 'Besvara alla frågor för att se din GPS-poäng.',
    ranges: [
      { max: 35, text: '15–35: låg nivå av prokrastinering. Fortsätt med de rutiner som fungerar.' },
      { max: 50, text: '36–50: måttlig nivå. Du kan ha nytta av planeringsstöd, tidsblockering eller coachning.', className: 'is-amber' },
      { max: Infinity, text: '51–75: hög nivå. Rekommenderar riktade strategier och eventuell NPF-inriktad coaching.', className: 'is-red' }
    ],
    transformValue(value, questionNumber){
      // Question 12 is reverse-scored (agreeing reduces procrastination score)
      if(questionNumber === 12){
        const num = Number(value);
        return 6 - num; // invert 1-5 to 5-1
      }
      return Number(value);
    }
  });

  // ----- Newsletter Popup -----
  (function initNewsletterPopup(){
    const popup = document.getElementById('newsletter-popup');
    if (!popup) return;

    const SHOW_DELAY_MS = 10000;
    const STORAGE_KEY = 'rk_newsletter_popup';
    const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
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
      openTimeout = window.setTimeout(openPopup, SHOW_DELAY_MS);
    }

    const closeTriggers = popup.querySelectorAll('[data-popup-close]');
    closeTriggers.forEach(btn => btn.addEventListener('click', () => closePopup('dismissed')));

    const form = popup.querySelector('form');
    if (form) {
      form.addEventListener('submit', () => {
        if (openTimeout) {
          clearTimeout(openTimeout);
          openTimeout = null;
        }
        closePopup('submitted');
      });
    }

    scheduleOpen();
  })();
})();
