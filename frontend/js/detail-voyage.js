// Détail d'un projet de voyage : affiche les activités par journée et gère les interactions.

const bar = document.getElementById('madrasBar');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
  bar.style.width = (isNaN(pct) ? 0 : pct) + '%';
});

// Navigation entre semaines (les onglets existants dans la maquette)
function switchWeek(n) {
  document.querySelectorAll('.week-tab').forEach((t, i) => t.classList.toggle('active', i + 1 === n));
  document.querySelectorAll('.week-content').forEach((c, i) => c.classList.toggle('active', i + 1 === n));
  document.querySelectorAll('.day-picker').forEach(p => p.style.display = 'none');
}

function togglePicker(id) {
  const p = document.getElementById(id);
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

// Etat global du projet
let projetData = null;
let projetId = null;

// Formate une date ISO en "Lundi 12 septembre 2026"
function formatDayFull(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Formate une date ISO courte pour l'affichage
function formatDateShort(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Calcule le nombre de jours entre deux dates
function daysBetween(start, end) {
  if (!start || !end) return 0;
  return Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
}

// Calcule la date réelle d'un jour donné (dayNumber commence à 1)
function getDateForDay(startDate, dayNumber) {
  if (!startDate) return null;
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayNumber - 1);
  return d.toISOString().split('T')[0];
}

// Traduit la catégorie API en classe CSS et label
function catInfo(category) {
  const map = {
    beach: { cls: 'cat-plage', label: 'Plage' },
    hike: { cls: 'cat-rando', label: 'Randonnée' },
    rum_distillery: { cls: 'cat-rhum', label: 'Rhumerie' },
    restaurant: { cls: 'cat-resto', label: 'Restaurant' },
    activity: { cls: 'cat-culture', label: 'Activité' },
    event: { cls: 'cat-culture', label: 'Événement' },
  };
  return map[category] || { cls: 'cat-culture', label: category };
}

// Extrait la commune depuis le champ address
function extractCommune(address) {
  if (!address) return '';
  return address.split(',')[0].trim();
}

// Construit le HTML d'une activity-card
function buildActivityCard(item) {
  const { cls, label } = catInfo(item.activity.category);
  const commune = extractCommune(item.activity.address);
  return `
    <div class="activity-card" data-item-id="${item.id}">
      <div class="activity-time">
        <div class="time">-</div>
        <div class="moment">-</div>
      </div>
      <div class="activity-info">
        <span class="activity-cat ${cls}">${label}</span>
        <p class="activity-name">${item.activity.name}</p>
        <p class="activity-loc">${commune}</p>
      </div>
      <div class="activity-actions">
        <button class="act-btn edit" title="Bientôt disponible" onclick="showComingSoonBtn(this)">Modifier</button>
        <button class="act-btn" onclick="removeActivite(${projetId}, ${item.id}, this)">Retirer</button>
      </div>
    </div>`;
}

// Affiche un tooltip "Bientôt disponible" au clic
function showComingSoonBtn(btn) {
  btn.setAttribute('title', 'Bientôt disponible');
  let msg = btn.nextElementSibling;
  if (!msg || !msg.classList.contains('soon-inline')) {
    msg = document.createElement('span');
    msg.className = 'soon-inline';
    msg.style.cssText = 'font-size:11px;color:#888;margin-left:6px;';
    msg.textContent = 'Bientôt';
    btn.parentNode.insertBefore(msg, btn.nextSibling);
    setTimeout(() => msg.remove(), 2000);
  }
}

// Construit le HTML d'un day-block
function buildDayBlock(dayNumber, dateStr, items) {
  const dateLabel = dateStr ? formatDayFull(dateStr) : `Jour ${dayNumber}`;
  const activitiesHtml = items.length > 0
    ? items.map(buildActivityCard).join('')
    : '<p style="color:#888;font-size:14px;padding:8px 0;">Aucune activité planifiée pour ce jour.</p>';

  return `
    <div class="day-block" id="day-block-${dayNumber}">
      <div class="day-header">
        <span class="day-number">Jour ${dayNumber}</span>
        <span class="day-date">${dateLabel}</span>
        <div class="day-line"></div>
      </div>
      <div class="activity-list">
        ${activitiesHtml}
        <button class="add-activity" onclick="openAddActiviteModal(${dayNumber})">+ Ajouter une activité</button>
      </div>
    </div>`;
}

// Rend les onglets semaine dynamiquement selon le nombre de jours
function renderWeekTabs(totalDays) {
  const tabsEl = document.querySelector('.week-tabs');
  const contentsArea = tabsEl ? tabsEl.nextElementSibling : null;
  if (!tabsEl) return;

  // Pour garder la structure HTML de la maquette, on reconstruit les onglets
  // Semaine 1 : jours 1-7, Semaine 2 : jours 8+
  const hasWeek2 = totalDays > 7;
  tabsEl.innerHTML = `
    <button class="week-tab active" onclick="switchWeek(1)">Semaine 1 · Jours 1-${Math.min(7, totalDays)}</button>
    ${hasWeek2 ? `<button class="week-tab" onclick="switchWeek(2)">Semaine 2 · Jours 8-${totalDays}</button>` : ''}`;
}

// Affiche le projet : hero, sidebar, day-blocks
async function renderProjet(projet) {
  projetData = projet;
  const totalDays = daysBetween(projet.start_date, projet.end_date);
  const actCount = projet.items ? projet.items.length : 0;

  // Titre du projet (page title + hero)
  document.title = `${projet.name} : mon projet de voyage`;
  const titleEl = document.querySelector('.projet-title');
  if (titleEl) titleEl.textContent = projet.name;

  // Dates et voyageurs
  const datesEl = document.querySelector('.projet-dates');
  if (datesEl) {
    const startFmt = formatDateShort(projet.start_date);
    const endFmt = formatDateShort(projet.end_date);
    datesEl.innerHTML = `<strong>${startFmt} au ${endFmt}</strong> · ${totalDays} jour${totalDays > 1 ? 's' : ''}`;
  }

  // Statut du projet
  const statusEl = document.querySelector('.projet-status');
  if (statusEl && projet.start_date) {
    const now = new Date();
    const start = new Date(projet.start_date);
    const end = projet.end_date ? new Date(projet.end_date) : null;
    if (now >= start && (!end || now <= end)) statusEl.textContent = 'En cours';
    else if (start > now) statusEl.textContent = 'Planifié';
    else statusEl.textContent = 'Terminé';
  }

  // Barre de progression : jours avec au moins une activité / total jours
  const daysWithActivities = new Set((projet.items || []).map(i => i.day_number).filter(Boolean)).size;
  const pct = totalDays > 0 ? Math.round((daysWithActivities / totalDays) * 100) : 0;
  const progressFill = document.querySelector('.progress-bar-fill');
  if (progressFill) progressFill.style.width = `${pct}%`;
  const progressLabel = document.querySelector('.progress-label');
  if (progressLabel) {
    progressLabel.textContent = `${actCount} activité${actCount > 1 ? 's' : ''} planifiée${actCount > 1 ? 's' : ''} · ${Math.max(0, totalDays - daysWithActivities)} jour${totalDays - daysWithActivities > 1 ? 's' : ''} restant${totalDays - daysWithActivities > 1 ? 's' : ''} à remplir`;
  }

  // Boutons hors scope v1
  document.querySelectorAll('.btn-outline').forEach(btn => {
    btn.addEventListener('click', () => {
      showComingSoonBtn(btn);
      const label = btn.textContent.trim();
      alert(`${label} : bientôt disponible.`);
    });
  });

  // Bouton "Optimiser avec l'IA"
  const iaBtn = document.querySelector('.btn-ia');
  if (iaBtn) {
    iaBtn.addEventListener('click', () => {
      window.location.href = `planning-ia.html?projet_id=${projetId}`;
    });
  }

  // Sidebar IA : redirige vers planning-ia
  const iaSideBtn = document.querySelector('.ia-side-btn');
  if (iaSideBtn) {
    iaSideBtn.addEventListener('click', () => {
      window.location.href = `planning-ia.html?projet_id=${projetId}`;
    });
  }

  // Sidebar récap
  const recapRows = document.querySelectorAll('.recap-row');
  if (recapRows.length >= 4) {
    recapRows[0].querySelector('.recap-val').textContent = `${totalDays} jour${totalDays > 1 ? 's' : ''}`;
    recapRows[1].querySelector('.recap-val').textContent = '-';
    recapRows[2].querySelector('.recap-val').textContent = `${actCount}`;
    recapRows[3].querySelector('.recap-val').textContent = `${daysWithActivities} / ${totalDays}`;
  }

  // Initiales dans la nav
  await loadNavAvatar();

  // Onglets semaine
  renderWeekTabs(totalDays);

  // Groupe les items par day_number
  const itemsByDay = {};
  (projet.items || []).forEach(item => {
    const day = item.day_number || 0;
    if (!itemsByDay[day]) itemsByDay[day] = [];
    itemsByDay[day].push(item);
  });

  // Reconstruit la colonne principale avec les day-blocks
  const mainCol = document.querySelector('.page-body > div:first-child');
  if (!mainCol) return;

  // On recrée le contenu de la colonne principale
  const weekTabs = mainCol.querySelector('.week-tabs');
  mainCol.innerHTML = '';
  if (weekTabs) mainCol.appendChild(weekTabs);

  // Semaine 1 : jours 1 à 7
  const week1 = document.createElement('div');
  week1.className = 'week-content active';
  week1.id = 'week-1';

  for (let d = 1; d <= Math.min(7, totalDays); d++) {
    const dateStr = getDateForDay(projet.start_date, d);
    week1.insertAdjacentHTML('beforeend', buildDayBlock(d, dateStr, itemsByDay[d] || []));
  }
  mainCol.appendChild(week1);

  // Semaine 2 : jours 8+
  if (totalDays > 7) {
    const week2 = document.createElement('div');
    week2.className = 'week-content';
    week2.id = 'week-2';

    for (let d = 8; d <= totalDays; d++) {
      const dateStr = getDateForDay(projet.start_date, d);
      week2.insertAdjacentHTML('beforeend', buildDayBlock(d, dateStr, itemsByDay[d] || []));
    }
    mainCol.appendChild(week2);
  }

  // Si aucun jour défini : affiche les items sans day_number (day=0) dans un bloc générique
  if (itemsByDay[0] && itemsByDay[0].length > 0) {
    const genericBlock = `
      <div class="day-block">
        <div class="day-header">
          <span class="day-number">Activités non planifiées</span>
          <div class="day-line"></div>
        </div>
        <div class="activity-list">
          ${itemsByDay[0].map(buildActivityCard).join('')}
        </div>
      </div>`;
    week1.insertAdjacentHTML('afterbegin', genericBlock);
  }
}

// Retire une activité du projet via DELETE /projets/{id}/activites/{item_id}
async function removeActivite(projId, itemId, btn) {
  if (!confirm('Retirer cette activité du projet ?')) return;
  btn.disabled = true;
  btn.textContent = '...';

  try {
    const res = await fetch(`${API_URL}/projets/${projId}/activites/${itemId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Erreur');
    }
    // Rafraichit le projet
    await reloadProjet();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Retirer';
    alert(err.message || 'Impossible de retirer l\'activité.');
  }
}

// Recharge les données du projet depuis l'API
async function reloadProjet() {
  try {
    const res = await fetch(`${API_URL}/projets/${projetId}`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) throw new Error();
    const projet = await res.json();
    await renderProjet(projet);
  } catch (_) {
    // Silencieux : on garde l'affichage actuel
  }
}

// Ouvre la modale d'ajout d'activité pour un jour donné
function openAddActiviteModal(dayNumber) {
  const existing = document.getElementById('modal-add-act');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-add-act';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;
    display:flex;align-items:center;justify-content:center;padding:20px;`;

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25);">
      <h3 style="margin:0 0 16px;font-size:18px;">Ajouter une activité · Jour ${dayNumber}</h3>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <input id="add-act-search" type="text" placeholder="Rechercher une activité..."
          style="flex:1;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;">
        <button id="add-act-btn-search"
          style="padding:10px 16px;background:var(--rouge,#C8392B);color:#fff;border:none;border-radius:8px;cursor:pointer;">
          Chercher
        </button>
      </div>
      <div id="add-act-results" style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;"></div>
      <button id="add-act-close"
        style="margin-top:16px;width:100%;padding:10px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer;">
        Annuler
      </button>
    </div>`;

  document.body.appendChild(modal);
  document.getElementById('add-act-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  const searchInput = document.getElementById('add-act-search');
  const searchBtn = document.getElementById('add-act-btn-search');
  const resultsEl = document.getElementById('add-act-results');

  // Recherche d'activités
  async function searchActivites() {
    const term = searchInput.value.trim();
    resultsEl.innerHTML = '<p style="color:#666;font-size:14px;">Recherche...</p>';
    try {
      const params = new URLSearchParams();
      if (term) params.set('search', term);
      const res = await fetch(`${API_URL}/activites?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const items = data.items || [];
      if (items.length === 0) {
        resultsEl.innerHTML = '<p style="color:#666;font-size:14px;">Aucun résultat.</p>';
        return;
      }
      resultsEl.innerHTML = items.map(item => {
        const commune = item.address ? item.address.split(',')[0].trim() : '';
        const typeLabel = item.category === 'beach' ? 'Plage' : item.category === 'hike' ? 'Randonnée' : item.category;
        return `
          <div class="add-act-result" data-id="${item.id}"
            style="padding:12px;border:1px solid #eee;border-radius:10px;cursor:pointer;transition:background .15s;"
            onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='#fff'">
            <strong style="font-size:14px;">${item.name}</strong>
            <p style="font-size:12px;color:#888;margin:2px 0 0;">${typeLabel} · ${commune}</p>
          </div>`;
      }).join('');

      resultsEl.querySelectorAll('.add-act-result').forEach(el => {
        el.addEventListener('click', async () => {
          const actId = parseInt(el.dataset.id);
          el.style.background = '#f0f0f0';
          await addActiviteToProjet(actId, dayNumber, modal);
        });
      });
    } catch (_) {
      resultsEl.innerHTML = '<p style="color:var(--rouge);font-size:14px;">Impossible de charger les activités.</p>';
    }
  }

  searchBtn.addEventListener('click', searchActivites);
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchActivites(); });
  // Charge les activités dès l'ouverture
  searchActivites();
}

// Ajoute une activité au projet via POST /projets/{id}/activites
async function addActiviteToProjet(activiteId, dayNumber, modal) {
  try {
    const res = await fetch(`${API_URL}/projets/${projetId}/activites`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_id: activiteId, day_number: dayNumber }),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Erreur');
    }
    modal.remove();
    await reloadProjet();
  } catch (err) {
    const resultsEl = document.getElementById('add-act-results');
    if (resultsEl) {
      resultsEl.insertAdjacentHTML('afterbegin',
        `<p style="color:var(--rouge);font-size:13px;">${err.message}</p>`);
    }
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();

  const params = new URLSearchParams(window.location.search);
  projetId = params.get('id');

  if (!projetId) {
    document.querySelector('.projet-title').textContent = 'Projet introuvable';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/projets/${projetId}`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) {
      const err = await res.json();
      document.querySelector('.projet-title').textContent = err.detail || 'Projet introuvable';
      return;
    }
    const projet = await res.json();
    await renderProjet(projet);
  } catch (_) {
    document.querySelector('.projet-title').textContent = 'Impossible de charger le projet.';
  }
});