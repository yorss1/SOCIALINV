/* ===================================================== */
/* MENSAJERÍA PROFESIONAL v3                               */
/* ===================================================== */
(function(){
const messengerView=document.getElementById('messengerView');
const messengerBackBtn=document.getElementById('messengerBackBtn');
const chatListEl=document.getElementById('chatList');
const chatWindow=document.getElementById('chatWindow');
const chatWindowBackBtn=document.getElementById('chatWindowBackBtn');
const chatWindowAvatar=document.getElementById('chatWindowAvatar');
const chatWindowUsername=document.getElementById('chatWindowUsername');
const chatWindowHeader=document.getElementById('chatWindowHeader');
const chatWindowStatus=document.getElementById('chatWindowStatus');
const chatMessages=document.getElementById('chatMessages');
const chatTextarea=document.getElementById('chatTextarea');
const chatSendBtn=document.getElementById('chatSendBtn');
const chatInputBar=document.getElementById('chatInputBar');
const chatInputWrap=document.getElementById('chatInputWrap');
const chatRecordBtn=document.getElementById('chatRecordBtn');
const chatPhotoBtn=document.getElementById('chatPhotoBtn');
const chatCallBtn=document.getElementById('chatCallBtn');
const chatVideoBtn=document.getElementById('chatVideoBtn');
const chatSettingsBtn=document.getElementById('chatSettingsBtn');
const chatRecIndicator=document.getElementById('chatRecIndicator');
const chatRecTimerEl=document.getElementById('chatRecTimer');
const chatRecCancel=document.getElementById('chatRecCancel');
const chatRecSend=document.getElementById('chatRecSend');
const chatFileInput=document.getElementById('chatFileInput');
const chatVideoInput=document.getElementById('chatVideoInput');
const chatAudioInput=document.getElementById('chatAudioInput');
const cibLeft=document.getElementById('cibLeft');
const chatBgLayer=document.getElementById('chatBgLayer');
const chatBgFileInput=document.getElementById('chatBgFileInput');
const bgSwatchCustom=document.getElementById('bgSwatchCustom');
const bgSwatchPreview=document.getElementById('bgSwatchPreview');
const chatSettingsOverlay=document.getElementById('chatSettingsOverlay');
const chatSettingsPanel=document.getElementById('chatSettingsPanel');
const cspAvatar=document.getElementById('cspAvatar');
const cspName=document.getElementById('cspName');
const chatBgPicker=document.getElementById('chatBgPicker');
const mediaUploadOverlay=document.getElementById('mediaUploadOverlay');
const mediaUploadSheet=document.getElementById('mediaUploadSheet');
const videoTrimOverlay=document.getElementById('videoTrimOverlay');
const vtVideo=document.getElementById('vtVideo');
const vtCancel=document.getElementById('vtCancel');
const vtSend=document.getElementById('vtSend');
const vtTabClip=document.getElementById('vtTabClip');
const vtTabAudio=document.getElementById('vtTabAudio');
const vtTrimStart=document.getElementById('vtTrimStart');
const vtTrimEnd=document.getElementById('vtTrimEnd');
const vtProgress=document.getElementById('vtProgress');
const vtTimeline=document.getElementById('vtTimeline');
const vtTimeLabel=document.getElementById('vtTimeLabel');
const callOverlay=document.getElementById('callOverlay');
const callAvatarImg=document.getElementById('callAvatarImg');
const callOverlayName=document.getElementById('callOverlayName');
const callOverlayStatus=document.getElementById('callOverlayStatus');
const callTimerDisplay=document.getElementById('callTimerDisplay');
const callEndBtn=document.getElementById('callEndBtn');
const callMuteBtn=document.getElementById('callMuteBtn');
const callFlipBtn=document.getElementById('callFlipBtn');
const bubbleCtxOverlay=document.getElementById('bubbleCtxOverlay');
const bubbleCtxPanel=document.getElementById('bubbleCtxPanel');
const bctxPreview=document.getElementById('bctxPreview');
const bctxMeta=document.getElementById('bctxMeta');
const bctxReply=document.getElementById('bctxReply');
const bctxCopy=document.getElementById('bctxCopy');
const bctxEdit=document.getElementById('bctxEdit');
const chatReplyPreview=document.getElementById('chatReplyPreview');
const crpTo=document.getElementById('crpTo');
const crpText=document.getElementById('crpText');
const crpClose=document.getElementById('crpClose');
let replyingToIndex=-1;

// Estados de red del mensaje: reloj (enviando) -> check simple (guardado en servidor)
// -> doble check (entregado al dispositivo) -> doble check de color (leído).
function renderMsgStatusTick(m){
  const status=m.status||'delivered'; // mensajes históricos sin status se asumen entregados
  if(status==='pending'){
    return `<span class="check-icon is-pending" title="Sin conexión — se enviará solo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16.5A5 5 0 0 0 15 7a6.5 6.5 0 0 0-12.6 1.8A4 4 0 0 0 3 17"/><line x1="3" y1="21" x2="21" y2="3"/></svg></span>`;
  }
  if(status==='sending'){
    return `<span class="check-icon is-sending"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg></span>`;
  }
  if(status==='sent'){
    return `<span class="check-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></span>`;
  }
  return `<span class="check-icon${status==='read'?' check-seen':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 6 7 17 2 12"/><polyline points="23 6 12 17 10.5 15.5"/></svg></span>`;
}
// Simula la progresión de estados de un mensaje recién enviado (Actualización Optimista:
// la burbuja ya está en pantalla con "sending" mientras esto corre en segundo plano).
// En una app con backend real, 'sent'/'delivered' vendrían de la confirmación del
// servidor y 'read' de un evento de socket cuando el otro dispositivo abre el chat.
function advanceMsgStatus(thread,idx){
  const m=thread[idx];if(!m)return;
  if((window.SvBackend&&SvBackend.enabled))return; // modo conectado: el estado real lo confirma el servidor (26-sync-mensajes.js)
  const rerenderIfStillActive=()=>{if(conversations[activeChatUsername]===thread){renderChatMessages();renderChatList();}};
  setTimeout(()=>{
    if(!thread[idx]||thread[idx].deleted)return;
    thread[idx].status='sent';rerenderIfStillActive();
    setTimeout(()=>{
      if(!thread[idx]||thread[idx].deleted)return;
      thread[idx].status='delivered';rerenderIfStillActive();
      setTimeout(()=>{
        if(!thread[idx]||thread[idx].deleted)return;
        thread[idx].status='read';rerenderIfStillActive();
      },1600+Math.random()*1400);
    },550);
  },350);
}
function describeMsgForQuote(m){
  if(!m)return'';
  if(m.deleted)return'Mensaje eliminado';
  if(m.text)return m.text;
  if(m.storyReply)return'Respuesta a una historia';
  if(m.shared)return m.shared.comment?'Comentario compartido':(m.shared.reelId?'Reel compartido':'Pulso compartido');
  if(m.kind==='audio')return'Nota de voz';
  if(m.kind==='image')return'Foto';
  if(m.kind==='video')return'Video';
  if(m.kind==='call'||m.kind==='videocall')return m.kind==='videocall'?'Videollamada':'Llamada de voz';
  return'Mensaje';
}
function startChatReply(idx){
  const thread=conversations[activeChatUsername]||[];
  const m=thread[idx];if(!m)return;
  replyingToIndex=idx;
  crpTo.textContent='Respondiendo a '+(m.from===myUsername?'ti mismo':('@'+m.from));
  crpText.textContent=describeMsgForQuote(m);
  chatReplyPreview.classList.add('show');
  chatTextarea.focus();
}
function cancelChatReply(){
  replyingToIndex=-1;
  chatReplyPreview.classList.remove('show');
}
crpClose.addEventListener('click',cancelChatReply);
bctxReply.addEventListener('click',()=>{startChatReply(ctxMsgIndex);closeTopNavView();});
const bctxDeleteMe=document.getElementById('bctxDeleteMe');
const bctxDeleteAll=document.getElementById('bctxDeleteAll');

let activeChatUsername=null,activeChatBg='bg-default',customBgUrl=null,ctxMsgIndex=-1;
let chatAudioEl=null,chatAudioActiveBtn=null,chatAudioResetUI=null,chatAudioOwnerUsername=null;
let viewBeforeMessenger='home';

function nowTime(){
  const d=new Date();
  let h=d.getHours(),m=d.getMinutes(),ampm=h>=12?'PM':'AM';
  h=h%12||12;
  return h+':'+m.toString().padStart(2,'0')+' '+ampm;
}
function nowFull(){
  const d=new Date();
  const days=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const mo=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  let h=d.getHours(),m=d.getMinutes(),ampm=h>=12?'PM':'AM';
  h=h%12||12;
  return days[d.getDay()]+' '+d.getDate()+' '+mo[d.getMonth()]+' · '+h+':'+m.toString().padStart(2,'0')+' '+ampm;
}
// Formato mm:ss a partir de segundos totales — una sola fuente de verdad para
// audios de chat, llamadas y el timeline de reels (antes repetido 5 veces suelto).
function formatDuration(totalSeconds){
  if(isNaN(totalSeconds)||totalSeconds<0) totalSeconds=0;
  const m=Math.floor(totalSeconds/60), s=Math.floor(totalSeconds%60);
  return m+':'+s.toString().padStart(2,'0');
}

/* ---- Messenger list ---- */
window.openMessenger=function(){if(getCurrentMainView()==='messenger')return;viewBeforeMessenger=getCurrentMainView();renderChatList();showMainView('messenger');pushNavView(closeMessenger);};
function closeMessenger(){showMainView(viewBeforeMessenger);}
function renderChatList(){
  const users=(window.svChatUsers?window.svChatUsers():Object.keys(usersData)).filter(u=>u!==myUsername&&usersData[u]);
  chatListEl.innerHTML=users.map(u=>{
    const user=usersData[u];
    const thread=conversations[u]||[];
    const last=thread[thread.length-1];
    let preview='Escribe el primer mensaje';
    if(last){
      if(last.deleted)preview='Mensaje eliminado';
      else if(last.storyReply)preview='Respuesta a historia'+(last.text?': '+last.text.slice(0,32):'');
      else if(last.text)preview=last.text.slice(0,48);
      else if(last.shared)preview=last.shared.comment?'Comentario':'Pulso';
      else if(last.kind==='audio')preview='Nota de voz';
      else if(last.kind==='image')preview='Foto';
      else if(last.kind==='video')preview='Video';
      else if(last.kind==='call')preview='Llamada';
      else if(last.kind==='videocall')preview='Videollamada';
    }
    return `<div class="chat-list-item" data-u="${u}">
      <div class="cl-avatar-wrap"><img class="cl-avatar" src="${user.avatar}" alt=""><div class="cl-online-dot"></div></div>
      <div class="cl-info"><div class="cl-username">${escapeHtml(u)}</div><div class="cl-preview">${escapeHtml(preview)}</div></div>
      <div class="cl-meta"><div class="cl-time">${last?last.time:''}</div></div>
    </div>`;
  }).join('');
  chatListEl.querySelectorAll('.chat-list-item').forEach(el=>el.addEventListener('click',()=>openChatWindow(el.dataset.u)));
}

/* ---- Open chat ---- */
/* expuesta: 13-ambient (fila de activos) y 16-redesign (nuevo mensaje) la llaman desde fuera de este módulo */
window.openChatWindow=openChatWindow;
window.svRenderChatList=function(){renderChatList();};
window.svRenderChatMessages=function(){renderChatMessages();};
function openChatWindow(username){
  const user=usersData[username];if(!user)return;
  if(chatAudioEl && chatAudioOwnerUsername!==username){
    // Se cambia a OTRA conversación: ahí sí se detiene el audio que sonaba en la anterior
    chatAudioEl.pause();chatAudioEl=null;chatAudioActiveBtn=null;chatAudioResetUI=null;chatAudioOwnerUsername=null;
    hideAudioPill();
  }else if(chatAudioEl && chatAudioOwnerUsername===username){
    // Se vuelve a ESTA misma conversación: el audio sigue sonando, solo se oculta la píldora
    hideAudioPill();
  }
  activeChatUsername=username;
  const _thread=conversations[username]||[];
  chatRenderStart=Math.max(0,_thread.length-CHAT_RENDER_WINDOW);
  chatWindowAvatar.src=user.avatar;
  chatWindowUsername.textContent=username;
  chatWindowStatus.textContent='En línea';
  chatWindowHeader.classList.toggle('is-online',['juanp'].includes(username));
  const bg=(()=>{try{return localStorage.getItem('chatbg_'+username)||'bg-default';}catch(e){return 'bg-default';}})();
  let bgImg=null;
  if(bg==='bg-custom'){
    try{bgImg=localStorage.getItem('chatbgimg_'+username);}catch(e){bgImg=null;}
    if(!bgImg){ // imagen no encontrada (nunca se guardó o se limpió el storage): usamos el default en vez de un fondo roto
      setChatBg('bg-default');
    }else{
      setChatBg('bg-custom',bgImg);
      extractImagePalette(bgImg); // recalcula la paleta adaptativa cada vez que se abre este chat
    }
  }else{
    setChatBg(bg);
  }
  chatTextarea.value='';chatTextarea.style.height='';
  chatInputBar.classList.remove('is-expanded');
  cibLeft.classList.remove('collapsed');
  chatSendBtn.classList.add('disabled');
  renderChatMessages();
  const chatWindowAlreadyOpen=chatWindow.classList.contains('open');
  chatWindow.classList.add('open');
  requestAnimationFrame(()=>{chatMessages.scrollTop=chatMessages.scrollHeight;});
  if(!chatWindowAlreadyOpen) pushNavView(closeChatWindow);
}
function closeChatWindow(){
  chatWindow.classList.remove('open');stopRecording(false);
  cancelChatReply();
  closeChatSearch();
  clearTimeout(typingHideTimer);typingIndicatorVisible=false;
  if(chatAudioEl && !chatAudioEl.paused){
    // Sigue sonando: no lo cortamos, lo llevamos a la píldora flotante para poder
    // seguir navegando el feed sin perder la reproducción (como un mini-reproductor persistente)
    showAudioPill();
  }else if(chatAudioEl){
    chatAudioEl.pause();chatAudioEl=null;chatAudioActiveBtn=null;chatAudioResetUI=null;chatAudioOwnerUsername=null;
  }
  activeChatUsername=null;
}

/* ---- Render messages ---- */
/* ---- Reproductor de audio persistente (píldora flotante) ----
   Si sales del chat mientras una nota de voz sigue sonando, no se corta: aparece
   esta píldora minimalista arriba de la pantalla para seguir controlándola sin
   interrumpir la navegación por el feed. */
const floatingAudioPill = document.getElementById('floatingAudioPill');
const fapPlayBtn = document.getElementById('fapPlayBtn');
const fapCloseBtn = document.getElementById('fapCloseBtn');
const fapLabel = document.getElementById('fapLabel');

function showAudioPill(){
  if(!chatAudioEl)return;
  fapLabel.textContent = chatAudioOwnerUsername ? `Nota de voz · @${chatAudioOwnerUsername}` : 'Nota de voz';
  floatingAudioPill.classList.add('show');
  syncAudioPillIcon();
}
function hideAudioPill(){
  floatingAudioPill.classList.remove('show');
}
function syncAudioPillIcon(){
  if(!chatAudioEl)return;
  const playing=!chatAudioEl.paused;
  floatingAudioPill.classList.toggle('playing',playing);
  fapPlayBtn.innerHTML = playing
    ? '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg>';
}
fapPlayBtn.addEventListener('click',()=>{
  if(!chatAudioEl)return;
  if(chatAudioEl.paused)chatAudioEl.play().catch(()=>{});
  else chatAudioEl.pause();
});
fapCloseBtn.addEventListener('click',()=>{
  if(chatAudioEl){chatAudioEl.pause();chatAudioEl=null;chatAudioActiveBtn=null;chatAudioResetUI=null;chatAudioOwnerUsername=null;}
  hideAudioPill();
});
// Tocar la píldora (fuera de los botones) abre de nuevo esa conversación
floatingAudioPill.addEventListener('click',(e)=>{
  if(e.target.closest('#fapPlayBtn, #fapCloseBtn'))return;
  if(chatAudioOwnerUsername) openChatWindow(chatAudioOwnerUsername);
});

/* ---- Indicador de "escribiendo…" ----
   En producción, esto lo dispararía un evento de WebSocket cuando el otro
   dispositivo empieza a teclear (show) y se apaga con cada nuevo evento 'stopped
   typing' o tras timeout (hide). Aquí se expone la misma pareja de funciones —
   conectar un socket real es solo cuestión de llamarlas desde ese evento en vez
   del disparador de demostración que hay al final de sendMsg().
   El debounce es clave: cada señal de "sigue escribiendo" pospone el ocultamiento
   al menos 1200ms, para no parpadear si el otro usuario solo hace una pausa breve. */
let typingIndicatorVisible=false, typingHideTimer=null;
const TYPING_DEBOUNCE_MS=1200;
function showTypingIndicator(){
  if(!activeChatUsername)return;
  clearTimeout(typingHideTimer);
  typingIndicatorVisible=true;
  renderTypingRow();
  typingHideTimer=setTimeout(()=>{typingIndicatorVisible=false;renderTypingRow();},TYPING_DEBOUNCE_MS);
}
function renderTypingRow(){
  let row=chatMessages.querySelector('.typing-row');
  if(typingIndicatorVisible){
    if(!row){
      const user=usersData[activeChatUsername];
      row=document.createElement('div');
      row.className='chat-bubble-row theirs typing-row';
      row.innerHTML=`<img class="cb-avatar" src="${user?user.avatar:''}" alt=""><div class="cb-col"><div class="chat-bubble typing-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div>`;
      chatMessages.appendChild(row);
    }
    chatMessages.scrollTop=chatMessages.scrollHeight;
  }else if(row){row.remove();}
}

/* =====================================================
   RENDERIZADO INCREMENTAL DEL HISTORIAL (virtualización pragmática)
   En vez de mantener cientos de burbujas como nodos DOM activos, solo se renderiza
   un tramo del final del historial + un margen; el resto se carga en bloques al
   hacer scroll hacia arriba (como WhatsApp Web/Telegram Web, que tampoco usan
   windowing de posición absoluta con burbujas de alto variable — es un mal
   candidato para eso, precisamente porque cada burbuja mide distinto según si es
   texto, foto, audio o una tarjeta compartida). El índice real dentro de
   'thread' se conserva siempre en data-i, así que todo lo que ya dependía de ese
   índice (menú contextual, citas embebidas, edición, borrado) sigue funcionando
   sin cambios.
   ===================================================== */
const CHAT_RENDER_WINDOW=40, CHAT_LOAD_MORE_STEP=30;
let chatRenderStart=0;
let chatLoadOlderObserver=null;
function ensureChatLoadOlderObserver(){
  if(chatLoadOlderObserver)return chatLoadOlderObserver;
  chatLoadOlderObserver=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting && chatRenderStart>0){
        const prevScrollHeight=chatMessages.scrollHeight, prevScrollTop=chatMessages.scrollTop;
        chatRenderStart=Math.max(0,chatRenderStart-CHAT_LOAD_MORE_STEP);
        renderChatMessages();
        // Conserva la posición visual exacta: el historial "crece hacia arriba" sin saltos
        chatMessages.scrollTop=chatMessages.scrollHeight-prevScrollHeight+prevScrollTop;
      }
    });
  },{root:chatMessages,threshold:0.1});
  return chatLoadOlderObserver;
}

/* =====================================================
   BÚSQUEDA INDEXADA DENTRO DEL CHAT ACTIVO
   Al escribir, se recorre el texto de cada burbuja con una expresión regular
   (el texto del usuario se escapa para que caracteres como ( ) . + no rompan el
   regex al buscarse literalmente) y las coincidencias se envuelven en <mark> con
   colores de alto contraste — una mutación temporal del DOM que nunca toca los
   datos del mensaje. La navegación secuencial usa scrollIntoView suave.
   Mientras la búsqueda está abierta, se expande temporalmente la ventana
   virtualizada a todo el historial (si no, solo se podría buscar en lo ya
   renderizado) y se restaura al cerrar.
   ===================================================== */
let searchMatches=[], searchActiveIdx=-1, chatRenderStartBeforeSearch=null;
const chatSearchBtn=document.getElementById('chatSearchBtn');
const chatSearchBar=document.getElementById('chatSearchBar');
const chatSearchInput=document.getElementById('chatSearchInput');
const csbCount=document.getElementById('csbCount');
const csbPrev=document.getElementById('csbPrev');
const csbNext=document.getElementById('csbNext');
const csbClose=document.getElementById('csbClose');
function escapeRegexLiteral(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function clearSearchHighlights(){
  chatMessages.querySelectorAll('mark.chat-search-hit').forEach(m=>{
    m.replaceWith(document.createTextNode(m.textContent));
  });
  searchMatches=[];searchActiveIdx=-1;
  csbCount.textContent='';
}
function runChatSearch(query){
  clearSearchHighlights();
  if(!query)return;
  let re;
  try{re=new RegExp('('+escapeRegexLiteral(query)+')','gi');}catch(e){return;}
  chatMessages.querySelectorAll('.msg-text').forEach(el=>{
    if(!re.test(el.textContent))return;
    re.lastIndex=0;
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(tn=>{
      const parts=tn.nodeValue.split(re);
      if(parts.length<2)return;
      const frag=document.createDocumentFragment();
      parts.forEach((part,k)=>{
        if(k%2){const mk=document.createElement('mark');mk.className='chat-search-hit';mk.textContent=part;frag.appendChild(mk);}
        else if(part)frag.appendChild(document.createTextNode(part));
      });
      tn.parentNode.replaceChild(frag,tn);
    });
  });
  searchMatches=Array.from(chatMessages.querySelectorAll('mark.chat-search-hit'));
  if(searchMatches.length){searchActiveIdx=0;focusSearchMatch();}
  else csbCount.textContent='Sin resultados';
}
function focusSearchMatch(){
  searchMatches.forEach((m,i)=>m.classList.toggle('current',i===searchActiveIdx));
  const el=searchMatches[searchActiveIdx];
  if(el)el.scrollIntoView({behavior:'smooth',block:'center'});
  csbCount.textContent=searchMatches.length?`${searchActiveIdx+1}/${searchMatches.length}`:'Sin resultados';
}
function goToNextMatch(){if(!searchMatches.length)return;searchActiveIdx=(searchActiveIdx+1)%searchMatches.length;focusSearchMatch();}
function goToPrevMatch(){if(!searchMatches.length)return;searchActiveIdx=(searchActiveIdx-1+searchMatches.length)%searchMatches.length;focusSearchMatch();}
function openChatSearch(){
  chatSearchBar.classList.add('open');
  chatSearchInput.value='';chatSearchInput.focus();
  clearSearchHighlights();
  if(chatRenderStartBeforeSearch===null){
    chatRenderStartBeforeSearch=chatRenderStart;
    chatRenderStart=0;
    renderChatMessages();
  }
}
function closeChatSearch(){
  chatSearchBar.classList.remove('open');
  clearSearchHighlights();
  if(chatRenderStartBeforeSearch!==null){
    chatRenderStart=chatRenderStartBeforeSearch;
    chatRenderStartBeforeSearch=null;
    renderChatMessages();
  }
}
chatSearchBtn.addEventListener('click',openChatSearch);
csbClose.addEventListener('click',closeChatSearch);
chatSearchInput.addEventListener('input',()=>runChatSearch(chatSearchInput.value.trim()));
chatSearchInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.shiftKey?goToPrevMatch():goToNextMatch();}});
csbNext.addEventListener('click',goToNextMatch);
csbPrev.addEventListener('click',goToPrevMatch);

/* =====================================================
   GESTIÓN DE MEMORIA MULTIMEDIA (lazy unloading)
   Cada imagen del chat guarda su URL real en data-src. Mientras esté dentro de una
   zona de pre-renderizado (~2x el alto del contenedor de scroll, arriba y abajo)
   conserva su src cargado; en cuanto se aleja más allá de esa zona, se le quita el
   src por completo (liberando la memoria de la imagen ya decodificada) sin perder
   el espacio que ocupaba, gracias al aspect-ratio fijado la primera vez que cargó.
   Al volver a acercarse a la zona visible, el src se reinyecta y la imagen recarga.
   ===================================================== */
let chatMediaLazyObserver=null;
function ensureChatMediaLazyObserver(){
  if(chatMediaLazyObserver)return chatMediaLazyObserver;
  chatMediaLazyObserver=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const img=entry.target;
      if(entry.isIntersecting){
        if(!img.getAttribute('src') && img.dataset.src) img.src=img.dataset.src;
      }else if(img.getAttribute('src')){
        img.setAttribute('src',''); img.removeAttribute('src'); // libera la imagen decodificada
      }
    });
  },{root:chatMessages,rootMargin:'200% 0px 200% 0px',threshold:0});
  return chatMediaLazyObserver;
}

function renderChatMessages(){
  if(!activeChatUsername)return;
  const thread=(conversations[activeChatUsername]||(conversations[activeChatUsername]=[]));
  const user=usersData[activeChatUsername];
  if(thread.length===0){
    chatMessages.innerHTML=`<div class="chat-empty"><img src="${user?user.avatar:''}" alt=""><div class="ce-name">${escapeHtml(activeChatUsername)}</div><div class="ce-sub">Inicia la conversación</div></div>`;
    return;
  }
  const renderFrom=Math.min(chatRenderStart,thread.length-1);
  const olderSentinel=renderFrom>0?`<div class="chat-load-older" id="chatLoadOlder"><div class="col-spinner"></div></div>`:'';
  chatMessages.innerHTML=olderSentinel+thread.slice(renderFrom).map((m,j)=>{
    const i=renderFrom+j;
    const mine=m.from===myUsername,side=mine?'mine':'theirs';
    const isLast=i===thread.length-1;
    const showAv=!mine&&(isLast||(thread[i+1]&&thread[i+1].from===myUsername));
    const av=!mine?(showAv?`<img class="cb-avatar" src="${user?user.avatar:''}" alt="">`:`<div class="cb-avatar-space"></div>`):'';
    // Agrupación geométrica: ¿este mensaje es el primero/último de una racha consecutiva
    // del mismo remitente? Con eso el border-radius se ajusta matemáticamente (bordes
    // completos en el primero, esquina de 2px del lado de alineación en los del medio,
    // y cierre de curvatura en el último), igual que WhatsApp/Telegram/iMessage.
    const prevM=thread[i-1],nextM=thread[i+1];
    const isFirstInGroup=!prevM||prevM.from!==m.from||!!prevM.deleted;
    const isLastInGroup=!nextM||nextM.from!==m.from;
    const groupClass=isFirstInGroup&&isLastInGroup?'grp-single':isFirstInGroup?'grp-first':isLastInGroup?'grp-last':'grp-mid';
    // Visto (seen) tick — only on last of mine
    const tick=(mine&&isLastInGroup)?renderMsgStatusTick(m):'';
    // Metadata pill — hidden by CSS unless is-last-in-group
    const meta=`<div class="chat-bubble-meta"><span class="meta-pill"><span class="meta-time">${m.time}</span>${tick}</span></div>`;
    // isLastInGroup class added to the row element
    let b='';
    if(m.deleted){b=`<div class="chat-bubble" style="opacity:.5;font-style:italic;font-size:13px">Mensaje eliminado</div>`;}
    else if(m.storyReply){
      const chipLabel=mine?'Respondiste a su historia':'Respondió a tu historia';
      b=`<div class="story-reply-chip" data-story-thumb="${escapeHtml(m.storyReply.image)}">
          <div class="src-thumb"><div class="src-thumb-inner">${m.storyReply.kind==='video'?`<video src="${m.storyReply.image}" muted playsinline></video>`:`<img src="${m.storyReply.image}" alt="">`}</div></div>
          <div class="src-text"><span class="src-icon"><svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></span><span class="src-label">${chipLabel}</span></div>
        </div>
        <div class="chat-bubble">${escapeHtml(m.text||'')}</div>`;
    }
    else if(m.shared&&m.shared.comment){
      const cm=m.shared.comment;
      b=`<div class="chat-bubble is-shared"><div class="chat-shared-comment" data-sp="${escapeHtml(cm.postId||'')}">
          <div class="csm-head"><img src="${escapeHtml(cm.avatar||'')}" alt=""><b>@${escapeHtml(cm.username)}</b></div>
          <div class="csm-text">${escapeHtml(cm.text)}</div>
          <div class="csm-foot"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Comentario compartido</div>
        </div></div>`;
    }
    else if(m.shared){
      const isReel=!!m.shared.reelId;
      const icon=isReel?'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 8v8l6-4-6-4z"/>':'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>';
      b=`<div class="chat-bubble is-shared"><div class="chat-shared-card" data-sr="${m.shared.reelId||''}" data-sp="${m.shared.postId||''}">
          <div class="csc-media">${m.shared.kind==='video'?`<video src="${m.shared.cover}" muted playsinline></video>`:`<img src="${m.shared.cover}" alt="">`}${m.shared.kind==='video'?`<div class="csc-play"><svg viewBox="0 0 24 24" width="30" height="30"><polygon points="5 3 19 12 5 21 5 3" fill="#fff"/></svg></div>`:''}</div>
          <div class="csc-footer"><span class="csc-icon"><svg viewBox="0 0 24 24">${icon}</svg></span><span class="csc-label">${escapeHtml(m.shared.label||(isReel?'Reel':'Pulso'))}</span></div>
        </div></div>`;
    }
    else if(m.kind==='audio'){
      const seed=m.seed||1;
      const bars=Array.from({length:20},(_,j)=>{const h=Math.max(4,Math.round(6+Math.abs(Math.sin(j*.9+seed)*11)+Math.abs(Math.cos(j*1.3+seed)*5)));return`<div class="audio-bar" style="height:${h}px"></div>`;}).join('');
      b=`<div class="chat-bubble is-audio"><div class="audio-player" data-audio-url="${m.url||''}"><div class="audio-play-btn"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg></div><div class="audio-waveform">${bars}</div><div class="audio-dur">${m.duration||'0:03'}</div></div></div>`;
    }
    else if(m.kind==='image'){b=`<div class="chat-bubble is-media"><img class="chat-media-img" data-src="${m.url}" alt="" loading="lazy"></div>`;}
    else if(m.kind==='video'){b=`<div class="chat-bubble is-media"><div class="chat-media-wrap"><video class="chat-media-video" src="${m.url}" muted playsinline></video><div class="chat-media-play"><svg viewBox="0 0 24 24" width="36" height="36"><polygon points="5 3 19 12 5 21 5 3" fill="#fff"/></svg></div></div></div>`;}
    else if(m.kind==='call'||m.kind==='videocall'){
      const iv=m.kind==='videocall';
      const ico=iv?`<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>`:`<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.11h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.9-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>`;
      b=`<div class="chat-bubble is-call"><div class="call-card"><div class="call-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ico}</svg></div><div class="call-info"><div class="call-label">${iv?'Videollamada':'Llamada de voz'}</div><div class="call-meta">${m.duration||'Sin respuesta'}</div></div></div></div>`;
    }
    else{
      const quoteHtml=m.replyTo?`<div class="msg-quote"><div class="msg-quote-bar"></div><div class="msg-quote-body"><div class="msg-quote-from">${m.replyTo.from===myUsername?'Tú':escapeHtml(m.replyTo.from)}</div><div class="msg-quote-text">${escapeHtml(m.replyTo.text||'')}</div></div></div>`:'';
      b=`<div class="chat-bubble">${quoteHtml}<span class="msg-text">${escapeHtml(m.text||'')}</span></div>`;
    }
    return `<div class="chat-bubble-row ${side} ${groupClass}${isLastInGroup?' is-last-in-group':''}" data-i="${i}"><div class="row-reply-icon"><svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></div>${av}<div class="cb-col">${b}${meta}</div></div>`;
  }).join('');

  // bind shared cards
  chatMessages.querySelectorAll('[data-sr],[data-sp]').forEach(c=>{
    c.addEventListener('click',()=>{if(c.dataset.sr)try{closeTopNavView();openReelFromPin(c.dataset.sr);}catch(e){}});
  });
  // story reply: toca la miniatura para verla en grande
  chatMessages.querySelectorAll('.story-reply-chip').forEach(chip=>{
    chip.addEventListener('click',()=>{const src=chip.dataset.storyThumb;if(src)try{openMediaViewer([src],0);}catch(e){}});
  });
  // bind media
  chatMessages.querySelectorAll('.chat-media-img').forEach(img=>{
    img.addEventListener('click',()=>{const full=img.dataset.src||img.src;try{openMediaViewer([full],0);}catch(e){}});
    // Fija el aspect-ratio real en cuanto la imagen carga por primera vez, para que
    // descargar su src después (lazy unloading) no colapse el espacio que ocupaba.
    img.addEventListener('load',()=>{
      if(img.naturalWidth && img.naturalHeight && !img.style.aspectRatio){
        img.style.aspectRatio=`${img.naturalWidth}/${img.naturalHeight}`;
      }
    },{once:false});
    ensureChatMediaLazyObserver().observe(img);
  });
  chatMessages.querySelectorAll('.chat-media-wrap').forEach(w=>{
    w.addEventListener('click',()=>{const v=w.querySelector('video');if(v){v.muted=false;v.controls=true;v.play();const p=w.querySelector('.chat-media-play');if(p)p.style.display='none';}});
  });
  // audio: reproducción REAL. Antes esto solo animaba el ícono y las barras con un
  // temporizador falso — nunca sonaba nada. Ahora usa un <audio> real, pausa cualquier
  // otro audio que estuviera sonando (para no solapar voces), y sincroniza las barras
  // del waveform contra el progreso real de reproducción.
  chatMessages.querySelectorAll('.audio-play-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const player=btn.closest('.audio-player');
      const url=player.dataset.audioUrl;
      if(!url)return;
      const bars=player.querySelectorAll('.audio-bar');
      const svg=btn.querySelector('svg');
      const durEl=player.querySelector('.audio-dur');
      const setPlayingIcon=()=>{svg.innerHTML='<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>';syncAudioPillIcon();};
      const setPausedIcon=()=>{svg.innerHTML='<polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>';bars.forEach(b=>b.classList.remove('active'));syncAudioPillIcon();};

      // Toggle: si esta burbuja ya está sonando, un segundo click la pausa
      if(chatAudioEl&&chatAudioActiveBtn===btn&&!chatAudioEl.paused){
        chatAudioEl.pause();
        return;
      }
      // Solo puede sonar un audio a la vez: detiene y resetea el anterior
      if(chatAudioEl){chatAudioEl.pause();}
      if(chatAudioResetUI)chatAudioResetUI();
      hideAudioPill(); // se está escuchando desde dentro del chat, no hace falta la píldora

      chatAudioEl=new Audio(url);
      chatAudioActiveBtn=btn;
      chatAudioResetUI=setPausedIcon;
      chatAudioOwnerUsername=activeChatUsername;

      chatAudioEl.addEventListener('play',setPlayingIcon);
      chatAudioEl.addEventListener('pause',setPausedIcon);
      chatAudioEl.addEventListener('ended',()=>{setPausedIcon();hideAudioPill();});
      chatAudioEl.addEventListener('timeupdate',()=>{
        const dur=chatAudioEl.duration;
        if(dur&&isFinite(dur)){
          const activeCount=Math.round((chatAudioEl.currentTime/dur)*bars.length);
          bars.forEach((b,k)=>b.classList.toggle('active',k<activeCount));
        }
      });
      chatAudioEl.addEventListener('loadedmetadata',()=>{
        if(durEl&&isFinite(chatAudioEl.duration)){
          const d=Math.floor(chatAudioEl.duration);
          durEl.textContent=formatDuration(d);
        }
      });
      chatAudioEl.addEventListener('error',()=>{
        setPausedIcon();
        console.error('No se pudo reproducir el audio del mensaje.');
      });
      chatAudioEl.play().catch(()=>{setPausedIcon();});
    });
  });
  // Long press → context menu | double-tap → select text (iPhone blur style) |
  // deslizar a la derecha → responder (Instagram style, funciona en burbujas propias y ajenas)
  chatMessages.querySelectorAll('.chat-bubble-row').forEach(row=>{
    const bubble=row.querySelector('.chat-bubble');
    const replyIcon=row.querySelector('.row-reply-icon');
    let pressTimer, lastTap=0;
    let touchStartX=0, touchStartY=0, isSwiping=false, swipeArmed=false;
    const SWIPE_MAX=64, SWIPE_THRESHOLD=46;
    row.addEventListener('touchstart',e=>{
      const t=e.touches[0];
      touchStartX=t.clientX; touchStartY=t.clientY; isSwiping=false; swipeArmed=false;
      row.style.transition='none';
      pressTimer=setTimeout(()=>{
        openBubbleCtx(+row.dataset.i,touchStartX,touchStartY);
      },500);
    },{passive:true});
    row.addEventListener('touchmove',e=>{
      const t=e.touches[0];
      const dx=t.clientX-touchStartX, dy=t.clientY-touchStartY;
      if(!isSwiping){
        // Decide el tipo de gesto una sola vez: si es más horizontal que vertical, es swipe;
        // si no, se deja el scroll vertical normal del historial sin interferir.
        if(Math.abs(dx)>10 || Math.abs(dy)>10){
          clearTimeout(pressTimer);
          if(Math.abs(dx)>Math.abs(dy) && dx>0) isSwiping=true;
          else return; // gesto vertical: no tocamos nada más, que haga scroll normal
        } else return;
      }
      if(isSwiping){
        e.preventDefault(); // evita que el scroll vertical "pelee" con el arrastre horizontal
        const raw=Math.max(0,dx);
        const eased=raw<SWIPE_MAX?raw:SWIPE_MAX+(raw-SWIPE_MAX)*0.18; // resistencia al pasar el máximo
        row.style.transform=`translateX(${eased}px)`;
        const nowArmed=eased>SWIPE_THRESHOLD;
        if(nowArmed!==swipeArmed){
          swipeArmed=nowArmed;
          replyIcon.classList.toggle('armed',swipeArmed);
          if(swipeArmed && navigator.vibrate) navigator.vibrate(6);
        }
      }
    },{passive:false});
    row.addEventListener('touchend',e=>{
      clearTimeout(pressTimer);
      if(isSwiping){
        row.style.transition='transform .22s cubic-bezier(.34,1.56,.64,1)';
        row.style.transform='';
        replyIcon.classList.remove('armed');
        if(swipeArmed) startChatReply(+row.dataset.i);
        isSwiping=false;swipeArmed=false;
        return;
      }
      // Double tap = select text
      const now=Date.now();
      if(bubble&&now-lastTap<300){
        e.preventDefault();
        activateTextSelection(bubble);
      }
      lastTap=now;
    },{passive:false});
    row.addEventListener('touchcancel',()=>{
      clearTimeout(pressTimer);
      row.style.transition='transform .22s cubic-bezier(.34,1.56,.64,1)';
      row.style.transform='';
      replyIcon.classList.remove('armed');
      isSwiping=false;swipeArmed=false;
    },{passive:true});
    row.addEventListener('contextmenu',e=>{e.preventDefault();openBubbleCtx(+row.dataset.i,e.clientX,e.clientY);});
  });
  // Cita embebida: tocarla salta al mensaje original y lo resalta un instante
  chatMessages.querySelectorAll('.msg-quote').forEach(q=>{
    q.addEventListener('click',(e)=>{
      e.stopPropagation();
      const row=q.closest('.chat-bubble-row');
      const idx=row?+row.dataset.i:-1;
      const thread=conversations[activeChatUsername]||[];
      // Busca hacia atrás desde este mensaje el más reciente que coincida con la cita
      for(let j=idx-1;j>=0;j--){
        if(describeMsgForQuote(thread[j])===q.querySelector('.msg-quote-text').textContent){
          const target=chatMessages.querySelector(`.chat-bubble-row[data-i="${j}"] .chat-bubble`);
          if(target){
            target.scrollIntoView({block:'center',behavior:'smooth'});
            target.style.transition='background .25s';
            const prevFilter=target.style.filter;
            target.style.filter='brightness(1.25)';
            setTimeout(()=>{target.style.filter=prevFilter||'';},400);
          }
          break;
        }
      }
    });
  });
  // Virtualización: si hay más historial arriba, observa el centinela para cargarlo
  const sentinel=document.getElementById('chatLoadOlder');
  if(sentinel) ensureChatLoadOlderObserver().observe(sentinel);
  // Si la búsqueda está abierta, este render acaba de borrar los <mark> — se reaplican
  if(chatSearchBar.classList.contains('open') && chatSearchInput.value.trim()){
    runChatSearch(chatSearchInput.value.trim());
  }
  // Restaura el indicador de "escribiendo…" si seguía activo (este render lo borró
  // al reconstruir todo el innerHTML del historial)
  if(typingIndicatorVisible) renderTypingRow();
  chatMessages.scrollTop=chatMessages.scrollHeight;
}

/* ---- Text selection iPhone-style ---- */
function activateTextSelection(bubble){
  // Enable selection on this bubble
  bubble.classList.add('selecting');
  chatMessages.classList.add('has-selection');
  // Select all text in bubble
  const range=document.createRange();
  range.selectNodeContents(bubble);
  const sel=window.getSelection();
  if(sel){sel.removeAllRanges();sel.addRange(range);}
  // Remove selection mode when user taps elsewhere
  const cleanup=()=>{
    chatMessages.querySelectorAll('.selecting').forEach(b=>b.classList.remove('selecting'));
    chatMessages.classList.remove('has-selection');
    document.removeEventListener('touchstart',cleanup);
    document.removeEventListener('mousedown',cleanup);
  };
  setTimeout(()=>{
    document.addEventListener('touchstart',cleanup,{once:true,passive:true});
    document.addEventListener('mousedown',cleanup,{once:true});
  },50);
}

/* ---- Context menu ---- */
function openBubbleCtx(idx,x,y){
  const thread=conversations[activeChatUsername]||[];
  const m=thread[idx];if(!m||m.deleted)return;
  ctxMsgIndex=idx;const mine=m.from===myUsername;
  bctxPreview.textContent=m.text||(m.kind?`[${m.kind}]`:'[contenido]');
  bctxMeta.innerHTML=`<span>Enviado: ${m.fullTime||m.time}</span><span>De: ${escapeHtml(m.from)}</span>`;
  bctxCopy.style.display=m.text?'':'none';
  bctxEdit.style.display=(mine&&m.text)?'':'none';
  bctxDeleteMe.style.display='flex';
  bctxDeleteAll.style.display=mine?'flex':'none';
  const bctxAlreadyOpen=chatWindow.classList.contains('ctx-active');
  chatWindow.classList.add('ctx-active');
  bubbleCtxOverlay.classList.add('open');
  bubbleCtxPanel.classList.add('open');
  positionBubbleCtx(x,y);
  if(!bctxAlreadyOpen) pushNavView(closeBubbleCtx);
}
// Cálculo de colisiones: ancla el menú justo junto al punto donde se hizo long-press.
// Si el menú proyectado se saldría del viewport por cualquier lado, invierte el eje
// correspondiente (como aquí no hay top/bottom/left/right sueltos sino un solo
// translate, se resuelve invirtiendo el signo del offset en ese eje) para que el
// menú quede siempre completamente visible, sin importar en qué esquina se toque.
function positionBubbleCtx(x,y){
  const margin=12;
  bubbleCtxPanel.style.transition='none';
  bubbleCtxPanel.style.left='0px';bubbleCtxPanel.style.top='0px';
  bubbleCtxPanel.style.transform='translate(0,0) scale(.9)';
  const rect=bubbleCtxPanel.getBoundingClientRect(); // mide el tamaño real ya con el contenido puesto
  const vw=window.innerWidth, vh=window.innerHeight;
  let originX='left', originY='top', px=x, py=y;
  if(typeof x!=='number'||typeof y!=='number'){ px=vw/2; py=vh/2; originX='center'; originY='center'; }
  else{
    if(px+rect.width+margin>vw) originX='right';   // se saldría por la derecha → ancla por su derecha
    if(py+rect.height+margin>vh) originY='bottom';  // se saldría por abajo → ancla por abajo
    px=Math.min(Math.max(px,margin),vw-margin);
    py=Math.min(Math.max(py,margin),vh-margin);
  }
  const tx=originX==='right'?'-100%':originX==='center'?'-50%':'0%';
  const ty=originY==='bottom'?'-100%':originY==='center'?'-50%':'0%';
  bubbleCtxPanel.style.transformOrigin=`${originX==='center'?'center':originX} ${originY==='center'?'center':originY}`;
  bubbleCtxPanel.style.left=px+'px';
  bubbleCtxPanel.style.top=py+'px';
  bubbleCtxPanel.style.transform=`translate(${tx},${ty}) scale(.9)`;
  requestAnimationFrame(()=>{
    bubbleCtxPanel.style.transition='opacity .18s,transform .22s cubic-bezier(.34,1.56,.64,1)';
    bubbleCtxPanel.style.transform=`translate(${tx},${ty}) scale(1)`;
  });
}
function closeBubbleCtx(){chatWindow.classList.remove('ctx-active');bubbleCtxOverlay.classList.remove('open');bubbleCtxPanel.classList.remove('open');}
bubbleCtxOverlay.addEventListener('click',closeTopNavView);
bctxCopy.addEventListener('click',()=>{const m=(conversations[activeChatUsername]||[])[ctxMsgIndex];if(m&&m.text)navigator.clipboard&&navigator.clipboard.writeText(m.text).catch(()=>{});closeTopNavView();});
bctxEdit.addEventListener('click',()=>{const m=(conversations[activeChatUsername]||[])[ctxMsgIndex];if(m&&m.text){chatTextarea.value=m.text;chatTextarea.dataset.editIdx=ctxMsgIndex;autoResizeTextarea();updateChatSendState();chatTextarea.focus();}closeTopNavView();});
bctxDeleteMe.addEventListener('click',()=>{const t=conversations[activeChatUsername];if(t&&t[ctxMsgIndex])t.splice(ctxMsgIndex,1);closeTopNavView();renderChatMessages();renderChatList();persistConversation(activeChatUsername);});
bctxDeleteAll.addEventListener('click',()=>{const t=conversations[activeChatUsername];if(t&&t[ctxMsgIndex])t[ctxMsgIndex]={...t[ctxMsgIndex],deleted:true,text:null};closeTopNavView();renderChatMessages();renderChatList();persistConversation(activeChatUsername);});

/* ---- Input ---- */
const chatTextareaMirror=document.getElementById('chatTextareaMirror');
function autoResizeTextarea(){
  // Sincroniza el ancho del clon con el del textarea real (una sola lectura de layout,
  // sin escrituras intercaladas -> no hay thrashing) y mide sobre el clon, no sobre
  // el elemento visible.
  chatTextareaMirror.style.width=chatTextarea.clientWidth+'px';
  chatTextareaMirror.textContent=chatTextarea.value+'\u200b'; // zero-width space: refleja saltos de línea finales
  const h=Math.min(chatTextareaMirror.scrollHeight,130);
  chatTextarea.style.height=h+'px'; // única escritura real sobre el elemento visible
  const multiline=h>28;
  chatInputBar.classList.toggle('is-expanded',multiline);
  // In multiline mode align bottom so send btn aligns to last line
  chatTextarea.style.alignSelf=multiline?'flex-end':'center';
}
function updateChatSendState(){
  const has=chatTextarea.value.trim().length>0;
  chatSendBtn.classList.toggle('disabled',!has);
  cibLeft.classList.toggle('collapsed',has);
}
chatTextarea.addEventListener('input',()=>{autoResizeTextarea();updateChatSendState();});
chatTextarea.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}});
chatSendBtn.addEventListener('click',sendMsg);
chatWindowBackBtn.addEventListener('click',closeTopNavView);
messengerBackBtn.addEventListener('click',closeTopNavView);

function sendMsg(){
  const text=chatTextarea.value.trim();if(!text||!activeChatUsername)return;
  const thread=(conversations[activeChatUsername]||(conversations[activeChatUsername]=[]));
  const ei=chatTextarea.dataset.editIdx;
  if(ei!=null&&ei!==''){const idx=+ei;if(thread[idx]){thread[idx].text=text;thread[idx].edited=true;}delete chatTextarea.dataset.editIdx;}
  else{
    // Actualización optimista: la burbuja se inyecta YA (con "sending" si hay red, o
    // "pending" si no la hay) y avanza de estado de forma asíncrona — el usuario nunca
    // espera a una "base de datos".
    const offline=!navigator.onLine;
    const msg={from:myUsername,text,time:nowTime(),fullTime:nowFull(),status:offline?'pending':'sending'};
    if(replyingToIndex>=0 && thread[replyingToIndex] && !thread[replyingToIndex].deleted){
      const q=thread[replyingToIndex];
      msg.replyTo={from:q.from,text:describeMsgForQuote(q)};
    }
    thread.push(msg);
    if(offline) queueForBackgroundSync();
    else advanceMsgStatus(thread,thread.length-1);
  }
  cancelChatReply();
  chatTextarea.value='';autoResizeTextarea();updateChatSendState();
  renderChatMessages();renderChatList();
  persistConversation(activeChatUsername);
  // Demo del indicador de escritura (en producción esto llega por WebSocket, no por timeout)
  const forUser=activeChatUsername;
  if(!(window.SvBackend&&SvBackend.enabled)) setTimeout(()=>{ if(activeChatUsername===forUser) showTypingIndicator(); }, 700+Math.random()*700);
}

/* ---- Share from outside ---- */
window.sendSharedContentToUser=function(username,payload){
  (conversations[username]||(conversations[username]=[])).push({from:myUsername,shared:payload,time:nowTime(),fullTime:nowFull()});
  try{persistConversation(username);}catch(e){}
  try{renderChatList();}catch(e){}
};

/* ---- Audio recording ---- */
let mediaRec=null,recChunks=[],recInt=null,recSecs=0;
function startRecording(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    alert('Tu navegador no soporta grabación de audio.');return;
  }
  // Reset state
  mediaRec=null;recChunks=[];recSecs=0;
  navigator.mediaDevices.getUserMedia({audio:true,video:false}).then(stream=>{
    chatRecIndicator.classList.add('active');
    chatInputWrap.style.display='none';
    chatRecordBtn.classList.add('recording');
    chatRecTimerEl.textContent='0:00';
    recInt=setInterval(()=>{
      recSecs++;
      chatRecTimerEl.textContent=formatDuration(recSecs);
    },1000);
    // Try preferred codecs
    const mimeTypes=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'];
    const mime=mimeTypes.find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
    mediaRec=new MediaRecorder(stream,mime?{mimeType:mime}:{});
    mediaRec.ondataavailable=e=>{if(e.data&&e.data.size>0)recChunks.push(e.data);};
    mediaRec.onstop=()=>{
      stream.getTracks().forEach(t=>t.stop());
      clearInterval(recInt);
      chatRecIndicator.classList.remove('active');
      chatInputWrap.style.display='flex';
      chatRecordBtn.classList.remove('recording');
      if(recChunks.length>0){
        const blob=new Blob(recChunks,{type:mime||'audio/webm'});
        sendAudioMsg(blob,recSecs);
      }
    };
    mediaRec.start(100); // collect data every 100ms
  }).catch(err=>{
    console.error('Mic error:',err);
    alert('No se pudo acceder al micrófono: '+err.message);
  });
}
function stopRecording(doSend){
  if(!mediaRec||mediaRec.state==='inactive'){
    // Nothing recording — just reset UI
    clearInterval(recInt);
    chatRecIndicator.classList.remove('active');
    chatInputWrap.style.display='flex';
    chatRecordBtn.classList.remove('recording');
    return;
  }
  if(!doSend){
    // Cancel: strip onstop so no audio is sent
    mediaRec.ondataavailable=null;
    mediaRec.onstop=()=>{
      mediaRec.stream&&mediaRec.stream.getTracks().forEach(t=>t.stop());
      clearInterval(recInt);
      chatRecIndicator.classList.remove('active');
      chatInputWrap.style.display='flex';
      chatRecordBtn.classList.remove('recording');
      recChunks=[];
    };
  }
  // stop() fires onstop asynchronously
  try{mediaRec.stop();}catch(e){}
}
function sendAudioMsg(blob,secs){
  if(!activeChatUsername)return;
  const dur=formatDuration(secs);
  (conversations[activeChatUsername]||(conversations[activeChatUsername]=[])).push({from:myUsername,kind:'audio',url:URL.createObjectURL(blob),duration:dur,seed:Math.random()*10,time:nowTime(),fullTime:nowFull()});
  renderChatMessages();renderChatList();
}
chatRecordBtn.addEventListener('click',()=>{
  if(mediaRec&&(mediaRec.state==='recording'||mediaRec.state==='paused'))stopRecording(true);
  else startRecording();
});
chatRecCancel.addEventListener('click',()=>stopRecording(false));
chatRecSend.addEventListener('click',()=>stopRecording(true));

/* ---- Media upload sheet ---- */
chatPhotoBtn.addEventListener('click',openMUS);
function openMUS(){
  const musAlreadyOpen=mediaUploadSheet.classList.contains('open');
  mediaUploadOverlay.style.display='block';
  requestAnimationFrame(()=>{mediaUploadOverlay.style.opacity='1';});
  mediaUploadSheet.classList.add('open');
  if(!musAlreadyOpen) pushNavView(closeMUS);
}
function closeMUS(){
  mediaUploadSheet.classList.remove('open');
  mediaUploadOverlay.style.opacity='0';
  clearTimeout(window._musCt);
  window._musCt=setTimeout(()=>{mediaUploadOverlay.style.display='';mediaUploadOverlay.style.opacity='';},300);
}
mediaUploadOverlay.addEventListener('click',closeTopNavView);
document.getElementById('musCancel').addEventListener('click',closeTopNavView);
document.getElementById('musTakePhoto').addEventListener('click',()=>{closeTopNavView();chatFileInput.accept='image/png,image/jpeg,image/jpg,image/webp,image/*';chatFileInput.setAttribute('capture','environment');chatFileInput.click();});
document.getElementById('musPickGallery').addEventListener('click',()=>{closeTopNavView();chatFileInput.accept='image/png,image/jpeg,image/jpg,image/webp,video/*,image/*';chatFileInput.removeAttribute('capture');chatFileInput.click();});
document.getElementById('musPickVideo').addEventListener('click',()=>{closeTopNavView();chatVideoInput.click();});
document.getElementById('musExtractAudio').addEventListener('click',()=>{closeTopNavView();chatAudioInput.click();});
chatFileInput.addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  if(f.type.startsWith('video/')){
    openVideoTrim(URL.createObjectURL(f),false);
  }else{
    // Las fotos tomadas con la cámara del dispositivo suelen venir en resolución muy alta
    // (12MP+). Enviarlas tal cual puede agotar la memoria del navegador móvil y disparar
    // el error "memoria insuficiente" (y a veces reiniciar la app). Se comprimen antes de
    // usarlas — en un Worker con OffscreenCanvas cuando el navegador lo soporta, para no
    // bloquear la UI ni un instante durante el proceso.
    try{
      const url=await compressImageSmart(f,1600,0.82);
      sendMediaMsg('image',url);
    }catch(err){
      console.error('No se pudo comprimir la foto, se usa el archivo original:',err);
      sendMediaMsg('image',URL.createObjectURL(f));
    }
  }
  chatFileInput.value='';
});
chatVideoInput.addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;openVideoTrim(URL.createObjectURL(f),false);chatVideoInput.value='';});
chatAudioInput.addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;openVideoTrim(URL.createObjectURL(f),true);chatAudioInput.value='';});
function sendMediaMsg(kind,url){if(!activeChatUsername)return;(conversations[activeChatUsername]||(conversations[activeChatUsername]=[])).push({from:myUsername,kind,url,time:nowTime(),fullTime:nowFull(),status:'sent'});renderChatMessages();renderChatList();persistConversation(activeChatUsername);}

/* ---- Live video (with camera access attempt) ---- */
/* chatLiveBtn removed — video accessible via ⋯ menu */

/* ---- Video Trim ---- */
let vtAudioOnly=false,vtSR=0,vtER=1;
function openVideoTrim(url,audioOnly){
  vtAudioOnly=audioOnly;vtSR=0;vtER=1;
  vtTrimStart.style.left='0%';vtTrimEnd.style.right='0%';vtProgress.style.width='0%';
  vtTabClip.classList.toggle('active',!audioOnly);vtTabAudio.classList.toggle('active',audioOnly);
  vtVideo.src=url;vtVideo.load();vtVideo.addEventListener('loadedmetadata',updateVtLbl,{once:true});
  const vtAlreadyOpen=videoTrimOverlay.classList.contains('open');
  videoTrimOverlay.classList.add('open');vtVideo.play().catch(()=>{});
  if(!vtAlreadyOpen) pushNavView(closeVT);
}
function closeVT(){videoTrimOverlay.classList.remove('open');vtVideo.pause();vtVideo.src='';}
function updateVtLbl(){const dur=vtVideo.duration||0;const len=(vtER-vtSR)*dur;vtTimeLabel.textContent=`Duración: ${len.toFixed(1)}s${vtAudioOnly?' · Solo audio':''}`;}
vtTabClip.addEventListener('click',()=>{vtAudioOnly=false;vtTabClip.classList.add('active');vtTabAudio.classList.remove('active');updateVtLbl();});
vtTabAudio.addEventListener('click',()=>{vtAudioOnly=true;vtTabAudio.classList.add('active');vtTabClip.classList.remove('active');updateVtLbl();});
vtCancel.addEventListener('click',closeTopNavView);
vtSend.addEventListener('click',()=>{const url=vtVideo.src;closeTopNavView();sendMediaMsg(vtAudioOnly?'audio':'video',url);});
function makeDrag(handle,cb){
  let d=false;
  handle.addEventListener('touchstart',e=>{d=true;e.preventDefault();},{passive:false});
  handle.addEventListener('mousedown',()=>d=true);
  const mv=e=>{if(!d)return;const r=vtTimeline.getBoundingClientRect();const cx=e.touches?e.touches[0].clientX:e.clientX;cb(Math.max(0,Math.min(1,(cx-r.left)/r.width)));updateVtLbl();};
  document.addEventListener('touchmove',mv,{passive:false});document.addEventListener('mousemove',mv);
  document.addEventListener('touchend',()=>d=false);document.addEventListener('mouseup',()=>d=false);
}
makeDrag(vtTrimStart,r=>{vtSR=Math.min(r,vtER-.05);vtTrimStart.style.left=(vtSR*100)+'%';});
makeDrag(vtTrimEnd,  r=>{vtER=Math.max(r,vtSR+.05);vtTrimEnd.style.right=((1-vtER)*100)+'%';});
vtVideo.addEventListener('timeupdate',()=>{const dur=vtVideo.duration||1;vtProgress.style.width=(vtVideo.currentTime/dur*100)+'%';if(vtVideo.currentTime>=vtER*dur)vtVideo.currentTime=vtSR*dur;});

/* ---- Chat settings ---- */
chatSettingsBtn.addEventListener('click',openChatSettings);
function openChatSettings(){
  const user=usersData[activeChatUsername];
  if(user){cspAvatar.src=user.avatar;cspName.textContent=activeChatUsername;}
  chatBgPicker.querySelectorAll('.bg-swatch').forEach(s=>s.classList.toggle('active',s.dataset.bg===activeChatBg));
  const cspAlreadyOpen=chatSettingsPanel.classList.contains('open');
  chatSettingsOverlay.style.display='block';
  requestAnimationFrame(()=>{chatSettingsOverlay.style.opacity='1';chatSettingsPanel.classList.add('open');});
  if(!cspAlreadyOpen) pushNavView(closeChatSettings);
}
function closeChatSettings(){
  chatSettingsPanel.classList.remove('open');
  clearTimeout(window._cspCt);
  window._cspCt=setTimeout(()=>{chatSettingsOverlay.style.display='';chatSettingsOverlay.style.opacity='';},320);
}
chatSettingsOverlay.addEventListener('click',closeTopNavView);

/* ---- BG ---- */
function setChatBg(bg,imgUrl){
  ['bg-default','bg-dark','bg-gradient','bg-blue','bg-purple','bg-rose','bg-green','bg-custom'].forEach(c=>chatWindow.classList.remove(c));
  chatWindow.classList.add(bg);activeChatBg=bg;
  if(bg==='bg-custom'&&imgUrl){
    customBgUrl=imgUrl;chatBgLayer.style.backgroundImage=`url('${imgUrl}')`;chatBgLayer.style.backgroundSize='cover';chatBgLayer.style.backgroundPosition='center';
    if(bgSwatchPreview){bgSwatchPreview.style.backgroundImage=`url('${imgUrl}')`;bgSwatchPreview.style.display='block';}
    if(bgSwatchCustom)bgSwatchCustom.classList.add('has-image');
  }else if(bg!=='bg-custom'){chatBgLayer.style.backgroundImage='';}
  try{localStorage.setItem('chatbg_'+activeChatUsername,bg);}catch(e){}
}

// Onda de "click" que nace exactamente donde se toca el swatch — puro feedback táctil premium
function spawnSwatchRipple(swatchEl,clientX,clientY){
  const r=swatchEl.getBoundingClientRect();
  const size=Math.max(r.width,r.height)*1.6;
  const ripple=document.createElement('div');
  ripple.className='swatch-ripple';
  ripple.style.width=ripple.style.height=size+'px';
  ripple.style.left=((clientX??r.left+r.width/2)-r.left-size/2)+'px';
  ripple.style.top=((clientY??r.top+r.height/2)-r.top-size/2)+'px';
  swatchEl.appendChild(ripple);
  ripple.addEventListener('animationend',()=>ripple.remove());
}

chatBgPicker.addEventListener('click',e=>{
  const sw=e.target.closest('.bg-swatch');if(!sw)return;
  spawnSwatchRipple(sw,e.clientX,e.clientY);
  const bg=sw.dataset.bg;
  if(bg==='bg-custom'){
    // ALWAYS open file picker — allows re-selecting image at any time
    chatBgFileInput.value='';
    chatBgFileInput.click();
    return;
  }
  setChatBg(bg);
  chatBgPicker.querySelectorAll('.bg-swatch').forEach(s=>s.classList.toggle('active',s===sw));
});

// Reduce cualquier foto (incluso las de 12MP+ de una cámara) a un tamaño manejable antes
// de usarla. Esto es clave para que el fondo de chat no dispare errores de memoria en
// móviles y para que quepa cómodamente en localStorage al guardarla por usuario.
// Helper interno compartido: decodifica el archivo y lo dibuja ya redimensionado
// en un canvas. compressImageFile (fondo de chat, necesita dataURL persistible) y
// compressImageFileMainThreadBlob (adjuntar fotos, blob URL desechable) antes
// duplicaban esta misma lógica de lectura+resize casi línea por línea.
function loadFileToResizedCanvas(file, maxDim){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxDim) { h = Math.round(h*maxDim/w); w = maxDim; } }
        else { if (h > maxDim) { w = Math.round(w*maxDim/h); h = maxDim; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
// Usada para el fondo de chat: necesita persistir en localStorage, por eso dataURL.
function compressImageFile(file, maxDim, quality){
  return loadFileToResizedCanvas(file, maxDim).then(canvas => canvas.toDataURL('image/jpeg', quality));
}

/* =====================================================
   PROCESAMIENTO DE MEDIOS FUERA DEL HILO PRINCIPAL (Web Worker + OffscreenCanvas)
   Al adjuntar una foto al chat, redimensionar/comprimir en el hilo principal —aunque
   sea rápido— igual compite con el renderizado de la UI durante esos milisegundos, lo
   que en hardware limitado puede notarse como un microcorte. Aquí se delega todo el
   trabajo pesado (decodificar, escalar, re-codificar a WebP) a un Web Worker con su
   propio OffscreenCanvas, dejando el hilo principal completamente libre para seguir
   pintando a 60fps mientras la imagen se procesa en paralelo.
   Si el navegador no soporta Worker/OffscreenCanvas/createImageBitmap (Safari viejo,
   navegadores embebidos limitados, etc.), cae de vuelta automáticamente al canvas en
   el hilo principal — nunca se rompe el adjuntar una foto por esto.
   Nota: el redimensionado dentro del Worker (más abajo) SÍ tiene que repetir el
   mismo cálculo de ancho/alto — corre en un hilo aparte que no puede compartir
   funciones del hilo principal sin pasarlas por mensaje, así que ahí la duplicación
   es inevitable, no un descuido.
   ===================================================== */
let mediaWorker=null, mediaWorkerSupported=null;
function getMediaWorker(){
  if(mediaWorkerSupported===false) return null;
  if(mediaWorker) return mediaWorker;
  if(typeof Worker==='undefined' || typeof OffscreenCanvas==='undefined'){ mediaWorkerSupported=false; return null; }
  const workerSrc=`
    self.onmessage = async (e) => {
      const { bitmap, maxDim, quality, id } = e.data;
      try {
        let w = bitmap.width, h = bitmap.height;
        if (w > h) { if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; } }
        else { if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; } }
        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, w, h);
        if (bitmap.close) bitmap.close();
        const blob = await canvas.convertToBlob({ type: 'image/webp', quality });
        self.postMessage({ id, blob });
      } catch (err) {
        self.postMessage({ id, error: String((err && err.message) || err) });
      }
    };
  `;
  try{
    const blobUrl=URL.createObjectURL(new Blob([workerSrc],{type:'application/javascript'}));
    mediaWorker=new Worker(blobUrl);
    mediaWorkerSupported=true;
  }catch(e){ mediaWorkerSupported=false; return null; }
  return mediaWorker;
}
let mediaWorkerReqId=0;
function compressImageOffThread(file,maxDim,quality){
  return new Promise((resolve,reject)=>{
    const worker=getMediaWorker();
    if(!worker || typeof createImageBitmap==='undefined'){ reject(new Error('offthread-unsupported')); return; }
    createImageBitmap(file).then(bitmap=>{
      const id=++mediaWorkerReqId;
      const handler=(e)=>{
        if(e.data.id!==id) return;
        worker.removeEventListener('message',handler);
        if(e.data.error){ reject(new Error(e.data.error)); return; }
        resolve(URL.createObjectURL(e.data.blob));
      };
      worker.addEventListener('message',handler);
      worker.postMessage({bitmap,maxDim,quality,id},[bitmap]);
    }).catch(reject);
  });
}
// Fallback en el hilo principal para adjuntar fotos (si el Worker no está
// disponible): blob URL, intercambiable con la ruta del Worker.
function compressImageFileMainThreadBlob(file, maxDim, quality){
  return loadFileToResizedCanvas(file, maxDim).then(canvas => new Promise((resolve, reject) => {
    canvas.toBlob(blob => { blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('toBlob-failed')); }, 'image/webp', quality);
  }));
}
// Punto de entrada único usado al adjuntar fotos al chat.
async function compressImageSmart(file,maxDim,quality){
  try{ return await compressImageOffThread(file,maxDim,quality); }
  catch(e){ return await compressImageFileMainThreadBlob(file,maxDim,quality); }
}

chatBgFileInput.addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  chatBgFileInput.value=''; // reset ya, así se puede re-elegir el mismo archivo
  try{
    const dataUrl=await compressImageFile(f,1000,0.75);
    setChatBg('bg-custom',dataUrl);
    extractImagePalette(dataUrl);
    // Se guarda por usuario (no una sola variable global) para que cada chat conserve
    // su propia imagen incluso después de cerrar y reabrir la app
    try{
      if(activeChatUsername) localStorage.setItem('chatbgimg_'+activeChatUsername,dataUrl);
    }catch(err){ /* localStorage lleno: el fondo sigue funcionando en esta sesión, solo no persiste */ }
  }catch(err){
    console.error('No se pudo procesar la imagen de fondo:',err);
  }
  chatBgPicker.querySelectorAll('.bg-swatch').forEach(s=>s.classList.toggle('active',s.dataset.bg==='bg-custom'));
});

/* =====================================================
   ALGORITMO DE COLOR ADAPTATIVO
   A partir de la imagen de fondo, genera una mini paleta de diseño
   (acento, burbujas, header, barra de envío) que siempre es legible,
   sin importar qué tan clara, oscura o saturada sea la foto elegida.
   Pasos:
   1) Cuantiza los píxeles en un grid de color (buckets) y pondera cada
      uno por su saturación, para encontrar el color VIBRANTE dominante
      en vez de quedarse con un gris/negro promedio sin personalidad.
   2) Ajusta ese color a un rango de luminosidad "seguro" (ni tan oscuro
      que desaparezca, ni tan claro que queme) → es el color de acento.
   3) Deriva de él una burbuja propia (clara) y confirma con la fórmula
      de luminancia relativa (estilo WCAG) si el texto debe ir negro o
      blanco encima, para que SIEMPRE se pueda leer.
   ===================================================== */
function extractImagePalette(url){
  const img=new Image();
  img.onload=()=>{
    const SIZE=48;
    const canvas=document.createElement('canvas');
    canvas.width=SIZE;canvas.height=SIZE;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(img,0,0,SIZE,SIZE);
    let data;
    try{data=ctx.getImageData(0,0,SIZE,SIZE).data;}catch(err){return;} // imagen cross-origin no legible: no rompe nada, solo no adapta

    // --- 1) Cuantización en buckets ponderados por saturación ---
    const buckets={};
    let lumSum=0,lumN=0;
    const STEP=28; // ancho del bucket por canal (0-255) → agrupa tonos parecidos
    for(let i=0;i<data.length;i+=4){
      const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      if(a<80)continue; // ignora transparencia
      const max=Math.max(r,g,b),min=Math.min(r,g,b);
      const sat=max===0?0:(max-min)/max;           // 0=gris, 1=muy vívido
      const lum=0.299*r+0.587*g+0.114*b;
      lumSum+=lum;lumN++;
      // Peso: favorece tonos vívidos y de luminosidad media (ni negros ni blancos puros)
      const midLumWeight=1-Math.abs(lum-140)/180;
      const weight=Math.max(0.05,sat)*Math.max(0.15,midLumWeight);
      const key=(r-r%STEP)+'_'+(g-g%STEP)+'_'+(b-b%STEP);
      if(!buckets[key])buckets[key]={r:0,g:0,b:0,w:0,n:0};
      const bk=buckets[key];
      bk.r+=r*weight;bk.g+=g*weight;bk.b+=b*weight;bk.w+=weight;bk.n++;
    }
    const avgLum=lumN?lumSum/lumN:128;

    let best=null;
    for(const k in buckets){
      const bk=buckets[k];
      if(!best||bk.w>best.w)best=bk;
    }
    let accentR=200,accentG=200,accentB=210;
    if(best&&best.w>0){
      accentR=best.r/best.w;accentG=best.g/best.w;accentB=best.b/best.w;
    }

    // --- 2) HSL + ajuste de luminosidad para que el acento siempre luzca vívido pero legible ---
    let {h,s,l}=rgbToHsl(accentR,accentG,accentB);
    s=Math.min(1,Math.max(s,0.42));      // nunca demasiado apagado
    l=Math.min(0.62,Math.max(0.4,l));    // ni demasiado oscuro ni quemado
    const accent=hslToRgb(h,s,l);

    // --- 3) Deriva burbujas + decide color de texto según contraste real ---
    const mine=hslToRgb(h,Math.min(1,s*0.55),0.93);           // burbuja propia: tinte muy claro del acento
    const theirsBase=hslToRgb(h,Math.min(1,s*0.7),Math.max(0.14,Math.min(avgLum/255,0.26)));

    const mineText=contrastText(mine.r,mine.g,mine.b);
    const accentText=contrastText(accent.r,accent.g,accent.b);

    chatWindow.style.setProperty('--chat-accent',`rgb(${accent.r},${accent.g},${accent.b})`);
    chatWindow.style.setProperty('--chat-accent-text',accentText);
    chatWindow.style.setProperty('--chat-mine-bg',`rgba(${mine.r},${mine.g},${mine.b},0.94)`);
    chatWindow.style.setProperty('--chat-mine-text',mineText);
    chatWindow.style.setProperty('--chat-theirs-bg',`rgba(${theirsBase.r},${theirsBase.g},${theirsBase.b},0.42)`);
    chatWindow.style.setProperty('--chat-theirs-text','#ffffff'); // siempre sobre glass oscuro con blur → blanco es seguro
  };
  img.onerror=()=>{}; // silently fail — el chat sigue viéndose bien con los valores por defecto
  img.src=url;
}

function rgbToHsl(r,g,b){
  r/=255;g/=255;b/=255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  let h=0,s=0;const l=(max+min)/2;
  const d=max-min;
  if(d!==0){
    s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){
      case r:h=(g-b)/d+(g<b?6:0);break;
      case g:h=(b-r)/d+2;break;
      case b:h=(r-g)/d+4;break;
    }
    h/=6;
  }
  return {h,s,l};
}
function hslToRgb(h,s,l){
  let r,g,b;
  if(s===0){r=g=b=l;}
  else{
    const hue2rgb=(p,q,t)=>{
      if(t<0)t+=1; if(t>1)t-=1;
      if(t<1/6)return p+(q-p)*6*t;
      if(t<1/2)return q;
      if(t<2/3)return p+(q-p)*(2/3-t)*6;
      return p;
    };
    const q=l<0.5?l*(1+s):l+s-l*s;
    const p=2*l-q;
    r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3);
  }
  return {r:Math.round(r*255),g:Math.round(g*255),b:Math.round(b*255)};
}
// Luminancia relativa (aprox. WCAG): decide si el texto debe ser negro o blanco para
// mantenerse legible sobre cualquier color de burbuja que genere el algoritmo.
function contrastText(r,g,b){
  const lum=(0.2126*r+0.7152*g+0.0722*b)/255;
  return lum>0.6?'#111111':'#ffffff';
}

document.getElementById('cspCallOpt').addEventListener('click',()=>{closeTopNavView();setTimeout(()=>startCall(false),300);});
document.getElementById('cspVideoOpt').addEventListener('click',()=>{closeTopNavView();setTimeout(()=>startCall(true),300);});
document.getElementById('cspClearChat').addEventListener('click',()=>{if(activeChatUsername)conversations[activeChatUsername]=[];renderChatMessages();closeTopNavView();});

/* ---- Calls ---- */
let callInt=null,callSecs=0,isVidCall=false;
function startCall(video){
  isVidCall=video;const user=usersData[activeChatUsername];
  callAvatarImg.src=user?user.avatar:'';
  callOverlayName.textContent=activeChatUsername||'';
  callOverlayStatus.textContent=video?'Iniciando videollamada…':'Llamando…';
  callTimerDisplay.style.display='none';
  callOverlay.classList.toggle('video-call',video);
  callFlipBtn.style.display=video?'flex':'none';
  const callAlreadyOpen=callOverlay.classList.contains('open');
  callOverlay.classList.add('open');callSecs=0;
  setTimeout(()=>{
    callOverlayStatus.textContent='Conectado';callTimerDisplay.style.display='block';
    callInt=setInterval(()=>{callSecs++;callTimerDisplay.textContent=formatDuration(callSecs);},1000);
  },3000);
  if(!callAlreadyOpen) pushNavView(endCall);
}
function endCall(){
  clearInterval(callInt);
  const dur=callSecs>0?formatDuration(callSecs):'Sin respuesta';
  callOverlay.classList.remove('open','video-call');
  if(activeChatUsername){
    (conversations[activeChatUsername]||(conversations[activeChatUsername]=[])).push({from:myUsername,kind:isVidCall?'videocall':'call',duration:dur,time:nowTime(),fullTime:nowFull()});
    renderChatMessages();renderChatList();
  }
}
callEndBtn.addEventListener('click',closeTopNavView);
chatCallBtn.addEventListener('click',()=>startCall(false));
chatVideoBtn.addEventListener('click',()=>startCall(true));
let muted=false;
callMuteBtn.addEventListener('click',()=>{muted=!muted;callMuteBtn.classList.toggle('muted',muted);});
callFlipBtn.addEventListener('click',()=>{callFlipBtn.style.opacity=callFlipBtn.style.opacity==='0.5'?'1':'0.5';});
})();

