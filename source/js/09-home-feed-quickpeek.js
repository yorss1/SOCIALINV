/* ===================================================== */
/* COLOR DINÁMICO DEL HOME (lógica de la versión más       */
/* reciente de Home.html):                                 */
/* - El cbcx y el navbar inferior se tiñen con una versión  */
/*   OSCURECIDA del color dominante de las publicaciones    */
/*   visibles (fotos y videos); el texto/íconos quedan      */
/*   fijos en blanco, ya garantizado por el oscurecido.      */
/* - El fondo de la app se tiñe con una versión CLARA/       */
/*   pastel del mismo color.                                */
/* - El meta theme-color del navegador (barra de estado)     */
/*   se actualiza junto con el fondo.                        */
/* ===================================================== */
(function initHomeDynamicColor(){
  const colorThief = new ColorThief();
  const HOME_DEFAULT_COLOR_RGB = 'rgb(26, 26, 26)'; // placeholder/fallback almacenado en data-color
  const DARKEN_FACTOR = 0.45; // oscurece el dominante para el cbcx/navbar
  const WHITE_MIX = 0.94;     // mezcla con blanco: el fondo es casi blanco, con un susurro del tono
  const KEEP_CHROMA = 0.16;   // cuánto del color original sobrevive (neutral, sin tonos vivos)

  const metaThemeColor = document.getElementById('metaThemeColor');

  // Calcula {bg, theme, text} según el color dominante Y el tema global
  // (appTheme.type/appTheme.mode). "theme" es el acento del navbar/cbcx.
  function computeHomeColors(r, g, b) {
    const dark = appTheme.mode === 'dark';
    if (appTheme.type === 'solid') {
      return dark
        ? { bg: '#000000', theme: '#ffffff', text: '#000000' }
        : { bg: '#ffffff', theme: '#1a1a1a', text: '#ffffff' };
    }
    { const gray = 0.299 * r + 0.587 * g + 0.114 * b; r = gray + (r - gray) * KEEP_CHROMA; g = gray + (g - gray) * KEEP_CHROMA; b = gray + (b - gray) * KEEP_CHROMA; }
    const lightR = Math.floor(r * (1 - WHITE_MIX) + 255 * WHITE_MIX);
    const lightG = Math.floor(g * (1 - WHITE_MIX) + 255 * WHITE_MIX);
    const lightB = Math.floor(b * (1 - WHITE_MIX) + 255 * WHITE_MIX);
    const lightRgb = `rgb(${lightR}, ${lightG}, ${lightB})`;
    const darkR = Math.floor(r * DARKEN_FACTOR);
    const darkG = Math.floor(g * DARKEN_FACTOR);
    const darkB = Math.floor(b * DARKEN_FACTOR);
    const darkRgb = `rgb(${darkR}, ${darkG}, ${darkB})`;
    // Claro: fondo pastel + acento oscuro (como siempre). Oscuro: se invierte.
    return dark ? { bg: darkRgb, theme: lightRgb, text: '#000000' } : { bg: lightRgb, theme: darkRgb, text: '#ffffff' };
  }

  // Oscurece/aclara el color dominante para el cbcx/navbar y el fondo de la app
  function applyHomeThemeColor(r, g, b) {
    const c = computeHomeColors(r, g, b);
    document.documentElement.style.setProperty('--home-theme', c.theme);
    document.documentElement.style.setProperty('--home-bg', c.bg);
    document.documentElement.style.setProperty('--home-text', c.text);
    if (metaThemeColor) metaThemeColor.setAttribute('content', c.bg);
  }

  function resetHomeThemeColor() {
    // Sin post con color detectado: se usa un gris neutro como base (en modo
    // interactivo pesa poco por la mezcla con blanco/negro; en sólido se ignora).
    const c = computeHomeColors(160, 160, 160);
    document.documentElement.style.setProperty('--home-theme', c.theme);
    document.documentElement.style.setProperty('--home-bg', c.bg);
    document.documentElement.style.setProperty('--home-text', c.text);
    if (metaThemeColor) metaThemeColor.setAttribute('content', c.bg);
  }

  // Permite que Ajustes > Personalización refresque el chrome de Home al vuelo
  window.pfRefreshHomeChrome = function() { updateHomeColorsOnScroll(); };

  function isCrossOriginUrl(url) {
    try {
      return new URL(url, window.location.href).origin !== window.location.origin;
    } catch (e) {
      return false;
    }
  }

  // Canvas oculto para muestrear el color dominante de un frame de video en reproducción
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = 32;
  offscreenCanvas.height = 32;
  const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

  function extractVideoColor(videoEl, postEl) {
    if (videoEl.paused || videoEl.ended) return;
    try {
      offscreenCtx.drawImage(videoEl, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
      const data = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) {
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      postEl.dataset.color = `rgb(${Math.floor(r / count)}, ${Math.floor(g / count)}, ${Math.floor(b / count)})`;
      updateHomeColorsOnScroll();
    } catch (e) { /* frame aún no disponible o canvas contaminado: se reintenta en el próximo muestreo */ }
  }

  // Muestrea el color del video mientras se reproduce (cada 100ms, igual que Home.html)
  function setupVideoColorSampling(videoEl, postEl) {
    let sampleInterval = null;
    videoEl.addEventListener('play', () => {
      clearInterval(sampleInterval);
      sampleInterval = setInterval(() => extractVideoColor(videoEl, postEl), 100);
    });
    videoEl.addEventListener('pause', () => clearInterval(sampleInterval));
    videoEl.addEventListener('ended', () => clearInterval(sampleInterval));
    videoEl.addEventListener('loadeddata', () => setTimeout(() => extractVideoColor(videoEl, postEl), 100), { once: true });
  }

  // Extrae el color dominante de la imagen o video representativo de cada post y lo guarda en data-color
  function extractPostColor(postEl) {
    if (!postEl || postEl.dataset.color) return;
    const media = postEl.querySelector('.post-grid img, .post-media img, .grid-item img, .post-grid video, .post-media video, .grid-item video');
    if (!media) return;

    if (isCrossOriginUrl(media.src) && media.crossOrigin !== 'anonymous') {
      media.crossOrigin = 'anonymous';
      const src = media.src;
      media.src = '';
      media.src = src; // fuerza una recarga con CORS habilitado para poder leer sus píxeles
    }

    if (media.tagName === 'VIDEO') {
      postEl.dataset.color = HOME_DEFAULT_COLOR_RGB; // placeholder hasta el primer frame muestreado
      setupVideoColorSampling(media, postEl);
      return;
    }

    const grab = () => {
      try {
        const color = colorThief.getColor(media);
        postEl.dataset.color = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      } catch (e) {
        postEl.dataset.color = HOME_DEFAULT_COLOR_RGB;
      }
      updateHomeColorsOnScroll();
    };
    if (media.complete && media.naturalWidth) grab();
    else media.addEventListener('load', grab, { once: true });
  }

  // Mezcla ponderada de los colores de los posts según su cercanía al centro de la pantalla
  function updateHomeColorsOnScroll() {
    if (getCurrentMainView() !== 'home') return;
    const posts = Array.from(feedContainer.querySelectorAll('.post[data-color]'));
    if (posts.length === 0) { resetHomeThemeColor(); return; }

    const viewportCenter = window.innerHeight / 2;
    let totalWeight = 0, r = 0, g = 0, b = 0;

    posts.forEach(post => {
      const rect = post.getBoundingClientRect();
      const postCenter = rect.top + (rect.height / 2);
      const distance = Math.abs(viewportCenter - postCenter);
      const maxDistance = window.innerHeight;
      let weight = Math.max(0, 1 - (distance / maxDistance));
      weight = Math.pow(weight, 2);

      if (weight > 0) {
        const rgb = post.dataset.color.match(/\d+/g);
        if (rgb) {
          r += parseInt(rgb[0]) * weight;
          g += parseInt(rgb[1]) * weight;
          b += parseInt(rgb[2]) * weight;
          totalWeight += weight;
        }
      }
    });

    if (totalWeight > 0) {
      applyHomeThemeColor(Math.round(r / totalWeight), Math.round(g / totalWeight), Math.round(b / totalWeight));
    } else {
      resetHomeThemeColor();
    }
  }

  // Detecta publicaciones existentes y las que se agreguen luego (publicar, repost, etc.)
  function scanFeedPosts() {
    feedContainer.querySelectorAll('.post').forEach(extractPostColor);
  }
  scanFeedPosts();
  new MutationObserver(scanFeedPosts).observe(feedContainer, { childList: true });

  window.addEventListener('scroll', () => requestAnimationFrame(updateHomeColorsOnScroll), { passive: true });

  // Recalcula al volver al Home y resetea al color por defecto en el resto de las vistas
  const _homeShowMainView = showMainView;
  showMainView = function(view) {
    _homeShowMainView(view);
    if (getCurrentMainView() === 'home') requestAnimationFrame(updateHomeColorsOnScroll);
    else resetHomeThemeColor();
  };

  updateHomeColorsOnScroll();
})();

/* ===================================================== */
/* CBCX: ocultar al scroll hacia abajo, mostrar al subir  */
/* y también al deslizar desde la esquina derecha         */
/* ===================================================== */
(function initCbcxScrollBehavior() {
  let lastScrollY = 0;
  let scrollHideTimeout = null;
  const THRESHOLD = 6; // px mínimos para considerar un scroll real (evita micro-jitters)
  const pbOcult1 = document.querySelector('.PBOcult1'); // div blanco de arriba: debe ocultarse a la par del cbcx

  function onFeedScroll() {
    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;

    if (Math.abs(delta) < THRESHOLD) return;

    if (delta > 0 && currentY > 80) {
      // Scrolleando hacia abajo: oculta el cbcx (y el div blanco que queda detrás)
      cbcx.classList.add('cbcx-hidden');
      if (pbOcult1) pbOcult1.classList.add('pbo-hidden');
    } else {
      // Scrolleando hacia arriba: muestra el cbcx (y el div blanco que queda detrás)
      cbcx.classList.remove('cbcx-hidden');
      if (pbOcult1) pbOcult1.classList.remove('pbo-hidden');
    }

    lastScrollY = currentY;
  }

  window.addEventListener('scroll', onFeedScroll, { passive: true });

  // Método 2: deslizar desde el borde derecho de la pantalla para revelar el cbcx
  // (igual al gesto de "tirar de la esquina" que pediste)
  let edgeTouchStartX = -1;
  window.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    // Activar solo si el toque empieza en el 12% derecho de la pantalla
    if (touch.clientX > window.innerWidth * 0.88) {
      edgeTouchStartX = touch.clientX;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (edgeTouchStartX < 0) return;
    const touch = e.touches[0];
    const deltaX = edgeTouchStartX - touch.clientX;
    // Si deslizó ≥ 30px hacia la izquierda desde el borde derecho → mostrar cbcx
    if (deltaX > 30) {
      cbcx.classList.remove('cbcx-hidden');
      if (pbOcult1) pbOcult1.classList.remove('pbo-hidden');
      edgeTouchStartX = -1;
    }
  }, { passive: true });

  window.addEventListener('touchend', () => { edgeTouchStartX = -1; }, { passive: true });
})();

// Activa "arrastrar para cerrar" en cada hoja inferior de la app, usando su manija
// como zona de arrastre (así no interfiere con listas que hacen scroll adentro, como
// los comentarios o las opciones de envío de medios).
enableSwipeToDismiss(document.getElementById('commentsDrawer'), document.querySelector('#commentsDrawer .cd-header'));
enableSwipeToDismiss(document.getElementById('createSheet'), document.querySelector('#createSheet .create-sheet-drag-zone'));
enableSwipeToDismiss(document.getElementById('mediaUploadSheet'), document.querySelector('#mediaUploadSheet .mus-header'));
enableSwipeToDismiss(document.getElementById('chatSettingsPanel'), document.querySelector('#chatSettingsPanel .csp-header'));
enableSwipeToDismiss(document.getElementById('shareSheet'), document.querySelector('#shareSheet .share-sheet-header'));

/* ---- Desplazamiento ante el teclado ----
   Cuando el teclado en pantalla aparece, el visualViewport se encoge; se traduce
   todo el chat hacia arriba esa misma distancia con la curva pedida, para que el
   input nunca quede tapado. Se usa Visual Viewport API (no está en todos los
   navegadores todavía, así que se aplica solo si existe — en el resto, el chat
   sigue funcionando igual, solo sin esta animación extra). */
if(window.visualViewport){
  const vv=window.visualViewport;
  let kbRaf=null;
  const KB_EASE='transform .32s cubic-bezier(0.2, 0.8, 0.2, 1)';
  function handleViewportResize(){
    if(!chatWindow.classList.contains('open'))return;
    const offset=Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    chatWindow.style.transition=KB_EASE;
    chatWindow.style.transform = offset>40 ? `translateY(${-offset}px)` : '';
  }
  vv.addEventListener('resize',()=>{cancelAnimationFrame(kbRaf);kbRaf=requestAnimationFrame(handleViewportResize);});
  vv.addEventListener('scroll',()=>{cancelAnimationFrame(kbRaf);kbRaf=requestAnimationFrame(handleViewportResize);});
}

/* =====================================================
   QUICK PEEK — mantener presionado un avatar (feed o buscador) muestra
   una vista previa flotante con bio + últimas 3 fotos, sin salir de donde estás.
   ===================================================== */
const quickPeekOverlay = document.getElementById('quickPeekOverlay');
const quickPeekCard = document.getElementById('quickPeekCard');
const qpAvatar = document.getElementById('qpAvatar');
const qpName = document.getElementById('qpName');
const qpUsername = document.getElementById('qpUsername');
const qpBio = document.getElementById('qpBio');
const qpPhotos = document.getElementById('qpPhotos');
const qpViewProfile = document.getElementById('qpViewProfile');

function getUserPreviewPhotos(username){
  const user = usersData[username];
  if(!user || !user.posts) return [];
  const urls = [];
  for(const p of user.posts){
    if(urls.length >= 3) break;
    if(typeof p === 'string') urls.push(p);
    else if(p && p.media && p.media[0]) urls.push(p.media[0].url);
  }
  return urls;
}
function openQuickPeek(username){
  const user = usersData[username];
  if(!user) return;
  qpAvatar.src = user.avatar;
  qpName.textContent = user.name || username;
  qpUsername.textContent = '@' + username;
  qpBio.textContent = user.bio || '';
  const photos = getUserPreviewPhotos(username);
  qpPhotos.innerHTML = photos.length
    ? photos.map(src => `<div class="qp-photo"><img src="${src}" alt=""></div>`).join('')
    : `<div class="qp-photos-empty">Sin pulsos todavía</div>`;
  qpViewProfile.onclick = () => { closeQuickPeek(); openProfile(username); };
  quickPeekOverlay.classList.add('open');
  quickPeekCard.classList.add('open');
}
function closeQuickPeek(){
  quickPeekOverlay.classList.remove('open');
  quickPeekCard.classList.remove('open');
}
quickPeekOverlay.addEventListener('click', closeQuickPeek);

let qpTimer = null, qpTriggered = false, qpStartX = 0, qpStartY = 0;
const QP_HOLD_MS = 450, QP_MOVE_TOLERANCE = 10;
document.addEventListener('pointerdown', (e) => {
  const trigger = e.target.closest('.post-avatar, .search-result-item');
  if (!trigger || !trigger.dataset.username) return;
  qpStartX = e.clientX; qpStartY = e.clientY;
  clearTimeout(qpTimer);
  qpTimer = setTimeout(() => {
    qpTriggered = true;
    openQuickPeek(trigger.dataset.username);
    if (navigator.vibrate) navigator.vibrate(8);
  }, QP_HOLD_MS);
});
document.addEventListener('pointermove', (e) => {
  if (!qpTimer) return;
  if (Math.abs(e.clientX - qpStartX) > QP_MOVE_TOLERANCE || Math.abs(e.clientY - qpStartY) > QP_MOVE_TOLERANCE) {
    clearTimeout(qpTimer);
  }
});
document.addEventListener('pointerup', () => clearTimeout(qpTimer));
document.addEventListener('pointercancel', () => clearTimeout(qpTimer));
// Fase de CAPTURA: se ejecuta antes que el listener de [data-username] que abre el
// perfil completo, para que soltar el dedo tras el long-press no dispare también esa
// navegación — el long-press y el tap normal quedan estrictamente separados.
document.addEventListener('click', (e) => {
  if (qpTriggered) {
    qpTriggered = false;
    const trigger = e.target.closest('.post-avatar, .search-result-item');
    if (trigger) { e.stopPropagation(); e.preventDefault(); }
  }
}, true);

