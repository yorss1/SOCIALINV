/* Utilidades compartidas por los módulos de sincronización (19–25) */
if (window.SvBackend && window.SvBackend.enabled) document.documentElement.classList.add('sv-connected');
window.SvSync = (function () {
  'use strict';
  let last = '';
  return {
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    rel: function (iso) {
      const s = (Date.now() - new Date(iso).getTime()) / 1000;
      if (s < 60) return 'Ahora';
      if (s < 3600) return 'Hace ' + Math.floor(s / 60) + ' m';
      if (s < 86400) return 'Hace ' + Math.floor(s / 3600) + ' h';
      if (s < 604800) return 'Hace ' + Math.floor(s / 86400) + ' d';
      return 'Hace ' + Math.floor(s / 604800) + ' sem';
    },
    toast: function (t) { if (t !== last && typeof showAppToast === 'function') showAppToast(t); last = t; },
    clearToast: function () { last = ''; },
    ensureUser: function (a) { if (typeof window.svEnsureUser === 'function') window.svEnsureUser(a); },
    file: async function (src, name) { const b = await (await fetch(src)).blob(); return new File([b], name, { type: b.type || 'image/jpeg' }); }
  };
})();
