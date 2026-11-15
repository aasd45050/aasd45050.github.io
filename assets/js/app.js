(() => {
  const games = window.ORBITAL_GAMES || [];
  const $ = (s, root=document) => root.querySelector(s);
  const homeView=$('#homeView'), playerView=$('#playerView'), frame=$('#gameFrame');
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const STATE_URL = (window.ORB1TAL_API || '') + '/state';
  const REFRESH_MS = 30000;
  // Shared state from the server: { statuses: {id: {status, statusLabel}}, order: [id, ...] }
  let state = { statuses: {}, order: [] };
  let lastJSON = JSON.stringify(state);

  function getStatus(g){
    return state.statuses[g.id] || {status:g.status,statusLabel:g.statusLabel};
  }
  // Games in the order set on the admin page; unordered games go to the end.
  function orderedGames(){
    const saved = state.order;
    const rank = id => { const i = saved.indexOf(id); return i<0?Infinity:i; };
    return games
      .map((g,i)=>({g,i}))
      .sort((a,b)=>(rank(a.g.id)-rank(b.g.id))||(a.i-b.i))
      .map(x=>x.g);
  }
  function card(g){
    const current = getStatus(g);
    return `<article class="game-card theme-${g.accent}">
      <button class="card-launch" data-play="${g.id}" aria-label="Play ${escapeHTML(g.title)}">
        <div class="card-info">
          <div class="game-card-topline"><span class="game-status status-${current.status}" aria-label="Status: ${escapeHTML(current.statusLabel)}"><i aria-hidden="true"></i>${escapeHTML(current.statusLabel)}</span></div>
          <h3>${escapeHTML(g.title)}</h3><p>${escapeHTML(g.description)}</p>
          <div class="card-bottom"><span class="launch-label">PLAY NOW <b>↗</b></span></div>
        </div>
      </button></article>`;
  }
  function render(){
    $('#gameGrid').innerHTML=orderedGames().map(card).join('') + '<article class="coming-soon-card" aria-label="More games coming soon"><div class="coming-soon-mark">＋</div><div class="coming-soon-label">Coming soon</div></article>';
    $('#emptyState').hidden=games.length>0;
    $('#gameGrid').querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click',()=>launch(b.dataset.play)));
  }
  // Fetch the shared state; only re-render when something actually changed.
  async function loadState(){
    try {
      const res = await fetch(STATE_URL, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const next = { statuses: data.statuses || {}, order: data.order || [] };
      const nextJSON = JSON.stringify(next);
      if (nextJSON !== lastJSON) {
        lastJSON = nextJSON;
        state = next;
        render();
      }
    } catch {
      // Keep showing the last known state if the server can't be reached.
    }
  }
  function launch(id){
    const g=games.find(x=>x.id===id);if(!g)return;
    frame.src=`games/${g.id}/index.html`;
    homeView.hidden=true;playerView.hidden=false;document.body.classList.add('playing');
    window.scrollTo(0,0);history.pushState({game:id},'',`#play/${id}`);
  }
  function closePlayer(updateHistory=true){
    frame.src='about:blank';playerView.hidden=true;homeView.hidden=false;document.body.classList.remove('playing');
    if(updateHistory&&location.hash.startsWith('#play/'))history.pushState({},'', '#home');
    render();
  }
  $('#backButton').addEventListener('click',()=>closePlayer());
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!playerView.hidden)closePlayer()});
  window.addEventListener('popstate',()=>{if(!location.hash.startsWith('#play/'))closePlayer(false)});
  render();
  loadState();
  setInterval(loadState, REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadState(); });
  const match=location.hash.match(/^#play\/(.+)$/);if(match)launch(match[1]);
})();
