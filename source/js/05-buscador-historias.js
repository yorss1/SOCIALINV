/* ===================================================== */
/* BUSCADOR                                                */
/* ===================================================== */
const searchView = document.getElementById('searchView');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const searchBackBtn = document.getElementById('searchBackBtn');

const searchReelsGrid = document.getElementById('searchReelsGrid');
let activeSearchTab = 'users';

function renderSearchResults(query) {
  const q = (query || '').trim().toLowerCase();
  if (activeSearchTab === 'users') {
    searchResults.style.display = 'flex';
    searchReelsGrid.style.display = 'none';
    const list = q.length === 0
      ? Object.values(usersData)
      : Object.values(usersData).filter(u =>
          u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
    if (list.length === 0) {
      searchResults.innerHTML = `<div class="search-empty">Sin resultados para "${escapeHtml(query)}"</div>`;
      return;
    }
    searchResults.innerHTML = list.map(u => `
      <div class="search-result-item" data-username="${u.username}">
        <img class="sr-avatar" src="${u.avatar}" alt="">
        <div class="sr-info">
          <span class="sr-username">${escapeHtml(u.username)}</span>
          <span class="sr-name">${escapeHtml(u.name)}</span>
        </div>
      </div>`).join('');
  } else {
    // Búsqueda de reels
    searchResults.style.display = 'none';
    searchReelsGrid.style.display = 'grid';
    const allReels = Array.from(document.querySelectorAll('.reel-item'));
    const reels = q.length === 0 ? allReels : allReels.filter(reel => {
      const desc = reel.querySelector('.desc');
      const user = reel.querySelector('.user');
      const text = [(desc && desc.textContent), (user && user.textContent)].join(' ').toLowerCase();
      return text.includes(q);
    });
    if (reels.length === 0) {
      searchReelsGrid.innerHTML = `<div class="search-empty" style="grid-column:1/-1;">Sin reels que coincidan</div>`;
      return;
    }
    searchReelsGrid.innerHTML = reels.map(reel => {
      const media = reel.querySelector('img, video');
      const desc = reel.querySelector('.desc');
      const user = reel.querySelector('.user');
      const isVideo = media && media.tagName === 'VIDEO';
      const src = media ? (isVideo ? (media.src || '') : (media.src || '')) : '';
      const reelId = reel.dataset.reelId || '';
      return `<div class="search-reel-card" data-reel-id="${reelId}">
        ${isVideo ? `<video src="${src}" muted playsinline></video>` : `<img src="${src}" alt="">`}
        ${isVideo ? `<div class="src-play"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>` : ''}
        <div class="src-info">${escapeHtml((desc && desc.textContent) || '')}</div>
      </div>`;
    }).join('');
    searchReelsGrid.querySelectorAll('.search-reel-card').forEach(card => {
      card.addEventListener('click', () => {
        closeSearchView();
        showMainView('reels');
        const rid = card.dataset.reelId;
        if (rid) {
          requestAnimationFrame(() => {
            const el = document.querySelector(`[data-reel-id="${rid}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      });
    });
  }
}

// Tabs de búsqueda: personas / reels
document.querySelectorAll('.search-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeSearchTab = tab.dataset.searchTab;
    renderSearchResults(searchInput.value);
  });
});

// Botón añadir amigos (placeholder — lógica de sugerencias se implementa después)
document.getElementById('searchAddFriends').addEventListener('click', () => {
  activeSearchTab = 'users';
  document.querySelectorAll('.search-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  renderSearchResults('');
});

function openSearchView() {
  showMainView('search');
  activeSearchTab = 'users';
  document.querySelectorAll('.search-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  renderSearchResults('');
  setTimeout(() => searchInput.focus(), 280);
}

function closeSearchView() {
  searchInput.value = '';
}

searchInput.addEventListener('input', () => renderSearchResults(searchInput.value));
searchBackBtn.addEventListener('click', () => {
  closeSearchView();
  showMainView('home');
});

/* GESTOR DE EVENTOS INTELIGENTE PARA TAP/DOUBLE TAP (Ignora Scroll) */
function attachTapHandler(element, onSingle, onDouble, excludeSelector = null) {
    let lastClick = 0;
    let timer;
    element.addEventListener('click', (e) => {
        if(excludeSelector && e.target.closest(excludeSelector)) return;
        let now = Date.now();
        if (now - lastClick < 300) {
            clearTimeout(timer);
            if(onDouble) onDouble(e);
            lastClick = 0;
        } else {
            lastClick = now;
            timer = setTimeout(() => {
                if(onSingle) onSingle(e);
            }, 300);
        }
    });
}

// LOGICA GLOBAL DE LIKES Y CORAZONES
function showHeartAnimation(container, size = 90) {
  const heart = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  heart.setAttribute("class", "heart-pop");
  heart.setAttribute("viewBox", "0 0 24 24");
  heart.style.width = size + 'px'; heart.style.height = size + 'px';
  heart.innerHTML = `<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>`;
  if(getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.appendChild(heart);
  setTimeout(() => heart.remove(), 800);
}

function handleAddLike(btn, countSelector) {
    if (!btn.classList.contains('active') && !btn.classList.contains('liked')) {
        btn.classList.add('active', 'liked');
        const container = btn.closest('.post, .cd-item, .reel-item, .story-fs');
        if(!container) return;
        const countSpan = container.querySelector(countSelector);
        if(countSpan) countSpan.textContent = parseInt(countSpan.textContent.replace(/\D/g,'')) + 1;
        // Sincronizar stat-item visual
        const statLike = container.querySelector('.stat-item:first-child');
        if (statLike) statLike.classList.add('liked');
    }
}

function toggleLike(btn, countSelector) {
    const isActive = btn.classList.contains('active') || btn.classList.contains('liked');
    btn.classList.toggle('active'); btn.classList.toggle('liked');
    const container = btn.closest('.post, .cd-item, .reel-item, .story-fs');
    if(!container) return;
    const countSpan = container.querySelector(countSelector);
    if(countSpan) {
        let c = parseInt(countSpan.textContent.replace(/\D/g,'')) || 0;
        countSpan.textContent = isActive ? c - 1 : c + 1;
    }
}

/* HEADER Y LISTA HISTORIAS (ORDENAMIENTO) */
const cbcx = document.getElementById('cbcx');
const masBtn = document.getElementById('masBtn');
const storiesTrigger = document.getElementById('storiesTrigger');
const storiesRow = document.getElementById('storiesRow');

masBtn.onclick = () => openCreateSheet();


/* ---- Historias vistas: se recuerdan entre sesiones (antes el anillo volvía a 'sin ver' al recargar) ---- */
const STORY_SEEN_KEY = 'socialinv_story_seen_v1';
function storySeenLoad(){ try { return JSON.parse(localStorage.getItem(STORY_SEEN_KEY)) || {}; } catch (e) { return {}; } }
function storySeenSave(username, st){
  try { const m = storySeenLoad(); m[username + '|' + st.image] = 1; localStorage.setItem(STORY_SEEN_KEY, JSON.stringify(m)); } catch (e) {}
}
(function applyStorySeen(){
  const m = storySeenLoad();
  storyUsers.forEach(u => u.stories.forEach(s => { if (m[u.username + '|' + s.image]) s.seen = true; }));
})();

function getSortedUsers() {
    let me = storyUsers.find(u => u.username === myUsername);
    if(!me) {
        me = { username: myUsername, avatar: 'source/imgs/user-default.png', stories: [], isMe: true };
    } else { me.isMe = true; }
    
    let others = storyUsers.filter(u => u.username !== myUsername && u.stories.length > 0);
    let unseen = others.filter(u => !u.stories.every(s => s.seen));
    let seen = others.filter(u => u.stories.every(s => s.seen));
    return [me, ...unseen, ...seen];
}

function renderStoriesHeader() {
  const sorted = getSortedUsers();
  storiesRow.innerHTML = ""; storiesTrigger.innerHTML = "";
  
  if (sorted.length <= 1 && sorted[0].stories.length === 0) { 
      storiesTrigger.classList.remove('visible'); 
  } else {
      storiesTrigger.classList.add('visible');
      const allSeenGlobal = sorted.filter(u=>!u.isMe).every(u => u.stories.every(s => s.seen));
      storiesTrigger.classList.toggle('all-seen', allSeenGlobal);
      
      sorted.filter(u=>u.stories.length>0).slice(0, 3).forEach(u => {
        const av = document.createElement('div'); av.className = 'stack-avatar';
        av.innerHTML = `<div class="story-inner"><img src="${u.avatar}" style="background:#444"></div>`;
        storiesTrigger.appendChild(av);
      });
      storiesTrigger.onclick = () => cbcx.classList.toggle('story-expanded');
  }

  sorted.forEach((u, idx) => {
    const hasStories = u.stories.length > 0;
    const allSeen = hasStories ? u.stories.every(s => s.seen) : true;
    const item = document.createElement('div');
    item.className = 'story-item' + (allSeen && hasStories ? ' seen' : '') + (!hasStories ? ' no-story' : '');
    
    let ringInner = `<img src="${u.avatar}" style="background:#555">`;
    if(u.isMe && !hasStories) {
        item.innerHTML = `
          <div class="story-ring empty">
            <div class="story-ring-inner">${ringInner}</div>
            <div class="add-mini">+</div>
          </div>
          <div class="story-label">Tu historia</div>
        `;
        item.onclick = () => openComposer('story');
    } else {
        item.innerHTML = `
          <div class="story-ring"><div class="story-ring-inner">${ringInner}</div></div>
          <div class="story-label">${u.isMe ? 'Tu historia' : u.username}</div>
        `;
        item.onclick = () => openStoryFs(idx, sorted);
    }
    storiesRow.appendChild(item);
  });
}
renderStoriesHeader();
const _h = document.getElementById('cbcxHandle'); if (_h) _h.onclick = () => cbcx.classList.remove('story-expanded');

/* HISTORIAS ESTILO SOCIALINV FLOTANTE */
const storyFs = document.getElementById('storyFs');
const storyFsOverlay = document.getElementById('storyFsOverlay');
let curUserIdx=0, curStoryIdx=0;
let currentSortedList = [];

// ---- Pool de 3 nodos (DOM pooling) ----
const storySlideEls={
  prev:document.getElementById('storySlidePrev'),
  current:document.getElementById('storySlideCurrent'),
  next:document.getElementById('storySlideNext')
};
function unloadSlideMedia(slideEl){
  if(!slideEl)return;
  const img=slideEl.querySelector('.story-slide-img');
  const vid=slideEl.querySelector('.story-slide-video');
  img.classList.remove('active'); img.removeAttribute('src');
  if(vid.getAttribute('src')){
    // Descarga real de memoria: vaciar src + load() purga el búfer de decodificación
    // del video en RAM, en vez de confiar en que el garbage collector lo haga solo.
    vid.pause(); vid.removeAttribute('src'); vid.load();
  }
  vid.classList.remove('active');
  slideEl.dataset.empty='1';
}
function populateSlide(slideEl,user,storyIdx){
  if(!slideEl)return;
  const st=user&&user.stories?user.stories[storyIdx]:null;
  if(!st){ unloadSlideMedia(slideEl); return; }
  slideEl.dataset.empty='';
  const img=slideEl.querySelector('.story-slide-img');
  const vid=slideEl.querySelector('.story-slide-video');
  if(st.kind==='video'){
    img.classList.remove('active'); img.removeAttribute('src');
    if(vid.dataset.loadedSrc!==st.image){
      vid.pause(); vid.src=st.image; vid.dataset.loadedSrc=st.image; vid.load();
    }
    vid.classList.add('active'); vid.loop=true;
  }else{
    if(vid.getAttribute('src')){ vid.pause(); vid.removeAttribute('src'); vid.load(); delete vid.dataset.loadedSrc; }
    vid.classList.remove('active');
    img.src=st.image; img.classList.add('active');
  }
}

function openStoryFs(uIdx, sortedList) {
  currentSortedList = sortedList;
  curUserIdx = uIdx; curStoryIdx = 0;
  const storyFsAlreadyOpen = storyFs.classList.contains('open');
  storyFsOverlay.classList.add('open');
  storyFs.classList.add('open');
  if (!storyFsAlreadyOpen) pushNavView(closeStoryFs);
  showFsStory();
}

function closeStoryFs() {
  storyPaused = false; try { document.getElementById('storyFsReplyInput').blur(); } catch (e) {}
  storyFs.classList.remove('open'); 
  storyFsOverlay.classList.remove('open'); 
  stopStoryProgress();
  unloadSlideMedia(storySlideEls.prev);
  unloadSlideMedia(storySlideEls.current);
  unloadSlideMedia(storySlideEls.next);
  renderStoriesHeader(); // Actualiza el gris
  silentlyCloseNavView(closeStoryFs);
}

document.getElementById('storyFsClose').onclick = closeTopNavView;
storyFsOverlay.onclick = closeTopNavView;

// ---- Progreso acoplado al estado real del medio (requestAnimationFrame) ----
let storyRAF=null, storyStartTs=0, storyElapsedMs=0, storyDurationMs=5000, storyPaused=false;
const STORY_IMAGE_DURATION_MS=5000;
function stopStoryProgress(){
  cancelAnimationFrame(storyRAF); storyRAF=null;
}
function pauseStoryProgress(alsoPauseVideo=true){
  if(storyPaused)return;
  storyPaused=true;
  storyElapsedMs += performance.now()-storyStartTs;
  stopStoryProgress();
  if(alsoPauseVideo){
    const curVid=storySlideEls.current.querySelector('.story-slide-video.active');
    if(curVid && !curVid.paused) curVid.pause();
  }
}
function resumeStoryProgress(){
  if(!storyPaused)return;
  const curVid=storySlideEls.current.querySelector('.story-slide-video.active');
  if(curVid){
    // storyPaused se pone en false dentro de curVid.onplaying (única fuente de verdad
    // para relanzar el rAF una sola vez); aquí solo se dispara el play().
    curVid.play().catch(()=>{
      storyPaused=false; storyStartTs=performance.now(); tickStoryProgress();
    });
  }else{
    storyPaused=false;
    storyStartTs=performance.now();
    tickStoryProgress();
  }
}
function tickStoryProgress(){
  storyRAF=requestAnimationFrame(()=>{
    if(storyPaused)return;
    const elapsed=storyElapsedMs+(performance.now()-storyStartTs);
    const bar=storyFsProgressCurrentFill();
    if(bar) bar.style.width=Math.min(100,(elapsed/storyDurationMs)*100)+'%';
    if(elapsed>=storyDurationMs){ curStoryIdx++; showFsStory(); return; }
    tickStoryProgress();
  });
}
function storyFsProgressCurrentFill(){
  const el=document.getElementById('storyFsProgress');
  return el ? el.querySelector('.bar.current .fill') : null;
}

function showFsStory() {
  if(curUserIdx < 0 || curUserIdx >= currentSortedList.length) return closeStoryFs();
  const user = currentSortedList[curUserIdx];
  
  if(!user.stories || user.stories.length === 0) {
      curUserIdx++; return showFsStory(); // Salta a usuarios sin historias
  }
  
  if(curStoryIdx < 0) {
      // Retroceder: busca el usuario anterior CON historias; si no existe, reinicia la actual (como Instagram)
      let pu = curUserIdx - 1;
      while(pu >= 0 && !(currentSortedList[pu].stories && currentSortedList[pu].stories.length)) pu--;
      if(pu < 0){ curStoryIdx = 0; return showFsStory(); }
      curUserIdx = pu; curStoryIdx = currentSortedList[pu].stories.length - 1;
      return showFsStory();
  }
  if(curStoryIdx >= user.stories.length) { curUserIdx++; curStoryIdx=0; return showFsStory(); }

  const st = user.stories[curStoryIdx];
  st.seen = true; storySeenSave(user.username, st);
  document.getElementById('storyFsAvatar').src = user.avatar;
  document.getElementById('storyFsUsername').textContent = user.username;
  document.getElementById('storyFsTime').textContent = st.time;

  // Puebla el pool de 3 nodos: current = esta historia, prev/next = las adyacentes
  // (dentro del mismo usuario o cruzando al anterior/siguiente). Si una historia
  // deja de ser adyacente, se descarga su media explícitamente (ver populateSlide).
  const prevRef=prevStoryRef(user), nextRef=nextStoryRef(user);
  populateSlide(storySlideEls.current,user,curStoryIdx);
  populateSlide(storySlideEls.prev,prevRef.user,prevRef.idx);
  populateSlide(storySlideEls.next,nextRef.user,nextRef.idx);

  const prog = document.getElementById('storyFsProgress');
  prog.innerHTML = user.stories.map((s,i) => `<div class="bar ${i<curStoryIdx?'done':i===curStoryIdx?'current':''}"><div class="fill"></div></div>`).join('');
  
  storyFs.querySelector('.action-btn.like-btn').classList.toggle('liked', !!st.liked);

  // Arranca el progreso: para video se acopla a duration/currentTime real y a los
  // eventos waiting/playing; para imagen es un tiempo fijo, pero el mecanismo (rAF)
  // es el mismo en ambos casos.
  stopStoryProgress();
  storyElapsedMs=0; storyPaused=false;
  const curVid=storySlideEls.current.querySelector('.story-slide-video.active');
  if(curVid){
    storyDurationMs = (curVid.duration && isFinite(curVid.duration)) ? curVid.duration*1000 : 15000;
    curVid.currentTime=0;
    curVid.onloadedmetadata=()=>{ storyDurationMs=curVid.duration*1000; };
    curVid.onwaiting=()=>pauseStoryProgress(false); // buffering por red lenta: congela solo la barra, no el video
    let playingStarted=false;
    curVid.onplaying=()=>{
      if(playingStarted){
        // Reanudación tras un pause/buffering: solo relanza el rAF si de verdad estaba pausado
        if(storyPaused){ storyPaused=false; storyStartTs=performance.now(); tickStoryProgress(); }
        return;
      }
      playingStarted=true;
      storyStartTs=performance.now();
      tickStoryProgress();
    };
    curVid.play().catch(()=>{
      // Autoplay bloqueado u otro error: no habrá evento 'playing', así que arrancamos
      // el progreso igual para no dejar la historia congelada indefinidamente.
      if(!playingStarted){ playingStarted=true; storyStartTs=performance.now(); tickStoryProgress(); }
    });
  }else{
    storyDurationMs=STORY_IMAGE_DURATION_MS;
    storyStartTs=performance.now();
    tickStoryProgress();
  }
}
// Resuelve qué usuario/índice de historia corresponde a "anterior" y "siguiente",
// cruzando entre usuarios cuando hace falta, para poder precargar esos 2 nodos del pool.
function prevStoryRef(user){
  if(curStoryIdx>0) return {user, idx:curStoryIdx-1};
  const pu=currentSortedList[curUserIdx-1];
  return pu&&pu.stories&&pu.stories.length ? {user:pu, idx:pu.stories.length-1} : {user:null, idx:-1};
}
function nextStoryRef(user){
  if(curStoryIdx<user.stories.length-1) return {user, idx:curStoryIdx+1};
  const nu=currentSortedList[curUserIdx+1];
  return nu&&nu.stories&&nu.stories.length ? {user:nu, idx:0} : {user:null, idx:-1};
}

// Reacción espacial: el emoji nace exactamente en (x,y) — coordenadas de PANTALLA,
// se convierten a locales del contenedor — y deja un rastro momentáneo ahí mismo.
// Separado de showHeartAnimation (que usan el feed/reels/comentarios) para no tocar
// ese comportamiento existente; esto es específico del visor de historias.
function showSpatialReaction(container,x,y,emojiChar){
  const rect=container.getBoundingClientRect();
  const localX=x-rect.left, localY=y-rect.top;
  if(getComputedStyle(container).position==='static') container.style.position='relative';
  const el=document.createElement('div');
  el.className='spatial-reaction';
  el.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  el.style.left=localX+'px'; el.style.top=localY+'px';
  const trail=document.createElement('div');
  trail.className='spatial-reaction-trail';
  trail.style.left=localX+'px'; trail.style.top=localY+'px';
  container.appendChild(trail);
  container.appendChild(el);
  setTimeout(()=>el.remove(),900);
  setTimeout(()=>trail.remove(),1400);
}

function doStoryLike(x,y){
  const st = currentSortedList[curUserIdx]?.stories[curStoryIdx];
  if (st && !st.liked) {
    st.liked = true;
    if(typeof x==='number'&&typeof y==='number') showSpatialReaction(fsBody,x,y);
    else showHeartAnimation(fsBody);
    storyFs.querySelector('.action-btn.like-btn').classList.add('liked');
  }
}
storyFs.querySelector('.action-btn.like-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const st = currentSortedList[curUserIdx]?.stories[curStoryIdx];
  if (!st) return;
  st.liked = !st.liked;
  e.currentTarget.classList.toggle('liked', st.liked);
});

// Tap-to-Hold invertido: si el creador configuró una "capa oculta" para esta
// historia (st.hiddenReveal), mantener presionado la muestra en vez de solo
// atenuar la UI; al soltar, se oculta de nuevo. Si la historia no tiene ninguna
// configurada, no pasa nada extra (queda el comportamiento normal de peek).
function applyHiddenReveal(show){
  const st=currentSortedList[curUserIdx]?.stories[curStoryIdx];
  const reveal=st&&st.hiddenReveal;
  if(!reveal)return;
  let el=document.getElementById('storyHiddenReveal');
  if(show){
    if(!el){
      el=document.createElement('div');
      el.id='storyHiddenReveal';
      el.className='story-hidden-reveal';
      storySlideEls.current.appendChild(el);
    }
    el.className='story-hidden-reveal'+(reveal.type==='text'?' darken':reveal.type==='darken'?' darken':'');
    el.innerHTML = reveal.type==='text' ? `<div class="shr-text">${escapeHtml(reveal.text||'')}</div>` : '';
    requestAnimationFrame(()=>el.classList.add('show'));
  }else if(el){
    el.classList.remove('show');
    setTimeout(()=>{ if(el && !el.classList.contains('show')) el.remove(); },300);
  }
}

/* =====================================================
   RESOLUCIÓN DE GESTOS UNIFICADA
   Un único controlador touchstart/touchmove/touchend sobre el contenedor de la
   historia calcula deltas de posición y tiempo para resolver, sin ambigüedad,
   cuál de las 4 intenciones posibles quiso el usuario:
   · toque breve en mitad izquierda/derecha → retroceder/avanzar historia
   · doble toque → dar like
   · arrastre horizontal > umbral → cambiar de usuario
   · arrastre vertical descendente → cerrar el visor
   · mantener presionado sin mover → "vistazo limpio" (UI a opacidad 0, pausa)
   ===================================================== */
const fsBody = document.getElementById('storyFsBody');
(function setupUnifiedStoryGestures(){
  const TAP_MOVE_TOLERANCE=10, LONGPRESS_MS=320, H_SWIPE_THRESHOLD=60, V_DISMISS_THRESHOLD=100, DOUBLE_TAP_MS=280;
  let sx=0,sy=0,moved=false,gesture=null,longPressTimer=null,peeking=false,lastTapTs=0,pendingTapTimer=null,active=false,pid=null;
  fsBody.style.touchAction='none';

  function endPeek(){
    if(!peeking) return;
    storyFs.classList.remove('peeking'); applyHiddenReveal(false); peeking=false; resumeStoryProgress();
  }

  fsBody.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse' && e.button!==0) return;
    active=true; pid=e.pointerId;
    try{ fsBody.setPointerCapture(pid); }catch(_){}
    sx=e.clientX; sy=e.clientY; moved=false; gesture=null; peeking=false;
    fsBody.style.transition='none'; storyFs.style.transition='none';
    clearTimeout(longPressTimer);
    longPressTimer=setTimeout(()=>{
      peeking=true;
      storyFs.classList.add('peeking');
      applyHiddenReveal(true);
      pauseStoryProgress();
    },LONGPRESS_MS);
  });

  fsBody.addEventListener('pointermove',e=>{
    if(!active || e.pointerId!==pid) return;
    const dx=e.clientX-sx, dy=e.clientY-sy;
    if(!moved){
      if(Math.abs(dx)<TAP_MOVE_TOLERANCE && Math.abs(dy)<TAP_MOVE_TOLERANCE) return;
      moved=true;
      clearTimeout(longPressTimer);
      endPeek();
      gesture = (Math.abs(dy)>Math.abs(dx) && dy>0) ? 'vertical' : 'horizontal';
      if(gesture==='horizontal') pauseStoryProgress();
      else pauseStoryProgress();
    }
    if(gesture==='vertical'){
      const clamped=Math.max(0,dy);
      storyFs.style.transform=`translateY(${clamped}px)`;
      storyFsOverlay.style.opacity=Math.max(0,1-clamped/300);
    }else if(gesture==='horizontal'){
      fsBody.style.transform=`translateX(${dx}px)`;
    }
  });

  function finish(e, cancelled){
    if(!active || e.pointerId!==pid) return;
    active=false;
    clearTimeout(longPressTimer);
    try{ fsBody.releasePointerCapture(pid); }catch(_){}
    const dx=e.clientX-sx, dy=e.clientY-sy;
    fsBody.style.transition='transform .25s cubic-bezier(.2,.8,.2,1)';
    storyFs.style.transition='';
    endPeek();

    if(cancelled){
      fsBody.style.transform=''; storyFs.style.transform=''; storyFsOverlay.style.opacity='';
      if(gesture) resumeStoryProgress();
    }else if(gesture==='vertical'){
      storyFs.style.transform=''; storyFsOverlay.style.opacity='';
      if(dy>V_DISMISS_THRESHOLD) closeTopNavView();
      else resumeStoryProgress();
    }else if(gesture==='horizontal'){
      fsBody.style.transform='';
      if(Math.abs(dx)>H_SWIPE_THRESHOLD){
        storyPaused=false;
        curStoryIdx = dx<0 ? currentSortedList[curUserIdx].stories.length : -1; // fuerza cruce de usuario
        showFsStory();
      }else{
        resumeStoryProgress();
      }
    }else if(!moved){
      const now=Date.now();
      const rect=fsBody.getBoundingClientRect();
      const localX=e.clientX-rect.left, cx=e.clientX, cy=e.clientY;
      if(now-lastTapTs<DOUBLE_TAP_MS){
        clearTimeout(pendingTapTimer);
        lastTapTs=0;
        doStoryLike(cx,cy);
      }else{
        pendingTapTimer=setTimeout(()=>{
          storyPaused=false;
          if(localX < rect.width*0.35) curStoryIdx--; else curStoryIdx++;
          showFsStory();
        },DOUBLE_TAP_MS-10);
        lastTapTs=now;
      }
    }
    gesture=null; moved=false;
  }
  fsBody.addEventListener('pointerup',e=>finish(e,false));
  fsBody.addEventListener('pointercancel',e=>finish(e,true));
  // El clic derecho / menú contextual no debe interrumpir la historia
  fsBody.addEventListener('contextmenu',e=>e.preventDefault());
})();

// Enviar mensaje de respuesta a la historia: se refleja directo en el chat con ese usuario
const storyFsReplyInput = document.getElementById('storyFsReplyInput');
const storyFsReplySend = document.getElementById('storyFsReplySend');

/* ---- Notificación no invasiva (toast) ----
   Confirma acciones como "respondiste a una historia" o "enviaste una publicación"
   sin interrumpir al usuario: aparece arriba, se retira sola, y nunca bloquea nada
   (pointer-events:none) porque no necesita que el usuario interactúe con ella. */
const appToastEl = document.getElementById('appToast');
const appToastTextEl = document.getElementById('appToastText');
let appToastTimer = null;
function showAppToast(html) {
  clearTimeout(appToastTimer);
  appToastTextEl.innerHTML = html;
  appToastEl.classList.remove('show');
  void appToastEl.offsetWidth; // fuerza reflow para reiniciar la animación si ya estaba visible
  appToastEl.classList.add('show');
  appToastTimer = setTimeout(() => { appToastEl.classList.remove('show'); }, 2800);
}

function getOrCreateConversation(username) {
  return conversations[username] || (conversations[username] = []);
}

function sendStoryReply() {
  const text = storyFsReplyInput.value.trim();
  const user = currentSortedList[curUserIdx];
  const st = user && user.stories ? user.stories[curStoryIdx] : null;
  if (!text || !user || !st) return;
  if (user.isMe) { showAppToast('No puedes responder a tu propia historia'); return; }
  const thread = getOrCreateConversation(user.username);
  thread.push({
    from: myUsername,
    text,
    storyReply: { image: st.image, kind: st.kind || 'image' },
    time: 'Ahora',
    fullTime: nowFull()
  });
  storyFsReplyInput.value = '';
  storyFsReplyInput.blur();
  showAppToast(`Respondiste a la historia de <b>@${escapeHtml(user.username)}</b>`);
  // Pequeño feedback visual de envío
  storyFsReplySend.style.transform = 'scale(0.8)';
  setTimeout(() => { storyFsReplySend.style.transform = ''; }, 150);
}

storyFsReplySend.addEventListener('click', (e) => { e.stopPropagation(); sendStoryReply(); });
storyFsReplyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendStoryReply(); });
// Evita que tocar/escribir en el input disparen la navegación de avanzar/retroceder historia
storyFsReplyInput.addEventListener('click', (e) => e.stopPropagation());
storyFsReplyInput.addEventListener('focus', () => pauseStoryProgress());
storyFsReplyInput.addEventListener('blur', () => { if (storyFs.classList.contains('open')) resumeStoryProgress(); });

/* GRID, VISOR MULTIMEDIA Y POST DOUBLE TAP */
function initGridsAndPosts() {
  document.querySelectorAll('.post').forEach(post => {
    if(post.dataset.initialized) return;
    post.dataset.initialized = "true";
    
    // Tap handler para TODO el POST (Doble tap da like, simple click interactúa con grid)
    attachTapHandler(post, 
      (e) => {
          // Single tap: Si tocó una imagen del grid, abrir visor
          const gridItem = e.target.closest('.grid-item');
          if(gridItem) {
              const grid = gridItem.closest('.post-grid');
              const files = JSON.parse(grid.dataset.files);
              const index = Array.from(grid.children).indexOf(gridItem);
              openMediaViewer(files, index);
          }
      },
      (e) => {
          // Double tap: Dar like al post y mostrar corazón en la zona tocada
          const targetContainer = e.target.closest('.grid-item') || post;
          showHeartAnimation(targetContainer, targetContainer === post ? 60 : 90);
          const likeBtn = post.querySelector('.post-action.like');
          handleAddLike(likeBtn, '.like-count');
      },
      '.post-action, .post-header' // Ignorar doble tap si toca estos botones
    );

    // Click simple en el botón de like
    const likeBtn = post.querySelector('.post-action.like');
    if(likeBtn) {
        likeBtn.onclick = (e) => {
          e.stopPropagation();
          toggleLike(likeBtn, '.like-count');
          // Sincronizar la clase visual 'liked' en el stat-item correspondiente
          const statLike = post.querySelector('.stat-item:first-child');
          if (statLike) statLike.classList.toggle('liked', likeBtn.classList.contains('active'));
        };
    }

    // Botón guardar
    const saveBtn = post.querySelector('[data-save-btn]');
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => { e.stopPropagation(); saveBtn.classList.toggle('active'); });
    }
  });
}
initGridsAndPosts();

