// ============================================
// auth.js — Login, registro, logout, sesión
// ============================================

// ── Tabs de auth ──
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('form-' + tab.dataset.tab).classList.add('active');
  });
});

// ── Login ──
document.getElementById('btn-login').addEventListener('click', async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('btn-login');
  errEl.textContent = '';

  if (!email || !password) {
    errEl.textContent = 'Completá todos los campos.';
    return;
  }

  btn.textContent = 'Entrando...';
  btn.disabled = true;

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) throw error;

    if (data?.user) {
      _appIniciada = true;
      _currentUser = data.user;
      await iniciarApp(data.user);
    }
  } catch (err) {
    errEl.textContent = 'Email o contraseña incorrectos.';
  } finally {
    btn.textContent = 'Entrar';
    btn.disabled = false;
  }
});

// ── Registro ──
document.getElementById('btn-register').addEventListener('click', async () => {
  const nombre   = document.getElementById('reg-nombre').value.trim();
  const carrera  = document.getElementById('reg-carrera').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('register-error');
  const btn      = document.getElementById('btn-register');
  errEl.textContent = '';

  if (!nombre || !email || !password) {
    errEl.textContent = 'Completá nombre, email y contraseña.';
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }

  btn.textContent = 'Creando cuenta...';
  btn.disabled = true;

  try {
    const { data, error } = await sb.auth.signUp({ email, password });

    if (error) throw error;

    // Guardar nombre y carrera en el perfil
    // data.user existe siempre, data.session solo si email confirm está OFF
    if (data.user) {
      await sb.from('profiles').update({ nombre, carrera }).eq('id', data.user.id);
    }

    if (data.session) {
      // Email confirm desactivado → entrar directo
      showToast('¡Bienvenido/a, ' + nombre + '!', 'success');
      _appIniciada = true;
      _currentUser = data.session.user;
      await iniciarApp(data.session.user);
    } else {
      // Email confirm activado → avisar y mandar al login
      errEl.textContent = '';
      showToast('Revisá tu email para confirmar la cuenta.', '');
      document.querySelector('[data-tab="login"]').click();
      document.getElementById('login-email').value = email;
    }
  } catch (err) {
    console.error('Registro error:', err);
    errEl.textContent = err.message || 'Error al crear la cuenta. Intentá de nuevo.';
  } finally {
    btn.textContent = 'Crear cuenta';
    btn.disabled = false;
  }
});

// ── Logout ──
document.getElementById('btn-logout').addEventListener('click', async () => {
  await sb.auth.signOut();
  // onAuthStateChange en app.js maneja la transición a la pantalla de auth
});