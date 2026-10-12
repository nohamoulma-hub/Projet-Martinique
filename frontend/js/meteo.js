// Page météo : conditions actuelles, prévisions détaillées, carte en direct à onglets
// (pluie et nuages, températures, plages, nappes), sargasses, odeurs et baignade.
// Toutes les données viennent de l'API du site, qui les collecte en arrière-plan :
// la page se contente de les relire régulièrement pour rester à jour.

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fréquences de rafraîchissement, alignées sur celles de la collecte côté serveur
const REFRESH = { current: 10, forecast: 30, animation: 5, temperatures: 30, sargassum: 30 };

const state = {
  coast: null,        // contour de l'île et façades
  segments: [],       // points de chaque façade
  sargassum: null,    // niveaux du jour et prévisions par façade
  conditions: null,   // météo et mer devant chaque plage
  beaches: [],        // plages du catalogue
  h2s: null,
  current: null,
};

// ---------- Outils ----------

function formatNumber(value, digits = 1) {
  return Number(value).toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Heure locale de Martinique au format du site (07h30), depuis un horodatage UTC en secondes
function localHour(seconds) {
  return new Date(seconds * 1000)
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Martinique' })
    .replace(':', 'h');
}

// Date du jour en Martinique (AAAA-MM-JJ), quel que soit le fuseau du visiteur
function todayInMartinique(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Martinique' });
}

// Commune d'une activité, lue dans son adresse (« Rue..., 97228 Sainte-Luce, Martinique »)
function communeOf(address) {
  const parts = (address || '').split(',').map((p) => p.trim());
  const raw = parts.length >= 3 ? parts[parts.length - 2] : parts[0];
  return raw.replace(/^\d{5}\s+/, '');
}

function seaState(height) {
  if (height == null) return null;
  if (height < 0.5) return 'Mer belle';
  if (height < 1.25) return 'Mer peu agitée';
  return 'Mer agitée';
}

const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Barre de progression madras ----------

const progressBar = $('.madras-bar');
function updateProgress() {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = (total > 0 ? window.scrollY / total * 100 : 0) + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });

// ---------- Météo actuelle ----------

async function loadCurrent() {
  const data = await fetchApi('/meteo');
  try {
    if (!data) {
      // Les valeurs de maquette ne sont jamais affichées : une météo inventée serait crédible et fausse
      $('#heroTemp').textContent = '--';
      $('#heroCondition').textContent = 'Relevé indisponible';
      $('#heroUpdate').textContent = 'Impossible de joindre le service météo.';
      return;
    }
    state.current = data;
    $('#heroTemp').innerHTML = `${Math.round(data.temperature)}<sup>${data.temperature_unit || '°C'}</sup>`;
    $('#heroIcon').innerHTML = weatherIcon(data.weather_code, 44);
    $('#heroCondition').textContent = data.weather_description;
    $('#heroFeels').textContent = data.feels_like != null ? `Ressenti ${Math.round(data.feels_like)}°C` : '';
    const observed = data.observed_at ? data.observed_at.slice(11).replace(':', 'h') : '';
    $('#heroUpdate').innerHTML = `Données <a href="https://open-meteo.com/">Open-Meteo</a> · relevé de ${observed}`;

    const stats = [
      ['Vent', `${Math.round(data.wind_speed)} km/h${data.wind_direction_label ? ' ' + data.wind_direction_label : ''}`],
      ['Humidité', `${data.humidity} %`],
      ['Indice UV max', data.uv_index_max != null ? `${Math.round(data.uv_index_max)}, ${data.uv_label}` : '--', data.uv_index_max >= 6],
      ['Mer', data.sea_temperature != null ? `${formatNumber(data.sea_temperature)} °C` : '--'],
      ['Pression', data.pressure != null ? `${Math.round(data.pressure).toLocaleString('fr-FR')} hPa` : '--'],
      ['Visibilité', data.visibility_km != null ? `${formatNumber(data.visibility_km)} km` : '--'],
    ];
    $('#heroStats').innerHTML = stats.map(([label, value, strong]) =>
      `<div class="meteo-stat-row"><span class="meteo-stat-label">${label}</span><span class="meteo-stat-value${strong ? ' fort' : ''}">${value}</span></div>`).join('');
  } finally {
    document.body.classList.remove('chargement');
  }
}

// ---------- Prévisions 7 jours ----------

let forecastDays = [];
let selectedDay = 0;

async function loadForecast() {
  const data = await fetchApi('/meteo/previsions');
  const strip = $('#forecastStrip');
  if (!data) {
    strip.innerHTML = '<p class="section-source">Prévisions indisponibles pour le moment.</p>';
    $('#forecastDetail').hidden = true;
    return;
  }
  forecastDays = data.days;
  strip.innerHTML = forecastDays.map((day, i) => {
    const label = i === 0 ? 'Auj.' : formatDayFr(day.date, { weekday: 'short' }).replace(/^./, (c) => c.toUpperCase());
    return `<button type="button" class="forecast-day${i === 0 ? ' today' : ''}" role="tab" aria-selected="${i === selectedDay}" aria-controls="forecastDetail" data-index="${i}">
      <span class="forecast-label">${label}</span>
      ${weatherIcon(day.weather_code, 30)}
      <span class="forecast-temps"><span class="forecast-high">${Math.round(day.temperature_max)}°</span><br><span class="forecast-low">${Math.round(day.temperature_min)}°</span></span>
      <span class="forecast-rain">${rainDropIcon(13)}<span class="visuellement-cache">Pluie </span>${day.precipitation_probability ?? 0} %</span>
    </button>`;
  }).join('');
  $$('.forecast-day', strip).forEach((button) => {
    button.addEventListener('click', () => showForecastDay(Number(button.dataset.index)));
  });
  showForecastDay(Math.min(selectedDay, forecastDays.length - 1));
}

// Déplie le détail d'une journée : matin, après-midi, soirée
function showForecastDay(index) {
  selectedDay = index;
  $$('.forecast-day').forEach((b) => b.setAttribute('aria-selected', Number(b.dataset.index) === index));
  const day = forecastDays[index];
  const detail = $('#forecastDetail');
  if (!day) { detail.hidden = true; return; }
  detail.hidden = false;
  const title = formatDayFr(day.date).replace(/^./, (c) => c.toUpperCase());
  const extras = [`Max ${Math.round(day.temperature_max)}°`, `min ${Math.round(day.temperature_min)}°`];
  if (day.uv_index_max != null) extras.push(`UV ${Math.round(day.uv_index_max)}`);
  if (day.sunshine_hours) extras.push(`${formatNumber(day.sunshine_hours)} h de soleil`);
  detail.innerHTML = `
    <div class="detail-tete"><h3>${title}</h3><p>${day.weather_description} · ${extras.join(' · ')}</p></div>
    <div class="periodes">${day.periods.map((p) => `
      <div class="periode">
        ${weatherIcon(p.weather_code, 40)}
        <span class="periode-nom">${p.label}</span>
        <span class="periode-temp">${p.temperature}°<small>${p.temperature_min}° à ${p.temperature_max}°</small></span>
        <span class="periode-infos">${p.weather_description}<br><span class="pluie">${rainDropIcon(12)}<span class="visuellement-cache">Pluie </span><b>${p.precipitation_probability} %</b></span>${p.precipitation_mm ? ` · ${formatNumber(p.precipitation_mm)} mm` : ''} · Vent <b>${p.wind_speed} km/h</b></span>
      </div>`).join('')}
    </div>`;
}

// ---------- Contour de l'île et mini-cartes ----------

function computeSegments(coast) {
  const n = coast.ring.length;
  return coast.zones.map((zone, rank) => {
    const start = zone.start;
    const end = coast.zones[(rank + 1) % coast.zones.length].start;
    const length = ((end - start) % n + n) % n;
    return Array.from({ length: length + 1 }, (_, k) => coast.ring[(start + k) % n]);
  });
}

// Point de l'île en coordonnées SVG, à l'échelle k (largeur corrigée de la latitude)
const ISLAND_NORTH = 14.88, ISLAND_WEST = -61.23, LON_FACTOR = Math.cos(14.64 * Math.PI / 180);
function islandPoint([lat, lon], k) {
  return [((lon - ISLAND_WEST) * LON_FACTOR * k).toFixed(1), ((ISLAND_NORTH - lat) * k).toFixed(1)];
}

// Mini-carte de l'île en SVG, avec des façades et des points mis en couleur
function islandSvg({ k = 200, colors = {}, stroke = 5, fill = '#F5EDD8', points = '' } = {}) {
  if (!state.coast) return '';
  const width = (0.42 * LON_FACTOR * k).toFixed(0), height = (0.49 * k).toFixed(0), m = stroke + 2;
  let svg = `<svg class="mini-ile" viewBox="${-m} ${-m} ${+width + 2 * m} ${+height + 2 * m}" aria-hidden="true">`;
  svg += `<path d="M${state.coast.ring.map((p) => islandPoint(p, k).join(',')).join('L')}Z" fill="${fill}" stroke="#d6c7a4" stroke-width="${k / 160}" stroke-linejoin="round"/>`;
  state.segments.forEach((segment, rank) => {
    if (!colors[rank]) return;
    svg += `<path d="M${segment.map((p) => islandPoint(p, k).join(',')).join('L')}" fill="none" stroke="${colors[rank]}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  return svg + points + '</svg>';
}

function levelColor(level) {
  return SARGASSUM_LEVELS[level] ? SARGASSUM_LEVELS[level].color : '#8a7d6b';
}

// ---------- Carte Leaflet ----------

const map = L.map('map', { minZoom: 8, maxZoom: 13, maxBounds: [[11.8, -64.5], [17.4, -57.5]], maxBoundsViscosity: 0.8, scrollWheelZoom: false });
map.attributionControl.setPrefix(false);
map.createPane('meteo').style.zIndex = 300;
map.createPane('nuages').style.zIndex = 320;
map.createPane('radar').style.zIndex = 330;
map.createPane('etiquettes').style.zIndex = 650;
// La molette ne zoome qu'après un clic sur la carte : le défilement de la page reste libre
map.on('click', () => map.scrollWheelZoom.enable());
map.getContainer().addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

// Fond satellite Sentinel-2 sans nuages (EOX) : gratuit et sans clé pour un usage non commercial
L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg', {
  maxZoom: 13,
  attribution: '<a href="https://s2maps.eu">Sentinel-2 cloudless 2024</a> par EOX (données Copernicus modifiées)',
}).addTo(map);

const ISLAND_BOUNDS = L.latLngBounds([14.37, -61.26], [14.90, -60.79]);

function label(lat, lon, html, cls) {
  return L.marker([lat, lon], {
    icon: L.divIcon({ className: `ancre ${cls}`, html: `<span>${html}</span>`, iconSize: [0, 0] }),
    interactive: false, keyboard: false, pane: 'etiquettes',
  });
}

function tileLatitude(y, z) {
  const n = Math.PI - 2 * Math.PI * y / 2 ** z;
  return 180 / Math.PI * Math.atan(Math.sinh(n));
}

const VIEWS = {};
let activeView = null;
let playTimer = null;

// Vue « Pluie et nuages » : 2 dernières heures, une image toutes les 10 minutes
VIEWS.rain = {
  tab: 'meteo', name: 'Pluie et nuages', desc: 'Tous les nuages vus par satellite, et la pluie au radar',
  frames: [], index: 0, showClouds: true, showRain: true, signature: '',
  group: L.layerGroup(),
  async load() {
    const data = await fetchApi('/meteo/animation');
    const frames = data ? data.frames : [];
    const signature = frames.map((f) => `${f.time}-${f.clouds}`).join(',');
    if (signature === this.signature) return false;
    this.signature = signature;
    this.frames = frames;
    this.group.clearLayers();
    this.radar = {};
    this.clouds = {};
    if (data && frames.length) {
      const z = data.zoom;
      const bounds = L.latLngBounds(
        [tileLatitude(data.tiles.y[1] + 1, z), data.tiles.x[0] / 2 ** z * 360 - 180],
        [tileLatitude(data.tiles.y[0], z), (data.tiles.x[1] + 1) / 2 ** z * 360 - 180]);
      const layer = (kind, time, pane, attribution) => L.tileLayer(`${API_URL}/meteo/tuiles/${kind}/${time}/{z}/{x}/{y}.png`,
        { pane, minNativeZoom: z, maxNativeZoom: z, bounds, opacity: 0, attribution });
      frames.forEach((frame) => {
        if (frame.radar && !this.radar[frame.time]) {
          this.radar[frame.time] = layer('radar', frame.time, 'radar', 'Radar <a href="https://www.rainviewer.com/">RainViewer</a>');
        }
        if (frame.clouds && !this.clouds[frame.clouds]) {
          this.clouds[frame.clouds] = layer('nuages', frame.clouds, 'nuages', 'Nuages NASA GIBS, GOES-East');
        }
      });
      Object.values(this.radar).concat(Object.values(this.clouds)).forEach((l) => this.group.addLayer(l));
    }
    [['Guadeloupe', 16.20, -61.55], ['Dominique', 15.42, -61.35], ['Sainte-Lucie', 13.90, -60.97], ['Barbade', 13.18, -59.54]]
      .forEach(([name, lat, lon]) => this.group.addLayer(label(lat, lon, name, 'etiquette-lieu')));
    this.group.addLayer(label(14.70, -61.25, 'Martinique', 'etiquette-lieu principal'));
    this.index = Math.max(0, this.frames.length - 1);
    return true;
  },
  frame: () => L.latLngBounds([13.6, -62.3], [15.7, -59.6]),
  status() {
    return '<span class="direct"><span class="live-dot"></span>En direct</span>';
  },
  show(index) {
    this.index = index;
    const frame = this.frames[index];
    if (!frame) return;
    Object.entries(this.radar).forEach(([t, l]) => l.setOpacity(this.showRain && Number(t) === frame.time ? 0.9 : 0));
    Object.entries(this.clouds).forEach(([t, l]) => l.setOpacity(this.showClouds && Number(t) === frame.clouds ? 0.95 : 0));
    $$('#timeline button').forEach((b, i) => { b.classList.toggle('courant', i === index); b.classList.toggle('vu', i < index); });
    const note = $('#frameNote');
    if (note) {
      note.innerHTML = frame.clouds && frame.clouds !== frame.time
        ? `Pluie <b>${localHour(frame.time)}</b> · nuages <b>${localHour(frame.clouds)}</b>`
        : `Image de <b>${localHour(frame.time)}</b>`;
    }
  },
  play(on) {
    clearInterval(playTimer);
    playTimer = null;
    if (on && this.frames.length > 1) {
      let pause = 0;
      playTimer = setInterval(() => {
        // Marque un temps d'arrêt sur l'image la plus récente avant de reboucler
        if (this.index === this.frames.length - 1 && pause++ < 3) return;
        pause = 0;
        this.show((this.index + 1) % this.frames.length);
      }, 650);
    }
    const button = $('#playButton');
    if (button) button.textContent = playTimer ? 'Pause' : 'Lecture';
  },
  toolbar() {
    if (!this.frames.length) {
      return '<span class="note">Les images satellite et radar arrivent : la première collecte prend quelques minutes après le démarrage du site.</span>';
    }
    // Une étiquette d'heure sur deux, pour rester lisible avec 13 images
    const step = this.frames.length > 8 ? 2 : 1;
    return `<button type="button" class="btn-lecture" id="playButton">Lecture</button>
      <div class="frise" id="timeline">${this.frames.map((f, i) =>
        `<button type="button" aria-label="Image de ${localHour(f.time)}"><span class="${(this.frames.length - 1 - i) % step ? 'masque' : ''}">${localHour(f.time)}</span></button>`).join('')}</div>
      <button type="button" class="chip" id="toggleClouds" aria-pressed="${this.showClouds}">Nuages</button>
      <button type="button" class="chip" id="toggleRain" aria-pressed="${this.showRain}">Pluie</button>
      <span class="note note-droite note-fixe" id="frameNote"></span>`;
  },
  bind() {
    if (!this.frames.length) return;
    $('#playButton').addEventListener('click', () => this.play(!playTimer));
    $$('#timeline button').forEach((b, i) => b.addEventListener('click', () => { this.play(false); this.show(i); }));
    $('#toggleClouds').addEventListener('click', (e) => { this.showClouds = !this.showClouds; e.currentTarget.setAttribute('aria-pressed', this.showClouds); this.show(this.index); });
    $('#toggleRain').addEventListener('click', (e) => { this.showRain = !this.showRain; e.currentTarget.setAttribute('aria-pressed', this.showRain); this.show(this.index); });
    this.show(this.index);
    this.play(!REDUCED_MOTION);
  },
  legend: () => `<div class="titre">Pluie au radar</div>
    <div class="rampe" style="background:linear-gradient(90deg,#88ddee,#36bae5,#0088bf,#005588,#ffe000,#ff9f00,#ff4400,#8f0000)"></div>
    <div class="bornes"><span>Faible</span><span>Modérée</span><span>Forte</span></div>
    <div class="ligne"><span><i style="background:#fff"></i>Nuages vus par satellite</span></div>`,
  leave() { this.play(false); },
};

// Vue « Températures » : relevé horaire, interpolé sur l'île et découpé au trait de côte
const TEMPERATURE_RAMP = [[19, '#2F6FA3'], [21, '#3F9A8C'], [23, '#9DBE5A'], [25, '#F0B429'], [27, '#E07B20'], [29, '#C8392B']];
function rampColor(value) {
  const hex = (h) => h.match(/\w\w/g).map((x) => parseInt(x, 16));
  const stops = TEMPERATURE_RAMP;
  if (value <= stops[0][0]) return hex(stops[0][1].slice(1));
  for (let k = 1; k < stops.length; k++) {
    if (value <= stops[k][0]) {
      const [v0, c0] = stops[k - 1], [v1, c1] = stops[k], f = (value - v0) / (v1 - v0), a = hex(c0.slice(1)), b = hex(c1.slice(1));
      return a.map((x, i) => Math.round(x + (b[i] - x) * f));
    }
  }
  return hex(stops[stops.length - 1][1].slice(1));
}

VIEWS.temp = {
  tab: 'meteo', name: 'Températures', desc: 'Relevé de l\'heure, de la côte aux sommets',
  group: L.layerGroup(), grid: null, stamp: '',
  // Température en un point, par interpolation bilinéaire sur la grille
  valueAt(lat, lon) {
    const g = this.grid;
    let fi = (lat - g.south) / g.step, fj = (lon - g.west) / g.step;
    fi = Math.max(0, Math.min(g.rows - 1.0001, fi));
    fj = Math.max(0, Math.min(g.cols - 1.0001, fj));
    const i = Math.floor(fi), j = Math.floor(fj), di = fi - i, dj = fj - j;
    const v = (a, b) => g.temperature[a * g.cols + b];
    return v(i, j) * (1 - di) * (1 - dj) + v(i + 1, j) * di * (1 - dj) + v(i, j + 1) * (1 - di) * dj + v(i + 1, j + 1) * di * dj;
  },
  async load() {
    const grid = await fetchApi('/meteo/temperatures');
    if (!grid || !state.coast || grid.observed_at === this.stamp) return false;
    this.grid = grid;
    this.stamp = grid.observed_at;
    const W = 540, H = 670, N = ISLAND_BOUNDS.getNorth(), S = ISLAND_BOUNDS.getSouth(), Wl = ISLAND_BOUNDS.getWest(), E = ISLAND_BOUNDS.getEast();
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      const lat = N - (y + 0.5) / H * (N - S);
      for (let x = 0; x < W; x++) {
        // Bandes de 0,5 degré, à la manière des isothermes d'une carte météo
        const t = Math.floor(this.valueAt(lat, Wl + (x + 0.5) / W * (E - Wl)) * 2) / 2 + 0.25;
        const [r, g, b] = rampColor(t), o = (y * W + x) * 4;
        image.data[o] = r; image.data[o + 1] = g; image.data[o + 2] = b; image.data[o + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    state.coast.ring.forEach(([lat, lon], i) => {
      const px = (lon - Wl) / (E - Wl) * W, py = (N - lat) / (N - S) * H;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    const places = [['Fort-de-France', 14.6072, -61.0695], ['Saint-Pierre', 14.7431, -61.1751], ['Montagne Pelée', 14.8094, -61.1653],
      ['Pitons du Carbet', 14.7036, -61.0953], ['La Trinité', 14.7386, -60.9632], ['Le Lorrain', 14.8327, -61.0556],
      ['Le François', 14.6154, -60.9028], ['Le Diamant', 14.4801, -61.0254], ['Sainte-Anne', 14.4350, -60.8812], ['Rivière-Salée', 14.5241, -60.9749]];
    this.group.clearLayers();
    this.group.addLayer(L.imageOverlay(canvas.toDataURL(), ISLAND_BOUNDS, { pane: 'meteo', opacity: 0.82, attribution: 'Températures <a href="https://open-meteo.com/">Open-Meteo</a>' }));
    places.forEach(([name, lat, lon]) => this.group.addLayer(label(lat, lon, `<b>${Math.round(this.valueAt(lat, lon))}°</b><small>${name}</small>`, 'etiquette-temp')));
    return true;
  },
  frame: () => ISLAND_BOUNDS.pad(0.08),
  status() {
    return '<span class="direct"><span class="live-dot"></span>En direct</span>';
  },
  toolbar() {
    if (!this.grid) return '<span class="note">Les températures arrivent : la première collecte prend quelques minutes.</span>';
    const values = this.grid.temperature;
    return `<span class="note">Relevé de <b>${this.grid.observed_at.slice(11).replace(':', 'h')}</b> · de <b>${formatNumber(Math.min(...values))} °C</b> sur les sommets à <b>${formatNumber(Math.max(...values))} °C</b> sur la côte</span>
      <span class="note note-droite" id="temperatureReadout">Survolez l'île pour lire la température</span>`;
  },
  readout: null,
  bind() {
    if (!this.grid) return;
    this.readout = (event) => {
      const out = $('#temperatureReadout');
      if (!out) return;
      const inside = ISLAND_BOUNDS.contains(event.latlng);
      out.innerHTML = inside ? `Au pointeur : <b>${formatNumber(this.valueAt(event.latlng.lat, event.latlng.lng))} °C</b>` : 'Survolez l\'île pour lire la température';
    };
    map.on('mousemove click', this.readout);
  },
  leave() { if (this.readout) map.off('mousemove click', this.readout); },
  legend: () => `<div class="titre">Température de l'air</div>
    <div class="rampe" style="background:linear-gradient(90deg,${TEMPERATURE_RAMP.map(([, c]) => c).join(',')})"></div>
    <div class="bornes"><span>19°</span><span>24°</span><span>29°</span></div>`,
};

// Vue « Carte des plages » : niveau par plage ou par façade de côte
VIEWS.beaches = {
  tab: 'sargasses', name: 'Carte des plages', desc: 'Niveau par plage ou par façade de côte',
  group: L.layerGroup(), mode: 'plage', lines: [],
  async load() {
    this.group.clearLayers();
    if (!state.sargassum || !state.coast) return true;
    const beachLayer = L.layerGroup();
    state.beaches.forEach((beach) => {
      const info = state.sargassum.beaches[beach.id] || {};
      const color = levelColor(info.level);
      const cond = state.conditions && state.conditions.beaches[beach.id];
      const sea = cond ? seaState(cond.wave_height) : null;
      const popup = `<div class="popup-plage">${beach.image_url ? `<img src="${escapeHtml(beach.image_url)}" alt="${escapeHtml(beach.name)}" loading="lazy">` : ''}
        <div class="contenu"><b>${escapeHtml(beach.name)}</b>
        <small>${escapeHtml(communeOf(beach.address))}</small>
        ${sargassumBadge(info.level)}
        <small>Risque NOAA du ${formatDayFr(state.sargassum.risk_date, { day: 'numeric', month: 'long' })}${sea ? ` · ${sea} (${formatNumber(cond.wave_height)} m)` : ''}</small>
        <a href="detail.html?id=${beach.id}">Voir la fiche</a></div></div>`;
      beachLayer.addLayer(L.circleMarker([beach.latitude, beach.longitude], { radius: 15, stroke: false, fillColor: color, fillOpacity: 0.28, interactive: false }));
      beachLayer.addLayer(L.circleMarker([beach.latitude, beach.longitude], { radius: 8, color: '#fff', weight: 2.5, fillColor: color, fillOpacity: 1 })
        .bindTooltip(escapeHtml(beach.name), { direction: 'top', offset: [0, -8] })
        .bindPopup(popup, { minWidth: 230, maxWidth: 230 }));
    });
    this.lines = state.segments.map((segment, rank) => {
      const zone = state.sargassum.zones[rank];
      return L.polyline(segment, { color: levelColor(zone.level), weight: 7, opacity: 0.95, lineCap: 'round', lineJoin: 'round' })
        .bindTooltip(`<b>${zone.name}</b> · ${sargassumLabel(zone.level)}<br>${zone.beaches}`, { sticky: true });
    });
    const facadeLayer = L.layerGroup([
      ...state.segments.map((segment) => L.polyline(segment, { color: '#fff', weight: 12, opacity: 0.3, interactive: false })),
      ...this.lines,
      ...state.sargassum.zones.map((zone) => label(zone.label[0], zone.label[1],
        `<i style="background:${levelColor(zone.level)}"></i>${zone.name}`, `etiquette-zone ${zone.label[2] === 'left' ? 'gauche' : 'droite'}`)),
    ]);
    this.layers = { plage: beachLayer, facade: facadeLayer };
    this.group.addLayer(this.layers[this.mode]);
    return true;
  },
  frame: () => ISLAND_BOUNDS.pad(0.12),
  status() {
    if (!state.sargassum) return '';
    return `<span>NOAA · relevé du ${formatDayFr(state.sargassum.risk_date, { day: 'numeric', month: 'long' })}</span>`;
  },
  setMode(mode) {
    this.mode = mode;
    if (this.layers) {
      this.group.clearLayers();
      this.group.addLayer(this.layers[mode]);
    }
    $$('#modeSwitch button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === mode));
    const note = $('#modeNote');
    if (note) note.textContent = mode === 'plage' ? 'Touchez une plage pour voir son relevé.' : 'Survolez un tronçon de côte pour voir ses plages.';
    $('#mapLegend').innerHTML = this.legend();
  },
  highlight(rank) {
    this.setMode('facade');
    const line = this.lines[rank];
    if (!line) return;
    line.setStyle({ weight: 13 });
    const segment = state.segments[rank];
    line.openTooltip(L.latLng(segment[Math.floor(segment.length / 2)]));
    setTimeout(() => line.setStyle({ weight: 7 }), 1600);
  },
  toolbar() {
    if (!state.sargassum) return '<span class="note">Les niveaux de sargasses arrivent : la première collecte prend quelques minutes.</span>';
    return `<div class="bascule" id="modeSwitch"><button type="button" data-mode="plage" aria-pressed="true">Par plage</button><button type="button" data-mode="facade" aria-pressed="false">Par façade</button></div>
      <span class="note" id="modeNote"></span>`;
  },
  bind() {
    $$('#modeSwitch button').forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset.mode)));
    if (state.sargassum) this.setMode(this.mode);
  },
  legend() {
    return `<div class="titre">Risque d'échouement ${this.mode === 'plage' ? 'par plage' : 'par façade'}</div>
      <div class="ligne">${Object.values(SARGASSUM_LEVELS).map((l) => `<span><i style="background:${l.color}"></i>${l.label}</span>`).join('')}</div>
      <div class="source">Source : NOAA AOML</div>`;
  },
};

// Vue « Nappes au large » : algues vues par satellite, puis leur dérive estimée sur 4 jours
VIEWS.mats = {
  tab: 'sargasses', name: 'Nappes au large', desc: 'Les radeaux d\'algues repérés par satellite, et leur dérive',
  group: L.layerGroup(), data: null, day: 0,
  bounds: L.latLngBounds([13.6, -61.9], [15.8, -58.8]),
  async load() {
    const data = await fetchApi('/sargasses/nappes');
    if (!data) return false;
    this.data = data;
    this.group.clearLayers();
    this.overlay = L.imageOverlay('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', this.bounds, { pane: 'meteo', attribution: 'Algues : USF, NOAA' });
    this.stranding = L.layerGroup();
    this.group.addLayer(this.overlay);
    this.group.addLayer(this.stranding);
    this.group.addLayer(label(14.70, -61.25, 'Martinique', 'etiquette-lieu principal'));
    return true;
  },
  frame: () => L.latLngBounds([14.0, -61.5], [15.3, -59.5]),
  status() {
    return this.day === 0 ? '<span>Satellite · USF et NOAA</span>' : '<span>Estimation du site</span>';
  },
  // Dessine les pixels d'algues comme de courts filaments, orientés comme sur les images satellite
  draw(day) {
    this.day = day;
    if (!this.data) return;
    const points = day === 0 ? this.data.observed : (this.data.days[day - 1] || { positions: [] }).positions;
    const W = 1100, H = 790, N = this.bounds.getNorth(), S = this.bounds.getSouth(), Wl = this.bounds.getWest(), E = this.bounds.getEast();
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    points.forEach(([lat, lon], i) => {
      const x = (lon - Wl) / (E - Wl) * W, y = (N - lat) / (N - S) * H;
      // Variations fixes par point : le dessin ne « tremble » pas d'un rafraîchissement à l'autre
      const length = 7 + (i * 37 % 9), tilt = -0.42 + ((i * 53 % 7) - 3) * 0.05;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.beginPath();
      ctx.moveTo(-length, 0);
      ctx.quadraticCurveTo(0, ((i % 5) - 2) * 0.8, length, 0);
      ctx.shadowColor = 'rgba(214,150,60,.7)';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = 'rgba(150,96,30,.75)';
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(236,186,98,.95)';
      ctx.stroke();
      ctx.restore();
    });
    this.overlay.setUrl(canvas.toDataURL());

    // Échouements : niveau du jour (NOAA) ou niveau estimé pour les jours suivants
    this.stranding.clearLayers();
    const widths = { vigilance: 4, modere: 7, fort: 11 };
    const expected = [];
    if (state.sargassum) {
      state.sargassum.zones.forEach((zone, rank) => {
        const level = day === 0 ? zone.level : (zone.forecast[day - 1] || {}).level;
        if (!widths[level]) return;
        if (level === 'modere' || level === 'fort') expected.push(`${zone.name} (${sargassumLabel(level).toLowerCase()})`);
        this.stranding.addLayer(L.polyline(state.segments[rank], { color: '#5E3A0E', weight: widths[level] + 4, opacity: 0.5, interactive: false }));
        this.stranding.addLayer(L.polyline(state.segments[rank], { color: '#D69A43', weight: widths[level], opacity: 0.95, dashArray: '2 6', lineCap: 'round', interactive: false }));
      });
    }
    const dayLabel = $('#dayLabel');
    if (dayLabel) {
      dayLabel.textContent = day === 0 ? 'Observées' : formatDayFr(this.data.days[day - 1].date, { weekday: 'long', day: 'numeric' });
    }
    const note = $('#matsNote');
    if (note) note.innerHTML = expected.length ? `Échouements ${day === 0 ? 'en cours' : 'attendus'} : <b>${expected.join(', ')}</b>` : 'Pas d\'échouement important attendu ce jour-là';
    $('#mapStatus').innerHTML = this.status();
  },
  toolbar() {
    if (!this.data) return '<span class="note">Les nappes arrivent : la première collecte prend quelques minutes.</span>';
    const max = this.data.days.length;
    // Le texte variable a sa propre ligne : le curseur garde la même largeur d'un jour à l'autre
    return `<div class="barre-ligne"><label for="dayRange" class="note">Jour</label>
      <input type="range" id="dayRange" class="curseur-jour" min="0" max="${max}" step="1" value="${Math.min(this.day, max)}">
      <span class="jour-choisi" id="dayLabel"></span></div>
      <p class="note ligne-note" id="matsNote"></p>`;
  },
  bind() {
    if (!this.data) return;
    const range = $('#dayRange');
    range.addEventListener('input', () => this.draw(Number(range.value)));
    this.draw(Number(range.value));
  },
  legend() {
    const observed = this.data && this.data.observed_date ? formatDayFr(this.data.observed_date, { day: 'numeric', month: 'long' }) : '';
    return `<div class="titre">Algues en mer</div>
      <div class="ligne"><span><i style="background:#ECBA62;border-radius:2px;height:4px;width:16px"></i>Radeau de sargasses (pixel de 1,5 km)</span></div>
      <div class="ligne"><span><i style="background:#D69A43;border-radius:2px;height:5px;width:16px"></i>Échouements sur la côte</span></div>
      <div class="source">${observed ? `Satellite : 7 jours jusqu'au ${observed}. ` : ''}Jours suivants : estimation du site.</div>`;
  },
};

// ---------- Onglets et menus ----------

const lastView = { meteo: 'rain', sargasses: 'beaches' };
const tabs = { meteo: { button: $('#tabMeteo'), menu: $('#menuMeteo'), layer: $('#tabMeteoLayer') },
  sargasses: { button: $('#tabSargasses'), menu: $('#menuSargasses'), layer: $('#tabSargassesLayer') } };

function fillMenus() {
  Object.entries(tabs).forEach(([tab, parts]) => {
    parts.menu.innerHTML = Object.entries(VIEWS).filter(([, v]) => v.tab === tab).map(([id, v]) =>
      `<button type="button" role="menuitemradio" aria-checked="${id === activeView}" data-view="${id}"><span class="menu-titre">${v.name}</span><span class="menu-desc">${v.desc}</span></button>`).join('');
    $$('button', parts.menu).forEach((b) => b.addEventListener('click', () => { closeMenus(); showView(b.dataset.view); }));
  });
}

function closeMenus() {
  Object.values(tabs).forEach(({ button, menu }) => { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); });
}

function toggleMenu(tab) {
  const { button, menu } = tabs[tab];
  const wasOpen = !menu.hidden;
  closeMenus();
  if (wasOpen) return;
  menu.hidden = false;
  button.setAttribute('aria-expanded', 'true');
  (menu.querySelector('[aria-checked="true"]') || menu.querySelector('button')).focus();
}

// Affiche une vue : calques, barre d'outils, légende, état
async function showView(id, { reframe = true } = {}) {
  const view = VIEWS[id];
  if (activeView && activeView !== id) {
    const previous = VIEWS[activeView];
    if (previous.leave) previous.leave();
    map.removeLayer(previous.group);
  }
  activeView = id;
  lastView[view.tab] = id;
  if (!view.loaded) {
    await view.load();
    view.loaded = true;
  }
  view.group.addTo(map);
  if (reframe) map.fitBounds(view.frame(), { animate: false });
  $('#mapToolbar').innerHTML = view.toolbar();
  $('#mapLegend').innerHTML = view.legend();
  $('#mapStatus').innerHTML = view.status();
  view.bind();
  Object.entries(tabs).forEach(([tab, parts]) => {
    parts.button.classList.toggle('actif', view.tab === tab);
    parts.button.setAttribute('aria-selected', view.tab === tab);
    parts.layer.textContent = VIEWS[lastView[tab]].name;
  });
  fillMenus();
}

Object.entries(tabs).forEach(([tab, { button }]) => {
  button.addEventListener('click', async () => {
    if (VIEWS[activeView].tab !== tab) await showView(lastView[tab]);
    toggleMenu(tab);
  });
});
document.addEventListener('click', (event) => { if (!event.target.closest('.onglet-wrap')) closeMenus(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenus();
  const menu = event.target.closest && event.target.closest('.onglet-menu');
  if (menu && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    const items = $$('button', menu), i = items.indexOf(event.target);
    items[(i + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    event.preventDefault();
  }
});

// Recharge les données d'une vue ; si elle est affichée, la redessine sans recadrer
async function refreshView(id) {
  const view = VIEWS[id];
  if (!view.loaded) return;
  const changed = await view.load();
  if (changed && activeView === id) {
    const wasPlaying = Boolean(playTimer);
    await showView(id, { reframe: false });
    if (id === 'rain' && !wasPlaying) view.play(false);
  }
}

// ---------- Section sargasses ----------

const LEVEL_PHRASES = { faible: 'Risque faible', vigilance: 'Vigilance sargasses', modere: 'Alerte modérée', fort: 'Alerte forte' };

function renderSargassum() {
  const data = state.sargassum;
  if (!data) {
    $('#sargassumSource').textContent = 'Les niveaux de sargasses arrivent : la première collecte prend quelques minutes.';
    return;
  }
  const riskDay = formatDayFr(data.risk_date, { day: 'numeric', month: 'long' });
  $('#sargassumSource').innerHTML = `Risque d'échouement relevé par la NOAA le ${riskDay}, mis à jour automatiquement · <a href="${data.risk_url}">source</a>`;

  // Alerte globale : niveau le plus haut, et les côtes concernées
  const alert = $('#globalAlert');
  if (data.global_level) {
    const coasts = new Set(data.zones.filter((z) => z.level === data.global_level).map((z) => z.coast));
    const where = coasts.size === 2 ? 'sur toute l\'île' : coasts.has('atlantique') ? 'sur la côte atlantique' : 'sur la côte caraïbe';
    alert.style.setProperty('--niveau', levelColor(data.global_level));
    alert.innerHTML = `<span class="alerte-dot"></span>${LEVEL_PHRASES[data.global_level]} ${where}`;
    alert.hidden = false;
  }

  // Cartes des 6 façades, par côte
  const card = (zone, rank) => `<a href="#carte" class="zone-card" data-rank="${rank}" style="--niveau:${levelColor(zone.level)}" aria-label="${zone.name}, niveau ${sargassumLabel(zone.level)}, voir sur la carte">
      <div class="zone-bar"></div>
      <div class="zone-header"><span class="zone-name">${zone.name}</span><span class="zone-badge">${sargassumLabel(zone.level)}</span></div>
      <div class="zone-body">${islandSvg({ colors: { [rank]: levelColor(zone.level) }, stroke: 9 })}<div><p class="zone-plages">${zone.beaches}</p><span class="zone-voir">Voir sur la carte</span></div></div></a>`;
  const byCoast = (coast) => data.zones.map((z, r) => [z, r]).filter(([z]) => z.coast === coast);
  $('#coastZones').innerHTML = [['caraibe', 'Côte caraïbe (sous le vent)'], ['atlantique', 'Côte atlantique (au vent)']].map(([coast, title]) =>
    `<div><p class="cote-titre">${title}</p><div class="zones-grid">${byCoast(coast).map(([z, r]) => card(z, r)).join('')}</div></div>`).join('');
  $$('.zone-card').forEach((link) => link.addEventListener('click', async (event) => {
    event.preventDefault();
    if (activeView !== 'beaches') await showView('beaches');
    VIEWS.beaches.highlight(Number(link.dataset.rank));
    $('#carte').scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
  }));

  $('#levelLegend').innerHTML = Object.values(SARGASSUM_LEVELS).map((l) =>
    `<div class="legende-item"><div class="legende-dot" style="background:${l.color}"></div>${l.label}</div>`).join('');

  renderAdvice();
  renderCalendar();
}

// Conseil du jour, composé à partir des niveaux par façade et du vent
function renderAdvice() {
  const data = state.sargassum;
  if (!data) return;
  const known = data.zones.filter((z) => z.level);
  if (!known.length) return;
  const best = Math.min(...known.map((z) => sargassumRank(z.level)));
  const worst = Math.max(...known.map((z) => sargassumRank(z.level)));
  const calmest = known.filter((z) => sargassumRank(z.level) === best).map((z) => z.name);
  const hardest = known.filter((z) => sargassumRank(z.level) === worst).map((z) => z.name);
  const sentences = [];
  if (best === worst) {
    sentences.push(`Toutes les façades sont au même niveau aujourd'hui : ${sargassumLabel(known[0].level).toLowerCase()}.`);
  } else {
    sentences.push(`${calmest.length > 1 ? 'Façades les moins exposées' : 'Façade la moins exposée'} aujourd'hui : ${calmest.join(', ')}.`);
    sentences.push(`Les arrivages sont les plus importants en ${hardest.join(', ')}.`);
  }
  // Le rappel sur le vent d'est n'est donné que s'il explique la situation du jour
  const wind = state.current;
  const coastMax = (coast) => Math.max(-1, ...known.filter((z) => z.coast === coast).map((z) => sargassumRank(z.level)));
  if (wind && wind.wind_direction != null && wind.wind_direction > 20 && wind.wind_direction < 160
      && coastMax('atlantique') > coastMax('caraibe')) {
    sentences.push(`Le vent souffle de l'${wind.wind_direction < 70 ? 'est-nord-est' : wind.wind_direction > 110 ? 'est-sud-est' : 'est'} : il pousse les algues vers la côte atlantique.`);
  }
  sentences.push('Les sargasses ne sont pas toxiques au toucher, mais en pourrissant elles dégagent une odeur forte : voir les relevés d\'odeurs plus bas.');
  $('#adviceText').textContent = sentences.join(' ');
  $('#adviceCard').hidden = false;
}

// ---------- Calendrier de risque ----------

let trips = [];

function calendarDays() {
  return Array.from({ length: 7 }, (_, d) => todayInMartinique(d));
}

function zoneLevelOn(zone, date, index) {
  if (index === 0) return zone.level;
  const found = zone.forecast.find((f) => f.date === date);
  return found ? found.level : null;
}

function renderCalendar() {
  const data = state.sargassum;
  if (!data) return;
  const days = calendarDays();
  let html = '<div></div>' + days.map((date, i) => {
    const weekday = i === 0 ? 'Auj.' : formatDayFr(date, { weekday: 'short' }).replace('.', '');
    const source = i === 0 ? 'NOAA' : i <= 4 ? 'estimation' : '';
    return `<div class="entete${i === 0 ? ' aujourdhui' : ''}"><b>${weekday}</b><span>${Number(date.slice(8))}</span><small>${source || '&nbsp;'}</small></div>`;
  }).join('');
  [0, 1, 2, 5, 4, 3].forEach((rank) => {
    const zone = data.zones[rank];
    html += `<div class="facade">${islandSvg({ colors: { [rank]: levelColor(zone.level) }, stroke: 12 })}<span>${zone.name}<small>${zone.coast === 'caraibe' ? 'Côte caraïbe' : 'Côte atlantique'}</small></span></div>`;
    html += days.map((date, i) => {
      const level = zoneLevelOn(zone, date, i);
      const cell = level
        ? `<div class="pastille" style="--niveau:${levelColor(level)}" title="${zone.name} : ${sargassumLabel(level)}"><i></i>${sargassumLabel(level)}</div>`
        : '<div class="pastille inconnue" title="Prévision pas encore disponible">?</div>';
      return `<div class="case${i === 0 ? ' aujourdhui' : ''}">${cell}</div>`;
    }).join('');
  });
  $('#calendarGrid').innerHTML = html + '<div class="sejour" id="tripFrame" hidden><span>Mon séjour</span></div>';
  updateTripSummary();
}

async function loadTrips() {
  const select = $('#tripSelect');
  if (!getToken()) {
    select.innerHTML = '<option value="">Connectez-vous pour choisir un projet</option>';
    select.disabled = true;
    return;
  }
  const projects = await fetchApi('/projets', { headers: getAuthHeaders() });
  trips = (projects || []).filter((p) => p.start_date && p.end_date);
  select.innerHTML = '<option value="">Aucun projet sélectionné</option>' + trips.map((p) =>
    `<option value="${p.id}">${escapeHtml(p.name)} · ${formatDayFr(p.start_date, { day: 'numeric', month: 'short' })} → ${formatDayFr(p.end_date, { day: 'numeric', month: 'short' })}</option>`).join('');
  // Par défaut, le prochain séjour à venir
  const upcoming = trips.filter((p) => p.end_date >= todayInMartinique()).sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  if (upcoming) select.value = String(upcoming.id);
  updateTripSummary();
}

function updateTripSummary() {
  const summary = $('#calendarSummary');
  const frame = $('#tripFrame');
  if (!summary || !state.sargassum) return;
  const trip = trips.find((p) => String(p.id) === $('#tripSelect').value);
  if (!trip) {
    if (frame) frame.hidden = true;
    summary.textContent = getToken()
      ? 'Choisissez un projet de voyage pour voir le risque pendant vos dates.'
      : 'Connectez-vous et choisissez un projet de voyage pour voir le risque pendant vos dates.';
    return;
  }
  const days = calendarDays();
  const first = days.findIndex((d) => d >= trip.start_date);
  const lastIndex = days.map((d) => d <= trip.end_date).lastIndexOf(true);
  if (first === -1 || lastIndex < first || trip.start_date > days[days.length - 1]) {
    frame.hidden = true;
    const visibleFrom = new Date(`${trip.start_date}T12:00:00`);
    visibleFrom.setDate(visibleFrom.getDate() - 4);
    summary.innerHTML = trip.end_date < days[0]
      ? 'Ce séjour est terminé.'
      : `Votre séjour commence le <b>${formatDayFr(trip.start_date)}</b> : le risque de sargasses sera estimé à partir du ${visibleFrom.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}.`;
    return;
  }
  const headers = $$('#calendarGrid .entete');
  frame.hidden = false;
  frame.style.left = `${headers[first].offsetLeft}px`;
  frame.style.width = `${headers[lastIndex].offsetLeft + headers[lastIndex].offsetWidth - headers[first].offsetLeft}px`;
  const lines = [];
  for (let i = first; i <= lastIndex; i++) {
    const strong = state.sargassum.zones.filter((z) => zoneLevelOn(z, days[i], i) === 'fort').map((z) => z.name);
    if (i > 4) {
      const available = new Date(`${days[i]}T12:00:00`);
      available.setDate(available.getDate() - 4);
      lines.push(`<b>${formatDayFr(days[i], { weekday: 'long' })}</b> : estimation disponible ${available.toLocaleDateString('fr-FR', { weekday: 'long' })}`);
    } else if (strong.length) {
      lines.push(`<b>${formatDayFr(days[i], { weekday: 'long' })}</b> : évitez ${strong.join(', ')}`);
    }
  }
  summary.innerHTML = lines.length ? `Pendant votre séjour · ${lines.join(' · ')}.` : 'Pendant votre séjour, aucune façade n\'est en alerte forte sur les jours connus.';
}

$('#tripSelect').addEventListener('change', updateTripSummary);
window.addEventListener('resize', updateTripSummary);

// ---------- Odeurs (H2S) ----------

// Couleurs des 5 niveaux officiels, prises dans la palette Madras : plus douces que les
// couleurs vives de Madininair (jaune pur, vert fluo), avec un vert clair intermédiaire
const H2S_COLORS = { 'tres-faible': '#1D7A4E', faible: '#6E9F45', moyen: '#F0B429', eleve: '#E07B20', 'tres-eleve': '#C8392B' };
const h2sColor = (level) => H2S_COLORS[level] || '#8a7d6b';

// Graduations de la jauge : seuils officiels de Madininair, à intervalles égaux
const H2S_STEPS = [0, 0.03, 0.07, 1, 5, 10];
function gaugePosition(value) {
  for (let k = 1; k < H2S_STEPS.length; k++) {
    if (value <= H2S_STEPS[k]) return (k - 1 + (value - H2S_STEPS[k - 1]) / (H2S_STEPS[k] - H2S_STEPS[k - 1])) / (H2S_STEPS.length - 1);
  }
  return 1;
}

function formatPpm(sensor) {
  return sensor.below_detection ? '&lt; 0,03' : formatNumber(sensor.value_ppm, sensor.value_ppm < 0.1 ? 2 : 1);
}

let h2sExpanded = false;

function renderH2s() {
  const data = state.h2s;
  if (!data || !data.sensors.length) {
    $('#h2sNote').textContent = 'Les mesures d\'odeurs arrivent : la première collecte prend quelques minutes.';
    return;
  }
  const cx = 120, cy = 118, radius = 92;
  const point = (p, r) => [cx + r * Math.cos(Math.PI * (1 + p)), cy + r * Math.sin(Math.PI * (1 + p))];
  const arc = (p0, p1, r) => { const [x0, y0] = point(p0, r), [x1, y1] = point(p1, r); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  let svg = data.thresholds.map((t, i) => {
    const a = i / data.thresholds.length, b = (i + 1) / data.thresholds.length;
    return `<path d="${arc(a + 0.005, b - 0.005, radius)}" fill="none" stroke="${h2sColor(t.id)}" stroke-width="16"/>`;
  }).join('');
  svg += H2S_STEPS.map((v) => {
    const [x, y] = point(gaugePosition(v), radius + 16);
    return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#6B5B45" font-family="DM Sans, sans-serif">${formatNumber(v, v && v < 0.1 ? 2 : 0)}</text>`;
  }).join('');
  svg += `<g id="h2sNeedle" style="transform-origin:${cx}px ${cy}px;transition:transform .6s cubic-bezier(.3,1.4,.5,1)"><path d="M${cx} ${cy - 4.5}L${cx - radius + 24} ${cy}L${cx} ${cy + 4.5}Z" fill="#0D1F2D"/></g><circle cx="${cx}" cy="${cy}" r="8" fill="#0D1F2D"/><circle cx="${cx}" cy="${cy}" r="3" fill="#F0B429"/>`;
  $('#h2sGauge').innerHTML = svg;

  const k = 200;
  const dots = data.sensors.filter((s) => s.latitude).map((s) => {
    const [x, y] = islandPoint([s.latitude, s.longitude], k);
    return `<circle class="capteur" data-id="${s.id}" cx="${x}" cy="${y}" r="5.5" fill="${h2sColor(s.level)}" stroke="#fff" stroke-width="2" tabindex="0" role="button" aria-label="${escapeHtml(s.name)}, ${escapeHtml(s.commune)}"/>`;
  }).join('');
  $('#h2sMap').innerHTML = islandSvg({ k, fill: '#EFE5CF', stroke: 6, points: `${dots}<circle id="h2sRing" r="10" fill="none" stroke="#0D1F2D" stroke-width="2"/>` });

  const visible = h2sExpanded ? data.sensors : data.sensors.slice(0, 6);
  $('#h2sSensors').innerHTML = visible.map((s) => `<li><button type="button" data-id="${s.id}" aria-pressed="false">
      <span class="nom">${escapeHtml(s.name)} <small>${escapeHtml(s.commune)}</small></span><span class="val">${formatPpm(s)} ppm</span>
      <span class="barre"><span style="width:${Math.max(2, gaugePosition(s.value_ppm) * 100).toFixed(0)}%;background:${h2sColor(s.level)}"></span></span></button></li>`).join('');
  const more = $('#h2sMore');
  more.hidden = data.sensors.length <= 6;
  more.textContent = h2sExpanded ? 'Voir moins de capteurs' : `Voir les ${data.sensors.length} capteurs`;

  const bulletin = data.date ? formatDayFr(data.date, { day: 'numeric', month: 'long' }) : '';
  $('#h2sNote').innerHTML = `Moyennes sur 24 h du bulletin Madininair du ${bulletin}. Seuils et recommandations officiels de Madininair et de l'ARS · <a href="${data.source_url}">recommandations complètes</a>. Source : Madininair.`;

  $$('#h2sSensors button, #h2sMap .capteur').forEach((el) => {
    el.addEventListener('click', () => selectSensor(Number(el.dataset.id)));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSensor(Number(el.dataset.id)); } });
  });
  selectSensor(selectedSensor && data.sensors.some((s) => s.id === selectedSensor) ? selectedSensor : data.sensors[0].id);
}

let selectedSensor = null;

function selectSensor(id) {
  const data = state.h2s;
  const sensor = data.sensors.find((s) => s.id === id);
  if (!sensor) return;
  selectedSensor = id;
  const threshold = data.thresholds.find((t) => t.id === sensor.level);
  $('#h2sNeedle').style.transform = `rotate(${gaugePosition(sensor.value_ppm) * 180}deg)`;
  $('#h2sValue').innerHTML = `${formatPpm(sensor)}<small>ppm</small>`;
  $('#h2sPlace').textContent = `${sensor.name} · ${sensor.commune}`;
  const advice = $('#h2sAdvice');
  advice.style.setProperty('--niveau', h2sColor(threshold.id));
  advice.innerHTML = `<b>Niveau ${threshold.label.toLowerCase()}</b>${threshold.message}`;
  if (sensor.latitude) {
    const [x, y] = islandPoint([sensor.latitude, sensor.longitude], 200);
    $('#h2sRing').setAttribute('cx', x);
    $('#h2sRing').setAttribute('cy', y);
  }
  $$('#h2sSensors button').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.id) === id));
}

$('#h2sMore').addEventListener('click', () => { h2sExpanded = !h2sExpanded; renderH2s(); });

// ---------- Où me baigner ----------

async function loadCommunes() {
  const communes = await fetchApi('/activites/communes') || [];
  const select = $('#communeSelect');
  select.innerHTML = communes.map((c) => `<option${c === 'Fort-de-France' ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('');
  select.addEventListener('change', renderBathing);
}

async function renderBathing() {
  const commune = $('#communeSelect').value;
  if (!commune || !state.sargassum) return;
  // Toutes les pages : l'API en renvoie 18 par page, et la moins exposée peut être plus loin
  const items = [];
  for (let page = 1; page < 10; page++) {
    const data = await fetchApi(`/activites?categorie=beach&commune=${encodeURIComponent(commune)}&rayon=100&page=${page}`);
    if (!data) break;
    items.push(...data.items);
    if (!data.has_more) break;
  }
  const beaches = items.map((b) => ({ ...b, level: (state.sargassum.beaches[b.id] || {}).level }));
  // Les moins exposées d'abord, puis les plus proches
  beaches.sort((a, b) => sargassumRank(a.level) - sargassumRank(b.level) || a.distance_km - b.distance_km);
  const chosen = beaches.slice(0, 3);
  const notice = $('#recoNotice');
  notice.hidden = !chosen.length || sargassumRank(chosen[0].level) < 2;
  notice.textContent = 'Aucune plage du catalogue n\'est épargnée aujourd\'hui : voici les moins exposées près de chez vous.';

  $('#recoGrid').innerHTML = chosen.map((beach, i) => {
    const cond = state.conditions && state.conditions.beaches[beach.id];
    const zone = state.sargassum.zones.find((z) => z.id === (state.sargassum.beaches[beach.id] || {}).zone);
    const infos = [];
    if (cond) {
      if (cond.wind_speed != null) infos.push(`Vent <b>${Math.round(cond.wind_speed)} km/h</b>`);
      const sea = seaState(cond.wave_height);
      if (sea) infos.push(`${sea} <b>${formatNumber(cond.wave_height)} m</b>`);
      if (cond.sea_temperature != null) infos.push(`Eau <b>${Math.round(cond.sea_temperature)} °C</b>`);
      if (cond.uv_index_max != null) infos.push(`UV <b>${Math.round(cond.uv_index_max)}</b>`);
    }
    return `<article class="reco-card">
      <div class="reco-visual">${beach.image_url ? `<img src="${escapeHtml(beach.image_url)}" alt="${escapeHtml(beach.name)}" loading="lazy" onerror="this.remove()">` : ''}
        <span class="reco-rang">${i + 1} · à ${Math.round(beach.distance_km)} km</span>
        <div class="reco-tags"><span class="reco-tag niveau" style="--niveau:${levelColor(beach.level)}">Sargasses : ${sargassumLabel(beach.level).toLowerCase()}</span>
        ${cond && cond.temperature != null ? `<span class="reco-tag clair">${Math.round(cond.temperature)}°</span>` : ''}</div></div>
      <div class="reco-body"><a href="detail.html?id=${beach.id}" class="reco-name">${escapeHtml(beach.name)}</a>
        <p class="reco-loc">${escapeHtml(communeOf(beach.address))}${zone ? ` · ${zone.name}` : ''}</p>
        <div class="reco-meteo">${infos.map((info) => `<span>${info}</span>`).join('<span aria-hidden="true">·</span>')}</div></div>
    </article>`;
  }).join('');

  // Les plus proches seulement : avec 70 plages, la liste complète noierait la recommandation
  const others = beaches.slice(3).filter((b) => sargassumRank(b.level) >= 2)
    .sort((a, b) => a.distance_km - b.distance_km);
  const shown = others.slice(0, 8);
  const rest = others.length - shown.length;
  $('#recoExcluded').innerHTML = others.length
    ? '<span>Plus exposées aujourd\'hui :</span>' + shown.map((b) =>
      `<span class="ecartee" style="--niveau:${levelColor(b.level)}"><i></i>${escapeHtml(b.name)} · ${sargassumLabel(b.level).toLowerCase()} · ${Math.round(b.distance_km)} km</span>`).join('')
      + (rest > 0 ? `<span>et ${rest} autre${rest > 1 ? 's' : ''} plage${rest > 1 ? 's' : ''}</span>` : '')
    : '';
}

// ---------- Chargement et rafraîchissement ----------

async function loadAllBeaches() {
  const items = [];
  for (let page = 1; page < 10; page++) {
    const data = await fetchApi(`/activites?categorie=beach&page=${page}`);
    if (!data) break;
    items.push(...data.items);
    if (!data.has_more) break;
  }
  state.beaches = items;
}

async function loadSargassumData() {
  const [sargassum, conditions, h2s] = await Promise.all([
    fetchApi('/sargasses'), fetchApi('/meteo/plages'), fetchApi('/sargasses/h2s')]);
  state.sargassum = sargassum;
  state.conditions = conditions;
  state.h2s = h2s;
  renderSargassum();
  renderH2s();
  renderBathing();
  VIEWS.beaches.loaded = false;
  VIEWS.mats.loaded = false;
  if (activeView === 'beaches' || activeView === 'mats') await showView(activeView, { reframe: false });
}

document.addEventListener('DOMContentLoaded', async () => {
  updateNav();
  updateProgress();
  loadCurrent();
  loadForecast();

  const coast = await fetchApi('/meteo/cote');
  if (coast) {
    state.coast = coast;
    state.segments = computeSegments(coast);
  }
  await Promise.all([loadAllBeaches(), loadCommunes()]);
  await loadSargassumData();
  loadTrips();
  await showView(location.hash === '#sargasses' ? 'beaches' : 'rain');

  // Suivi en temps réel : chaque source est relue au rythme de sa collecte
  setInterval(loadCurrent, REFRESH.current * 60000);
  setInterval(loadForecast, REFRESH.forecast * 60000);
  setInterval(() => refreshView('rain'), REFRESH.animation * 60000);
  setInterval(() => refreshView('temp'), REFRESH.temperatures * 60000);
  setInterval(loadSargassumData, REFRESH.sargassum * 60000);
});
