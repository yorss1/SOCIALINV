/* =====================================================
   25 — Búsqueda de personas y gestión de la cuenta con Supabase (Fase 2)
   · Descubrir: al escribir se buscan personas reales (usuario o nombre).
   · Ajustes: "Descargar mis datos" (JSON) y "Eliminar cuenta" (con confirmación escribiendo tu usuario).
   ===================================================== */
(function () {
  'use strict';
  const B = window.SvBackend, U = window.SvSync;
  if (!B || !B.enabled) return;

  /* ---------- Búsqueda ---------- */
  const input = document.getElementById('searchInput');
  let timer = null, lastQ = '', silent = false;
  function addUser(p) {
    if (!p || !p.username || p.username === myUsername) return;
    U.ensureUser({ id: p.id, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url });
    const u = usersData[p.username];
    if (u) {
      u.bio = p.bio || ''; u.cover = p.cover_url || '';
      u.privacy = Object.assign({}, u.privacy, { isPrivate: !!p.is_private });
      u.stats = Object.assign({}, u.stats, { followers: window.svFmtCount ? window.svFmtCount(p.followers_count) : String(p.followers_count || 0) });
    }
  }
  if (input) input.addEventListener('input', () => {
    if (silent) return;
    clearTimeout(timer);
    const q = input.value.replace(/^@/, '').trim();
    if (q.length < 2 || q === lastQ) return;
    timer = setTimeout(async () => {
      lastQ = q;
      try {
        const rows = await B.searchProfiles(q);
        rows.forEach(addUser);
        if (input.value.replace(/^@/, '').trim() === q) { silent = true; input.dispatchEvent(new Event('input', { bubbles: true })); silent = false; }
        U.clearToast();
      } catch (err) { U.toast(err.message); }
    }, 300);
  });

  /* ---------- Ajustes: datos y eliminar cuenta ---------- */
  async function download() {
    try {
      const data = await B.exportData();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = 'socialinv-mis-datos.json'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (err) { U.toast(err.message); }
  }

  function confirmDelete() {
    const ov = document.createElement('div');
    ov.className = 'auth-overlay'; ov.id = 'deleteAccountOverlay';
    ov.innerHTML = '<div class="auth-card"><div class="auth-brand">SOCIALINV</div><h1 class="auth-title">Eliminar cuenta</h1>' +
      '<p class="auth-sub">Se borrarán tu perfil, tus pulsos, comentarios y mensajes. No se puede deshacer. Si quieres conservar algo, descarga tus datos antes.</p>' +
      '<form class="auth-form" novalidate><label class="auth-field"><span>Escribe tu usuario (' + myUsername + ') para confirmar</span><input id="delConfirm" autocomplete="off" autocapitalize="none" spellcheck="false"></label>' +
      '<p class="auth-msg" role="alert"></p><button class="auth-primary" type="submit" style="background:var(--nu-like);color:#fff">Eliminar definitivamente</button>' +
      '<button class="auth-link" type="button" id="delCancel">Cancelar</button></form></div>';
    document.body.appendChild(ov);
    const f = ov.querySelector('form'), msg = ov.querySelector('.auth-msg');
    ov.querySelector('#delCancel').onclick = () => ov.remove();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (f.delConfirm.value.trim().toLowerCase() !== String(myUsername).toLowerCase()) { msg.textContent = 'El usuario no coincide'; return; }
      ov.querySelectorAll('button,input').forEach((x) => { x.disabled = true; });
      try {
        await B.deleteAccount();
        try { await B.signOut(); } catch (err) { /* la sesión ya no existe */ }
        Object.keys(localStorage).filter((k) => /^socialinv_/.test(k)).forEach((k) => localStorage.removeItem(k));
        location.reload();
      } catch (err) { msg.textContent = err.message; ov.querySelectorAll('button,input').forEach((x) => { x.disabled = false; }); }
    });
  }

  function addItems() {
    const last = document.querySelector('.settings-menu-item[data-settings-screen="personalization"]');
    if (!last || document.getElementById('settingsExport')) return;
    const make = (id, label, fn, danger) => {
      const d = document.createElement('div');
      d.className = 'settings-menu-item'; d.id = id; d.setAttribute('role', 'button'); d.tabIndex = 0;
      d.innerHTML = '<div class="smi-text"><span' + (danger ? ' style="color:var(--nu-like)"' : '') + '>' + label + '</span></div>';
      d.addEventListener('click', fn); d.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fn(); });
      return d;
    };
    const logout = document.getElementById('settingsLogout');
    const items = [make('settingsExport', 'Descargar mis datos', download), make('settingsDelete', 'Eliminar cuenta', confirmDelete, true)];
    items.forEach((i) => (logout ? last.parentNode.insertBefore(i, logout) : last.parentNode.appendChild(i)));
  }
  setInterval(addItems, 1500);

  /* Modo conectado: se retiran las cuentas de ejemplo (las reales siempre llevan el id del servidor) */
  function purgeDemo() {
    Object.keys(usersData).forEach((k) => { if (k !== myUsername && !usersData[k].sid) delete usersData[k]; });
    if (window.SocialInv && window.SocialInv.refresh) window.SocialInv.refresh();
  }
  B.session().then((s) => { if (s) setTimeout(purgeDemo, 6000); });
  B.onAuth((event) => { if (event === 'SIGNED_IN') setTimeout(purgeDemo, 6000); });
})();
