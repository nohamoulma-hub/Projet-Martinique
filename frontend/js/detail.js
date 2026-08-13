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

// Rempli la fiche pratique de la sidebar selon le type d'activité
function fillFicheCard(activite) {
  const ficheHeader = document.querySelector('.fiche-header-sub');
  if (ficheHeader) {
    const typeLabel = activite.category === 'beach' ? 'Plage' : activite.category === 'hike' ? 'Randonnée' : activite.category;
    ficheHeader.textContent = `${activite.name} · ${typeLabel}`;
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
  const typeLabel = activite.category === 'beach' ? 'Plages' : activite.category === 'hike' ? 'Randonnées' : 'Activités';
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
  const isBeach = category === 'beach';
  const isHike = category === 'hike';

  if (!isBeach && !isHike) return;

  const accentColor = isBeach ? '#1A5C8A' : '#1D7A4E';
  const badgeBg = isBeach ? 'rgba(26,92,138,.75)' : 'rgba(29,122,78,.75)';
  const badgeText = isBeach ? '#B8ECF7' : '#ADFFD7';

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
    const typeLabel = activite.category === 'beach' ? 'Plage' : activite.category === 'hike' ? 'Randonnée' : activite.category;

    // Titre de la page
    document.title = `${activite.name} : ${typeLabel} - Martinique`;

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
    el.className = 'inline-msg';
    el.style.cssText = 'font-size:13px;color:var(--bleu,#1A5C8A);margin-top:6px;text-align:center;';
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
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;
    display:flex;align-items:center;justify-content:center;padding:20px;`;

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
  if (!id) {
    document.querySelector('.hero-title').textContent = 'Activité introuvable';
    return;
  }
  loadActivite(id);
});