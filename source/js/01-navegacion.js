// DATOS FAKE
let myUsername = 'yorss01';

/* ===================================================== */
/* NAVEGACIÓN CON HISTORIAL (botón/gesto atrás del SO)      */
/* Cada vista superpuesta que se abre se apila aquí; el     */
/* botón físico de atrás (o el gesto del sistema) cierra    */
/* la última vista abierta en lugar de salir de la app.     */
/* ===================================================== */
const navStack = [];
let suppressNextPopstate = false;

// Registra una vista en la pila: closeFn es la función que de verdad oculta esa vista.
function pushNavView(closeFn) {
  navStack.push(closeFn);
  history.pushState({ navDepth: navStack.length }, '');
}

// Úsalo en CUALQUIER botón de cerrar manual (X, overlay, swipe) en lugar de
// llamar a la función de cierre directamente. Mantiene el historial sincronizado
// tanto si el usuario cierra con un botón en pantalla como con el gesto del sistema.
// IMPORTANTE: el cierre real se ejecuta aquí mismo, de forma síncrona e inmediata.
// Antes se dependía de que el evento 'popstate' de history.back() llegara a tiempo,
// pero ese evento es asíncrono y su orden frente a otro código que corre justo
// después (p.ej. abrir el siguiente modal) no está garantizado — si llegaba tarde
// o se perdía la referencia, la vista se quedaba visible para siempre y ni
// "Cancelar" ni el swipe-to-dismiss (que también pasan por aquí) volvían a
// reaccionar. Cerrar de inmediato elimina esa carrera por completo.
function closeTopNavView() {
  if (navStack.length === 0) return;
  const closeFn = navStack.pop();
  suppressNextPopstate = true; // el cierre ya se hizo aquí; que el popstate real no lo repita
  closeFn();
  history.back();
}

window.addEventListener('popstate', () => {
  if (suppressNextPopstate) {
    suppressNextPopstate = false;
    return; // este retroceso ya fue procesado por closeTopNavView/silentlyCloseNavView
  }
  if (navStack.length > 0) {
    const closeFn = navStack.pop();
    closeFn();
  }
});

// Para cierres que ocurren SIN que el usuario pida "atrás" (p.ej. una historia que
// termina sola y avanza). Quita la vista de la pila Y consume su entrada real del
// historial, para que el botón físico de atrás nunca quede desincronizado.
function silentlyCloseNavView(closeFn) {
  const idx = navStack.indexOf(closeFn);
  if (idx === -1) return; // no estaba en la pila (ya se cerró por otra vía)
  navStack.splice(idx, 1);
  suppressNextPopstate = true;
  history.back();
}

/* =====================================================
   GESTO "SWIPE-TO-DISMISS"
   Arrastrar un modal hacia abajo desde su manija lo cierra, imitando el
   comportamiento nativo de iOS/Android. Genérico y reutilizable: no toca la
   lógica de apertura/cierre existente de cada modal — solo se apoya en
   closeTopNavView(), el mismo camino que ya usan "Cancelar" y el overlay,
   así que la pila de navegación nunca se desincroniza.
   ===================================================== */
function enableSwipeToDismiss(sheetEl, handleEl) {
  if (!sheetEl || !handleEl) return;
  let startY = 0, lastY = 0, dragging = false, startTime = 0, prevAnim = '';
  const DISMISS_PX = 90;        // arrastre mínimo para considerar "cerrar"
  const DISMISS_VELOCITY = 0.55; // px/ms — permite cerrar con un "flick" corto y rápido

  const onDown = (e) => {
    dragging = true;
    startY = lastY = e.clientY;
    startTime = Date.now();
    // Algunas hojas abren con @keyframes (animation: sheetIn ... forwards), que en la
    // cascada CSS pisa un transform inline mientras siga "activa". La neutralizamos
    // durante el arrastre y la restauramos al soltar, así el gesto manda de verdad.
    prevAnim = sheetEl.style.animation;
    sheetEl.style.animation = 'none';
    sheetEl.style.transition = 'none';
    sheetEl.style.transform = 'translateY(0px)';
    try{handleEl.setPointerCapture(e.pointerId);}catch(err){}
  };
  const onMove = (e) => {
    if (!dragging) return;
    lastY = e.clientY;
    const delta = Math.max(0, lastY - startY); // solo se arrastra hacia abajo
    sheetEl.style.transform = `translateY(${delta}px)`;
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    const delta = Math.max(0, lastY - startY);
    const velocity = delta / Math.max(1, Date.now() - startTime);
    sheetEl.style.transition = 'transform .26s cubic-bezier(.32,.72,0,1)';
    if (delta > DISMISS_PX || velocity > DISMISS_VELOCITY) {
      sheetEl.style.transform = 'translateY(100%)';
      setTimeout(() => {
        closeTopNavView();
        sheetEl.style.transition = ''; sheetEl.style.transform = ''; sheetEl.style.animation = prevAnim;
      }, 220);
    } else {
      // No llegó al umbral: rebota de vuelta a su posición abierta
      sheetEl.style.transform = 'translateY(0)';
      setTimeout(() => { sheetEl.style.transition = ''; sheetEl.style.transform = ''; sheetEl.style.animation = prevAnim; }, 260);
    }
  };

  handleEl.style.touchAction = 'none';
  handleEl.addEventListener('pointerdown', onDown);
  handleEl.addEventListener('pointermove', onMove);
  handleEl.addEventListener('pointerup', onUp);
  handleEl.addEventListener('pointercancel', onUp);
}

const storyUsers = [
  { username: "juanp", avatar: "source/imgs/demo/avatar-150700321116.svg", stories: [{ image: "source/imgs/demo/photo-150752542803.svg", kind: "image", time: "Hace 5 m", seen: false }] },
  { username: "mariag", avatar: "source/imgs/demo/avatar-149479010837.svg", stories: [{ image: "source/imgs/demo/photo-149479010837.svg", kind: "image", time: "Hace 30 m", seen: true, hiddenReveal:{type:'text', text:'Esto solo lo ven quienes mantienen presionado'} }] }
];

