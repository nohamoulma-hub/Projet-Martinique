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

// Génère les dots inline pour la fiche pratique
function buildDotsRow(score) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<div class="dot-r ${i <= score ? 'on' : ''}"></div>`;
  }
  return html;
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
  const heure = h => h === '00:00'
    ? 'minuit'
    : h.replace(/^0/, '').replace(':00', 'h').replace(':', 'h');

  // "Tu,We,Sa" -> "mardi, mercredi et samedi"
  const listeJours = spec => {
    const noms = spec.split(',').map(j => JOURS_OSM[j] || j);
    if (noms.length === 1) return noms[0];
    return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
  };

  // "12:00-14:15,19:00-22:00" -> "12h-14h15 et 19h-22h" : les restaurants ont deux services
  const creneaux = spec => spec.split(',')
    .map(c => c.split('-').map(heure).join('-'))
    .join(' et ');

  const parties = osm.split(';').map(p => p.trim()).filter(Boolean).map(partie => {
    const m = partie.match(/^([A-Za-z]{2}(?:[,-][A-Za-z]{2})*)\s+(\d{2}:\d{2}-\d{2}:\d{2}(?:,\d{2}:\d{2}-\d{2}:\d{2})*)$/);
    if (!m) return null;
    const [, jours, horaires] = m;
    const creneau = creneaux(horaires);
    if (jours === 'Mo-Su') return `tous les jours ${creneau}`;
    // Un intervalle ("Mo-Fr") se lit "du ... au ...", une liste s'enumere
    if (jours.includes('-')) {
      const [j1, j2] = jours.split('-');
      return `du ${JOURS_OSM[j1] || j1} au ${JOURS_OSM[j2] || j2} ${creneau}`;
    }
    return `${listeJours(jours)} ${creneau}`;
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
    // 0 = frequentation inconnue (plages relevees sur Martinique Tour, qui ne la donne pas)
    const vide = '<span class="fiche-row-value fiche-vide">Non renseigné</span>';
    const frequentation = bd.tourist_score
      ? `<div class="score-inline">
          <div class="score-dots-row">${buildDotsRow(bd.tourist_score)}</div>
          <span style="font-size:11px;color:var(--doux);">${scoreLabel(bd.tourist_score)}</span>
        </div>`
      : vide;
    ficheBody.innerHTML = `
      <div class="fiche-row">
        <span class="fiche-row-label">Fréquentation</span>
        ${frequentation}
      </div>
      <div class="fiche-row">
        <span class="fiche-row-label">Équipements</span>
        ${bd.amenities ? `<span class="fiche-row-value">${bd.amenities}</span>` : vide}
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

    // Le libelle affiche le domaine, l'URL complete etant trop longue pour la fiche
    const site = rd.website
      ? `<a class="fiche-row-value fiche-lien" href="${echapper(rd.website)}" target="_blank" rel="noopener">${echapper(rd.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, ''))}</a>`
      : vide;

    // Lien tel: pour composer directement le numero depuis un telephone
    const telephone = rd.phone
      ? `<a class="fiche-row-value fiche-lien" href="tel:${echapper(rd.phone.replace(/\s/g, ''))}">${echapper(rd.phone)}</a>`
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
        <span class="fiche-row-label">Téléphone</span>
        ${telephone}
      </div>
      <div class="fiche-row">
        <span class="fiche-row-label">Site web</span>
        ${site}
      </div>`;
  } else if (activite.category === 'restaurant') {
    const rt = activite.restaurant_details || {};
    const vide = '<span class="fiche-row-value fiche-vide">Non renseigné</span>';
    const valeur = texte => texte
      ? `<span class="fiche-row-value">${echapper(texte)}</span>`
      : vide;

    // Le guide Michelin n'attribue pas d'etoile en Martinique : l'absence de distinction
    // est une information en soi, on l'affiche plutot que de laisser la ligne vide.
    const distinction = rt.michelin_distinction
      ? `<span class="fiche-row-value">${echapper(rt.michelin_distinction)}</span>`
      : '<span class="fiche-row-value">Aucune distinction Michelin</span>';

    const telephone = rt.phone
      ? `<a class="fiche-row-value fiche-lien" href="tel:${echapper(rt.phone.replace(/\s/g, ''))}">${echapper(rt.phone)}</a>`
      : vide;

    const site = rt.website
      ? `<a class="fiche-row-value fiche-lien" href="${echapper(rt.website)}" target="_blank" rel="noopener">${echapper(rt.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, ''))}</a>`
      : vide;

    const lignes = [
      ['Cuisine', valeur(rt.cuisine)],
      ['Horaires', valeur(rt.opening_hours ? formatHoraires(rt.opening_hours) : null)],
      ['Distinction', distinction],
      ['Téléphone', telephone],
      ['Site web', site],
    ];
    // La ligne n'apparait que pour un restaurant d'hotel
    if (rt.hotel_name) lignes.splice(3, 0, ['Hôtel', valeur(rt.hotel_name)]);

    ficheBody.innerHTML = lignes.map(([libelle, contenu]) => `
      <div class="fiche-row">
        <span class="fiche-row-label">${libelle}</span>
        ${contenu}
      </div>`).join('');
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
  if (!grid) return;

  // Sans photo, les vignettes de maquette (parasol, palmier) resteraient affichees et
  // feraient croire a des photos du lieu. On masque la section entiere.
  if (images.length === 0) {
    const section = grid.closest('section') || grid.parentElement;
    if (section) section.hidden = true;
    return;
  }

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
    items.push({ icon: '🏖️', label: 'Équipements', value: activite.beach_details.amenities || 'Non renseigné' });
  } else if (activite.category === 'hike' && activite.hike_details) {
    items.push({ icon: '📍', label: 'Départ', value: commune || '-' });
    items.push({ icon: '🥾', label: 'Difficulté', value: activite.hike_details.difficulty || '-' });
    items.push({ icon: '⏱️', label: 'Durée estimée', value: formatDuration(activite.hike_details.duration) || '-' });
  } else if (activite.category === 'restaurant') {
    items.push({ icon: '📍', label: 'Adresse', value: activite.address || '-' });
    items.push({ icon: '🏘️', label: 'Commune', value: commune || '-' });
    const rt = activite.restaurant_details;
    if (rt && rt.opening_hours) {
      items.push({ icon: '🕘', label: 'Horaires', value: formatHoraires(rt.opening_hours) });
    }
    if (rt && rt.hotel_name) {
      items.push({ icon: '🏨', label: 'Dans l\'hôtel', value: rt.hotel_name });
    }
  } else if (activite.category === 'rum_distillery') {
    items.push({ icon: '📍', label: 'Adresse', value: activite.address || '-' });
    items.push({ icon: '🏘️', label: 'Commune', value: commune || '-' });
    const rd = activite.rum_distillery_details;
    if (rd && rd.opening_hours) {
      items.push({ icon: '🕘', label: 'Horaires', value: formatHoraires(rd.opening_hours) });
    }
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
  const typeLabel = { beach: 'Plages', hike: 'Randonnées', rum_distillery: 'Rhumeries', restaurant: 'Restaurants' }[activite.category] || 'Activités';
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

// Couleur de l'epingle sur la carte : celle de la categorie, en version vive pour
// rester visible sur le fond satellite
const PIN_COLORS = {
  beach: '#1A5C8A',
  hike: '#1D7A4E',
  rum_distillery: '#C8392B',
  restaurant: '#F0B429',
};

// Carte satellite centree sur l'activite, avec le meme fond que la page Meteo
function initLocationMap(activite) {
  const container = document.getElementById('carteLieu');
  if (!container) return;
  // Sans Leaflet (CDN injoignable), on garde seulement les coordonnees
  if (typeof L === 'undefined') {
    container.hidden = true;
    return;
  }
  const position = [activite.latitude, activite.longitude];
  const map = L.map(container, { center: position, zoom: 13, minZoom: 9, maxZoom: 15, scrollWheelZoom: false });
  map.attributionControl.setPrefix(false);
  // La molette ne zoome qu'apres un clic sur la carte : le defilement de la page reste libre
  map.on('click', () => map.scrollWheelZoom.enable());
  container.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

  // Sentinel-2 a 10 m par pixel : au-dela du zoom 14 l'image est agrandie, donc 15 au plus
  L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg', {
    maxZoom: 15,
    attribution: '<a href="https://s2maps.eu">Sentinel-2 cloudless 2024</a> par EOX (données Copernicus modifiées)',
  }).addTo(map);

  const color = PIN_COLORS[activite.category] || '#C8392B';
  const pin = L.divIcon({
    className: 'epingle',
    html: `<svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">
      <path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.3 15 39 15 39s14-13.7 14-24.1C29 7.2 22.7 1 15 1z" fill="${color}" stroke="#F5EDD8" stroke-width="2"/>
      <circle cx="15" cy="15" r="5" fill="#F5EDD8"/></svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 39],
    tooltipAnchor: [0, -38],
  });
  L.marker(position, { icon: pin, title: activite.name, keyboard: false })
    .addTo(map)
    .bindTooltip(activite.name, { permanent: true, direction: 'top', offset: [0, 0] });
}

// Couleurs par categorie, tirees du design system Madras : bleu pour la mer,
// vert pour la foret, rouge pour le rhum. Servent au badge du hero et aux vignettes
// "A proximite".
const ACCENTS = {
  beach:          { accent: '#1A5C8A', fond: 'rgba(26,92,138,.75)', texte: '#B8ECF7' },
  hike:           { accent: '#1D7A4E', fond: 'rgba(29,122,78,.75)', texte: '#ADFFD7' },
  // Fond plus opaque que les deux autres : le rouge sur une photo claire tombait
  // sous le seuil de lisibilite (2,98:1). A 0,92 et en blanc pur : 4,58:1.
  rum_distillery: { accent: '#C8392B', fond: 'rgba(200,57,43,.92)', texte: '#FFFFFF' },
  // Jaune Madras : sur ce fond clair, le texte doit etre sombre (--nuit), 9,4:1
  restaurant:     { accent: '#B07C0A', fond: 'rgba(240,180,41,.92)', texte: '#0D1F2D' },
};

// Libelle et fond de secours des vignettes "A proximite", par categorie
const NEARBY_TYPES = {
  beach: { label: 'Plage', bg: 'beach-bg' },
  hike: { label: 'Randonnée', bg: 'hike-bg' },
  rum_distillery: { label: 'Rhumerie', bg: 'rum-bg' },
  restaurant: { label: 'Restaurant', bg: 'resto-bg' },
};

// En dessous de cette distance, un temps en voiture n'a pas de sens : on y va a pied
const WALKING_KM = 0.5;

// Duree de trajet lisible : "8 min", "1 h", "1 h 25"
function formatDuree(minutes) {
  if (minutes < 60) return `${Math.max(minutes, 1)} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

// Ligne de trajet d'une vignette : temps en voiture si connu, sinon distance a vol d'oiseau
function trajetHtml(item) {
  const km = `${String(item.distance_km).replace('.', ',')} km`;
  if (item.distance_km < WALKING_KM) return '<strong>À quelques pas</strong>';
  if (item.par_la_route) {
    return `<strong>${formatDuree(item.duree_min)} en voiture</strong><span>${km} par la route</span>`;
  }
  return `<strong>${km}</strong><span>à vol d'oiseau</span>`;
}

// Echappe un texte avant de l'inserer dans du HTML
function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Remplit "A proximite" avec les activites les plus proches, en temps de trajet
async function loadNearby(activite) {
  const section = document.querySelector('.nearby-section');
  const grid = document.querySelector('.nearby-grid');
  if (!section || !grid) return;
  let items;
  try {
    const res = await fetch(`${API_URL}/activites/${activite.id}/proximite?limite=3`);
    if (!res.ok) return;
    items = await res.json();
  } catch {
    return; // la section reste masquee : mieux vaut rien qu'un bloc vide
  }
  if (!items.length) return;

  grid.innerHTML = items.map(item => {
    const type = NEARBY_TYPES[item.category] || { label: 'Activité', bg: 'beach-bg' };
    const couleurs = ACCENTS[item.category] || ACCENTS.beach;
    // L'URL est deja encodee en base : on n'echappe que les guillemets. Le degrade reste
    // sur le parent, visible si la photo ne charge pas.
    const photo = item.image_url
      ? `<div class="mini-visual-bg" style="background-image:url('${item.image_url.replace(/'/g, '%27').replace(/"/g, '%22')}')"></div>`
      : '';
    return `
      <a href="detail.html?id=${item.id}" class="mini-card">
        <div class="mini-visual ${type.bg}">
          ${photo}
          <span class="mini-badge" style="background:${couleurs.fond};color:${couleurs.texte};">${type.label}</span>
        </div>
        <div class="mini-body">
          <p class="mini-name">${escapeHtml(item.name)}</p>
          <p class="mini-loc">${escapeHtml(extractCommune(item.address))}</p>
          <p class="mini-trajet">${trajetHtml(item)}</p>
        </div>
      </a>`;
  }).join('');

  // La FOSSGIS demande de citer la source et d'offrir un lien pour corriger la carte
  const note = document.querySelector('.nearby-note');
  if (note) {
    note.innerHTML = items.some(i => i.par_la_route)
      ? 'Temps en voiture estimés hors embouteillages, d\'un parking ou d\'une entrée à l\'autre. '
        + 'Itinéraires calculés par OSRM (FOSSGIS) sur les routes © OpenStreetMap. '
        + '<a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Signaler une erreur de carte</a>'
      : 'Distances à vol d\'oiseau : les temps de trajet seront affichés après le prochain calcul d\'itinéraires.';
  }
  section.hidden = false;
}

// Applique la couleur d'accent selon le type (beach = bleu, hike = vert)
function applyTypeAccent(category) {
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


// Bloc sargasses d'une plage : niveau du jour (NOAA), estimation des 4 jours suivants
// et plage moins exposée la plus proche. Masqué pour les autres activités.
async function loadSargassumCard(activite) {
  const card = document.getElementById('sargassumCard');
  if (!card || activite.category !== 'beach') return;
  const data = await fetchApi('/sargasses');
  const info = data && data.beaches[activite.id];
  if (!info || !info.level) return;

  const zone = data.zones.find((z) => z.id === info.zone);
  card.style.setProperty('--niveau', SARGASSUM_LEVELS[info.level].color);
  document.getElementById('sargassumTitle').textContent = `Sargasses : ${sargassumLabel(info.level).toLowerCase()} aujourd'hui`;

  const lines = [`<p>Risque d'échouement relevé par la NOAA le ${formatDayFr(data.risk_date, { day: 'numeric', month: 'long' })}${zone ? `, façade ${zone.name}` : ''}.</p>`];
  // Estimation propre à la plage, sinon celle de sa façade
  const forecast = (info.forecast && info.forecast.length) ? info.forecast : (zone ? zone.forecast : []);
  if (forecast.length) {
    lines.push(`<div class="alerte-jours">${forecast.map((f) =>
      `<span class="alerte-jour" style="--jour:${SARGASSUM_LEVELS[f.level].color}">${formatDayFr(f.date, { weekday: 'short' })} ${sargassumLabel(f.level).toLowerCase()}</span>`).join('')}</div>`);
  }

  // Plage du catalogue moins exposée, la plus rapide à rejoindre en voiture : l'API
  // trie les plages par temps de route (à vol d'oiseau tant que les trajets manquent)
  if (sargassumRank(info.level) > 0) {
    const beaches = await fetchApi(`/activites/${activite.id}/proximite?categorie=beach&limite=100`);
    const better = (beaches || [])
      .find((b) => data.beaches[b.id] && sargassumRank(data.beaches[b.id].level) < sargassumRank(info.level));
    if (better) {
      const km = `${String(better.distance_km).replace('.', ',')} km`;
      let trajet = `à ${km} à vol d'oiseau`;
      if (better.distance_km < WALKING_KM) trajet = `à quelques pas (${km})`;
      else if (better.par_la_route) trajet = `à ${formatDuree(better.duree_min)} en voiture (${km})`;
      lines.push(`<p>Moins exposée et la plus proche : <a href="detail.html?id=${better.id}">${escapeHtml(better.name)}</a> (${sargassumLabel(data.beaches[better.id].level).toLowerCase()}), ${trajet}.</p>`);
    }
  }
  lines.push('<p class="alerte-source">Jours suivants : estimation du site. <a href="meteo.html#sargasses">Voir la carte des sargasses</a></p>');
  document.getElementById('sargassumBody').innerHTML = lines.join('');
  card.hidden = false;
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
    const heroBg = document.querySelector('.hero-bg');
    if (activite.image_url && heroBg) {
      const url = activite.image_url.replace(/"/g, '%22');
      heroBg.style.setProperty('--hero-photo', `url("${url}")`);
      heroBg.classList.add('avec-photo');
    } else if (heroBg) {
      // Sans photo, le degrade par defaut evoque une plage : on le remplace par la
      // couleur de la categorie, sinon un restaurant s'annonce en bleu lagon.
      heroBg.classList.add(`sans-photo-${activite.category.replace(/_/g, '-')}`);
    }

    // Hero
    const heroBadge = document.querySelector('.hero-badge');
    if (heroBadge) heroBadge.textContent = typeLabel;

    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) heroTitle.textContent = activite.name;

    const heroLocation = document.querySelector('.hero-location');
    if (heroLocation) heroLocation.textContent = commune;

    // Breadcrumb et lien retour
    fillBreadcrumb(activite);
    injectBackButton();

    // Couleur d'accent selon le type (beach = bleu, hike = vert)
    applyTypeAccent(activite.category);

    // Risque de sargasses, pour les plages uniquement
    loadSargassumCard(activite);

    // Description
    const descSection = document.querySelector('.description');
    if (descSection && activite.description) {
      descSection.innerHTML = `<p>${activite.description}</p>`;
    }

    // Coordonnées GPS et carte satellite du lieu
    const coords = document.querySelector('.map-coords');
    if (coords) {
      coords.textContent = `${activite.latitude.toFixed(4)}° N, ${Math.abs(activite.longitude).toFixed(4)}° O`;
    }
    initLocationMap(activite);
    loadNearby(activite);

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