// ============================================
// recordatorios.js — Recordatorios por materia
// ============================================

let _recordatorios = [];

async function loadRecordatorios() {
  const { data, error } = await sb
    .from('recordatorios')
    .select('*, materias(nombre, color)')
    .order('fecha', { ascending: true });
  if (error) { console.error(error); return; }
  _recordatorios = data || [];
}

function getRecordatorios() { return _recordatorios; }

// ── Modal nuevo recordatorio ──
function openModalNuevoRecordatorio(materiaId) {
  const hoy = new Date().toISOString().split('T')[0];
  const html = `
    <div class="field">
      <label>¿Qué tenés que hacer? *</label>
      <input type="text" id="rec-texto" placeholder="Ej: Estudiar unidades 3 y 4" autofocus />
    </div>
    <div class="field">
      <label>Fecha límite *</label>
      <input type="date" id="rec-fecha" value="${hoy}" />
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="guardarNuevoRecordatorio('${materiaId}')">Guardar</button>
    </div>`;
  openModal('Nuevo recordatorio', html);
}

async function guardarNuevoRecordatorio(materiaId) {
  const texto = document.getElementById('rec-texto').value.trim();
  const fecha = document.getElementById('rec-fecha').value;

  if (!texto) { showToast('El texto es obligatorio.', 'error'); return; }
  if (!fecha)  { showToast('La fecha es obligatoria.', 'error'); return; }

  const { error } = await sb
    .from('recordatorios')
    .insert({ materia_id: materiaId, texto, fecha, user_id: _currentUser.id });

  if (error) { showToast('Error al guardar.', 'error'); return; }

  closeModal();
  showToast('Recordatorio guardado ✓', 'success');
  await loadRecordatorios();
  if (_materiaDetalleId === materiaId) renderDetalleMateria(materiaId);
}

async function toggleRecordatorio(id, materiaId) {
  const rec = _recordatorios.find(r => r.id === id);
  if (!rec) return;

  const { error } = await sb
    .from('recordatorios')
    .update({ completado: !rec.completado })
    .eq('id', id);

  if (error) { showToast('Error al actualizar.', 'error'); return; }

  await loadRecordatorios();
  if (_materiaDetalleId === materiaId) renderDetalleMateria(materiaId);
}

async function eliminarRecordatorio(id, materiaId) {
  const { error } = await sb.from('recordatorios').delete().eq('id', id);
  if (error) { showToast('Error al eliminar.', 'error'); return; }
  showToast('Recordatorio eliminado.');
  await loadRecordatorios();
  if (_materiaDetalleId === materiaId) renderDetalleMateria(materiaId);
}