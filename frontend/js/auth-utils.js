// Utilitaires partagés : URL de base, token JWT, headers d'authentification.

const API_URL = 'http://localhost:8000';

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
