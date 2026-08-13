// Page météo : charge les données depuis GET /meteo et remplit le hero.

const progressBar = document.querySelector('.madras-bar');
function updateProgress() {
  const scrolled = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = (total > 0 ? scrolled / total * 100 : 0) + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// Mappe le weather_code WMO vers un emoji météo lisible
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

// Formate l'heure actuelle au format HHhMM
function currentTime() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
}

// Charge les données météo et met à jour le hero
async function loadMeteo() {
  try {
    const res = await fetch(`${API_URL}/meteo`);
    if (!res.ok) return; // En cas d'erreur : les données statiques de la maquette sont conservées

    const data = await res.json();

    // Temperature principale
    const tempEl = document.querySelector('.meteo-temp');
    if (tempEl) tempEl.innerHTML = `${Math.round(data.temperature)}<sup>${data.temperature_unit || '°C'}</sup>`;

    // Condition textuelle
    const condEl = document.querySelector('.meteo-condition');
    if (condEl) condEl.textContent = data.weather_description || '';

    // Emoji météo
    const iconEl = document.querySelector('.meteo-icon');
    if (iconEl) iconEl.textContent = weatherEmoji(data.weather_code);

    // Ressenti : pas dans l'API v1, on laisse la valeur statique

    // Heure de mise a jour
    const updateEl = document.querySelector('.meteo-update');
    if (updateEl) updateEl.textContent = `Données Open-Meteo · Actualisé à ${currentTime()}`;

    // Stats : vent et humidité sont disponibles dans l'API
    const statRows = document.querySelectorAll('.meteo-stat-row');
    if (statRows.length >= 1) {
      const windVal = statRows[0].querySelector('.meteo-stat-value');
      if (windVal && data.wind_speed !== undefined) {
        windVal.textContent = `${Math.round(data.wind_speed)} ${data.wind_speed_unit || 'km/h'}`;
      }
    }
    if (statRows.length >= 2) {
      const humVal = statRows[1].querySelector('.meteo-stat-value');
      if (humVal && data.humidity !== undefined) {
        humVal.textContent = `${data.humidity} %`;
      }
    }
    // UV, pression, visibilité : pas dans l'API, on laisse les valeurs statiques

  } catch (_) {
    // Pas de réseau : les données statiques de la maquette sont conservées
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  await updateNav();
  loadMeteo();
});