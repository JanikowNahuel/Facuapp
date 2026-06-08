// ============================================
// app.js — Orquestador principal v2
// Navegación: bottom nav, 3 secciones + detalle de materia
// ============================================

let _currentSection = 'dashboard';
let _currentUser    = null;
let _appIniciada    = false;
let _materiaDetalleId = null; // materia actualmente en detalle

// ── Sesión al cargar ──
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    _currentUser = session.user;
    _appIniciada = true;
    await iniciarApp(session.user);
  } else {
    mostrarAuthScreen();
  }
})();

sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user && !_appIniciada) {
    _currentUser = session.user;
    _appIniciada = true;
    await iniciarApp(session.user);
  } else if (event === 'SIGNED_OUT') {
    _appIniciada  = false;
    _currentUser  = null;
    mostrarAuthScreen();
  }
});

// ── Iniciar app post-login ──
async function iniciarApp(user) {
  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const nombre  = profile?.nombre  || user.email.split('@')[0];
  const carrera = profile?.carrera || 'Sin carrera';

  // Actualizar perfil modal
  document.getElementById('perfil-nombre').textContent  = nombre;
  document.getElementById('perfil-carrera').textContent = carrera;
  document.getElementById('perfil-avatar').textContent  = nombre.charAt(0).toUpperCase();

  // Avatar en bottom nav
  const bnavAvatar = document.getElementById('bnav-avatar');
  bnavAvatar.innerHTML = `<div class="bnav-avatar-circle">${nombre.charAt(0).toUpperCase()}</div>`;

  // Mostrar app
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // Cargar datos
  await Promise.all([
    loadMaterias(),
    loadExamenes(),
    loadEvaluaciones(),
    loadRecordatorios(),
  ]);

  navegarA('dashboard');
}

function mostrarAuthScreen() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
}

// ── Navegación principal ──
const TITULOS = {
  dashboard:        'Inicio',
  materias:         'Materias',
  calendario:       'Calendario',
  'materia-detalle': '', // el título se pone dinámicamente
};

function navegarA(seccion) {
  // Ocultar todas las secciones
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + seccion)?.classList.add('active');

  // Bottom nav: marcar activo solo en las 3 principales
  document.querySelectorAll('.bnav-item').forEach(n => n.classList.remove('active'));
  const bnavTarget = seccion === 'materia-detalle' ? 'materias' : seccion;
  document.querySelector(`.bnav-item[data-section="${bnavTarget}"]`)?.classList.add('active');

  // Botón back: solo en detalle de materia
  const btnBack = document.getElementById('btn-back');
  if (seccion === 'materia-detalle') {
    btnBack.classList.remove('hidden');
  } else {
    btnBack.classList.add('hidden');
  }

  // Botón Nueva materia en top bar
  const topBarRight = document.getElementById('top-bar-right');
  if (seccion === 'materias') {
    topBarRight.innerHTML = `<button class="btn-primary btn-sm" onclick="openModalMateria()">+ Nueva</button>`;
  } else {
    topBarRight.innerHTML = '';
  }

  // Título
  document.getElementById('page-title').textContent = TITULOS[seccion] || seccion;

  _currentSection = seccion;

  // Render por sección
  if (seccion === 'dashboard')  renderDashboard();
  if (seccion === 'materias')   renderMaterias();
  if (seccion === 'calendario') renderCalendario();
}

// ── Navegar al detalle de una materia ──
function abrirDetalleMateria(materiaId) {
  _materiaDetalleId = materiaId;
  navegarA('materia-detalle');
  renderDetalleMateria(materiaId);
}

// ── Botón back ──
document.getElementById('btn-back').addEventListener('click', () => {
  navegarA('materias');
});

// ── Bottom nav ──
document.querySelectorAll('.bnav-item').forEach(item => {
  item.addEventListener('click', () => {
    const seccion = item.dataset.section;
    if (seccion === 'perfil') {
      abrirPerfil();
    } else if (seccion) {
      navegarA(seccion);
    }
  });
});

// ── Perfil modal ──
function abrirPerfil() {
  document.getElementById('perfil-backdrop').classList.remove('hidden');
}
function cerrarPerfil() {
  document.getElementById('perfil-backdrop').classList.add('hidden');
}
document.getElementById('perfil-backdrop').addEventListener('click', (e) => {
  if (e.target === document.getElementById('perfil-backdrop')) cerrarPerfil();
});

// ── Logout ──
document.getElementById('btn-logout').addEventListener('click', async () => {
  await sb.auth.signOut();
});

// ── Modal genérico ──
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-backdrop')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    cerrarPerfil();
  }
});