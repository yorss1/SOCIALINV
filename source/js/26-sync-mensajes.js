/* =====================================================
   26 — Mensajería con Supabase (Fase 2 · mensajes directos)
   · Conversaciones y mensajes reales, en vivo (Realtime). Texto, fotos, videos, notas de voz y pulsos compartidos.
   · Los medios van a un bucket PRIVADO (chat-media) y se leen con enlaces firmados de 1 hora.
   · El estado del mensaje ("enviando" → "enviado") lo confirma el servidor; ya no hay simulación.
   También: "visto", contador de no leídos, editar y eliminar mensajes propios (la otra persona lo ve en vivo).
   Pendiente: grupos, solicitudes de mensaje, llamadas, presencia (en línea).
   ===================================================== */
(function () {
  'use strict';
  const B = window.SvBackend, U = window.SvSync;
  if (!B || !B.enabled) return;

  let started = false, myId = null;
  const convOf = {}, userOf = {}, lastTs = {}, myRead = {}, theirRead = {};

  const fmtTime = (iso) => { const d = new Date(iso); let h = d.getHours(), m = d.getMinutes(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + ' ' + ap; };
  const fmtFull = (iso) => {
    const d = new Date(iso), days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], mo = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return days[d.getDay()] + ' ' + d.getDate() + ' ' + mo[d.getMonth()] + ' · ' + fmtTime(iso);
  };
  window.svChatUsers = () => Object.keys(convOf).sort((a, b) => String(lastTs[b] || '').localeCompare(String(lastTs[a] || '')));

  function rerender(u) {
    if (window.svRenderChatList) window.svRenderChatList();
    const win = document.getElementById('chatWindow');
    if (u && win && win.classList.contains('open') && document.getElementById('chatWindowUsername').textContent === u && window.svRenderChatMessages) {
      window.svRenderChatMessages();
      const box = document.getElementById('chatMessages'); if (box) box.scrollTop = box.scrollHeight;
    }
  }

  async function toLocal(row, other) {
    const m = { from: row.sender_id === myId ? myUsername : other, time: fmtTime(row.created_at), fullTime: fmtFull(row.created_at), sid: row.id, status: 'sent', created: row.created_at, _srvText: row.body };
    if (row.kind === 'image' || row.kind === 'video') { m.kind = row.kind; m.url = row.media_url ? await B.signedChatUrl(row.media_url) : ''; }
    else if (row.kind === 'voice') { m.kind = 'audio'; m.url = row.media_url ? await B.signedChatUrl(row.media_url) : ''; m.duration = row.body || '0:00'; m.seed = Math.random() * 10; }
    else if (row.kind === 'post') { try { m.shared = JSON.parse(row.body); } catch (e) { m.text = 'Pulso compartido'; } }
    else m.text = row.body;
    return m;
  }

  async function load() {
    const rows = await B.conversations(), seen = new Set();
    for (const r of rows) {
      const c = r.conversation; if (!c || c.is_group || seen.has(c.id)) continue; seen.add(c.id);
      const other = (c.members || []).map((x) => x.user).find((x) => x && x.id !== myId); if (!other) continue;
      U.ensureUser(other); convOf[other.username] = c.id; userOf[c.id] = other.username;
      (c.members || []).forEach((x) => { if (!x.user) return; if (x.user.id === myId) myRead[other.username] = x.last_read_at; else theirRead[other.username] = x.last_read_at; });
      if (conversations[other.username] && conversations[other.username].some((m) => m.sid)) continue;     // ya cargada
      const msgs = (await B.messages(c.id)).slice().reverse();
      conversations[other.username] = await Promise.all(msgs.map((m) => toLocal(m, other.username)));
      if (msgs.length) lastTs[other.username] = msgs[msgs.length - 1].created_at;
      applySeen(other.username);
    }
    rerender(); injectBadges();
  }

  async function sidOf(u) {
    if (usersData[u] && usersData[u].sid) return usersData[u].sid;
    const p = await B.profile(u); if (!p) throw new Error('Esa cuenta no existe');
    if (usersData[u]) usersData[u].sid = p.id;
    return p.id;
  }

  async function send(u, m) {
    m._busy = true;
    try {
      let cid = convOf[u];
      if (!cid) { cid = await B.startDm(await sidOf(u)); convOf[u] = cid; userOf[cid] = u; }
      let kind = 'text', body = m.text || '', media = null;
      if (m.shared) { kind = 'post'; body = JSON.stringify(m.shared); }
      else if (m.kind === 'audio') { kind = 'voice'; body = m.duration || ''; media = await B.upload('chat-media', await U.file(m.url, 'voz')); }
      else if (m.kind === 'image' || m.kind === 'video') { kind = m.kind; media = await B.upload('chat-media', await U.file(m.url, 'archivo')); }
      else if (!body) { m.sid = 'local'; return; }
      const row = await B.sendMessage(cid, body, kind, media);
      m.sid = row.id; m.status = 'sent'; m.created = row.created_at; m._srvText = m.text; lastTs[u] = row.created_at; U.clearToast();
    } catch (err) { m.status = 'pending'; m._retryAt = Date.now() + 10000; U.toast('Mensaje no enviado: ' + err.message); }
    finally { m._busy = false; rerender(u); }
  }

  const openUser = () => { const w = document.getElementById('chatWindow'); return w && w.classList.contains('open') ? document.getElementById('chatWindowUsername').textContent : null; };
  function applySeen(u) {
    let changed = false;
    (conversations[u] || []).forEach((m) => { if (m.from === myUsername && m.sid && m.created && theirRead[u] && m.created <= theirRead[u] && m.status !== 'read') { m.status = 'read'; changed = true; } });
    return changed;
  }
  async function readSync() {
    const u = openUser(); if (!u || !convOf[u]) return;
    const thread = conversations[u] || [], lastIn = thread.filter((m) => m.from !== myUsername && m.created).slice(-1)[0];
    if (lastIn && (!myRead[u] || lastIn.created > myRead[u])) { const now = new Date().toISOString(); myRead[u] = now; B.markConversationRead(convOf[u]).catch(() => {}); injectBadges(); }
    try {
      const rows = await B.convMembers(convOf[u]), other = rows.find((r) => r.user_id !== myId);
      if (other && other.last_read_at !== theirRead[u]) { theirRead[u] = other.last_read_at; if (applySeen(u)) rerender(u); }
    } catch (e) { /* se reintenta */ }
  }
  function injectBadges() {
    document.querySelectorAll('#chatList .chat-list-item').forEach((el) => {
      const u = el.dataset.u, n = (conversations[u] || []).filter((m) => m.from !== myUsername && m.created && (!myRead[u] || m.created > myRead[u])).length;
      const meta = el.querySelector('.cl-meta'); if (!meta) return;
      let b = meta.querySelector('.cl-unread');
      if (n > 0 && u !== openUser()) { if (!b) { b = document.createElement('div'); b.className = 'cl-unread'; meta.appendChild(b); } b.textContent = n > 99 ? '99+' : n; }
      else if (b) b.remove();
    });
  }
  const listEl = document.getElementById('chatList');
  if (listEl) new MutationObserver(() => { if (!listEl.querySelector('.cl-unread') || true) injectBadges(); }).observe(listEl, { childList: true });

  function poll() {
    Object.keys(conversations).forEach((u) => {
      (conversations[u] || []).forEach((m) => {
        // Editar / eliminar mensajes propios ya enviados
        if (m && m.from === myUsername && U.UUID.test(String(m.sid))) {
          if (m.deleted && !m._del) { m._del = true; B.deleteMessage(m.sid).catch((e) => { m._del = false; U.toast(e.message); }); return; }
          if (m.edited && !m.deleted && m.text !== m._srvText && !m._ed) { const t = m.text; m._ed = true; B.editMessage(m.sid, t).then(() => { m._srvText = t; }).catch((e) => U.toast(e.message)).finally(() => { m._ed = false; }); return; }
        }
        if (!m || m.from !== myUsername || m.sid || m._busy || m.deleted) return;
        if (m.kind === 'call' || m.kind === 'videocall') { m.sid = 'local'; return; }       // las llamadas aún no existen en el servidor
        if (m._retryAt && Date.now() < m._retryAt) return;
        send(u, m);
      });
    });
  }

  function applyUpdate(row) {
    const u = userOf[row.conversation_id]; if (!u) return;
    const m = (conversations[u] || []).find((x) => x.sid === row.id); if (!m) return;
    if (row.deleted_at) m.deleted = true;
    else if (row.kind === 'text' && row.body !== m.text) { m.text = row.body; m._srvText = row.body; m.edited = true; }
    rerender(u);
  }
  async function onNew(row, ev) {
    if (ev === 'UPDATE') return applyUpdate(row);
    if (row.sender_id === myId) return;
    let u = userOf[row.conversation_id];
    if (!u) { try { await load(); } catch (e) { return; } u = userOf[row.conversation_id]; if (!u) return; }
    const thread = conversations[u] || (conversations[u] = []);
    if (thread.some((x) => x.sid === row.id)) return;
    thread.push(await toLocal(row, u)); lastTs[u] = row.created_at;
    const open = document.getElementById('chatWindow').classList.contains('open') && document.getElementById('chatWindowUsername').textContent === u;
    if (!open && typeof showAppToast === 'function') showAppToast('Nuevo mensaje de ' + u);
    rerender(u); injectBadges();
  }

  async function start() {
    if (started) return; started = true;
    try { myId = (await B.myProfile()).id; } catch (err) { started = false; return U.toast(err.message); }
    // Modo conectado: fuera las conversaciones de ejemplo
    const wipe = () => Object.keys(conversations).forEach((k) => { if (!convOf[k]) delete conversations[k]; });
    wipe(); setTimeout(wipe, 3000);
    try { await load(); } catch (err) { U.toast(err.message); }
    B.subscribeAllMessages(onNew);
    setInterval(poll, 1500);
    setInterval(readSync, 3000);
    setInterval(() => load().catch(() => {}), 60000);       // red de seguridad si se pierde algún evento en vivo
  }
  B.onAuth((event) => { if (event === 'SIGNED_IN') setTimeout(start, 2000); });
  B.session().then((s) => { if (s) setTimeout(start, 2000); });
})();
