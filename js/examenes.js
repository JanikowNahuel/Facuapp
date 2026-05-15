// ============================================
// examenes.js — CRUD exámenes + unidades + progreso
// ============================================

let _examenes = [];

async function loadExamenes() {
  const { data, error } = await sb
    .from('examenes')
    .select('*, materias(nombre, color), unidades(*)')
    .order('fecha');

  if (error) { console.error(error); return; }
  _examenes = data || [];
  renderExamenes();
}

function getExamenes() { return _examenes; }

function renderExamenes() {
  const el = document.getElementById('examenes-list');

  if (!_examenes.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <p>No hay exámenes cargados todavía.</p>
        <button class="btn-primary btn-sm" onclick="document.getElementById('btn-nuevo-examen').click()">
          + Agregar examen
        </button>
      </div>`;
    return;
  }

  // Separar pendientes de pasados
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const pendientes = _examenes.filter(e => new Date(e.fecha + 'T00:00:00') >= hoy);
  const pasados    = _examenes.filter(e => new Date(e.fecha + 'T00:00:00') < hoy);

  let html = '';

  if (pendientes.length) {
    html += `<p class="section-title" style="margin-bottom:12px;">Próximos</p>`;
    html += pendientes.map(e => cardExamen(e)).join('');
  }

  if (pasados.length) {
    html += `<p class="section-title" style="margin:24px 0 12px;">Historial</p>`;
    html += pasados.map(e => cardExamen(e, true)).join('');
  }

  el.innerHTML = html;
}

function cardExamen(e, esHistorial = false) {
  const dias = diasHasta(e.fecha);
  const badge = urgenciaBadge(dias);
  const unidades = e.unidades || [];
  const totalU = unidades.length;
  const dominadas = unidades.filter(u => u.progreso === 'la_domino').length;
  const entendidas = unidades.filter(u => u.progreso === 'la_entiendo').length;
  const vistas = unidades.filter(u => u.progreso === 'la_vi').length;
  // Progreso ponderado: vi=33%, entiendo=66%, domino=100%
  const pct = totalU
    ? Math.round(((vistas * 0.33) + (entendidas * 0.66) + (dominadas)) / totalU * 100)
    : 0;

  const dotColor = e.materias?.color || '#4f46e5';
  const tipoLabel = { parcial:'Parcial', final:'Final', recuperatorio:'Recup.' }[e.tipo] || e.tipo;

  const estadoBadge = esHistorial
    ? badgeEstado(e.estado, e.nota)
    : `<span class="card-badge ${badge.clase}">${badge.texto}</span>`;

  return `
    <div class="card" style="margin-bottom:12px; border-left:3px solid ${dotColor};">
      <div class="card-header">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:0.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">${tipoLabel}</span>
            ${estadoBadge}
          </div>
          <p class="card-title" style="font-size:0.95rem;">${escHtml(e.materias?.nombre || '—')}</p>
          <p style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;font-family:'DM Mono',monospace;">${formatFecha(e.fecha)}</p>
          ${e.descripcion ? `<p style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px;">${escHtml(e.descripcion)}</p>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-secondary btn-sm" onclick="openModalVerExamen('${e.id}')">Ver</button>
          <button class="btn-secondary btn-sm" onclick="openModalEditarExamen('${e.id}')">✏️</button>
          <button class="btn-danger" onclick="confirmarEliminarExamen('${e.id}')">🗑️</button>
        </div>
      </div>
      ${totalU ? `
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%;"></div>
        </div>
        <div class="progress-label">
          <span>${totalU} unidades</span>
          <span>${pct}% listo</span>
        </div>
      ` : ''}
      ${!esHistorial && dias >= 0 ? intervaloInfo(e) : ''}
    </div>`;
}

function intervaloInfo(examen) {
  // Buscar el siguiente examen DESPUÉS de este
  const fechaActual = new Date(examen.fecha + 'T00:00:00');
  const siguientes = _examenes
    .filter(e => e.id !== examen.id && new Date(e.fecha + 'T00:00:00') > fechaActual)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  if (!siguientes.length) return '';
  const sig = siguientes[0];
  const diff = Math.round((new Date(sig.fecha + 'T00:00:00') - fechaActual) / (1000 * 60 * 60 * 24));

  return `
    <p style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;">
      🔜 <strong>${diff} días</strong> hasta el siguiente (${escHtml(sig.materias?.nombre || '')})
    </p>`;
}

function badgeEstado(estado, nota) {
  const map = {
    pendiente:     ['badge-accent', 'Pendiente'],
    aprobado:      ['badge-green',  'Aprobado'],
    desaprobado:   ['badge-red',    'Desaprobado'],
    recuperatorio: ['badge-yellow', 'Recuperatorio'],
  };
  const [clase, texto] = map[estado] || ['badge-accent', estado];
  const notaStr = nota != null ? ` · ${nota}` : '';
  return `<span class="card-badge ${clase}">${texto}${notaStr}</span>`;
}

// ── Modal nuevo examen ──
document.getElementById('btn-nuevo-examen').addEventListener('click', () => openModalExamen());

function openModalExamen(examen = null) {
  const esEdicion = !!examen;
  const materias = getMaterias();

  if (!materias.length) {
    showToast('Primero agregá al menos una materia.', 'error');
    return;
  }

  const html = `
    <div class="field">
      <label>Materia *</label>
      <select id="ex-materia">
        ${materias.map(m =>
          `<option value="${m.id}" ${esEdicion && examen.materia_id === m.id ? 'selected':''}>
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
      <input type="text" id="ex-desc" value="${esEdicion ? escHtml(examen.descripcion || '') : ''}" placeholder="Ej: Unidades 1-6, presencial" />
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
        <label>Nota (si ya lo rendiste)</label>
        <input type="number" id="ex-nota" min="0" max="10" step="0.25" value="${examen.nota ?? ''}" placeholder="0–10" />
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
    .select()
    .single();

  if (error) { showToast('Error al crear examen.', 'error'); return; }

  closeModal();
  showToast('Examen creado ✓', 'success');
  await loadExamenes();
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
}

function openModalEditarExamen(id) {
  const ex = _examenes.find(e => e.id === id);
  if (ex) openModalExamen(ex);
}

// ── Modal ver examen (con unidades) ──
async function openModalVerExamen(id) {
  // Recargar para tener unidades frescas
  const { data: ex } = await sb
    .from('examenes')
    .select('*, materias(nombre,color), unidades(*)')
    .eq('id', id)
    .single();

  if (!ex) return;

  const unidades = (ex.unidades || []).sort((a,b) => a.orden - b.orden);
  const dias = diasHasta(ex.fecha);
  const badge = urgenciaBadge(dias);
  const tipoLabel = { parcial:'Parcial', final:'Final', recuperatorio:'Recuperatorio' }[ex.tipo] || ex.tipo;

  const html = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
      <span class="card-badge ${badge.clase}">${badge.texto < 0 ? 'Pasado' : dias === 0 ? '¡Hoy!' : `${dias} días`}</span>
      <span style="font-size:0.8rem;color:var(--text-muted);">${tipoLabel} · ${formatFecha(ex.fecha)}</span>
    </div>
    <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:16px;">${escHtml(ex.descripcion || '')}</p>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <p class="section-title" style="margin:0;">Unidades a estudiar</p>
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
    { val: 'la_vi',       label: 'La vi',      cls: 'active-vi' },
    { val: 'la_entiendo', label: 'Entiendo',   cls: 'active-entiendo' },
    { val: 'la_domino',   label: 'La domino',  cls: 'active-domino' },
  ];

  const resumido = u.resumido || false;

  return `
    <div class="unidad-item" id="unidad-${u.id}" style="${resumido ? 'background:var(--green-soft);border-color:#86efac;' : ''}">
      <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:0;">
        <span class="unidad-nombre" style="${resumido ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${escHtml(u.nombre)}</span>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <div class="unidad-progress-btns">
            ${estados.map(s => `
              <button class="prog-btn ${u.progreso === s.val ? s.cls : ''}"
                      onclick="setProgresoUnidad('${u.id}', '${s.val}', this)">
                ${s.label}
              </button>`).join('')}
          </div>
          <label class="toggle-resumido" title="Marcar como resumido">
            <input type="checkbox" ${resumido ? 'checked' : ''}
                   onchange="setResumidoUnidad('${u.id}', this.checked, this)"
                   style="display:none;" />
            <span class="toggle-chip ${resumido ? 'active' : ''}">
              ${resumido ? '✅ Resumido' : '📝 Sin resumir'}
            </span>
          </label>
        </div>
      </div>
      <button class="btn-icon" onclick="eliminarUnidad('${u.id}')" title="Quitar" style="flex-shrink:0;">✕</button>
    </div>`;
}

async function agregarUnidad(examenId) {
  const nombre = prompt('Nombre de la unidad:');
  if (!nombre?.trim()) return;

  const { data: u, error } = await sb
    .from('unidades')
    .insert({ examen_id: examenId, nombre: nombre.trim(), orden: 0, progreso: 'pendiente' })
    .select()
    .single();

  if (error) { showToast('Error al agregar unidad.', 'error'); return; }

  const lista = document.getElementById('unidades-list-' + examenId);
  if (lista) {
    // Quitar mensaje de vacío si existe
    if (lista.querySelector('p')) lista.innerHTML = '';
    lista.insertAdjacentHTML('beforeend', rowUnidad(u));
  }

  await loadExamenes(); // actualizar progreso en la lista principal
}

async function setProgresoUnidad(unidadId, progreso, btnEl) {
  const { error } = await sb
    .from('unidades')
    .update({ progreso })
    .eq('id', unidadId);

  if (error) { showToast('Error al guardar progreso.', 'error'); return; }

  // Actualizar botones visualmente
  const fila = btnEl.closest('.unidad-item');
  const clsMap = { la_vi: 'active-vi', la_entiendo: 'active-entiendo', la_domino: 'active-domino' };
  fila.querySelectorAll('.prog-btn').forEach(b => {
    b.classList.remove('active-vi','active-entiendo','active-domino');
  });
  btnEl.classList.add(clsMap[progreso]);

  await loadExamenes(); // refrescar barras de progreso
}

async function eliminarUnidad(id) {
  const { error } = await sb.from('unidades').delete().eq('id', id);
  if (error) { showToast('Error al eliminar.', 'error'); return; }
  const el = document.getElementById('unidad-' + id);
  if (el) el.remove();
  await loadExamenes();
}

function confirmarEliminarExamen(id) {
  const ex = _examenes.find(e => e.id === id);
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
}

async function setResumidoUnidad(unidadId, resumido, inputEl) {
  const { error } = await sb
    .from('unidades')
    .update({ resumido })
    .eq('id', unidadId);

  if (error) { showToast('Error al guardar.', 'error'); inputEl.checked = !resumido; return; }

  // Actualizar UI de la fila
  const fila = inputEl.closest('.unidad-item');
  const nombre = fila.querySelector('.unidad-nombre');
  const chip = inputEl.closest('label').querySelector('.toggle-chip');

  if (resumido) {
    fila.style.background = 'var(--green-soft)';
    fila.style.borderColor = '#86efac';
    nombre.style.textDecoration = 'line-through';
    nombre.style.color = 'var(--text-muted)';
    chip.textContent = '✅ Resumido';
    chip.classList.add('active');
  } else {
    fila.style.background = '';
    fila.style.borderColor = '';
    nombre.style.textDecoration = '';
    nombre.style.color = '';
    chip.textContent = '📝 Sin resumir';
    chip.classList.remove('active');
  }

  await loadExamenes();
}
