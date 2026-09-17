// Assistant de planning : conversation avec l'API et affichage du planning enregistré.

const bar = document.getElementById('madrasBar');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
  bar.style.width = (isNaN(pct) ? 0 : pct) + '%';
});

// Doit rester aligne sur DELAI_ENTRE_MESSAGES_SECONDES du backend, qui fait foi
const DELAI_SECONDES = 5;

const LIBELLES_CATEGORIE = {
  beach: 'Plage',
  hike: 'Randonnée',
  rum_distillery: 'Rhumerie',
  restaurant: 'Restaurant',
};

let conversationId = null;
let projetId = null;
let envoiEnCours = false;

// Neutralise le HTML : le texte vient du modèle et des données, jamais de balises
function echapper(texte) {
  const d = document.createElement('div');
  d.textContent = texte == null ? '' : String(texte);
  return d.innerHTML;
}

// Ajoute une bulle dans le fil et fait defiler jusqu'en bas
function ajouterMessage(role, texte) {
  const fil = document.getElementById('chatMessages');
  const typing = document.getElementById('typingIndicator');
  const bulle = document.createElement('div');
  bulle.className = `msg-bulle ${role === 'user' ? 'user' : 'ia'}`;
  // Les sauts de ligne du modèle comptent : ils structurent le programme
  bulle.innerHTML = echapper(texte).replace(/\n/g, '<br>');
  fil.insertBefore(bulle, typing);
  fil.scrollTop = fil.scrollHeight;
  return bulle;
}

function afficherTyping(visible) {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.hidden = !visible;
  if (visible) {
    const fil = document.getElementById('chatMessages');
    fil.scrollTop = fil.scrollHeight;
  }
}

function majStatut(texte, disponible = true) {
  const zone = document.getElementById('contextStatus');
  const libelle = document.getElementById('contextStatusText');
  if (libelle) libelle.textContent = texte;
  if (zone) zone.classList.toggle('indisponible', !disponible);
}

// Deplie ou replie une journee du planning
function toggleDay(el) {
  el.classList.toggle('open');
}

// Remplit le volet du planning a partir du projet enregistre
async function chargerPlanning(id) {
  if (!id) return;
  try {
    const res = await fetch(`${API_URL}/projets/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const projet = await res.json();

    const conteneur = document.getElementById('planJours');
    const vide = document.getElementById('planVide');
    if (vide) vide.remove();

    // Regroupe les activites par journee : l'API les renvoie a plat
    const parJour = new Map();
    (projet.items || []).forEach(item => {
      const jour = item.day_number || 1;
      if (!parJour.has(jour)) parJour.set(jour, []);
      parJour.get(jour).push(item);
    });

    // Les journées de repos n'ont aucune activité : l'API ne les renvoie donc pas.
    // On complète la suite des jours pour qu'elles restent visibles dans le planning.
    const numeros = [...parJour.keys()].sort((a, b) => a - b);
    const dernier = numeros.length ? numeros[numeros.length - 1] : 0;
    const jours = [];
    for (let n = 1; n <= dernier; n++) jours.push(n);

    conteneur.innerHTML = jours.map(jour => {
      const activites = parJour.get(jour) || [];
      if (activites.length === 0) {
        return `
        <div class="plan-day plan-day-repos">
          <div class="plan-day-head">
            <div class="plan-day-left"><span class="plan-day-num">Jour ${jour}</span></div>
            <div class="plan-day-left"><span class="plan-day-summary">Journée de repos</span></div>
          </div>
        </div>`;
      }
      const resume = activites.map(i => i.activity.name).join(' · ');
      const lignes = activites.map(i => `
        <div class="plan-activity">
          <div class="plan-act-info">
            <p class="plan-act-name">${echapper(i.activity.name)}</p>
            <p class="plan-act-cat">${echapper(LIBELLES_CATEGORIE[i.activity.category] || i.activity.category)}</p>
          </div>
        </div>`).join('');
      return `
        <div class="plan-day open" onclick="toggleDay(this)">
          <div class="plan-day-head">
            <div class="plan-day-left">
              <span class="plan-day-num">Jour ${jour}</span>
            </div>
            <div class="plan-day-left">
              <span class="plan-day-summary">${echapper(resume)}</span>
              <span class="plan-day-chevron">▼</span>
            </div>
          </div>
          <div class="plan-activities">${lignes}</div>
        </div>`;
    }).join('');

    const sousTitre = document.getElementById('planHeaderSub');
    if (sousTitre) {
      const actives = numeros.length;
      sousTitre.textContent = `${projet.name} · ${jours.length} journée${jours.length > 1 ? 's' : ''}`
        + (jours.length > actives ? `, dont ${jours.length - actives} de repos` : '');
    }
    const lien = document.getElementById('planLien');
    if (lien) {
      lien.href = `detail-voyage.html?id=${projet.id}`;
      lien.hidden = false;
    }
    const contexte = document.getElementById('contextTrip');
    if (contexte) contexte.textContent = projet.name;
  } catch {
    // Le planning reste consultable depuis l'espace personnel : on n'alarme pas ici
  }
}

// Bloque l'envoi pendant le delai impose par le serveur, avec un compte a rebours
function attendreDelai() {
  const bouton = document.querySelector('.send-btn');
  if (!bouton) return;
  let reste = DELAI_SECONDES;
  bouton.disabled = true;
  bouton.textContent = reste;
  const minuteur = setInterval(() => {
    reste -= 1;
    if (reste <= 0) {
      clearInterval(minuteur);
      bouton.disabled = false;
      bouton.textContent = '↑';
    } else {
      bouton.textContent = reste;
    }
  }, 1000);
}

// Envoie le message du voyageur et affiche la reponse
async function sendMessage() {
  const zone = document.querySelector('.chat-input');
  const texte = zone.value.trim();
  if (!texte || envoiEnCours || !conversationId) return;

  envoiEnCours = true;
  ajouterMessage('user', texte);
  zone.value = '';
  afficherTyping(true);

  try {
    const res = await fetch(`${API_URL}/planning/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: texte }),
    });
    const data = await res.json().catch(() => ({}));
    afficherTyping(false);

    if (!res.ok) {
      ajouterMessage('ia', data.detail || "L'assistant est momentanément indisponible.");
      if (res.status === 503) majStatut('Assistant indisponible', false);
      return;
    }

    ajouterMessage('ia', data.reply);
    majStatut(`${data.messages_restants} message(s) restant(s)`);
    if (data.travel_project_id && data.travel_project_id !== projetId) {
      projetId = data.travel_project_id;
      chargerPlanning(projetId);
    }
  } catch {
    afficherTyping(false);
    ajouterMessage('ia', "La connexion au serveur a échoué. Réessayez dans un instant.");
  } finally {
    envoiEnCours = false;
    attendreDelai();
  }
}

// Ouvre une conversation, ou rouvre celle passee dans l'URL
async function initConversation() {
  const params = new URLSearchParams(window.location.search);
  const existante = params.get('conversation');

  // Reprise d'une conversation de l'historique
  if (existante) {
    const res = await fetch(`${API_URL}/planning/conversations/${existante}`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      conversationId = data.id;
      projetId = data.travel_project_id;
      data.messages.forEach(m => ajouterMessage(m.role, m.content));
      majStatut(`${data.messages_restants} message(s) restant(s)`);
      if (projetId) chargerPlanning(projetId);
      return;
    }
  }

  const accueil = await fetch(`${API_URL}/planning/accueil`).then(r => r.json()).catch(() => null);

  const res = await fetch(`${API_URL}/planning/conversations`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Limite quotidienne atteinte : on affiche le message du serveur et on coupe la saisie
    ajouterMessage('ia', data.detail || "Impossible d'ouvrir une conversation.");
    majStatut('Limite atteinte', false);
    document.querySelector('.chat-input').disabled = true;
    document.querySelector('.send-btn').disabled = true;
    return;
  }

  conversationId = data.id;
  if (accueil) ajouterMessage('ia', accueil.message);
  majStatut(`${data.messages_restants} message(s) restant(s)`);
}

document.addEventListener('DOMContentLoaded', async () => {
  await updateNav();

  // Connexion obligatoire : chaque message a un coût et le planning appartient à un compte
  if (!getToken()) {
    window.location.href = 'auth.html?redirect=planning-ia.html';
    return;
  }

  try {
    await initConversation();
  } finally {
    document.body.classList.remove('chargement');
  }
});
