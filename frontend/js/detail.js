// Page de détail d'une activité : charge les données depuis l'API et remplit le DOM.

/* Progress bar */
const progressBar = document.querySelector('.madras-bar');
function updateProgress() {
  const scrolled = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  const pct = total > 0 ? (scrolled / total) * 100 : 0;
  progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// Extrait la commune depuis le champ address (ex: "Le Prêcheur, Martinique" -> "Le Prêcheur")
function extractCommune(address) {
  if (!address) return '';
  return address.split(',')[0].trim();
}

// Mappe le tourist_score (1-5) vers un label de fréquentation
function scoreLabel(score) {
  if (score <= 1) return 'Très peu fréquentée';
  if (score === 2) return 'Peu fréquentée';
  if (score === 3) return 'Modérément fréquentée';
  if (score === 4) return 'Très fréquentée';
  return 'Très fréquentée';
}

// Traduit la durée en minutes vers un libellé lisible
function formatDuration(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

// Génère les dots HTML pour le score de fréquentation (petit format)
function buildDotsSmall(score) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<div class="dot-sm ${i <= score ? 'filled' : ''}"></div>`;
  }
  return html;
}

// Génère les dots inline pour la fiche pratique
function buildDotsRow(score) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<div class="dot-r ${i <= score ? 'on' : ''}"></div>`;
  }
  return html;
}

// Rempli les stat pills du hero pour une plage
function fillBeachHeroStats(beach_details) {
  const pills = document.querySelectorAll('.stat-pill');
  if (!pills.length) return;
  const score = beach_details ? beach_details.tourist_score : null;
  // Pill 0 : Fréquentation
  if (score !== null) {
    const dotsContainer = pills[0].querySelector('.score-dots-sm');
    if (dotsContainer) dotsContainer.innerHTML = buildDotsSmall(score);
    const valEl = pills[0].querySelector('.stat-pill-value');
    if (valEl) valEl.textContent = scoreLabel(score);
  }
}

// Rempli les stat pills du hero pour une randonnée
function fillHikeHeroStats(hike_details) {
  const pills = document.querySelectorAll('.stat-pill');
  if (!pills.length || !hike_details) return;
  if (pills[0]) {
    const valEl = pills[0].querySelector('.stat-pill-value');
    if (valEl) valEl.textContent = hike_details.difficulty || '-';
  }
  if (pills[1]) {
    const valEl = pills[1].querySelector('.stat-pill-value');
    if (valEl) valEl.textContent = hike_details.elevation_gain ? `D+ ${hike_details.elevation_gain} m` : '-';
  }
  if (pills[2]) {
    const valEl = pills[2].querySelector('.stat-pill-value');
    if (valEl) valEl.textContent = formatDuration(hike_details.duration) || '-';
  }
}

// Libelles francais des categories. Trois fonctions de la page en calculaient chacune
// une version, et celles qui ne connaissaient que "beach" et "hike" affichaient le code
// brut : "rum_distillery" dans le badge du bandeau, le titre de l'onglet et la fiche.
const LIBELLES_CATEGORIE = {
  beach: 'Plage',
  hike: 'Randonnée',
  rum_distillery: 'Rhumerie',
  restaurant: 'Restaurant',
  activity: 'Activité',
  event: 'Événement',
  accommodation: 'Logement',
};

function libelleCategorie(categorie) {
  return LIBELLES_CATEGORIE[categorie] || 'Activité';
}

// Echappe une valeur avant insertion via innerHTML. Les donnees viennent de la base,
// mais un horaire ou un numero contenant un chevron casserait la fiche.
function echapper(v) {
  return String(v).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Traduit des horaires au format OpenStreetMap ("Mo-Su 09:00-17:00") en français.
// Retourne la chaîne d'origine si le format n'est pas reconnu : mieux vaut afficher
// une information brute mais exacte qu'une traduction fausse.
const JOURS_OSM = { Mo: 'lundi', Tu: 'mardi', We: 'mercredi', Th: 'jeudi',
                    Fr: 'vendredi', Sa: 'samedi', Su: 'dimanche' };

function formatHoraires(osm) {
  if (!osm) return null;
  // "08:30" -> "8h30", "09:00" -> "9h"
  const heure = h => h.replace(/^0/, '').replace(':00', 'h').replace(':', 'h');

  const parties = osm.split(';').map(p => p.trim()).filter(Boolean).map(partie => {
    const m = partie.match(/^([A-Za-z]{2})(?:-([A-Za-z]{2}))?\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!m) return null;
    const [, j1, j2, h1, h2] = m;
    const creneau = `${heure(h1)}-${heure(h2)}`;
    if (j1 === 'Mo' && j2 === 'Su') return `tous les jours ${creneau}`;
    if (!j2) return `${JOURS_OSM[j1] || j1} ${creneau}`;
    return `du ${JOURS_OSM[j1] || j1} au ${JOURS_OSM[j2] || j2} ${creneau}`;
  });

  if (parties.some(p => p === null)) return osm;
  const texte = parties.join(', ');
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

// Rempli la fiche pratique de la sidebar selon le type d'activité
function fillFicheCard(activite) {
  const ficheHeader = document.querySelector('.fiche-header-sub');
  if (ficheHeader) {
    ficheHeader.textContent = `${activite.name} · ${libelleCategorie(activite.category)}`;
  }

  const ficheBody = document.querySelector('.fiche-body');
  if (!ficheBody) return;

  if (activite.category === 'beach' && activite.beach_details) {
    const bd = activite.beach_details;
    const score = bd.tourist_score || 0;
    ficheBody.innerHTML = `
      <div class="fiche-row">
        <span class="fiche-row-label">Fréquentation</span>
        <div class="score-inline">
          <div class="score-dots-row">${buildDotsRow(score)}</div>
          <span style="font-size:11px;color:var(--doux);">${scoreLabel(score)}</span>
        </div>
      </div>
      <div class="fiche-row">
        <span class="fiche-row-label">Équipements</span>
        <span class="fiche-row-value">${bd.amenities || '-'}</span>
      </div>
      <div class="fiche-row">
        <span class="fiche-row-label">Accès</span>
        <span class="fiche-row-value">Toute l'année</span>
      </div>`;
  } else if (activite.category === 'rum_distillery') {
    // Les donnees viennent d'OpenStreetMap, qui ne documente pas tout : un champ vide
    // s'affiche "Non renseigné" plutot que d'etre masque, pour qu'on sache qu'il manque.
    const rd = activite.rum_distillery_details || {};
    const vide = '<span class="fiche-row-value fiche-vide">Non renseigné</span>';

    const frequentation = rd.tourist_score != null
      ? `<div class="score-inline">
           <div class="score-dots-row">${buildDotsRow(rd.tourist_score)}</div>
           <span class="score-inline-label">${scoreLabel(rd.tourist_score)}</span>
         </div>`
      : vide;

    const horaires = rd.opening_hours
      ? `<span class="fiche-row-value">${echapper(formatHoraires(rd.opening_hours))}</span>`
      : vide;

    const acces = rd.visit_access
      ? `<span class="fiche-row-value">${echapper(rd.visit_access)}</span>`
      : vide;

    // Lien tel: pour composer directement le numero depuis un telephone
    const telephone = rd.phone
      ? `<a class="fiche-row-value fiche-lien" href="tel:${echapper(rd.phone.replace(/\s/g, ''))}">${echapper(rd.phone)}</a>`
      : vide;

    // pets_allowed vaut null quand l'information est inconnue, ce qui differe de false
    const animaux = rd.pets_allowed === true
      ? '<span class="fiche-row-value">Acceptés</span>'
      : rd.pets_allowed === false
        ? '<span class="fiche-row-value">Non acceptés</span>'
        : vide;

    ficheBody.innerHTML = `
      <div class="fiche-row">
        <span class="fiche-row-label">Fréquentation</span>
        ${frequentation}
      </div>
      <div class="fiche-row">
        <span class="fiche-row-label">Horaires</span>
        ${horaires}
      </div>
      <div class="fiche-row">
        <span class="fiche-row-label">Accès</span>
        ${acces}
      </div>
      <div class="fiche-row">
        <span class="fiche-row-label">Téléphone</span>
        ${telephone}
      </div>
      <div class="fiche-row">
        <span class="fiche-row-label">Animaux</span>
        ${animaux}
      </div>`;
  } else if (activite.category === 'hike' && activite.hike_details) {
    const hd = activite.hike_details;
    ficheBody.innerHTML = `
      <div class="fiche-row">
        <span class="fiche-row-label">Difficulté</span>
        <span class="fiche-row-value">${hd.difficulty || '-'}</span>
      </div>
      <div class="fiche-row">
        <span class="fiche-row-label">Durée</span>
        <span class="fiche-row-value">${formatDuration(hd.duration) || '-'}</span>
      </div>
      <div class="fiche-row">
        <span class="fiche-row-label">Dénivelé +</span>
        <span class="fiche-row-value">${hd.elevation_gain ? hd.elevation_gain + ' m' : '-'}</span>
      </div>
      <div class="fiche-row">
        <span class="fiche-row-label">Dénivelé -</span>
        <span class="fiche-row-value">${hd.elevation_loss ? hd.elevation_loss + ' m' : '-'}</span>
      </div>`;
  }
}

// Ouvre le lightbox sur une image donnée parmi la liste
function openLightbox(urls, startIndex) {
  let current = startIndex;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';

  const inner = document.createElement('div');
  inner.className = 'lightbox-inner';

  const img = document.createElement('img');
  img.className = 'lightbox-img';
  img.src = urls[current];

  const close = document.createElement('button');
  close.className = 'lightbox-close';
  close.innerHTML = '✕';

  const counter = document.createElement('div');
  counter.className = 'lightbox-counter';

  function updateView() {
    img.src = urls[current];
    counter.textContent = urls.length > 1 ? `${current + 1} / ${urls.length}` : '';
  }

  inner.appendChild(img);
  overlay.appendChild(inner);
  overlay.appendChild(close);

  if (urls.length > 1) {
    const prev = document.createElement('button');
    prev.className = 'lightbox-nav lightbox-prev';
    prev.innerHTML = '‹';
    prev.addEventListener('click', (e) => {
      e.stopPropagation();
      current = (current - 1 + urls.length) % urls.length;
      updateView();
    });

    const next = document.createElement('button');
    next.className = 'lightbox-nav lightbox-next';
    next.innerHTML = '›';
    next.addEventListener('click', (e) => {
      e.stopPropagation();
      current = (current + 1) % urls.length;
      updateView();
    });

    overlay.appendChild(prev);
    overlay.appendChild(next);
    overlay.appendChild(counter);
  }

  document.body.appendChild(overlay);

  // Déclenche l'animation d'ouverture après insertion dans le DOM
  requestAnimationFrame(() => overlay.classList.add('open'));

  function closeLightbox() {
    overlay.classList.remove('open');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  }

  close.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLightbox(); });
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { closeLightbox(); document.removeEventListener('keydown', onKey); }
    if (e.key === 'ArrowLeft' && urls.length > 1) { current = (current - 1 + urls.length) % urls.length; updateView(); }
    if (e.key === 'ArrowRight' && urls.length > 1) { current = (current + 1) % urls.length; updateView(); }
  });

  updateView();
}

// Rempli la galerie photos avec les images de l'API (ou laisse les placeholders si vide)
function fillGallery(images) {
  const grid = document.querySelector('.gallery-grid');
  if (!grid || images.length === 0) return;

  const urls = images.map(img => img.url);

  grid.innerHTML = images.map((img, i) => `
    <div class="gallery-item" data-index="${i}">
      <div class="gallery-item-bg" style="background-image:url('${img.url}');background-size:cover;background-position:center;"></div>
    </div>`).join('');

  grid.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => openLightbox(urls, parseInt(item.dataset.index)));
  });
}

// Rempli la section accès avec les infos disponibles (address / amenities)
function fillAccessGrid(activite) {
  const grid = document.querySelector('.access-grid');
  if (!grid) return;

  const commune = extractCommune(activite.address);
  let items = [];

  if (activite.category === 'beach' && activite.beach_details) {
    items.push({ icon: '📍', label: 'Commune', value: commune || '-' });
    items.push({ icon: '🏖️', label: 'Équipements', value: activite.beach_details.amenities || '-' });
  } else if (activite.category === 'hike' && activite.hike_details) {
    items.push({ icon: '📍', label: 'Départ', value: commune || '-' });
    items.push({ icon: '🥾', label: 'Difficulté', value: activite.hike_details.difficulty || '-' });
    items.push({ icon: '⏱️', label: 'Durée estimée', value: formatDuration(activite.hike_details.duration) || '-' });
  } else {
    items.push({ icon: '📍', label: 'Adresse', value: activite.address || '-' });
  }

  grid.innerHTML = items.map(it => `
    <div class="access-item">
      <span class="access-icon">${it.icon}</span>
      <div>
        <p class="access-label">${it.label}</p>
        <p class="access-value">${it.value}</p>
      </div>
    </div>`).join('');
}

// Rempli le breadcrumb selon le type d'activité
function fillBreadcrumb(activite) {
  const bc = document.querySelector('.breadcrumb-inner');
  if (!bc) return;
  const typeLabel = { beach: 'Plages', hike: 'Randonnées', rum_distillery: 'Rhumeries' }[activite.category] || 'Activités';
  bc.innerHTML = `
    <a href="accueil.html">Accueil</a>
    <span class="breadcrumb-sep">›</span>
    <a href="catalogue.html">Catalogue</a>
    <span class="breadcrumb-sep">›</span>
    <a href="catalogue.html">${typeLabel}</a>
    <span class="breadcrumb-sep">›</span>
    <span class="breadcrumb-current">${activite.name}</span>`;
}

// Injecte un lien "Retour au catalogue" (history.back) après le breadcrumb
function injectBackButton() {
  const breadcrumb = document.querySelector('.breadcrumb');
  if (!breadcrumb || document.querySelector('.back-to-catalogue')) return;
  const btn = document.createElement('button');
  btn.className = 'back-to-catalogue';
  btn.textContent = ' Retour au catalogue';
  btn.addEventListener('click', () => history.back());
  // Insère le bouton juste après la section breadcrumb
  breadcrumb.insertAdjacentElement('afterend',
    Object.assign(document.createElement('div'), {
      style: 'padding: 8px 6%; background: var(--sable); border-bottom: 1px solid rgba(0,0,0,0.05);',
    })
  );
  breadcrumb.nextElementSibling.appendChild(btn);
}

// Applique la couleur d'accent selon le type (beach = bleu, hike = vert)
function applyTypeAccent(category) {
  // Couleurs par categorie, tirees du design system Madras : bleu pour la mer,
  // vert pour la foret, rouge pour le rhum.
  const ACCENTS = {
    beach:          { accent: '#1A5C8A', fond: 'rgba(26,92,138,.75)', texte: '#B8ECF7' },
    hike:           { accent: '#1D7A4E', fond: 'rgba(29,122,78,.75)', texte: '#ADFFD7' },
    // Fond plus opaque que les deux autres : le rouge sur une photo claire tombait
    // sous le seuil de lisibilite (2,98:1). A 0,92 et en blanc pur : 4,58:1.
    rum_distillery: { accent: '#C8392B', fond: 'rgba(200,57,43,.92)', texte: '#FFFFFF' },
  };
  const couleurs = ACCENTS[category];
  if (!couleurs) return;

  const accentColor = couleurs.accent;
  const badgeBg = couleurs.fond;
  const badgeText = couleurs.texte;

  // Couleur du badge hero (type de l'activite)
  const heroBadge = document.querySelector('.hero-badge');
  if (heroBadge) {
    heroBadge.style.background = badgeBg;
    heroBadge.style.color = badgeText;
  }

  // Bordure de l'en-tete de la fiche pratique
  const ficheHeader = document.querySelector('.fiche-header');
  if (ficheHeader) {
    ficheHeader.style.borderBottomColor = accentColor;
  }
}

// Affiche ou masque le bloc alerte sargasses selon le type d'activite
function handleAlerteCard(category) {
  const alerteCard = document.querySelector('.alerte-card');
  if (!alerteCard) return;
  // Le bloc sargasses n'est pertinent que pour les plages
  alerteCard.style.display = category === 'beach' ? '' : 'none';
}

// Affiche le checkmark a cote du bouton "Ajouter" et attache la bulle de projets
function showCheckmark(projectNames) {
  // Evite les doublons
  if (document.querySelector('.checkmark-btn')) return;

  const btn = document.querySelector('.cta-voyage');
  if (!btn) return;

  // Enveloppe le bouton dans une row pour aligner checkmark
  if (!btn.parentElement.classList.contains('cta-voyage-row')) {
    const row = document.createElement('div');
    row.className = 'cta-voyage-row';
    btn.parentNode.insertBefore(row, btn);
    row.appendChild(btn);
  }

  // Cree le bouton checkmark
  const checkmark = document.createElement('button');
  checkmark.className = 'checkmark-btn';
  checkmark.title = 'Cette activité est dans un de vos projets';
  checkmark.textContent = '✓';

  // Cree la bulle listant les projets
  const bubble = document.createElement('div');
  bubble.className = 'checkmark-bubble';
  bubble.innerHTML = `
    <p>Dans vos projets :</p>
    <ul>${projectNames.map(n => `<li>${n}</li>`).join('')}</ul>
  `;
  document.body.appendChild(bubble);

  // Positionnement de la bulle sous le checkmark
  function positionBubble() {
    const rect = checkmark.getBoundingClientRect();
    bubble.style.top = (rect.bottom + 8) + 'px';
    bubble.style.left = rect.left + 'px';
  }

  // Clic sur le checkmark : ouvre/ferme la bulle
  checkmark.addEventListener('click', (e) => {
    e.stopPropagation();
    positionBubble();
    bubble.classList.toggle('open');
  });

  // Clic ailleurs : ferme la bulle
  document.addEventListener('click', () => bubble.classList.remove('open'));

  btn.parentElement.appendChild(checkmark);
}

// Verifie si l'activite est deja dans un projet de l'utilisateur connecte
async function checkAlreadyInProject(activiteId) {
  if (!getToken()) return; // Non connecte : pas de checkmark
  try {
    const res = await fetch(`${API_URL}/projets`, { headers: getAuthHeaders() });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) return;
    const projets = await res.json();
    // Filtre les projets qui contiennent cette activite
    const projectsWithActivity = projets.filter(p =>
      p.items.some(item => item.activity_id === activiteId)
    );
    if (projectsWithActivity.length > 0) {
      showCheckmark(projectsWithActivity.map(p => p.name));
    }
  } catch (_) {
    // Pas de réseau : on ignore silencieusement
  }
}

// Charge et affiche le détail d'une activité depuis l'API
async function loadActivite(id) {
  try {
    const res = await fetch(`${API_URL}/activites/${id}`);
    if (!res.ok) {
      const err = await res.json();
      document.querySelector('.hero-title').textContent = err.detail || 'Activité introuvable';
      return;
    }
    const activite = await res.json();
    const commune = extractCommune(activite.address);
    const typeLabel = libelleCategorie(activite.category);

    // Titre de la page
    document.title = `${activite.name} : ${typeLabel} - Martinique`;

    // Photo de fond du hero
    // Le code visait .detail-hero, une classe absente du HTML : la photo n'etait donc
    // jamais posee, et toutes les activites affichaient le degrade d'ocean par defaut.
    // L'URL passe par une variable CSS pour que le style reste dans la feuille.
    if (activite.image_url) {
      const heroBg = document.querySelector('.hero-bg');
      if (heroBg) {
        const url = activite.image_url.replace(/"/g, '%22');
        heroBg.style.setProperty('--hero-photo', `url("${url}")`);
        heroBg.classList.add('avec-photo');
      }
    }

    // Hero
    const heroBadge = document.querySelector('.hero-badge');
    if (heroBadge) heroBadge.textContent = typeLabel;

    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) heroTitle.textContent = activite.name;

    const heroLocation = document.querySelector('.hero-location');
    if (heroLocation) heroLocation.textContent = commune;

    // Stat pills selon le type
    if (activite.category === 'beach') {
      fillBeachHeroStats(activite.beach_details);
    } else if (activite.category === 'hike') {
      fillHikeHeroStats(activite.hike_details);
    }

    // Breadcrumb et lien retour
    fillBreadcrumb(activite);
    injectBackButton();

    // Couleur d'accent selon le type (beach = bleu, hike = vert)
    applyTypeAccent(activite.category);

    // Masque l'alerte sargasses pour les randonnees
    handleAlerteCard(activite.category);

    // Description
    const descSection = document.querySelector('.description');
    if (descSection && activite.description) {
      descSection.innerHTML = `<p>${activite.description}</p>`;
    }

    // Coordonnées GPS
    const coords = document.querySelector('.map-coords');
    if (coords) {
      coords.textContent = `${activite.latitude.toFixed(4)}° N, ${Math.abs(activite.longitude).toFixed(4)}° O`;
    }

    // Galerie photos
    fillGallery(activite.images || []);

    // Section accès
    fillAccessGrid(activite);

    // Fiche pratique sidebar
    fillFicheCard(activite);

    // Bouton "Ajouter à mon voyage" + checkmark si deja dans un projet
    setupCtaVoyage(activite.id);
    await checkAlreadyInProject(activite.id);

    // Bouton "Sauvegarder" : bientôt disponible
    const ctaSecondary = document.querySelector('.cta-secondary');
    if (ctaSecondary) {
      ctaSecondary.setAttribute('title', 'Bientôt disponible');
      ctaSecondary.addEventListener('click', (e) => {
        e.preventDefault();
        showInlineMessage(ctaSecondary, 'Fonctionnalité bientôt disponible.');
      });
    }

  } catch (_) {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) heroTitle.textContent = 'Impossible de charger les données.';
  }
}

// Affiche un message temporaire inline sous un bouton
function showInlineMessage(btn, msg) {
  let el = btn.nextElementSibling;
  if (!el || !el.classList.contains('inline-msg')) {
    el = document.createElement('p');
    // inline-msg sert de marqueur pour retrouver l'element au prochain appel,
    // cta-message porte l'apparence : les deux sont necessaires.
    el.className = 'inline-msg cta-message';
    btn.parentNode.insertBefore(el, btn.nextSibling);
  }
  el.textContent = msg;
}

// Gestion du bouton "Ajouter à mon voyage"
function setupCtaVoyage(activiteId) {
  const btn = document.querySelector('.cta-voyage');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const token = getToken();
    if (!token) {
      window.location.href = 'auth.html';
      return;
    }
    // Charge les projets de l'utilisateur et affiche la modale
    await openProjetModal(activiteId);
  });
}

// Ouvre une modale simple pour choisir un projet
async function openProjetModal(activiteId) {
  // Supprime une éventuelle modale précédente
  const existing = document.getElementById('modal-voyage');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-voyage';
  modal.className = 'modal-overlay';

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25);">
      <h3 style="margin:0 0 16px;font-size:18px;">Ajouter à mon voyage</h3>
      <div id="modal-projets-list" style="display:flex;flex-direction:column;gap:8px;min-height:48px;">
        <p style="color:#666;font-size:14px;">Chargement...</p>
      </div>
      <button id="modal-close" style="margin-top:20px;padding:10px 20px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer;width:100%;">Annuler</button>
    </div>`;

  document.body.appendChild(modal);
  document.getElementById('modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  try {
    const res = await fetch(`${API_URL}/projets`, { headers: getAuthHeaders() });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) throw new Error();
    const projets = await res.json();

    const list = document.getElementById('modal-projets-list');
    if (projets.length === 0) {
      list.innerHTML = `
        <p style="color:#666;font-size:14px;">Aucun projet. <a href="espace-personnel.html" style="color:var(--bleu);">Créer un projet</a></p>`;
    } else {
      list.innerHTML = projets.map(p => `
        <button class="modal-projet-btn" data-id="${p.id}"
          style="padding:12px 16px;border:1px solid #e5e5e5;border-radius:10px;cursor:pointer;
                 text-align:left;background:#fff;font-size:14px;transition:background .15s;">
          <strong>${p.name}</strong>
          ${p.start_date ? `<br><span style="color:#888;font-size:12px;">${p.start_date}</span>` : ''}
        </button>`).join('');

      list.querySelectorAll('.modal-projet-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const projetId = btn.dataset.id;
          btn.disabled = true;
          btn.textContent = 'Ajout en cours...';
          await addToProjet(activiteId, projetId, modal);
        });
      });
    }
  } catch (_) {
    document.getElementById('modal-projets-list').innerHTML =
      '<p style="color:var(--rouge);font-size:14px;">Impossible de charger les projets.</p>';
  }
}

// Ajoute l'activité au projet sélectionné via POST /projets/{id}/activites
async function addToProjet(activiteId, projetId, modal) {
  try {
    const res = await fetch(`${API_URL}/projets/${projetId}/activites`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_id: activiteId }),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Erreur');
    }
    modal.remove();
    // Affiche le checkmark a la place du message textuel
    const updatedProjets = await fetch(`${API_URL}/projets`, { headers: getAuthHeaders() });
    if (updatedProjets.ok) {
      const all = await updatedProjets.json();
      const withActivity = all.filter(p => p.items.some(item => item.activity_id === activiteId));
      if (withActivity.length > 0) {
        showCheckmark(withActivity.map(p => p.name));
      }
    } else {
      showInlineMessage(document.querySelector('.cta-voyage'), 'Activité ajoutée au voyage !');
    }
  } catch (err) {
    const list = document.getElementById('modal-projets-list');
    if (list) {
      list.insertAdjacentHTML('beforeend',
        `<p style="color:var(--rouge);font-size:13px;">${err.message}</p>`);
    }
  }
}

// Point d'entrée : récupère l'id depuis l'URL et charge l'activité
document.addEventListener('DOMContentLoaded', async () => {
  await updateNav();

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  // finally : la page doit etre revelee aussi quand l'id manque ou que l'API echoue,
  // sinon elle resterait masquee indefiniment.
  try {
    if (!id) {
      document.querySelector('.hero-title').textContent = 'Activité introuvable';
      return;
    }
    await loadActivite(id);
  } finally {
    document.body.classList.remove('chargement');
  }
});