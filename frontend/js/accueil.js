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

// Charge les données météo depuis GET /meteo et met à jour les .live-valeur
async function loadMeteoLive() {
  try {
    const res = await fetch(`${API_URL}/meteo`);
    if (!res.ok) return; // En cas d'erreur, on garde les valeurs statiques de la maquette
    const data = await res.json();

    // Les cartes live sont dans .live-card
    // Carte 0 : Température mer -> on affiche la temperature de l'air (sea_temperature non dispo)
    const liveCards = document.querySelectorAll('.live-card');
    if (!liveCards.length) return;

    // Carte 0 : Température (air, car sea_temperature pas dans l'API)
    const tempCard = liveCards[0];
    const tempValeur = tempCard.querySelector('.live-valeur');
    if (tempValeur && data.temperature !== undefined) {
      tempValeur.innerHTML = `${Math.round(data.temperature)}<span class="live-unite">${data.temperature_unit || '°C'}</span>`;
      const sous = tempCard.querySelector('.live-sous');
      if (sous) sous.textContent = data.weather_description || '';
    }

    // Carte 1 : Ensoleillement -> pas disponible dans l'API, on laisse la valeur statique

    // Carte 2 : Sargasses -> hors scope v1, valeur statique

    // Carte 3 : Pluies -> pas disponible dans l'API, on laisse la valeur statique

  } catch (_) {
    // Pas de réseau ou API indisponible : les données statiques restent affichées
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  loadMeteoLive();
  loadNavAvatar();
});