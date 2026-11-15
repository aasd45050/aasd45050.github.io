(() => {
  const games = window.ORBITAL_GAMES || [];
  const $ = selector => document.querySelector(selector);
  const loginPanel = $('#loginPanel');
  const dashboard = $('#dashboard');
  const list = $('#adminGameList');
  const SESSION_KEY = 'orb1tal-admin-password';   // kept for this browser tab only
  const options = [
    {value:'up',label:'🟢 Up'},
    {value:'unstable',label:'🟡 Unstable'},
    {value:'very-unstable',label:'🟠 Very unstable'},
    {value:'down',label:'🔴 Down'}
  ];
  let state = { statuses: {}, order: [] };

  function setNote(text) { $('#saveNote').textContent = text; }
  function statusLabel(value) {
    return options.find(option => option.value === value)?.label || value;
  }
  // Games in the saved order; any new games not yet ordered go to the end.
  function currentGames() {
    const saved = state.order;
    const rank = id => { const i = saved.indexOf(id); return i < 0 ? Infinity : i; };
    return games
      .map((game, index) => ({ game, index }))
      .sort((a, b) => (rank(a.game.id) - rank(b.game.id)) || (a.index - b.index))
      .map(item => item.game);
  }
  async function loadState() {
    const res = await fetch((window.ORB1TAL_API || '') + '/state', { cache: 'no-store' });
    if (!res.ok) throw new Error('load failed');
    const data = await res.json();
    state = { statuses: data.statuses || {}, order: data.order || [] };
  }
  // Saves the whole state to the server. Returns true if it was stored.
  async function saveState() {
    setNote('Saving…');
    try {
      const res = await fetch((window.ORB1TAL_API || '') + '/state', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': sessionStorage.getItem(SESSION_KEY) || ''
        },
        body: JSON.stringify(state)
      });
      if (res.status === 401) {
        setNote('Your session has expired. Log in again.');
        return false;
      }
      if (!res.ok) {
        setNote('Save failed. Try again.');
        return false;
      }
      setNote('Saved. Visitors will see this within about 30 seconds.');
      return true;
    } catch {
      setNote('Could not reach the server. Your change was not saved.');
      return false;
    }
  }
  function renderRows() {
    list.innerHTML = currentGames().map(game => {
      const current = state.statuses[game.id]?.status || game.status;
      return `<div class="admin-game-row" data-id="${game.id}">
        <button class="admin-grip" type="button" data-grip aria-label="Hold and drag to reorder ${game.title}" title="Hold and drag to reorder">⋮⋮</button>
        <span><strong>${game.title}</strong><small>Current status: ${statusLabel(current)}</small></span>
        <div class="admin-row-controls">
          <select class="admin-select" data-game="${game.id}" aria-label="${game.title} status">${options.map(option => `<option value="${option.value}" ${option.value === current ? 'selected' : ''}>${option.label}</option>`).join('')}</select>
        </div>
      </div>`;
    }).join('');
  }

  // Status changes
  list.addEventListener('change', async event => {
    const select = event.target.closest('select[data-game]');
    if (!select) return;
    const option = options.find(item => item.value === select.value);
    state.statuses[select.dataset.game] = { status: select.value, statusLabel: option?.label.replace(/^[^ ]+ /, '') || select.value };
    await saveState();
    renderRows();
  });

  // Drag to reorder: press and hold the grip on the left, then move up or down.
  let dragRow = null;
  list.addEventListener('pointerdown', event => {
    const grip = event.target.closest('[data-grip]');
    if (!grip || event.button > 0) return;
    event.preventDefault();
    dragRow = grip.closest('.admin-game-row');
    grip.setPointerCapture(event.pointerId);
    dragRow.classList.add('is-dragging');
  });
  list.addEventListener('pointermove', event => {
    if (!dragRow) return;
    const others = [...list.children].filter(row => row !== dragRow);
    const before = others.find(row => {
      const r = row.getBoundingClientRect();
      return event.clientY < r.top + r.height / 2;
    });
    if (before) {
      if (before.previousElementSibling !== dragRow) list.insertBefore(dragRow, before);
    } else if (list.lastElementChild !== dragRow) {
      list.appendChild(dragRow);
    }
  });
  async function endDrag() {
    if (!dragRow) return;
    dragRow.classList.remove('is-dragging');
    dragRow = null;
    state.order = [...list.children].map(row => row.dataset.id);
    await saveState();
  }
  list.addEventListener('pointerup', endDrag);
  list.addEventListener('pointercancel', endDrag);

  async function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    try {
      await loadState();
      setNote('');
    } catch {
      setNote('Could not load the saved state from the server.');
    }
    renderRows();
  }
  $('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const password = $('#adminPassword').value;
    try {
      const res = await fetch((window.ORB1TAL_API || '') + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, password);
        $('#loginError').textContent = '';
        $('#adminPassword').value = '';
        await showDashboard();
      } else {
        $('#loginError').textContent = 'Incorrect password.';
        $('#adminPassword').select();
      }
    } catch {
      $('#loginError').textContent = 'Could not reach the server.';
    }
  });
  $('#logoutButton').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    dashboard.hidden = true;
    loginPanel.hidden = false;
    $('#adminPassword').value = '';
    setNote('');
  });
  if (sessionStorage.getItem(SESSION_KEY)) showDashboard();
})();
