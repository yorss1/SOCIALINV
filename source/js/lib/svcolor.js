/* SvColor: motor de color adaptativo COMPARTIDO por toda la app.
   Toma el color dominante de una imagen (ColorThief local) y deriva una paleta coherente
   en variables CSS (--sv-h, --sv-s, --sv-accent, --sv-tint, --sv-tint-2, --sv-ink, --sv-deep, --sv-on-accent).
   - Raíz (:root): sigue el color del Home/feed, así Buscar, Aura, Ajustes, Mensajes y hojas heredan la misma vibra.
   - Contextos: SvColor.tint(elemento, imagen) recolorea una hoja concreta (comentarios, compartir…) con su propio contenido. */
(function (global) {
  'use strict';
  var thief = new ColorThief(), cache = new Map(), root = document.documentElement;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rgbToHs(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  function palette(rgb) {
    var c = rgbToHs(rgb[0], rgb[1], rgb[2]);
    // Neutro: el color extraído solo deja un susurro de tono (máx. 12 % de saturación).
    // Los botones y detalles NO usan el tono: usan la tinta (casi negro) o el papel (casi blanco).
    var s = Math.min(c.s, 12);
    return {
      h: c.h, s: s, sat: c.s < 8 ? 0 : Math.max(30, Math.min(c.s, 75)),
      accent: 'hsl(' + c.h + ',' + Math.round(s * .5) + '%,14%)',
      tint: 'hsl(' + c.h + ',' + Math.round(s * .6) + '%,97%)',
      tint2: 'hsl(' + c.h + ',' + Math.round(s * .7) + '%,93%)',
      ink: 'hsl(' + c.h + ',' + Math.round(s * .4) + '%,9%)',
      deep: 'hsl(' + c.h + ',' + Math.round(s * .5) + '%,12%)',
      glow: 'hsl(' + c.h + ',' + Math.round(s * .8) + '%,46%)',
      glow2: 'hsl(' + c.h + ',' + Math.round(s * .6) + '%,38%)',
      pill: 'hsl(' + c.h + ',' + (c.s < 8 ? Math.round(c.s) : Math.max(38, Math.min(c.s, 70))) + '%,48%)',   // tono real, solo para las pastillas (~20 %)
      onAccent: '#fff'
    };
  }
  // Solo la raíz (y lo que fuerce la portada o una vibra de Aura) se tiñe: el resto hereda el color de la portada
  function apply(el, p, force) {
    if (el !== root && !force && !(el.dataset && el.dataset.svLock)) return;
    var st = el.style;
    st.setProperty('--sv-sat', p.sat);
    st.setProperty('--sv-h', p.h); st.setProperty('--sv-s', p.s + '%');
    st.setProperty('--sv-accent', p.accent); st.setProperty('--sv-tint', p.tint); st.setProperty('--sv-tint-2', p.tint2);
    st.setProperty('--sv-ink', p.ink); st.setProperty('--sv-deep', p.deep); st.setProperty('--sv-on-accent', p.onAccent);
    st.setProperty('--sv-pill', p.pill); st.setProperty('--sv-glow', p.glow); st.setProperty('--sv-glow2', p.glow2);
  }
  function fromSrc(src) {
    if (cache.has(src)) return Promise.resolve(cache.get(src));
    return new Promise(function (res) {
      var i = new Image(); i.decoding = 'async';
      if (/^https?:/.test(src) && src.indexOf(location.origin) !== 0) i.crossOrigin = 'anonymous';
      i.onload = function () { var rgb = null; try { rgb = thief.getColor(i); } catch (e) {} cache.set(src, rgb); res(rgb); };
      i.onerror = function () { res(null); };
      i.src = src;
    });
  }
  function fromElement(el) { try { return thief.getColor(el); } catch (e) { return null; } }
  /** Recolorea `el` con el color de una imagen (URL o elemento img). Devuelve la paleta o null. */
  function tint(el, source) {
    var p = typeof source === 'string' ? fromSrc(source) : Promise.resolve(fromElement(source));
    return p.then(function (rgb) { if (!rgb) return null; var pal = palette(rgb); apply(el, pal); return pal; });
  }
  function reset(el) { ['--sv-h', '--sv-s', '--sv-accent', '--sv-tint', '--sv-tint-2', '--sv-ink', '--sv-deep', '--sv-on-accent', '--sv-glow', '--sv-glow2', '--sv-pill', '--sv-sat'].forEach(function (k) { el.style.removeProperty(k); }); }

  // --- La raíz sigue el color del Home (lo calcula 09 en --home-bg) ---
  var homePal = null, coverPal = null;
  function inHome() { try { return typeof global.getCurrentMainView !== 'function' || global.getCurrentMainView() === 'home'; } catch (e) { return true; } }
  /** Home: color de la imagen visible del feed (o neutro si no hay). Resto de la app: color de la portada propia. */
  function refresh() {
    if (!homePal) homePal = palette([150, 150, 150]);
    var home = inHome();
    root.dataset.svScope = home ? 'home' : 'cover';
    apply(root, (home || !coverPal) ? homePal : coverPal, true);
  }
  function setCover(p) { coverPal = p; refresh(); }
  var last = '';
  function parseRgb(v) { var m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(v); return m ? [+m[1], +m[2], +m[3]] : null; }
  function syncRoot() {
    var cs = getComputedStyle(root), a = cs.getPropertyValue('--home-theme').trim(), b = cs.getPropertyValue('--home-bg').trim();
    if (a + b === last) return; last = a + b;
    var ra = parseRgb(a), rb = parseRgb(b), pick = [150, 150, 150];
    if (ra && rb) pick = rgbToHs(ra[0], ra[1], ra[2]).s >= rgbToHs(rb[0], rb[1], rb[2]).s ? ra : rb; else pick = ra || rb || pick;
    homePal = palette(pick); refresh();
  }
  new MutationObserver(syncRoot).observe(root, { attributes: true, attributeFilter: ['style'] });
  syncRoot();

  /** Paleta a partir de un tono/saturación (p. ej. el color de una vibra de Aura). */
  function fromHue(h, sat) { var c = hsl2rgb(h, sat / 100, .5); return palette(c); }
  function hsl2rgb(h, s, l) {
    var a = s * Math.min(l, 1 - l), f = function (n) { var k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return [f(0), f(8), f(4)];
  }
  function mostSaturated(rgbs) {
    var pals = rgbs.filter(Boolean).map(palette); if (!pals.length) return null;
    pals.sort(function (x, y) { return y.s - x.s; }); return pals;
  }
  /** Observa un contenedor y tiñe `target` con el color más vivo de sus primeras `n` imágenes. */
  function watch(container, opts) {
    var target = opts.target || container, sel = opts.img, n = opts.n || 3, timer = null;
    function run() {
      if (target.dataset.svLock) return; // una vibra elegida a mano manda sobre el color automático
      // solo imágenes VISIBLES (las de pestañas ocultas no cuentan)
      var imgs = [].slice.call(container.querySelectorAll(sel)).filter(function (i) { return i.getAttribute('src') && i.getClientRects().length; }).slice(0, n);
      if (!imgs.length) return;
      Promise.all(imgs.map(function (i) { return fromSrc(i.currentSrc || i.src); })).then(function (list) {
        var pals = mostSaturated(list); if (!pals) return;
        apply(target, pals[0]);
        if (pals[1]) target.style.setProperty('--sv-glow2', pals[1].glow);
      });
    }
    new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(run, 120); })
      .observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    run(); return run;
  }
  /** Cada fila (chat, resultado, notificación…) recibe su propio acento (--row-accent) según su avatar. */
  function rows(container, rowSel, imgSel) {
    function run() {
      container.querySelectorAll(rowSel).forEach(function (row) {
        if (row.dataset.svRow) return;
        var img = row.querySelector(imgSel || 'img'); if (!img || !img.getAttribute('src')) return;
        row.dataset.svRow = '1';
        fromSrc(img.currentSrc || img.src).then(function (rgb) {
          if (!rgb) return; var p = palette(rgb);
          row.style.setProperty('--row-accent', p.glow); row.style.setProperty('--row-h', p.h);
          row.style.setProperty('--row-soft', 'hsla(' + p.h + ',' + p.s + '%,50%,.07)');
        });
      });
    }
    new MutationObserver(function () { setTimeout(run, 30); }).observe(container, { childList: true, subtree: true });
    run();
  }

  global.SvColor = { refresh: refresh, setCover: setCover, coverPalette: function () { return coverPal; }, tint: tint, reset: reset, palette: palette, fromSrc: fromSrc, apply: apply, fromHue: fromHue, watch: watch, rows: rows };
})(window);
