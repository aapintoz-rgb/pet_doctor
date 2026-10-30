(function () {
  'use strict';
  const auth = window.PetDoctorAuth;
  const form = document.querySelector('#login-form');
  const username = document.querySelector('#username');
  const password = document.querySelector('#password');
  const error = document.querySelector('#login-error');
  const toggle = document.querySelector('#toggle-password');
  let currentSession = null;

  function clearError() {
    error.hidden = true;
    username.removeAttribute('aria-invalid');
    password.removeAttribute('aria-invalid');
    username.removeAttribute('aria-describedby');
    password.removeAttribute('aria-describedby');
  }

  function concealPassword() {
    password.type = 'password';
    toggle.textContent = 'Mostrar';
    toggle.setAttribute('aria-pressed', 'false');
  }

  function render(session, moveFocus = false) {
    currentSession = session;
    document.querySelector('#login-view').hidden = Boolean(session);
    document.querySelector('#home-view').hidden = !session;
    document.querySelector('#session-user').textContent = session ? session.displayName : '';
    document.title = session ? 'Pet Doctor · Clientes' : 'Pet Doctor · Acceso';
    if(window.PetDoctorApplication)window.PetDoctorApplication.sessionChanged(session,moveFocus);
    else if(moveFocus && !session)username.focus();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearError();
    const session = auth.authenticate(username.value, password.value);
    if (!session) {
      error.textContent = 'Usuario o contraseña incorrectos. Revisa los datos e intenta nuevamente.';
      error.hidden = false;
      for (const input of [username, password]) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', 'login-error');
      }
      password.value = '';
      password.focus();
      return;
    }
    try { sessionStorage.setItem(auth.SESSION_KEY, JSON.stringify(session)); } catch { /* La sesión sigue en memoria si el almacenamiento está bloqueado. */ }
    form.reset();
    concealPassword();
    render(session, true);
  });

  toggle.addEventListener('click', function () {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Ocultar' : 'Mostrar';
    toggle.setAttribute('aria-pressed', String(show));
  });
  form.addEventListener('input', clearError);
  document.querySelector('#logout-button').addEventListener('click', function () {
    try { sessionStorage.removeItem(auth.SESSION_KEY); } catch { /* También se elimina el estado en memoria. */ }
    form.reset();
    clearError();
    concealPassword();
    render(null, true);
  });
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      try { render(auth.readSession(sessionStorage)); } catch { render(currentSession); }
    }
  });
  document.querySelector('#year').textContent = new Date().getFullYear();
  try { render(auth.readSession(sessionStorage)); } catch { render(null); }
})();
