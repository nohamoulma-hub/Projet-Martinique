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
};

// Catégories hors scope v1 : au clic, affiche un message dans la grille
const UNSUPPORTED_LABELS = ['Rhumeries', 'Restaurants', 'Activités', 'Événements', 'Logements', 'Marché'];

// Etat courant du catalogue
let currentFilter = null;    // valeur de la categorie API
let currentSearch = '';      // terme de recherche
let currentPageNum = 1;
let currentSort = 'nom';
let isLoading = false;

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

// Extrait la commune depuis le champ address (ex: "Le Prêcheur, Martinique" -> "Le Prêcheur")
function extractCommune(address) {
  if (!address) return '';
  return address.split(',')[0].trim();
}

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
  const badgeClass = isBeach ? 'badge-beach' : isHike ? 'badge-hike' : '';
  const badgeLabel = isBeach ? 'Plage' : isHike ? 'Randonnée' : item.category;
  const cardClass = isBeach ? 'cat-beach' : isHike ? 'cat-hike' : '';

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
        <span class="card-badge ${badgeClass}">${badgeLabel}</span>
        ${isPlaceholder ? '<span class="card-badge-placeholder">à modifier</span>' : ''}
      </div>
      <div class="card-body">
        <h2 class="card-name">${item.name}</h2>
        <p class="card-desc">${item.description || ''}</p>
        ${metaHtml}
      </div>
      <div class="card-footer">
        <span class="card-location">📍 ${commune}</span>
        <a href="detail.html?id=${item.id}" class="card-cta">Voir le détail →</a>
      </div>
    </article>`;
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
}

// Charge et affiche les activités depuis l'API
async function loadActivites(append = false) {
  if (isLoading) return;
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

  try {
    const res = await fetch(`${API_URL}/activites?${params}`);
    if (!res.ok) throw new Error((await res.json()).detail || 'Erreur serveur');
    const data = await res.json();
    const items = data.items || [];

    if (!append) grid.innerHTML = '';

    if (items.length === 0 && !append) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#666;">Aucune activité trouvée.</div>';
    } else {
      items.forEach(item => {
        grid.insertAdjacentHTML('beforeend', buildCard(item));
      });
    }

    // Compteur de résultats
    const countEl = document.querySelector('.results-count');
    if (countEl) {
      countEl.innerHTML = `<strong>${data.total} résultat${data.total > 1 ? 's' : ''}</strong> · Martinique`;
    }

    // Bouton "Voir plus" si pagination
    const existingMore = document.getElementById('load-more-btn');
    if (existingMore) existingMore.remove();

    if (data.has_more) {
      const btn = document.createElement('div');
      btn.style.cssText = 'grid-column:1/-1;text-align:center;margin-top:24px;';
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
  }
}

// Gestion des clics sur les boutons de filtre
function setFilter(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const label = btn.textContent.replace(/^[^\w\s]+\s*/, '').trim(); // retire l'emoji du début
  const cleanLabel = btn.textContent.trim().replace(/^[\p{Emoji}\s]+/u, '').trim();

  // Détecte si le filtre est hors scope v1
  const isUnsupported = UNSUPPORTED_LABELS.some(ul => btn.textContent.includes(ul.replace(/^\p{Emoji}\s*/u, '')));

  if (isUnsupported) {
    // Affiche un message "Bientôt disponible" dans la grille
    const rawLabel = btn.textContent.trim();
    showComingSoon(`${rawLabel} — bientôt disponible`);
    return;
  }

  // Détermine la categorie API à partir du texte du bouton
  currentFilter = null;
  if (btn.textContent.includes('Plage')) currentFilter = 'beach';
  else if (btn.textContent.includes('Randon')) currentFilter = 'hike';

  currentPageNum = 1;
  currentSearch = document.querySelector('.search-input').value.trim();
  loadActivites();
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

  // Applique le filtre depuis l'URL (?filtre=plages, randonnees, etc.) si présent
  const filtreParam = new URLSearchParams(window.location.search).get('filtre');
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