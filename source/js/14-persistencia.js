/* =====================================================
   PERSISTENCIA LOCAL de lo que el usuario HACE (antes se perdía al recargar):
   - Likes de pulsos y reels            -> socialinv_likes_v1   { id: true|false }
   - Ediciones de perfil (nombre, bio, @, info, links, avatar, portada)  -> socialinv_profile_v1
   - Pulsos publicados (texto e imagen; los videos no se pueden guardar: un blob: muere al recargar) -> socialinv_posts_v1
   - Listas de Ajustes (me gusta / comentarios / guardados / archivados)  -> socialinv_lists_v1
   Las imágenes se reducen y guardan como data URL JPEG (localStorage ~5 MB). Si la cuota se llena, se omite en silencio.
   ===================================================== */
(function () {
  'use strict';
  const K = { likes: 'socialinv_likes_v1', profile: 'socialinv_profile_v1', posts: 'socialinv_posts_v1', lists: 'socialinv_lists_v1' };
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  function shrink(src, max, q) {
    return new Promise((res) => {
      const i = new Image();
      i.onload = () => {
        const k = Math.min(1, max / Math.max(i.naturalWidth, i.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(i.naturalWidth * k)); c.height = Math.max(1, Math.round(i.naturalHeight * k));
        c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', q));
      };
      i.onerror = () => res(null); i.src = src;
    });
  }
  const me = () => usersData[myUsername];

  /* ---------- Likes ---------- */
  const likes = rd(K.likes, {});
  const _toggleLike = window.toggleLike;
  window.toggleLike = function (btn) {
    _toggleLike.apply(this, arguments);
    const c = btn.closest('.post, .reel-item'); if (!c) return;
    const id = c.dataset.postId || c.dataset.reelId; if (!id) return;
    likes[id] = btn.classList.contains('active') || btn.classList.contains('liked'); wr(K.likes, likes);
  };
  function applyLikes(scope) {
    scope.querySelectorAll('.post[data-post-id], .reel-item[data-reel-id]').forEach((c) => {
      const id = c.dataset.postId || c.dataset.reelId; if (!(id in likes) || c.dataset.likeRestored) return;
      c.dataset.likeRestored = '1';
      const btn = c.querySelector('.post-action.like, .reel-action.like-btn'); if (!btn) return;
      const now = btn.classList.contains('active') || btn.classList.contains('liked');
      if (now === likes[id]) return;
      btn.classList.toggle('active', likes[id]); btn.classList.toggle('liked', likes[id]);
      const cnt = c.querySelector('.like-count');
      if (cnt) cnt.textContent = Math.max(0, (parseInt(cnt.textContent.replace(/\D/g, ''), 10) || 0) + (likes[id] ? 1 : -1));
    });
  }
  applyLikes(document);
  new MutationObserver((m) => { if (m.some((x) => x.addedNodes.length)) applyLikes(document); }).observe(document.body, { childList: true, subtree: true });

  /* ---------- Perfil propio ---------- */
  (function restoreProfile() {
    const p = rd(K.profile, null); if (!p || !me()) return;
    const oldAvatar = me().avatar;
    if (p.username && p.username !== myUsername) { try { renameUserAcrossApp(myUsername, p.username); } catch (e) {} }
    const u = me(); if (!u) return;
    ['name', 'bio', 'cover'].forEach((k) => { if (p[k] != null) u[k] = p[k]; });
    if (p.avatar) { u.avatar = p.avatar; u.avatarFallback = null; }
    if (Array.isArray(p.info)) p.info.forEach((v, i) => { if (u.info[i]) u.info[i].value = v; });
    if (Array.isArray(p.links)) u.links = p.links;
    if (p.avatar && oldAvatar !== p.avatar) document.querySelectorAll('img').forEach((i) => { if (i.getAttribute('src') === oldAvatar) i.src = p.avatar; });
  })();
  let profSnap = '';
  async function saveProfile() {
    const u = me(); if (!u) return;
    // avatar/portada nuevos llegan como blob:; se convierten a data URL para que sobrevivan al recargar
    if (/^blob:/.test(u.avatar)) { const d = await shrink(u.avatar, 384, .85); if (d) { const old = u.avatar; u.avatar = d; document.querySelectorAll('img').forEach((i) => { if (i.getAttribute('src') === old) i.src = d; }); } }
    if (/^blob:/.test(u.cover)) { const d = await shrink(u.cover, 1080, .8); if (d) u.cover = d; }
    const snap = { username: u.username, name: u.name, bio: u.bio, info: u.info.map((x) => x.value), links: u.links, avatar: u.avatar, cover: u.cover };
    const s = JSON.stringify(snap); if (s !== profSnap) { if (wr(K.profile, snap)) profSnap = s; }
  }

  /* ---------- Pulsos publicados ---------- */
  const savedPosts = rd(K.posts, []);
  (function restorePosts() {
    if (!savedPosts.length || !me()) return;
    const have = new Set(me().posts.map((p) => typeof p === 'object' && p.id));
    const fresh = savedPosts.filter((p) => !have.has(p.id));
    me().posts.unshift(...fresh);
    const feed = document.getElementById('feedContainer');
    if (feed) {
      fresh.slice().reverse().forEach((p) => insertPostAtTop(feed, buildFullPostHTML(p, myUsername)));
      try { initGridsAndPosts(); bindCommentButtons(feed); bindPostOptionsAndShare(feed); updateFeedEmptyState(); } catch (e) {}
      applyLikes(document);
    }
  })();
  const persisted = new Set(savedPosts.map((p) => p.id));
  async function savePosts() {
    const u = me(); if (!u) return;
    const mine = u.posts.filter((p) => p && typeof p === 'object' && p.id);
    let changed = false;
    for (const p of mine) {
      if (persisted.has(p.id)) continue;
      if ((p.media || []).some((m) => m.kind === 'video')) { persisted.add(p.id); continue; } // los videos no se pueden guardar
      const media = [];
      for (const m of (p.media || [])) { const d = /^data:/.test(m.url) ? m.url : await shrink(m.url, 900, .78); if (d) media.push({ ...m, url: d }); }
      savedPosts.unshift({ ...p, media }); persisted.add(p.id); changed = true;
    }
    const ids = new Set(mine.map((p) => p.id));
    const kept = savedPosts.filter((p) => ids.has(p.id));          // los borrados desaparecen también del almacén
    if (kept.length !== savedPosts.length) { savedPosts.length = 0; savedPosts.push(...kept); changed = true; }
    if (changed) { savedPosts.splice(12); if (!wr(K.posts, savedPosts)) { savedPosts.splice(Math.ceil(savedPosts.length / 2)); wr(K.posts, savedPosts); } }
  }

  /* ---------- Listas de Ajustes ---------- */
  (function restoreLists() {
    const l = rd(K.lists, null); if (!l) return;
    [['liked', likedPulsos], ['commented', commentedPulsos], ['saved', savedPulsos]].forEach(([k, arr]) => { if (Array.isArray(l[k])) { arr.length = 0; arr.push(...l[k]); } });
    if (typeof archivedPulsos !== 'undefined' && Array.isArray(l.archived)) { archivedPulsos.length = 0; archivedPulsos.push(...l.archived); }
  })();
  let listSnap = '';
  function saveLists() {
    const l = { liked: likedPulsos, commented: commentedPulsos, saved: savedPulsos };
    if (typeof archivedPulsos !== 'undefined') l.archived = archivedPulsos;
    const s = JSON.stringify(l); if (s !== listSnap && wr(K.lists, l)) listSnap = s;
  }

  /* ---------- Bucle de guardado ---------- */
  let busy = false;
  async function tick() { if (busy) return; busy = true; try { await saveProfile(); await savePosts(); saveLists(); } finally { busy = false; } }
  setInterval(tick, 2500);
  addEventListener('pagehide', () => { saveLists(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) tick(); });
  window.SocialInvPersist = { flush: tick, keys: K };
})();
