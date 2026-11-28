/* =====================================================
   17 — Capa neutra (se carga la ÚLTIMA)
   · Tarjeta de pulso con el orden de Instagram: cabecera → medio → acciones → texto
   · Carrusel con contador y puntos cuando hay varias fotos
   · Estados vacíos sin mascota ni texto técnico
   · Perfil: vuelve arriba al abrir otra persona
   · Tipo de tema (sólido / interactivo) disponible para CSS
   ===================================================== */
(function () {
  'use strict';
  const root = document.documentElement;
  const esc = (v) => (typeof escapeHtml === 'function' ? escapeHtml(String(v == null ? '' : v)) : String(v));

  /* ---------- Tipo de tema para CSS: sólido = negro/blanco puros ---------- */
  function syncType() { root.dataset.svType = (typeof appTheme !== 'undefined' && appTheme.type) || 'interactive'; }
  syncType();
  if (typeof window.setAppTheme === 'function') {
    const _set = window.setAppTheme;
    window.setAppTheme = function () { const r = _set.apply(this, arguments); syncType(); return r; };
  }

  /* ---------- Tarjeta de pulso ---------- */
  const TIME_RE = /^(hace|ayer|ahora|\d+\s?(m|h|d|min|s)\b)/i;
  const ICON_PLUS_CARET = '';

  function countOf(post, k) {
    const s = post.querySelector('.' + k + '-count');
    const n = s ? parseInt(String(s.dataset.count != null ? s.dataset.count : s.textContent).replace(/\D/g, ''), 10) : 0;
    return isNaN(n) ? 0 : n;
  }

  function restructure(post) {
    if (post.dataset.nu) return;
    const acts = post.querySelector('.post-actions');
    if (!acts) return;           // pulsos de ejemplo de solo lectura (sin acciones)
    post.dataset.nu = '1';

    // Contadores dentro de su botón y fuera la fila de estadísticas duplicada
    ['like', 'comment', 'share'].forEach((k) => {
      const span = post.querySelector('.' + k + '-count');
      const act = post.querySelector('.post-action.' + k);
      if (span && act && !act.contains(span)) act.appendChild(span);
    });
    const row = post.querySelector('.post-stats-row'); if (row) row.remove();

    // Cabecera: usuario y, debajo, solo el lugar (la hora pasa al pie)
    const meta = post.querySelector('.post-meta');
    let when = '';
    if (meta) {
      const parts = meta.textContent.split('·').map((s) => s.trim()).filter(Boolean);
      when = parts.filter((p) => TIME_RE.test(p)).join(' ');
      const place = parts.filter((p) => !TIME_RE.test(p)).join(', ');
      if (place) meta.textContent = place; else meta.hidden = true;
    }
    let time = post.querySelector('.post-time');
    if (!time) { time = document.createElement('div'); time.className = 'post-time'; time.textContent = when; post.appendChild(time); }

    // Medio: envuelto para poder colocar el contador y los puntos
    const grid = post.querySelector('.post-grid');
    if (grid) {
      const wrap = document.createElement('div');
      wrap.className = 'nu-media';
      grid.parentNode.insertBefore(wrap, grid);
      wrap.appendChild(grid);
      const items = grid.querySelectorAll('.grid-item');
      if (items.length > 1) {
        const badge = document.createElement('span');
        badge.className = 'nu-count'; badge.textContent = '1/' + items.length;
        wrap.appendChild(badge);
        const dots = document.createElement('div');
        dots.className = 'nu-dots';
        dots.innerHTML = Array.prototype.map.call(items, (_, i) => '<i' + (i ? '' : ' class="on"') + '></i>').join('');
        wrap.parentNode.insertBefore(dots, wrap.nextSibling);
        // el contador y los puntos pasan DESPUÉS de las acciones si es necesario: aquí quedan entre medio y acciones
        let tick = 0;
        grid.addEventListener('scroll', () => {
          cancelAnimationFrame(tick);
          tick = requestAnimationFrame(() => {
            const i = Math.round(grid.scrollLeft / Math.max(1, grid.clientWidth));
            badge.textContent = (i + 1) + '/' + items.length;
            dots.querySelectorAll('i').forEach((d, j) => d.classList.toggle('on', j === i));
          });
        }, { passive: true });
      }
    } else {
      post.classList.add('nu-text');
    }

    // "Ver comentarios" / "Añadir un comentario" debajo del texto
    const link = document.createElement('button');
    link.type = 'button'; link.className = 'nu-comments-link';
    const sync = () => {
      const n = countOf(post, 'comment');
      link.textContent = n === 0 ? 'Añadir un comentario' : n === 1 ? 'Ver 1 comentario' : 'Ver los ' + n + ' comentarios';
      link.classList.toggle('empty', n === 0);
    };
    sync();
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      const b = post.querySelector('.post-action.comment'); if (b) b.click();
    });
    const cap = post.querySelector('.post-caption');
    (cap || acts).insertAdjacentElement('afterend', link);
    const cc = post.querySelector('.comment-count');
    if (cc) new MutationObserver(sync).observe(cc, { childList: true, characterData: true, subtree: true, attributes: true });

    // El pie (hora) siempre al final
    post.appendChild(time);
  }

  function upgradeAll() { document.querySelectorAll('.post').forEach(restructure); }
  upgradeAll();
  new MutationObserver(() => requestAnimationFrame(upgradeAll)).observe(document.body, { childList: true, subtree: true });

  /* ---------- Estados vacíos: icono lineal y una frase (sin mascota ni texto técnico) ---------- */
  const EMPTY = {
    info: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    posts: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="m21 15-5-5L5 21"/>',
    shared: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>'
  };
  window.pfEmptyStateHTML = function (title) {
    const k = /informaci/i.test(title) ? 'info' : /pulso/i.test(title) ? 'posts' : 'shared';
    return '<div class="pf-empty-msg"><svg class="pf-empty-ic" viewBox="0 0 24 24" aria-hidden="true">' + EMPTY[k] + '</svg><p class="pf-empty-title">' + esc(title) + '</p></div>';
  };

  /* ---------- Perfil: al abrir a otra persona, empieza arriba (antes heredaba el scroll anterior) ---------- */
  if (typeof window.openProfile === 'function') {
    const _open = window.openProfile;
    window.openProfile = function (username) {
      const panel = document.getElementById('profilePanel');
      const same = panel && panel.classList.contains('open') && typeof pfCurrentUsername !== 'undefined' && pfCurrentUsername === username;
      const r = _open.apply(this, arguments);
      if (panel && !same) { panel.scrollTop = 0; }
      return r;
    };
  }

  /* ---------- Escape cierra la capa superior (accesibilidad) ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const a = document.activeElement;
    if (a && a.blur && /^(INPUT|TEXTAREA)$/.test(a.tagName)) { a.blur(); return; }
    if (typeof closeTopNavView === 'function') closeTopNavView();
  });
})();

/* =====================================================
   Color heredado de la portada (solo con tema interactivo)
   · Toda la red usa el color predominante de LA PORTADA propia
   · Excepción: el Home, que usa la imagen visible del feed (o sólido si no hay imagen)
   ===================================================== */
(function () {
  'use strict';
  if (typeof SvColor === 'undefined') return;
  const FORCE = ['#createSheet', '#notifSheet', '#followListModal'];
  let lastCover = null;

  function paintOverlays() {
    const p = SvColor.coverPalette(); if (!p) return;
    FORCE.forEach((sel) => { const el = document.querySelector(sel); if (el) SvColor.apply(el, p, true); });
  }

  function loadCover() {
    let src = null;
    try { src = usersData[myUsername] && usersData[myUsername].cover; } catch (e) {}
    if (!src || src === lastCover) return;
    lastCover = src;
    if (/\.(mp4|webm)(\?|$)/i.test(src)) return;
    SvColor.fromSrc(src).then((rgb) => {
      if (!rgb || src !== lastCover) return;
      SvColor.setCover(SvColor.palette(rgb));
      paintOverlays();
    });
  }
  loadCover();
  setInterval(loadCover, 1000);          // detecta cuando cambias tu portada
  setInterval(paintOverlays, 2500);      // overlays creados más tarde

  // Al cambiar de vista principal, la raíz alterna entre color del feed y color de portada
  if (typeof window.showMainView === 'function') {
    const _show = window.showMainView;
    window.showMainView = function () { const r = _show.apply(this, arguments); SvColor.refresh(); return r; };
  }
  SvColor.refresh();
})();


/* Barra del navegador (theme-color): solo negro o blanco según el modo de la app */
(function () {
  'use strict';
  const meta = document.getElementById('metaThemeColor');
  if (!meta) return;
  const orig = meta.setAttribute.bind(meta);
  const flat = () => ((typeof appTheme !== 'undefined' && appTheme.mode === 'dark') ? '#000000' : '#ffffff');
  meta.setAttribute = function (k, v) { return orig(k, k === 'content' ? flat() : v); };
  const sync = () => orig('content', flat());
  sync();
  if (typeof window.setAppTheme === 'function') {
    const _set = window.setAppTheme;
    window.setAppTheme = function () { const r = _set.apply(this, arguments); sync(); return r; };
  }
  setInterval(sync, 1500);
})();


/* =====================================================
   Perfil: portada con desenfoque progresivo, @usuario, etiquetas de intereses
   y botones secundarios en forma de icono
   ===================================================== */
(function () {
  'use strict';
  const esc = (v) => (typeof escapeHtml === 'function' ? escapeHtml(String(v)) : String(v));

  // Copia desenfocada de la portada (se funde hacia el fondo con una máscara)
  const cover = document.getElementById('pfPortada');
  if (cover && cover.parentNode) {
    const blur = document.createElement('img');
    blur.className = 'pf-cover-blur'; blur.alt = ''; blur.setAttribute('aria-hidden', 'true');
    cover.parentNode.insertBefore(blur, cover.parentNode.querySelector('.pf-fade-bottom'));
    const sync = () => { if (blur.getAttribute('src') !== cover.getAttribute('src')) blur.src = cover.getAttribute('src') || ''; };
    sync();
    new MutationObserver(sync).observe(cover, { attributes: true, attributeFilter: ['src'] });
  }

  const LABELS = [['pfShareProfileBtn', 'Compartir perfil'], ['pfMessageBtn', 'Enviar mensaje'], ['pfCardBtn', 'Tarjeta de perfil']];
  function labelButtons() {
    LABELS.forEach(([id, l]) => { const b = document.getElementById(id); if (b && b.title !== l) { b.setAttribute('aria-label', l); b.title = l; } });
  }
  const actions = document.getElementById('pfActions');
  if (actions) new MutationObserver(labelButtons).observe(actions, { childList: true });

  function decorate(username) {
    const u = (typeof usersData !== 'undefined') ? usersData[username] : null;
    const name = document.getElementById('pfDisplayName');
    if (!u || !name) return;
    name.parentNode.querySelectorAll('.pf-handle, .pf-tags').forEach((e) => e.remove());
    const h = document.createElement('div');
    h.className = 'pf-handle'; h.textContent = '@' + username;
    name.insertAdjacentElement('afterend', h);
    const it = (u.info || []).find((i) => /inter/i.test(i.label));
    if (it) {
      const tags = String(it.value).split(/,|\sy\s/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
      if (tags.length) {
        const d = document.createElement('div');
        d.className = 'pf-tags';
        d.innerHTML = tags.map((x) => '<span>#' + esc(x.replace(/\s+/g, '')) + '</span>').join('');
        h.insertAdjacentElement('afterend', d);
      }
    }
    labelButtons();
  }
  if (typeof window.openProfile === 'function') {
    const _open = window.openProfile;
    window.openProfile = function (username) { const r = _open.apply(this, arguments); try { decorate(username); } catch (e) {} return r; };
  }
})();
