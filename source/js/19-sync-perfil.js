/* =====================================================
   19 — Sincronización del PERFIL propio con Supabase (Fase 2 · primer módulo conectado)
   · Al iniciar sesión baja tu perfil (usuario, nombre, bio, avatar, portada, privacidad, info, enlaces).
   · Cada cambio local (editor de perfil) se sube solo; las imágenes nuevas se suben a Storage.
   · Si cambia la cuenta en este dispositivo se borran los datos locales de la anterior (privacidad).
   Solo actúa con backend configurado y sesión iniciada.
   ===================================================== */
(function () {
  'use strict';
  const B = window.SvBackend;
  if (!B || !B.enabled) return;

  const UID_KEY = 'socialinv_uid';
  let started = false, synced = '', timer = null, lastErr = '';
  const me = () => (typeof usersData !== 'undefined' ? usersData[myUsername] : null);
  const isLocalImg = (s) => /^(blob:|data:)/.test(s || '');
  const snapshot = (u) => JSON.stringify({ n: u.name, b: u.bio, i: u.info, l: u.links, a: u.avatar, c: u.cover, p: !!(u.privacy && u.privacy.isPrivate) });
  const fmt = (n) => { n = n || 0; return n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',').replace(',0', '') + 'k' : String(n); };
  window.svFmtCount = fmt;
  const toast = (t) => { if (t !== lastErr && typeof showAppToast === 'function') showAppToast(t); lastErr = t; };

  async function toFile(src, name) {
    const b = await (await fetch(src)).blob();
    return new File([b], name, { type: b.type || 'image/jpeg' });
  }
  function swapSrc(oldSrc, newSrc) {
    document.querySelectorAll('img').forEach((i) => { if (i.getAttribute('src') === oldSrc) i.src = newSrc; });
  }

  /* Borra los datos locales si entra una cuenta distinta a la última de este dispositivo */
  function guardAccount(id) {
    const prev = localStorage.getItem(UID_KEY);
    if (prev && prev !== id) {
      Object.keys(localStorage).filter((k) => /^socialinv_/.test(k) && k !== UID_KEY).forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(UID_KEY, id);
      location.reload();
      return false;
    }
    localStorage.setItem(UID_KEY, id);
    return true;
  }

  async function pull() {
    const p = await B.myProfile();
    if (!guardAccount(p.id)) return false;
    if (p.username !== myUsername) { try { renameUserAcrossApp(myUsername, p.username); } catch (e) { /* se mantiene el nombre local */ } }
    const u = me(); if (!u) return false;
    const oldAvatar = u.avatar;
    u.name = p.display_name || u.name;
    u.bio = p.bio || '';
    u.sid = p.id;
    u.privacy = Object.assign({}, u.privacy, { isPrivate: !!p.is_private });
    u.stats = Object.assign({}, u.stats, { followers: fmt(p.followers_count), following: fmt(p.following_count) });
    if (p.avatar_url) { u.avatar = p.avatar_url; u.avatarFallback = null; }
    if (p.cover_url) u.cover = p.cover_url;
    if (Array.isArray(p.info) && p.info.length) u.info = p.info;
    if (Array.isArray(p.links) && p.links.length) u.links = p.links;
    if (p.avatar_url && oldAvatar !== p.avatar_url) swapSrc(oldAvatar, p.avatar_url);
    synced = snapshot(u);
    return true;
  }

  async function push() {
    const u = me(); if (!u) return;
    const s = snapshot(u);
    if (s === synced) return;
    try {
      const patch = { display_name: u.name, bio: u.bio, links: u.links, info: u.info, is_private: !!(u.privacy && u.privacy.isPrivate) };
      if (isLocalImg(u.avatar)) {
        const url = await B.upload('avatars', await toFile(u.avatar, 'avatar'));
        swapSrc(u.avatar, url); u.avatar = url; patch.avatar_url = url;
      }
      if (isLocalImg(u.cover)) {
        const url = await B.upload('covers', await toFile(u.cover, 'cover'));
        u.cover = url; patch.cover_url = url;
      }
      await B.updateProfile(patch);
      synced = snapshot(u); lastErr = '';
    } catch (err) { toast(err.message); }
  }

  async function start() {
    if (started) return; started = true;
    try { if (!(await pull())) return; } catch (err) { started = false; return toast(err.message); }
    timer = setInterval(push, 4000);
  }

  B.onAuth((event) => {
    if (event === 'SIGNED_IN') start();
    if (event === 'SIGNED_OUT') {
      clearInterval(timer); started = false;
      Object.keys(localStorage).filter((k) => /^socialinv_/.test(k)).forEach((k) => localStorage.removeItem(k));
      location.reload();
    }
  });
  B.session().then((s) => { if (s) start(); });
})();
