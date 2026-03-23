/* ============================================================
   MARTINIQUE – script.js
   Interactions : navbar scroll, reveal animations, mobile menu
   ============================================================ */

'use strict';

// ---- Navbar : fond au défilement ----
const navbar = document.getElementById('navbar');

function onScroll() {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', onScroll, { passive: true });

// ---- Menu mobile ----
const navToggle = document.getElementById('navToggle');
const navLinks  = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  navToggle.setAttribute(
    'aria-expanded',
    navLinks.classList.contains('open') ? 'true' : 'false'
  );
});

// Fermer le menu au clic sur un lien
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ---- Animations au défilement (Reveal) ----
const revealElements = document.querySelectorAll(
  '.card, .exp-card, .testimonial, .intro-stat, .culture-text, .culture-visual'
);

const REVEAL_MAX_DELAY = 4;

revealElements.forEach((el, i) => {
  el.classList.add('reveal');
  // Décalage pour un effet en cascade dans les grilles
  const delay = (i % REVEAL_MAX_DELAY) + 1;
  el.classList.add(`reveal-delay-${delay}`);
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ---- Formulaire de contact ----
const form = document.querySelector('.cta-form');

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name    = document.getElementById('name').value.trim();
    const email   = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();

    if (!name || !email || !message) {
      showNotification('Merci de remplir tous les champs obligatoires.', 'error');
      return;
    }

    if (!isValidEmail(email)) {
      showNotification('Veuillez entrer une adresse e-mail valide.', 'error');
      return;
    }

    // Simulation d'envoi
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';

    setTimeout(() => {
      form.reset();
      btn.disabled = false;
      btn.textContent = 'Envoyer ma demande';
      showNotification('Votre demande a bien été envoyée ! Nous vous répondrons sous 48h.', 'success');
    }, 1400);
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showNotification(message, type) {
  // Supprimer une notification existante
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.textContent = message;

  Object.assign(notification.style, {
    position:     'fixed',
    bottom:       '32px',
    right:        '32px',
    padding:      '16px 24px',
    borderRadius: '12px',
    fontSize:     '0.92rem',
    fontWeight:   '500',
    maxWidth:     '380px',
    zIndex:       '9999',
    boxShadow:    '0 8px 28px rgba(0,0,0,0.18)',
    fontFamily:   'Inter, system-ui, sans-serif',
    animation:    'slideInNotif 0.4s ease both',
    background:   type === 'success' ? '#2C4A3E' : '#C84B31',
    color:        '#F8F4EE',
  });

  // Ajouter l'animation CSS inline
  if (!document.getElementById('notif-style')) {
    const style = document.createElement('style');
    style.id = 'notif-style';
    style.textContent = `
      @keyframes slideInNotif {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    notification.style.opacity    = '0';
    notification.style.transform  = 'translateY(8px)';
    setTimeout(() => notification.remove(), 400);
  }, 4500);
}

// ---- Smooth scroll pour les ancres internes ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const targetId = anchor.getAttribute('href');
    if (targetId === '#') return;
    const target = document.querySelector(targetId);
    if (!target) return;
    e.preventDefault();
    const navH = navbar ? navbar.offsetHeight : 0;
    const top  = target.getBoundingClientRect().top + window.scrollY - navH - 16;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});
