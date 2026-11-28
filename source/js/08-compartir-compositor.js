/* Formato m:ss global (el de 07 vive dentro de su IIFE y no es visible aquí; el timeline de Reels lo necesita) */
function formatDuration(t){t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');}
/* ===================================================== */
/* SHEET DE COMPARTIR (link + apps + contactos)             */
/* ===================================================== */
const shareSheetOverlay = document.getElementById('shareSheetOverlay');
const shareSheet = document.getElementById('shareSheet');
const shareLinkPreview = document.getElementById('shareLinkPreview');
const shareCopyLinkBtn = document.getElementById('shareCopyLinkBtn');
const shareAppsRow = document.getElementById('shareAppsRow');
const shareUsersList = document.getElementById('shareUsersList');

const SHARE_APPS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' },
  { id: 'mail', label: 'Correo', icon: '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2 7 12 14 22 7"/>' },
  { id: 'sms', label: 'Mensaje', icon: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' },
  { id: 'more', label: 'Más', icon: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>' }
];

let activeShareContext = null; // { kind: 'post'|'reel', id, cover, label }

function buildShareContext(btn) {
  const postId = btn.dataset.postShare;
  const reelId = btn.dataset.reelShare;
  if (postId) {
    const postEl = document.querySelector(`[data-post-id="${postId}"]`);
    const img = postEl ? postEl.querySelector('.post-grid img, .post-media img, .grid-item img') : null;
    const caption = postEl ? postEl.querySelector('.post-caption') : null;
    return {
      kind: 'post', id: postId,
      cover: img ? img.src : '',
      mediaKind: 'image',
      label: caption ? caption.textContent.trim().slice(0, 60) : 'Pulso'
    };
  }
  if (reelId) {
    const reelEl = document.querySelector(`[data-reel-id="${reelId}"]`);
    const media = reelEl ? reelEl.querySelector('img, video') : null;
    const desc = reelEl ? reelEl.querySelector('.desc') : null;
    return {
      kind: 'reel', id: reelId,
      cover: media ? media.src : '',
      mediaKind: media && media.tagName === 'VIDEO' ? 'video' : 'image',
      label: desc ? desc.textContent.trim().slice(0, 60) : 'Reel'
    };
  }
  return null;
}

function openShareSheet(btn) {
  const ctx = buildShareContext(btn);
  if (!ctx) return;
  openShareSheetCtx(ctx);
}

// Abre la hoja de compartir para cualquier contexto: pulso, reel o comentario.
function openShareSheetCtx(ctx) {
  activeShareContext = ctx;

  const link = `${location.origin}${location.pathname}#${ctx.kind}-${ctx.id}`;
  shareLinkPreview.textContent = link;

  // Copia el enlace automáticamente al abrir, como pediste
  if (ctx.kind !== 'comment' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).catch(() => {});
  }

  shareAppsRow.innerHTML = SHARE_APPS.map(app => `
    <div class="share-app-item" data-app="${app.id}">
      <div class="share-app-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${app.icon}</svg></div>
      <span>${app.label}</span>
    </div>`).join('');
  shareAppsRow.querySelectorAll('.share-app-item').forEach(el => {
    el.addEventListener('click', () => {
      el.querySelector('.share-app-icon').style.transform = 'scale(0.85)';
      setTimeout(() => { el.querySelector('.share-app-icon').style.transform = ''; }, 200);
    });
  });

  shareSearchInput.value = '';
  renderShareContacts(ctx, '');

  const shareSheetAlreadyOpen = shareSheet.classList.contains('open');
  shareSheetOverlay.classList.add('open');
  shareSheet.classList.add('open');
  if (!shareSheetAlreadyOpen) pushNavView(closeShareSheet);
}


// Lista de contactos para enviar: primero a quienes sigues, filtrable por búsqueda.
const shareSearchInput = document.getElementById('shareSearchInput');
function renderShareContacts(ctx, query) {
  const q = (query || '').trim().toLowerCase().replace(/^@/, '');
  let list = Object.keys(usersData).filter(u => u !== myUsername && !(window.SocialInv && SocialInv.isBlocked(u)));
  if (q) list = list.filter(u => u.toLowerCase().includes(q) || (usersData[u].name || '').toLowerCase().includes(q));
  list.sort((a, b) => (followingState.has(b) - followingState.has(a)) || a.localeCompare(b));
  shareUsersList.innerHTML = list.length ? list.map(u => `
    <div class="share-user-item" data-share-user="${escapeHtml(u)}">
      <img src="${escapeHtml(usersData[u].avatar)}" alt="">
      <span class="share-user-names"><b>${escapeHtml(usersData[u].name || u)}</b><small>@${escapeHtml(u)}${followingState.has(u) ? ' · Siguiendo' : ''}</small></span>
      <div class="share-send-pill">Enviar</div>
    </div>`).join('') : '<div class="share-empty">Nadie coincide con tu búsqueda</div>';
  shareUsersList.querySelectorAll('.share-user-item').forEach(item => {
    item.addEventListener('click', () => {
      const pill = item.querySelector('.share-send-pill');
      if (pill.classList.contains('sent')) return;
      const username = item.dataset.shareUser;
      const payload = ctx.kind === 'comment'
        ? { kind: 'comment', comment: ctx.comment, cover: ctx.cover, label: ctx.label }
        : { postId: ctx.kind === 'post' ? ctx.id : undefined, reelId: ctx.kind === 'reel' ? ctx.id : undefined, cover: ctx.cover, kind: ctx.mediaKind, label: ctx.label };
      sendSharedContentToUser(username, payload);
      pill.textContent = 'Enviado'; pill.classList.add('sent');
      const what = ctx.kind === 'reel' ? 'reel' : ctx.kind === 'comment' ? 'comentario' : 'pulso';
      showAppToast(`Enviaste el ${what} a <b>@${escapeHtml(username)}</b>`);
      if (window.SocialInv && SocialInv.afterShare) SocialInv.afterShare(username);
    });
  });
}
shareSearchInput.addEventListener('input', () => { if (activeShareContext) renderShareContacts(activeShareContext, shareSearchInput.value); });

function closeShareSheet() {
  shareSheetOverlay.classList.remove('open');
  shareSheet.classList.remove('open');
  activeShareContext = null;
}

shareSheetOverlay.addEventListener('click', closeTopNavView);
shareCopyLinkBtn.addEventListener('click', () => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareLinkPreview.textContent).then(() => {
      const original = shareCopyLinkBtn.querySelector('b').textContent;
      shareCopyLinkBtn.querySelector('b').textContent = 'Copiado';
      setTimeout(() => { shareCopyLinkBtn.querySelector('b').textContent = original; }, 1200);
    }).catch(() => {});
  }
});

navIcons.forEach(icon => {
  icon.onclick = () => {
    const tab = icon.dataset.tab;

    if (tab === 'messages') {
      if (getCurrentMainView() !== 'messenger') openMessenger();
      return;
    }

    const targetView = tab === 'search' ? 'search' : tab; // 'home' | 'reels' | 'search'
    const previousView = getCurrentMainView();
    if (previousView === targetView) return; // ya estás ahí, no apila nada

    showMainView(targetView);
    if (targetView === 'search') {
      renderSearchResults('');
      setTimeout(() => searchInput.focus(), 280);
    }
    const restoreView = previousView;
    pushNavView(() => showMainView(restoreView));
  }
});

// Reinicia una animación CSS aunque ya tenga la clase aplicada
function retriggerViewAnim(el) {
  el.classList.remove('view-anim-in');
  void el.offsetWidth;
  el.classList.add('view-anim-in');
}

// Reels: like con doble tap y botón individual (reutilizable para reels nuevos)
// Construye el HTML de un reel (imagen o video) con el nuevo diseño: fondo
// desenfocado + medio frontal con su proporción natural, header con avatar/usuario,
// columna derecha (corazón flotante + cápsula negra) y línea de tiempo para video.
// La usan tanto el reel semilla como los reels nuevos publicados desde el composer.
function buildReelItemHTML({reelId, mediaKind, mediaUrl, username, avatarUrl, caption, likeCount=0, commentCount=0}){
  const isVideo = mediaKind === 'video';
  const mediaBg = isVideo
    ? `<video class="reel-media-bg" src="${mediaUrl}" muted loop playsinline></video>`
    : `<img class="reel-media-bg" src="${mediaUrl}" alt="">`;
  const mediaFg = isVideo
    ? `<video class="reel-media-fg" src="${mediaUrl}" muted loop playsinline></video>`
    : `<img class="reel-media-fg" src="${mediaUrl}" alt="">`;
  return `
  <div class="reel-item" data-reel-id="${reelId}" data-media-kind="${mediaKind}">
    ${mediaBg}
    <div class="reel-media-fg-container">${mediaFg}</div>
    <div class="reel-info">
      <div class="user" data-username="${username}">${escapeHtml(username)}</div>
      <div class="desc">${escapeHtml(caption||'')}</div>
    </div>
    <div class="reel-ui-layer">
      <div class="reel-top-bar-container">
        <div class="reel-top-bar">
          <div class="reel-top-bar-left" data-username="${username}">
            <img class="reel-circle-ft" src="${avatarUrl}">
            <span class="reel-top-username">@${escapeHtml(username)}</span>
          </div>
          <div class="reel-top-bar-center">
            <span class="reel-tab-amigos">Amigos</span>
            <div class="reel-tab-divider"></div>
            <span class="reel-tab-general">General</span>
          </div>
          <div class="reel-circle-btn" onclick="openComposer('reel')">
            <svg viewBox="0 0 24 24"><path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>
          </div>
        </div>
      </div>
      <div class="reel-right-column">
        <div class="reel-action like-btn reel-floating-action">
          <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
          <span class="reel-floating-action-text like-count">${likeCount}</span>
        </div>
        <div class="reel-black-capsule">
          ${username === myUsername ? `
          <div class="reel-action-item reel-stats-btn" title="Estadísticas (próximamente)">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>` : `
          <div class="reel-action-item reel-follow-btn${followingState.has(username)?' following':''}" data-follow-username="${username}">
            <div class="reel-side-profile-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 20v-1.8a3.6 3.6 0 0 0-3.6-3.6h-3.8A3.6 3.6 0 0 0 6.5 18.2V20"/><circle cx="12" cy="8" r="3.6"/></svg>
              <div class="reel-side-profile-badge"><svg viewBox="0 0 24 24">${followingState.has(username)?'<path d="M9 12l2 2 4-4" stroke="#000" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>':'<path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>'}</svg></div>
            </div>
          </div>`}
          <div class="reel-action comment-btn reel-action-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            <span class="reel-action-text comment-count">${commentCount}</span>
          </div>
          <div class="reel-action-item reel-repost-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
            <span class="reel-action-text repost-count">0</span>
          </div>
          <div class="reel-action share-pin-btn reel-action-item" data-reel-share="${reelId}">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </div>
          <div class="reel-action-item reel-save-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <div class="reel-action-item">
            <div class="reel-audio-disc"><img src="${avatarUrl}" class="reel-audio-disc-inner"></div>
          </div>
        </div>
      </div>
      ${isVideo ? `<div class="reel-timeline-container">
        <span class="reel-timeline-time">0:00</span>
        <div class="reel-timeline-track">
          <div class="reel-timeline-fill"></div>
          <div class="reel-timeline-dot"></div>
        </div>
      </div>` : ''}
    </div>
  </div>`;
}

// Animación premium de like (estilo X/Twitter): el ícono hace un pop elástico,
// un destello radial aparece detrás, y una ráfaga de mini-corazones (no puntos
// genéricos) explota con rotación variable.
// Crea un elemento temporal posicionado en (cx,cy) sobre toda la página y lo
// elimina solo tras su animación — patrón que se repetía suelto en el destello,
// las partículas y el anillo de las animaciones de reels.
function spawnFloatingFx(className, cx, cy, lifespanMs, innerHTML){
  const el = document.createElement('div');
  el.className = className;
  if(innerHTML) el.innerHTML = innerHTML;
  el.style.left = cx+'px'; el.style.top = cy+'px';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), lifespanMs);
  return el;
}
function showLikeBurst(btnEl){
  const svg = btnEl.querySelector('svg');
  if(svg){ svg.classList.remove('reel-like-pop'); void svg.offsetWidth; svg.classList.add('reel-like-pop'); }
  const rect = btnEl.getBoundingClientRect();
  const cx = rect.left+rect.width/2, cy = rect.top+rect.height/2;
  spawnFloatingFx('reel-like-glow', cx, cy, 650);
  const N = 7;
  const heartSvg = '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.35-9.5-8.5C.7 9 2 5 5.5 4.2 8 3.6 10 5 12 7.5 14 5 16 3.6 18.5 4.2 22 5 23.3 9 21.5 12.5 19 16.65 12 21 12 21z"/></svg>';
  for(let i=0;i<N;i++){
    const angle = (Math.PI*2*i)/N + (Math.random()*0.4-0.2);
    const dist = 26+Math.random()*20;
    const p = spawnFloatingFx('reel-like-burst-particle', cx, cy, 680, heartSvg);
    p.style.setProperty('--dx', Math.cos(angle)*dist+'px');
    p.style.setProperty('--dy', Math.sin(angle)*dist+'px');
    p.style.setProperty('--rot', (Math.random()*140-70)+'deg');
  }
}
// Microinteracción premium genérica: pop elástico + un anillo que se expande desde
// el centro del ícono tocado — cualquier botón de la cápsula se siente vivo.
function popReelIcon(el){
  const svg = el.querySelector('svg');
  if(!svg)return;
  svg.classList.remove('reel-icon-pop'); void svg.offsetWidth; svg.classList.add('reel-icon-pop');
  const rect = el.getBoundingClientRect();
  spawnFloatingFx('reel-icon-ring', rect.left+rect.width/2, rect.top+rect.height/2, 520);
}

// Solo un reel reproduce a la vez: en cuanto uno entra a la mitad del viewport,
// arranca su video (fg+bg) y pausa cualquier otro — evita tener decenas de videos
// corriendo a la vez en segundo plano mientras se hace scroll por el feed.
let reelPlaybackObserver=null;
function ensureReelPlaybackObserver(){
  if(reelPlaybackObserver) return reelPlaybackObserver;
  reelPlaybackObserver=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const reel=entry.target;
      const bg=reel.querySelector('.reel-media-bg');
      const fg=reel.querySelector('.reel-media-fg');
      const isVideo=reel.dataset.mediaKind==='video';
      if(entry.isIntersecting && entry.intersectionRatio>=0.6){
        reel.classList.add('reel-playing');
        if(isVideo && fg){ fg.play().catch(()=>{}); if(bg) bg.play().catch(()=>{}); }
      }else{
        reel.classList.remove('reel-playing');
        if(isVideo && fg){ fg.pause(); if(bg) bg.pause(); }
      }
    });
  },{root:reelsScroll,threshold:[0,0.6]});
  return reelPlaybackObserver;
}

function initReelInteractions(reel) {
  if (reel.dataset.reelInit) return;
  reel.dataset.reelInit = "true";

  // Toca la pantalla = pausa/reanuda el video (si no fue un long-press de 2x, ver abajo)
  attachTapHandler(reel, () => {
      if (reel.dataset.suppressTapPause === '1') return;
      const fg = reel.querySelector('.reel-media-fg');
      if (!fg || reel.dataset.mediaKind !== 'video') return;
      const bg = reel.querySelector('.reel-media-bg');
      if (fg.paused) { fg.play().catch(()=>{}); if (bg) bg.play().catch(()=>{}); reel.classList.remove('reel-paused-manually'); }
      else { fg.pause(); if (bg) bg.pause(); reel.classList.add('reel-paused-manually'); }
  }, () => {
      showHeartAnimation(reel);
      const btn = reel.querySelector('.reel-action.like-btn');
      const wasLiked = btn.classList.contains('active') || btn.classList.contains('liked');
      handleAddLike(btn, '.like-count');
      if (!wasLiked) showLikeBurst(btn);
  }, '.reel-right-column, .reel-top-bar-container, .reel-timeline-container');

  // Mantener presionado el lado DERECHO reproduce a 2x mientras se sostiene
  (function setup2xHold(){
    const HOLD_MS = 350;
    let holdTimer=null, active=false;
    reel.addEventListener('touchstart', (e) => {
      if (e.target.closest('.reel-right-column, .reel-top-bar-container, .reel-timeline-container')) return;
      if (reel.dataset.mediaKind !== 'video') return;
      const touchX = e.touches[0].clientX;
      if (touchX < window.innerWidth * 0.5) return; // el 2x es solo del lado derecho
      holdTimer = setTimeout(() => {
        const fg = reel.querySelector('.reel-media-fg');
        if (!fg) return;
        fg.dataset.prevRate = fg.playbackRate || 1;
        fg.playbackRate = 2;
        active = true;
        reel.dataset.suppressTapPause = '1';
        reel.classList.add('reel-2x-active');
      }, HOLD_MS);
    }, {passive:true});
    const endHold = () => {
      clearTimeout(holdTimer);
      if (active) {
        const fg = reel.querySelector('.reel-media-fg');
        if (fg) fg.playbackRate = parseFloat(fg.dataset.prevRate || '1');
        active = false;
        reel.classList.remove('reel-2x-active');
        setTimeout(() => { reel.dataset.suppressTapPause = '0'; }, 400); // dura más que los 300ms de espera del single-tap, para que sí lo detenga
      }
    };
    reel.addEventListener('touchend', endHold, {passive:true});
    reel.addEventListener('touchcancel', endHold, {passive:true});
    reel.addEventListener('touchmove', () => clearTimeout(holdTimer), {passive:true});
  })();

  // Microinteracción premium: cualquier ícono de la columna derecha hace un pop
  // elástico al tocarlo (independiente de lo que haga cada botón específicamente)
  reel.querySelectorAll('.reel-action-item, .reel-action, .reel-floating-action').forEach(item => {
    item.addEventListener('click', () => popReelIcon(item));
  });

  const likeBtn = reel.querySelector('.reel-action.like-btn');
  if (likeBtn) {
    likeBtn.onclick = function(e) {
      e.stopPropagation();
      const wasLiked = likeBtn.classList.contains('active') || likeBtn.classList.contains('liked');
      toggleLike(likeBtn, '.like-count');
      if (!wasLiked) showLikeBurst(likeBtn);
    };
  }
  // El primer ícono de la cápsula: "Seguir" en reels ajenos, "Estadísticas" en los tuyos
  const followBtn = reel.querySelector('.reel-follow-btn');
  if (followBtn) {
    followBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetUser = followBtn.dataset.followUsername;
      const st = SocialInv.toggleFollow(targetUser);
      const nowFollowing = st !== 'none';
      if (st === 'requested') showAppToast('Solicitud enviada a <b>@' + escapeHtml(targetUser) + '</b>');
      followBtn.classList.toggle('following', nowFollowing);
      const badge = followBtn.querySelector('.reel-side-profile-badge svg');
      if (badge) badge.innerHTML = nowFollowing
        ? `<path d="M9 12l2 2 4-4" stroke="#000" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>`;
    });
  }
  const statsBtn = reel.querySelector('.reel-stats-btn');
  if (statsBtn) {
    statsBtn.addEventListener('click', (e) => { e.stopPropagation(); showAppToast('Estadísticas de tu reel: próximamente'); });
  }
  // Nota: repost y compartir ya NO se conectan aquí — bindReelRepost/bindReelShare
  // se llaman al crear el reel (tienen el file/caption reales que necesitan).
  const saveBtn = reel.querySelector('.reel-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', (e) => { e.stopPropagation(); saveBtn.classList.toggle('active'); });

  // Sincronía fondo/frente + scrubber, solo aplica a reels de video
  if (reel.dataset.mediaKind === 'video') {
    const fg = reel.querySelector('.reel-media-fg');
    const bg = reel.querySelector('.reel-media-bg');
    const track = reel.querySelector('.reel-timeline-track');
    const fill = reel.querySelector('.reel-timeline-fill');
    const dot = reel.querySelector('.reel-timeline-dot');
    const timeEl = reel.querySelector('.reel-timeline-time');

    function updateTimeline(){
      if (!fg.duration) return;
      const pct = (fg.currentTime/fg.duration)*100;
      fill.style.width = pct+'%'; dot.style.left = pct+'%';
      timeEl.textContent = formatDuration(fg.currentTime);
    }
    function syncBg(){
      if (Math.abs(fg.currentTime - bg.currentTime) > 0.15) bg.currentTime = fg.currentTime;
      if (fg.paused && !bg.paused) bg.pause();
      if (!fg.paused && bg.paused && reel.classList.contains('reel-playing')) bg.play().catch(()=>{});
    }
    fg.addEventListener('loadedmetadata', () => { timeEl.textContent='0:00'; bg.currentTime=0; });
    fg.addEventListener('timeupdate', () => { updateTimeline(); syncBg(); });
    fg.addEventListener('seeking', () => { bg.currentTime = fg.currentTime; });
    fg.addEventListener('play', () => { if (reel.classList.contains('reel-playing')) bg.play().catch(()=>{}); });
    fg.addEventListener('pause', () => bg.pause());

    function scrubTo(clientX){
      const rect = track.getBoundingClientRect();
      let pct = (clientX-rect.left)/rect.width;
      pct = Math.max(0, Math.min(1, pct));
      const t = pct*(fg.duration||0);
      fg.currentTime = t; bg.currentTime = t;
    }
    track.addEventListener('click', e => { e.stopPropagation(); scrubTo(e.clientX); });
    let scrubbing=false;
    track.addEventListener('pointerdown', e => { e.stopPropagation(); scrubbing=true; scrubTo(e.clientX); });
    track.addEventListener('pointermove', e => { if (scrubbing) scrubTo(e.clientX); });
    window.addEventListener('pointerup', () => { scrubbing=false; });
  }

  ensureReelPlaybackObserver().observe(reel);
}

// Reels semilla: videos LOCALES (source/vid/*.mp4), construidos con la misma plantilla que
// cualquier reel nuevo publicado — una sola fuente de verdad para el markup.
// Son VIDEOS (no imágenes) a propósito: el timeline solo se muestra para reels de video.
[
  { reelId: 'reel-static-1', url: 'source/vid/reel-aurora.mp4', user: 'the_creator', caption: 'Nueva camara chavales #new #camera', likes: '12k', comments: 340 },
  { reelId: 'reel-static-2', url: 'source/vid/reel-marea.mp4',  user: 'mariag',      caption: 'Marea baja, cabeza clara #calma #mar', likes: '3,2k', comments: 88 },
  { reelId: 'reel-static-3', url: 'source/vid/reel-brasa.mp4',  user: 'juanp',       caption: 'Atardecer en loop #golden #vibes', likes: '5,9k', comments: 121 },
  { reelId: 'reel-static-4', url: 'source/vid/reel-neon.mp4',   user: 'the_creator', caption: 'Noche neón #neon #city', likes: '21k', comments: 502 }
].reverse().forEach((r) => reelsScroll.insertAdjacentHTML('afterbegin', buildReelItemHTML({
  reelId: r.reelId,
  mediaKind: 'video',
  mediaUrl: r.url,
  username: r.user,
  avatarUrl: usersData[r.user] ? usersData[r.user].avatar : 'source/imgs/user-default.png',
  caption: r.caption,
  likeCount: r.likes,
  commentCount: r.comments
})));

document.querySelectorAll('.reel-item').forEach(initReelInteractions);

// Conecta el reel de ejemplo (the_creator) a su propio botón de compartir,
// usando los datos ya presentes en el DOM en lugar de un File real.
(function bindStaticReelShare() {
  document.querySelectorAll('[data-reel-id^="reel-static-"]').forEach((staticReel) => {
    const media = staticReel.querySelector('.reel-media-fg');
    const desc = staticReel.querySelector('.reel-info .desc');
    if (!media) return;
    bindReelShare(staticReel);
    bindReelRepost(staticReel, { url: media.src, kind: media.tagName === 'VIDEO' ? 'video' : 'image' }, desc ? desc.textContent : '');
  });
})();

/* CREACION Y PUBLICACION */
const createOverlay = document.getElementById('createOverlay');
const createSheet = document.getElementById('createSheet');
const fileInput = document.getElementById('fileInput');
const composer = document.getElementById('composer');
const compPreview = document.getElementById('composerPreview');
const compPublish = document.getElementById('composerPublish');
const compCaption = document.getElementById('composerCaption');
const compCaptionDiv = document.getElementById('composerCaptionDiv');

// Sincroniza el contenido del div editable con el textarea oculto,
// así todo el código que usa compCaption.value sigue funcionando sin cambios.
function syncCaptionToTextarea() {
  compCaption.value = compCaptionDiv.innerText.trim();
}
compCaptionDiv.addEventListener('input', () => {
  syncCaptionToTextarea();
  updatePublishButtonState();
});

// Al limpiar el composer, limpia también el div contenteditable
function clearCaptionDiv() {
  compCaptionDiv.innerHTML = '';
  compCaption.value = '';
}

let compType = 'post', compFiles = [], compPublished = false;

function openCreateSheet() { const alreadyOpen = createSheet.classList.contains('open'); createOverlay.classList.add('open'); createSheet.classList.add('open'); if (!alreadyOpen) pushNavView(closeCreateSheet); }
function closeCreateSheet() { createOverlay.classList.remove('open'); createSheet.classList.remove('open'); }
createOverlay.addEventListener('click', closeTopNavView);
document.getElementById('createCancel').onclick = closeTopNavView;

document.querySelectorAll('.create-option').forEach(opt => {
  opt.onclick = () => {
    closeTopNavView();
    setTimeout(() => openComposer(opt.dataset.type), 0);
  }
});

function openComposer(type) {
  // Si había archivos sin publicar de una sesión anterior del composer, libera su memoria
  const composerAlreadyOpen = composer.classList.contains('open');
  if (!compPublished) revokeCompFiles();
  compType = type; compFiles = []; compPublished = false;
  clearCaptionDiv();
  if (composerLocationText) composerLocationText.textContent = 'Ubicación';
  composer.className = 'composer open ' + (type==='story'?'composer-story':'');
  document.getElementById('composerTitle').textContent = type==='story'?'Nueva Historia':type==='reel'?'Nuevo Reel':'Nuevo Pulso';
  fileInput.multiple = (type === 'post');
  // La barra de formato solo es útil en publicaciones y reels, no en stories
  const fmtBar = document.getElementById('composerFormatBar');
  if (fmtBar) fmtBar.style.display = type === 'story' ? 'none' : 'flex';
  renderComposer();
  if (!composerAlreadyOpen) pushNavView(closeComposer);
}

// Libera la memoria de los blobs seleccionados que NUNCA llegaron a publicarse.
// Los que sí se publican quedan en uso real dentro del feed/perfil y no deben revocarse.
function revokeCompFiles() {
  compFiles.forEach(f => { try { URL.revokeObjectURL(f.url); } catch(e) {} });
}

function closeComposer() {
  if (!compPublished) revokeCompFiles();
  composer.classList.remove('open');
  clearCaptionDiv(); fileInput.value = ''; compFiles = [];
  silentlyCloseNavView(closeComposer);
}
document.getElementById('composerClose').onclick = closeTopNavView;

// Mascota del gatito en la zona de carga (mismo SVG que los estados vacíos del perfil)
const composerMascotSlot = document.getElementById('composerMascotSlot');
if (composerMascotSlot) composerMascotSlot.innerHTML = PF_EMPTY_MASCOT_SVG;

// --- Tema dinámico: extrae el color promedio del archivo elegido (siempre un
// blob: local, sin problemas de CORS) y tiñe la pantalla del composer, igual
// que en el mockup de referencia (fondo pastel + acento oscuro). ---
const composerColorCanvas = document.createElement('canvas');
let cpLastRgb = null; // último color promedio extraído, para poder recalcular sin releer el archivo
function composerApplyTheme(bg, accent, text) {
  composer.style.setProperty('--cp-bg', bg);
  composer.style.setProperty('--cp-accent', accent);
  composer.style.setProperty('--cp-text', text || '#ffffff');
}
// Calcula {bg, accent, text} según el color promedio (r,g,b) Y el tema global
function computeComposerColors(r, g, b) {
  const isSolid = appTheme.type === 'solid';
  const isDark = appTheme.mode === 'dark';
  if (isSolid) return isDark ? { bg: '#000000', accent: '#ffffff', text: '#000000' } : { bg: '#f4f1ea', accent: '#000000', text: '#ffffff' };
  const pastel = `rgb(${Math.round((r + 255*2)/3)}, ${Math.round((g + 255*2)/3)}, ${Math.round((b + 255*2)/3)})`;
  const dark = `rgb(${Math.round(r*0.4)}, ${Math.round(g*0.4)}, ${Math.round(b*0.4)})`;
  return isDark ? { bg: dark, accent: pastel, text: '#000000' } : { bg: pastel, accent: dark, text: '#ffffff' };
}
function composerResetTheme() { cpLastRgb = { r: 233, g: 219, b: 197 }; const c = computeComposerColors(233, 219, 197); composerApplyTheme(c.bg, c.accent, c.text); }
// Permite que Ajustes > Personalización refresque el composer abierto al vuelo
window.pfRefreshComposerChrome = function() {
  if (!cpLastRgb) { composerResetTheme(); return; }
  const c = computeComposerColors(cpLastRgb.r, cpLastRgb.g, cpLastRgb.b);
  composerApplyTheme(c.bg, c.accent, c.text);
};
function composerApplyThemeFromImage(imgEl) {
  try {
    const ctx = composerColorCanvas.getContext('2d');
    composerColorCanvas.width = 40; composerColorCanvas.height = 40;
    ctx.drawImage(imgEl, 0, 0, 40, 40);
    const data = ctx.getImageData(0, 0, 40, 40).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 16) { r += data[i]; g += data[i+1]; b += data[i+2]; n++; }
    r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
    cpLastRgb = { r, g, b };
    const c = computeComposerColors(r, g, b);
    composerApplyTheme(c.bg, c.accent, c.text);
  } catch (err) {
    // Si el navegador no puede leer el canvas (raro con blobs locales), se conserva el tema por defecto
  }
}

document.getElementById('composerDropzone').onclick = () => fileInput.click();
fileInput.onchange = (e) => {
  if (!compPublished) revokeCompFiles(); // libera los archivos previos descartados
  compFiles = Array.from(e.target.files).map(f => ({ url: URL.createObjectURL(f), kind: f.type.startsWith('video')?'video':'image' }));
  renderComposer();
};

document.getElementById('composerRemove').onclick = (e) => { e.stopPropagation(); if (!compPublished) revokeCompFiles(); compFiles=[]; renderComposer(); }

// --- Selector de ubicación (solo visual/local, no altera el modelo de datos del pulso) ---
const composerLocationBtn = document.getElementById('composerLocationBtn');
const composerLocationMenu = document.getElementById('composerLocationMenu');
const composerLocationText = document.getElementById('composerLocationText');
if (composerLocationBtn) {
  composerLocationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    composerLocationMenu.classList.toggle('open');
  });
  composerLocationMenu.querySelectorAll('.composer-loc-opt').forEach(opt => {
    opt.addEventListener('click', (e) => {
      composerLocationText.textContent = e.target.textContent;
      composerLocationMenu.classList.remove('open');
    });
  });
  document.addEventListener('click', () => composerLocationMenu.classList.remove('open'));
}

compCaption.addEventListener('input', updatePublishButtonState);

function updatePublishButtonState() {
  const hasFiles = compFiles.length > 0;
  const hasText = compCaption.value.trim().length > 0;
  if (compType === 'post') {
    // Una publicación puede ser solo texto (hilo), solo media, o ambos
    compPublish.disabled = !(hasFiles || hasText);
  } else {
    // Historia y reel siempre requieren un archivo
    compPublish.disabled = !hasFiles;
  }
}

function renderComposer() {
  const drop = document.getElementById('composerDropzone');
  if(compFiles.length > 0) {
    drop.style.display = 'none'; compPreview.classList.add('show');
    let media = compFiles[0].kind==='video' ? `<video src="${compFiles[0].url}" controls></video>` : `<img src="${compFiles[0].url}">`;
    compPreview.innerHTML = media + `<div class="composer-remove" onclick="compFiles=[];renderComposer()"><svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg></div>`;
    if (compFiles[0].kind === 'video') {
      const isDark = appTheme.mode === 'dark';
      composerApplyTheme(isDark ? '#4a463f' : '#dcd8ce', isDark ? '#dcd8ce' : '#4a463f', isDark ? '#000000' : '#ffffff'); // acento neutro cálido para video
    } else {
      const img = compPreview.querySelector('img');
      if (img.complete) composerApplyThemeFromImage(img);
      else img.onload = () => composerApplyThemeFromImage(img);
    }
  } else {
    drop.style.display = 'flex'; compPreview.classList.remove('show');
    composerResetTheme();
  }
  updatePublishButtonState();
}

compPublish.onclick = () => {
  if (compPublish.dataset.busy === "true") return; // evita doble publicación por doble-tap
  compPublish.dataset.busy = "true";
  setTimeout(() => { compPublish.dataset.busy = "false"; }, 600);

  // Leer el HTML formateado del div contenteditable para preservar subrayado/negrita/cursiva
  const captionHTML = compCaptionDiv.innerHTML.trim();
  // También leer texto plano para la estructura de datos (búsqueda, stats, etc.)
  const caption = compCaption.value.trim();

  // Nada que publicar: se sale sin cerrar el composer (el botón ya viene deshabilitado en este caso)
  if (compType === 'post' && compFiles.length === 0 && !caption) { return; }
  if (compType !== 'post' && compFiles.length === 0) { return; }

  // try/finally: pase lo que pase al construir/insertar el contenido, el composer
  // siempre se cierra al terminar — así nunca se queda pegado en pantalla.
  try {
    if(compType === 'post') {
       const hasFiles = compFiles.length > 0;

       const newPostId = `post-${++contentIdSeq}-${Date.now()}`;
       let mediaHtml = '';

       if (hasFiles) {
         const urls = compFiles.map(f => f.url);
         let gridHtml = `<div class="post-grid count-${urls.length>3?'more':urls.length}" data-files='${JSON.stringify(urls)}'>`;
         urls.forEach((url, i) => {
            const kind = compFiles[i].kind;
            const tag = kind === 'video' ? `<video src="${url}" muted></video>` : `<img src="${url}">`;
            if(i<3 || (urls.length===4 && i<4)) {
                gridHtml += `<div class="grid-item">${tag}</div>`;
            } else if(i===3 && urls.length>4) {
                gridHtml += `<div class="grid-item">${tag}<div class="more-overlay">+${urls.length-3}</div></div>`;
            }
         });
         gridHtml += `</div>`;
         mediaHtml = gridHtml;
       } else {
         // Hilo de solo texto: sin grid de imágenes, el texto se muestra destacado
         mediaHtml = `<div class="post-text-thread">${captionHTML || escapeHtml(caption)}</div>`;
       }

       const captionHtml = (hasFiles && caption) ? `<div class="post-caption"><b>${myUsername}</b> ${captionHTML || escapeHtml(caption)}</div>` : '';

       const postHtml = `
       <div class="post" data-post-id="${newPostId}">
          <div class="post-header">
            <div class="post-avatar" data-username="${myUsername}"><img src="source/imgs/user-default.png" style="background:#555"></div>
            <div class="post-userinfo"><div class="post-username" data-username="${myUsername}">${myUsername}</div><div class="post-meta">Justo ahora</div></div>
            <div class="post-options" data-post-options="${newPostId}"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></div>
          </div>
          ${mediaHtml}
          ${buildPostActionsHTML(newPostId)}
          ${captionHtml}
          <div class="post-time">Justo ahora</div>
       </div>`;
       insertPostAtTop(feedContainer, postHtml);
       initGridsAndPosts();
       bindCommentButtons(feedContainer);
       bindPostOptionsAndShare(feedContainer);
       updateFeedEmptyState();

       // Registra la publicación real en el muro del perfil del usuario
       const profileUser = usersData[myUsername];
       if (profileUser) {
         const postData = hasFiles
           ? { id: newPostId, type: compFiles.length > 1 ? 'carousel' : (compFiles[0].kind === 'video' ? 'video' : 'image'), media: compFiles.map(f => ({ url: f.url, kind: f.kind })), caption, time: 'Justo ahora' }
           : { id: newPostId, type: 'text', media: [], caption, time: 'Justo ahora' };
         profileUser.posts.unshift(postData);
       }

    } else if(compType === 'story') {
       let me = storyUsers.find(u => u.username === myUsername);
       if(!me) {
           me = { username: myUsername, avatar: 'source/imgs/user-default.png', stories: [] };
           storyUsers.push(me);
       }
       me.stories.unshift({ image: compFiles[0].url, kind: compFiles[0].kind, time: 'Ahora', seen: false });
       renderStoriesHeader();
    } else if(compType === 'reel') {
       const file = compFiles[0];
       const newReelId = `reel-${++contentIdSeq}-${Date.now()}`;
       const reelHtml = buildReelItemHTML({
          reelId: newReelId,
          mediaKind: file.kind,
          mediaUrl: file.url,
          username: myUsername,
          avatarUrl: 'source/imgs/user-default.png',
          caption,
          likeCount: 0,
          commentCount: 0
       });
       reelsScroll.insertAdjacentHTML('afterbegin', reelHtml);
       const newReelEl = reelsScroll.querySelector(`[data-reel-id="${newReelId}"]`);
       initReelInteractions(newReelEl);
       bindCommentButtons(newReelEl);
       bindReelShare(newReelEl);
       bindReelRepost(newReelEl, file, caption);
       reelsScroll.scrollTo({ top: 0, behavior: 'instant' });
    }
  } finally {
    compPublished = true;
    closeComposer();
  }
};

