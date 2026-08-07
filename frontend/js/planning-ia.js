const bar = document.getElementById('madrasBar');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const pct = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
    bar.style.width = (isNaN(pct) ? 0 : pct) + '%';
  });

  function selectChip(el) { el.classList.toggle('selected'); }

  function switchPlanWeek(n) {
    document.querySelectorAll('.week-tab-btn').forEach((btn, i) => btn.classList.toggle('active', i + 1 === n));
    document.querySelectorAll('.plan-week-content').forEach((c, i) => c.classList.toggle('active', i + 1 === n));
  }

  function toggleDay(el) {
    el.classList.toggle('open');
  }

  function sendMessage() {
    const ta = document.querySelector('.chat-input');
    const txt = ta.value.trim();
    if (!txt) return;
    const msgs = document.getElementById('chatMessages');
    const typing = document.getElementById('typingIndicator');

    const bulle = document.createElement('div');
    bulle.className = 'msg-bulle user';
    bulle.textContent = txt;
    msgs.insertBefore(bulle, typing);

    const time = document.createElement('div');
    time.className = 'msg-time right';
    time.textContent = 'À l\'instant';
    msgs.insertBefore(time, typing);

    ta.value = '';
    msgs.scrollTop = msgs.scrollHeight;
  }
