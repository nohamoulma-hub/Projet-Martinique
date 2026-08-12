/* Progress bar */
const bar = document.getElementById('progressBar');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
  bar.style.width = (isNaN(pct) ? 0 : pct) + '%';
});

/* Titre anime — conveyor belt */
// Track : 4 titres à 25% chacun, boucle sans saut visible
const track = document.getElementById('titleTrack');
let step = 0;
setInterval(() => {
  step++;
  track.style.transition = 'transform .5s cubic-bezier(.4,0,.2,1)';
  track.style.transform = `translateX(-${step * 25}%)`;
  if (step === 3) {
    setTimeout(() => {
      track.style.transition = 'none';
      track.style.transform = 'translateX(0%)';
      step = 0;
    }, 550);
  }
}, 3000);

/* Tab switch */
function switchTab(tab) {
  const isConnexion = tab === 'connexion';
  document.getElementById('tab-connexion').classList.toggle('active', isConnexion);
  document.getElementById('tab-inscription').classList.toggle('active', !isConnexion);
  document.getElementById('view-connexion').classList.toggle('visible', isConnexion);
  document.getElementById('view-inscription').classList.toggle('visible', !isConnexion);
  document.getElementById('switch-hint').innerHTML = isConnexion
    ? 'Pas encore de compte ? <a href="#" onclick="switchTab(\'inscription\'); return false;">Créer un compte</a>'
    : 'Déjà un compte ? <a href="#" onclick="switchTab(\'connexion\'); return false;">Se connecter</a>';
  // Efface les messages d'erreur lors du changement d'onglet
  clearError('error-connexion');
  clearError('error-inscription');
}

/* Affiche un message d'erreur sous le formulaire actif */
function showError(id, message) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('p');
    el.id = id;
    el.style.cssText = 'color:#C8392B;font-size:14px;margin-top:8px;text-align:center;';
  }
  el.textContent = message;
  return el;
}

function clearError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}

/* Validation mot de passe : 8 caractères min, une majuscule, un chiffre */
function validatePassword(pwd) {
  if (pwd.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (!/[A-Z]/.test(pwd)) return 'Le mot de passe doit contenir au moins une majuscule.';
  if (!/[0-9]/.test(pwd)) return 'Le mot de passe doit contenir au moins un chiffre.';
  return null;
}

/* Connexion : POST /auth/connexion */
async function handleConnexion() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pwd').value;
  const btn = document.querySelector('#view-connexion .submit-btn');
  const errDiv = showError('error-connexion', '');

  // Insertion de l'erreur sous le bouton si pas encore en place
  if (!document.getElementById('error-connexion')) {
    btn.parentNode.insertBefore(errDiv, btn.nextSibling);
  } else {
    clearError('error-connexion');
  }

  if (!email || !password) {
    showError('error-connexion', 'Veuillez remplir tous les champs.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Connexion en cours...';

  try {
    const res = await fetch(`${API_URL}/auth/connexion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('error-connexion').textContent = data.detail || 'Erreur de connexion.';
      return;
    }
    localStorage.setItem('jwt_token', data.access_token);
    window.location.href = 'espace-personnel.html';
  } catch (_) {
    document.getElementById('error-connexion').textContent = 'Impossible de joindre le serveur.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
}

/* Inscription : POST /auth/inscription */
async function handleInscription() {
  const first_name = document.getElementById('reg-prenom').value.trim();
  const last_name = document.getElementById('reg-nom').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pwd = document.getElementById('reg-pwd').value;
  const pwd2 = document.getElementById('reg-pwd2').value;
  const btn = document.querySelector('#view-inscription .submit-btn');

  // Insertion de la zone d'erreur sous le bouton
  if (!document.getElementById('error-inscription')) {
    const errDiv = showError('error-inscription', '');
    btn.parentNode.insertBefore(errDiv, btn.nextSibling);
  } else {
    clearError('error-inscription');
  }

  // Validation côté client
  if (!first_name || !last_name || !email || !pwd || !pwd2) {
    document.getElementById('error-inscription').textContent = 'Veuillez remplir tous les champs.';
    return;
  }
  const pwdError = validatePassword(pwd);
  if (pwdError) {
    document.getElementById('error-inscription').textContent = pwdError;
    return;
  }
  if (pwd !== pwd2) {
    document.getElementById('error-inscription').textContent = 'Les mots de passe ne correspondent pas.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Création en cours...';

  try {
    const res = await fetch(`${API_URL}/auth/inscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name, last_name, email, password: pwd }),
    });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('error-inscription').textContent = data.detail || 'Erreur lors de la création du compte.';
      return;
    }
    localStorage.setItem('jwt_token', data.access_token);
    window.location.href = 'espace-personnel.html';
  } catch (_) {
    document.getElementById('error-inscription').textContent = 'Impossible de joindre le serveur.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Créer mon compte';
  }
}

/* Attache les handlers aux boutons après chargement du DOM */
document.addEventListener('DOMContentLoaded', () => {
  // Bouton connexion
  const btnConnexion = document.querySelector('#view-connexion .submit-btn');
  if (btnConnexion) btnConnexion.addEventListener('click', handleConnexion);

  // Bouton inscription
  const btnInscription = document.querySelector('#view-inscription .submit-btn');
  if (btnInscription) btnInscription.addEventListener('click', handleInscription);

  // Boutons Google : afficher "Bientôt disponible"
  document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Affiche le message en inline sous le bouton
      let msg = btn.nextElementSibling;
      if (!msg || !msg.classList.contains('google-soon')) {
        msg = document.createElement('p');
        msg.className = 'google-soon';
        msg.style.cssText = 'color:var(--bleu,#1A5C8A);font-size:13px;margin-top:6px;text-align:center;';
        msg.textContent = 'Connexion Google bientôt disponible.';
        btn.parentNode.insertBefore(msg, btn.nextSibling);
      }
      msg.style.display = msg.style.display === 'none' ? 'block' : 'block';
    });
  });

  // Si déjà connecté, redirige directement
  if (localStorage.getItem('jwt_token')) {
    window.location.href = 'espace-personnel.html';
  }
});