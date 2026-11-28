/* =====================================================
   20 — Publicaciones y Feed con Supabase (Fase 2 · segundo módulo conectado)
   · Con sesión iniciada el feed se llena con pulsos REALES (Siguiendo + Para ti) y se retiran los de ejemplo.
   · Publicar desde el compositor sube las fotos/videos y crea el pulso en el servidor.
   · Me gusta, guardar y eliminar se guardan en el servidor (con reversión si falla).
   Pendiente en este módulo: comentarios, paginación, tiempo real. Solo actúa con backend y sesión.
   ===================================================== */
(function () {
  'use strict';
  const B = window.SvBackend;
  if (!B || !B.enabled) return;

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const feedEl = () => document.getElementById('feedContainer');
  const me = () => usersData[myUsername];
  let started = false, myId = null, lastErr = '';
  const uploading = new Set(), failed = new Set();
  const toast = (t) => { if (t !== lastErr && typeof showAppToast === 'function') showAppToast(t); lastErr = t; };

  function rel(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'Ahora';
    if (s < 3600) return 'Hace ' + Math.floor(s / 60) + ' m';
    if (s < 86400) return 'Hace ' + Math.floor(s / 3600) + ' h';
    if (s < 604800) return 'Hace ' + Math.floor(s / 86400) + ' d';
    return 'Hace ' + Math.floor(s / 604800) + ' sem';
  }

  function ensureUser(a) {
    if (!a || !a.username) return;
    const img = a.avatar_url || 'source/imgs/user-default.png';
    if (usersData[a.username]) { usersData[a.username].sid = a.id; if (a.avatar_url) usersData[a.username].avatar = a.avatar_url; return; }
    usersData[a.username] = Object.assign({}, me(), {
      username: a.username, sid: a.id, name: a.display_name || a.username, avatar: img, avatarFallback: null,
      cover: '', bio: '', posts: [], info: [], links: [], isMe: false
    });
  }

  function toLocal(row) {
    const m = Array.isArray(row.media) ? row.media : [];
    const time = row.location ? row.location + ' · ' + rel(row.created_at) : rel(row.created_at);
    return {
      id: row.id, caption: row.caption || '', time,
      type: m.length === 0 ? 'text' : (m.length > 1 ? 'carousel' : (m[0].type === 'video' ? 'video' : 'image')),
      media: m.map((x) => ({ url: x.url, kind: x.type === 'video' ? 'video' : 'image' }))
    };
  }

  async function render(rows, top) {
    const feed = feedEl(); if (!feed) return;
    const fresh = rows.filter((r) => !feed.querySelector('.post[data-post-id="' + r.id + '"]'));
    if (!fresh.length) return;
    const ordered = top ? fresh.slice().reverse() : fresh;       // arriba: el más nuevo queda primero
    ordered.forEach((r) => {
      if (!r.author) return;
      ensureUser(r.author);
      const local = toLocal(r);
      const html = buildFullPostHTML(local, r.author.username);
      if (top) insertPostAtTop(feed, html);
      else { const anchor = feed.querySelector('#feedSentinel, .home-empty-seg'); if (anchor) anchor.insertAdjacentHTML('beforebegin', html); else feed.insertAdjacentHTML('beforeend', html); }
      const el = feed.querySelector('.post[data-post-id="' + r.id + '"]');
      if (el) {
        const set = (sel, n) => { const s = el.querySelector(sel); if (s) { s.textContent = n; s.dataset.count = n; } };
        set('.like-count', r.likes_count || 0); set('.comment-count', r.comments_count || 0); set('.share-count', r.shares_count || 0);
      }
      const u = usersData[r.author.username];
      if (u && !u.posts.some((p) => p && p.id === r.id)) u.posts.push(local);
    });
    initGridsAndPosts(); bindCommentButtons(feed); bindPostOptionsAndShare(feed); updateFeedEmptyState();
    const ids = fresh.map((r) => r.id);
    try {
      const [liked, saved] = await Promise.all([B.myLikes(ids), B.mySaves(ids)]);
      liked.forEach((id) => { const b = feed.querySelector('.post[data-post-id="' + id + '"] .post-action.like'); if (b) b.classList.add('active', 'liked'); });
      saved.forEach((id) => { const b = feed.querySelector('.post[data-post-id="' + id + '"] [data-save-btn]'); if (b) b.classList.add('active'); });
    } catch (e) { /* los contadores ya se ven; solo falta el estado de "ya di me gusta" */ }
  }

  let oldest = null, exhausted = false, loadingMore = false;
  /* Pinta pulsos reales en cualquier contenedor (la usan las comunidades) */
  window.svRenderRows = async function (container, rows, atTop) {
    const list = atTop ? rows.slice().reverse() : rows;
    list.forEach((r) => {
      if (!r.author || container.querySelector('.post[data-post-id="' + r.id + '"]')) return;
      ensureUser(r.author);
      container.insertAdjacentHTML(atTop ? 'afterbegin' : 'beforeend', buildFullPostHTML(toLocal(r), r.author.username));
      const el = container.querySelector('.post[data-post-id="' + r.id + '"]');
      if (el) { const set = (sel, n) => { const s = el.querySelector(sel); if (s) { s.textContent = n; s.dataset.count = n; } }; set('.like-count', r.likes_count || 0); set('.comment-count', r.comments_count || 0); set('.share-count', r.shares_count || 0); }
    });
    initGridsAndPosts(); bindCommentButtons(container); bindPostOptionsAndShare(container);
    const ids = rows.map((r) => r.id);
    try {
      const [liked, saved] = await Promise.all([B.myLikes(ids), B.mySaves(ids)]);
      liked.forEach((id) => { const b = container.querySelector('.post[data-post-id="' + id + '"] .post-action.like'); if (b) b.classList.add('active', 'liked'); });
      saved.forEach((id) => { const b = container.querySelector('.post[data-post-id="' + id + '"] [data-save-btn]'); if (b) b.classList.add('active'); });
    } catch (e) { /* sin estado de me gusta */ }
  };

  async function load(top, before) {
    try {
      const [mine, explore] = await Promise.all([B.feed(before), B.explore(before)]);
      if (before && !mine.length && !explore.length) exhausted = true;
      mine.forEach((r) => { if (r.author && r.author.username !== myUsername) { ensureUser(r.author); followingState.add(r.author.username); } });
      const all = mine.concat(explore.filter((e) => !mine.some((m) => m.id === e.id)));
      all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      all.forEach((r) => { if (!oldest || r.created_at < oldest) oldest = r.created_at; });
      await render(all, top);
      lastErr = '';
    } catch (err) { toast(err.message); }
  }

  /* Publicaciones hechas en el compositor: se suben al servidor y cambian su id local por el real */
  async function publishLocal(p) {
    const oldId = p.id; uploading.add(oldId);
    try {
      const files = [];
      for (const m of p.media || []) { const b = await (await fetch(m.url)).blob(); files.push(new File([b], 'media', { type: b.type })); }
      const row = await B.createPost({ caption: p.caption || '', files });
      p.id = row.id;
      document.querySelectorAll('[data-post-id="' + oldId + '"]').forEach((el) => {
        el.dataset.postId = row.id;
        el.querySelectorAll('[data-post-options]').forEach((x) => { x.dataset.postOptions = row.id; });
      });
      lastErr = '';
    } catch (err) { failed.add(oldId); toast('No se pudo publicar: ' + err.message); }
    finally { uploading.delete(oldId); }
  }
  function pushPending() {
    const u = me(); if (!u || !Array.isArray(u.posts)) return;
    const p = u.posts.find((x) => x && typeof x === 'object' && !UUID.test(String(x.id)) && !uploading.has(x.id) && !failed.has(x.id));
    if (p) publishLocal(p);
  }

  /* Me gusta */
  const _like = window.toggleLike;
  window.toggleLike = function (btn, sel) {
    const r = _like.apply(this, arguments);
    const post = btn.closest && btn.closest('.post'); const id = post && post.dataset.postId;
    if (id && UUID.test(id)) {
      const on = btn.classList.contains('active');
      B.setLike(id, on).catch((e) => { _like.call(window, btn, sel); toast(e.message); });
    }
    return r;
  };
  /* Guardar (captura: se lee el estado antes de que el botón lo cambie) */
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-save-btn]'); if (!b) return;
    const post = b.closest('.post'); const id = post && post.dataset.postId;
    if (!id || !UUID.test(id)) return;
    const on = !b.classList.contains('active');
    B.setSave(id, on).catch((err) => { b.classList.toggle('active', !on); toast(err.message); });
  }, true);
  /* Eliminar (captura en el menú: el id activo se limpia al cerrar) */
  const menu = document.getElementById('postOptionsMenu');
  if (menu) menu.addEventListener('click', (e) => {
    if (!e.target.closest('#postOptionsDelete')) return;
    const id = typeof activeOptionsPostId !== 'undefined' ? activeOptionsPostId : null;
    if (id && UUID.test(id)) B.deletePost(id).catch((err) => toast(err.message));
  }, true);

  async function start() {
    if (started) return; started = true;
    try { myId = (await B.myProfile()).id; } catch (err) { started = false; return toast(err.message); }
    // Modo conectado: fuera los pulsos de ejemplo y los guardados en este dispositivo
    const feed = feedEl();
    if (feed) feed.querySelectorAll('.post, .home-empty-seg').forEach((el) => el.remove());
    Object.values(usersData).forEach((u) => { if (u && Array.isArray(u.posts)) u.posts = []; });
    try { localStorage.removeItem('socialinv_posts_v1'); } catch (e) { /* sin acceso */ }
    updateFeedEmptyState();
    await load(false);
    try { const mineRows = await B.userPosts(myId); mineRows.forEach((r) => { const l = toLocal(r); if (me() && !me().posts.some((p) => p.id === l.id)) me().posts.push(l); }); } catch (e) { /* el muro propio se llena al publicar */ }
    // Paginación: al llegar al final se cargan pulsos más antiguos
    if (feed && !document.getElementById('feedSentinel')) {
      const s = document.createElement('div'); s.id = 'feedSentinel'; s.style.height = '1px'; feed.appendChild(s);
      new IntersectionObserver(async (en) => {
        if (!en[0].isIntersecting || exhausted || loadingMore || !oldest) return;
        loadingMore = true; await load(false, oldest); loadingMore = false;
      }, { rootMargin: '600px' }).observe(s);
    }
    setInterval(pushPending, 3000);
    setInterval(() => load(true), 60000);
  }

  window.svEnsureUser = ensureUser;
  B.onAuth((event) => { if (event === 'SIGNED_IN') setTimeout(start, 1200); });
  B.session().then((s) => { if (s) setTimeout(start, 1200); });
})();
