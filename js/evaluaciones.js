// ============================================
// evaluaciones.js — Parcialitos, TPs, notas del día a día
// ============================================

let _evaluaciones = [];

async function loadEvaluaciones() {
  const { data, error } = await sb
    .from('evaluaciones')
    .select('*, materias(nombre, color)')
    .order('fecha', { ascending: false });

  if (error) { console.error(error); return; }
  _evaluaciones = data || [];
  renderEvaluaciones();
}

// ── Grupos de tipos para promedios separados ──
const GRUPOS_PROMEDIO = [
  {
    key:    'parcialitos',
    label:  'Parcialitos',
    tipos:  ['parcialito'],
  },
  {
    key:    'parciales',
    label:  'Parciales / Finales / Recup.',
    tipos:  ['parcial', 'final', 'recuperatorio'],
  },
  {
    key:    'tps',
    label:  'TPs',
    tipos:  ['tp'],
  },
];

function renderEvaluaciones() {
  const el = document.getElementById('evaluaciones-list');

  if (!_evaluaciones.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⭐</span>
        <p>Todavía no cargaste ninguna nota.</p>
        <button class="btn-primary btn-sm" onclick="document.getElementById('btn-nueva-evaluacion').click()">
          + Agregar nota
        </button>
      </div>`;
    return;
  }

  // Agrupar por materia
  const porMateria = {};
  _evaluaciones.forEach(ev => {
    const key = ev.materia_id;
    if (!porMateria[key]) porMateria[key] = { materia: ev.materias, items: [] };
    porMateria[key].items.push(ev);
  });

  let html = '';
  for (const key in porMateria) {
    const { materia, items } = porMateria[key];
    const dotColor = materia?.color || '#4f46e5';

    // Construir chips de promedios por grupo (solo los que tienen ítems con nota)
    const promedioChips = GRUPOS_PROMEDIO
      .map(grupo => {
        const delGrupo = items.filter(i => grupo.tipos.includes(i.tipo));
        if (!delGrupo.length) return null;
        const prom = promedio(delGrupo);
        const color = colorNota(prom);
        return `
          <div style="text-align:center;">
            <span style="font-family:'DM Mono',monospace;font-size:1rem;font-weight:600;${color}">${prom}</span>
            <p style="font-size:0.65rem;color:var(--text-muted);margin-top:2px;white-space:nowrap;">${grupo.label}</p>
          </div>`;
      })
      .filter(Boolean)
      .join(`<div style="width:1px;background:var(--border);align-self:stretch;margin:0 4px;"></div>`);

    html += `
      <div class="card" style="margin-bottom:14px; border-left:3px solid ${dotColor};">
        <div class="card-header" style="margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="card-title">${escHtml(materia?.nombre || '—')}</span>
          </div>
          ${promedioChips ? `
          <div style="display:flex;align-items:center;gap:6px;">
            ${promedioChips}
          </div>` : ''}
        </div>
        ${items.map(ev => itemEvaluacion(ev)).join('')}
      </div>`;
  }

  el.innerHTML = html;
}

// Devuelve color inline según la nota (o vacío si no hay nota)
function colorNota(promStr) {
  if (promStr === '—') return 'color:var(--text-muted);';
  const n = parseFloat(promStr);
  if (n >= 6) return 'color:var(--green);';
  if (n >= 4) return 'color:var(--yellow);';
  return 'color:var(--red);';
}

function itemEvaluacion(ev) {
  const tipoLabel = {
    parcialito: '📋 Parcialito',
    tp:         '📄 TP',
    parcial:    '📝 Parcial',
    final:      '🎓 Final',
    recuperatorio: '🔄 Recup.',
  }[ev.tipo] || ev.tipo;

  const notaColor = ev.nota != null
    ? ev.nota >= 6 ? 'color:var(--green)' : ev.nota >= 4 ? 'color:var(--yellow)' : 'color:var(--red)'
    : '';

  return `
    <div class="list-item">
      <div class="list-item-info">
        <p class="list-item-title">${tipoLabel}</p>
        <p class="list-item-sub">
          ${formatFecha(ev.fecha)}
          ${ev.observacion ? ' · ' + escHtml(ev.observacion) : ''}
        </p>
      </div>
      <span class="nota-chip" style="${notaColor}">
        ${ev.nota != null ? ev.nota : '—'}
      </span>
      <div style="display:flex;gap:6px;">
        <button class="btn-secondary btn-sm" onclick="openModalEditarEvaluacion('${ev.id}')">✏️</button>
        <button class="btn-danger" onclick="eliminarEvaluacion('${ev.id}')">🗑️</button>
      </div>
    </div>`;
}

// Calcula el promedio de un array de evaluaciones (solo las que tienen nota cargada)
function promedio(items) {
  const conNota = items.filter(i => i.nota != null);
  if (!conNota.length) return '—';
  const sum = conNota.reduce((a, b) => a + Number(b.nota), 0);
  return (sum / conNota.length).toFixed(2);
}

// ── Modal nueva/editar evaluación ──
document.getElementById('btn-nueva-evaluacion').addEventListener('click', () => openModalEvaluacion());

function openModalEvaluacion(ev = null) {
  const esEdicion = !!ev;
  const materias = getMaterias();

  if (!materias.length) {
    showToast('Primero agregá al menos una materia.', 'error');
    return;
  }

  const html = `
    <div class="field">
      <label>Materia *</label>
      <select id="ev-materia">
        ${materias.map(m =>
          `<option value="${m.id}" ${esEdicion && ev.materia_id === m.id ? 'selected':''}>
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
}

function openModalEditarEvaluacion(id) {
  const ev = _evaluaciones.find(e => e.id === id);
  if (ev) openModalEvaluacion(ev);
}

async function eliminarEvaluacion(id) {
  const { error } = await sb.from('evaluaciones').delete().eq('id', id);
  if (error) { showToast('Error al eliminar.', 'error'); return; }
  showToast('Evaluación eliminada.');
  await loadEvaluaciones();
}
