// ============================================
// materias.js — CRUD de materias y horarios
// ============================================

let _materias = [];

// ── Cargar y renderizar ──
async function loadMaterias() {
  const { data, error } = await sb
    .from('materias')
    .select('*, horarios(*)')
    .order('nombre');

  if (error) { console.error(error); return; }
  _materias = data || [];
  renderMaterias();
}

function getMaterias() { return _materias; }

function renderMaterias() {
  const el = document.getElementById('materias-list');

  if (!_materias.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📖</span>
        <p>Todavía no agregaste materias.</p>
        <button class="btn-primary btn-sm" onclick="document.getElementById('btn-nueva-materia').click()">
          + Agregar primera materia
        </button>
      </div>`;
    return;
  }

  el.innerHTML = `<div class="cards-grid">${_materias.map(m => cardMateria(m)).join('')}</div>`;
}

function cardMateria(m) {
  const horarios = (m.horarios || [])
    .sort((a, b) => {
      const orden = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
      return orden.indexOf(a.dia) - orden.indexOf(b.dia);
    })
    .map(h => `<span class="horario-chip">${capFirst(h.dia)} ${h.hora_inicio.slice(0,5)}–${h.hora_fin.slice(0,5)}</span>`)
    .join('');

  const cuatri = m.cuatrimestre && m.anio
    ? `<span class="card-badge badge-accent">${m.cuatrimestre}° cuat. · ${m.anio}° año</span>`
    : '';

  return `
    <div class="card" id="materia-card-${m.id}">
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="color-dot" style="background:${m.color}; width:12px; height:12px;"></span>
          <span class="card-title">${m.nombre}</span>
        </div>
        <div class="card-actions">
          <button class="btn-secondary btn-sm" onclick="openModalRecursos('${m.id}')" title="Recursos">📎</button>
          <button class="btn-secondary btn-sm" onclick="openModalEditarMateria('${m.id}')">✏️</button>
          <button class="btn-danger" onclick="confirmarEliminarMateria('${m.id}', '${escHtml(m.nombre)}')">🗑️</button>
        </div>
      </div>
      ${cuatri}
      ${horarios ? `<div class="horarios-wrap" style="margin-top:10px;">${horarios}</div>` : ''}
    </div>`;
}

// ── Modal nueva/editar materia ──
document.getElementById('btn-nueva-materia').addEventListener('click', () => openModalMateria());

function openModalMateria(materia = null) {
  const esEdicion = !!materia;
  const horariosIniciales = esEdicion && materia.horarios?.length
    ? materia.horarios
    : [{ dia: 'lunes', hora_inicio: '08:00', hora_fin: '10:00' }];

  const html = `
    <div class="field">
      <label>Nombre de la materia *</label>
      <input type="text" id="m-nombre" value="${esEdicion ? escHtml(materia.nombre) : ''}" placeholder="Ej: Análisis Matemático" />
    </div>
    <div class="fields-row">
      <div class="field">
        <label>Año</label>
        <select id="m-anio">
          <option value="">—</option>
          ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${esEdicion && materia.anio == n ? 'selected':''}>${n}° año</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Cuatrimestre</label>
        <select id="m-cuatri">
          <option value="">—</option>
          <option value="1" ${esEdicion && materia.cuatrimestre == 1 ? 'selected':''}>1°</option>
          <option value="2" ${esEdicion && materia.cuatrimestre == 2 ? 'selected':''}>2°</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>Color</label>
      ${renderColorPicker(esEdicion ? materia.color : COLORES_MATERIAS[0])}
    </div>
    <div class="field">
      <label>Horarios de cursada</label>
      <div class="horario-builder" id="horario-builder">
        ${horariosIniciales.map((h, i) => rowHorario(i, h)).join('')}
      </div>
      <button class="btn-add-horario" onclick="agregarFilaHorario()" style="margin-top:8px;">+ Agregar horario</button>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="${esEdicion ? `guardarEdicionMateria('${materia.id}')` : 'guardarNuevaMateria()'}">
        ${esEdicion ? 'Guardar cambios' : 'Crear materia'}
      </button>
    </div>`;

  openModal(esEdicion ? 'Editar materia' : 'Nueva materia', html);
}

function rowHorario(i, h = {}) {
  const dias = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
  return `
    <div class="horario-row" id="hrow-${i}">
      <div class="field">
        <label>Día</label>
        <select id="h-dia-${i}">
          ${dias.map(d => `<option value="${d}" ${h.dia === d ? 'selected':''}>${capFirst(d)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Inicio</label>
        <input type="time" id="h-ini-${i}" value="${h.hora_inicio?.slice(0,5) || '08:00'}" />
      </div>
      <div class="field">
        <label>Fin</label>
        <input type="time" id="h-fin-${i}" value="${h.hora_fin?.slice(0,5) || '10:00'}" />
      </div>
      <button class="btn-icon" onclick="quitarFilaHorario(${i})" title="Quitar">✕</button>
    </div>`;
}

let _horarioIdx = 1;
function agregarFilaHorario() {
  const builder = document.getElementById('horario-builder');
  const idx = Date.now(); // id único
  builder.insertAdjacentHTML('beforeend', rowHorario(idx));
}

function quitarFilaHorario(i) {
  const row = document.getElementById('hrow-' + i);
  if (row) row.remove();
}

function leerHorarios() {
  const rows = document.querySelectorAll('[id^="hrow-"]');
  const result = [];
  rows.forEach(row => {
    const i = row.id.replace('hrow-', '');
    const dia  = document.getElementById('h-dia-' + i)?.value;
    const ini  = document.getElementById('h-ini-' + i)?.value;
    const fin  = document.getElementById('h-fin-' + i)?.value;
    if (dia && ini && fin) result.push({ dia, hora_inicio: ini, hora_fin: fin });
  });
  return result;
}

async function guardarNuevaMateria() {
  const nombre  = document.getElementById('m-nombre').value.trim();
  const anio    = document.getElementById('m-anio').value || null;
  const cuatri  = document.getElementById('m-cuatri').value || null;
  const color   = document.getElementById('selected-color').value;
  const horarios = leerHorarios();

  if (!nombre) { showToast('El nombre es obligatorio.', 'error'); return; }

  const { data: { user } } = await sb.auth.getUser();
  if (!user) { showToast('Sesión expirada, reiniciá sesión.', 'error'); return; }

  const { data: mat, error } = await sb
    .from('materias')
    .insert({ nombre, anio, cuatrimestre: cuatri, color, user_id: user.id })
    .select()
    .single();

  if (error) { console.error('Error materia:', error); showToast('Error: ' + error.message, 'error'); return; }

  if (horarios.length) {
    await sb.from('horarios').insert(horarios.map(h => ({ ...h, materia_id: mat.id })));
  }

  closeModal();
  showToast('Materia creada ✓', 'success');
  await loadMaterias();
}

async function openModalEditarMateria(id) {
  const materia = _materias.find(m => m.id === id);
  if (!materia) return;
  openModalMateria(materia);
}

async function guardarEdicionMateria(id) {
  const nombre  = document.getElementById('m-nombre').value.trim();
  const anio    = document.getElementById('m-anio').value || null;
  const cuatri  = document.getElementById('m-cuatri').value || null;
  const color   = document.getElementById('selected-color').value;
  const horarios = leerHorarios();

  if (!nombre) { showToast('El nombre es obligatorio.', 'error'); return; }

  const { error } = await sb
    .from('materias')
    .update({ nombre, anio, cuatrimestre: cuatri, color })
    .eq('id', id);

  if (error) { showToast('Error al guardar.', 'error'); return; }

  // Reemplazar horarios: borrar los viejos e insertar los nuevos
  await sb.from('horarios').delete().eq('materia_id', id);
  if (horarios.length) {
    await sb.from('horarios').insert(horarios.map(h => ({ ...h, materia_id: id })));
  }

  closeModal();
  showToast('Materia actualizada ✓', 'success');
  await loadMaterias();
}

function confirmarEliminarMateria(id, nombre) {
  const html = `
    <p style="color:var(--text-secondary); font-size:0.9rem;">
      ¿Seguro que querés eliminar <strong>${nombre}</strong>?<br>
      Se van a borrar también sus exámenes y evaluaciones.
    </p>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-danger" onclick="eliminarMateria('${id}')">Sí, eliminar</button>
    </div>`;
  openModal('Eliminar materia', html);
}

async function eliminarMateria(id) {
  const { error } = await sb.from('materias').delete().eq('id', id);
  if (error) { showToast('Error al eliminar.', 'error'); return; }
  closeModal();
  showToast('Materia eliminada.', '');
  await loadMaterias();
}

// ── Helpers ──
function capFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================
// RECURSOS POR MATERIA
// ============================================

async function openModalRecursos(materiaId) {
  const materia = _materias.find(m => m.id === materiaId);
  if (!materia) return;

  const { data: recursos } = await sb
    .from('recursos')
    .select('*')
    .eq('materia_id', materiaId)
    .order('created_at');

  const listaHTML = (recursos || []).length
    ? (recursos || []).map(r => rowRecurso(r)).join('')
    : `<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;padding:16px 0;">
         Sin recursos todavía. Agregá un link.
       </p>`;

  const html = `
    <div id="recursos-lista" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
      ${listaHTML}
    </div>

    <div style="border-top:1px solid var(--border);padding-top:16px;">
      <p style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em;">Agregar recurso</p>
      <div class="field" style="margin-bottom:10px;">
        <label>Nombre *</label>
        <input type="text" id="rec-nombre" placeholder="Ej: Apuntes Unidad 1-3" />
      </div>
      <div class="field" style="margin-bottom:10px;">
        <label>URL *</label>
        <input type="url" id="rec-url" placeholder="https://drive.google.com/..." />
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label>Detalle (opcional)</label>
        <input type="text" id="rec-detalle" placeholder="Ej: Con correcciones del profe" />
      </div>
      <button class="btn-primary btn-sm" onclick="guardarRecurso('${materiaId}')">+ Agregar</button>
    </div>`;

  openModal(`📎 Recursos — ${escHtml(materia.nombre)}`, html);
}

function rowRecurso(r) {
  return `
    <div class="recurso-item" id="recurso-${r.id}">
      <div style="flex:1;min-width:0;">
        <a href="${escHtml(r.url)}" target="_blank" rel="noopener"
           style="font-size:0.88rem;font-weight:600;color:var(--accent);text-decoration:none;display:flex;align-items:center;gap:6px;">
          🔗 ${escHtml(r.nombre)}
        </a>
        ${r.detalle ? `<p style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${escHtml(r.detalle)}</p>` : ''}
      </div>
      <button class="btn-danger" onclick="eliminarRecurso('${r.id}')">🗑️</button>
    </div>`;
}

async function guardarRecurso(materiaId) {
  const nombre  = document.getElementById('rec-nombre').value.trim();
  const url     = document.getElementById('rec-url').value.trim();
  const detalle = document.getElementById('rec-detalle').value.trim() || null;

  if (!nombre) { showToast('El nombre es obligatorio.', 'error'); return; }
  if (!url)    { showToast('La URL es obligatoria.', 'error'); return; }

  const { data: { user } } = await sb.auth.getUser();

  const { data: r, error } = await sb
    .from('recursos')
    .insert({ materia_id: materiaId, user_id: user.id, nombre, url, detalle })
    .select()
    .single();

  if (error) { showToast('Error al guardar recurso.', 'error'); return; }

  // Agregar a la lista sin cerrar el modal
  const lista = document.getElementById('recursos-lista');
  if (lista) {
    if (lista.querySelector('p')) lista.innerHTML = '';
    lista.insertAdjacentHTML('beforeend', rowRecurso(r));
  }

  // Limpiar campos
  document.getElementById('rec-nombre').value = '';
  document.getElementById('rec-url').value = '';
  document.getElementById('rec-detalle').value = '';
  showToast('Recurso agregado ✓', 'success');
}

async function eliminarRecurso(id) {
  const { error } = await sb.from('recursos').delete().eq('id', id);
  if (error) { showToast('Error al eliminar.', 'error'); return; }
  document.getElementById('recurso-' + id)?.remove();
  showToast('Recurso eliminado.');
}
