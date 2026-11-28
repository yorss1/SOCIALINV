/* =====================================================
   29 — Comunidades (Módulo 11 · requiere migracion10.sql)
   · Explorar, crear, unirse (pública al instante / privada con aprobación), salir.
   · Cada comunidad tiene su muro: publicar texto y fotos, me gusta, comentarios y guardados como en el feed.
   · Los administradores aprueban o rechazan solicitudes de comunidades privadas.
   Pendiente: foto de comunidad, roles de admin editables, reglas, moderación de la comunidad, notificaciones propias.
   ===================================================== */
(function () {
  'use strict';
  const B = window.SvBackend, U = window.SvSync;
  if (!B || !B.enabled) return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BACK = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18 9 12l6-6"/></svg>';
  const IMG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.7"/><path d="m21 15-5-5L5 21"/></svg>';

  const root = document.createElement('div');
  root.id = 'communitiesView'; root.className = 'cm-view'; root.hidden = true;
  document.body.appendChild(root);

  function open() { root.hidden = false; document.documentElement.classList.add('cm-open'); home('mine'); }
  function close() { root.hidden = true; root.innerHTML = ''; document.documentElement.classList.remove('cm-open'); }
  function shell(title, body, back) {
    root.innerHTML = '<div class="cm-bar"><button class="cm-back" type="button" aria-label="Volver">' + BACK + '</button><h1>' + esc(title) + '</h1></div><div class="cm-body">' + body + '</div>';
    root.querySelector('.cm-back').onclick = back || close;
    root.querySelector('.cm-body').scrollTop = 0;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !root.hidden) close(); });

  const item = (c, extra) =>
    '<button class="cm-item" type="button" data-id="' + c.id + '"><span class="cm-av">' + esc(c.name.slice(0, 1).toUpperCase()) + '</span>' +
    '<span class="cm-info"><b>' + esc(c.name) + '</b><small>' + c.members_count + (c.members_count === 1 ? ' miembro' : ' miembros') + ' · ' + (c.is_private ? 'Privada' : 'Pública') + '</small></span>' + (extra || '') + '</button>';

  /* ---------- Inicio: mis comunidades / descubrir ---------- */
  const cache = {};
  async function home(tab) {
    const mine = tab === 'mine';
    shell('Comunidades',
      '<div class="cm-tabs"><button class="cm-tab' + (mine ? ' on' : '') + '" data-t="mine">Mis comunidades</button><button class="cm-tab' + (mine ? '' : ' on') + '" data-t="all">Descubrir</button></div>' +
      (mine ? '' : '<input class="cm-search" id="cmSearch" placeholder="Buscar comunidades" autocomplete="off">') +
      '<div id="cmList" class="cm-list"><p class="cm-empty">Cargando…</p></div><button class="cm-fab" type="button" id="cmCreate">Crear comunidad</button>');
    root.querySelectorAll('.cm-tab').forEach((b) => { b.onclick = () => home(b.dataset.t); });
    root.querySelector('#cmCreate').onclick = createForm;
    const list = root.querySelector('#cmList');
    const paint = (rows, empty) => {
      rows.forEach((r) => { cache[r.id] = r; });
      list.innerHTML = rows.length ? rows.map((r) => item(r, r._pending ? '<span class="cm-badge">Pendiente</span>' : '')).join('') : '<p class="cm-empty">' + empty + '</p>';
      list.querySelectorAll('.cm-item').forEach((b) => { b.onclick = () => detail(b.dataset.id); });
    };
    try {
      if (mine) paint((await B.myCommunities()).filter((r) => r.community).map((r) => Object.assign({ _pending: r.status === 'pending', _role: r.role }, r.community)), 'Todavía no estás en ninguna comunidad. Descubre una o crea la tuya.');
      else {
        const run = async (q) => paint(await B.discoverCommunities(q), 'No encontramos comunidades.');
        await run('');
        let t; root.querySelector('#cmSearch').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => run(e.target.value).catch((x) => U.toast(x.message)), 300); });
      }
    } catch (err) { list.innerHTML = '<p class="cm-empty">' + esc(err.message) + '</p>'; }
  }

  /* ---------- Crear ---------- */
  function createForm() {
    shell('Nueva comunidad',
      '<form class="auth-form cm-form" novalidate><label class="auth-field"><span>Nombre</span><input id="cmName" maxlength="60" required></label>' +
      '<label class="auth-field"><span>Descripción</span><input id="cmDesc" maxlength="500"></label>' +
      '<label class="auth-check"><input id="cmPriv" type="checkbox"><span>Privada: solo los miembros la ven y unirse requiere aprobación</span></label>' +
      '<p class="auth-msg" role="alert"></p><button class="auth-primary" type="submit">Crear comunidad</button></form>', () => home('mine'));
    const f = root.querySelector('form'), msg = root.querySelector('.auth-msg');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = f.cmName.value.trim();
      if (name.length < 3) { msg.textContent = 'El nombre debe tener al menos 3 caracteres'; return; }
      f.querySelector('button').disabled = true;
      try { const c = await B.createCommunity({ name, description: f.cmDesc.value.trim(), isPrivate: f.cmPriv.checked }); cache[c.id] = c; detail(c.id); }
      catch (err) { msg.textContent = err.message; f.querySelector('button').disabled = false; }
    });
  }

  /* ---------- Detalle ---------- */
  async function detail(id) {
    const c = cache[id]; if (!c) return home('mine');
    shell(c.name, '<p class="cm-empty">Cargando…</p>', () => home('mine'));
    let m = null;
    try { m = await B.myMembership(id); } catch (e) { /* sin membresía */ }
    const active = m && m.status === 'active', pending = m && m.status === 'pending', admin = active && (m.role === 'owner' || m.role === 'admin');
    const action = active ? (m.role === 'owner' ? '' : '<button class="auth-primary cm-act" data-a="leave" style="background:var(--nu-sunk);color:var(--nu-ink)">Salir</button>')
      : pending ? '<button class="auth-primary cm-act" disabled>Solicitud enviada</button>'
      : '<button class="auth-primary cm-act" data-a="join">' + (c.is_private ? 'Solicitar unirme' : 'Unirme') + '</button>';
    shell(c.name,
      '<div class="cm-head"><span class="cm-av cm-av-lg">' + esc(c.name.slice(0, 1).toUpperCase()) + '</span><h2>' + esc(c.name) + '</h2>' +
      '<p class="cm-meta">' + c.members_count + (c.members_count === 1 ? ' miembro' : ' miembros') + ' · ' + (c.is_private ? 'Privada' : 'Pública') + '</p>' +
      (c.description ? '<p class="cm-desc">' + esc(c.description) + '</p>' : '') + action + '</div>' +
      (admin && c.is_private ? '<div id="cmPending"></div>' : '') +
      (active ? '<div class="cm-composer"><textarea id="cmText" maxlength="2200" placeholder="Escribe algo para la comunidad"></textarea><div class="cm-comp-row"><label class="cm-photo" aria-label="Añadir foto">' + IMG + '<input id="cmFile" type="file" accept="image/*" hidden></label><span id="cmFileName"></span><button class="auth-primary cm-pub" id="cmPub" type="button">Publicar</button></div></div>' : '') +
      (active || !c.is_private ? '<div id="cmPosts" class="cm-posts"></div>' : '<p class="cm-empty">Esta comunidad es privada. Pide unirte para ver sus publicaciones.</p>'),
      () => home('mine'));
    const act = root.querySelector('.cm-act[data-a]');
    if (act) act.onclick = async () => {
      act.disabled = true;
      try {
        if (act.dataset.a === 'join') await B.joinCommunity(id);
        else if (confirm('¿Salir de la comunidad?')) await B.leaveCommunity(id); else { act.disabled = false; return; }
        const fresh = (await B.discoverCommunities('')).find((x) => x.id === id) || (await B.myCommunities()).map((r) => r.community).find((x) => x && x.id === id);
        if (fresh) cache[id] = Object.assign(c, fresh);
        detail(id);
      } catch (err) { U.toast(err.message); act.disabled = false; }
    };
    if (admin && c.is_private) pendingList(id);
    if (active || !c.is_private) posts(id, active);
  }

  async function pendingList(id) {
    const box = root.querySelector('#cmPending'); if (!box) return;
    try {
      const rows = (await B.pendingMembers(id)).filter((r) => r.user);
      if (!rows.length) return;
      box.innerHTML = '<h3 class="cm-h3">Solicitudes</h3>' + rows.map((r) =>
        '<div class="cm-req" data-u="' + r.user.id + '"><span><b>' + esc(r.user.display_name || r.user.username) + '</b> <small>@' + esc(r.user.username) + '</small></span>' +
        '<span><button class="cm-mini" data-a="ok">Aprobar</button><button class="cm-mini cm-mini-o" data-a="no">Rechazar</button></span></div>').join('');
      box.querySelectorAll('.cm-req button').forEach((b) => { b.onclick = async () => {
        const row = b.closest('.cm-req'); b.disabled = true;
        try { await (b.dataset.a === 'ok' ? B.approveMember(id, row.dataset.u) : B.rejectMember(id, row.dataset.u)); row.remove(); } catch (err) { U.toast(err.message); b.disabled = false; }
      }; });
    } catch (err) { /* sin solicitudes */ }
  }

  async function posts(id, canPost) {
    const box = root.querySelector('#cmPosts'); if (!box) return;
    try {
      const rows = await B.communityPosts(id);
      if (!rows.length) box.innerHTML = '<p class="cm-empty">Aún no hay publicaciones. Sé la primera persona en publicar.</p>';
      else await window.svRenderRows(box, rows, false);
    } catch (err) { box.innerHTML = '<p class="cm-empty">' + esc(err.message) + '</p>'; }
    if (!canPost) return;
    const file = root.querySelector('#cmFile'), pub = root.querySelector('#cmPub'), text = root.querySelector('#cmText');
    file.onchange = () => { root.querySelector('#cmFileName').textContent = file.files[0] ? file.files[0].name.slice(0, 22) : ''; };
    pub.onclick = async () => {
      const caption = text.value.trim(), f = file.files[0];
      if (!caption && !f) return;
      pub.disabled = true;
      try {
        const row = await B.createPost({ caption, files: f ? [f] : [], communityId: id });
        const empty = box.querySelector('.cm-empty'); if (empty) empty.remove();
        await window.svRenderRows(box, [row], true);
        text.value = ''; file.value = ''; root.querySelector('#cmFileName').textContent = '';
      } catch (err) { U.toast('No se pudo publicar: ' + err.message); }
      pub.disabled = false;
    };
  }

  /* ---------- Entrada desde Descubrir ---------- */
  function inject() {
    const dv = document.getElementById('dvHome');
    if (!dv || document.getElementById('dvCommunities')) return;
    const b = document.createElement('button');
    b.id = 'dvCommunities'; b.type = 'button'; b.className = 'cm-entry';
    b.innerHTML = '<span><b>Comunidades</b><small>Únete a grupos o crea el tuyo</small></span><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
    b.onclick = open;
    dv.insertBefore(b, dv.querySelector('.dv-sec') || null);
  }
  setInterval(inject, 1000);
})();
