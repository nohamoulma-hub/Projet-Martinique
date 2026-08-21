// Utilitaires partagés : URL de base, token JWT, headers d'authentification.

const API_URL = '';

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

// Gère une réponse 401 : supprime le token et redirige vers la connexion.
function handleUnauthorized() {
  localStorage.removeItem('jwt_token');
  window.location.href = 'auth.html';
}

// Affiche les initiales de l'utilisateur dans .nav-avatar si connecté.
async function loadNavAvatar() {
  const token = getToken();
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/utilisateurs/moi`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!res.ok) return;
    const user = await res.json();
    const avatar = document.querySelector('.nav-avatar');
    if (avatar) {
      const initials = (user.first_name[0] + user.last_name[0]).toUpperCase();
      avatar.textContent = initials;
    }
  } catch (_) {
    // Pas de réseau : on laisse les initiales statiques de la maquette
  }
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

// Injecte la bulle d'initiales dans la nav avec son menu déroulant.
async function injectAvatarBubble() {
  injectAvatarStyles();

  // Supprime une bulle existante pour éviter les doublons
  document.querySelector('nav .nav-avatar')?.remove();
  document.querySelector('.nav-dropdown')?.remove();

  const initials = await fetchInitials();
  if (initials === null) return;

  // Bulle d'initiales
  const avatar = document.createElement('div');
  avatar.className = 'nav-avatar';
  avatar.textContent = initials;

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

  // Déconnexion : supprime le JWT et redirige vers l'accueil
  document.getElementById('nav-logout-btn').addEventListener('click', () => {
    localStorage.removeItem('jwt_token');
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

// Détecte le nom de la page courante pour marquer le lien actif.
function currentPage() {
  return window.location.pathname.split('/').pop() || 'accueil.html';
}

// Reconstruit les liens de nav et les enveloppe dans un nav-right-group.
// A appeler au DOMContentLoaded sur chaque page publique.
async function updateNav() {
  const token = getToken();
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;

  const page = currentPage();

  if (token) {
    // Connecté : menu complet avec "Mes projets" à la place de "Mon voyage"
    navLinks.innerHTML = `
      <li><a href="accueil.html"${page === 'accueil.html' ? ' class="active"' : ''}>Accueil</a></li>
      <li><a href="catalogue.html"${page === 'catalogue.html' ? ' class="active"' : ''}>Catalogue</a></li>
      <li><a href="meteo.html"${page === 'meteo.html' ? ' class="active"' : ''}>Météo</a></li>
      <li><a href="planning-ia.html"${page === 'planning-ia.html' ? ' class="active"' : ''}>Planning IA</a></li>
      <li><a href="espace-personnel.html"${page === 'espace-personnel.html' ? ' class="active"' : ''}>Mes projets</a></li>
    `;

    // Enveloppe nav-links dans un nav-right-group si ce n'est pas déjà le cas
    if (!navLinks.closest('.nav-right-group')) {
      const group = document.createElement('div');
      group.className = 'nav-right-group';
      navLinks.parentNode.insertBefore(group, navLinks);
      group.appendChild(navLinks);
    }

    // Injecte les styles et la bulle dans le nav-right-group
    await injectAvatarBubble();
  } else {
    // Non connecté : menu complet avec "Mon voyage" en rouge
    navLinks.innerHTML = `
      <li><a href="accueil.html"${page === 'accueil.html' ? ' class="active"' : ''}>Accueil</a></li>
      <li><a href="catalogue.html"${page === 'catalogue.html' ? ' class="active"' : ''}>Catalogue</a></li>
      <li><a href="meteo.html"${page === 'meteo.html' ? ' class="active"' : ''}>Météo</a></li>
      <li><a href="planning-ia.html"${page === 'planning-ia.html' ? ' class="active"' : ''}>Planning IA</a></li>
      <li><a href="espace-personnel.html" class="nav-cta">Mon voyage</a></li>
    `;
  }
}
