/* =====================================================
   28 — Reels (video corto) con Supabase (Fase 2 · requiere migracion9.sql)
   · Con sesión iniciada los reels son los reales (recientes de cuentas públicas); los de ejemplo se retiran.
   · Publicar un reel desde el compositor sube el video y lo crea en el servidor.
   · Me gusta y comentarios usan la misma infraestructura que los pulsos.
   Pendiente: paginación de reels, eliminar reels, "Amigos" (solo seguidos), estadísticas.
   ===================================================== */
(function () {
  'use strict';
  const B = window.SvBackend, U = window.SvSync;
  if (!B || !B.enabled) return;

  const synced = new Map();            // reelId -> ¿tiene mi me gusta el servidor?
  const uploading = new Set(), failed = new Set();
  let started = false;
  const likeBtn = (el) => el.querySelector('.reel-action.like-btn');
  const isLiked = (btn) => !!btn && (btn.classList.contains('active') || btn.classList.contains('liked'));

  function add(row, atTop) {
    if (!row.author || !(row.media || [])[0]) return;
    if (reelsScroll.querySelector('[data-reel-id="' + row.id + '"]')) return;
    U.ensureUser(row.author);
    const m = row.media[0];
    const html = buildReelItemHTML({
      reelId: row.id, mediaKind: m.type === 'video' ? 'video' : 'image', mediaUrl: m.url, username: row.author.username,
      avatarUrl: row.author.avatar_url || 'source/imgs/user-default.png', caption: row.caption || '',
      likeCount: row.likes_count || 0, commentCount: row.comments_count || 0
    });
    reelsScroll.insertAdjacentHTML(atTop ? 'afterbegin' : 'beforeend', html);
    const el = reelsScroll.querySelector('[data-reel-id="' + row.id + '"]');
    initReelInteractions(el); bindCommentButtons(el); bindReelShare(el);
  }

  async function load() {
    try {
      const rows = await B.reels();
      rows.forEach((r) => add(r, false));
      const ids = rows.map((r) => r.id);
      const liked = new Set(await B.myLikes(ids));
      ids.forEach((id) => { const el = reelsScroll.querySelector('[data-reel-id="' + id + '"]'); const b = el && likeBtn(el); if (b && liked.has(id)) b.classList.add('active', 'liked'); synced.set(id, liked.has(id)); });
      U.clearToast();
    } catch (err) { U.toast(err.message); }
  }

  async function poll() {
    // Me gusta
    reelsScroll.querySelectorAll('.reel-item').forEach(async (el) => {
      const id = el.dataset.reelId; if (!U.UUID.test(String(id))) return;
      const b = likeBtn(el), now = isLiked(b);
      if (!synced.has(id)) synced.set(id, now);
      if (now === synced.get(id)) return;
      synced.set(id, now);
      try { await B.setLike(id, now); } catch (err) { synced.set(id, !now); if (b) b.classList.toggle('active', !now), b.classList.toggle('liked', !now); U.toast(err.message); }
    });
    // Reels hechos en el compositor
    for (const el of reelsScroll.querySelectorAll('.reel-item')) {
      const id = el.dataset.reelId;
      if (U.UUID.test(String(id)) || /^reel-static-/.test(id) || uploading.has(id) || failed.has(id)) continue;
      const u = el.querySelector('.user'); if (!u || u.dataset.username !== myUsername) continue;
      const media = el.querySelector('.reel-media-fg'); if (!media || !/^(blob:|data:)/.test(media.getAttribute('src') || '')) continue;
      uploading.add(id);
      try {
        const row = await B.createPost({ caption: (el.querySelector('.desc') || {}).textContent || '', files: [await U.file(media.getAttribute('src'), 'reel')], kind: 'reel' });
        el.dataset.reelId = row.id; synced.set(row.id, false); U.clearToast();
      } catch (err) { failed.add(id); U.toast('No se pudo publicar el reel: ' + err.message); }
      finally { uploading.delete(id); }
    }
  }

  async function start() {
    if (started) return; started = true;
    reelsScroll.querySelectorAll('.reel-item').forEach((el) => { if (/^reel-static-/.test(el.dataset.reelId)) el.remove(); });
    await load();
    setInterval(poll, 1500);
  }
  B.onAuth((event) => { if (event === 'SIGNED_IN') setTimeout(start, 3000); });
  B.session().then((s) => { if (s) setTimeout(start, 3000); });
})();
