/* =====================================================
   21 — Relaciones con Supabase (Fase 2 · tercer módulo): seguir, solicitudes, bloquear, silenciar
        y perfiles de otras personas leídos del servidor.
   · Al iniciar sesión carga tus seguidos, solicitudes enviadas, bloqueados y silenciados reales.
   · Seguir / dejar de seguir / bloquear / silenciar se guardan en el servidor (revierte si falla).
   · Si la cuenta es privada, el servidor deja la solicitud en "pendiente" (no hay aceptación simulada).
   Pendiente: bandeja de solicitudes recibidas (módulo de notificaciones), listas de seguidores.
   ===================================================== */
(function () {
  'use strict';
  const B = window.SvBackend;
  if (!B || !B.enabled) return;

  let started = false, lastErr = '';
  const synced = { blocked: new Set(), muted: new Set() };
  const toast = (t) => { if (t !== lastErr && typeof showAppToast === 'function') showAppToast(t); lastErr = t; };
  const S = () => window.SocialInv && window.SocialInv.state;
  const fmt = (n) => (window.svFmtCount ? window.svFmtCount(n) : String(n || 0));

  const sidMap = {};   // usuario -> id del servidor (también de cuentas que aún no existen en el modelo local)
  async function sidOf(username) {
    if (sidMap[username]) return sidMap[username];
    const u = usersData[username];
    if (u && u.sid) return u.sid;
    const p = await B.profile(username);
    if (!p) throw new Error('Esa cuenta no existe');
    applyProfile(p); sidMap[p.username] = p.id;
    return p.id;
  }

  /* Vuelca un perfil del servidor en el modelo local */
  function applyProfile(p) {
    if (!p || !p.username) return;
    const base = usersData[p.username] || Object.assign({}, usersData[myUsername], { username: p.username, posts: [], isMe: false });
    usersData[p.username] = base;
    base.sid = p.id;
    base.name = p.display_name || p.username;
    base.bio = p.bio || '';
    if (p.avatar_url) { base.avatar = p.avatar_url; base.avatarFallback = null; }
    base.cover = p.cover_url || '';
    base.info = Array.isArray(p.info) ? p.info : [];
    base.links = Array.isArray(p.links) ? p.links : [];
    base.privacy = Object.assign({}, base.privacy, { isPrivate: !!p.is_private });
    base.stats = Object.assign({}, base.stats, { followers: fmt(p.followers_count), following: fmt(p.following_count) });
  }

  /* ---------- Carga inicial ---------- */
  async function start() {
    if (started) return; started = true;
    const st = S(); if (!st) return;
    try {
      const [fol, blk, mut] = await Promise.all([B.myFollowing(), B.myBlocks(), B.myMutes()]);
      followingState.clear(); st.requests = []; st.blocked = []; st.muted = [];
      fol.forEach((r) => { if (!r.who) return; (r.status === 'accepted' ? followingState.add(r.who.username) : st.requests.push(r.who.username)); sidMap[r.who.username] = r.who.id; if (usersData[r.who.username]) usersData[r.who.username].sid = r.who.id; });
      blk.forEach((r) => { if (r.who) { sidMap[r.who.username] = r.who.id; st.blocked.push(r.who.username); synced.blocked.add(r.who.username); } });
      mut.forEach((r) => { if (r.who) { sidMap[r.who.username] = r.who.id; st.muted.push(r.who.username); synced.muted.add(r.who.username); } });
      if (window.SocialInv.refresh) window.SocialInv.refresh();
      setInterval(syncLists, 2000);
    } catch (err) { started = false; toast(err.message); }
  }

  /* ---------- Seguir ---------- */
  const _toggle = window.SocialInv.toggleFollow;
  window.SocialInv.toggleFollow = function (u) {
    const before = window.SocialInv.followState(u);
    const after = _toggle.apply(this, arguments);
    (async () => {
      try {
        const id = await sidOf(u);
        if (before === 'none') {
          const row = await B.follow(id);
          // El servidor manda: una cuenta privada deja la solicitud pendiente
          if (row && row.status === 'pending' && followingState.has(u)) { followingState.delete(u); S().requests.push(u); }
          if (row && row.status === 'accepted' && S().requests.includes(u)) { S().requests = S().requests.filter((x) => x !== u); followingState.add(u); }
          if (window.SocialInv.refresh) window.SocialInv.refresh();
        } else { await B.unfollow(id); }
        lastErr = '';
      } catch (err) { _toggle.call(window.SocialInv, u); toast(err.message); }
    })();
    return after;
  };

  /* ---------- Bloquear / silenciar: se comparan las listas locales con las del servidor ---------- */
  async function diff(kind, add, remove) {
    const st = S(); if (!st) return;
    const now = new Set(st[kind]), was = synced[kind];
    for (const u of now) if (!was.has(u)) { was.add(u); try { await add(await sidOf(u)); } catch (e) { was.delete(u); st[kind] = st[kind].filter((x) => x !== u); toast(e.message); } }
    for (const u of [...was]) if (!now.has(u)) { was.delete(u); try { await remove(await sidOf(u)); } catch (e) { toast(e.message); } }
  }
  let busy = false;
  async function syncLists() {
    if (busy) return; busy = true;
    try { await diff('blocked', B.block, B.unblock); await diff('muted', B.mute, B.unmute); } finally { busy = false; }
  }

  /* ---------- Perfiles ajenos desde el servidor ---------- */
  const _open = window.openProfile;
  window.openProfile = function (username) {
    // Cuenta que aún no existe en el modelo local (viene de la búsqueda o de una lista): se descarga primero
    if (username && username !== myUsername && !usersData[username]) {
      loadOther(username).then(() => { if (usersData[username]) _open.call(window, username); });
      return;
    }
    const r = _open.apply(this, arguments);
    if (username && username !== myUsername) loadOther(username);
    return r;
  };
  const loading = new Set();
  async function loadOther(username) {
    if (loading.has(username)) return; loading.add(username);
    try {
      const p = await B.profile(username);
      if (!p) return;
      applyProfile(p);
      const rows = await B.userPosts(p.id).catch(() => []);
      const u = usersData[username];
      u.posts = rows.map((x) => ({
        id: x.id, caption: x.caption || '', time: '',
        type: (x.media || []).length === 0 ? 'text' : (x.media.length > 1 ? 'carousel' : (x.media[0].type === 'video' ? 'video' : 'image')),
        media: (x.media || []).map((m) => ({ url: m.url, kind: m.type === 'video' ? 'video' : 'image' }))
      }));
      if (typeof pfCurrentUsername !== 'undefined' && pfCurrentUsername === username && profilePanel.classList.contains('open')) _open.call(window, username);
    } catch (err) { /* se queda con lo que ya hay en pantalla */ }
    finally { loading.delete(username); }
  }

  B.onAuth((event) => { if (event === 'SIGNED_IN') setTimeout(start, 1000); });
  B.session().then((s) => { if (s) setTimeout(start, 1000); });
})();
