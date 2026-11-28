/* =====================================================
   EXTRAS: tarjeta de perfil descargable (PNG) y autocompletado de @menciones.
   Todo en cliente, sin librerías: el PNG se dibuja con Canvas 2D.
   ===================================================== */
(function () {
  'use strict';

  /* ---------- Tarjeta de perfil ---------- */
  function loadImg(src) {
    return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  }
  function wrap(ctx, text, x, y, maxW, lh, maxLines) {
    const words = String(text).split(/\s+/); let line = '', n = 0;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) {
        ctx.fillText(line, x, y); y += lh; line = w;
        if (++n >= maxLines - 1) break;
      } else line = t;
    }
    ctx.fillText(line, x, y);
  }
  async function buildCard(username) {
    const u = usersData[username]; if (!u) return null;
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'), av = await loadImg(u.avatar), cov = await loadImg(u.cover);
    let rgb = [60, 60, 90];
    try { if (av) rgb = new ColorThief().getColor(av); } catch (e) {}
    const [r, g, b] = rgb, lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255, fg = lum > .6 ? '#111' : '#fff';
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, `rgb(${r},${g},${b})`); grad.addColorStop(1, `rgb(${r * .35 | 0},${g * .35 | 0},${b * .45 | 0})`);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    if (cov) { ctx.globalAlpha = .35; ctx.drawImage(cov, 0, 0, W, 460 * (cov.width ? 1 : 1)); ctx.globalAlpha = 1; }
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.roundRect(60, 330, W - 120, 900, 56); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, 330, 150, 0, Math.PI * 2); ctx.clip();
    if (av) ctx.drawImage(av, W / 2 - 150, 180, 300, 300); else { ctx.fillStyle = '#555'; ctx.fillRect(W / 2 - 150, 180, 300, 300); }
    ctx.restore(); ctx.lineWidth = 10; ctx.strokeStyle = fg; ctx.beginPath(); ctx.arc(W / 2, 330, 150, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = fg; ctx.textAlign = 'center';
    ctx.font = '700 68px system-ui, sans-serif'; ctx.fillText(u.name, W / 2, 580);
    ctx.globalAlpha = .75; ctx.font = '500 40px system-ui, sans-serif'; ctx.fillText('@' + u.username, W / 2, 640);
    ctx.font = '400 44px system-ui, sans-serif'; wrap(ctx, u.bio || '', W / 2, 740, W - 260, 62, 3); ctx.globalAlpha = 1;
    const stats = [['Pulsos', u.posts.length || u.stats.posts], ['Seguidores', u.stats.followers], ['Seguidos', u.stats.following]];
    stats.forEach(([k, v], i) => {
      const x = 240 + i * 300; ctx.font = '700 64px system-ui, sans-serif'; ctx.fillText(String(v), x, 1010);
      ctx.globalAlpha = .7; ctx.font = '500 30px system-ui, sans-serif'; ctx.fillText(k, x, 1060); ctx.globalAlpha = 1;
    });
    ctx.font = '700 44px system-ui, sans-serif'; ctx.globalAlpha = .9; ctx.fillText('socialinv', W / 2, 1170); ctx.globalAlpha = 1;
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }
  async function shareCard(username, btn) {
    const label = btn.textContent; btn.textContent = 'Generando…'; btn.disabled = true;
    try {
      const blob = await buildCard(username); if (!blob) throw new Error('sin datos');
      const file = new File([blob], `socialinv-${username}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'socialinv' }); }
      else {
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000); showAppToast('Tarjeta guardada');
      }
    } catch (e) { if (e.name !== 'AbortError') showAppToast('No se pudo crear la tarjeta'); }
    btn.textContent = label; btn.disabled = false;
  }
  const actions = document.getElementById('pfActions');
  function addCardBtn() {
    if (!actions || actions.querySelector('#pfCardBtn')) return;
    const b = document.createElement('button');
    b.className = 'pf-btn pf-btn-outline'; b.id = 'pfCardBtn'; b.type = 'button'; b.textContent = 'Tarjeta';
    b.addEventListener('click', () => shareCard(pfCurrentUsername, b));
    actions.appendChild(b);
  }
  if (actions) { new MutationObserver(addCardBtn).observe(actions, { childList: true }); addCardBtn(); }

  /* ---------- Autocompletado de @menciones en comentarios ---------- */
  const input = document.getElementById('cdInput');
  const box = document.createElement('div');
  box.className = 'sv-mention-box'; box.hidden = true; box.setAttribute('role', 'listbox');
  input.closest('.cd-input-area').appendChild(box);
  let range = null;
  function update() {
    const pos = input.selectionStart, m = /(^|\s)@([\p{L}\p{N}_.]{0,30})$/u.exec(input.value.slice(0, pos));
    if (!m) { box.hidden = true; range = null; return; }
    const q = m[2].toLowerCase();
    const list = Object.values(usersData).filter((u) => (u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)) &&
      !(window.SocialInv && SocialInv.isBlocked(u.username))).slice(0, 5);
    if (!list.length) { box.hidden = true; return; }
    range = [pos - m[2].length - 1, pos];
    box.innerHTML = list.map((u) => `<div class="sv-mention-opt" role="option" data-u="${escapeHtml(u.username)}"><img src="${escapeHtml(u.avatar)}" alt=""><b>@${escapeHtml(u.username)}</b><span>${escapeHtml(u.name)}</span></div>`).join('');
    box.hidden = false;
  }
  input.addEventListener('input', update);
  input.addEventListener('click', update);
  input.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 150));
  box.addEventListener('pointerdown', (e) => {
    const o = e.target.closest('.sv-mention-opt'); if (!o || !range) return;
    e.preventDefault();
    const ins = '@' + o.dataset.u + ' ';
    input.value = input.value.slice(0, range[0]) + ins + input.value.slice(range[1]);
    const p = range[0] + ins.length; input.setSelectionRange(p, p); box.hidden = true; input.focus();
  });
})();
