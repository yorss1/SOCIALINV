/* =====================================================
   AMBIENTE: conecta SvColor con CADA pantalla.
   - Modo claro/oscuro -> <html data-sv-mode>
   - Cada pantalla se tiñe con el color dominante de SU contenido (avatares, resultados, tiles…)
   - Cada fila (chat, resultado, notificación, contacto, comentario) recibe su propio acento
   - Mensajes: fila de personas con anillo de color; Aura: la vibra elegida recolorea toda la vista
   ===================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;

  /* ---------- Modo claro / oscuro ---------- */
  const syncMode = () => { root.dataset.svMode = (typeof appTheme !== 'undefined' && appTheme.mode) || 'light'; };
  const _setAppTheme = window.setAppTheme;
  window.setAppTheme = function () { const r = _setAppTheme.apply(this, arguments); syncMode(); return r; };
  syncMode();

  const myAvatar = () => (usersData[myUsername] && usersData[myUsername].avatar) || 'source/imgs/user-default.png';

  /* ---------- Buscar ---------- */
  const search = $('searchView');
  const runSearchColor = SvColor.watch(search, { img: '.search-result-item img, .aura-tile img', n: 3 });
  SvColor.rows(search, '.search-result-item', '.sr-avatar');
  // Aura: cada vibra recolorea TODA la vista de búsqueda
  const MOOD_HUE = { calido: [18, 88], frio: [205, 82], noche: [246, 60], vivido: [318, 90], suave: [335, 55], mono: [220, 6] };
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('#auraChips .aura-chip'); if (!chip) return;
    const m = chip.dataset.mood;
    if (MOOD_HUE[m]) { search.dataset.svLock = '1'; SvColor.apply(search, SvColor.fromHue(MOOD_HUE[m][0], MOOD_HUE[m][1])); }
    else { delete search.dataset.svLock; setTimeout(runSearchColor, 150); }
  });
  document.querySelectorAll('.search-tab').forEach((t) => t.addEventListener('click', () => {
    if (t.id !== 'auraTab') { delete search.dataset.svLock; setTimeout(runSearchColor, 150); }
  }));

  /* ---------- Mensajes ---------- */
  const messenger = $('messengerView'), chatList = $('chatList');
  SvColor.watch(chatList, { img: '.cl-avatar', n: 3, target: messenger });
  SvColor.rows(chatList, '.chat-list-item', '.cl-avatar');
  // Fila de personas (estilo historias) con anillo del color de cada avatar
  function peopleRow() {
    if (chatList.querySelector('.msg-people')) return;
    const users = Object.keys(usersData).filter((u) => u !== myUsername && !(window.SocialInv && SocialInv.isBlocked(u)));
    if (!users.length) return;
    const row = document.createElement('div'); row.className = 'msg-people';
    row.innerHTML = users.map((u) => `<button type="button" class="msg-person" data-u="${escapeHtml(u)}">
        <span class="msg-ring"><img src="${escapeHtml(usersData[u].avatar)}" alt=""></span><small>@${escapeHtml(u)}</small></button>`).join('');
    chatList.insertBefore(row, chatList.firstChild);
    SvColor.rows(row, '.msg-person', 'img');
  }
  new MutationObserver(peopleRow).observe(chatList, { childList: true });
  peopleRow();
  chatList.addEventListener('click', (e) => { const b = e.target.closest('.msg-person'); if (b) openChatWindow(b.dataset.u); });

  /* ---------- Ajustes, crear, seguidos, notificaciones, compartir, comentarios ---------- */
  SvColor.tint($('settingsModal'), myAvatar());
  const create = document.querySelector('.create-sheet'); if (create) SvColor.tint(create, myAvatar());
  const fl = document.querySelector('.follow-list-modal');
  if (fl) { SvColor.watch(fl, { img: '.fl-item img', n: 3 }); SvColor.rows(fl, '.fl-item', 'img'); }
  const notif = $('notifSheet'); SvColor.watch(notif, { img: '.sv-item img', n: 3 }); SvColor.rows(notif, '.sv-item', 'img');
  SvColor.rows($('shareUsersList'), '.share-user-item', 'img');
  SvColor.rows($('cdList'), '.cd-item', '.cd-avatar img');
})();
