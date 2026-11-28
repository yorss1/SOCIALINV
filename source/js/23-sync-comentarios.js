/* =====================================================
   23 — Comentarios con Supabase (Fase 2)
   · Al abrir los comentarios de un pulso real se descargan del servidor (con respuestas).
   · Comentar y responder se guardan en el servidor; si falla se retira el comentario y se avisa.
   Me gusta en comentarios (requiere migracion8.sql). Pendiente: eliminar comentarios propios desde la interfaz.
   ===================================================== */
(function () {
  'use strict';
  const B = window.SvBackend, U = window.SvSync;
  if (!B || !B.enabled) return;

  async function loadThread(postId) {
    try {
      const rows = await B.comments(postId);
      const byId = {}, parent = {}, roots = [];
      rows.forEach((c) => {
        if (!c.author) return;
        U.ensureUser(c.author);
        byId[c.id] = { id: c.id, sid: c.author.id, username: c.author.username, avatar: c.author.avatar_url || 'source/imgs/user-default.png', text: c.body, time: U.rel(c.created_at), likes: c.likes_count || 0, liked: false, replies: [] };
        parent[c.id] = c.parent_id;
      });
      rows.forEach((c) => {
        const n = byId[c.id]; if (!n) return;
        let p = c.parent_id; while (p && parent[p]) { if (!parent[parent[p]]) break; p = parent[p]; }   // las respuestas se aplanan bajo el comentario raíz
        if (p && byId[p]) byId[p].replies.push(n); else roots.push(n);
      });
      try { (await B.myCommentLikes(rows.map((c) => c.id))).forEach((id) => { if (byId[id]) { byId[id].liked = true; liked.add(id); } }); } catch (e) { /* sin estado de me gusta */ }
      commentsStore.set(postId, roots);
      if (activeCommentsId === postId) renderComments();
      syncCommentCountBadge();
      U.clearToast();
    } catch (err) { U.toast(err.message); }
  }

  /* Me gusta en comentarios: se comparan con lo último que sabe el servidor */
  const liked = new Set();
  function allComments() { const out = []; commentsStore.forEach((th) => th.forEach((c) => { out.push(c); (c.replies || []).forEach((r) => out.push(r)); })); return out; }
  setInterval(() => {
    allComments().forEach((c) => {
      if (!c || !U.UUID.test(String(c.id))) return;
      const was = liked.has(c.id);
      if (!!c.liked === was) return;
      if (c.liked) liked.add(c.id); else liked.delete(c.id);
      B.setCommentLike(c.id, !!c.liked).catch((err) => { if (was) liked.add(c.id); else liked.delete(c.id); c.liked = was; U.toast(err.message); });
    });
  }, 1500);

  const _open = window.openComments;
  window.openComments = function (id) {
    const r = _open.apply(this, arguments);
    if (U.UUID.test(String(id))) loadThread(String(id));
    return r;
  };

  /* Envío: se lee el contexto en captura (antes de que la interfaz limpie el campo) */
  function before() {
    const id = activeCommentsId;
    if (!id || !U.UUID.test(String(id))) return null;
    const text = cdInput.value.trim(); if (!text) return null;
    const ar = activeReply, rr = ar && ar.commentId !== ar.rootId;
    return { postId: id, body: rr ? '@' + ar.username + ' ' + text : text, rootId: ar ? ar.rootId : null };
  }
  function hook() {
    const ctx = before(); if (!ctx) return;
    setTimeout(async () => {
      const thread = commentsStore.get(ctx.postId) || [];
      const root = ctx.rootId ? thread.find((c) => c.id === ctx.rootId) : null;
      const list = root ? root.replies : thread;
      const local = list[list.length - 1];
      if (!local || local.username !== myUsername || local.sid) return;
      try {
        const row = await B.addComment(ctx.postId, ctx.body, root && U.UUID.test(String(root.id)) ? root.id : null);
        local.id = row.id; local.sid = row.author_id;
        renderComments();
      } catch (err) {
        const i = list.indexOf(local); if (i > -1) list.splice(i, 1);
        if (activeCommentsId === ctx.postId) renderComments();
        syncCommentCountBadge(); U.toast('No se pudo comentar: ' + err.message);
      }
    }, 0);
  }
  cdSendBtn.addEventListener('click', hook, true);
  cdInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') hook(); }, true);
})();
