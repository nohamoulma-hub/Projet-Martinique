// Utilitaires partagés : URL de base, token JWT, headers d'authentification.

// Toutes les routes de l'API vivent sous /api. Cette constante est utilisee par tous
// les fetch du site : ce seul endroit suffit a changer l'adresse de base.
const API_URL = '/api';

// Retourne le token JWT stocké dans localStorage, ou null si absent.
function getToken() {
  return localStorage.getItem('jwt_token');
}

// Retourne les headers d'autorisation si l'utilisateur est connecté.
function getAuthHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Redirige vers auth.html si aucun token n'est présent.
function requireAuth() {
  if (!getToken()) {
    window.location.href = 'auth.html';
  }
}

// Initiales mises en cache a la connexion. Elles evitent d'attendre un aller-retour
// avec l'API pour afficher deux lettres, ce qui faisait apparaitre la bulle en retard.
function getInitialesCache() {
  try { return localStorage.getItem('user_initials'); } catch (_) { return null; }
}

function setInitialesCache(initiales) {
  try { localStorage.setItem('user_initials', initiales); } catch (_) {}
}

// Efface tout ce qui identifie l'utilisateur. A appeler a chaque deconnexion,
// sinon les initiales du compte precedent resteraient affichees.
function clearSession() {
  try {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_initials');
  } catch (_) {}
}

// Gère une réponse 401 : supprime le token et redirige vers la connexion.
function handleUnauthorized() {
  clearSession();
  window.location.href = 'auth.html';
}

// Remplit la bulle .nav-avatar deja presente dans le HTML. Utilisee par les pages
// qui n'appellent pas updateNav (detail-voyage). Le cache evite d'attendre le reseau :
// la requete ne sert qu'a corriger les initiales si le nom a change.
// Volontairement non async : rien ici ne doit retarder l'affichage.
function loadNavAvatar() {
  if (!getToken()) return;
  const avatar = document.querySelector('.nav-avatar');
  if (!avatar) return;

  const cache = getInitialesCache();
  if (cache) avatar.textContent = cache;

  fetchInitials().then(frais => {
    if (frais === null || frais === cache) return;
    setInitialesCache(frais);
    const el = document.querySelector('.nav-avatar');
    if (el) el.textContent = frais;
  });
}

// Injecte les styles CSS pour la bulle avatar et le menu déroulant.
function injectAvatarStyles() {
  if (document.getElementById('nav-avatar-style')) return;
  const style = document.createElement('style');
  style.id = 'nav-avatar-style';
  style.textContent = `
    nav .nav-avatar {
      position: relative;
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--jaune, #F0B429); color: var(--nuit, #0D1F2D);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 12px; flex-shrink: 0;
      cursor: pointer; user-select: none;
      letter-spacing: 0; text-transform: none;
    }
    .nav-dropdown {
      position: fixed;
      min-width: 190px;
      background: #0D1F2D;
      border: 1px solid rgba(240,180,41,0.2);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      z-index: 9999;
      overflow: hidden;
      display: none;
    }
    .nav-dropdown.open { display: block; }
    .nav-dropdown a,
    .nav-dropdown button {
      display: block; width: 100%;
      padding: 12px 16px;
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      font-size: 13px; font-family: inherit;
      background: none; border: none;
      text-align: left; cursor: pointer;
      transition: background .15s, color .15s;
      box-sizing: border-box;
    }
    .nav-dropdown a:hover,
    .nav-dropdown button:hover {
      background: rgba(240,180,41,0.1);
      color: #F0B429;
    }
    .dropdown-sep { height: 1px; background: rgba(255,255,255,0.06); }
  `;
  document.head.appendChild(style);
}

// Récupère les initiales de l'utilisateur via l'API.
async function fetchInitials() {
  try {
    const res = await fetch(`${API_URL}/utilisateurs/moi`, { headers: getAuthHeaders() });
    if (res.status === 401) { handleUnauthorized(); return null; }
    if (!res.ok) return null;
    const user = await res.json();
    return (user.first_name[0] + user.last_name[0]).toUpperCase();
  } catch (_) {
    return null;
  }
}

// Construit la bulle et son menu deroulant a partir d'initiales deja connues.
// Synchrone : c'est ce qui permet d'afficher la bulle sans attendre le reseau.
function construireBulle(initiales) {
  injectAvatarStyles();

  // Supprime une bulle existante pour éviter les doublons
  document.querySelector('nav .nav-avatar')?.remove();
  document.querySelector('.nav-dropdown')?.remove();

  const avatar = document.createElement('div');
  avatar.className = 'nav-avatar';
  avatar.textContent = initiales;

  // Menu déroulant injecté dans le body pour ignorer overflow:hidden de la nav
  const dropdown = document.createElement('div');
  dropdown.className = 'nav-dropdown';
  dropdown.innerHTML = `
    <a href="espace-personnel.html">Mon espace personnel</a>
    <div class="dropdown-sep"></div>
    <button id="nav-logout-btn">Se déconnecter</button>
  `;
  document.body.appendChild(dropdown);

  // Positionne le dropdown sous la bulle (fixed, indépendant du scroll)
  function positionDropdown() {
    const rect = avatar.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 8) + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';
  }

  // Clic sur la bulle : ouvre ou ferme le menu
  avatar.addEventListener('click', (e) => {
    e.stopPropagation();
    positionDropdown();
    dropdown.classList.toggle('open');
  });

  // Déconnexion : efface la session complete, initiales comprises
  document.getElementById('nav-logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'accueil.html';
  });

  // Clic ailleurs sur la page : ferme le menu
  document.addEventListener('click', () => dropdown.classList.remove('open'));

  // Insère la bulle dans le .nav-right-group existant ou directement dans nav
  const group = document.querySelector('nav .nav-right-group');
  if (group) {
    group.appendChild(avatar);
  } else {
    const nav = document.querySelector('nav');
    if (nav) nav.appendChild(avatar);
  }
}

// Affiche la bulle immediatement depuis le cache, puis verifie aupres de l'API.
// Volontairement non async : rien ici ne doit retarder l'affichage de la nav.
function injectAvatarBubble() {
  const cache = getInitialesCache();
  if (cache) construireBulle(cache);

  // Rafraichissement en arriere-plan : corrige le cache si le nom a change et
  // construit la bulle si le cache etait vide (session ouverte avant cette version).
  fetchInitials().then(frais => {
    if (frais === null || frais === cache) return;
    setInitialesCache(frais);
    construireBulle(frais);
  });
}

// Complete la nav apres le chargement. Les liens eux-memes ne sont plus reconstruits :
// les deux variantes sont livrees dans le HTML et le CSS du head en masque une avant
// le premier rendu. Reconstruire la liste ici ajoutait le lien "Accueil", absent du
// HTML, ce qui decalait tout le menu apres coup a chaque changement de page.
// Il ne reste donc que la bulle de profil, qui ne peut pas etre livree statiquement
// puisqu'elle depend des initiales de l'utilisateur.
async function updateNav() {
  if (getToken()) injectAvatarBubble();
}
