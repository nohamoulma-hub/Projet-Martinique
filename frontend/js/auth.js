/* Progress bar */
  const bar = document.getElementById('progressBar');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
    bar.style.width = (isNaN(pct) ? 0 : pct) + '%';
  });

  /* Titre animé — conveyor belt */
  // Track : [fr | cr | kw | fr-copy] — 4 items à 25% chacun
  // Slide toujours vers la gauche, reset silencieux après le 3e slide
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
  }
