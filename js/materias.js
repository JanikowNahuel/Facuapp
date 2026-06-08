// ============================================
// materias.js — Lista + Detalle con tabs internos
// ============================================

let _materias = [];

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

// ── Lista de materias (nueva estética) ──
function renderMaterias() {
  const el = document.getElementById('materias-list');

  if (!_materias.length) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📖</span>
        <p>Todavía no agregaste materias.</p>
        <button class="btn-primary btn-sm" onclick="openModalMateria()">+ Agregar primera materia</button>
      </div>`;
    return;
  }

  const hoy = new Date(); hoy.setHours(0,0,0,0);

  const html = _materias.map(m => {
    const horarios = (m.horarios || [])
      .sort((a,b) => {
        const ord = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
        return ord.indexOf(a.dia) - ord.indexOf(b.dia);
      });

    const horarioStr = horarios.length
      ? horarios.map(h => `${capFirst(h.dia.slice(0,3))} ${h.hora_inicio.slice(0,5)}`).join(' · ')
      : 'Sin horario';

    // Próximo examen de esta materia
    const examenesMateria = getExamenes()
      .filter(e => e.materia_id === m.id && e.estado === 'pendiente' && new Date(e.fecha + 'T00:00:00') >= hoy)
      .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    const proximoEx = examenesMateria[0];
    const dias = proximoEx ? diasHasta(proximoEx.fecha) : null;

    // Promedio de evaluaciones de la materia
    const evals = getEvaluaciones().filter(e => e.materia_id === m.id && e.nota != null);
    const promStr = evals.length
      ? (evals.reduce((a,b) => a + Number(b.nota), 0) / evals.length).toFixed(1)
      : null;

    // Chips
    let chipsHtml = '';
    if (proximoEx && dias !== null) {
      const badge = urgenciaBadge(dias);
      const tipoLabel = { parcial:'Parcial', final:'Final', recuperatorio:'Recup.' }[proximoEx.tipo] || proximoEx.tipo;
      chipsHtml += `<span class="card-badge ${badge.clase}">${tipoLabel} en ${dias === 0 ? '¡Hoy!' : dias + 'd'}</span>`;
    }
    if (promStr) {
      const n = parseFloat(promStr);
      const cls = n >= 6 ? 'badge-green' : n >= 4 ? 'badge-yellow' : 'badge-red';
      chipsHtml += `<span class="card-badge ${cls}">${promStr} prom.</span>`;
    }
    if (m.cuatrimestre && m.anio) {
      chipsHtml += `<span class="card-badge badge-gray">${m.cuatrimestre}° cuat · ${m.anio}° año</span>`;
    }

    return `
      <div class="materia-card" style="border-left-color:${m.color}" onclick="abrirDetalleMateria('${m.id}')">
        <div class="materia-card-info">
          <div class="materia-card-name">${escHtml(m.nombre)}</div>
          <div class="materia-card-sub">${escHtml(horarioStr)}</div>
          ${chipsHtml ? `<div class="materia-card-chips">${chipsHtml}</div>` : ''}
        </div>
        <span class="materia-card-arrow">›</span>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="materias-header">
      <h3>${_materias.length} materia${_materias.length !== 1 ? 's' : ''}</h3>
    </div>
    ${html}`;
}

// ── Detalle de materia ──
async function renderDetalleMateria(materiaId) {
  const el = document.getElementById('materia-detalle-content');
  const m  = _materias.find(x => x.id === materiaId);
  if (!m) return;

  // Título en top bar
  document.getElementById('page-title').textContent = m.nombre;

  // Datos derivados
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const examenesM = getExamenes().filter(e => e.materia_id === materiaId);
  const pendientes = examenesM.filter(e => e.estado === 'pendiente' && new Date(e.fecha + 'T00:00:00') >= hoy)
    .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
  const pasados = examenesM.filter(e => new Date(e.fecha + 'T00:00:00') < hoy)
    .sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

  const proximoEx = pendientes[0];
  const diasProximo = proximoEx ? diasHasta(proximoEx.fecha) : null;

  const evalsM = getEvaluaciones().filter(e => e.materia_id === materiaId);
  const recsM  = getRecordatorios().filter(r => r.materia_id === materiaId && !r.completado);

  // Promedios por grupo
  const GRUPOS = [
    { label: 'Parcialitos', tipos: ['parcialito'] },
    { label: 'Parciales',   tipos: ['parcial', 'final', 'recuperatorio'] },
    { label: 'TPs',         tipos: ['tp'] },
  ];

  // Stat: próximo examen
  const statProximo = diasProximo !== null
    ? `<span style="color:${diasProximo <= 7 ? 'var(--red)' : diasProximo <= 15 ? 'var(--yellow)' : 'var(--text-primary)'}">${diasProximo === 0 ? '¡Hoy!' : diasProximo + 'd'}</span>`
    : `<span style="color:var(--text-muted)">—</span>`;

  // Promedio general rápido
  const conNota = evalsM.filter(e => e.nota != null);
  const promGeneral = conNota.length
    ? (conNota.reduce((a,b) => a + Number(b.nota), 0) / conNota.length).toFixed(2)
    : '—';

  el.innerHTML = `
    <!-- Header colorido -->
    <div class="detalle-header" style="background:${m.color}">
      <div class="detalle-header-top">
        <div>
          <div class="detalle-nombre">${escHtml(m.nombre)}</div>
          <div class="detalle-meta">
            ${m.anio ? `${m.anio}° año` : ''}${m.anio && m.cuatrimestre ? ' · ' : ''}${m.cuatrimestre ? `${m.cuatrimestre}° cuatrimestre` : ''}
            ${(m.anio || m.cuatrimestre) && (m.horarios?.length) ? ' · ' : ''}
            ${(m.horarios || []).slice(0,2).map(h => `${capFirst(h.dia.slice(0,3))} ${h.hora_inicio.slice(0,5)}`).join(', ')}
          </div>
        </div>
        <button class="btn-detalle-edit" onclick="openModalEditarMateria('${m.id}')">✏️</button>
      </div>
    </div>

    <!-- Stats rápidos -->
    <div class="detalle-stats">
      <div class="detalle-stat">
        <div class="detalle-stat-val">${statProximo}</div>
        <div class="detalle-stat-lbl">Prox. examen</div>
      </div>
      <div class="detalle-stat">
        <div class="detalle-stat-val">${promGeneral}</div>
        <div class="detalle-stat-lbl">Promedio</div>
      </div>
      <div class="detalle-stat">
        <div class="detalle-stat-val" style="${recsM.length > 0 ? 'color:var(--accent)' : ''}">${recsM.length}</div>
        <div class="detalle-stat-lbl">Recordatorios</div>
      </div>
    </div>

    <!-- Tabs internos -->
    <div class="detalle-tabs">
      <button class="detalle-tab active" onclick="switchDetalleTab('examenes', this)">Exámenes</button>
      <button class="detalle-tab" onclick="switchDetalleTab('notas', this)">Notas</button>
      <button class="detalle-tab" onclick="switchDetalleTab('recordatorios', this)">Recordatorios</button>
    </div>

    <!-- Panel: Exámenes -->
    <div class="detalle-panel active" id="panel-examenes">
      ${renderPanelExamenes(materiaId, pendientes, pasados, m.color)}
    </div>

    <!-- Panel: Notas -->
    <div class="detalle-panel" id="panel-notas">
      ${renderPanelNotas(materiaId, evalsM, GRUPOS)}
    </div>

    <!-- Panel: Recordatorios -->
    <div class="detalle-panel" id="panel-recordatorios">
      ${renderPanelRecordatorios(materiaId, recsM)}
    </div>
  `;
}

function switchDetalleTab(tabId, btnEl) {
  document.querySelectorAll('.detalle-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.detalle-panel').forEach(p => p.classList.remove('active'));
  btnEl.classList.add('active');
  document.getElementById('panel-' + tabId)?.classList.add('active');
}

// ── Panel Exámenes ──
function renderPanelExamenes(materiaId, pendientes, pasados, color) {
  let html = `
    <div class="panel-header">
      <span class="panel-title">Próximos</span>
      <button class="btn-primary btn-sm" onclick="openModalExamen(null, '${materiaId}')">+ Nuevo</button>
    </div>`;

  if (pendientes.length) {
    html += pendientes.map(e => cardExamenDetalle(e, color, false)).join('');
  } else {
    html += `<div style="text-align:center;padding:20px 0;color:var(--text-muted);font-size:0.88rem;">Sin exámenes próximos</div>`;
  }

  if (pasados.length) {
    html += `<p class="panel-title" style="margin:20px 0 10px;">Historial</p>`;
    html += pasados.map(e => cardExamenDetalle(e, color, true)).join('');
  }

  return html;
}

function cardExamenDetalle(e, color, esHistorial) {
  const dias = diasHasta(e.fecha);
  const badge = urgenciaBadge(dias);
  const unidades = e.unidades || [];
  const totalU = unidades.length;
  const pct = totalU
    ? Math.round(((unidades.filter(u=>u.progreso==='la_vi').length * 0.33
      + unidades.filter(u=>u.progreso==='la_entiendo').length * 0.66
      + unidades.filter(u=>u.progreso==='la_domino').length) / totalU * 100))
    : 0;
  const tipoLabel = { parcial:'Parcial', final:'Final', recuperatorio:'Recuperatorio' }[e.tipo] || e.tipo;

  const estadoBadge = esHistorial
    ? badgeEstado(e.estado, e.nota)
    : `<span class="card-badge ${badge.clase}">${dias < 0 ? 'Pasado' : dias === 0 ? '¡Hoy!' : dias + 'd'}</span>`;

  return `
    <div class="examen-item" style="border-left-color:${color}">
      <div class="examen-item-header">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
            <span style="font-size:0.72rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">${tipoLabel}</span>
            ${estadoBadge}
          </div>
          <div style="font-size:0.82rem;font-family:'DM Mono',monospace;color:var(--text-muted);">${formatFecha(e.fecha)}</div>
          ${e.descripcion ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px;">${escHtml(e.descripcion)}</div>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-secondary btn-sm" onclick="openModalVerExamen('${e.id}')">Ver</button>
          <button class="btn-secondary btn-sm" onclick="openModalEditarExamen('${e.id}')">✏️</button>
          <button class="btn-danger" onclick="confirmarEliminarExamen('${e.id}')">🗑️</button>
        </div>
      </div>
      ${totalU ? `
        <div class="progress-bar-wrap" style="margin-bottom:4px;">
          <div class="progress-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="progress-label"><span>${totalU} unidades</span><span>${pct}%</span></div>
      ` : ''}
    </div>`;
}

function badgeEstado(estado, nota) {
  const map = {
    pendiente:     ['badge-accent', 'Pendiente'],
    aprobado:      ['badge-green',  'Aprobado'],
    desaprobado:   ['badge-red',    'Desaprobado'],
    recuperatorio: ['badge-yellow', 'Recuperatorio'],
  };
  const [clase, texto] = map[estado] || ['badge-accent', estado];
  return `<span class="card-badge ${clase}">${texto}${nota != null ? ' · ' + nota : ''}</span>`;
}

// ── Panel Notas ──
function renderPanelNotas(materiaId, evalsM, GRUPOS) {
  let html = `
    <div class="panel-header">
      <span class="panel-title">Promedios</span>
      <button class="btn-primary btn-sm" onclick="openModalEvaluacion(null, '${materiaId}')">+ Nota</button>
    </div>`;

  // Promedios por grupo
  const chipsGrupo = GRUPOS
    .map(g => {
      const items = evalsM.filter(i => g.tipos.includes(i.tipo) && i.nota != null);
      if (!items.length) return null;
      const prom = (items.reduce((a,b) => a + Number(b.nota), 0) / items.length).toFixed(2);
      const n = parseFloat(prom);
      const color = n >= 6 ? 'var(--green)' : n >= 4 ? 'var(--yellow)' : 'var(--red)';
      return `
        <div class="promedio-chip">
          <div class="promedio-val" style="color:${color}">${prom}</div>
          <div class="promedio-lbl">${g.label}</div>
        </div>`;
    })
    .filter(Boolean);

  if (chipsGrupo.length) {
    html += `<div class="promedios-strip">${chipsGrupo.join('')}</div>`;
  }

  if (!evalsM.length) {
    html += `<div style="text-align:center;padding:20px 0;color:var(--text-muted);font-size:0.88rem;">Sin notas cargadas</div>`;
    return html;
  }

  html += `<p class="panel-title" style="margin-bottom:10px;">Historial</p>`;
  html += evalsM
    .sort((a,b) => new Date(b.fecha) - new Date(a.fecha))
    .map(ev => itemEvaluacionDetalle(ev))
    .join('');

  return html;
}

function itemEvaluacionDetalle(ev) {
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
        <p class="list-item-sub">${formatFecha(ev.fecha)}${ev.observacion ? ' · ' + escHtml(ev.observacion) : ''}</p>
      </div>
      <span class="nota-chip" style="${notaColor}">${ev.nota != null ? ev.nota : '—'}</span>
      <div style="display:flex;gap:6px;">
        <button class="btn-secondary btn-sm" onclick="openModalEditarEvaluacion('${ev.id}')">✏️</button>
        <button class="btn-danger" onclick="eliminarEvaluacion('${ev.id}')">🗑️</button>
      </div>
    </div>`;
}

// ── Panel Recordatorios ──
function renderPanelRecordatorios(materiaId, items) {
  const hoy = new Date(); hoy.setHours(0,0,0,0);

  let html = `
    <button class="recordatorio-add" onclick="openModalNuevoRecordatorio('${materiaId}')">
      <span style="font-size:1.1rem;">+</span>
      <span>Nuevo recordatorio...</span>
    </button>`;

  if (!items.length) {
    html += `<div style="text-align:center;padding:20px 0;color:var(--text-muted);font-size:0.88rem;">Sin recordatorios pendientes</div>`;
    return html;
  }

  const ordenados = [...items].sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

  html += ordenados.map(r => {
    const dias = diasHasta(r.fecha);
    const badge = urgenciaBadge(dias);
    return `
      <div class="recordatorio-item" id="rec-item-${r.id}">
        <button class="recordatorio-check" onclick="toggleRecordatorio('${r.id}', '${materiaId}')" title="Marcar como hecho"></button>
        <div class="recordatorio-info">
          <div class="recordatorio-texto">${escHtml(r.texto)}</div>
          <div class="recordatorio-fecha">Vence: ${formatFecha(r.fecha)}</div>
        </div>
        <span class="card-badge ${badge.clase}">${dias < 0 ? 'Vencido' : dias === 0 ? 'Hoy' : dias + 'd'}</span>
        <button class="btn-danger" onclick="eliminarRecordatorio('${r.id}', '${materiaId}')">🗑️</button>
      </div>`;
  }).join('');

  return html;
}

// ── Modal nueva materia ──
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

function agregarFilaHorario() {
  const builder = document.getElementById('horario-builder');
  const idx = Date.now();
  builder.insertAdjacentHTML('beforeend', rowHorario(idx));
}

function quitarFilaHorario(i) {
  document.getElementById('hrow-' + i)?.remove();
}

function leerHorarios() {
  const rows = document.querySelectorAll('[id^="hrow-"]');
  const result = [];
  rows.forEach(row => {
    const i = row.id.replace('hrow-', '');
    const dia = document.getElementById('h-dia-' + i)?.value;
    const ini = document.getElementById('h-ini-' + i)?.value;
    const fin = document.getElementById('h-fin-' + i)?.value;
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
  if (!user) { showToast('Sesión expirada.', 'error'); return; }

  const { data: mat, error } = await sb
    .from('materias')
    .insert({ nombre, anio, cuatrimestre: cuatri, color, user_id: user.id })
    .select().single();

  if (error) { showToast('Error: ' + error.message, 'error'); return; }

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

  await sb.from('horarios').delete().eq('materia_id', id);
  if (horarios.length) {
    await sb.from('horarios').insert(horarios.map(h => ({ ...h, materia_id: id })));
  }

  closeModal();
  showToast('Materia actualizada ✓', 'success');
  await loadMaterias();

  // Si estamos en el detalle, refrescarlo
  if (_materiaDetalleId === id) {
    await loadMaterias();
    renderDetalleMateria(id);
  }
}

function confirmarEliminarMateria(id, nombre) {
  const html = `
    <p style="color:var(--text-secondary);font-size:0.9rem;">
      ¿Seguro que querés eliminar <strong>${nombre}</strong>?<br>
      Se van a borrar también sus exámenes, notas y recordatorios.
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
  showToast('Materia eliminada.');
  await loadMaterias();
  navegarA('materias');
}

// ── Helpers ──
function capFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}