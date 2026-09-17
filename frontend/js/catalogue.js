// Catalogue des activités : filtrages, recherche et affichage dynamique depuis l'API.

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

// Catégories supportées par l'API v1
const SUPPORTED_CATEGORIES = {
  'Tout voir': null,
  'Plages': 'beach',
  'Randonnées': 'hike',
  'Rhumeries': 'rum_distillery',
};

// Catégories hors scope v1 : au clic, affiche un message dans la grille
const UNSUPPORTED_LABELS = ['Restaurants', 'Activités', 'Événements', 'Logements', 'Marché'];

// Etat courant du catalogue
let currentFilter = null;    // valeur de la categorie API
let currentSearch = '';      // terme de recherche
let currentPageNum = 1;
let currentSort = 'nom';
let isLoading = false;
let reloadPending = false;   // un rechargement demande pendant un chargement en cours
let currentCommune = '';     // commune du filtre de proximite, vide si inactif
let currentRayon = 10;       // rayon autour de la commune, en km
let communesLoaded = false;

// Mappe le tourist_score (1-5) vers un label de fréquentation
function scoreLabel(score) {
  if (score <= 1) return 'Très peu fréquentée';
  if (score === 2) return 'Peu fréquentée';
  if (score === 3) return 'Modérément fréquentée';
  if (score === 4) return 'Très fréquentée';
  return 'Très fréquentée';
}

// Génère les dots de fréquentation pour les plages
function buildScoreDots(score) {
  let dots = '';
  for (let i = 1; i <= 5; i++) {
    dots += `<div class="dot ${i <= score ? 'filled' : ''}"></div>`;
  }
  return dots;
}

// Traduit le niveau de difficulté en classe CSS
function diffClass(difficulty) {
  if (!difficulty) return 'diff-easy';
  const d = difficulty.toLowerCase();
  if (d === 'facile') return 'diff-easy';
  if (d === 'difficile') return 'diff-hard';
  return 'diff-med';
}

// Traduit la durée en minutes vers un libellé lisible
function formatDuration(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

// Extrait la commune du champ address. Celui-ci peut se limiter a la commune
// ("Le Prêcheur, Martinique") ou porter une adresse complete
// ("Route de Belfond, 97221 Le Carbet, Martinique") : on lit la derniere partie
// avant "Martinique" et on retire le code postal.
function extractCommune(address) {
  if (!address) return '';
  const parties = address.split(',').map(p => p.trim()).filter(Boolean);
  const sansPays = parties.filter(p => !/^martinique$/i.test(p));
  const derniere = sansPays[sansPays.length - 1] || parties[0] || '';
  return derniere.replace(/^\d{5}\s*/, '').trim();
}

// Libelles affiches sous le nom de chaque vignette, a la place du code de l'API
const CATEGORY_LABELS = {
  beach: 'Plage',
  hike: 'Randonnée',
  rum_distillery: 'Rhumerie',
  restaurant: 'Restaurant',
};

// Classe qui donne a la vignette son fond de secours quand elle n'a pas de photo
const CATEGORY_CLASSES = {
  beach: 'cat-beach',
  hike: 'cat-hike',
  rum_distillery: 'cat-rum',
  restaurant: 'cat-resto',
};

// Construit le HTML d'une card activité selon son type
function buildCard(item) {
  const commune = extractCommune(item.address);
  const isBeach = item.category === 'beach';
  const isHike = item.category === 'hike';

  let metaHtml = '';
  if (isBeach && item.beach_details) {
    const score = item.beach_details.tourist_score || 0;
    metaHtml = `
      <div class="card-meta">
        <div class="tourist-score">
          <span class="meta-icon">👥</span>
          <div class="score-dots">${buildScoreDots(score)}</div>
          <span class="score-label">${scoreLabel(score)}</span>
        </div>
      </div>`;
  } else if (isHike && item.hike_details) {
    const hd = item.hike_details;
    const cls = diffClass(hd.difficulty);
    const diffLabel = hd.difficulty || 'Moyen';
    const diffColor = cls === 'diff-easy' ? 'var(--vert)' : cls === 'diff-hard' ? 'var(--rouge)' : 'var(--jaune)';
    const dur = formatDuration(hd.duration);
    const gain = hd.elevation_gain ? `D+ ${hd.elevation_gain} m` : '';
    const loss = hd.elevation_loss ? `D- ${hd.elevation_loss} m` : '';
    metaHtml = `
      <div class="card-meta">
        <div class="difficulty-bar ${cls}">
          <span class="meta-icon">⚡</span>
          <div class="diff-track"><div class="diff-fill"></div></div>
          <span style="font-size:12px;color:${diffColor};font-weight:500;">${diffLabel}</span>
        </div>
      </div>
      <div class="card-meta">
        ${dur ? `<span class="meta-item"><span class="meta-icon">⏱️</span> ${dur}</span>` : ''}
        ${gain ? `<span class="meta-item"><span class="meta-icon">↑</span> ${gain}</span>` : ''}
        ${loss ? `<span class="meta-item"><span class="meta-icon">↓</span> ${loss}</span>` : ''}
      </div>`;
  }

  const icon = isBeach ? '🏖️' : isHike ? '🥾' : '📍';
  const categoryLabel = CATEGORY_LABELS[item.category] || item.category;
  const cardClass = CATEGORY_CLASSES[item.category] || '';

  const PLACEHOLDER_NAMES = ['Gorges de la Falaise'];
  const isPlaceholder = PLACEHOLDER_NAMES.includes(item.name);

  const bgStyle = item.image_url
    ? `background-image:url('${item.image_url}');background-size:cover;background-position:center;`
    : '';

  return `
    <article class="card ${cardClass}">
      <div class="card-visual">
        <div class="card-visual-bg" style="${bgStyle}"></div>
        <div class="card-icon">${item.image_url ? '' : icon}</div>
        ${isPlaceholder ? '<span class="card-badge-placeholder">à modifier</span>' : ''}
      </div>
      <div class="card-body">
        <div class="card-heading">
          <h2 class="card-name">${item.name}</h2>
          <p class="card-category">${categoryLabel}</p>
        </div>
        <p class="card-desc">${item.description || ''}</p>
        ${metaHtml}
      </div>
      <div class="card-footer">
        <span class="card-location">📍 ${commune}${formatDistance(item.distance_km)}</span>
        <a href="detail.html?id=${item.id}" class="card-cta">Voir le détail →</a>
      </div>
    </article>`;
}

// Distance affichee a cote de la commune quand le filtre de proximite est actif
function formatDistance(distanceKm) {
  if (distanceKm === undefined || distanceKm === null) return '';
  return ` · ${String(distanceKm).replace('.', ',')} km`;
}

// Affiche un message "Bientôt disponible" dans la grille
function showComingSoon(label) {
  const grid = document.querySelector('.catalogue-grid');
  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
      <p style="font-size:28px;margin-bottom:12px;">🔜</p>
      <p style="font-size:18px;font-weight:600;color:var(--nuit);">${label}</p>
      <p style="color:#666;margin-top:8px;">Cette catégorie arrive bientôt.</p>
    </div>`;
  document.querySelector('.results-count').innerHTML = '<strong>Bientôt disponible</strong>';
  // Ce chemin n'appelle pas loadActivites (cas ?filtre=rhumeries au chargement).
  // Sans cette ligne, le marqueur ne serait jamais leve et la page resterait masquee.
  document.body.classList.remove('chargement');
}

// Charge et affiche les activités depuis l'API
async function loadActivites(append = false) {
  if (isLoading) {
    // Un changement de filtre pendant un chargement ne doit pas etre perdu
    if (!append) reloadPending = true;
    return;
  }
  isLoading = true;

  const grid = document.querySelector('.catalogue-grid');
  if (!append) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#666;">Chargement...</div>';
  }

  const params = new URLSearchParams();
  if (currentFilter) params.set('categorie', currentFilter);
  if (currentSearch) params.set('search', currentSearch);
  params.set('page', currentPageNum);
  params.set('sort', currentSort);
  // Autour d'une commune, l'API trie par distance : le choix de tri n'a plus d'effet
  const sortSelect = document.querySelector('.sort-select');
  if (sortSelect) {
    sortSelect.disabled = currentCommune !== '';
    sortSelect.title = currentCommune ? 'Résultats triés par distance' : '';
  }
  if (currentCommune) {
    params.set('commune', currentCommune);
    params.set('rayon', currentRayon);
  }

  try {
    const res = await fetch(`${API_URL}/activites?${params}`);
    if (!res.ok) throw new Error((await res.json()).detail || 'Erreur serveur');
    const data = await res.json();
    const items = data.items || [];

    if (!append) grid.innerHTML = '';

    if (items.length === 0 && !append) {
      const message = currentCommune
        ? `Aucune activité à moins de ${currentRayon} km de ${currentCommune}. Essayez un rayon plus large.`
        : 'Aucune activité trouvée.';
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#666;">${message}</div>`;
    } else {
      items.forEach(item => {
        grid.insertAdjacentHTML('beforeend', buildCard(item));
      });
    }

    // Compteur de résultats
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      const lieu = currentCommune
        ? `à ${currentRayon} km de ${currentCommune}`
        : 'Martinique';
      countEl.innerHTML = `<strong>${data.total} résultat${data.total > 1 ? 's' : ''}</strong> · ${lieu}`;
    }

    // Bouton "Voir plus" si pagination
    const existingMore = document.getElementById('load-more-btn');
    if (existingMore) existingMore.remove();

    if (data.has_more) {
      const btn = document.createElement('div');
      btn.className = 'load-more-wrap';
      btn.innerHTML = '<button id="load-more-btn" style="padding:12px 32px;background:var(--rouge);color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer;">Voir plus</button>';
      grid.appendChild(btn);
      document.getElementById('load-more-btn').addEventListener('click', () => {
        currentPageNum++;
        loadActivites(true);
      });
    }
  } catch (err) {
    if (!append) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--rouge);">Impossible de charger les activités. ${err.message}</div>`;
    }
  } finally {
    isLoading = false;
    // Le premier chargement leve le marqueur, quel que soit le resultat.
    // append vaut true pour "Voir plus" : le contenu est deja visible a ce moment.
    if (!append) document.body.classList.remove('chargement');
    if (reloadPending) {
      reloadPending = false;
      currentPageNum = 1;
      loadActivites();
    }
  }
}

// Nom de filtre utilise dans l'URL, inverse de la table du parametre ?filtre=
const FILTRES_URL = { beach: 'plages', hike: 'randonnees', rum_distillery: 'rhumeries' };

// Recopie l'etat des filtres dans l'URL. Sans cela, revenir depuis une fiche par le bouton
// precedent du navigateur rouvrait le catalogue sans filtre.
function syncUrl() {
  const params = new URLSearchParams();
  if (currentFilter && FILTRES_URL[currentFilter]) params.set('filtre', FILTRES_URL[currentFilter]);
  if (currentCommune) {
    params.set('commune', currentCommune);
    params.set('rayon', currentRayon);
  }
  const query = params.toString();
  // replaceState et non pushState : un clic sur un filtre ne doit pas ajouter une etape
  // a l'historique, sinon le bouton precedent reculerait filtre par filtre.
  history.replaceState(null, '', query ? `?${query}` : location.pathname);
}

// Gestion des clics sur les boutons de filtre
function setFilter(btn) {
  // Le bouton "Par commune" a son propre etat : il n'est pas une categorie
  document.querySelectorAll('.filter-btn:not(.filter-btn-commune)').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const label = btn.textContent.replace(/^[^\w\s]+\s*/, '').trim(); // retire l'emoji du début
  const cleanLabel = btn.textContent.trim().replace(/^[\p{Emoji}\s]+/u, '').trim();

  // Détecte si le filtre est hors scope v1
  const isUnsupported = UNSUPPORTED_LABELS.some(ul => btn.textContent.includes(ul.replace(/^\p{Emoji}\s*/u, '')));

  if (isUnsupported) {
    const rawLabel = btn.textContent.trim();
    showComingSoon(`${rawLabel} — bientôt disponible`);
    return;
  }

  // "Tout voir" retire aussi le filtre de proximite
  if (btn.textContent.includes('Tout voir')) closeCommunePanel(false);

  // Détermine la categorie API à partir du texte du bouton
  currentFilter = null;
  if (btn.textContent.includes('Plage')) currentFilter = 'beach';
  else if (btn.textContent.includes('Randon')) currentFilter = 'hike';
  else if (btn.textContent.includes('Rhumerie')) currentFilter = 'rum_distillery';

  currentPageNum = 1;
  currentSearch = document.querySelector('.search-input').value.trim();
  syncUrl();
  loadActivites();
}

// Remplit la liste des communes depuis l'API, une seule fois
async function loadCommunes() {
  if (communesLoaded) return;
  const select = document.getElementById('commune-select');
  try {
    const res = await fetch(`${API_URL}/activites/communes`);
    if (!res.ok) throw new Error();
    const communes = await res.json();
    communes.forEach(nom => select.add(new Option(nom, nom)));
    communesLoaded = true;
  } catch (err) {
    // Panne rendue visible : sans cela, la liste reste muette et semble simplement vide
    select.options[0].textContent = 'Communes indisponibles, réessayer';
    console.error('Chargement des communes impossible :', err);
  }
}

// Ouvre le panneau de proximite
function openCommunePanel() {
  document.getElementById('commune-panel').hidden = false;
  const btn = document.getElementById('btn-commune');
  btn.setAttribute('aria-expanded', 'true');
  btn.classList.add('active');
  loadCommunes();
}

// Ferme le panneau et retire le filtre de proximite. reload vaut false quand
// l'appelant recharge deja la liste lui-meme.
function closeCommunePanel(reload = true) {
  document.getElementById('commune-panel').hidden = true;
  const btn = document.getElementById('btn-commune');
  btn.setAttribute('aria-expanded', 'false');
  btn.classList.remove('active');
  resetCommune(reload);
}

// Vide la commune choisie et recharge si un filtre etait actif
function resetCommune(reload = true) {
  const avaitFiltre = currentCommune !== '';
  currentCommune = '';
  document.getElementById('commune-select').value = '';
  if (reload && avaitFiltre) {
    currentPageNum = 1;
    syncUrl();
    loadActivites();
  }
}

// Branche le bouton, la liste et la barre de rayon
function initCommuneFilter() {
  const btn = document.getElementById('btn-commune');
  const select = document.getElementById('commune-select');
  const range = document.getElementById('rayon-range');
  const valeur = document.getElementById('rayon-valeur');

  btn.addEventListener('click', () => {
    if (document.getElementById('commune-panel').hidden) openCommunePanel();
    else closeCommunePanel();
  });

  select.addEventListener('change', () => {
    currentCommune = select.value;
    currentPageNum = 1;
    syncUrl();
    loadActivites();
  });

  // La valeur s'affiche pendant le glissement, la liste se recharge au relachement
  range.addEventListener('input', () => { valeur.textContent = `${range.value} km`; });
  range.addEventListener('change', () => {
    currentRayon = Number(range.value);
    if (!currentCommune) return;
    currentPageNum = 1;
    syncUrl();
    loadActivites();
  });

  document.getElementById('commune-reset').addEventListener('click', () => resetCommune());
}

// Reapplique une commune et un rayon venus de l'URL, sans declencher de chargement :
// l'appelant charge la liste une seule fois, ensuite.
async function restaurerCommune(commune, rayon) {
  if (!commune) return;
  await loadCommunes();
  const select = document.getElementById('commune-select');
  // Commune inconnue ou liste indisponible : on ignore le parametre
  if (![...select.options].some(o => o.value === commune)) return;

  currentCommune = commune;
  select.value = commune;
  if (rayon >= 5 && rayon <= 50) {
    currentRayon = rayon;
    document.getElementById('rayon-range').value = rayon;
    document.getElementById('rayon-valeur').textContent = `${rayon} km`;
  }
  openCommunePanel();
}

// Recherche textuelle
let searchTimer = null;
function handleSearch() {
  const term = document.querySelector('.search-input').value.trim();
  currentSearch = term;
  currentPageNum = 1;
  loadActivites();
}

// Tri
function handleSort(select) {
  const val = select.value;
  if (val.includes('Popularité')) currentSort = 'popularite';
  else currentSort = 'nom';
  currentPageNum = 1;
  loadActivites();
}

// Initialisation après chargement du DOM
document.addEventListener('DOMContentLoaded', async () => {
  // Navigation selon l'état de connexion
  await updateNav();

  initCommuneFilter();
  loadCommunes();

  // Restaure le filtre de proximite depuis l'URL avant de charger, pour que le retour
  // arriere depuis une fiche retrouve l'ecran tel qu'il etait.
  const urlParams = new URLSearchParams(window.location.search);
  await restaurerCommune(urlParams.get('commune'), Number(urlParams.get('rayon')));

  // Applique le filtre depuis l'URL (?filtre=plages, randonnees, etc.) si présent
  const filtreParam = urlParams.get('filtre');
  if (filtreParam) {
    const map = {
      plages: 'Plage',
      randonnees: 'Randon',
      rhumeries: 'Rhumerie',
      restaurants: 'Restau',
      activites: 'Activit',
      logements: 'Logement',
    };
    const keyword = map[filtreParam.toLowerCase()];
    if (keyword) {
      const btn = [...document.querySelectorAll('.filter-btn')]
        .find(b => b.textContent.includes(keyword));
      if (btn) { setFilter(btn); }
      else { loadActivites(); }
    } else {
      loadActivites();
    }
  } else {
    // Chargement initial des activités
    loadActivites();
  }

  // Barre de recherche : saisie (debounce 400ms) ou bouton
  const searchInput = document.querySelector('.search-input');
  const searchBtn = document.querySelector('.search-btn');

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const term = searchInput.value.trim();
    // Déclenche uniquement à partir de 3 caractères ou si vide (reset)
    if (term.length === 0 || term.length >= 3) {
      searchTimer = setTimeout(handleSearch, 400);
    }
  });

  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Tri
  const sortSelect = document.querySelector('.sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => handleSort(sortSelect));
  }
});