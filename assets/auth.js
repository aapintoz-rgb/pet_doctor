/* Credenciales en texto para la versión académica. No usar como autenticación de producción. */
(function (global) {
  'use strict';
  const SESSION_KEY = 'pet-doctor.session.v1';
  const DEMO_USER = { username: 'admin', password: 'PetDoctor123', displayName: 'Administrador' };

  function authenticate(username, password) {
    if (username.trim() !== DEMO_USER.username || password !== DEMO_USER.password) return null;
    return { username: DEMO_USER.username, displayName: DEMO_USER.displayName };
  }

  function readSession(storage) {
    try {
      const session = JSON.parse(storage.getItem(SESSION_KEY));
      return session && session.username === DEMO_USER.username && session.displayName === DEMO_USER.displayName
        ? { username: session.username, displayName: session.displayName } : null;
    } catch { return null; }
  }

  global.PetDoctorAuth = Object.freeze({ SESSION_KEY, authenticate, readSession });
})(globalThis);
