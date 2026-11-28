/* =====================================================
   22 — Notificaciones y reportes con Supabase (Fase 2)
   · Actividad real (me gusta, comentarios, seguidores, solicitudes) con aviso en vivo.
   · Aceptar / rechazar solicitudes de seguimiento llega al servidor.
   · Marcar como leído y los reportes de pulsos / perfiles se guardan en el servidor.
   ===================================================== */
(function () {
  'use strict';
  const B = window.SvBackend, U = window.SvSync;
  if (!B || !B.enabled) return;

  const S = () => window.SocialInv.state;
  const MAP = { like: 'like', comment: 'reply', follow: 'follow', follow_request: 'request', follow_accept: 'accepted', mention: 'mention', system: 'follow' };
  const TEXT = { comment: 'comentó tu pulso', like: 'dio me gusta a tu pulso' };
  const REASON = { 'Spam o engaño': 'spam', 'Acoso o bullying': 'acoso', 'Contenido sexual': 'desnudez', 'Violencia': 'violencia', 'Información falsa': 'falso', 'Otro motivo': 'otro' };
  const loaded = new Set(), serverRead = new Set();
  let started = false, reportsDone = 0;

  async function ingest(rows) {
    // Las solicitudes ya resueltas no deben reaparecer: solo se muestran las que siguen pendientes
    let pending = new Set();
    try { pending = new Set((await B.followerRequests()).map((r) => r.who && r.who.id)); } catch (e) { /* se muestran todas */ }
    rows.slice().reverse().forEach((r) => {
      if (loaded.has(r.id) || !r.actor) return;
      loaded.add(r.id);
      if (r.type === 'follow_request' && !pending.has(r.actor.id)) { B.deleteNotification(r.id).catch(() => {}); return; }
      U.ensureUser(r.actor);
      if (r.read_at) serverRead.add(r.id);
      window.SocialInv.notify({ id: 's-' + r.id, sid: r.actor.id, ts: Date.parse(r.created_at), read: !!r.read_at, type: MAP[r.type] || 'follow', from: r.actor.username, text: TEXT[r.type] });
    });
    window.SocialInv.refreshBell();
  }

  async function start() {
    if (started) return; started = true;
    try {
      S().notifications = []; S().seeded = true; reportsDone = S().reports.length;
      await ingest(await B.notifications());
      B.subscribeNotifications(async () => { try { await ingest(await B.notifications()); } catch (e) { /* siguiente evento */ } });
      setInterval(poll, 3000);
    } catch (err) { started = false; U.toast(err.message); }
  }

  /* Aceptar / rechazar (captura: se lee la notificación antes de que la interfaz la quite) */
  const sheet = document.getElementById('notifSheet');
  if (sheet) sheet.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]'); if (!act) return;
    const it = act.closest('.sv-item'); if (!it) return;
    const n = S().notifications.find((x) => x.id === it.dataset.id);
    if (!n || !n.sid || !String(n.id).startsWith('s-')) return;
    const call = act.dataset.act === 'accept' ? B.acceptFollow(n.sid) : B.rejectFollow(n.sid);
    call.then(() => B.deleteNotification(n.id.slice(2))).catch((err) => U.toast(err.message));
  }, true);

  async function poll() {
    // Leídas
    const ids = S().notifications.filter((n) => n.read && String(n.id).startsWith('s-') && !serverRead.has(n.id.slice(2))).map((n) => n.id.slice(2));
    if (ids.length) { ids.forEach((i) => serverRead.add(i)); B.markNotificationsRead(ids).catch((e) => { ids.forEach((i) => serverRead.delete(i)); U.toast(e.message); }); }
    // Reportes nuevos
    const reps = S().reports;
    while (reportsDone < reps.length) {
      const r = reps[reportsDone++];
      try {
        const reason = REASON[r.reason] || 'otro';
        if (r.postId && U.UUID.test(String(r.postId))) await B.report('post', r.postId, reason);
        else if (r.user && usersData[r.user] && usersData[r.user].sid) await B.report('profile', usersData[r.user].sid, reason);
      } catch (e) { U.toast(e.message); }
    }
  }

  B.onAuth((event) => { if (event === 'SIGNED_IN') setTimeout(start, 1500); });
  B.session().then((s) => { if (s) setTimeout(start, 1500); });
})();
