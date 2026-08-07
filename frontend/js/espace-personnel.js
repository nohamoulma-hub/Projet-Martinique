const bar = document.getElementById('madrasBar');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
    bar.style.width = (isNaN(pct) ? 0 : pct) + '%';
  });
