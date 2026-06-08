// ============================================
// evaluaciones.js — CRUD notas
// Opera dentro del detalle de materia
// ============================================

let _evaluaciones = [];

async function loadEvaluaciones() {
  const { data, error } = await sb
    .from('evaluaciones')
    .select('*, materias(nombre, color)')
    .order('fecha', { ascending: false });
  if (error) { console.error(error); return; }
  _evaluaciones = data || [];
}

function getEvaluaciones() { return _evaluaciones; }

// ── Modal nueva/editar evaluación (acepta materiaId preseleccionado) ──
function openModalEvaluacion(ev = null, materiaIdPresel = null) {
  const esEdicion = !!ev;
  const materias  = getMaterias();

  if (!materias.length) {
    showToast('Primero agregá al menos una materia.', 'error');
    return;
  }

  const materiaId = esEdicion ? ev.materia_id : (materiaIdPresel || materias[0].id);

  const html = `
    <div class="field">
      <label>Materia *</label>
      <select id="ev-materia">
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
        <select id="ev-tipo">
          <option value="parcialito"    ${esEdicion && ev.tipo==='parcialito'    ? 'selected':''}>Parcialito</option>
          <option value="tp"            ${esEdicion && ev.tipo==='tp'            ? 'selected':''}>TP</option>
          <option value="parcial"       ${esEdicion && ev.tipo==='parcial'       ? 'selected':''}>Parcial</option>
          <option value="final"         ${esEdicion && ev.tipo==='final'         ? 'selected':''}>Final</option>
          <option value="recuperatorio" ${esEdicion && ev.tipo==='recuperatorio' ? 'selected':''}>Recuperatorio</option>
        </select>
      </div>
      <div class="field">
        <label>Fecha *</label>
        <input type="date" id="ev-fecha" value="${esEdicion ? ev.fecha : new Date().toISOString().split('T')[0]}" />
      </div>
    </div>
    <div class="field">
      <label>Nota</label>
      <input type="number" id="ev-nota" min="0" max="10" step="0.25"
             value="${esEdicion && ev.nota != null ? ev.nota : ''}"
             placeholder="Dejá vacío si todavía no sabés" />
    </div>
    <div class="field">
      <label>Observación (opcional)</label>
      <input type="text" id="ev-obs"
             value="${esEdicion ? escHtml(ev.observacion || '') : ''}"
             placeholder="Ej: con apuntes, oral, etc." />
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="${esEdicion ? `guardarEdicionEvaluacion('${ev.id}')` : 'guardarNuevaEvaluacion()'}">
        ${esEdicion ? 'Guardar cambios' : 'Guardar nota'}
      </button>
    </div>`;

  openModal(esEdicion ? 'Editar evaluación' : 'Agregar nota', html);
}

async function guardarNuevaEvaluacion() {
  const materia_id  = document.getElementById('ev-materia').value;
  const tipo        = document.getElementById('ev-tipo').value;
  const fecha       = document.getElementById('ev-fecha').value;
  const notaVal     = document.getElementById('ev-nota').value;
  const observacion = document.getElementById('ev-obs').value.trim() || null;
  const nota        = notaVal !== '' ? parseFloat(notaVal) : null;

  if (!fecha) { showToast('La fecha es obligatoria.', 'error'); return; }

  const { error } = await sb
    .from('evaluaciones')
    .insert({ materia_id, tipo, fecha, nota, observacion, user_id: _currentUser.id });

  if (error) { showToast('Error al guardar.', 'error'); return; }

  closeModal();
  showToast('Nota guardada ✓', 'success');
  await loadEvaluaciones();
  if (_materiaDetalleId === materia_id) renderDetalleMateria(materia_id);
}

async function guardarEdicionEvaluacion(id) {
  const materia_id  = document.getElementById('ev-materia').value;
  const tipo        = document.getElementById('ev-tipo').value;
  const fecha       = document.getElementById('ev-fecha').value;
  const notaVal     = document.getElementById('ev-nota').value;
  const observacion = document.getElementById('ev-obs').value.trim() || null;
  const nota        = notaVal !== '' ? parseFloat(notaVal) : null;

  if (!fecha) { showToast('La fecha es obligatoria.', 'error'); return; }

  const { error } = await sb
    .from('evaluaciones')
    .update({ materia_id, tipo, fecha, nota, observacion })
    .eq('id', id);

  if (error) { showToast('Error al guardar.', 'error'); return; }

  closeModal();
  showToast('Evaluación actualizada ✓', 'success');
  await loadEvaluaciones();
  if (_materiaDetalleId) renderDetalleMateria(_materiaDetalleId);
}

function openModalEditarEvaluacion(id) {
  const ev = _evaluaciones.find(e => e.id === id);
  if (ev) openModalEvaluacion(ev);
}

async function eliminarEvaluacion(id) {
  const ev = _evaluaciones.find(e => e.id === id);
  const { error } = await sb.from('evaluaciones').delete().eq('id', id);
  if (error) { showToast('Error al eliminar.', 'error'); return; }
  showToast('Evaluación eliminada.');
  await loadEvaluaciones();
  if (_materiaDetalleId) renderDetalleMateria(_materiaDetalleId);
}