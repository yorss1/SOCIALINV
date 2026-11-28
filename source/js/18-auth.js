/* =====================================================
   18 — Acceso: iniciar sesión, crear cuenta, recuperar contraseña (Módulo 01 · Identidad)
   Solo se activa si el backend está configurado (source/js/config.js). Sin configuración,
   la app sigue en modo local y esta pantalla nunca aparece.
   ===================================================== */
(function () {
  'use strict';
  const B = window.SvBackend;
  if (!B || !B.enabled) return;

  const root = document.createElement('div');
  root.className = 'auth-overlay'; root.id = 'authOverlay'; root.hidden = true;
  document.body.appendChild(root);

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const USER = /^[a-z0-9_.]{3,30}$/;

  function shell(title, sub, body) {
    root.innerHTML =
      '<div class="auth-card"><div class="auth-brand">SOCIALINV</div>' +
      '<h1 class="auth-title">' + esc(title) + '</h1>' + (sub ? '<p class="auth-sub">' + esc(sub) + '</p>' : '') +
      '<form class="auth-form" novalidate>' + body + '</form></div>';
    return root.querySelector('form');
  }
  const field = (id, label, type, extra) =>
    '<label class="auth-field"><span>' + label + '</span><input id="' + id + '" name="' + id + '" type="' + type + '" ' + (extra || '') + '></label>';
  const msg = '<p class="auth-msg" role="alert" aria-live="polite"></p>';
  const setMsg = (t, ok) => { const m = root.querySelector('.auth-msg'); if (m) { m.textContent = t || ''; m.dataset.ok = ok ? '1' : ''; } };
  const busy = (on) => root.querySelectorAll('button, input').forEach((e) => { e.disabled = on; });

  function viewLogin() {
    const f = shell('Inicia sesión', 'Entra para ver a tu gente.',
      field('email', 'Correo', 'email', 'autocomplete="email" inputmode="email" required') +
      field('password', 'Contraseña', 'password', 'autocomplete="current-password" required') + msg +
      '<button class="auth-primary" type="submit">Entrar</button>' +
      '<button class="auth-link" type="button" data-go="reset">Olvidé mi contraseña</button>' +
      '<div class="auth-alt">¿No tienes cuenta? <button class="auth-link" type="button" data-go="signup">Crear cuenta</button></div>');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = f.email.value.trim(), pw = f.password.value;
      if (!EMAIL.test(email) || !pw) return setMsg('Escribe tu correo y contraseña');
      busy(true); setMsg('');
      try { await B.signIn(email, pw); } catch (err) { setMsg(err.message); busy(false); }
    });
  }

  function viewSignup() {
    const f = shell('Crea tu cuenta', 'Solo toma un minuto.',
      field('name', 'Nombre', 'text', 'autocomplete="name" maxlength="60" required') +
      field('username', 'Nombre de usuario', 'text', 'autocomplete="username" maxlength="30" autocapitalize="none" spellcheck="false" required') +
      field('email', 'Correo', 'email', 'autocomplete="email" inputmode="email" required') +
      field('birth', 'Fecha de nacimiento', 'date', 'autocomplete="bday" required') +
      field('password', 'Contraseña (mínimo 8 caracteres)', 'password', 'autocomplete="new-password" minlength="8" required') +
      '<label class="auth-check"><input id="terms" type="checkbox"><span>Acepto los <a href="terminos.html" target="_blank" rel="noopener">términos de uso</a> y la <a href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a></span></label>' + msg +
      '<button class="auth-primary" type="submit">Crear cuenta</button>' +
      '<div class="auth-alt">¿Ya tienes cuenta? <button class="auth-link" type="button" data-go="login">Iniciar sesión</button></div>');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = { name: f.name.value.trim(), username: f.username.value.trim().toLowerCase(), email: f.email.value.trim(), birthDate: f.birth.value, password: f.password.value };
      if (!v.name) return setMsg('Escribe tu nombre');
      if (!USER.test(v.username)) return setMsg('El usuario: 3 a 30 caracteres, letras minúsculas, números, punto o guion bajo');
      if (!EMAIL.test(v.email)) return setMsg('Escribe un correo válido');
      if (!v.birthDate) return setMsg('Indica tu fecha de nacimiento');
      const age = (Date.now() - new Date(v.birthDate).getTime()) / 31557600000;
      if (!(age >= 13)) return setMsg('Debes tener al menos 13 años para crear una cuenta');
      if (v.password.length < 8) return setMsg('La contraseña debe tener al menos 8 caracteres');
      if (!f.terms.checked) return setMsg('Debes aceptar los términos y la política de privacidad');
      busy(true); setMsg('');
      try {
        const r = await B.signUp(v);
        if (!r.session) { viewNotice('Revisa tu correo', 'Te enviamos un enlace para confirmar tu cuenta. Después podrás iniciar sesión.'); }
      } catch (err) { setMsg(err.message); busy(false); }
    });
  }

  function viewReset() {
    const f = shell('Recupera tu contraseña', 'Te enviaremos un enlace a tu correo.',
      field('email', 'Correo', 'email', 'autocomplete="email" inputmode="email" required') + msg +
      '<button class="auth-primary" type="submit">Enviar enlace</button>' +
      '<button class="auth-link" type="button" data-go="login">Volver</button>');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!EMAIL.test(f.email.value.trim())) return setMsg('Escribe un correo válido');
      busy(true);
      try { await B.resetPassword(f.email.value.trim()); } catch (err) { /* misma respuesta siempre: no revelar si el correo existe */ }
      viewNotice('Revisa tu correo', 'Si existe una cuenta con ese correo, recibirás un enlace para elegir una nueva contraseña.');
    });
  }

  function viewNewPassword() {
    const f = shell('Nueva contraseña', 'Elige una contraseña de al menos 8 caracteres.',
      field('password', 'Nueva contraseña', 'password', 'autocomplete="new-password" minlength="8" required') + msg +
      '<button class="auth-primary" type="submit">Guardar</button>');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (f.password.value.length < 8) return setMsg('Debe tener al menos 8 caracteres');
      busy(true);
      try { await B.updatePassword(f.password.value); hide(); } catch (err) { setMsg(err.message); busy(false); }
    });
  }

  function viewNotice(title, text) {
    shell(title, text, '<button class="auth-primary" type="button" data-go="login">Volver a iniciar sesión</button>');
  }

  const VIEWS = { login: viewLogin, signup: viewSignup, reset: viewReset };
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b && VIEWS[b.dataset.go]) VIEWS[b.dataset.go](); });

  function show(view) { root.hidden = false; document.documentElement.classList.add('auth-open'); (view || viewLogin)(); }
  function hide() { root.hidden = true; root.innerHTML = ''; document.documentElement.classList.remove('auth-open'); addLogout(); }

  /* Cerrar sesión: entrada al final de Ajustes */
  function addLogout() {
    const last = document.querySelector('.settings-menu-item[data-settings-screen="personalization"]');
    if (!last || document.getElementById('settingsLogout')) return;
    const item = document.createElement('div');
    item.className = 'settings-menu-item'; item.id = 'settingsLogout'; item.setAttribute('role', 'button'); item.tabIndex = 0;
    item.innerHTML = '<div class="smi-text"><span>Cerrar sesión</span></div>';
    const out = async () => { try { await B.signOut(); } catch (e) { /* ya se maneja en onAuth */ } };
    item.addEventListener('click', out);
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') out(); });
    last.parentNode.appendChild(item);
  }

  B.onAuth((event, session) => {
    if (event === 'PASSWORD_RECOVERY') return show(viewNewPassword);
    if (session) { if (!root.hidden && event !== 'TOKEN_REFRESHED') hide(); }
    else show(viewLogin);
  });
  B.session().then((s) => { if (s) addLogout(); else show(viewLogin); });
})();
