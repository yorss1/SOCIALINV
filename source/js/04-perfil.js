/* ===================================================== */
/* PANEL DE PERFIL: render y navegación                    */
/* ===================================================== */
const profileOverlay = document.getElementById('profileOverlay');
const profilePanel = document.getElementById('profilePanel');
const pfBackBtn = document.getElementById('pfBackBtn');
const pfNavRight = document.getElementById('pfNavRight');
const pfCreateBtn = document.getElementById('pfCreateBtn');
const pfMenuBtn = document.getElementById('pfMenuBtn');

// Comprueba si una URL pertenece a otro origen (necesario para saber cuándo
// hace falta pedir la imagen con crossOrigin="anonymous" y así poder leer su
// color dominante con ColorThief sin que el navegador bloquee el canvas).
function pfIsCrossOriginUrl(url) {
  try { return new URL(url, window.location.href).origin !== window.location.origin; }
  catch (e) { return false; }
}

// Tiñe dinámicamente todo el panel de perfil (pastilla de nav, avatar, hoja
// inferior pastel...) con el tono dominante extraído de la portada, igual que
// en el mockup de referencia. Solo afecta a las variables CSS de #profilePanel,
// nunca al resto de la app.
// Sincroniza el meta theme-color (barra de estado del sistema) con el mismo
// difuminado oscuro de la portada del perfil, para que la barra se funda
// visualmente con el panel. Se restaura el valor previo al cerrar el perfil.
let pfPrevThemeColor = null;
function pfApplyThemeColor(content) {
  const metaEl = document.getElementById('metaThemeColor');
  if (metaEl && content) metaEl.setAttribute('content', content);
}

(function initProfileDynamicColor() {
  let pfColorThief;
  try { pfColorThief = new ColorThief(); } catch (err) { return; }
  const pfPortadaImg = document.getElementById('pfPortada');
  let lastH = 120, lastS = 30; // últimos valores extraídos, para recalcular sin releer la imagen

  function rgbToHslPf(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  // Aplica fondo, acento y textos del perfil según el tono extraído (h, s) Y
  // el tema global (appTheme.type: interactivo/sólido, appTheme.mode: claro/oscuro).
  // Cabecera y hoja inferior son SIEMPRE tonos opuestos entre sí; lo que
  // cambia el modo es cuál de los dos va arriba y cuál abajo (y sus textos).
  function applyProfileTheme(h, s) {
    lastH = h; lastS = s;
    const isSolid = appTheme.type === 'solid';
    const isDark = appTheme.mode === 'dark';
    const sVal = isSolid ? 0 : Math.min(s, 12);   // neutro: solo un susurro del tono
    const lightS = isSolid ? 0 : Math.min(10, Math.max(2, s * .5));

    const colorDark = isSolid ? '#000000' : `hsl(${h}, ${sVal}%, 14%)`;
    const colorLight = isSolid ? '#ffffff' : `hsl(${h}, ${lightS}%, 95%)`;
    const darkTextTone = isSolid ? '#000000' : `hsl(${h}, ${sVal}%, 14%)`;

    const topBg = isDark ? colorDark : colorLight;
    const bottomBg = isDark ? colorLight : colorDark;
    const textMain = isDark ? '#ffffff' : darkTextTone;
    const textOnAccent = isDark ? darkTextTone : '#ffffff';

    profilePanel.style.setProperty('--pf-sat', (isSolid || s < 8) ? 0 : Math.max(30, Math.min(s, 75)));
    profilePanel.style.setProperty('--pf-h', h);
    profilePanel.style.setProperty('--pf-s', sVal + '%');
    profilePanel.style.setProperty('--pf-light-s', lightS + '%');
    profilePanel.style.setProperty('--pf-dark-bg', topBg);
    profilePanel.style.setProperty('--pf-light-bg', bottomBg);
    profilePanel.style.setProperty('--pf-accent', bottomBg);
    profilePanel.style.setProperty('--pf-text-main', textMain);
    profilePanel.style.setProperty('--pf-text-on-accent', textOnAccent);
    profilePanel.style.setProperty('--pf-text-dark', textOnAccent);

    // El theme-color del navegador se funde con el fondo de arriba, solo si el perfil está abierto
    if (profilePanel.classList.contains('open')) pfApplyThemeColor(topBg);
  }

  // Permite que Ajustes > Personalización refresque el perfil abierto al vuelo
  window.pfRefreshProfileChrome = function() { applyProfileTheme(lastH, lastS); };

  pfPortadaImg.addEventListener('load', () => {
    try {
      const [r, g, b] = pfColorThief.getColor(pfPortadaImg);
      const [h, s] = rgbToHslPf(r, g, b);
      applyProfileTheme(h, s);
    } catch (err) {
      // Si la imagen no permite extraer color (CORS, etc.) se conserva el tono por defecto
    }
  });
})();

// Detecta cuál vista principal está activa en este momento (home, reels o search)
// Inserta un pulso nuevo ARRIBA de los pulsos pero DEBAJO de historias, pestañas y chips
// (antes se insertaba al inicio del contenedor y quedaba por encima de las historias).
function insertPostAtTop(feed, html) {
  const first = feed.querySelector('.post');
  if (first) { first.insertAdjacentHTML('beforebegin', html); return; }
  const anchors = feed.querySelectorAll('#storiesRow, #feedSeg, .home-chips, .aura-chips');
  const last = anchors[anchors.length - 1];
  if (last) last.insertAdjacentHTML('afterend', html); else feed.insertAdjacentHTML('beforeend', html);
}

function getCurrentMainView() {
  if (searchView.style.display === 'flex') return 'search';
  if (reelsView.style.display === 'flex') return 'reels';
  if (typeof messengerView !== 'undefined' && messengerView && messengerView.style.display === 'flex') return 'messenger';
  return 'home';
}

// Muestra exactamente la vista principal indicada, ocultando las demás
function showMainView(view) {
  feedContainer.style.display = 'none';
  cbcx.style.display = 'none';
  reelsView.style.display = 'none';
  searchView.style.display = 'none';
  searchView.classList.remove('view-anim-in');
  if (typeof messengerView !== 'undefined' && messengerView) {
    messengerView.style.display = 'none';
    messengerView.classList.remove('view-anim-in');
  }

  if (view === 'reels') {
    reelsView.style.display = 'flex';
    retriggerViewAnim(reelsView);
    navbarEl.style.display = 'flex'; // el dock de cristal flota sobre el video: Reels siempre tiene salida
  } else if (view === 'search') {
    searchView.style.display = 'flex';
    retriggerViewAnim(searchView);
    navbarEl.style.display = 'flex';
  } else if (view === 'messenger') {
    messengerView.style.display = 'flex';
    retriggerViewAnim(messengerView);
    navbarEl.style.display = 'flex';
  } else {
    feedContainer.style.display = 'flex';
    cbcx.style.display = 'flex';
    retriggerViewAnim(feedContainer);
    navbarEl.style.display = 'flex';
  }

  navIcons.forEach(i => { i.classList.remove('active'); i.removeAttribute('aria-current'); });
  const navBtn = document.querySelector(`.navbar .nav-icon[data-tab="${view === 'home' ? 'home' : (view === 'messenger' ? 'messages' : view)}"]`);
  if (navBtn) { navBtn.classList.add('active'); navBtn.setAttribute('aria-current', 'page'); }
}

let viewBeforeProfile = 'home';

// Conecta el avatar del perfil con el sistema de historias ya existente:
// si el usuario tiene historias activas, muestra el anillo (negro = sin ver, gris = vistas)
// y al tocarlo abre el visor de historias a pantalla completa.
// Genera la celda del grid de publicaciones (soporta posts de ejemplo en string y posts reales en objeto)
function renderProfileGridCell(post, idx) {
  if (typeof post === 'string') {
    return `<div class="pf-post-item" data-idx="${idx}" style="background-image:url('${post}')"></div>`;
  }
  if (post.type === 'text') {
    return `<div class="pf-post-item is-text" data-idx="${idx}"><div class="pf-post-text-preview">${escapeHtml(post.caption || '')}</div></div>`;
  }
  const cover = post.media[0];
  const badge = post.media.length > 1
    ? `<div class="pf-post-badge"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5A8.38 8.38 0 0 1 4 11.5 8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" opacity="0"/><rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/></svg></div>`
    : (cover.kind === 'video'
        ? `<div class="pf-post-badge"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>`
        : '');
  return `<div class="pf-post-item" data-idx="${idx}" style="background-image:url('${cover.url}')">${badge}</div>`;
}

// Genera un pin estilo Pinterest para la sección de compartidos
function renderPinHTML(s, idx) {
  const isVideo = s.kind === 'video';
  const media = isVideo
    ? `<video src="${s.cover}" muted playsinline></video>`
    : `<img src="${s.cover}" alt="">`;
  const playIcon = isVideo ? `<div class="pf-pin-play"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>` : '';
  return `
    <div class="pf-pin" data-idx="${idx}">
      ${media}
      ${playIcon}
      <div class="pf-pin-overlay"><img src="${s.avatar}" alt="">${escapeHtml(s.title)}</div>
    </div>`;
}

// Genera el bloque de acciones + stats-row del nuevo formato [ícono] N [ícono] N
function buildPostActionsHTML(postId, opts) {
  const likes = (opts && opts.likes) || 0;
  const comments = (opts && opts.comments) || 0;
  const shares = (opts && opts.shares) || 0;
  return `
    <div class="post-actions">
      <div class="post-action like"><svg class="icon-heart" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></div>
      <div class="post-action comment"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 1 1-3.8-7.1L21 3l-1 3.5a8.5 8.5 0 0 1 1 5z"/></svg></div>
      <div class="post-action share" data-post-share="${postId}"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>
      <div class="post-action save" data-save-btn><svg viewBox="0 0 24 24"><path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div>
    </div>
    <div class="post-stats-row">
      <div class="stat-item"><svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg><span class="like-count" data-count="${likes}">${likes}</span></div>
      <div class="stat-item"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 1 1-3.8-7.1L21 3l-1 3.5a8.5 8.5 0 0 1 1 5z"/></svg><span class="comment-count" data-count="${comments}">${comments}</span></div>
      <div class="stat-item"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><span class="share-count" data-count="${shares}">${shares}</span></div>
    </div>`;
}

// Construye el HTML completo de una publicación real a partir de su objeto de datos
// (mismo formato/clases que genera compPublish, para reutilizar toda la lógica existente)
function buildFullPostHTML(post, username) {
  const headerHTML = `
    <div class="post-header">
      <div class="post-avatar" data-username="${username}"><img src="${usersData[username] ? usersData[username].avatar : 'source/imgs/user-default.png'}" style="background:#555"></div>
      <div class="post-userinfo"><div class="post-username" data-username="${escapeHtml(username)}">${escapeHtml(username)}</div><div class="post-meta">${escapeHtml(post.time || '')}</div></div>
      <div class="post-options" data-post-options="${post.id}"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></div>
    </div>`;

  let mediaHtml = '';
  if (post.type === 'text') {
    mediaHtml = `<div class="post-text-thread">${escapeHtml(post.caption || '')}</div>`;
  } else {
    const urls = post.media.map(m => m.url);
    let gridHtml = `<div class="post-grid count-${urls.length>3?'more':urls.length}" data-files='${JSON.stringify(urls)}'>`;
    urls.forEach((url, i) => {
      const kind = post.media[i].kind;
      const tag = kind === 'video' ? `<video src="${url}" muted></video>` : `<img src="${url}">`;
      if (i<3 || (urls.length===4 && i<4)) {
        gridHtml += `<div class="grid-item">${tag}</div>`;
      } else if (i===3 && urls.length>4) {
        gridHtml += `<div class="grid-item">${tag}<div class="more-overlay">+${urls.length-3}</div></div>`;
      }
    });
    gridHtml += `</div>`;
    mediaHtml = gridHtml;
  }

  const captionHtml = (post.type !== 'text' && post.caption)
    ? `<div class="post-caption"><b>${username}</b> ${escapeHtml(post.caption)}</div>`
    : '';

  return `
    <div class="post" data-post-id="${post.id}">
      ${headerHTML}
      ${mediaHtml}
      ${buildPostActionsHTML(post.id)}
      ${captionHtml}
      <div class="post-time">${escapeHtml(post.time || '')}</div>
    </div>`;
}

const pfFeedModal = document.getElementById('pfFeedModal');
const pfFeedScroll = document.getElementById('pfFeedScroll');
const pfFeedTitle = document.getElementById('pfFeedTitle');
const pfFeedBackBtn = document.getElementById('pfFeedBackBtn');

// Abre el muro de publicaciones del usuario en un modal navegable,
// con la barra superior siempre visible (igual que un feed real de Instagram).
function openProfileFeed(username, startIdx) {
  const user = usersData[username];
  if (!user || !user.posts.length) return;

  pfFeedTitle.textContent = `Pulsos de ${username}`;

  // Solo los posts reales (objetos) son navegables como publicación completa;
  // los de ejemplo en string se muestran como imagen simple de solo lectura.
  pfFeedScroll.innerHTML = user.posts.map(p => {
    if (typeof p === 'string') {
      return `<div class="post"><div class="post-media" style="background:#000;"><img src="${p}" style="width:100%;display:block;"></div></div>`;
    }
    return buildFullPostHTML(p, username);
  }).join('');

  initGridsAndPosts();
  bindCommentButtons(pfFeedScroll);
  bindPostOptionsAndShare(pfFeedScroll);

  const pfFeedAlreadyOpen = pfFeedModal.classList.contains('open');
  pfFeedModal.classList.add('open');
  if (!pfFeedAlreadyOpen) pushNavView(closeProfileFeed);

  requestAnimationFrame(() => {
    const target = pfFeedScroll.children[startIdx];
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
}

function closeProfileFeed() {
  pfFeedModal.classList.remove('open');
  pfFeedScroll.innerHTML = '';
}
pfFeedBackBtn.addEventListener('click', closeTopNavView);

// Abre un reel desde un pin de "Compartidos": cambia a la vista de Reels
// y hace scroll hasta ese reel específico si todavía existe en pantalla.
function openReelFromPin(reelId) {
  closeProfile();
  showMainView('reels');
  setTimeout(() => {
    const reelEl = document.querySelector(`[data-reel-id="${reelId}"]`);
    if (reelEl) reelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 350);
}

function setupProfileStoryRing(username) {
  const anillo = document.querySelector('.pf-anillo');
  const storyEntry = storyUsers.find(u => u.username === username);
  const hasStories = !!(storyEntry && storyEntry.stories.length > 0);

  anillo.classList.toggle('has-story', hasStories);
  anillo.classList.toggle('all-seen', hasStories && storyEntry.stories.every(s => s.seen));

  anillo.onclick = () => {
    if (!hasStories) return;
    const sorted = getSortedUsers();
    const idx = sorted.findIndex(u => u.username === username);
    if (idx > -1) openStoryFs(idx, sorted);
  };
}

function openProfile(username) {
  const user = usersData[username];
  if (!user) return;
  const isMe = username === myUsername;
  pfCurrentUsername = username;

  viewBeforeProfile = getCurrentMainView();
  exitDecorMode();
  renderDecorLayer(username);

  document.getElementById('pfUserImg').src = user.avatar;
  document.getElementById('pfUserImg').onerror = function() { this.onerror = null; this.src = user.avatarFallback || user.avatar; };
  {
    const pfCoverEl = document.getElementById('pfPortada');
    pfCoverEl.crossOrigin = pfIsCrossOriginUrl(user.cover) ? 'anonymous' : null;
    pfCoverEl.src = user.cover;
  }
  document.getElementById('pfUsername').textContent = user.username;
  document.getElementById('pfDisplayName').textContent = user.name || user.username;
  document.getElementById('pfStatPosts').textContent = user.posts.length;
  document.getElementById('pfStatFollowers').textContent = user.stats.followers;
  // En mi propio perfil, "Seguidos" refleja la cuenta real de followingState;
  // en perfiles ajenos se mantiene el dato de ejemplo (no tenemos su lista real de seguidos)
  document.getElementById('pfStatFollowing').textContent = username === myUsername ? followingState.size : user.stats.following;
  document.getElementById('pfBio').innerHTML = `<strong>${escapeHtml(user.bio)}</strong>`;

  // Tarjetas de redes sociales bajo la bio: detectan la plataforma por el
  // enlace (ícono + nombre) y abren el enlace real al tocarlas.
  const detectedLinks = (user.links || []).map(detectSocialLink).filter(Boolean);
  document.getElementById('pfSocialTags').innerHTML = detectedLinks.map(link => `
    <div class="pf-social-tag" data-url="${escapeHtml(link.url)}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${link.svg}</svg>
      <span>${escapeHtml(link.label)}</span>
    </div>`).join('');
  document.querySelectorAll('#pfSocialTags .pf-social-tag').forEach(tag => {
    tag.addEventListener('click', () => window.open(tag.dataset.url, '_blank', 'noopener'));
  });

  setupProfileStoryRing(username);

  document.getElementById('pfInfoList').innerHTML = user.info.length ? user.info.map(item => `
    <li class="pf-info-item">
      <div class="pf-info-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PF_ICONS[item.icon] || ''}</svg></div>
      <div class="pf-info-item-text">
        <span class="pf-info-label">${escapeHtml(item.label)}</span>
        <span class="pf-info-value">${escapeHtml(item.value)}</span>
      </div>
    </li>`).join('') : pfEmptyStateHTML('Aún no hay información en este perfil', 'campo_info: null');

  document.getElementById('pfPostsGrid').innerHTML = user.posts.length
    ? user.posts.map((p, idx) => renderProfileGridCell(p, idx)).join('')
    : pfEmptyStateHTML('Todavía no hay pulsos aquí', 'posts.length === 0');

  document.querySelectorAll('#pfPostsGrid .pf-post-item').forEach(cell => {
    cell.addEventListener('click', () => openProfileFeed(username, parseInt(cell.dataset.idx, 10)));
  });

  document.getElementById('pfSharedList').innerHTML = user.shared.length
    ? user.shared.map((s, idx) => renderPinHTML(s, idx)).join('')
    : pfEmptyStateHTML('Todavía no se ha compartido nada aquí', 'shared.length === 0');

  document.querySelectorAll('#pfSharedList .pf-pin').forEach(pin => {
    pin.addEventListener('click', () => {
      const s = user.shared[parseInt(pin.dataset.idx, 10)];
      if (s && s.reelId) openReelFromPin(s.reelId);
    });
  });

  // Botones de acción: Editar/Compartir (yo) vs Seguir/Mensaje (otros)
  const actions = document.getElementById('pfActions');
  if (isMe) {
    actions.innerHTML = `
      <button class="pf-btn" id="pfEditBtn">Editar</button>
      <button class="pf-btn pf-btn-outline" id="pfShareProfileBtn">Compartir</button>`;
    pfNavRight.style.visibility = 'visible';

    document.getElementById('pfEditBtn').onclick = () => openProfileEditor(username);
    document.getElementById('pfShareProfileBtn').onclick = (e) => {
      const btn = e.currentTarget;
      const shareText = `${location.origin}${location.pathname}#@${username}`;
      const finish = () => {
        const original = 'Compartir';
        btn.textContent = 'Enlace copiado';
        setTimeout(() => { if (document.getElementById('pfShareProfileBtn')) btn.textContent = original; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText).then(finish).catch(finish);
      } else { finish(); }
    };
  } else {
    const fst = SocialInv.followState(username);
    actions.innerHTML = `
      <button class="pf-btn ${fst !== 'none' ? 'following' : ''}" id="pfFollowBtn">${fst === 'following' ? 'Siguiendo' : fst === 'requested' ? 'Solicitado' : 'Seguir'}</button>
      <button class="pf-btn pf-btn-outline" id="pfMessageBtn">Mensaje</button>`;
    pfNavRight.style.visibility = 'hidden';

    document.getElementById('pfFollowBtn').onclick = () => {
      SocialInv.toggleFollow(username);
      openProfile(username); // re-render para reflejar el nuevo estado
    };
    document.getElementById('pfMessageBtn').onclick = () => {
      document.getElementById('pfMessageBtn').textContent = 'Próximamente';
      setTimeout(() => { if (document.getElementById('pfMessageBtn')) document.getElementById('pfMessageBtn').textContent = 'Mensaje'; }, 1400);
    };
  }

  // Reinicia siempre a la primera pestaña al abrir un perfil
  document.querySelectorAll('.pf-tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.querySelectorAll('.pf-tab-content').forEach((c, i) => c.classList.toggle('active', i === 0));

  const wasAlreadyOpen = profilePanel.classList.contains('open');
  profileOverlay.classList.add('open');
  profilePanel.classList.add('open');
  if (!wasAlreadyOpen) {
    pushNavView(closeProfile);
    // Guarda el theme-color que hubiera antes (el del feed/home dinámico) para
    // poder restaurarlo al cerrar; mientras el perfil está abierto, el
    // theme-color se sincroniza con su propio difuminado (ver initProfileDynamicColor).
    const metaEl = document.getElementById('metaThemeColor');
    pfPrevThemeColor = metaEl ? metaEl.getAttribute('content') : null;
    pfApplyThemeColor(`hsl(${getComputedStyle(profilePanel).getPropertyValue('--pf-h')}, ${getComputedStyle(profilePanel).getPropertyValue('--pf-s')}, 14%)`);
  }
}

function closeProfile() {
  profileOverlay.classList.remove('open');
  profilePanel.classList.remove('open');
  showMainView(viewBeforeProfile);
  exitDecorMode();
  // Devuelve el theme-color a como estaba antes de abrir el perfil
  if (pfPrevThemeColor !== null) pfApplyThemeColor(pfPrevThemeColor);
}

/* ===================================================== */
/* EDITOR DE PERFIL                                        */
/* ===================================================== */
const pfEditor = document.getElementById('pfEditor');
const pfEditorClose = document.getElementById('pfEditorClose');
const pfEditorSave = document.getElementById('pfEditorSave');
const pfEditorCoverWrap = document.getElementById('pfEditorCoverWrap');
const pfEditorAvatarWrap = document.getElementById('pfEditorAvatarWrap');
const pfEditorCoverImg = document.getElementById('pfEditorCoverImg');
const pfEditorAvatarImg = document.getElementById('pfEditorAvatarImg');
const pfCoverFileInput = document.getElementById('pfCoverFileInput');
const pfAvatarFileInput = document.getElementById('pfAvatarFileInput');
const pfEditorUsername = document.getElementById('pfEditorUsername');
const pfEditorName = document.getElementById('pfEditorName');
const pfEditorBio = document.getElementById('pfEditorBio');
const pfEditorBioCount = document.getElementById('pfEditorBioCount');
const pfEditorLinksList = document.getElementById('pfEditorLinksList');
const pfEditorAddLinkBtn = document.getElementById('pfEditorAddLinkBtn');
const pfEditorDecorateBtn = document.getElementById('pfEditorDecorateBtn');
const pfEditorDecorColor = document.getElementById('pfEditorDecorColor');
const pfEditorColorWheelLabel = document.getElementById('pfEditorColorWheelLabel');

function updateBioCharCount() {
  const len = pfEditorBio.value.length;
  pfEditorBioCount.textContent = `${len}/160`;
  pfEditorBioCount.classList.toggle('limit', len >= 150);
}
pfEditorBio.addEventListener('input', updateBioCharCount);

let editingUsername = null;
let pendingCoverURL = null;
let pendingAvatarURL = null;

function openProfileEditor(username) {
  const user = usersData[username];
  if (!user) return;
  editingUsername = username;
  pendingCoverURL = null;
  pendingAvatarURL = null;

  pfEditorCoverImg.src = user.cover;
  pfEditorAvatarImg.src = user.avatar;
  pfEditorAvatarImg.onerror = function() { this.onerror = null; this.src = user.avatarFallback || user.avatar; };
  pfEditorUsername.value = user.username;
  pfEditorName.value = user.name;
  pfEditorBio.value = user.bio;
  updateBioCharCount();

  for (let i = 0; i < 4; i++) {
    const field = document.getElementById('pfEditorInfo' + i);
    field.value = user.info[i] ? user.info[i].value : '';
  }

  renderEditorLinksList(user.links || []);
  pfEditorDecorColor.value = user.decorColor || '#000000';
  pfEditorColorWheelLabel.style.setProperty('--pf-picked-color', pfEditorDecorColor.value);

  const pfEditorAlreadyOpen = pfEditor.classList.contains('open');
  pfEditor.classList.add('open');
  if (!pfEditorAlreadyOpen) pushNavView(closeProfileEditor);
}

// --- Redes sociales: lista editable de enlaces (añadir / quitar filas) ---
function renderEditorLinksList(links) {
  pfEditorLinksList.innerHTML = '';
  (links.length ? links : ['']).forEach(url => addEditorLinkRow(url));
}

function addEditorLinkRow(value) {
  const row = document.createElement('div');
  row.className = 'pf-editor-link-row';
  row.innerHTML = `
    <input type="text" placeholder="https://instagram.com/tu_usuario" value="${value ? value.replace(/"/g, '&quot;') : ''}">
    <button type="button" class="pf-editor-link-remove" aria-label="Quitar enlace">
      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>`;
  row.querySelector('.pf-editor-link-remove').addEventListener('click', () => row.remove());
  pfEditorLinksList.appendChild(row);
}

pfEditorAddLinkBtn.addEventListener('click', () => addEditorLinkRow(''));

function closeProfileEditor() {
  pfEditor.classList.remove('open');
  editingUsername = null;
}

pfEditorClose.addEventListener('click', closeTopNavView);

pfEditorCoverWrap.addEventListener('click', () => pfCoverFileInput.click());
pfEditorAvatarWrap.addEventListener('click', () => pfAvatarFileInput.click());

pfCoverFileInput.addEventListener('change', () => {
  const file = pfCoverFileInput.files[0];
  if (!file) return;
  if (pendingCoverURL) URL.revokeObjectURL(pendingCoverURL);
  if (pendingCoverURL) URL.revokeObjectURL(pendingCoverURL);
  pendingCoverURL = URL.createObjectURL(file);
  pfEditorCoverImg.src = pendingCoverURL;
});

pfAvatarFileInput.addEventListener('change', () => {
  const file = pfAvatarFileInput.files[0];
  if (!file) return;
  if (pendingAvatarURL) URL.revokeObjectURL(pendingAvatarURL);
  if (pendingAvatarURL) URL.revokeObjectURL(pendingAvatarURL);
  pendingAvatarURL = URL.createObjectURL(file);
  pfEditorAvatarImg.src = pendingAvatarURL;
});

pfEditorDecorColor.addEventListener('input', () => {
  pfEditorColorWheelLabel.style.setProperty('--pf-picked-color', pfEditorDecorColor.value);
  if (!editingUsername) return;
  const user = usersData[editingUsername];
  if (!user) return;
  user.decorColor = pfEditorDecorColor.value;
  // Si el perfil detrás del editor sigue siendo el mismo, recolorea en vivo
  if (decorTargetUsername === editingUsername) renderDecorLayer(editingUsername);
});

// El botón de decorar vive en el editor (afuera del perfil se veía mal); al
// tocarlo cerramos el editor y activamos el modo decorar sobre el perfil,
// que sigue abierto justo detrás.
pfEditorDecorateBtn.addEventListener('click', () => {
  closeTopNavView();
  enterDecorMode();
});

pfEditorSave.addEventListener('click', () => {
  if (!editingUsername) return;
  const user = usersData[editingUsername];
  if (!user) return;

  const newUsername = pfEditorUsername.value.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '') || user.username;
  const usernameChanged = newUsername !== user.username;

  if (pendingCoverURL) user.cover = pendingCoverURL;
  if (pendingAvatarURL) { user.avatar = pendingAvatarURL; user.avatarFallback = null; }
  user.name = pfEditorName.value.trim() || user.name;
  user.bio = pfEditorBio.value.trim();

  for (let i = 0; i < 4; i++) {
    const val = document.getElementById('pfEditorInfo' + i).value.trim();
    if (user.info[i]) user.info[i].value = val;
  }

  user.links = Array.from(pfEditorLinksList.querySelectorAll('input'))
    .map(input => input.value.trim())
    .filter(Boolean);

  let finalUsername = user.username;
  if (usernameChanged && newUsername) {
    finalUsername = renameUserAcrossApp(user.username, newUsername);
    if (finalUsername !== newUsername) {
      // Hubo colisión con un username existente: se conserva el anterior y se avisa visualmente
      const wrap = pfEditorUsername.closest('.pf-editor-username-input');
      if (wrap) {
        wrap.style.borderColor = '#e0245e';
        setTimeout(() => { wrap.style.borderColor = ''; }, 1200);
      }
    }
  }

  closeTopNavView();
  openProfile(finalUsername);
});

// Propaga el cambio de username a toda la app: usersData, myUsername,
// storyUsers, followingState y todos los data-username/data-post-id ya pintados en el DOM.
function renameUserAcrossApp(oldUsername, newUsername) {
  if (oldUsername === newUsername) return newUsername;
  if (usersData[newUsername]) return oldUsername; // colisión: nombre ya en uso, no se renombra

  const user = usersData[oldUsername];
  user.username = newUsername;
  usersData[newUsername] = user;
  delete usersData[oldUsername];

  if (oldUsername === myUsername) {
    myUsername = newUsername;
  }

  const storyEntry = storyUsers.find(u => u.username === oldUsername);
  if (storyEntry) storyEntry.username = newUsername;

  if (followingState.has(oldUsername)) {
    followingState.delete(oldUsername);
    followingState.add(newUsername);
    const idx = followOrder.indexOf(oldUsername);
    if (idx > -1) followOrder[idx] = newUsername;
  }

  document.querySelectorAll(`[data-username="${oldUsername}"]`).forEach(el => {
    el.dataset.username = newUsername;
    if (el.classList.contains('post-username') || (el.classList.contains('user') && el.closest('.reel-info'))) {
      const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = ' ' + newUsername;
      else el.textContent = newUsername;
    }
  });

  return newUsername;
}

/* ===================================================== */
/* DECORACIONES DEL MURO (stickers SVG arrastrables)       */
/* ===================================================== */

// Catálogo de stickers disponibles: trazos limpios en blanco/negro, acordes al estilo
const STICKER_CATALOG = [
  { id: 'note1', svg: '<path d="M9 18V5l12-2v13" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="#000"/><circle cx="18" cy="16" r="3" fill="#000"/>' },
  { id: 'note2', svg: '<path d="M9 17a3 3 0 1 1-3-3 3 3 0 0 1 3 3z" fill="#000"/><path d="M9 17V4l9 3v9" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 'star', svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#000"/>' },
  { id: 'star-outline', svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/>' },
  { id: 'heart', svg: '<path d="M12 21s-8-5.5-10-10.5C0.5 6 3 2.5 7 2.5c2.2 0 3.8 1.3 5 3 1.2-1.7 2.8-3 5-3 4 0 6.5 3.5 5 8C20 15.5 12 21 12 21z" fill="#000"/>' },
  { id: 'bolt', svg: '<polygon points="13 2 3 14 11 14 9 22 21 9 13 9 13 2" fill="#000"/>' },
  { id: 'moon', svg: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" fill="#000"/>' },
  { id: 'flower', svg: '<g fill="#000"><circle cx="12" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><circle cx="12" cy="12" r="2.6" fill="#fff" stroke="#000" stroke-width="1.4"/></g>' },
  { id: 'sun', svg: '<g stroke="#000" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" fill="#000" stroke="none"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/><line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/><line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/></g>' },
  { id: 'sparkle', svg: '<path d="M12 2c.6 4.5 2 6 6.5 6.5C14 9 12.6 10.5 12 15c-.6-4.5-2-6-6.5-6.5C10 8 11.4 6.5 12 2z" fill="#000"/>' },
  { id: 'wave', svg: '<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>' },
  { id: 'cloud', svg: '<path d="M6.5 18a4.5 4.5 0 0 1-.5-9 5.5 5.5 0 0 1 10.7-1.7A4 4 0 0 1 17.5 15H6.5z" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/>' },
  { id: 'heart-outline', svg: '<path d="M12 21s-8-5.5-10-10.5C0.5 6 3 2.5 7 2.5c2.2 0 3.8 1.3 5 3 1.2-1.7 2.8-3 5-3 4 0 6.5 3.5 5 8C20 15.5 12 21 12 21z" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/>' },
  { id: 'heart-small', svg: '<g fill="#000"><path d="M7 13s-4.5-3-5.5-5.8C0.7 4.8 2 2.5 4.4 2.5c1.2 0 2.1.7 2.6 1.6.5-.9 1.4-1.6 2.6-1.6 2.4 0 3.7 2.3 2.9 4.7C11.5 10 7 13 7 13z"/><path d="M17 21s-4.5-3-5.5-5.8c-.8-2.4.5-4.7 2.9-4.7 1.2 0 2.1.7 2.6 1.6.5-.9 1.4-1.6 2.6-1.6 2.4 0 3.7 2.3 2.9 4.7C21.5 18 17 21 17 21z"/></g>' },
  { id: 'leaf', svg: '<path d="M5 19C3 11 9 4 19 4c0 10-7 16-15 16-1.3 0-2.5-.4-3-1z" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><line x1="5" y1="19" x2="17" y2="7" stroke="#000" stroke-width="1.4"/>' },
  { id: 'leaf-fill', svg: '<path d="M5 19C3 11 9 4 19 4c0 10-7 16-15 16-1.3 0-2.5-.4-3-1z" fill="#000"/>' },
  { id: 'butterfly', svg: '<g fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"><path d="M12 5c-1-3-7-3-8 1 0 3 4 4 8 3"/><path d="M12 5c1-3 7-3 8 1 0 3-4 4-8 3"/><path d="M12 8c-1 4-7 5-8 1 0-2 3-3 8-2"/><path d="M12 8c1 4 7 5 8 1 0-2-3-3-8-2"/><line x1="12" y1="3" x2="12" y2="19"/></g>' },
  { id: 'fish', svg: '<path d="M3 12c4-5 12-5 16 0-4 5-12 5-16 0z" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><polygon points="19 12 23 8 23 16" fill="#000"/><circle cx="7" cy="11" r="0.9" fill="#000"/>' },
  { id: 'cat', svg: '<path d="M5 21V9l4 3h6l4-3v12z" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><polygon points="5 9 3 4 8 7" fill="#000"/><polygon points="19 9 21 4 16 7" fill="#000"/><circle cx="9" cy="15" r="1" fill="#000"/><circle cx="15" cy="15" r="1" fill="#000"/>' },
  { id: 'bird', svg: '<path d="M3 14c4 2 8 2 10-2 1.5-2.5.5-6-2-6 3-1 6 1 6 4 0 5-5 9-11 9-2 0-3.5-1-3-2z" fill="#000"/><circle cx="15" cy="8" r="0.8" fill="#fff"/>' },
  { id: 'mountain', svg: '<path d="M2 19 9 7l4 6 2-3 7 9z" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><circle cx="17" cy="6" r="2" fill="#000"/>' },
  { id: 'umbrella', svg: '<path d="M3 12a9 9 0 0 1 18 0z" fill="#000"/><line x1="12" y1="12" x2="12" y2="20" stroke="#000" stroke-width="1.6" stroke-linecap="round"/><path d="M12 20a2 2 0 0 0 3-1" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>' },
  { id: 'crown', svg: '<path d="M3 18h18l-1-9-5 4-3-7-3 7-5-4z" fill="#000" stroke="#000" stroke-linejoin="round"/>' },
  { id: 'camera', svg: '<rect x="2" y="7" width="20" height="14" rx="2.5" fill="none" stroke="#000" stroke-width="1.6"/><circle cx="12" cy="14" r="4" fill="none" stroke="#000" stroke-width="1.6"/><path d="M8 7l1.5-3h5L16 7" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/>' },
  { id: 'headphones', svg: '<path d="M4 14v-2a8 8 0 0 1 16 0v2" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/><rect x="2" y="13" width="5" height="7" rx="2" fill="#000"/><rect x="17" y="13" width="5" height="7" rx="2" fill="#000"/>' },
  { id: 'flame', svg: '<path d="M12 2c2 4-2 5-2 8a2 2 0 0 0 4 0c2 2 3 4 3 6a5 5 0 0 1-10 0c0-4 2-6 5-14z" fill="#000"/>' },
  { id: 'gem', svg: '<polygon points="7 3 17 3 22 9 12 22 2 9" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><line x1="2" y1="9" x2="22" y2="9" stroke="#000" stroke-width="1.4"/><line x1="9" y1="3" x2="12" y2="9" stroke="#000" stroke-width="1.2"/><line x1="15" y1="3" x2="12" y2="9" stroke="#000" stroke-width="1.2"/>' },
  { id: 'ribbon', svg: '<circle cx="12" cy="7" r="4.5" fill="none" stroke="#000" stroke-width="1.6"/><polygon points="8 11 5 21 12 17 19 21 16 11" fill="#000"/>' },
  { id: 'pin-location', svg: '<path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" fill="#000"/><circle cx="12" cy="9" r="2.6" fill="#fff"/>' },
  /* Carreras universitarias */
  { id: 'medicine', svg: '<rect x="9" y="2" width="6" height="20" rx="2" fill="none" stroke="#000" stroke-width="1.6"/><line x1="9" y1="9" x2="15" y2="9" stroke="#000" stroke-width="1.6"/><line x1="12" y1="13.5" x2="12" y2="18.5" stroke="#000" stroke-width="1.8" stroke-linecap="round"/><line x1="9.5" y1="16" x2="14.5" y2="16" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>' },
  { id: 'law', svg: '<line x1="12" y1="3" x2="12" y2="21" stroke="#000" stroke-width="1.6"/><line x1="5" y1="7" x2="19" y2="7" stroke="#000" stroke-width="1.6"/><path d="M3 7l3-4 3 4-3 5z" fill="none" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/><path d="M15 7l3-4 3 4-3 5z" fill="none" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/><rect x="8" y="19" width="8" height="2" rx="1" fill="#000"/>' },
  { id: 'engineering', svg: '<circle cx="12" cy="12" r="3" fill="none" stroke="#000" stroke-width="1.6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>' },
  { id: 'code', svg: '<polyline points="9 6 3 12 9 18" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><polyline points="15 6 21 12 15 18" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 'architecture', svg: '<path d="M3 21V10l9-7 9 7v11" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><line x1="3" y1="21" x2="21" y2="21" stroke="#000" stroke-width="1.6"/><line x1="9" y1="21" x2="9" y2="13" stroke="#000" stroke-width="1.4"/><line x1="15" y1="21" x2="15" y2="13" stroke="#000" stroke-width="1.4"/>' },
  { id: 'science', svg: '<path d="M9 2v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-11V2" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><line x1="8" y1="2" x2="16" y2="2" stroke="#000" stroke-width="1.6" stroke-linecap="round"/><line x1="6.5" y1="15" x2="17.5" y2="15" stroke="#000" stroke-width="1.4"/>' },
  { id: 'business', svg: '<rect x="3" y="8" width="18" height="12" rx="2" fill="none" stroke="#000" stroke-width="1.6"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="#000" stroke-width="1.6"/><line x1="3" y1="13" x2="21" y2="13" stroke="#000" stroke-width="1.4"/>' },
  { id: 'psychology', svg: '<path d="M12 3a5 5 0 0 1 5 5c0 2-1 3-1 4.5V16a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-3.5C7 11 6 10 6 8a5 5 0 0 1 5-5z" fill="none" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/><line x1="10" y1="20" x2="14" y2="20" stroke="#000" stroke-width="1.6" stroke-linecap="round"/><path d="M12 8c-1 1-1 2 0 3" stroke="#000" stroke-width="1.2" fill="none"/>' },
  { id: 'graduation', svg: '<path d="M2 9l10-4 10 4-10 4z" fill="#000"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" fill="none" stroke="#000" stroke-width="1.6"/><line x1="22" y1="9" x2="22" y2="16" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>' },
  /* Hobbies y gustos */
  { id: 'book', svg: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" fill="none" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 4.5v17" stroke="#000" stroke-width="1.6"/>' },
  { id: 'gamepad', svg: '<rect x="2" y="7" width="20" height="11" rx="5" fill="none" stroke="#000" stroke-width="1.6"/><line x1="6" y1="11.5" x2="6" y2="14.5" stroke="#000" stroke-width="1.6" stroke-linecap="round"/><line x1="4.5" y1="13" x2="7.5" y2="13" stroke="#000" stroke-width="1.6" stroke-linecap="round"/><circle cx="16" cy="11" r="1" fill="#000"/><circle cx="18" cy="14" r="1" fill="#000"/>' },
  { id: 'football', svg: '<circle cx="12" cy="12" r="9" fill="none" stroke="#000" stroke-width="1.6"/><polygon points="12 8 15 10.5 14 14 10 14 9 10.5" fill="#000"/><line x1="12" y1="3" x2="12" y2="8" stroke="#000" stroke-width="1.2"/><line x1="3.5" y1="9" x2="9" y2="10.5" stroke="#000" stroke-width="1.2"/><line x1="20.5" y1="9" x2="15" y2="10.5" stroke="#000" stroke-width="1.2"/>' },
  { id: 'basketball', svg: '<circle cx="12" cy="12" r="9" fill="none" stroke="#000" stroke-width="1.6"/><path d="M3 12h18M12 3v18M5.3 5.3c3 3 3 10.4 0 13.4M18.7 5.3c-3 3-3 10.4 0 13.4" fill="none" stroke="#000" stroke-width="1.3"/>' },
  { id: 'dumbbell', svg: '<rect x="1" y="9" width="3" height="6" rx="1" fill="#000"/><rect x="20" y="9" width="3" height="6" rx="1" fill="#000"/><rect x="5" y="7" width="2.4" height="10" rx="1" fill="#000"/><rect x="16.6" y="7" width="2.4" height="10" rx="1" fill="#000"/><line x1="7.4" y1="12" x2="16.6" y2="12" stroke="#000" stroke-width="2"/>' },
  { id: 'paint-palette', svg: '<path d="M12 2a10 10 0 1 0 0 20c1.5 0 2-1 2-2s-.5-1.5-.5-2.5c0-1 1-1.5 2-1.5h2A4.5 4.5 0 0 0 22 11c0-5-4.5-9-10-9z" fill="none" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/><circle cx="7" cy="10" r="1.3" fill="#000"/><circle cx="7" cy="14.5" r="1.3" fill="#000"/><circle cx="11" cy="7" r="1.3" fill="#000"/><circle cx="16" cy="8" r="1.3" fill="#000"/>' },
  { id: 'film', svg: '<rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="#000" stroke-width="1.6"/><line x1="7" y1="4" x2="7" y2="20" stroke="#000" stroke-width="1.4"/><line x1="17" y1="4" x2="17" y2="20" stroke="#000" stroke-width="1.4"/><line x1="2" y1="9" x2="7" y2="9" stroke="#000" stroke-width="1.4"/><line x1="2" y1="14" x2="7" y2="14" stroke="#000" stroke-width="1.4"/><line x1="17" y1="9" x2="22" y2="9" stroke="#000" stroke-width="1.4"/><line x1="17" y1="14" x2="22" y2="14" stroke="#000" stroke-width="1.4"/>' },
  { id: 'plane', svg: '<path d="M2 16l7-2 4 6 2-1-2-6 7-5-1-2-8 2-5-4-2 1 3 5-6 4z" fill="#000"/>' },
  { id: 'chef-hat', svg: '<path d="M7 9a4 4 0 0 1 1-7 4.5 4.5 0 0 1 4-1 4.5 4.5 0 0 1 4 1 4 4 0 0 1 1 7z" fill="none" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 9h10v6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" fill="none" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/><line x1="7" y1="20" x2="17" y2="20" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>' },
  { id: 'guitar', svg: '<circle cx="8" cy="16" r="5.5" fill="none" stroke="#000" stroke-width="1.5"/><circle cx="8" cy="16" r="2" fill="none" stroke="#000" stroke-width="1.2"/><path d="M11 13L19 4" stroke="#000" stroke-width="1.8" stroke-linecap="round"/><line x1="16.5" y1="6" x2="18.5" y2="8" stroke="#000" stroke-width="1.3"/><line x1="18" y1="4.5" x2="20" y2="6.5" stroke="#000" stroke-width="1.3"/>' },
  { id: 'dance', svg: '<circle cx="12" cy="4" r="2" fill="#000"/><path d="M12 6v6l-4 8M12 12l4 8M8 9l-3 3M16 9l3 3M9 13l6-2" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' },
  { id: 'paw', svg: '<circle cx="12" cy="15" r="4" fill="#000"/><circle cx="6" cy="9" r="2" fill="#000"/><circle cx="18" cy="9" r="2" fill="#000"/><circle cx="9" cy="5" r="1.8" fill="#000"/><circle cx="15" cy="5" r="1.8" fill="#000"/>' },
  { id: 'globe', svg: '<circle cx="12" cy="12" r="9" fill="none" stroke="#000" stroke-width="1.6"/><ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="#000" stroke-width="1.3"/><line x1="3" y1="12" x2="21" y2="12" stroke="#000" stroke-width="1.4"/><path d="M5 7h14M5 17h14" stroke="#000" stroke-width="1.1" fill="none"/>' }
];

let decorMode = false;
let decorTargetUsername = null;
let selectedDecorId = null;

const pfDecorLayer = document.getElementById('pfDecorLayer');
const pfDecorateFab = document.getElementById('pfDecorateFab');
const pfDecorModebar = document.getElementById('pfDecorModebar');
const pfDecorAddBtn = document.getElementById('pfDecorAddBtn');
const pfDecorDoneBtn = document.getElementById('pfDecorDoneBtn');
const pfStickerOverlay = document.getElementById('pfStickerOverlay');
const pfStickerSheet = document.getElementById('pfStickerSheet');
const pfStickerGrid = document.getElementById('pfStickerGrid');

function getDecorations(username) {
  const user = usersData[username];
  if (!user) return [];
  if (!user.decorations) user.decorations = [];
  return user.decorations;
}

function renderDecorLayer(username) {
  decorTargetUsername = username;
  const decorations = getDecorations(username);
  pfDecorLayer.innerHTML = '';
  decorations.forEach(d => pfDecorLayer.appendChild(buildDecorElement(d)));

  const isMe = username === myUsername;
  pfDecorateFab.classList.toggle('visible', isMe);
}

function buildDecorElement(data) {
  const el = document.createElement('div');
  el.className = 'pf-decor-item';
  el.dataset.id = data.id;
  el.style.left = data.x + '%';
  el.style.top = data.y + '%';
  el.style.transform = `translate(-50%, -50%) rotate(${data.rotation}deg) scale(${data.scale})`;

  const sticker = STICKER_CATALOG.find(s => s.id === data.iconId) || STICKER_CATALOG[0];
  const decorColor = (usersData[decorTargetUsername] && usersData[decorTargetUsername].decorColor) || '#000000';
  const coloredSvg = sticker.svg.split('#000').join(decorColor);
  el.innerHTML = `
    <svg viewBox="0 0 24 24">${coloredSvg}</svg>
    <div class="pf-decor-handle rotate"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg></div>
    <div class="pf-decor-handle scale"><svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></div>
    <div class="pf-decor-handle delete"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
  `;

  bindDecorGestures(el, data);
  return el;
}

function selectDecor(el) {
  pfDecorLayer.querySelectorAll('.pf-decor-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  selectedDecorId = el.dataset.id;
}

function deselectAllDecor() {
  pfDecorLayer.querySelectorAll('.pf-decor-item').forEach(i => i.classList.remove('selected'));
  selectedDecorId = null;
}

function bindDecorGestures(el, data) {
  const rotateHandle = el.querySelector('.pf-decor-handle.rotate');
  const scaleHandle = el.querySelector('.pf-decor-handle.scale');
  const deleteHandle = el.querySelector('.pf-decor-handle.delete');

  // Click simple: selecciona (solo en modo decorar)
  el.addEventListener('click', (e) => {
    if (!decorMode) return;
    e.stopPropagation();
    if (e.target === deleteHandle || deleteHandle.contains(e.target)) return;
    selectDecor(el);
  });

  deleteHandle.addEventListener('click', (e) => {
    e.stopPropagation();
    const decorations = getDecorations(decorTargetUsername);
    const idx = decorations.findIndex(d => d.id === data.id);
    if (idx > -1) decorations.splice(idx, 1);
    el.remove();
    selectedDecorId = null;
  });

  // --- Arrastrar (mover por el lienzo) ---
  let dragging = false, startX = 0, startY = 0, originX = 0, originY = 0;

  function dragStart(clientX, clientY) {
    if (!decorMode) return;
    dragging = true;
    selectDecor(el);
    el.classList.add('dragging');
    startX = clientX; startY = clientY;
    originX = data.x; originY = data.y;
  }
  function dragMove(clientX, clientY) {
    if (!dragging) return;
    const rect = pfDecorLayer.getBoundingClientRect();
    const dxPct = ((clientX - startX) / rect.width) * 100;
    const dyPct = ((clientY - startY) / rect.height) * 100;
    data.x = Math.min(100, Math.max(0, originX + dxPct));
    data.y = Math.min(100, Math.max(0, originY + dyPct));
    el.style.left = data.x + '%';
    el.style.top = data.y + '%';
  }
  function dragEnd() {
    dragging = false;
    el.classList.remove('dragging');
  }

  el.addEventListener('mousedown', (e) => {
    if (e.target.closest('.pf-decor-handle')) return;
    e.preventDefault();
    dragStart(e.clientX, e.clientY);
  });
  window.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', dragEnd);

  el.addEventListener('touchstart', (e) => {
    if (e.target.closest('.pf-decor-handle')) return;
    const t = e.touches[0];
    dragStart(t.clientX, t.clientY);
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    dragMove(t.clientX, t.clientY);
  }, { passive: true });
  el.addEventListener('touchend', dragEnd);

  // --- Rotar (handle inferior derecho) ---
  let rotating = false;

  function getCenter() {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  function rotateMove(clientX, clientY) {
    if (!rotating) return;
    const c = getCenter();
    const angle = Math.atan2(clientY - c.y, clientX - c.x) * (180 / Math.PI);
    data.rotation = Math.round(angle + 45);
    el.style.transform = `translate(-50%, -50%) rotate(${data.rotation}deg) scale(${data.scale})`;
  }
  rotateHandle.addEventListener('mousedown', (e) => { e.stopPropagation(); rotating = true; selectDecor(el); });
  window.addEventListener('mousemove', (e) => rotateMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', () => rotating = false);
  rotateHandle.addEventListener('touchstart', (e) => { e.stopPropagation(); rotating = true; selectDecor(el); }, { passive: true });
  rotateHandle.addEventListener('touchmove', (e) => { const t = e.touches[0]; rotateMove(t.clientX, t.clientY); }, { passive: true });
  rotateHandle.addEventListener('touchend', () => rotating = false);

  // --- Escalar (handle inferior izquierdo) ---
  let scaling = false, scaleStartDist = 0, scaleOrigin = 1;

  function getDist(clientX, clientY) {
    const c = getCenter();
    return Math.hypot(clientX - c.x, clientY - c.y);
  }
  function scaleMove(clientX, clientY) {
    if (!scaling) return;
    const dist = getDist(clientX, clientY);
    const ratio = dist / scaleStartDist;
    data.scale = Math.min(2.5, Math.max(0.4, scaleOrigin * ratio));
    el.style.transform = `translate(-50%, -50%) rotate(${data.rotation}deg) scale(${data.scale})`;
  }
  scaleHandle.addEventListener('mousedown', (e) => {
    e.stopPropagation(); scaling = true; selectDecor(el);
    scaleStartDist = getDist(e.clientX, e.clientY); scaleOrigin = data.scale;
  });
  window.addEventListener('mousemove', (e) => scaleMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', () => scaling = false);
  scaleHandle.addEventListener('touchstart', (e) => {
    e.stopPropagation(); scaling = true; selectDecor(el);
    const t = e.touches[0];
    scaleStartDist = getDist(t.clientX, t.clientY); scaleOrigin = data.scale;
  }, { passive: true });
  scaleHandle.addEventListener('touchmove', (e) => { const t = e.touches[0]; scaleMove(t.clientX, t.clientY); }, { passive: true });
  scaleHandle.addEventListener('touchend', () => scaling = false);
}

function enterDecorMode() {
  decorMode = true;
  pfDecorateFab.classList.add('active');
  pfDecorModebar.classList.add('open');
}

function exitDecorMode() {
  decorMode = false;
  pfDecorateFab.classList.remove('active');
  pfDecorModebar.classList.remove('open');
  deselectAllDecor();
  closeStickerSheet();
}

pfDecorateFab.addEventListener('click', () => {
  if (decorMode) exitDecorMode();
  else enterDecorMode();
});
pfDecorDoneBtn.addEventListener('click', exitDecorMode);

// Click en el lienzo (fuera de cualquier sticker) deselecciona
pfDecorLayer.addEventListener('click', (e) => {
  if (e.target === pfDecorLayer) deselectAllDecor();
});

function openStickerSheet() {
  const decorColor = (usersData[decorTargetUsername] && usersData[decorTargetUsername].decorColor) || '#000000';
  pfStickerGrid.innerHTML = STICKER_CATALOG.map(s => `
    <div class="pf-sticker-option" data-icon-id="${s.id}">
      <svg viewBox="0 0 24 24">${s.svg.split('#000').join(decorColor)}</svg>
    </div>`).join('');

  pfStickerGrid.querySelectorAll('.pf-sticker-option').forEach(opt => {
    opt.addEventListener('click', () => {
      addDecoration(opt.dataset.iconId);
      closeTopNavView();
    });
  });

  const pfStickerAlreadyOpen = pfStickerSheet.classList.contains('open');
  pfStickerOverlay.classList.add('open');
  pfStickerSheet.classList.add('open');
  if (!pfStickerAlreadyOpen) pushNavView(closeStickerSheet);
}

function closeStickerSheet() {
  pfStickerOverlay.classList.remove('open');
  pfStickerSheet.classList.remove('open');
  const idx = navStack.indexOf(closeStickerSheet);
  if (idx > -1) navStack.splice(idx, 1);
}

pfDecorAddBtn.addEventListener('click', openStickerSheet);
pfStickerOverlay.addEventListener('click', closeTopNavView);

let decorIdSeq = 0;
function addDecoration(iconId) {
  const decorations = getDecorations(decorTargetUsername);
  const data = {
    id: 'd' + (++decorIdSeq) + '-' + Date.now(),
    iconId,
    x: 35 + Math.random() * 30,
    y: 25 + Math.random() * 40,
    rotation: 0,
    scale: 1
  };
  decorations.push(data);
  const el = buildDecorElement(data);
  pfDecorLayer.appendChild(el);
  selectDecor(el);
}

profileOverlay.addEventListener('click', closeTopNavView);
pfBackBtn.addEventListener('click', closeTopNavView);
pfCreateBtn.addEventListener('click', () => openCreateSheet());

// Pestañas dentro del perfil (info / posts / compartidos)
document.querySelectorAll('.pf-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pf-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.pf-tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.pfTarget).classList.add('active');
  });
});

// Click en la foto del header (cbcx) -> abre MI perfil (vista 1)
document.getElementById('cbcxFoto').addEventListener('click', (e) => {
  e.stopPropagation();
  openProfile(myUsername);
});

// Delegación global: cualquier elemento con data-username abre el perfil de ese usuario
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-username]');
  if (trigger) {
    e.stopPropagation();
    openProfile(trigger.dataset.username);
  }
});

