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

  // ----- Screening Test Logic (ADHD + Autism) -----
  function initScreeningForm({
    formId,
    totalQuestions,
    scoreBoxId,
    scoreValueId,
    interpretationId,
    ranges,
    defaultInterpretation
  }) {
    const form = document.getElementById(formId);
    if (!form) return;

    const scoreBox = document.getElementById(scoreBoxId);
    const scoreValue = document.getElementById(scoreValueId);
    const interpretationEl = document.getElementById(interpretationId);
    const resetButton = form.querySelector('.adhd-screening__reset');
    const interpretationClasses = Array.from(new Set(ranges.map(range => range.className).filter(Boolean)));
    let hideTimeout = null;

    function removeInterpretationClasses() {
      if (!interpretationEl) return;
      interpretationClasses.forEach(cls => interpretationEl.classList.remove(cls));
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

    function updateScoreDisplay(score) {
      if (!scoreBox || !scoreValue || !interpretationEl) return;
      scoreValue.textContent = String(score);
      removeInterpretationClasses();
      const match = ranges.find(range => score <= range.max) || ranges[ranges.length - 1];
      interpretationEl.textContent = match.text;
      if (match.className) {
        interpretationEl.classList.add(match.className);
      }
    }

    function calculateScore() {
      const formData = new FormData(form);
      let total = 0;
      let answered = 0;
      for (let i = 1; i <= totalQuestions; i += 1) {
        const value = formData.get(`q${i}`);
        if (value !== null) {
          total += Number(value);
          answered += 1;
        }
      }
      return { total, answered };
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const { total, answered } = calculateScore();
      if (answered === totalQuestions) {
        updateScoreDisplay(total);
        showScoreBox();
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
      });
    }

    form.addEventListener('change', () => {
      if (!scoreBox || scoreBox.hasAttribute('hidden')) return;
      const { total, answered } = calculateScore();
      if (answered === totalQuestions) {
        updateScoreDisplay(total);
      }
    });
  }

  initScreeningForm({
    formId: 'adhd-screening-form',
    totalQuestions: 18,
    scoreBoxId: 'adhd-score',
    scoreValueId: 'adhd-score-value',
    interpretationId: 'adhd-score-interpretation',
    defaultInterpretation: 'Besvara varje fråga för att visa din poäng och tolkning.',
    ranges: [
      { max: 17, text: 'Symtomnivån ligger under den kliniska riskgränsen. Fortsätt observera vardagen och sök hjälp om läget förändras.' },
      { max: 26, text: 'Svarsmönstret visar flera ADHD-indikatorer. Vi rekommenderar ett strukturerat bedömningssamtal med vårt neuropsykiatriska team.', className: 'is-amber' },
      { max: 35, text: 'Symtombördan är uttalad och påverkar sannolikt skola, arbete eller hem. Boka en fullständig specialistledd utredning.', className: 'is-orange' },
      { max: Infinity, text: 'Screeningen signalerar omfattande svårigheter förenliga med ADHD. Kontakta Rikta Psykiatri för en diagnostisk utredning.', className: 'is-red' }
    ]
  });

  initScreeningForm({
    formId: 'autism-screening-form',
    totalQuestions: 14,
    scoreBoxId: 'autism-score',
    scoreValueId: 'autism-score-value',
    interpretationId: 'autism-score-interpretation',
    defaultInterpretation: 'Besvara alla frågor för att se din RAADS-14 poäng.',
    ranges: [
      { max: 13, text: 'Poängen ligger under den rekommenderade cut-off på 14 och talar för låg sannolikhet för autism i detta test.' },
      { max: 20, text: 'Resultatet närmar sig cut-off. Ökad vaksamhet och eventuellt rådgivande samtal kan vara hjälpsamt.', className: 'is-amber' },
      { max: 27, text: 'Autistiska drag framträder tydligt. En klinisk autismutredning rekommenderas för att få säkra svar.', className: 'is-orange' },
      { max: Infinity, text: 'Poängen ligger klart över cut-off och talar starkt för att boka en komplett autismutredning hos Rikta Psykiatri.', className: 'is-red' }
    ]
  });

  // ----- Newsletter Popup -----
  (function initNewsletterPopup(){
    const popup = document.getElementById('newsletter-popup');
    if (!popup) return;

    const SHOW_DELAY_MS = 1800;
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
