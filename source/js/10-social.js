/* =====================================================
   NÚCLEO SOCIAL (local-first, listo para conectar a un backend)
   - Persistencia del estado social (seguidos, bloqueos, silencios, reportes,
     notificaciones, comentarios, privacidad) en localStorage.
   - Notificaciones con indicador en la barra superior.
   - Reportar / silenciar / bloquear desde el menú de opciones de cada pulso.
   - @menciones y #hashtags clicables en comentarios.
   API pública: window.SocialInv.notify({type, from, text}) para que un backend
   real inserte eventos (nuevo seguidor, reacción, respuesta, mención).
   ===================================================== */
(function () {
  'use strict';
  const KEY = 'socialinv_state_v1';
  const REASONS = ['Spam o engaño', 'Acoso o bullying', 'Contenido sexual', 'Violencia', 'Información falsa', 'Otro motivo'];
  const state = { blocked: [], muted: [], reports: [], notifications: [], requests: [], seeded: false };

  /* ---------- Persistencia ---------- */
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw) return;
      ['blocked', 'muted', 'reports', 'notifications', 'requests'].forEach(k => { if (Array.isArray(raw[k])) state[k] = raw[k]; });
      state.seeded = !!raw.seeded;
      (raw.following || []).forEach(u => followingState.add(u));
      (raw.comments || []).forEach(([id, thread]) => commentsStore.set(id, thread));
      if (raw.privacy && usersData[myUsername]) Object.assign(usersData[myUsername].privacy, raw.privacy);
    } catch (e) { /* estado corrupto: se ignora y se regenera */ }
  }
  let lastSaved = '';
  function save() {
    try {
      const snap = JSON.stringify({
        ...state,
        following: [...followingState],
        comments: [...commentsStore.entries()],
        privacy: usersData[myUsername] && usersData[myUsername].privacy
      });
      if (snap !== lastSaved) { localStorage.setItem(KEY, snap); lastSaved = snap; }
    } catch (e) { /* cuota llena o modo privado */ }
  }
  load();
  // Los ids de comentario son 'c<N>'. Tras recargar, el contador volvía a 1 y generaba ids duplicados
  // (el like caía en el comentario equivocado). Se recalcula el máximo y se reparan duplicados antiguos.
  (function fixCommentIds() {
    let mx = 0; const seen = new Set(), num = (id) => parseInt(String(id).replace(/\D/g, ''), 10) || 0;
    commentsStore.forEach(th => th.forEach(c => { mx = Math.max(mx, num(c.id)); (c.replies || []).forEach(r => { mx = Math.max(mx, num(r.id)); }); }));
    commentsStore.forEach(th => th.forEach(c => [c, ...(c.replies || [])].forEach(x => {
      if (seen.has(x.id)) x.id = 'c' + (++mx); seen.add(x.id);
    })));
    if (mx > commentIdSeq) commentIdSeq = mx;
  })();
  setInterval(save, 2000);
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  /* ---------- Utilidades ---------- */
  const esc = (s) => escapeHtml(s);
  function ago(ts) {
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return 'Ahora';
    if (m < 60) return `Hace ${m} min`;
    if (m < 1440) return `Hace ${Math.round(m / 60)} h`;
    return `Hace ${Math.round(m / 1440)} d`;
  }
  function avatarOf(u) { return (usersData[u] && usersData[u].avatar) || 'source/imgs/user-default.png'; }
  function makeSheet(id) {
    const ov = document.createElement('div'); ov.className = 'sv-overlay'; ov.id = id + 'Overlay';
    const sh = document.createElement('div'); sh.className = 'sv-sheet'; sh.id = id;
    sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
    document.body.append(ov, sh);
    let isOpen = false;
    function close() { isOpen = false; ov.classList.remove('open'); sh.classList.remove('open'); }
    function open() { if (isOpen) return; isOpen = true; ov.classList.add('open'); sh.classList.add('open'); pushNavView(close); }
    ov.addEventListener('click', () => closeTopNavView());
    return { sh, open, close };
  }

  /* ---------- Notificaciones ---------- */
  const bell = document.createElement('button');
  bell.className = 'notif-btn'; bell.type = 'button'; bell.setAttribute('aria-label', 'Notificaciones');
  bell.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><span class="notif-dot"></span>';
  const bar = document.querySelector('.cbcx-bar'), masBtn = document.getElementById('masBtn');
  if (bar && masBtn) bar.insertBefore(bell, masBtn);
  const notifSheet = makeSheet('notifSheet');

  function unreadCount() { return state.notifications.filter(n => !n.read).length; }
  function refreshBell() { bell.classList.toggle('has-unread', unreadCount() > 0); }
  const LABEL = { request: 'quiere seguirte', accepted: 'aceptó tu solicitud', follow: 'empezó a seguirte', like: 'reaccionó a tu pulso', reply: 'respondió a tu comentario', mention: 'te mencionó' };
  function renderNotifs() {
    const items = state.notifications.slice().sort((a, b) => b.ts - a.ts);
    notifSheet.sh.innerHTML = `<div class="sv-grab"></div><div class="sv-head"><span>Actividad</span><button type="button" id="notifReadAll">Marcar todo como leído</button></div>
      <div class="sv-list">${items.length ? items.map(n => `
        <div class="sv-item${n.read ? '' : ' unread'}" data-id="${esc(n.id)}" data-user="${esc(n.from)}">
          <img src="${esc(avatarOf(n.from))}" alt="">
          <div><b>@${esc(n.from)}</b> ${esc(n.text || LABEL[n.type] || '')}<span class="sv-time">${ago(n.ts)}</span>
            ${n.type === 'request' ? `<span class="sv-actions"><button type="button" class="sv-btn sv-btn-main" data-act="accept">Aceptar</button><button type="button" class="sv-btn" data-act="decline">Rechazar</button></span>` : ''}</div>
        </div>`).join('') : '<div class="sv-empty">Todavía no hay actividad</div>'}</div>`;
  }
  function notify(n) {
    state.notifications.push({ id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6), ts: Date.now(), read: false, type: 'follow', ...n });
    state.notifications = state.notifications.slice(-100);
    refreshBell(); save();
  }
  bell.addEventListener('click', () => {
    renderNotifs(); notifSheet.open();
  });
  notifSheet.sh.addEventListener('click', (e) => {
    if (e.target.closest('#notifReadAll')) {
      state.notifications.forEach(n => { n.read = true; }); refreshBell(); save(); renderNotifs(); return;
    }
    const it = e.target.closest('.sv-item'); if (!it) return;
    const n = state.notifications.find(x => x.id === it.dataset.id);
    const act = e.target.closest('[data-act]');
    if (act && n) {
      state.notifications = state.notifications.filter(x => x !== n);
      if (act.dataset.act === 'accept') showAppToast(`<b>@${esc(n.from)}</b> ya te sigue`);
      refreshBell(); save(); renderNotifs(); return;
    }
    if (n) { n.read = true; refreshBell(); save(); }
    const u = it.dataset.user; closeTopNavView();
    if (usersData[u]) setTimeout(() => openProfile(u), 260);
  });
  // Notificaciones de ejemplo SOLO la primera vez (hasta que exista backend)
  if (!state.seeded) {
    state.seeded = true;
    Object.keys(usersData).filter(u => u !== myUsername).slice(0, 3).forEach((u, i) =>
      state.notifications.push({ id: 'seed' + i, ts: Date.now() - (i + 1) * 3600e3, read: false, type: ['follow', 'like', 'mention'][i % 3], from: u }));
    save();
  }
  refreshBell();

  /* ---------- Reportar / silenciar / bloquear ---------- */
  const menu = document.getElementById('postOptionsMenu');
  const cancelItem = document.getElementById('postOptionsCancel');
  function addMenuItem(id, label, cls) {
    const d = document.createElement('div'); d.className = 'post-options-item ' + (cls || ''); d.id = id; d.textContent = label;
    menu.insertBefore(d, cancelItem); return d;
  }
  const iReport = addMenuItem('postOptionsReport', 'Reportar pulso', 'danger');
  const iMute = addMenuItem('postOptionsMute', 'Silenciar usuario');
  const iBlock = addMenuItem('postOptionsBlock', 'Bloquear usuario', 'danger');
  function authorOfPost(id) {
    const el = id && document.querySelector(`.post[data-post-id="${CSS.escape(id)}"] .post-username`);
    return el ? el.dataset.username : null;
  }
  const reportSheet = makeSheet('reportSheet');
  let reportTarget = null;
  iReport.addEventListener('click', () => {
    reportTarget = { postId: activeOptionsPostId, user: authorOfPost(activeOptionsPostId) };
    closeTopNavView();
    reportSheet.sh.innerHTML = `<div class="sv-grab"></div><div class="sv-head"><span>¿Por qué lo reportas?</span></div><div class="sv-list">${REASONS.map(r => `<div class="sv-item" data-reason="${esc(r)}">${esc(r)}</div>`).join('')}</div>`;
    setTimeout(reportSheet.open, 250);
  });
  reportSheet.sh.addEventListener('click', (e) => {
    const it = e.target.closest('[data-reason]'); if (!it || !reportTarget) return;
    state.reports.push({ ...reportTarget, reason: it.dataset.reason, ts: Date.now() }); save();
    closeTopNavView(); showAppToast('Gracias, revisaremos tu reporte');
  });
  iMute.addEventListener('click', () => {
    const u = authorOfPost(activeOptionsPostId); closeTopNavView();
    if (!u || u === myUsername) return;
    if (!state.muted.includes(u)) state.muted.push(u); applyHiding(); save(); showAppToast(`Silenciaste a @${esc(u)}`);
  });
  iBlock.addEventListener('click', () => {
    const u = authorOfPost(activeOptionsPostId); closeTopNavView();
    if (!u || u === myUsername) return;
    if (!state.blocked.includes(u)) state.blocked.push(u);
    followingState.delete(u); applyHiding(); save(); showAppToast(`Bloqueaste a @${esc(u)}`);
  });
  // Ocultar al autor propio en las acciones que no aplican (no te bloqueas a ti mismo)
  new MutationObserver(() => {
    if (!menu.classList.contains('open')) return;
    const mine = authorOfPost(activeOptionsPostId) === myUsername;
    [iReport, iMute, iBlock].forEach(el => { el.style.display = mine ? 'none' : ''; });
  }).observe(menu, { attributes: true, attributeFilter: ['class'] });

  function applyHiding() {
    const hidden = new Set([...state.blocked, ...state.muted]);
    document.querySelectorAll('.post').forEach(p => {
      const u = p.querySelector('.post-username');
      p.classList.toggle('post-hidden-by-user', !!(u && (hidden.has(u.dataset.username) || !canSee(u.dataset.username))));
    });
  }
  applyHiding();
  const feed = document.getElementById('feedContainer');
  if (feed) new MutationObserver(applyHiding).observe(feed, { childList: true });

  /* ---------- Menciones y hashtags en comentarios ---------- */
  const TOKEN = /(^|[\s(])([@#][\p{L}\p{N}_]{1,30})/gu;
  function linkify(root) {
    root.querySelectorAll('.cd-text').forEach(el => {
      if (el.dataset.linked) return; el.dataset.linked = '1';
      const tn = el.firstChild; if (!tn || tn.nodeType !== 3) return;
      const text = tn.nodeValue; let last = 0, m; const frag = document.createDocumentFragment(); TOKEN.lastIndex = 0;
      while ((m = TOKEN.exec(text))) {
        const start = m.index + m[1].length;
        frag.append(text.slice(last, start));
        const s = document.createElement('span');
        s.className = m[2][0] === '@' ? 'cd-mention' : 'cd-hashtag'; s.textContent = m[2]; s.dataset.token = m[2];
        frag.append(s); last = start + m[2].length;
      }
      if (last) { frag.append(text.slice(last)); el.replaceChild(frag, tn); }
    });
  }
  const _renderComments = window.renderComments;
  window.renderComments = function () { _renderComments.apply(this, arguments); linkify(cdList); };
  cdList.addEventListener('click', (e) => {
    const t = e.target.closest('.cd-mention,.cd-hashtag'); if (!t) return;
    const tok = t.dataset.token;
    if (tok[0] === '@') {
      const u = tok.slice(1).toLowerCase(), key = Object.keys(usersData).find(k => k.toLowerCase() === u);
      if (key) { closeComments(); setTimeout(() => openProfile(key), 260); } else showAppToast('Usuario no encontrado');
    } else {
      closeComments();
      setTimeout(() => { openSearchView(); const i = document.getElementById('searchInput'); if (i) { i.value = tok; i.dispatchEvent(new Event('input', { bubbles: true })); } }, 260);
    }
  });


  /* ---------- Cuentas privadas y solicitudes de seguimiento ---------- */
  // function (no const): applyHiding() se ejecuta antes de este bloque y necesita que estén elevadas
  function isPrivate(u) { return !!(usersData[u] && usersData[u].privacy && usersData[u].privacy.isPrivate); }
  function canSee(u) { return !u || u === myUsername || !isPrivate(u) || followingState.has(u); }
  function followState(u) { return followingState.has(u) ? 'following' : state.requests.includes(u) ? 'requested' : 'none'; }
  function refreshProfileIfOpen(u) { if (typeof pfCurrentUsername !== 'undefined' && pfCurrentUsername === u && profilePanel.classList.contains('open')) openProfile(u); }
  function toggleFollow(u) {
    const st = followState(u);
    if (st === 'following') { followingState.delete(u); const i = followOrder.indexOf(u); if (i > -1) followOrder.splice(i, 1); }
    else if (st === 'requested') { state.requests = state.requests.filter(x => x !== u); }
    else if (isPrivate(u) && u !== myUsername) {
      state.requests.push(u); showAppToast(`Solicitud enviada a <b>@${esc(u)}</b>`);
      // SIMULACIÓN LOCAL: sin backend nadie puede aprobar, así que la cuenta de ejemplo acepta a los pocos segundos.
      // Con servidor, elimina este timeout y llama a SocialInv.notify({type:'accepted', from:u}) al recibir la aprobación real.
      if (!(window.SvBackend && SvBackend.enabled)) setTimeout(() => {
        if (!state.requests.includes(u)) return;
        state.requests = state.requests.filter(x => x !== u); followingState.add(u); followOrder.push(u);
        notify({ type: 'accepted', from: u }); applyHiding(); save(); refreshProfileIfOpen(u);
      }, 6000);
    } else { followingState.add(u); followOrder.push(u); }
    applyHiding(); save();
    return followState(u);
  }
  function setPrivate(flag) {
    usersData[myUsername].privacy.isPrivate = !!flag;
    if (flag) {
      // Demostración: llegan solicitudes de ejemplo para poder probar Aceptar / Rechazar (solo en modo local)
      if (!(window.SvBackend && SvBackend.enabled)) setTimeout(() => {
        ['juanp', 'mariag'].filter(u => usersData[u] && !state.notifications.some(n => n.type === 'request' && n.from === u)).forEach((u, i) =>
          notify({ type: 'request', from: u, ts: Date.now() - i * 60000 }));
        showAppToast('Tu cuenta es privada: tienes solicitudes nuevas');
      }, 2500);
    } else { state.notifications = state.notifications.filter(n => n.type !== 'request'); refreshBell(); }
    save();
  }
  const privToggle = document.getElementById('privacyPrivate');
  if (privToggle) privToggle.addEventListener('change', (e) => setPrivate(e.target.checked));

  // El perfil de una cuenta privada que no sigues muestra un candado en vez de sus pulsos
  const _openProfile = window.openProfile;
  window.openProfile = function (u) {
    _openProfile.apply(this, arguments);
    const locked = !canSee(u);
    profilePanel.classList.toggle('pf-locked', locked);
    profilePanel.dataset.private = isPrivate(u) ? 'true' : 'false';
    const who = document.querySelector('#pfLock [data-lock-user]'); if (who) who.textContent = '@' + u;
  };

  /* ---------- Color adaptativo en cada contexto ---------- */
  const _openComments = window.openComments;
  window.openComments = function (id) {
    _openComments.apply(this, arguments);
    const img = document.querySelector(`[data-post-id="${CSS.escape(String(id))}"] img, [data-reel-id="${CSS.escape(String(id))}"] img`);
    const drawer = document.getElementById('commentsDrawer');
    if (img && img.src) SvColor.tint(drawer, img.src); else SvColor.reset(drawer);
  };
  const _openShareSheetCtx = window.openShareSheetCtx;
  window.openShareSheetCtx = function (ctx) {
    _openShareSheetCtx.apply(this, arguments);
    const sh = document.getElementById('shareSheet');
    if (ctx.cover && !/\.(mp4|webm)(\?|$)/i.test(ctx.cover)) SvColor.tint(sh, ctx.cover); else SvColor.reset(sh);
  };

  window.SocialInv = { refresh: applyHiding, refreshBell, toggleFollow, followState, canSee, isPrivate, setPrivate, afterShare: () => {}, notify, state, isBlocked: (u) => state.blocked.includes(u), isMuted: (u) => state.muted.includes(u) };
})();
