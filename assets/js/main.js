document.addEventListener('DOMContentLoaded', () => {

  /* ================= Language toggle (AR <-> EN) ================= */
  const html = document.documentElement;
  const langBtn = document.getElementById('langSwitch');
  const langCurrent = langBtn.querySelector('.lang-current');

  // Cache original (Arabic) text/placeholders on first run so we can switch back.
  const translatable = document.querySelectorAll('[data-en]');
  translatable.forEach(el => {
    if (!el.dataset.ar) el.dataset.ar = el.innerHTML.trim();
  });

  const placeholderEls = document.querySelectorAll('[data-en-placeholder]');

  function applyLang(lang) {
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    langCurrent.textContent = lang === 'ar' ? 'EN' : 'AR';

    translatable.forEach(el => {
      el.innerHTML = lang === 'ar' ? el.dataset.ar : el.dataset.en;
    });
    placeholderEls.forEach(el => {
      el.setAttribute('placeholder', lang === 'ar' ? el.dataset.arPlaceholder || '' : el.dataset.enPlaceholder || '');
    });

    localStorage.setItem('argan-lang', lang);
  }

  langBtn.addEventListener('click', () => {
    const next = html.getAttribute('lang') === 'ar' ? 'en' : 'ar';
    applyLang(next);
  });

  const savedLang = localStorage.getItem('argan-lang');
  if (savedLang && savedLang !== 'ar') applyLang(savedLang);

  /* ================= Sticky header shadow ================= */
  const header = document.getElementById('siteHeader');
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
    backToTop.classList.toggle('show', window.scrollY > 500);
  };
  window.addEventListener('scroll', onScroll);

  /* ================= Mobile nav ================= */
  const hamburger = document.getElementById('hamburger');
  const mainNav = document.getElementById('mainNav');
  hamburger.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
  });
  mainNav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ================= Active nav link on scroll ================= */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => navObserver.observe(s));

  /* ================= Reveal on scroll ================= */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => revealObserver.observe(el));

  /* ================= Stat counters ================= */
  const statNums = document.querySelectorAll('.stat-num');
  const animateCount = (el) => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.floor(progress * target);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    }
    requestAnimationFrame(tick);
  };
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  statNums.forEach(el => statObserver.observe(el));

  /* ================= Project filter ================= */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      projectCards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !match);
      });
    });
  });

  /* ================= Testimonial slider ================= */
  const slides = document.querySelectorAll('.testimonial-slide');
  const dotsWrap = document.getElementById('tDots');
  let current = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(i));
    dotsWrap.appendChild(dot);
  });
  const dots = dotsWrap.querySelectorAll('span');

  function goToSlide(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  document.getElementById('tPrev').addEventListener('click', () => goToSlide(current - 1));
  document.getElementById('tNext').addEventListener('click', () => goToSlide(current + 1));

  let autoSlide = setInterval(() => goToSlide(current + 1), 6000);
  document.querySelector('.testimonial-slider').addEventListener('mouseenter', () => clearInterval(autoSlide));
  document.querySelector('.testimonial-slider').addEventListener('mouseleave', () => {
    autoSlide = setInterval(() => goToSlide(current + 1), 6000);
  });

  /* ================= Contact form (client-side only) ================= */
  const form = document.getElementById('contactForm');
  const formNote = document.getElementById('formNote');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      formNote.textContent = html.getAttribute('lang') === 'ar'
        ? 'من فضلك املأ كل الحقول المطلوبة بشكل صحيح.'
        : 'Please fill in all required fields correctly.';
      formNote.className = 'form-note error';
      return;
    }
    formNote.textContent = html.getAttribute('lang') === 'ar'
      ? 'شكراً لتواصلك معنا! سيقوم فريقنا بالرد عليك في أقرب وقت.'
      : 'Thank you for reaching out! Our team will get back to you shortly.';
    formNote.className = 'form-note success';
    form.reset();
  });

  /* ================= Back to top ================= */
  const backToTop = document.getElementById('backToTop');
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ================= Footer year ================= */
  document.getElementById('year').textContent = new Date().getFullYear();

});
