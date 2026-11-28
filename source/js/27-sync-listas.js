/* =====================================================
   27 — Listas de seguidores y seguidos con Supabase (Fase 2)
   · «Seguidores» y «Seguidos» de cualquier perfil se descargan del servidor al abrirlas.
   · Respetan la privacidad del servidor (cuenta privada, listas ocultas).
   ===================================================== */
(function () {
  'use strict';
  const B = window.SvBackend, U = window.SvSync;
  if (!B || !B.enabled) return;

  const cache = {};   // 'usuario|tipo' -> [{username, name, avatar}]
  const key = (u, t) => u + '|' + t;
  const shape = (rows) => rows.filter((r) => r.who).map((r) => {
    U.ensureUser(r.who);
    return { username: r.who.username, name: r.who.display_name || r.who.username, avatar: r.who.avatar_url || 'source/imgs/user-default.png' };
  });

  window.getFollowersList = (u) => cache[key(u, 'followers')] || [];
  window.getFollowingList = (u) => cache[key(u, 'following')] || [];

  const _open = window.openFollowList;
  window.openFollowList = function (username, type) {
    const r = _open.apply(this, arguments);
    (async () => {
      try {
        const id = (usersData[username] && usersData[username].sid) || (await B.profile(username) || {}).id;
        if (!id) return;
        const rows = type === 'followers' ? await B.followersOf(id) : await B.followingOf(id);
        cache[key(username, type)] = shape(rows);
        const modal = document.getElementById('followListModal');
        if (modal && modal.classList.contains('open') && document.getElementById('flTitle').textContent === (type === 'followers' ? 'Seguidores' : 'Seguidos')) _open.call(window, username, type);
        U.clearToast();
      } catch (err) { U.toast(err.message); }
    })();
    return r;
  };
})();
