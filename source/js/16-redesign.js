/* =====================================================
   REDISEÑO v8 — composición nueva (no solo estilos)
   - Cabecera: avatar + saludo + búsqueda + campana (la campana la inyecta 10-social)
   - Historias siempre visibles, interruptor Para ti / Siguiendo, vibras
   - Pulsos con la foto protagonista (contadores dentro de las píldoras de acción)
   - Descubrir: gente, vibras, pulsos y reels, con filtros y resultados agrupados
   - Mensajes: buscador, filtro "Sin responder", nuevo chat; punto en el dock
   NO toca la ventana de chat (#chatWindow y sus burbujas).
   ===================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (v) => (typeof escapeHtml === 'function' ? escapeHtml(String(v == null ? '' : v)) : String(v));
  const me = () => usersData[myUsername] || {};
  const myAvatar = () => me().avatar || 'source/imgs/user-default.png';
  const tabBtn = (t) => document.querySelector('.navbar .nav-icon[data-tab="' + t + '"]');

  /* ---------- Cabecera y avatares ---------- */
  function greet() {
    const h = new Date().getHours();
    return h < 6 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  }
  function paintMe() {
    $('cbcxFoto').src = myAvatar();
    $('dvMe').src = myAvatar();
    $('msgMe').src = myAvatar();
    $('hdGreet').textContent = greet();
    $('hdName').textContent = '@' + myUsername;
  }
  paintMe();
  ['dvMe', 'msgMe'].forEach((id) => $(id).addEventListener('click', () => openProfile(myUsername)));
  $('hdSearch').addEventListener('click', () => { tabBtn('search').click(); setTimeout(() => $('searchInput').focus(), 300); });
  const _openProfile = window.openProfile;
  window.openProfile = function () { const r = _openProfile.apply(this, arguments); setTimeout(paintMe, 50); return r; };

  /* ---------- Pulsos de ejemplo en el feed (de los otros usuarios) ---------- */
  const CAPS = {
    juanp: ['Probando luz nueva en la terraza', 'Domingo de pocas palabras', 'Esto sí es una vibra'],
    mariag: ['Boceto del día', 'Té, gatos y acuarela', 'Capas de color, paciencia y más color'],
    the_creator: ['Detrás de cámara', 'Nueva serie, pronto más']
  };
  const feed = $('feedContainer');
  (function seedFeed() {
    if (feed.querySelector('[data-seeded]')) return;
    const anchor = feed.querySelector('.post');
    const order = [];
    Object.keys(usersData).forEach((u) => {
      if (u === myUsername) return;
      (usersData[u].posts || []).slice(0, 3).forEach((p, i) => { if (typeof p === 'string') order.push({ u, i, url: p }); });
    });
    // intercala usuarios para que el feed no se vea por bloques
    order.sort((a, b) => (a.i - b.i) || a.u.localeCompare(b.u));
    const times = ['Hace 1 h', 'Hace 2 h', 'Hace 3 h', 'Hace 5 h', 'Ayer', 'Ayer', 'Hace 2 d', 'Hace 3 d', 'Hace 4 d'];
    order.slice(0, 8).forEach((o, k) => {
      const caps = CAPS[o.u] || ['Nuevo pulso'];
      const html = buildFullPostHTML({
        id: 'seed-' + o.u + '-' + o.i, type: 'post', caption: caps[o.i % caps.length],
        media: [{ url: o.url, kind: 'image' }], time: times[k % times.length]
      }, o.u);
      const t = document.createElement('div'); t.innerHTML = html.trim();
      const el = t.firstElementChild; el.dataset.seeded = '1';
      if (anchor && anchor.parentNode) anchor.parentNode.appendChild(el); else feed.appendChild(el);
    });
  })();

  /* ---------- Pulso: contadores dentro de las píldoras de acción ---------- */
  function upgradePost(post) {
    if (post.dataset.pc) return;
    const acts = post.querySelector('.post-actions'); if (!acts) return;
    post.dataset.pc = '1';
    ['like', 'comment', 'share'].forEach((k) => {
      const span = post.querySelector('.' + k + '-count'), act = post.querySelector('.post-action.' + k);
      if (span && act && !act.contains(span)) act.appendChild(span);
    });
    const row = post.querySelector('.post-stats-row'); if (row) row.remove();
    post.classList.toggle('has-media', !!post.querySelector('.post-grid'));
    post.classList.toggle('is-text', !post.querySelector('.post-grid'));
  }
  const upgradeAll = () => document.querySelectorAll('.post').forEach(upgradePost);
  upgradeAll();
  new MutationObserver(upgradeAll).observe(document.body, { childList: true, subtree: true });

  /* ---------- Para ti / Siguiendo ---------- */
  const seg = $('feedSeg'); let feedMode = 'all';
  function applyFeedMode() {
    seg.dataset.on = feedMode;
    seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.feed === feedMode));
    feed.querySelectorAll('.post').forEach((p) => {
      const u = p.querySelector('.post-username');
      const name = u && u.dataset.username;
      const show = feedMode === 'all' || !name || name === myUsername || followingState.has(name);
      p.classList.toggle('post-hidden-by-seg', !show);
    });
    let empty = feed.querySelector('.home-empty-seg');
    const any = [...feed.querySelectorAll('.post')].some((p) => !p.classList.contains('post-hidden-by-seg') && !p.classList.contains('post-hidden-by-user'));
    if (!any) {
      if (!empty) { empty = document.createElement('div'); empty.className = 'home-empty-seg'; feed.appendChild(empty); }
      empty.innerHTML = 'Aún no sigues a nadie con pulsos.<br><button type="button" id="segGo">Descubrir gente</button>';
      empty.querySelector('#segGo').onclick = () => tabBtn('search').click();
    } else if (empty) empty.remove();
  }
  seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; feedMode = b.dataset.feed; applyFeedMode(); });
  new MutationObserver((m) => { if (feedMode !== 'all' && m.some((x) => x.addedNodes.length)) applyFeedMode(); }).observe(feed, { childList: true });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-follow],.pf-actions button,#pfActions *')) setTimeout(() => feedMode !== 'all' && applyFeedMode(), 200); });
  applyFeedMode();

  /* =====================================================
     DESCUBRIR
     ===================================================== */
  const dvHome = $('dvHome'), sResults = $('searchResults'), sPosts = $('searchPosts'), sReels = $('searchReelsGrid');
  const sInput = $('searchInput'), clearBtn = $('dvClear');

  const visibleUsers = () => Object.values(usersData).filter((u) => u.username !== myUsername && !(window.SocialInv && SocialInv.isBlocked(u.username)));
  function allPulsos() {
    const out = [];
    Object.values(usersData).forEach((u) => {
      if (window.SocialInv && (!SocialInv.canSee(u.username) || SocialInv.isBlocked(u.username))) return;
      (u.posts || []).forEach((p, idx) => {
        const url = typeof p === 'string' ? p : (p && p.type !== 'text' && p.media && p.media[0] && p.media[0].url) || null;
        if (url) out.push({ user: u.username, idx, url });
      });
    });
    return out;
  }
  const reelList = () => [...document.querySelectorAll('.reel-item')].map((r) => {
    const v = r.querySelector('.reel-media-fg, video, img');
    return { id: r.dataset.reelId, user: (r.querySelector('.user') || {}).textContent || '', desc: (r.querySelector('.desc') || {}).textContent || '', src: v ? (v.currentSrc || v.src || '') : '', video: !!(v && v.tagName === 'VIDEO') };
  });
  const fstate = (u) => (window.SocialInv ? SocialInv.followState(u) : 'none');
  const FLABEL = { following: 'Siguiendo', requested: 'Solicitado', none: 'Seguir' };
  const followBtn = (u) => `<button type="button" class="dv-follow ${fstate(u)}" data-follow="${esc(u)}">${FLABEL[fstate(u)]}</button>`;
  const tileHTML = (p, k) => `<div class="dv-tile" data-user="${esc(p.user)}" data-idx="${p.idx}" style="--ar:${[1.25, 1, 1.4, 1.1][k % 4]}"><img src="${esc(p.url)}" alt="" loading="lazy"><span class="dv-tile-u">@${esc(p.user)}</span></div>`;
  const personCard = (u) => `<div class="dv-card" data-username="${esc(u.username)}">
      <div class="dv-card-cover" style="background-image:url('${esc(u.cover || '')}')"></div>
      <img class="dv-card-av" src="${esc(u.avatar)}" alt="">
      <b>${esc(u.name || u.username)}</b><small>@${esc(u.username)}</small>${followBtn(u.username)}</div>`;
  const personRow = (u) => `<div class="dv-person-row" data-username="${esc(u.username)}">
      <img src="${esc(u.avatar)}" alt=""><div><b>${esc(u.username)}</b><small>${esc(u.name || '')}</small></div>${u.username === myUsername ? '' : followBtn(u.username)}</div>`;
  const reelCard = (r) => `<div class="dv-reel" data-reel="${esc(r.id)}">${r.video ? `<video src="${esc(r.src)}#t=0.5" preload="metadata" muted playsinline></video>` : `<img src="${esc(r.src)}" alt="">`}<div class="dv-reel-i"><b>@${esc(r.user)}</b><span>${esc(r.desc)}</span></div><i class="dv-reel-play"></i></div>`;
  const sec = (t, inner, extra) => `<section class="dv-sec"><header><h2>${t}</h2>${extra || ''}</header>${inner}</section>`;

  function goReel(id) {
    if (getCurrentMainView() !== 'reels') tabBtn('reels').click();
    requestAnimationFrame(() => { const el = document.querySelector('[data-reel-id="' + id + '"]'); if (el) el.scrollIntoView({ block: 'start' }); });
  }

  function homeHTML() {
    const people = visibleUsers();
    const pulsos = allPulsos();
    const reels = reelList();
    const moods = (window.AuraMood ? AuraMood.MOODS.filter((m) => m.id !== 'all') : []);
    return (people.length ? sec('Gente para seguir', `<div class="dv-cards">${people.map(personCard).join('')}</div>`, '<button type="button" class="dv-more" data-go="users">Ver todos</button>') : '')
      + (moods.length ? sec('Por vibra', `<div class="dv-moods">${moods.map((m) => `<button type="button" class="dv-mood" data-mood="${m.id}" style="--c:${m.c}"><i></i>${esc(m.label)}</button>`).join('')}</div>`) : '')
      + (pulsos.length ? sec('Pulsos para ti', `<div class="dv-masonry">${pulsos.map(tileHTML).join('')}</div>`, '<button type="button" class="dv-more" data-go="posts">Ver más</button>') : '')
      + (reels.length ? sec('Reels', `<div class="dv-reels">${reels.map(reelCard).join('')}</div>`, '<button type="button" class="dv-more" data-go="reels">Ver todos</button>') : '');
  }

  function hideAll() { dvHome.style.display = 'none'; sResults.style.display = 'none'; sPosts.style.display = 'none'; sReels.style.display = 'none'; }
  const empty = (t) => `<div class="search-empty">${t}</div>`;

  window.renderSearchResults = function (query) {
    const q = (query || '').trim().toLowerCase();
    const tab = activeSearchTab || 'aura';
    clearBtn.hidden = !q;
    hideAll();
    if (tab === 'aura') return;
    const people = visibleUsers().filter((u) => !q || u.username.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q));
    const pulsos = allPulsos().filter((p) => !q || p.user.toLowerCase().includes(q));
    const reels = reelList().filter((r) => !q || (r.user + ' ' + r.desc).toLowerCase().includes(q));
    if (tab === 'all') {
      if (!q) { dvHome.innerHTML = homeHTML(); dvHome.style.display = 'block'; return; }
      sResults.style.display = 'flex';
      const parts = [];
      if (people.length) parts.push(sec('Personas', people.map(personRow).join('')));
      if (pulsos.length) parts.push(sec('Pulsos', `<div class="dv-masonry">${pulsos.map(tileHTML).join('')}</div>`));
      if (reels.length) parts.push(sec('Reels', `<div class="dv-reels">${reels.map(reelCard).join('')}</div>`));
      sResults.innerHTML = parts.length ? parts.join('') : empty('Sin resultados para "' + esc(query) + '"');
    } else if (tab === 'users') {
      sResults.style.display = 'flex';
      sResults.innerHTML = people.length ? people.map(personRow).join('') : empty('Sin personas que coincidan');
    } else if (tab === 'posts') {
      sPosts.style.display = 'block';
      sPosts.innerHTML = pulsos.length ? `<div class="dv-masonry">${pulsos.map(tileHTML).join('')}</div>` : empty('Sin pulsos que coincidan');
    } else if (tab === 'reels') {
      sReels.style.display = 'grid';
      sReels.innerHTML = reels.length ? reels.map(reelCard).join('') : empty('Sin reels que coincidan');
    }
  };

  window.openSearchView = function () {
    showMainView('search'); setTab('all'); renderSearchResults('');
    setTimeout(() => sInput.focus(), 280);
  };
  window.closeSearchView = function () { sInput.value = ''; clearBtn.hidden = true; };

  function setTab(t) {
    activeSearchTab = t;
    document.querySelectorAll('.search-tab').forEach((x) => x.classList.toggle('active', x.dataset.searchTab === t));
    renderSearchResults(sInput.value);
  }
  document.querySelectorAll('.search-tab[data-search-tab]').forEach((t) => t.addEventListener('click', () => setTab(t.dataset.searchTab)));
  clearBtn.addEventListener('click', () => { sInput.value = ''; sInput.dispatchEvent(new Event('input', { bubbles: true })); sInput.focus(); });
  // Al volver a Descubrir siempre se ve la portada de descubrimiento
  const _show = window.showMainView;
  window.showMainView = function (v) { const r = _show.apply(this, arguments); if (v === 'search' && !sInput.value && activeSearchTab !== 'aura') { renderSearchResults(''); } return r; };

  // delegación: seguir, tarjetas, tiles, reels, vibras, "ver todos"
  $('searchView').addEventListener('click', (e) => {
    const f = e.target.closest('[data-follow]');
    if (f) {
      e.stopPropagation(); e.preventDefault();
      if (window.SocialInv) SocialInv.toggleFollow(f.dataset.follow);
      const u = f.dataset.follow;
      document.querySelectorAll('[data-follow="' + u + '"]').forEach((b) => { b.className = 'dv-follow ' + fstate(u); b.textContent = FLABEL[fstate(u)]; });
      return;
    }
    const t = e.target.closest('.dv-tile'); if (t) { openProfileFeed(t.dataset.user, +t.dataset.idx); return; }
    const r = e.target.closest('.dv-reel'); if (r) { goReel(r.dataset.reel); return; }
    const m = e.target.closest('.dv-mood');
    if (m) { $('auraTab').click(); setTimeout(() => { const c = document.querySelector('#auraChips .aura-chip[data-mood="' + m.dataset.mood + '"]'); if (c) c.click(); }, 450); return; }
    const g = e.target.closest('.dv-more'); if (g) { setTab(g.dataset.go); return; }
  }, true);
  SvColor.rows($('dvScroll'), '.dv-person-row, .dv-card', 'img');
  SvColor.watch($('searchView'), { img: '.dv-card-av, .dv-person-row img, .aura-tile img, .dv-tile img', n: 3 });
  activeSearchTab = 'all';
  renderSearchResults('');

  /* =====================================================
     MENSAJES (solo la lista; la ventana de chat no se toca)
     ===================================================== */
  const chatList = $('chatList'), mlSearch = $('mlSearch'), mlSeg = $('mlSeg');
  let mlFilter = 'all';
  const lastFromThem = (u) => { const t = conversations[u] || []; const l = t[t.length - 1]; return !!(l && !l.deleted && l.from !== myUsername && l.from !== 'me'); };
  function applyChatFilter() {
    const q = mlSearch.value.trim().toLowerCase(); let shown = 0;
    chatList.querySelectorAll('.chat-list-item').forEach((el) => {
      const u = el.dataset.u, unr = lastFromThem(u);
      el.classList.toggle('unreplied', unr);
      const ok = (!q || u.toLowerCase().includes(q) || ((usersData[u] || {}).name || '').toLowerCase().includes(q)) && (mlFilter === 'all' || unr);
      el.style.display = ok ? '' : 'none'; if (ok) shown++;
    });
    const ppl = chatList.querySelector('.msg-people'); if (ppl) ppl.style.display = (q || mlFilter !== 'all') ? 'none' : '';
    let e = chatList.querySelector('.ml-empty');
    if (!shown) { if (!e) { e = document.createElement('div'); e.className = 'ml-empty'; chatList.appendChild(e); } e.textContent = q ? 'Sin conversaciones para "' + mlSearch.value + '"' : 'Estás al día, nadie espera tu respuesta'; }
    else if (e) e.remove();
  }
  new MutationObserver((m) => { if (m.some((x) => [...x.addedNodes].some((n) => n.classList && n.classList.contains('chat-list-item')))) applyChatFilter(); }).observe(chatList, { childList: true });
  mlSearch.addEventListener('input', applyChatFilter);
  mlSeg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; mlFilter = b.dataset.f; mlSeg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); applyChatFilter(); });

  // Nuevo mensaje (antes el botón no hacía nada)
  const nov = document.createElement('div'); nov.className = 'nc-overlay';
  const nsh = document.createElement('div'); nsh.className = 'nc-sheet'; nsh.setAttribute('role', 'dialog'); nsh.setAttribute('aria-label', 'Nuevo mensaje');
  nsh.innerHTML = '<div class="nc-grab"></div><h2>Nuevo mensaje</h2><div class="ml-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg><input type="text" id="ncSearch" placeholder="Buscar personas" autocomplete="off"></div><div class="nc-list" id="ncList"></div>';
  document.body.append(nov, nsh);
  let ncOpen = false;
  const ncDraw = () => { const q = $('ncSearch').value.trim().toLowerCase(); const l = visibleUsers().filter((u) => !q || u.username.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q)); $('ncList').innerHTML = l.length ? l.map((u) => `<div class="dv-person-row" data-nc="${esc(u.username)}"><img src="${esc(u.avatar)}" alt=""><div><b>${esc(u.username)}</b><small>${esc(u.name || '')}</small></div></div>`).join('') : empty('Nadie coincide'); };
  const ncClose = () => { ncOpen = false; nov.classList.remove('open'); nsh.classList.remove('open'); };
  function ncShow() { if (ncOpen) return; ncOpen = true; $('ncSearch').value = ''; ncDraw(); nov.classList.add('open'); nsh.classList.add('open'); pushNavView(ncClose); }
  $('messengerComposeBtn').addEventListener('click', ncShow);
  nov.addEventListener('click', () => closeTopNavView());
  $('ncSearch').addEventListener('input', ncDraw);
  $('ncList').addEventListener('click', (e) => { const r = e.target.closest('[data-nc]'); if (!r) return; const u = r.dataset.nc; closeTopNavView(); setTimeout(() => openChatWindow(u), 60); });
  SvColor.rows($('ncList'), '.dv-person-row', 'img');


  /* ---------- Reels: pestañas Amigos / General (antes eran decorativas) ---------- */
  const reelsScroll_ = document.getElementById('reelsScroll');
  let reelMode = 'general';
  function applyReelMode() {
    let shown = 0;
    document.querySelectorAll('.reel-item').forEach((r) => {
      const bar = r.querySelector('.reel-top-bar-left'); const u = bar && bar.dataset.username;
      const show = reelMode === 'general' || u === myUsername || followingState.has(u);
      r.style.display = show ? '' : 'none'; if (show) shown++;
    });
    document.querySelectorAll('.reel-tab-amigos').forEach((e) => e.classList.toggle('sel', reelMode === 'amigos'));
    document.querySelectorAll('.reel-tab-general').forEach((e) => e.classList.toggle('sel', reelMode === 'general'));
    let em = document.getElementById('reelEmpty');
    if (!shown) {
      if (!em) { em = document.createElement('div'); em.id = 'reelEmpty'; em.className = 'reel-empty'; reelsScroll_.appendChild(em); }
      em.innerHTML = 'Aún no sigues a nadie que publique reels.<br><button type="button" id="reelEmptyGo">Ver reels de todos</button>';
      em.querySelector('#reelEmptyGo').onclick = () => { reelMode = 'general'; applyReelMode(); };
    } else if (em) em.remove();
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.reel-tab-amigos, .reel-tab-general'); if (!t) return;
    e.stopPropagation(); reelMode = t.classList.contains('reel-tab-amigos') ? 'amigos' : 'general'; applyReelMode();
  }, true);
  new MutationObserver((m) => { if (m.some((x) => x.addedNodes.length && [...x.addedNodes].some((n) => n.classList && n.classList.contains('reel-item')))) applyReelMode(); }).observe(reelsScroll_, { childList: true });
  applyReelMode();

  /* ---------- Punto de "sin responder" en el dock ---------- */
  function dockDot() { const n = Object.keys(conversations).some((u) => u !== myUsername && lastFromThem(u)); document.querySelector('.navbar').classList.toggle('has-msg', n); }
  dockDot(); setInterval(dockDot, 2500);
})();
