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

  // ----- ADHD Screening Test Logic -----
  const screeningForm = document.getElementById('adhd-screening-form');
  if (screeningForm) {
    const TOTAL_QUESTIONS = 18;
    const scoreBox = document.getElementById('adhd-score');
    const scoreValue = document.getElementById('adhd-score-value');
    const interpretationEl = document.getElementById('adhd-score-interpretation');
    const resetButton = screeningForm.querySelector('.adhd-screening__reset');
    const interpretationClasses = ['is-amber', 'is-orange', 'is-red'];
    const ranges = [
      { max: 17, text: 'Symptom levels land below the clinical risk threshold on this screener. Keep observing and reach out if everyday functioning shifts.' },
      { max: 26, text: 'Responses reflect clinically relevant ADHD indicators. A structured consultation with our neuropsychiatry team is recommended.', className: 'is-amber' },
      { max: 35, text: 'Symptom burden is pronounced and likely to interfere with school, work, or home life. Schedule a full specialist-led assessment.', className: 'is-orange' },
      { max: Infinity, text: 'The screening signals substantial impairment consistent with ADHD. Please contact Rikta Psykiatri promptly to arrange a comprehensive diagnostic evaluation.', className: 'is-red' }
    ];
    let hideTimeout = null;

    function removeInterpretationClasses() {
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

    screeningForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!screeningForm.reportValidity()) return;

      const formData = new FormData(screeningForm);
      let total = 0;
      let answered = 0;

      for (let i = 1; i <= TOTAL_QUESTIONS; i += 1) {
        const value = formData.get(`q${i}`);
        if (value !== null) {
          total += Number(value);
          answered += 1;
        }
      }

      if (answered === TOTAL_QUESTIONS) {
        updateScoreDisplay(total);
        showScoreBox();
      }
    });

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        screeningForm.reset();
        if (scoreBox) {
          scoreValue.textContent = '0';
          interpretationEl.textContent = 'Answer every question to reveal your score and interpretation.';
          removeInterpretationClasses();
          hideScoreBox();
        }
      });
    }

    screeningForm.addEventListener('change', () => {
      // Recalculate instantly if the result card is already visible.
      if (!scoreBox || scoreBox.hasAttribute('hidden')) return;
      const formData = new FormData(screeningForm);
      let total = 0;
      let answered = 0;
      for (let i = 1; i <= TOTAL_QUESTIONS; i += 1) {
        const value = formData.get(`q${i}`);
        if (value !== null) {
          total += Number(value);
          answered += 1;
        }
      }
      if (answered === TOTAL_QUESTIONS) {
        updateScoreDisplay(total);
      }
    });
  }
})();
