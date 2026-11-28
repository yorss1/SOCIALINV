/* =====================================================
   HOME: ordenamiento y detalles (inspirado en la referencia)
   - Fila de VIBRAS sobre el feed: filtra los pulsos por su color dominante (misma clasificación que Aura)
   - Cada pulso recibe su propio acento (--row-accent) según su imagen
   - Botón central "+" luminoso en la barra inferior (abre Crear); el + del encabezado se oculta
   ===================================================== */
(function () {
  'use strict';
  const feed = document.getElementById('feedContainer');
  const nav = document.querySelector('.navbar');

  /* ---------- Acento por pulso ---------- */
  SvColor.rows(feed, '.post', '.post-grid img');

  /* ---------- Fila de vibras ---------- */
  const chips = document.createElement('div');
  chips.className = 'home-chips'; chips.id = 'homeChips';
  chips.innerHTML = AuraMood.MOODS.map((m, i) =>
    `<button type="button" class="aura-chip${i ? '' : ' on'}" data-mood="${m.id}" style="--c:${m.c}"><i></i>${m.label}</button>`).join('');
  // Las vibras (Cálido, Frío…) ya no se muestran en el Home: viven en Descubrir. El nodo queda sin insertar.
  let mood = 'all', token = 0;
  async function applyMood() {
    const t = ++token;
    for (const post of feed.querySelectorAll('.post')) {
      if (mood === 'all') { post.classList.remove('post-hidden-by-mood'); const e = feed.querySelector('.home-empty-mood'); if (e) e.remove(); continue; }
      const img = post.querySelector('.post-grid img');
      let ok = false;
      if (img && img.getAttribute('src')) { const r = await AuraMood.analyze(img.getAttribute('src')); ok = r.mood === mood; }
      if (t !== token) return;
      post.classList.toggle('post-hidden-by-mood', !ok);
    }
    if (t !== token) return;
    // aviso cuando ningún pulso coincide con la vibra elegida
    let empty = feed.querySelector('.home-empty-mood');
    const any = [...feed.querySelectorAll('.post')].some((p) => !p.classList.contains('post-hidden-by-mood') && !p.classList.contains('post-hidden-by-user'));
    if (mood !== 'all' && !any) {
      if (!empty) { empty = document.createElement('div'); empty.className = 'home-empty-mood'; feed.appendChild(empty); }
      empty.textContent = 'Ningún pulso con esta vibra por ahora';
    } else if (empty) empty.remove();
  }
  chips.addEventListener('click', (e) => {
    const c = e.target.closest('.aura-chip'); if (!c) return;
    mood = c.dataset.mood;
    chips.querySelectorAll('.aura-chip').forEach((x) => x.classList.toggle('on', x === c));
    applyMood();
  });
  // Los pulsos nuevos (publicados o restaurados) también respetan la vibra activa
  new MutationObserver((m) => { if (mood !== 'all' && m.some((x) => x.addedNodes.length)) applyMood(); }).observe(feed, { childList: true });

  /* El botón central + ahora vive en el dock (index.html, #navCreate) */
  document.getElementById('navCreate').addEventListener('click', () => openCreateSheet());
})();
