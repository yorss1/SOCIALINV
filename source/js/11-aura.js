/* =====================================================
   AURA: explorar pulsos por la vibra cromática de su color dominante.
   Todo local: ColorThief-lite + caché en localStorage (por URL de imagen).
   ===================================================== */
(function () {
  'use strict';
  const MOODS = [
    { id: 'all', label: 'Todo', c: '#888' },
    { id: 'calido', label: 'Cálido', c: '#ff7a3d' },
    { id: 'frio', label: 'Frío', c: '#3da5ff' },
    { id: 'noche', label: 'Noche', c: '#2b2f6b' },
    { id: 'vivido', label: 'Vívido', c: '#e11d8f' },
    { id: 'suave', label: 'Suave', c: '#f3cfe0' },
    { id: 'mono', label: 'Mono', c: '#555' }
  ];
  const CK = 'socialinv_aura_v1';
  let cache = {}; try { cache = JSON.parse(localStorage.getItem(CK) || '{}'); } catch (e) { cache = {}; }
  const saveCache = () => { try { localStorage.setItem(CK, JSON.stringify(cache)); } catch (e) {} };
  const thief = new ColorThief();

  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = ((h * 60) + 360) % 360 / 360;
    }
    return [h, s, l];
  }
  function classify([h, s, l]) {
    if (s < .12) return 'mono';
    if (l < .3) return 'noche';
    if (l > .72) return 'suave';
    if (h < .12 || h > .92) return 'calido';
    if (h > .45 && h < .75) return 'frio';
    return s > .65 ? 'vivido' : (h < .3 ? 'calido' : 'frio');
  }
  function analyze(url) {
    if (cache[url]) return Promise.resolve(cache[url]);
    return new Promise((resolve) => {
      const img = new Image(); img.decoding = 'async';
      img.onload = () => {
        try {
          const [r, g, b] = thief.getColor(img), hsl = rgb2hsl(r, g, b);
          cache[url] = { rgb: [r, g, b], mood: classify(hsl) };
        } catch (e) { cache[url] = { rgb: [90, 90, 90], mood: 'mono' }; }
        resolve(cache[url]);
      };
      img.onerror = () => resolve({ rgb: [90, 90, 90], mood: 'mono' });
      img.src = url;
    });
  }
  function collect() {
    const out = [];
    Object.values(usersData).forEach((u) => {
      if (window.SocialInv && (SocialInv.isBlocked(u.username) || SocialInv.isMuted(u.username) || !SocialInv.canSee(u.username))) return;
      u.posts.forEach((p, idx) => {
        const url = typeof p === 'string' ? p : (p && p.type !== 'text' && (p.src || p.url || p.image || (p.media && (p.media[0].url || p.media[0])))) || null;
        if (typeof url === 'string') out.push({ url, user: u.username, idx });
      });
    });
    return out;
  }

  window.AuraMood = { MOODS, analyze }; // lo reutiliza el filtro de vibras del Home (15-home.js)

  const tab = document.getElementById('auraTab'), panel = document.getElementById('auraPanel');
  const chips = document.getElementById('auraChips'), grid = document.getElementById('auraGrid');
  const results = document.getElementById('searchResults'), reels = document.getElementById('searchReelsGrid');
  let items = [], mood = 'all';

  function drawChips() {
    chips.innerHTML = MOODS.map((m) => {
      const n = m.id === 'all' ? items.length : items.filter((i) => i.mood === m.id).length;
      return `<button type="button" class="aura-chip${m.id === mood ? ' on' : ''}" data-mood="${m.id}" style="--c:${m.c}"><i></i>${m.label} <small>${n}</small></button>`;
    }).join('');
  }
  function drawGrid() {
    const list = items.filter((i) => mood === 'all' || i.mood === mood);
    grid.innerHTML = list.length ? list.map((i, k) => `
      <div class="aura-tile" data-user="${escapeHtml(i.user)}" data-idx="${i.idx}" style="--tile:rgb(${i.rgb});--ar:${[4/5, 1, 3/4, 5/6][k % 4]};animation-delay:${Math.min(k, 8) * 40}ms">
        <img src="${escapeHtml(i.url)}" alt="" loading="lazy" decoding="async"><span>@${escapeHtml(i.user)}</span>
      </div>`).join('') : '<div class="aura-empty">Todavía no hay pulsos con esta vibra</div>';
  }
  async function refresh() {
    const base = collect();
    items = await Promise.all(base.map(async (b) => ({ ...b, ...(await analyze(b.url)) })));
    saveCache(); drawChips(); drawGrid();
  }
  function showAura() {
    document.querySelectorAll('.search-tab').forEach((t) => t.classList.toggle('active', t === tab));
    results.style.display = 'none'; reels.style.display = 'none'; panel.hidden = false;
    refresh();
  }
  function hideAura() { panel.hidden = true; }
  tab.addEventListener('click', showAura);
  document.querySelectorAll('.search-tab[data-search-tab]').forEach((t) => t.addEventListener('click', hideAura));
  document.getElementById('searchBackBtn').addEventListener('click', hideAura);
  chips.addEventListener('click', (e) => {
    const c = e.target.closest('.aura-chip'); if (!c) return;
    mood = c.dataset.mood; drawChips(); drawGrid();
  });
  grid.addEventListener('click', (e) => {
    const t = e.target.closest('.aura-tile'); if (t) openProfileFeed(t.dataset.user, +t.dataset.idx);
  });
  // Al escribir en el buscador se vuelve a la lista de personas
  document.getElementById('searchInput').addEventListener('input', () => {
    if (!panel.hidden) { hideAura(); document.querySelectorAll('.search-tab').forEach((t, i) => t.classList.toggle('active', i === 0)); }
  });

  /* ---------- Carga de imágenes: lazy + esqueleto + fade ---------- */
  function prep(img) {
    if (img.dataset.svPrep || img.closest('.story-viewer, .reel-item')) return;
    img.dataset.svPrep = '1';
    if (!img.hasAttribute('decoding')) img.decoding = 'async';
    if (!img.getAttribute('src') || (img.complete && img.naturalWidth)) return; // sin src no hay carga que esperar (evita shimmer infinito)
    img.classList.add('sv-loading', 'sv-fade');
    const done = () => { img.classList.remove('sv-loading'); img.classList.add('sv-in'); };
    img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true });
  }
  document.querySelectorAll('img').forEach(prep);
  new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => {
    if (n.nodeType !== 1) return;
    if (n.tagName === 'IMG') prep(n); else n.querySelectorAll && n.querySelectorAll('img').forEach(prep);
  }))).observe(document.body, { childList: true, subtree: true });
})();
