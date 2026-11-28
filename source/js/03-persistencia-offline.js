/* =====================================================
   CACHÉ PERSISTENTE (IndexedDB)
   Cada cambio en una conversación se refleja también en IndexedDB. Al cargar la
   página, se intenta hidratar 'conversations' desde esa caché ANTES de que el
   usuario llegue a abrir el mensajero, así el modal pinta con datos ya listos en
   vez de arrancar vacío. IndexedDB es asíncrono por naturaleza (no existe una
   lectura de "0ms" real), pero en la práctica una lectura local tarda unos pocos
   milisegundos — imperceptible frente a esperar una respuesta de red.
   Si el navegador no soporta IndexedDB (o falla por cualquier razón), todo sigue
   funcionando igual solo que sin persistencia entre sesiones.
   ===================================================== */
const CHAT_DB_NAME='socialinv-chat-cache', CHAT_DB_STORE='conversations';
let chatDbPromise=null;
function openChatDb(){
  if(chatDbPromise)return chatDbPromise;
  chatDbPromise=new Promise(resolve=>{
    if(!window.indexedDB){resolve(null);return;}
    let req;
    try{req=indexedDB.open(CHAT_DB_NAME,1);}catch(e){resolve(null);return;}
    req.onupgradeneeded=()=>{try{req.result.createObjectStore(CHAT_DB_STORE);}catch(e){}};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>resolve(null);
  });
  return chatDbPromise;
}
async function persistConversation(username){
  if(!username)return;
  if((window.SvBackend&&SvBackend.enabled))return; // modo conectado: la fuente de verdad es el servidor
  try{
    const db=await openChatDb();if(!db)return;
    db.transaction(CHAT_DB_STORE,'readwrite').objectStore(CHAT_DB_STORE).put(conversations[username]||[],username);
  }catch(e){ /* la caché es una optimización, no algo de lo que dependa la UI */ }
}
async function hydrateConversationsFromCache(){
  if((window.SvBackend&&SvBackend.enabled))return;
  try{
    const db=await openChatDb();if(!db)return;
    const tx=db.transaction(CHAT_DB_STORE,'readonly');
    const store=tx.objectStore(CHAT_DB_STORE);
    const keysReq=store.getAllKeys(), valsReq=store.getAll();
    await new Promise(res=>{tx.oncomplete=res;tx.onerror=res;});
    const keys=keysReq.result||[], vals=valsReq.result||[];
    keys.forEach((username,i)=>{ if(vals[i] && vals[i].length) conversations[username]=vals[i]; });
    // Si el chat ya estaba abierto cuando la hidratación terminó, refresca la vista
    if(activeChatUsername && keys.includes(activeChatUsername)){renderChatMessages();}
    renderChatList();
  }catch(e){}
}
hydrateConversationsFromCache();

/* =====================================================
   COLA OFFLINE (Sync Queue) — Service Worker + Background Sync
   Si se envía un mensaje sin conexión, queda en IndexedDB con status:'pending' y se
   registra un Background Sync: el navegador (hoy solo Chrome/Edge lo soportan) se
   encarga de reintentarlo en cuanto detecta que la conexión volvió, incluso si la
   pestaña ya se cerró — para eso sirve Background Sync frente a un simple listener.
   Como red de seguridad universal (para cuando el navegador no soporta Background
   Sync, o cuando la pestaña sigue abierta y ya no hace falta esperar al Service
   Worker), la propia página también reintenta apenas detecta el evento 'online'.
   ===================================================== */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').catch(()=>{
    // Si falla el registro (p.ej. servido desde file:// sin HTTPS), la cola offline
    // sigue funcionando igual gracias al fallback de 'online' de más abajo.
  });
  navigator.serviceWorker.addEventListener('message',(event)=>{
    if(event.data && event.data.type==='retry-pending'){ retryPendingMessagesNow(); }
    if(event.data && event.data.type==='pending-messages-synced'){
      hydrateConversationsFromCache().then(()=>{ if(activeChatUsername) renderChatMessages(); renderChatList(); });
    }
  });
}
function queueForBackgroundSync(){
  if(!('serviceWorker' in navigator))return;
  navigator.serviceWorker.ready.then(reg=>{
    if('sync' in reg) reg.sync.register('sync-pending-messages').catch(()=>{});
  }).catch(()=>{});
}
// Fallback universal: reintenta directamente sobre 'conversations' (que ya está en
// memoria, sin esperar ninguna vuelta por el Service Worker) apenas vuelve la señal.
function retryPendingMessagesNow(){
  let anyChanged=false;
  for(const username in conversations){
    const thread=conversations[username];
    thread.forEach((m,idx)=>{
      if(m && m.status==='pending'){
        m.status='sent'; anyChanged=true;
        advanceMsgStatus(thread,idx); // retoma la progresión normal sent→delivered→read
      }
    });
    if(anyChanged) persistConversation(username);
  }
  if(anyChanged){ if(activeChatUsername) renderChatMessages(); renderChatList(); }
}
window.addEventListener('online',()=>{
  retryPendingMessagesNow();
  queueForBackgroundSync();
  if(chatWindow.classList.contains('open')) chatWindowStatus.textContent='En línea';
});
window.addEventListener('offline',()=>{
  if(chatWindow.classList.contains('open')) chatWindowStatus.textContent='Sin conexión';
});

// Gatito SVG reutilizado como mascota de "estado vacío" en cualquier pestaña del
// perfil que todavía no tenga contenido (info / publicaciones / compartidos).
const PF_EMPTY_MASCOT_SVG = `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" preserveAspectRatio="xMidYMid meet"><g transform="translate(0,2048) scale(0.1,-0.1)" fill="currentColor" stroke="none"><path d="M13565 17594 c-190 -35 -504 -161 -882 -354 -372 -190 -565 -312 -948 -600 -203 -153 -637 -505 -825 -669 -74 -64 -200 -169 -280 -231 -185 -144 -317 -258 -452 -388 l-108 -103 -242 -118 c-134 -65 -335 -163 -448 -218 -221 -109 -302 -139 -477 -178 -248 -56 -602 -85 -722 -59 -36 7 -82 14 -102 14 -25 0 -60 16 -125 56 -205 130 -691 418 -849 504 -93 51 -238 133 -322 181 -84 49 -155 89 -158 89 -3 0 -24 12 -47 26 -23 15 -92 53 -153 84 -60 31 -130 69 -155 82 -25 14 -148 78 -274 142 -125 64 -250 131 -276 150 -56 40 -248 146 -264 146 -7 0 -16 4 -22 10 -33 33 -406 128 -572 145 -50 6 -91 13 -149 25 -80 18 -317 42 -352 35 -57 -11 -129 -56 -147 -93 -36 -75 -98 -362 -110 -503 -9 -110 -9 -378 0 -504 4 -55 9 -129 11 -164 2 -35 9 -88 15 -118 5 -31 8 -59 5 -63 -6 -9 73 -519 85 -545 5 -11 12 -40 15 -65 23 -165 221 -785 312 -974 12 -28 23 -54 23 -59 0 -21 250 -501 300 -577 6 -8 14 -24 19 -35 6 -11 32 -55 58 -97 26 -43 72 -117 102 -165 30 -48 102 -160 160 -248 58 -88 108 -164 110 -169 2 -5 49 -77 105 -161 55 -85 115 -175 131 -202 17 -26 40 -64 52 -83 29 -45 88 -166 101 -208 9 -26 7 -54 -13 -141 -13 -60 -31 -156 -39 -212 -47 -328 -46 -490 3 -715 52 -243 82 -308 232 -504 232 -305 401 -486 569 -613 52 -39 126 -99 163 -134 38 -34 154 -128 258 -209 104 -81 189 -151 189 -155 0 -5 -39 -20 -87 -35 -184 -55 -302 -103 -533 -219 -317 -159 -536 -313 -779 -550 -251 -245 -401 -453 -469 -650 -100 -295 -56 -503 152 -711 101 -101 166 -138 293 -169 75 -18 73 -18 379 1 117 8 166 -3 316 -71 165 -75 219 -88 358 -88 131 0 228 20 472 99 l143 46 265 9 c146 5 310 16 365 24 145 22 305 71 424 132 l105 53 1361 0 1362 0 -107 -322 c-117 -351 -144 -425 -285 -778 -104 -262 -210 -571 -250 -730 -15 -58 -49 -174 -76 -257 -27 -84 -49 -158 -49 -163 0 -6 -34 -93 -76 -193 -158 -379 -202 -560 -191 -792 11 -227 95 -477 210 -630 106 -140 300 -296 472 -379 599 -292 775 -362 1084 -431 221 -50 557 -69 766 -44 185 22 374 82 502 160 96 58 246 166 347 249 204 169 339 414 436 794 51 202 64 318 65 586 0 304 -17 444 -97 810 -16 69 -21 129 -21 220 1 250 63 694 123 869 35 105 96 215 167 303 158 196 374 420 562 581 31 27 100 73 153 103 l97 55 767 -1 c834 -2 797 -4 775 52 -13 32 -53 68 -141 124 -91 58 -280 215 -349 289 -27 30 -96 124 -152 208 -188 278 -274 391 -518 672 -503 581 -785 862 -1025 1022 -182 122 -288 166 -516 216 -246 55 -469 68 -627 38 l-43 -8 93 97 c51 53 131 143 178 199 46 57 101 124 123 149 68 83 202 284 263 397 94 173 161 326 220 505 96 292 117 420 117 745 1 173 -2 215 -23 310 -48 226 -126 372 -374 702 -196 261 -264 369 -325 516 -64 155 -74 221 -75 477 0 203 10 302 54 520 62 303 149 592 494 1640 256 777 304 986 321 1394 13 291 -32 497 -139 644 -49 68 -86 100 -156 135 -62 30 -71 32 -195 34 -84 1 -160 -3 -211 -13z m-288 -4206 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m-1157 -216 c489 -114 861 -450 1008 -912 50 -157 65 -258 65 -425 0 -175 -18 -292 -68 -442 -116 -348 -343 -612 -663 -775 -435 -221 -931 -205 -1349 42 -124 73 -143 96 -36 41 155 -78 323 -114 528 -114 349 1 660 135 916 394 183 185 306 415 356 666 24 122 24 358 0 473 -81 383 -289 679 -622 881 -169 102 -412 176 -599 181 l-61 1 45 8 c85 14 387 2 480 -19z m-530 8 c0 -5 -19 -9 -42 -9 -40 1 -41 2 -13 9 44 11 55 11 55 0z m-3475 -111 c-22 -5 -50 -11 -62 -14 -27 -6 -32 11 -5 18 9 3 37 5 62 5 l45 0 -40 -9z m-180 -43 c-391 -142 -700 -458 -829 -847 -53 -159 -70 -282 -63 -463 13 -358 145 -648 413 -907 190 -183 395 -293 647 -348 53 -12 114 -21 134 -21 21 0 45 -5 53 -10 21 -14 -251 -13 -343 1 -444 66 -816 338 -1002 733 -96 202 -129 348 -129 576 -1 237 33 389 133 595 177 363 510 619 919 705 48 10 103 19 122 19 29 0 18 -6 -55 -33z m450 -2596 c-44 -11 -75 -11 -75 0 0 6 23 9 53 9 44 -1 48 -2 22 -9z"/></g></svg>`;

// Genera el bloque de "estado vacío" (mascota + texto técnico) reutilizado en
// cualquier pestaña del perfil (info / publicaciones / compartidos) sin contenido aún.
function pfEmptyStateHTML(title, sub) {
  return `<div class="pf-empty-msg">
    <div class="pf-empty-mascot">${PF_EMPTY_MASCOT_SVG}</div>
    <p class="pf-empty-title">${escapeHtml(title)}</p>
    <p class="pf-empty-sub">${escapeHtml(sub || '')}</p>
  </div>`;
}

// Detección de red social a partir del enlace: cada entrada define el dominio
// (o dominios) que la identifican, su nombre para mostrar y su ícono. Si el
// enlace no coincide con ninguna, se usa el ícono "default" (globo/página web)
// y como texto se toma el nombre del dominio (ej. "lameramera.com" -> "lameramera").
const SOCIAL_PLATFORMS = [
  { match: ['instagram.com'], label: 'Instagram', svg: '<rect x="2" y="2" width="20" height="20" rx="6"></rect><circle cx="12" cy="12" r="4.2"></circle><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"></circle>' },
  { match: ['facebook.com', 'fb.com'], label: 'Facebook', svg: '<path d="M15 3h-2a5 5 0 0 0-5 5v2H6v4h2v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h3z"></path>' },
  { match: ['twitter.com', 'x.com'], label: 'X', svg: '<line x1="4" y1="4" x2="20" y2="20"></line><line x1="20" y1="4" x2="4" y2="20"></line>' },
  { match: ['tiktok.com'], label: 'TikTok', svg: '<path d="M14 3v10.5a3.5 3.5 0 1 1-3-3.46"></path><path d="M14 3c.4 2.3 2 4 4.5 4.3"></path>' },
  { match: ['youtube.com', 'youtu.be'], label: 'YouTube', svg: '<rect x="2" y="5" width="20" height="14" rx="4"></rect><polygon points="10 9 16 12 10 15" fill="currentColor" stroke="none"></polygon>' },
  { match: ['whatsapp.com', 'wa.me'], label: 'WhatsApp', svg: '<path d="M4 20l1.4-4A8 8 0 1 1 9 19.5z"></path><path d="M8.5 9.5c0 3 2.5 5.5 5.5 5.5" ></path>' },
  { match: ['t.me', 'telegram.org', 'telegram.me'], label: 'Telegram', svg: '<path d="M22 3 2 11l6 2 2 6 3-4 5 4z"></path><path d="M8 13l10-8"></path>' },
  { match: ['linkedin.com'], label: 'LinkedIn', svg: '<rect x="2" y="2" width="20" height="20" rx="3"></rect><line x1="7" y1="10" x2="7" y2="17"></line><circle cx="7" cy="6.5" r="1" fill="currentColor" stroke="none"></circle><path d="M11 17v-4a2.5 2.5 0 0 1 5 0v4"></path><line x1="11" y1="10" x2="11" y2="17"></line>' },
  { match: ['github.com'], label: 'GitHub', svg: '<path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.1-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.7.4-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5A3.9 3.9 0 0 1 6.5 9c-.1-.2-.5-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .6 1.4.2 2.5.1 2.7a3.9 3.9 0 0 1 1 2.7c0 3.9-2.4 4.7-4.6 5 .3.3.6.9.6 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z"></path>' },
  { match: ['pinterest.com'], label: 'Pinterest', svg: '<circle cx="12" cy="12" r="10"></circle><path d="M9 17c1-3 1.5-5 1.5-5m3-3.4a2.6 2.6 0 1 1 4.5 1.9c-.3 1.7-1 3.5-2.9 3.5a2 2 0 0 1-2-2.4c.3-1.3 1-2.6 1-3.5a1 1 0 0 0-1.9-.3c-.2.5-.2 1-.1 1.4"></path>' },
  { match: ['spotify.com'], label: 'Spotify', svg: '<circle cx="12" cy="12" r="10"></circle><path d="M6.5 9.5c3.5-1 8-.5 10.5 1"></path><path d="M7 13c3-1 6.5-.6 8.7.8"></path><path d="M7.5 16.2c2.4-.7 5-.4 7 .8"></path>' },
  { match: ['twitch.tv'], label: 'Twitch', svg: '<path d="M4 3h16v10l-4 4h-4l-2 2H8v-2H4z"></path><line x1="14" y1="7" x2="14" y2="11"></line><line x1="10" y1="7" x2="10" y2="11"></line>' },
  { match: ['discord.com', 'discord.gg'], label: 'Discord', svg: '<path d="M7 6c3.3-1 6.7-1 10 0l1.5 9c-2 1.5-4 2-6.5 2s-4.5-.5-6.5-2z"></path><circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none"></circle><circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none"></circle>' },
  { match: ['snapchat.com'], label: 'Snapchat', svg: '<path d="M12 3c2.5 0 4 2 4 4.5 0 1 0 2 .3 2.7.6.2 1.5.3 1.7.9.1.5-.4.9-1 1.2.2.6.9 1 1.5 1.2-.1.6-.9.8-1.5 1 0 .6.2 1-.3 1.3-.6.3-1.5.1-2.1.5-.6.4-1.2 1.2-2.6 1.2s-2-.8-2.6-1.2c-.6-.4-1.5-.2-2.1-.5-.5-.3-.3-.7-.3-1.3-.6-.2-1.4-.4-1.5-1 .6-.2 1.3-.6 1.5-1.2-.6-.3-1.1-.7-1-1.2.2-.6 1.1-.7 1.7-.9C8 9.5 8 8.5 8 7.5 8 5 9.5 3 12 3z"></path>' },
  { match: ['reddit.com'], label: 'Reddit', svg: '<circle cx="12" cy="14" r="6"></circle><circle cx="9" cy="14.5" r="1" fill="currentColor" stroke="none"></circle><circle cx="15" cy="14.5" r="1" fill="currentColor" stroke="none"></circle><path d="M9 17c1 .8 5 .8 6 0"></path><circle cx="18" cy="6" r="1.6"></circle><path d="M12 14 13 6l3.5.5"></path>' },
  { match: ['threads.net'], label: 'Threads', svg: '<path d="M8 4c6 0 9 3 9 8s-3 8-8 8c-3 0-4.5-1.5-4.5-3.4C4.5 14 7 13 10 13.3c2 .2 3 1.2 3 2.4 0 1.4-1.3 2.3-3 2.3-1 0-1.8-.4-1.8-1.2"></path>' }
];

const SOCIAL_DEFAULT_ICON = '<circle cx="12" cy="12" r="9"></circle><ellipse cx="12" cy="12" rx="4" ry="9"></ellipse><line x1="3" y1="12" x2="21" y2="12"></line><path d="M5 7.5h14M5 16.5h14"></path>';

// A partir de un enlace, devuelve { label, svg, url } detectando la red social
// por el dominio; si no la reconoce, usa el ícono por defecto y el nombre del
// dominio como texto (ej. "lameramera.com" -> "lameramera").
function detectSocialLink(rawUrl) {
  let url = (rawUrl || '').trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  let hostname;
  try { hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); }
  catch (e) { return null; }

  const platform = SOCIAL_PLATFORMS.find(p => p.match.some(d => hostname === d || hostname.endsWith('.' + d)));
  if (platform) return { label: platform.label, svg: platform.svg, url };

  const label = hostname.split('.')[0] || hostname;
  return { label, svg: SOCIAL_DEFAULT_ICON, url };
}

const PF_ICONS = {
  music: '<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
  smile: '<circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>'
};

