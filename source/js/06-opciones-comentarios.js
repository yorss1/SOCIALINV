/* ===================================================== */
/* MENÚ DE OPCIONES (3 puntos) Y COMPARTIR EN PUBLICACIONES */
/* ===================================================== */
const postOptionsOverlay = document.getElementById('postOptionsOverlay');
const postOptionsMenu = document.getElementById('postOptionsMenu');
let activeOptionsPostId = null;

function openPostOptionsMenu(postId) {
  activeOptionsPostId = postId;
  const postOptionsAlreadyOpen = postOptionsMenu.classList.contains('open');
  postOptionsOverlay.classList.add('open');
  postOptionsMenu.classList.add('open');
  if (!postOptionsAlreadyOpen) pushNavView(closePostOptionsMenu);
}
function closePostOptionsMenu() {
  postOptionsOverlay.classList.remove('open');
  postOptionsMenu.classList.remove('open');
  activeOptionsPostId = null;
}
postOptionsOverlay.addEventListener('click', closeTopNavView);
document.getElementById('postOptionsCancel').addEventListener('click', closeTopNavView);

document.getElementById('postOptionsDelete').addEventListener('click', () => {
  if (!activeOptionsPostId) return closeTopNavView();
  document.querySelectorAll(`[data-post-id="${activeOptionsPostId}"]`).forEach(el => el.remove());
  // Quita también la publicación del muro de perfil si es del usuario actual
  Object.values(usersData).forEach(u => {
    u.posts = u.posts.filter(p => (typeof p === 'string') || p.id !== activeOptionsPostId);
  });
  closeTopNavView();
  updateFeedEmptyState();
});

// Muestra un estado vacío elegante cuando el feed principal se queda sin publicaciones
function updateFeedEmptyState() {
  const existing = feedContainer.querySelector('.feed-empty-state');
  const hasPosts = feedContainer.querySelector('.post');
  if (!hasPosts && !existing) {
    feedContainer.insertAdjacentHTML('beforeend', `
      <div class="feed-empty-state">
        <div class="fee-mascot">
          <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <!-- Cuerpo ovalado minimalista -->
            <ellipse cx="60" cy="72" rx="32" ry="28" fill="none" stroke="#000" stroke-width="2.5"/>
            <!-- Cabeza -->
            <circle cx="60" cy="38" r="20" fill="none" stroke="#000" stroke-width="2.5"/>
            <!-- Ojo izquierdo con parpadeo -->
            <ellipse class="fee-eye-left" cx="53" cy="36" rx="3" ry="3.5" fill="#000"/>
            <!-- Ojo derecho -->
            <ellipse class="fee-eye-right" cx="67" cy="36" rx="3" ry="3.5" fill="#000"/>
            <!-- Sonrisa sutil -->
            <path d="M54 43 Q60 47 66 43" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
            <!-- Brazo izquierdo (flotante) -->
            <path class="fee-arm-l" d="M29 72 Q18 65 20 55" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Brazo derecho -->
            <path class="fee-arm-r" d="M91 72 Q102 65 100 55" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Pierna izquierda -->
            <path d="M50 99 L46 112" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Pierna derecha -->
            <path d="M70 99 L74 112" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Pie izquierdo -->
            <path d="M46 112 Q40 115 38 112" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
            <!-- Pie derecho -->
            <path d="M74 112 Q80 115 82 112" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
            <!-- Estrellita decorativa (parpadea) -->
            <g class="fee-star">
              <path d="M96 28 L97.5 32 L101.5 32 L98.5 34.5 L99.5 38.5 L96 36.2 L92.5 38.5 L93.5 34.5 L90.5 32 L94.5 32 Z" fill="#000" opacity="0.18"/>
            </g>
            <g class="fee-star2">
              <path d="M18 50 L19 53 L22 53 L19.5 55 L20.5 58 L18 56.4 L15.5 58 L16.5 55 L14 53 L17 53 Z" fill="#000" opacity="0.13"/>
            </g>
          </svg>
        </div>
        <p class="fee-title">Tu feed está listo para brillar</p>
        <p class="fee-sub">Conecta con gente interesante o explora los reels más recientes para inspirarte.</p>
        <div class="fee-actions">
          <button class="fee-btn fee-btn-friends" onclick="document.querySelector('.navbar .nav-icon[data-tab=\\'search\\']').click()">Añadir amigos</button>
          <button class="fee-btn fee-btn-reels" onclick="document.querySelector('.navbar .nav-icon[data-tab=\\'reels\\']').click()">Explorar reels</button>
        </div>
      </div>`);
  } else if (hasPosts && existing) {
    existing.remove();
  }
}

document.getElementById('postOptionsCopyLink').addEventListener('click', () => {
  const postId = activeOptionsPostId;
  const shareText = `${location.origin}${location.pathname}#${postId}`;
  const finish = () => closeTopNavView();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareText).then(finish).catch(finish);
  } else { finish(); }
});

// Conecta un botón de "compartir" para que incremente su contador con feedback visual
function bindShareButton(btn, countSelector) {
  if (!btn || btn.dataset.shareBound) return;
  btn.dataset.shareBound = "true";
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Solo cuenta una vez por usuario, igual que un like: clicks repetidos no
    // siguen sumando al contador, pero sí abren el modal de compartir cada vez.
    if (!btn.classList.contains('shared-once')) {
      btn.classList.add('shared-once');
      const countSpan = btn.querySelector(countSelector);
      if (countSpan) {
        const current = parseInt(countSpan.textContent.replace(/\D/g,'')) || 0;
        countSpan.textContent = current + 1;
      }
    }
    btn.classList.add('shared');
    setTimeout(() => btn.classList.remove('shared'), 350);
    openShareSheet(btn);
  });
}

// Conecta los 3 puntos y el botón de compartir de un contenedor de publicaciones
function bindPostOptionsAndShare(scope) {
  scope.querySelectorAll('[data-post-options]').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "true";
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPostOptionsMenu(btn.dataset.postOptions);
    });
  });
  scope.querySelectorAll('[data-post-share]').forEach(btn => {
    if (typeof bindShareButton === 'function') bindShareButton(btn, '.share-count');
  });
}
bindPostOptionsAndShare(document);

// Comparte un reel exactamente igual que una publicación: abre el mismo modal
// (contactos + copiar enlace), no una acción local aparte.
function bindReelShare(reelEl) {
  const btn = reelEl.querySelector('[data-reel-share]');
  if (btn) bindShareButton(btn, '.share-count');
}

// Repost: SÍ debe quedar reflejado en tu perfil (sección "Compartidos"), a
// diferencia de compartir (que es enviar/copiar enlace, efímero). Alternar el
// botón agrega o quita el reel de profileUser.shared.
function bindReelRepost(reelEl, file, caption) {
  const btn = reelEl.querySelector('.reel-repost-btn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const profileUser = usersData[myUsername];
    const reelId = reelEl.dataset.reelId;
    const countEl = btn.querySelector('.repost-count');
    const alreadyIdx = profileUser ? profileUser.shared.findIndex(s => s.reelId === reelId) : -1;
    const nowActive = alreadyIdx === -1;
    if (profileUser) {
      if (nowActive) {
        profileUser.shared.unshift({
          avatar: 'source/imgs/user-default.png',
          title: caption ? caption.slice(0, 40) : 'Reel compartido',
          cover: file.url,
          kind: file.kind,
          reelId
        });
      } else {
        profileUser.shared.splice(alreadyIdx, 1);
      }
    }
    btn.classList.toggle('active', nowActive);
    if (countEl) countEl.textContent = Math.max(0, (parseInt(countEl.textContent.replace(/\D/g,'')) || 0) + (nowActive ? 1 : -1));
  });
}

const mediaViewer = document.getElementById('mediaViewer');
const mvCarousel = document.getElementById('mvCarousel');
const mvDots = document.getElementById('mvDots');

function openMediaViewer(files, startIdx) {
  mvCarousel.innerHTML = ""; mvDots.innerHTML = "";
  files.forEach((url, i) => {
    mvCarousel.innerHTML += `<div class="mv-slide"><img src="${url}"></div>`;
    mvDots.innerHTML += `<div class="mv-dot ${i===startIdx?'active':''}"></div>`;
  });
  const mvAlreadyOpen = mediaViewer.classList.contains('open');
  mediaViewer.classList.add('open');
  if (!mvAlreadyOpen) pushNavView(closeMediaViewer);
  setTimeout(() => {
    mvCarousel.scrollTo({ left: startIdx * window.innerWidth, behavior: 'instant' });
  }, 10);
  
  mvCarousel.onscroll = () => {
    const idx = Math.round(mvCarousel.scrollLeft / window.innerWidth);
    document.querySelectorAll('.mv-dot').forEach((d,i) => d.classList.toggle('active', i===idx));
  }
}
function closeMediaViewer() { mediaViewer.classList.remove('open'); }

/* COMENTARIOS: sistema real con datos por publicación/reel */
const commentsDrawer = document.getElementById('commentsDrawer');
const commentsOverlay = document.getElementById('commentsOverlay');
const cdInput = document.getElementById('cdInput');
const cdList = document.getElementById('cdList');
const cdSendBtn = document.getElementById('cdSendBtn');
const cdReplyBanner = document.getElementById('cdReplyBanner');
const cdReplyText = document.getElementById('cdReplyText');
const cdReplyCancel = document.getElementById('cdReplyCancel');

const commentsStore = new Map(); // contentId -> [{id, username, avatar, text, time, likes, liked, replies:[]}]
let commentIdSeq = 0;
let activeCommentsId = null;
let activeReply = null; // { commentId, username } | null

// Comentario de ejemplo para el post estático, para mostrar el diseño con datos reales
commentsStore.set('post-static-1', [
  {
    id: 'c' + (++commentIdSeq),
    username: 'juanp',
    avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    text: '¡Qué increíble foto! El contraste es perfecto.',
    time: 'Hace 10 m',
    likes: 0,
    liked: false,
    replies: []
  }
]);

function getOrCreateThread(id) {
  if (!commentsStore.has(id)) commentsStore.set(id, []);
  return commentsStore.get(id);
}

// Devuelve el comentario/respuesta encontrado por id
function findComment(id) {
  const thread = commentsStore.get(activeCommentsId) || [];
  for (const c of thread) {
    if (c.id === id) return c;
    const r = c.replies.find(x => x.id === id);
    if (r) return r;
  }
  return null;
}

// Devuelve el comentario RAÍZ (de primer nivel) al que pertenece un id,
// ya sea el propio id de un comentario raíz o el de una de sus respuestas.
// Esto permite que "responder a una respuesta" siga aplanándose bajo el mismo hilo, como Instagram.
function findRootComment(id) {
  const thread = commentsStore.get(activeCommentsId) || [];
  for (const c of thread) {
    if (c.id === id) return c;
    if (c.replies.some(r => r.id === id)) return c;
  }
  return null;
}

function countAll(thread) {
  return thread.reduce((acc, c) => acc + 1 + c.replies.length, 0);
}

function syncCommentCountBadge() {
  if (!activeCommentsId) return;
  const thread = commentsStore.get(activeCommentsId) || [];
  const total = countAll(thread);
  const source = document.querySelector(`[data-post-id="${activeCommentsId}"], [data-reel-id="${activeCommentsId}"]`);
  if (source) {
    const badge = source.querySelector('.comment-count');
    if (badge) badge.textContent = total;
  }
}

function openComments(contentId) {
  activeCommentsId = contentId;
  activeReply = null;
  cdReplyBanner.style.display = 'none';
  cdInput.value = '';
  getOrCreateThread(contentId);
  renderComments();
  const commentsAlreadyOpen = commentsDrawer.classList.contains('open');
  commentsDrawer.classList.add('open');
  commentsOverlay.classList.add('open');
  if (!commentsAlreadyOpen) pushNavView(closeComments);
  setTimeout(() => cdInput.focus(), 350);
}

function closeComments() {
  commentsDrawer.classList.remove('open');
  commentsOverlay.classList.remove('open');
  cdInput.value = '';
  activeReply = null;
  cdReplyBanner.style.display = 'none';
  activeCommentsId = null;
}

function renderComments() {
  const thread = commentsStore.get(activeCommentsId) || [];
  if (thread.length === 0) {
    cdList.innerHTML = `<div class="comments-empty">Sé el primero en comentar</div>`;
    return;
  }
  cdList.innerHTML = thread.map(c => renderCommentNode(c, false)).join('');
  bindCommentEvents();
}

function renderCommentNode(c, isReply) {
  const repliesHtml = !isReply && c.replies.length
    ? `<div class="cd-replies">${c.replies.map(r => renderCommentNode(r, true)).join('')}</div>`
    : '';
  return `
    <div class="cd-item${isReply ? ' is-reply' : ''}" data-comment-id="${c.id}">
        <div class="cd-avatar"><img src="${escapeHtml((usersData[c.username] && usersData[c.username].avatar) || c.avatar)}" alt=""></div>
        <div class="cd-content">
            <div class="cd-username">${escapeHtml(c.username)}</div>
            <div class="cd-text">${escapeHtml(c.text)}</div>
            <div class="cd-meta">
              <span class="cd-time">${c.time}</span>
              <span class="cd-reply-btn" data-action="reply" data-id="${c.id}">Responder</span>
              <span class="cd-share-btn" data-action="share" data-id="${c.id}">Compartir</span>
              <span class="cd-likes"><span class="like-count">${c.likes}</span> likes</span>
            </div>
            ${repliesHtml}
        </div>
        <div class="cd-like${c.liked ? ' active' : ''}" data-action="like" data-id="${c.id}">
          <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
        </div>
    </div>`;
}

// Los eventos se DELEGAN una sola vez en cdList. Antes se enlazaban en cada render y, como las
// respuestas viven dentro del comentario padre, el doble toque en una respuesta también daba like al padre.
function bindCommentEvents() { /* compat: la delegación ya está activa */ }
let cdLastTap = { id: null, t: 0 };
cdList.addEventListener('click', (e) => {
  const act = e.target.closest('[data-action]');
  if (act && cdList.contains(act)) {
    e.stopPropagation();
    const id = act.dataset.id;
    if (act.dataset.action === 'like') toggleCommentLike(id);
    else if (act.dataset.action === 'reply') startReply(id);
    else if (act.dataset.action === 'share') shareComment(act);
    return;
  }
  const item = e.target.closest('.cd-item'); // siempre el más interno: la respuesta, no el padre
  if (!item) return;
  const now = Date.now();
  if (cdLastTap.id === item.dataset.commentId && now - cdLastTap.t < 320) {
    cdLastTap = { id: null, t: 0 };
    showHeartAnimation(item, 50);
    toggleCommentLike(item.dataset.commentId, true);
  } else {
    cdLastTap = { id: item.dataset.commentId, t: now };
  }
});

// Actualiza el like en el sitio (sin re-renderizar la lista: así no salta el scroll ni se pierde el foco).
function toggleCommentLike(id, forceLikeOnly) {
  const c = findComment(id);
  if (!c) return;
  if (forceLikeOnly && c.liked) return; // doble tap nunca quita el like
  c.liked = !c.liked;
  c.likes = Math.max(0, c.likes + (c.liked ? 1 : -1));
  const item = cdList.querySelector(`.cd-item[data-comment-id="${CSS.escape(String(id))}"]`);
  if (!item) return;
  const heart = item.querySelector(':scope > .cd-like');
  if (heart) { heart.classList.toggle('active', c.liked); heart.classList.remove('pop'); void heart.offsetWidth; heart.classList.add('pop'); }
  const cnt = item.querySelector(':scope > .cd-content > .cd-meta .like-count');
  if (cnt) cnt.textContent = c.likes;
}

function startReply(id) {
  const c = findComment(id);
  const root = findRootComment(id);
  if (!c || !root) return;
  activeReply = { commentId: id, rootId: root.id, username: c.username };
  cdReplyText.textContent = `Respondiendo a @${c.username}`;
  cdReplyBanner.style.display = 'flex';
  cdInput.focus();
}

function cancelReply() {
  activeReply = null;
  cdReplyBanner.style.display = 'none';
}
cdReplyCancel.onclick = cancelReply;

// Compartir un comentario = enviarlo por mensaje a quien elijas (la hoja de compartir lista a tus seguidos y busca personas).
function shareComment(el) {
  const c = findComment(el.dataset.id);
  if (!c) return;
  openShareSheetCtx({
    kind: 'comment', id: c.id, cover: (usersData[c.username] && usersData[c.username].avatar) || c.avatar, mediaKind: 'image',
    label: `${c.username}: ${c.text}`.slice(0, 90),
    comment: { username: c.username, avatar: (usersData[c.username] && usersData[c.username].avatar) || c.avatar, text: c.text, time: c.time, postId: activeCommentsId }
  });
}

function sendComment() {
  const text = cdInput.value.trim();
  if (!text || !activeCommentsId) return;

  // Si respondemos a una respuesta (no al comentario raíz directo), antepone @usuario al texto, como Instagram
  const isReplyToReply = activeReply && activeReply.commentId !== activeReply.rootId;
  const finalText = isReplyToReply ? `@${activeReply.username} ${text}` : text;

  const newComment = {
    id: 'c' + (++commentIdSeq),
    username: myUsername,
    avatar: 'source/imgs/user-default.png',
    text: finalText,
    time: 'Ahora mismo',
    likes: 0,
    liked: false,
    replies: []
  };

  const thread = getOrCreateThread(activeCommentsId);

  if (activeReply) {
    const root = thread.find(c => c.id === activeReply.rootId);
    if (root) {
      root.replies.push(newComment);
    } else {
      thread.push(newComment);
    }
  } else {
    thread.push(newComment);
  }

  cdInput.value = '';
  activeReply = null;
  cdReplyBanner.style.display = 'none';
  renderComments();
  syncCommentCountBadge();
  cdList.scrollTop = cdList.scrollHeight;
}

cdSendBtn.onclick = sendComment;
cdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); sendComment(); }
});

commentsOverlay.onclick = closeComments;

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Conecta cada post/reel con su propio hilo de comentarios
function bindCommentButtons(scope) {
  scope.querySelectorAll('.post-action.comment').forEach(btn => {
    if (btn.dataset.boundComments) return;
    btn.dataset.boundComments = "true";
    btn.onclick = (e) => {
      e.stopPropagation();
      const post = btn.closest('.post');
      const id = ensureContentId(post, 'post');
      openComments(id);
    };
  });
  scope.querySelectorAll('.reel-action.comment-btn').forEach(btn => {
    if (btn.dataset.boundComments) return;
    btn.dataset.boundComments = "true";
    btn.onclick = (e) => {
      e.stopPropagation();
      const reel = btn.closest('.reel-item');
      const id = ensureContentId(reel, 'reel');
      openComments(id);
    };
  });
}

let contentIdSeq = 0;
function ensureContentId(el, prefix) {
  if (!el) return null;
  if (prefix === 'post' && el.dataset.postId) return el.dataset.postId;
  if (prefix === 'reel' && el.dataset.reelId) return el.dataset.reelId;
  const id = `${prefix}-${++contentIdSeq}-${Date.now()}`;
  if (prefix === 'post') el.dataset.postId = id;
  else el.dataset.reelId = id;
  return id;
}

bindCommentButtons(document);

/* NAVBAR Y NAVEGACION REELS */
// Accesibilidad: cualquier elemento con role="button" (spans/divs usados como
// botones, ej. el navbar inferior) responde a Enter/Espacio igual que un
// <button> nativo, para poder navegar la app con teclado/lector de pantalla.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('[role="button"]');
  if (!el) return;
  e.preventDefault();
  el.click();
});

const navIcons = document.querySelectorAll('.navbar .nav-icon');
const feedContainer = document.getElementById('feedContainer');
const reelsView = document.getElementById('reelsView');
const reelsScroll = document.getElementById('reelsScroll');
const navbarEl = document.querySelector('.navbar');

