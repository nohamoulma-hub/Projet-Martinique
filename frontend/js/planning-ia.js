// Planning IA : navigation, context bar et signalement "bientôt disponible" pour l'IA.

const bar = document.getElementById('madrasBar');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
  bar.style.width = (isNaN(pct) ? 0 : pct) + '%';
});

function selectChip(el) { el.classList.toggle('selected'); }

function switchPlanWeek(n) {
  document.querySelectorAll('.week-tab-btn').forEach((btn, i) => btn.classList.toggle('active', i + 1 === n));
  document.querySelectorAll('.plan-week-content').forEach((c, i) => c.classList.toggle('active', i + 1 === n));
}

function toggleDay(el) {
  el.classList.toggle('open');
}

// Chat desactive : affiche le bandeau "Bientôt disponible" mais laisse le DOM intact
function sendMessage() {
  const ta = document.querySelector('.chat-input');
  const txt = ta.value.trim();
  if (!txt) return;
  const msgs = document.getElementById('chatMessages');
  const typing = document.getElementById('typingIndicator');

  const bulle = document.createElement('div');
  bulle.className = 'msg-bulle user';
  bulle.textContent = txt;
  msgs.insertBefore(bulle, typing);

  const time = document.createElement('div');
  time.className = 'msg-time right';
  time.textContent = 'A l\'instant';
  msgs.insertBefore(time, typing);

  ta.value = '';
  msgs.scrollTop = msgs.scrollHeight;
}

// Charge le nom du projet si projet_id est dans l'URL
async function loadContextProjet(projetId) {
  if (!projetId) return;
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/projets/${projetId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return;
    const projet = await res.json();

    // Met à jour la context bar
    const contextTrip = document.querySelector('.context-trip');
    if (contextTrip) {
      const startDate = projet.start_date || '';
      const endDate = projet.end_date || '';
      const days = (projet.start_date && projet.end_date)
        ? Math.round((new Date(projet.end_date) - new Date(projet.start_date)) / (1000 * 60 * 60 * 24))
        : 0;
      contextTrip.innerHTML = `Planning IA pour <strong>${projet.name}</strong>${startDate ? ` · ${startDate} au ${endDate} · ${days} jours` : ''}`;
    }

    // Lien "Mon projet" : retour vers detail-voyage
    const backLink = document.querySelector('.context-left .back-link');
    if (backLink) {
      backLink.href = `detail-voyage.html?id=${projetId}`;
      backLink.removeAttribute('onclick');
    }

  } catch (_) {
    // Silencieux : on laisse le contenu statique de la maquette
  }
}

// Affiche les zones désactivées (chat-input, chips) avec opacité réduite
function applyIaDisabledStyle() {
  const inputWrap = document.querySelector('.chat-input-wrap');
  if (inputWrap) inputWrap.style.opacity = '0.5';

  const chips = document.querySelector('.suggestion-chips');
  // Toutes les suggestion-chips recoivent une opacité réduite
  document.querySelectorAll('.suggestion-chips').forEach(c => c.style.opacity = '0.5');
}

// Boutons "Regénérer" et "Valider" : tooltip "Bientôt disponible"
function setupFooterButtons() {
  const regen = document.querySelector('.plan-regen');
  const validate = document.querySelector('.plan-validate');

  [regen, validate].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const msg = btn.textContent.trim() + ' : bientôt disponible.';
      let tip = btn.nextElementSibling;
      if (!tip || !tip.classList.contains('btn-soon')) {
        tip = document.createElement('span');
        tip.className = 'btn-soon';
        tip.style.cssText = 'display:block;font-size:12px;color:#888;margin-top:4px;text-align:center;';
        btn.parentNode.insertBefore(tip, btn.nextSibling);
      }
      tip.textContent = 'Bientôt disponible';
      setTimeout(() => { if (tip) tip.textContent = ''; }, 2000);
    });
  });
}

// Ajoute le bandeau "Assistant IA bientôt disponible" en haut du chat
function addIaBanner() {
  const chatPanel = document.querySelector('.chat-panel');
  if (!chatPanel) return;
  const banner = document.createElement('div');
  banner.style.cssText = `
    background:#F5EDD8;color:#0D1F2D;font-size:13px;padding:10px 16px;
    text-align:center;border-bottom:1px solid #e0d8c8;`;
  banner.textContent = 'Assistant IA bientôt disponible — les réponses sont simulées.';
  chatPanel.insertBefore(banner, chatPanel.firstChild);
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  await updateNav();

  const params = new URLSearchParams(window.location.search);
  const projetId = params.get('projet_id');

  await loadContextProjet(projetId);
  addIaBanner();
  applyIaDisabledStyle();
  setupFooterButtons();
  loadNavAvatar();
});