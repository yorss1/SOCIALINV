/* ===================================================== */
/* BASE DE DATOS DE PERFILES (4 usuarios de prueba)        */
/* ===================================================== */
const usersData = {
  yorss01: {
    username: 'yorss01',
    name: 'Yorss',
    avatar: 'source/imgs/user-default.png',
    avatarFallback: 'source/imgs/demo/avatar-153452874177.svg',
    cover: 'source/imgs/demo/cover-161800518238.svg',
    bio: 'Diseño web, Programación y Ciberseguridad.',
    stats: { posts: 9, followers: '1,2k', following: 936 },
    privacy: { showOnline: true, showFollowers: true, showFollowing: true , isPrivate: false },
    info: [
      { icon: 'music', label: 'Gusto Musical', value: 'Indie, Synthwave, Lo-Fi, Rock & Roll, Pop' },
      { icon: 'star', label: 'Intereses', value: 'UI/UX, Ciberseguridad y Criptografía' },
      { icon: 'smile', label: 'Hobbies', value: 'Dibujo y Programación' },
      { icon: 'pin', label: 'Ubicación', value: 'México' }
    ],
    links: [
      'https://instagram.com/yorss01',
      'https://github.com/yorss01',
      'https://lameramera.com'
    ],
    posts: [],
    shared: [
      { avatar: 'source/imgs/demo/avatar-1550684848-f.svg', title: 'Minimalism Daily', cover: 'source/imgs/demo/photo-1550684848-f.svg', kind: 'image' },
      { avatar: 'source/imgs/demo/avatar-151879184121.svg', title: 'Tech Reviews', cover: 'source/imgs/demo/photo-151879184121.svg', kind: 'image' }
    ]
  },
  juanp: {
    username: 'juanp',
    name: 'Juan Pérez',
    avatar: 'source/imgs/demo/avatar-150700321116.svg',
    cover: 'source/imgs/demo/cover-148795844994.svg',
    bio: 'Fotografía urbana y café de especialidad.',
    stats: { posts: 14, followers: '3,4k', following: 412 },
    privacy: { showOnline: true, showFollowers: true, showFollowing: true , isPrivate: false },
    info: [
      { icon: 'music', label: 'Gusto Musical', value: 'Jazz, Bossa Nova, Hip-Hop clásico' },
      { icon: 'star', label: 'Intereses', value: 'Fotografía, Cafés de especialidad' },
      { icon: 'smile', label: 'Hobbies', value: 'Senderismo y edición de video' },
      { icon: 'pin', label: 'Ubicación', value: 'Ciudad de México' }
    ],
    links: [
      'https://instagram.com/juanp',
      'https://twitter.com/juanp',
      'https://www.youtube.com/@juanp'
    ],
    posts: [
      'source/imgs/demo/photo-149547447228.svg',
      'source/imgs/demo/photo-145392858236.svg',
      'source/imgs/demo/photo-151784190524.svg',
      'source/imgs/demo/photo-150052214426.svg',
      'source/imgs/demo/photo-144472312186.svg'
    ],
    shared: [
      { avatar: 'source/imgs/demo/avatar-149324650713.svg', title: 'Art & Space', cover: 'source/imgs/demo/photo-149324650713.svg', kind: 'image' }
    ]
  },
  mariag: {
    username: 'mariag',
    name: 'María González',
    avatar: 'source/imgs/demo/avatar-149479010837.svg',
    cover: 'source/imgs/demo/cover-146514634442.svg',
    bio: 'Ilustradora digital. Amante de los gatos y el té de manzanilla.',
    stats: { posts: 22, followers: '8,1k', following: 305 },
    privacy: { showOnline: true, showFollowers: true, showFollowing: true , isPrivate: false },
    info: [
      { icon: 'music', label: 'Gusto Musical', value: 'City Pop, K-Indie, Lo-Fi' },
      { icon: 'star', label: 'Intereses', value: 'Ilustración digital, Anime, Acuarela' },
      { icon: 'smile', label: 'Hobbies', value: 'Pintar y cuidar plantas' },
      { icon: 'pin', label: 'Ubicación', value: 'Guadalajara' }
    ],
    links: [
      'https://www.instagram.com/mariag',
      'https://www.pinterest.com/mariag',
      'https://mariailustra.com'
    ],
    posts: [
      'source/imgs/demo/photo-151336477614.svg',
      'source/imgs/demo/photo-145269691479.svg',
      'source/imgs/demo/photo-147309153429.svg',
      'source/imgs/demo/photo-151889594925.svg'
    ],
    shared: [
      { avatar: 'source/imgs/demo/avatar-1550684848-f.svg', title: 'Minimalism Daily', cover: 'source/imgs/demo/photo-1550684848-f.svg', kind: 'image' },
      { avatar: 'source/imgs/demo/avatar-149324650713.svg', title: 'Art & Space', cover: 'source/imgs/demo/photo-149324650713.svg', kind: 'image' }
    ]
  },
  the_creator: {
    username: 'the_creator',
    name: 'The Creator',
    avatar: 'source/imgs/demo/avatar-161239206279.svg',
    cover: 'source/imgs/demo/cover-149268422306.svg',
    bio: 'Reels diarios sobre cámaras, gear y setups creativos.',
    stats: { posts: 31, followers: '128k', following: 89 },
    privacy: { showOnline: true, showFollowers: true, showFollowing: true , isPrivate: true },
    info: [
      { icon: 'music', label: 'Gusto Musical', value: 'Synthwave, Electrónica, Trap' },
      { icon: 'star', label: 'Intereses', value: 'Cámaras, Edición de video, Gear' },
      { icon: 'smile', label: 'Hobbies', value: 'Grabar reels y coleccionar lentes' },
      { icon: 'pin', label: 'Ubicación', value: 'Monterrey' }
    ],
    links: [
      'https://www.tiktok.com/@the_creator',
      'https://twitch.tv/the_creator'
    ],
    posts: [
      'source/imgs/demo/photo-149570790264.svg',
      'source/imgs/demo/photo-151603506937.svg',
      'source/imgs/demo/photo-150292091712.svg'
    ],
    shared: []
  }
};

// Seguimiento simulado (en memoria): quién sigo yo
const followingState = new Set();
// Registra el ORDEN en que se siguió a cada cuenta (para poder mostrar
// "Seguidos" con los más recientes primero, algo que un Set no garantiza).
const followOrder = [];
let pfCurrentUsername = null;

/* ===================== Motor de Tema global ===================== */
// Dos ejes independientes que se combinan:
//  - type: 'interactive' (tonos según fotos/portadas) | 'solid' (blanco y negro fijo)
//  - mode: 'light' (fondo claro, acentos oscuros) | 'dark' (fondo oscuro, acentos claros)
// appTheme.mode === 'light' es el estado con el que ya arrancaba Home (fondo
// pastel/blanco, botones oscuros); 'dark' invierte fondo <-> acento.
let appTheme = { type: 'interactive', mode: 'light' };

function saveAppTheme() {
  try { localStorage.setItem('socialinv_appTheme', JSON.stringify(appTheme)); } catch (e) {}
}
function loadAppTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem('socialinv_appTheme'));
    if (saved && saved.type && saved.mode) appTheme = saved;
  } catch (e) {}
}
loadAppTheme();

function setAppTheme(partial) {
  appTheme = { ...appTheme, ...partial };
  saveAppTheme();
  if (typeof window.pfRefreshHomeChrome === 'function') window.pfRefreshHomeChrome();
  if (typeof window.pfRefreshProfileChrome === 'function' && profilePanel.classList.contains('open')) window.pfRefreshProfileChrome();
  if (typeof window.pfRefreshComposerChrome === 'function' && composer.classList.contains('open')) window.pfRefreshComposerChrome();
}

// --- Datos de ejemplo para las secciones de Ajustes (Actividad, Guardados,
// Archivo). La app no tiene un backend real de likes/guardados por post, así
// que se simulan aquí como listas locales editables (quitar = splice real). ---
let likedPulsos = [
  { username: 'juanp', image: 'source/imgs/demo/photo-149547447228.svg' },
  { username: 'mariag', image: 'source/imgs/demo/photo-153112389772.svg' },
  { username: 'the_creator', image: 'source/imgs/demo/photo-149269152771.svg' }
];
let commentedPulsos = [
  { username: 'juanp', image: 'source/imgs/demo/photo-145392858236.svg' },
  { username: 'mariag', image: 'source/imgs/demo/photo-151879184121.svg' }
];
let savedPulsos = [
  { username: 'the_creator', image: 'source/imgs/demo/photo-151603506937.svg' },
  { username: 'juanp', image: 'source/imgs/demo/photo-151784190524.svg' },
  { username: 'mariag', image: 'source/imgs/demo/photo-146514634442.svg' }
];
let archivedStories = [];
let archivedPulsos = [];

// Pool de personas de ejemplo para poblar listas de seguidores/seguidos de
// forma creíble (la app solo tiene 4 usuarios reales, pero los contadores del
// perfil muestran cifras mucho más grandes, ej. "1,2k").  Cada entrada trae
// una fecha para poder ordenar "más recientes primero".
const FOLLOW_POOL = [
  { username: 'lu.martinez', name: 'Lu Martínez', avatar: 'source/imgs/demo/avatar-1544005313-9.svg' },
  { username: 'kenji.moto', name: 'Kenji Moto', avatar: 'source/imgs/demo/avatar-151908536075.svg' },
  { username: 'valeria.cruz', name: 'Valeria Cruz', avatar: 'source/imgs/demo/avatar-153112389772.svg' },
  { username: 'davidx', name: 'David Ibarra', avatar: 'source/imgs/demo/avatar-150064876779.svg' },
  { username: 'ceciliaa', name: 'Cecilia Aguilar', avatar: 'source/imgs/demo/avatar-150821475119.svg' },
  { username: 'renelopez', name: 'René López', avatar: 'source/imgs/demo/avatar-150679477820.svg' },
  { username: 'fer.sound', name: 'Fer Sound', avatar: 'source/imgs/demo/avatar-152450438894.svg' },
  { username: 'ana.paola', name: 'Ana Paola', avatar: 'source/imgs/demo/avatar-1544723795-3.svg' },
  { username: 'diego.dev', name: 'Diego Dev', avatar: 'source/imgs/demo/avatar-147209964578.svg' },
  { username: 'sofi.rangel', name: 'Sofi Rangel', avatar: 'source/imgs/demo/avatar-1554151228-1.svg' },
  { username: 'pablo.mtz', name: 'Pablo Martínez', avatar: 'source/imgs/demo/avatar-146345309118.svg' },
  { username: 'nat.gomez', name: 'Natalia Gómez', avatar: 'source/imgs/demo/avatar-151784190524.svg' },
  { username: 'jorge.ux', name: 'Jorge UX', avatar: 'source/imgs/demo/avatar-150061401645.svg' },
  { username: 'karla.vibes', name: 'Karla Vibes', avatar: 'source/imgs/demo/avatar-151784190524.svg' },
  { username: 'oscar.trip', name: 'Óscar Trip', avatar: 'source/imgs/demo/avatar-150268510422.svg' },
  { username: 'mich.arts', name: 'Michelle Arts', avatar: 'source/imgs/demo/avatar-148942473108.svg' }
];

// Hash simple y determinista (mismo username -> mismo resultado siempre) para
// que cada perfil tenga SIEMPRE la misma lista simulada de gente, en vez de
// que cambie aleatoriamente cada vez que se abre.
function pfSeedHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
  return h;
}

// Devuelve una sublista determinista de FOLLOW_POOL para "username", con
// fechas de ejemplo (más reciente = índice 0) y tamaño según el conteo real
// que ya se muestra en el perfil (stats.followers / stats.following).
function pfMockFollowList(username, count, seedSalt) {
  const seed = pfSeedHash(username + seedSalt);
  const n = Math.min(count, FOLLOW_POOL.length);
  const start = seed % FOLLOW_POOL.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const person = FOLLOW_POOL[(start + i) % FOLLOW_POOL.length];
    out.push({ ...person, at: Date.now() - (i + 1) * (3 + (seed % 5)) * 3600000 });
  }
  return out;
}

// Lista de "Seguidores" de un perfil, más recientes primero. Para cualquier
// perfil se simula con FOLLOW_POOL; si YO sigo a esa persona, me agrego al
// principio de su lista (ese dato sí es real).
function getFollowersList(username) {
  const user = usersData[username];
  if (!user) return [];
  const list = pfMockFollowList(username, Math.min(parseStatCount(user.stats.followers), 24), ':followers');
  if (username !== myUsername && followingState.has(username)) {
    const me = usersData[myUsername];
    list.unshift({ username: myUsername, name: me.name, avatar: me.avatar, at: Date.now() });
  }
  return list;
}

// Lista de "Seguidos": si es MI perfil, viene de followingState (dato real,
// ordenado por followOrder); para otros perfiles se simula igual que arriba.
function getFollowingList(username) {
  if (username === myUsername) {
    return [...followOrder].reverse().map((u, i) => {
      const person = usersData[u] || FOLLOW_POOL.find(p => p.username === u);
      if (!person) return null;
      return { username: person.username, name: person.name, avatar: person.avatar, at: Date.now() - i * 3600000 };
    }).filter(Boolean);
  }
  const user = usersData[username];
  if (!user) return [];
  return pfMockFollowList(username, Math.min(parseStatCount(user.stats.following), 24), ':following');
}

// Convierte contadores mostrados como texto ("1,2k", "128k") a un número real,
// para poder usarlos al calcular cuántas personas simular en las listas.
function parseStatCount(val) {
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return 0;
  const s = val.trim().toLowerCase().replace(',', '.');
  if (s.endsWith('k')) return Math.round(parseFloat(s) * 1000);
  if (s.endsWith('m')) return Math.round(parseFloat(s) * 1000000);
  return parseInt(s.replace(/\D/g, ''), 10) || 0;
}

function flRenderItem(person) {
  const isRealUser = !!usersData[person.username];
  return `
    <div class="fl-item" data-fl-username="${person.username}">
      <img class="fl-avatar" src="${person.avatar}" alt="">
      <div class="fl-info">
        <span class="fl-username">${escapeHtml(person.username)}</span>
        <span class="fl-name">${escapeHtml(person.name)}</span>
      </div>
      ${isRealUser && person.username !== myUsername ? `<button class="fl-follow-btn${followingState.has(person.username) || SocialInv.followState(person.username) === 'requested' ? ' following' : ''}" data-fl-follow="${person.username}">${{following:'Siguiendo',requested:'Solicitado',none:'Seguir'}[SocialInv.followState(person.username)]}</button>` : ''}
    </div>`;
}

// Abre la lista de "Seguidores" o "Seguidos" de cualquier perfil. En TU
// propio perfil, además se muestran sugerencias para seguir (el mismo
// listado de personas que usa "Encontrar personas").
function openFollowList(username, type) {
  const isMe = username === myUsername;
  document.getElementById('flTitle').textContent = type === 'followers' ? 'Seguidores' : 'Seguidos';
  const list = type === 'followers' ? getFollowersList(username) : getFollowingList(username);

  let html = list.length
    ? list.map(flRenderItem).join('')
    : `<div class="fl-empty">${type === 'followers' ? 'Todavía no hay seguidores aquí' : 'Todavía no sigue a nadie'}</div>`;

  if (isMe) {
    const alreadyShown = new Set(list.map(p => p.username));
    const suggestions = Object.values(usersData).filter(u => u.username !== myUsername && !followingState.has(u.username) && !alreadyShown.has(u.username));
    if (suggestions.length) {
      html += `<div class="fl-section-title">Sugerencias para ti</div>` +
        suggestions.map(u => flRenderItem({ username: u.username, name: u.name, avatar: u.avatar })).join('');
    }
  }

  const flBody = document.getElementById('flBody');
  flBody.innerHTML = html;
  flBody.scrollTop = 0;

  flBody.querySelectorAll('.fl-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-fl-follow]')) return;
      const target = item.dataset.flUsername;
      closeFollowList();
      if (usersData[target]) openProfile(target);
    });
  });
  flBody.querySelectorAll('[data-fl-follow]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = btn.dataset.flFollow;
      const st = SocialInv.toggleFollow(target);
      btn.classList.toggle('following', st !== 'none');
      btn.textContent = st === 'following' ? 'Siguiendo' : st === 'requested' ? 'Solicitado' : 'Seguir';
      if (pfCurrentUsername) openProfile(pfCurrentUsername); // refresca el stat detrás
    });
  });

  const wasOpen = followListModal.classList.contains('open');
  followListOverlay.classList.add('open');
  followListModal.classList.add('open');
  if (!wasOpen) pushNavView(closeFollowList);
}

function closeFollowList() {
  followListOverlay.classList.remove('open');
  followListModal.classList.remove('open');
}

const followListOverlay = document.getElementById('followListOverlay');
const followListModal = document.getElementById('followListModal');
document.getElementById('flBackBtn').addEventListener('click', closeTopNavView);
document.getElementById('pfStatFollowersBtn').addEventListener('click', () => {
  if (!pfCurrentUsername) return;
  const u = usersData[pfCurrentUsername];
  if (pfCurrentUsername !== myUsername && u.privacy && !u.privacy.showFollowers) { showAppToast('Esta lista de seguidores es privada'); return; }
  openFollowList(pfCurrentUsername, 'followers');
});
document.getElementById('pfStatFollowingBtn').addEventListener('click', () => {
  if (!pfCurrentUsername) return;
  const u = usersData[pfCurrentUsername];
  if (pfCurrentUsername !== myUsername && u.privacy && !u.privacy.showFollowing) { showAppToast('Esta lista de seguidos es privada'); return; }
  openFollowList(pfCurrentUsername, 'following');
});
document.getElementById('pfStatPostsBtn').addEventListener('click', () => {
  document.querySelectorAll('.pf-tab-btn')[1].click();
});

/* ===================== Ajustes: navegación y lógica ===================== */
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsModal = document.getElementById('settingsModal');
let settingsCurrentScreen = 'main';

function showSettingsScreen(id) {
  settingsCurrentScreen = id;
  document.querySelectorAll('.settings-screen').forEach(s => s.classList.toggle('active', s.id === 'settingsScreen-' + id));
  const titles = { main: 'Ajustes', activity: 'Actividad', saved: 'Guardados', privacy: 'Privacidad', archive: 'Archivo', personalization: 'Personalización' };
  document.getElementById('settingsTitle').textContent = titles[id] || 'Ajustes';
  document.getElementById('settingsBackBtn').dataset.mode = id === 'main' ? 'close' : 'back';
  document.querySelector('.settings-body').scrollTop = 0;
}

function openSettings() {
  showSettingsScreen('main');
  renderActivityGrid('liked');
  renderSavedGrid();
  renderArchiveGrid('stories');
  const p = usersData[myUsername].privacy;
  document.getElementById('privacyPrivate').checked = !!p.isPrivate;
  document.getElementById('privacyShowOnline').checked = p.showOnline;
  document.getElementById('privacyShowFollowers').checked = p.showFollowers;
  document.getElementById('privacyShowFollowing').checked = p.showFollowing;
  document.querySelectorAll('[data-theme-type]').forEach(b => b.classList.toggle('active', b.dataset.themeType === appTheme.type));
  document.querySelectorAll('[data-theme-mode]').forEach(b => b.classList.toggle('active', b.dataset.themeMode === appTheme.mode));

  const wasOpen = settingsModal.classList.contains('open');
  settingsOverlay.classList.add('open');
  settingsModal.classList.add('open');
  if (!wasOpen) pushNavView(closeSettings);
}
function closeSettings() {
  settingsOverlay.classList.remove('open');
  settingsModal.classList.remove('open');
}
document.getElementById('pfMenuBtn').addEventListener('click', openSettings);
document.getElementById('settingsBackBtn').addEventListener('click', () => {
  if (document.getElementById('settingsBackBtn').dataset.mode === 'back') showSettingsScreen('main');
  else closeTopNavView();
});
document.querySelectorAll('.settings-menu-item').forEach(item => {
  item.addEventListener('click', () => showSettingsScreen(item.dataset.settingsScreen));
});

// --- Actividad (me gusta / comentados) ---
function renderActivityGrid(tab) {
  const grid = document.getElementById('activityGrid');
  const list = tab === 'liked' ? likedPulsos : commentedPulsos;
  grid.innerHTML = list.length ? list.map((item, i) => `
    <div class="settings-media-item" style="background-image:url('${item.image}')" data-idx="${i}">
      <span class="settings-media-owner">@${escapeHtml(item.username)}</span>
      <div class="settings-media-remove" data-remove-activity="${i}" data-remove-tab="${tab}">
        <svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
      </div>
    </div>`).join('') : `<div class="fl-empty" style="grid-column:1/-1;">${tab === 'liked' ? 'No has dado like a ningún pulso' : 'No has comentado ningún pulso'}</div>`;

  grid.querySelectorAll('[data-remove-activity]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.removeActivity, 10);
      const t = btn.dataset.removeTab;
      if (t === 'liked') likedPulsos.splice(idx, 1); else commentedPulsos.splice(idx, 1);
      renderActivityGrid(t);
    });
  });
}
document.querySelectorAll('[data-activity-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-activity-tab]').forEach(b => b.classList.toggle('active', b === btn));
    renderActivityGrid(btn.dataset.activityTab);
  });
});

// --- Guardados ---
function renderSavedGrid() {
  const grid = document.getElementById('savedGrid');
  grid.innerHTML = savedPulsos.length ? savedPulsos.map((item, i) => `
    <div class="settings-media-item" style="background-image:url('${item.image}')">
      <span class="settings-media-owner">@${escapeHtml(item.username)}</span>
      <div class="settings-media-remove" data-remove-saved="${i}">
        <svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
      </div>
    </div>`).join('') : `<div class="fl-empty" style="grid-column:1/-1;">Todavía no guardaste ningún pulso</div>`;

  grid.querySelectorAll('[data-remove-saved]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      savedPulsos.splice(parseInt(btn.dataset.removeSaved, 10), 1);
      renderSavedGrid();
    });
  });
}

// --- Archivo ---
function renderArchiveGrid(tab) {
  const grid = document.getElementById('archiveGrid');
  const list = tab === 'stories' ? archivedStories : archivedPulsos;
  grid.innerHTML = list.length ? list.map(item => `<div class="settings-media-item" style="background-image:url('${item.image}')"></div>`).join('')
    : `<div class="fl-empty" style="grid-column:1/-1;">${tab === 'stories' ? 'No tienes historias archivadas' : 'No tienes pulsos archivados'}</div>`;
}
document.querySelectorAll('[data-archive-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-archive-tab]').forEach(b => b.classList.toggle('active', b === btn));
    renderArchiveGrid(btn.dataset.archiveTab);
  });
});

// --- Privacidad: toggles reales, guardados en usersData[myUsername].privacy ---
document.getElementById('privacyShowOnline').addEventListener('change', (e) => { usersData[myUsername].privacy.showOnline = e.target.checked; });
document.getElementById('privacyShowFollowers').addEventListener('change', (e) => { usersData[myUsername].privacy.showFollowers = e.target.checked; });
document.getElementById('privacyShowFollowing').addEventListener('change', (e) => { usersData[myUsername].privacy.showFollowing = e.target.checked; });

// --- Personalización: Tipo de Tema (interactivo/sólido) × Modo (claro/oscuro) ---
document.querySelectorAll('[data-theme-type]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-theme-type]').forEach(b => b.classList.toggle('active', b === btn));
    setAppTheme({ type: btn.dataset.themeType });
  });
});
document.querySelectorAll('[data-theme-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-theme-mode]').forEach(b => b.classList.toggle('active', b === btn));
    setAppTheme({ mode: btn.dataset.themeMode });
  });
});



// Conversaciones en memoria: username (del otro participante) -> [{from, text|shared, time}]
const conversations = {
  juanp: [
    { from: 'juanp', text: '¡Hola! Vi tu último pulso, está genial', time: '10:24' },
    { from: 'yorss01', text: 'Gracias! Apenas la subí jaja', time: '10:26' }
  ],
  mariag: [
    { from: 'mariag', text: '¿Vamos al café de siempre el sábado?', time: 'Ayer' }
  ],
  the_creator: []
};
let messageIdSeq = 0;

