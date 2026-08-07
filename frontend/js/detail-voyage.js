const bar = document.getElementById('madrasBar');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
    bar.style.width = (isNaN(pct) ? 0 : pct) + '%';
  });

  function switchWeek(n) {
    document.querySelectorAll('.week-tab').forEach((t, i) => t.classList.toggle('active', i + 1 === n));
    document.querySelectorAll('.week-content').forEach((c, i) => c.classList.toggle('active', i + 1 === n));
    // Ferme les sélecteurs ouverts à la volée
    document.querySelectorAll('.day-picker').forEach(p => p.style.display = 'none');
  }

  function togglePicker(id) {
    const p = document.getElementById(id);
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
  }
