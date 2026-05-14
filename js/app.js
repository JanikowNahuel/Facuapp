// ============================================
// app.js — Orquestador principal
// Maneja sesión, navegación y sidebar
// ============================================

// ── Estado global ──
let _currentSection = 'dashboard';
let _currentUser = null;
let _appIniciada = false; // evita doble inicialización

// ── Verificar sesión existente al cargar la página ──
// Esto resuelve el caso donde hay sesión en localStorage pero
// onAuthStateChange no dispara a tiempo o queda en loop
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

// ── Auth state listener ──
// Solo actúa en cambios reales (login / logout), no en la carga inicial
sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user && !_appIniciada) {
    _currentUser = session.user;
    _appIniciada = true;
    await iniciarApp(session.user);
  } else if (event === 'SIGNED_OUT') {
    _appIniciada = false;
    _currentUser = null;
    mostrarAuthScreen();
  }
});

// ── Iniciar app post-login ──
async function iniciarApp(user) {
  // Cargar perfil
  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Actualizar sidebar con datos del perfil
  const nombre  = profile?.nombre  || user.email.split('@')[0];
  const carrera = profile?.carrera || 'Sin carrera definida';

  document.getElementById('sidebar-name').textContent    = nombre;
  document.getElementById('sidebar-carrera').textContent = carrera;
  document.getElementById('sidebar-avatar').textContent  = nombre.charAt(0).toUpperCase();

  // Mostrar app, ocultar auth
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // Cargar todos los datos
  await Promise.all([
    loadMaterias(),
    loadExamenes(),
    loadEvaluaciones(),
  ]);

  // Renderizar dashboard
  await renderDashboard();

  // Navegar a la sección inicial
  navegarA('dashboard');
}

function mostrarAuthScreen() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
}

// ── Navegación entre secciones ──
const TITULOS = {
  dashboard:    'Inicio',
  materias:     'Materias',
  examenes:     'Exámenes',
  evaluaciones: 'Evaluaciones',
  calendario:   'Calendario',
};

function navegarA(seccion) {
  // Ocultar todas las secciones
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  // Mostrar la sección destino
  document.getElementById('section-' + seccion)?.classList.add('active');

  // Actualizar nav activo
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-section="${seccion}"]`)?.classList.add('active');

  // Actualizar título
  document.getElementById('page-title').textContent = TITULOS[seccion] || seccion;

  _currentSection = seccion;

  // Renderizar secciones que lo necesitan en cada visita
  if (seccion === 'dashboard')  renderDashboard();
  if (seccion === 'calendario') renderCalendario();

  // Cerrar sidebar en mobile
  cerrarSidebar();
}

// ── Sidebar ──
document.getElementById('hamburger').addEventListener('click', abrirSidebar);
document.getElementById('sidebar-close').addEventListener('click', cerrarSidebar);
document.getElementById('sidebar-overlay').addEventListener('click', cerrarSidebar);

function abrirSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('active');
}

function cerrarSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// Nav items del sidebar
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const seccion = item.dataset.section;
    if (seccion) navegarA(seccion);
  });
});

// ── Modal: cerrar con backdrop o botón ──
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-backdrop')) closeModal();
});

// ── Cerrar modal con Escape ──
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});