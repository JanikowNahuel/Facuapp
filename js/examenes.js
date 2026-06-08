// ============================================
// examenes.js — CRUD exámenes + unidades
// Opera dentro del detalle de materia
// ============================================

let _examenes = [];

async function loadExamenes() {
  const { data, error } = await sb
    .from('examenes')
    .select('*, materias(nombre, color), unidades(*)')
    .order('fecha');
  if (error) { console.error(error); return; }
  _examenes = data || [];
}

function getExamenes() { return _examenes; }

// ── Modal nuevo examen (acepta materiaId preseleccionado) ──
function openModalExamen(examen = null, materiaIdPresel = null) {
  const esEdicion = !!examen;
  const materias  = getMaterias();

  if (!materias.length) {
    showToast('Primero agregá al menos una materia.', 'error');
    return;
  }

  const materiaId = esEdicion ? examen.materia_id : (materiaIdPresel || materias[0].id);

  const html = `
    <div class="field">
      <label>Materia *</label>
      <select id="ex-materia">
        ${materias.map(m =>
          `<option value="${m.id}" ${materiaId === m.id ? 'selected':''}>
            ${escHtml(m.nombre)}
          </option>`
        ).join('')}
      </select>
    </div>
    <div class="fields-row">
      <div class="field">
        <label>Tipo *</label>
        <select id="ex-tipo">
          <option value="parcial"       ${esEdicion && examen.tipo==='parcial'       ? 'selected':''}>Parcial</option>
          <option value="final"         ${esEdicion && examen.tipo==='final'         ? 'selected':''}>Final</option>
          <option value="recuperatorio" ${esEdicion && examen.tipo==='recuperatorio' ? 'selected':''}>Recuperatorio</option>
        </select>
      </div>
      <div class="field">
        <label>Fecha *</label>
        <input type="date" id="ex-fecha" value="${esEdicion ? examen.fecha : ''}" />
      </div>
    </div>
    <div class="field">
      <label>Descripción (opcional)</label>
      <input type="text" id="ex-desc"
             value="${esEdicion ? escHtml(examen.descripcion || '') : ''}"
             placeholder="Ej: Unidades 1-6, presencial" />
    </div>
    ${esEdicion ? `
    <div class="fields-row">
      <div class="field">
        <label>Estado</label>
        <select id="ex-estado">
          <option value="pendiente"     ${examen.estado==='pendiente'     ? 'selected':''}>Pendiente</option>
          <option value="aprobado"      ${examen.estado==='aprobado'      ? 'selected':''}>Aprobado</option>
          <option value="desaprobado"   ${examen.estado==='desaprobado'   ? 'selected':''}>Desaprobado</option>
          <option value="recuperatorio" ${examen.estado==='recuperatorio' ? 'selected':''}>Recuperatorio</option>
        </select>
      </div>
      <div class="field">
        <label>Nota</label>
        <input type="number" id="ex-nota" min="0" max="10" step="0.25"
               value="${examen.nota ?? ''}" placeholder="0–10" />
      </div>
    </div>` : ''}
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="${esEdicion ? `guardarEdicionExamen('${examen.id}')` : 'guardarNuevoExamen()'}">
        ${esEdicion ? 'Guardar cambios' : 'Crear examen'}
      </button>
    </div>`;

  openModal(esEdicion ? 'Editar examen' : 'Nuevo examen', html);
}

async function guardarNuevoExamen() {
  const materia_id  = document.getElementById('ex-materia').value;
  const tipo        = document.getElementById('ex-tipo').value;
  const fecha       = document.getElementById('ex-fecha').value;
  const descripcion = document.getElementById('ex-desc').value.trim() || null;

  if (!fecha) { showToast('La fecha es obligatoria.', 'error'); return; }

  const { data: ex, error } = await sb
    .from('examenes')
    .insert({ materia_id, tipo, fecha, descripcion, user_id: _currentUser.id })
    .select().single();

  if (error) { showToast('Error al crear examen.', 'error'); return; }

  closeModal();
  showToast('Examen creado ✓', 'success');
  await loadExamenes();

  // Si el detalle de esa materia está abierto, refrescar
  if (_materiaDetalleId === materia_id) {
    renderDetalleMateria(materia_id);
  }

  // Abrir modal de unidades automáticamente
  openModalVerExamen(ex.id);
}

async function guardarEdicionExamen(id) {
  const materia_id  = document.getElementById('ex-materia').value;
  const tipo        = document.getElementById('ex-tipo').value;
  const fecha       = document.getElementById('ex-fecha').value;
  const descripcion = document.getElementById('ex-desc').value.trim() || null;
  const estado      = document.getElementById('ex-estado').value;
  const notaVal     = document.getElementById('ex-nota').value;
  const nota        = notaVal !== '' ? parseFloat(notaVal) : null;

  if (!fecha) { showToast('La fecha es obligatoria.', 'error'); return; }

  const { error } = await sb
    .from('examenes')
    .update({ materia_id, tipo, fecha, descripcion, estado, nota })
    .eq('id', id);

  if (error) { showToast('Error al guardar.', 'error'); return; }

  closeModal();
  showToast('Examen actualizado ✓', 'success');
  await loadExamenes();

  if (_materiaDetalleId) renderDetalleMateria(_materiaDetalleId);
}

function openModalEditarExamen(id) {
  const ex = _examenes.find(e => e.id === id);
  if (ex) openModalExamen(ex);
}

// ── Modal ver examen (con unidades) ──
async function openModalVerExamen(id) {
  const { data: ex } = await sb
    .from('examenes')
    .select('*, materias(nombre,color), unidades(*)')
    .eq('id', id)
    .single();

  if (!ex) return;

  const unidades  = (ex.unidades || []).sort((a,b) => a.orden - b.orden);
  const dias      = diasHasta(ex.fecha);
  const badge     = urgenciaBadge(dias);
  const tipoLabel = { parcial:'Parcial', final:'Final', recuperatorio:'Recuperatorio' }[ex.tipo] || ex.tipo;

  const html = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
      <span class="card-badge ${badge.clase}">${dias < 0 ? 'Pasado' : dias === 0 ? '¡Hoy!' : dias + ' días'}</span>
      <span style="font-size:0.8rem;color:var(--text-muted);">${tipoLabel} · ${formatFecha(ex.fecha)}</span>
    </div>
    <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:16px;">${escHtml(ex.descripcion || '')}</p>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <p class="panel-title" style="margin:0;">Unidades a estudiar</p>
      <button class="btn-primary btn-sm" onclick="agregarUnidad('${ex.id}')">+ Unidad</button>
    </div>

    <div class="unidades-list" id="unidades-list-${ex.id}">
      ${unidades.length
        ? unidades.map(u => rowUnidad(u)).join('')
        : `<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;padding:16px 0;">
             Todavía no hay unidades. Agregá las que entran en este examen.
           </p>`
      }
    </div>`;

  openModal(`${escHtml(ex.materias?.nombre || '')} — ${tipoLabel}`, html);
}

function rowUnidad(u) {
  const estados = [
    { val: 'la_vi',       label: 'La vi',     cls: 'active-vi' },
    { val: 'la_entiendo', label: 'Entiendo',  cls: 'active-entiendo' },
    { val: 'la_domino',   label: 'Domino',    cls: 'active-domino' },
  ];
  return `
    <div class="unidad-item" id="unidad-${u.id}">
      <span class="unidad-nombre">${escHtml(u.nombre)}</span>
      <div class="unidad-progress-btns">
        ${estados.map(s => `
          <button class="prog-btn ${u.progreso === s.val ? s.cls : ''}"
                  onclick="setProgresoUnidad('${u.id}', '${s.val}', this)">
            ${s.label}
          </button>`).join('')}
      </div>
      <button class="btn-icon" onclick="eliminarUnidad('${u.id}')" title="Quitar">✕</button>
    </div>`;
}

async function agregarUnidad(examenId) {
  const nombre = prompt('Nombre de la unidad:');
  if (!nombre?.trim()) return;

  const { data: u, error } = await sb
    .from('unidades')
    .insert({ examen_id: examenId, nombre: nombre.trim(), orden: 0, progreso: 'pendiente' })
    .select().single();

  if (error) { showToast('Error al agregar unidad.', 'error'); return; }

  const lista = document.getElementById('unidades-list-' + examenId);
  if (lista) {
    if (lista.querySelector('p')) lista.innerHTML = '';
    lista.insertAdjacentHTML('beforeend', rowUnidad(u));
  }

  await loadExamenes();
  if (_materiaDetalleId) renderDetalleMateria(_materiaDetalleId);
}

async function setProgresoUnidad(unidadId, progreso, btnEl) {
  const { error } = await sb.from('unidades').update({ progreso }).eq('id', unidadId);
  if (error) { showToast('Error al guardar progreso.', 'error'); return; }

  const fila = btnEl.closest('.unidad-item');
  fila.querySelectorAll('.prog-btn').forEach(b => {
    b.classList.remove('active-vi','active-entiendo','active-domino');
  });
  btnEl.classList.add({ la_vi:'active-vi', la_entiendo:'active-entiendo', la_domino:'active-domino' }[progreso]);

  await loadExamenes();
  if (_materiaDetalleId) renderDetalleMateria(_materiaDetalleId);
}

async function eliminarUnidad(id) {
  const { error } = await sb.from('unidades').delete().eq('id', id);
  if (error) { showToast('Error al eliminar.', 'error'); return; }
  document.getElementById('unidad-' + id)?.remove();
  await loadExamenes();
  if (_materiaDetalleId) renderDetalleMateria(_materiaDetalleId);
}

function confirmarEliminarExamen(id) {
  const html = `
    <p style="color:var(--text-secondary);font-size:0.9rem;">
      ¿Eliminar este examen? Se van a borrar también sus unidades.
    </p>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-danger" onclick="eliminarExamen('${id}')">Eliminar</button>
    </div>`;
  openModal('Eliminar examen', html);
}

async function eliminarExamen(id) {
  const { error } = await sb.from('examenes').delete().eq('id', id);
  if (error) { showToast('Error al eliminar.', 'error'); return; }
  closeModal();
  showToast('Examen eliminado.');
  await loadExamenes();
  if (_materiaDetalleId) renderDetalleMateria(_materiaDetalleId);
}