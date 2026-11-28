/* =====================================================
   24 — Historias con Supabase (Fase 2)
   · Las historias de las personas que sigues (y las tuyas) vienen del servidor; caducan a las 24 h.
   · Publicar una historia desde el compositor la sube; verlas se registra como "vista".
   Pendiente: texto oculto ("mantén presionado") y respuestas a historias en el servidor, ver quién vio mi historia.
   ===================================================== */
(function () {
  'use strict';
  const B = window.SvBackend, U = window.SvSync;
  if (!B || !B.enabled) return;

  const marked = new Set(), uploading = new Set(), failed = new Set();
  let started = false;

  async function load() {
    try {
      const [rows, viewed] = await Promise.all([B.stories(), B.myStoryViews()]);
      const seen = new Set(viewed), groups = {};
      rows.forEach((r) => {
        if (!r.author || !r.media_url) return;
        const u = r.author.username;
        if (u !== myUsername && !followingState.has(u)) return;      // solo las de tu gente
        U.ensureUser(r.author);
        (groups[u] = groups[u] || { username: u, avatar: r.author.avatar_url || 'source/imgs/user-default.png', stories: [] })
          .stories.push({ sid: r.id, image: r.media_url, kind: r.media_type === 'video' ? 'video' : 'image', time: U.rel(r.created_at), seen: seen.has(r.id) || u === myUsername });
      });
      const pending = (storyUsers.find((s) => s.username === myUsername) || { stories: [] }).stories.filter((s) => !s.sid);   // las que se están subiendo
      storyUsers.length = 0;
      Object.values(groups).forEach((g) => storyUsers.push(g));
      if (pending.length) {
        let me = storyUsers.find((s) => s.username === myUsername);
        if (!me) { me = { username: myUsername, avatar: usersData[myUsername].avatar, stories: [] }; storyUsers.push(me); }
        me.stories.unshift(...pending);
      }
      renderStoriesHeader();
    } catch (err) { U.toast(err.message); }
  }

  async function poll() {
    for (const g of storyUsers) for (const s of g.stories) {
      if (s.sid && s.seen && g.username !== myUsername && !marked.has(s.sid)) { marked.add(s.sid); B.markStorySeen(s.sid).catch(() => marked.delete(s.sid)); }
      if (g.username === myUsername && !s.sid && /^(blob:|data:)/.test(s.image || '') && !uploading.has(s.image) && !failed.has(s.image)) {
        uploading.add(s.image);
        try { const row = await B.createStory({ file: await U.file(s.image, 'story') }); s.sid = row.id; }
        catch (err) { failed.add(s.image); U.toast('No se pudo publicar la historia: ' + err.message); }
        finally { uploading.delete(s.image); }
      }
    }
  }

  async function start() {
    if (started) return; started = true;
    await load();
    setInterval(poll, 3000);
    setInterval(() => { const o = document.getElementById('storyFs'); if (!o || !o.classList.contains('open')) load(); }, 120000);
  }
  B.onAuth((event) => { if (event === 'SIGNED_IN') setTimeout(start, 2500); });
  B.session().then((s) => { if (s) setTimeout(start, 2500); });
})();
