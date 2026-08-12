// Espace personnel : charge le profil et les projets de l'utilisateur connecté.

const bar = document.getElementById('madrasBar');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
  bar.style.width = (isNaN(pct) ? 0 : pct) + '%';
});

// Formate une date ISO en "mois année" en français
function formatDateFr(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// Formate une date ISO en "12 sept. 2026" court
function formatDateShort(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Calcule le nombre de jours entre deux dates
function daysBetween(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

// Calcule les jours avant le départ du projet le plus proche dans le futur
function daysUntilNextDeparture(projets) {
  const now = new Date();
  let min = null;
  projets.forEach(p => {
    if (!p.start_date) return;
    const start = new Date(p.start_date);
    if (start > now) {
      const diff = Math.round((start - now) / (1000 * 60 * 60 * 24));
      if (min === null || diff < min) min = diff;
    }
  });
  return min;
}

// Charge les données du profil utilisateur via GET /utilisateurs/moi
async function loadProfil() {
  try {
    const res = await fetch(`${API_URL}/utilisateurs/moi`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) return;
    const user = await res.json();

    // Initiale dans le grand avatar
    const avatarLg = document.querySelector('.user-avatar-lg');
    if (avatarLg) avatarLg.textContent = user.first_name[0].toUpperCase();

    // Initiales dans la nav
    const navAvatar = document.querySelector('.nav-avatar');
    if (navAvatar) {
      navAvatar.textContent = (user.first_name[0] + user.last_name[0]).toUpperCase();
    }

    // Nom complet dans le h1
    const h1 = document.querySelector('.user-text h1');
    if (h1) h1.textContent = `${user.first_name} ${user.last_name}`;

    // Date d'inscription
    const since = document.querySelector('.user-since');
    if (since) since.textContent = `Membre depuis ${formatDateFr(user.created_at)}`;

  } catch (_) {
    // En cas d'erreur réseau, on garde les valeurs statiques de la maquette
  }
}

// Construit une carte projet HTML
function buildVoyageCard(projet) {
  const days = daysBetween(projet.start_date, projet.end_date);
  const actCount = projet.items ? projet.items.length : 0;
  const startFmt = formatDateShort(projet.start_date);
  const endFmt = formatDateShort(projet.end_date);
  const dateLabel = (startFmt && endFmt) ? `${startFmt} au ${endFmt} · ${days} jour${days > 1 ? 's' : ''}` : 'Dates non définies';

  // Statut basé sur les dates
  let statusLabel = 'Brouillon';
  let statusClass = 'status-draft';
  let thumbClass = 'draft-trip';
  if (projet.start_date) {
    const now = new Date();
    const start = new Date(projet.start_date);
    const end = projet.end_date ? new Date(projet.end_date) : null;
    if (now >= start && (!end || now <= end)) {
      statusLabel = 'En cours';
      statusClass = 'status-active';
      thumbClass = 'active-trip';
    } else if (start > now) {
      statusLabel = 'Planifié';
      statusClass = 'status-draft';
      thumbClass = 'draft-trip';
    }
  }

  const moisAnnee = projet.start_date
    ? new Date(projet.start_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    : '';

  return `
    <div class="voyage-card" data-id="${projet.id}">
      <div class="voyage-card-thumb ${thumbClass}">
        <span class="voyage-status ${statusClass}">${statusLabel}</span>
        <span class="voyage-thumb-label">Martinique · ${moisAnnee}</span>
      </div>
      <div class="voyage-card-body">
        <p class="voyage-card-title">${projet.name}</p>
        <p class="voyage-card-dates">${dateLabel}</p>
        <div class="voyage-card-footer">
          <p class="voyage-pois"><strong>${actCount}</strong> activité${actCount > 1 ? 's' : ''} ajoutée${actCount > 1 ? 's' : ''}</p>
          <button class="voyage-btn" onclick="window.location.href='detail-voyage.html?id=${projet.id}'">Ouvrir</button>
        </div>
      </div>
    </div>`;
}

// Charge et affiche la liste des projets via GET /projets
async function loadProjets() {
  try {
    const res = await fetch(`${API_URL}/projets`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) return;
    const projets = await res.json();

    const grid = document.querySelector('.voyage-grid');
    if (!grid) return;

    // Retire les cards statiques, conserve le "Nouveau projet"
    const newCard = grid.querySelector('.voyage-new-card');
    grid.innerHTML = '';

    // Bandeau "Bientôt disponible" sur la section activités sauvegardées
    const savedGrid = document.querySelector('.saved-grid');
    if (savedGrid) {
      savedGrid.style.position = 'relative';
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:absolute;inset:0;background:rgba(255,255,255,.75);
        display:flex;align-items:center;justify-content:center;
        border-radius:12px;z-index:1;font-size:14px;font-weight:600;color:#666;`;
      overlay.textContent = 'Bientôt disponible';
      savedGrid.appendChild(overlay);
    }

    // Affiche chaque projet
    projets.forEach(p => {
      grid.insertAdjacentHTML('beforeend', buildVoyageCard(p));
    });

    // Remet la carte "Nouveau projet"
    if (newCard) grid.appendChild(newCard);

    // Stats header
    const hstats = document.querySelectorAll('.hstat-val');
    if (hstats.length >= 1) hstats[0].textContent = projets.length;
    if (hstats.length >= 2) hstats[1].textContent = '0'; // Activités sauvegardées : non implémenté v1
    if (hstats.length >= 3) {
      const days = daysUntilNextDeparture(projets);
      hstats[2].textContent = days !== null ? days : '-';
    }

  } catch (_) {
    // En cas d'erreur, on laisse les données statiques de la maquette
  }
}

// Onglets : "Activités sauvegardées" et "Paramètres" -> message "Bientôt disponible"
function setupTabs() {
  const tabs = document.querySelectorAll('.ptab');
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      // Onglets 2 et 3 (index 2, 3) sont hors scope v1
      if (index === 2 || index === 3) {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        // Affiche un message dans le body si pas déjà affiché
        let msg = document.getElementById('tab-soon-msg');
        if (!msg) {
          msg = document.createElement('div');
          msg.id = 'tab-soon-msg';
          msg.style.cssText = 'text-align:center;padding:48px 20px;color:#888;font-size:16px;';
          msg.textContent = 'Cette section sera disponible prochainement.';
          document.querySelector('.page-body').prepend(msg);
        }
        msg.style.display = 'block';
      } else {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const msg = document.getElementById('tab-soon-msg');
        if (msg) msg.style.display = 'none';
      }
    });
  });
}

// Ouvre la modale de création d'un nouveau projet
function openNouveauProjetModal() {
  const existing = document.getElementById('modal-nouveau-projet');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-nouveau-projet';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;
    display:flex;align-items:center;justify-content:center;padding:20px;`;

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;max-width:460px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25);">
      <h3 style="margin:0 0 20px;font-size:18px;">Nouveau projet de voyage</h3>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <label style="font-size:14px;font-weight:500;">
          Nom du projet
          <input id="np-nom" type="text" placeholder="Ex : Martinique en famille"
            style="display:block;width:100%;margin-top:4px;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
        </label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <label style="font-size:14px;font-weight:500;">
            Début
            <input id="np-debut" type="date"
              style="display:block;width:100%;margin-top:4px;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </label>
          <label style="font-size:14px;font-weight:500;">
            Fin
            <input id="np-fin" type="date"
              style="display:block;width:100%;margin-top:4px;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
          </label>
        </div>
      </div>
      <p id="np-error" style="color:var(--rouge,#C8392B);font-size:13px;margin-top:10px;display:none;"></p>
      <div style="display:flex;gap:10px;margin-top:20px;">
        <button id="np-cancel" style="flex:1;padding:12px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer;">Annuler</button>
        <button id="np-submit" style="flex:2;padding:12px;background:var(--rouge,#C8392B);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Créer le projet</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.getElementById('np-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  document.getElementById('np-submit').addEventListener('click', async () => {
    const name = document.getElementById('np-nom').value.trim();
    const start_date = document.getElementById('np-debut').value || null;
    const end_date = document.getElementById('np-fin').value || null;
    const errEl = document.getElementById('np-error');

    if (!name) {
      errEl.textContent = 'Veuillez saisir un nom de projet.';
      errEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('np-submit');
    btn.disabled = true;
    btn.textContent = 'Création...';

    try {
      const res = await fetch(`${API_URL}/projets`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, start_date, end_date }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) {
        const err = await res.json();
        errEl.textContent = err.detail || 'Erreur lors de la création.';
        errEl.style.display = 'block';
        return;
      }
      modal.remove();
      // Rafraichit la liste des projets
      await loadProjets();
    } catch (_) {
      errEl.textContent = 'Impossible de joindre le serveur.';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Créer le projet';
    }
  });
}

// Bouton IA : redirige vers planning-ia.html
function setupIACta() {
  const btn = document.querySelector('.ia-cta');
  if (btn) {
    btn.addEventListener('click', () => {
      window.location.href = 'planning-ia.html';
    });
  }
}

// Initialisation : vérifie l'authentification puis charge les données
document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  loadProfil();
  loadProjets();
  setupTabs();
  setupIACta();

  // Clic sur "Nouveau projet"
  const newCard = document.querySelector('.voyage-new-card');
  if (newCard) {
    newCard.addEventListener('click', openNouveauProjetModal);
  }
});