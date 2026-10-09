// Page d'accueil : progress bar et connexion de la section météo live.

const barEl = document.getElementById('madrasBar');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
  if (barEl) barEl.style.width = (isNaN(pct) ? 0 : pct) + '%';
});

// Mappe le weather_code WMO vers un emoji météo
function weatherEmoji(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌦️';
  if (code <= 99) return '⛈️';
  return '🌡️';
}

// Remplit une carte live : valeur (avec son unité) et sous-titre
function setLiveCard(id, value, unit, subtitle) {
  const card = document.getElementById(id);
  if (!card) return;
  card.querySelector('.live-valeur').innerHTML = value == null
    ? '--'
    : `${value}${unit ? `<span class="live-unite">${unit}</span>` : ''}`;
  if (subtitle) card.querySelector('.live-sous').textContent = subtitle;
}

// Charge la météo (GET /meteo) : température de la mer, ensoleillement, pluie sur 7 jours
async function loadMeteoLive() {
  const data = await fetchApi('/meteo');
  if (!data) return; // les cartes restent à « -- » plutôt que d'afficher un chiffre inventé

  if (data.sea_temperature != null) {
    const comfort = data.sea_temperature >= 26 ? 'Idéale pour la baignade' : data.sea_temperature >= 24 ? 'Agréable' : 'Fraîche';
    setLiveCard('liveSea', Math.round(data.sea_temperature), '°C', `${comfort} · baie de Fort-de-France`);
  }
  if (data.sunshine_hours != null) {
    setLiveCard('liveSun', Math.round(data.sunshine_hours), 'h');
  }
  if (data.rain_7d_mm != null) {
    setLiveCard('liveRain', Math.round(data.rain_7d_mm), 'mm');
  }
}

// Charge le risque de sargasses (GET /sargasses) : carte live et bandeau d'alerte
async function loadSargassumLive() {
  const data = await fetchApi('/sargasses');
  const card = document.getElementById('liveSargassum');
  if (!data || !data.global_level || !card) {
    if (card) card.querySelector('.live-sous').textContent = 'Données indisponibles pour le moment';
    return;
  }
  const level = data.global_level;
  const coasts = new Set(data.zones.filter((z) => z.level === level).map((z) => z.coast));
  const where = coasts.size === 2 ? 'Côtes caraïbe et atlantique' : coasts.has('atlantique') ? 'Côte atlantique' : 'Côte caraïbe';
  const color = SARGASSUM_LEVELS[level].color;
  card.style.setProperty('--niveau', color);
  setLiveCard('liveSargassum', sargassumLabel(level), '',
    `${where} · NOAA, ${formatDayFr(data.risk_date, { day: 'numeric', month: 'long' })}`);

  // Bandeau seulement pour une alerte modérée ou forte
  const banner = document.getElementById('sargassumBanner');
  if (banner && sargassumRank(level) >= 2) {
    banner.style.setProperty('--niveau', color);
    const phrase = level === 'fort' ? 'Alerte forte aux sargasses' : 'Alerte modérée aux sargasses';
    banner.innerHTML = `<i></i>${phrase} · ${where.toLowerCase()}<span>Voir la carte</span>`;
    banner.hidden = false;
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  loadMeteoLive();
  loadSargassumLive();
  // Les relevés sont collectés en continu par le serveur : la page les relit régulièrement
  setInterval(loadMeteoLive, 10 * 60000);
  setInterval(loadSargassumLive, 30 * 60000);
  await updateNav();
  // Si l'utilisateur est connecté, masquer le bouton "Se connecter" dans le hero
  if (getToken()) {
    const connectBtn = document.querySelector('.hero-actions .btn-primaire');
    if (connectBtn) connectBtn.style.display = 'none';
  }
});