// Outils partagés par les pages qui affichent la météo ou les sargasses (météo, accueil,
// fiche activité, projet de voyage). Exception assumée à la règle « un fichier JS par
// page », comme nav.css : sans ce fichier, les mêmes icônes et niveaux seraient copiés
// quatre fois et finiraient par diverger.
// Charger après js/auth-utils.js, qui définit API_URL.

// Niveaux de risque de sargasses (échelle NOAA), aux couleurs du design system Madras
const SARGASSUM_LEVELS = {
  faible: { label: 'Faible', color: '#1D7A4E', rank: 0 },
  vigilance: { label: 'Vigilance', color: '#D9A21B', rank: 1 },
  modere: { label: 'Modéré', color: '#E07B20', rank: 2 },
  fort: { label: 'Fort', color: '#C8392B', rank: 3 },
};

// Libellé d'un niveau de sargasses, ou « Inconnu » s'il manque
function sargassumLabel(level) {
  return SARGASSUM_LEVELS[level] ? SARGASSUM_LEVELS[level].label : 'Inconnu';
}

// Rang d'un niveau, pour trier du moins au plus exposé (inconnu en dernier)
function sargassumRank(level) {
  return SARGASSUM_LEVELS[level] ? SARGASSUM_LEVELS[level].rank : 9;
}

// Lit une route de l'API et renvoie le JSON, ou null si elle ne répond pas
async function fetchApi(path, options = {}) {
  try {
    const res = await fetch(`${API_URL}${path}`, options);
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

// Famille d'icône pour un code météo WMO
function weatherFamily(code) {
  if (code <= 1) return 'sun';
  if (code === 2) return 'sun-cloud';
  if (code === 3) return 'cloud';
  if (code <= 48) return 'fog';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'rain';
  if (code >= 95) return 'storm';
  return 'cloud';
}

// Icône météo en SVG, dessinée aux couleurs Madras (soleil jaune, pluie bleue)
function weatherIcon(code, size = 32) {
  const sun = '<circle cx="12" cy="12" r="4.2" fill="#F0B429"/><g stroke="#F0B429" stroke-width="1.6" stroke-linecap="round"><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/></g>';
  const cloud = (dx = 0, dy = 0, fill = '#DCE4EA') =>
    `<path transform="translate(${dx} ${dy})" d="M7.5 18.5h9.2a3.8 3.8 0 0 0 .6-7.55A5.2 5.2 0 0 0 7.3 9.6a4.45 4.45 0 0 0 .2 8.9z" fill="${fill}" stroke="#8FA3B3" stroke-width="1.1"/>`;
  const drops = '<g stroke="#1A5C8A" stroke-width="1.7" stroke-linecap="round"><path d="M9 20.2l-.8 2M12.5 20.2l-.8 2M16 20.2l-.8 2"/></g>';
  const bolt = '<path d="M12.8 17.6l-2.4 3.6h2.2l-1.2 2.6 3.4-4h-2.2l1.3-2.2z" fill="#F0B429" stroke="#B8860B" stroke-width=".5"/>';
  const shapes = {
    sun,
    'sun-cloud': `<g transform="translate(-3 -3) scale(.85)">${sun}</g>${cloud(1.5, 1)}`,
    cloud: cloud(0, -1),
    fog: `${cloud(0, -3)}<g stroke="#8FA3B3" stroke-width="1.5" stroke-linecap="round"><path d="M5 19.5h14M7 22h10"/></g>`,
    rain: `${cloud(0, -3, '#C9D5DE')}${drops}`,
    storm: `${cloud(0, -3, '#AFC0CC')}${bolt}`,
  };
  return `<svg class="icone-meteo" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${shapes[weatherFamily(code)]}</svg>`;
}

// Goutte d'eau en SVG pour la probabilité de pluie, dans le style des icônes météo
// (même bleu que les gouttes de pluie, remplissage clair comme les nuages)
function rainDropIcon(size = 12) {
  return `<svg class="icone-goutte" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.2C11.5 4 5.7 10.8 5.7 14.8a6.3 6.3 0 0 0 12.6 0C18.3 10.8 12.5 4 12 3.2z" fill="#C9DDEA" stroke="#1A5C8A" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M9.1 15.2a3.1 3.1 0 0 0 2.4 2.9" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>`;
}

// Pastille de couleur et libellé d'un niveau de sargasses, pour le HTML des pages
function sargassumBadge(level, prefix = 'Sargasses : ') {
  const info = SARGASSUM_LEVELS[level];
  const color = info ? info.color : '#8a7d6b';
  return `<span class="badge-sargasses" style="--niveau:${color}"><i></i>${prefix}${sargassumLabel(level).toLowerCase()}</span>`;
}

// Date ISO (AAAA-MM-JJ) en toutes lettres : « samedi 10 octobre »
function formatDayFr(isoDate, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('fr-FR', options);
}
