// ============================================
// dashboard.js — Home + Calendario
// ============================================

async function renderDashboard() {
  const el = document.getElementById('dashboard-content');
  const materias    = getMaterias();
  const examenes    = getExamenes();
  const hoy         = new Date(); hoy.setHours(0,0,0,0);
  const diaHoy      = diaHoyES();

  // Próximos exámenes (solo pendientes, ordenados por fecha)
  const proximos = examenes
    .filter(e => e.estado === 'pendiente' && new Date(e.fecha + 'T00:00:00') >= hoy)
    .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

  // Clases de hoy
  const clasesHoy = [];
  materias.forEach(m => {
    (m.horarios || []).forEach(h => {
      if (h.dia === diaHoy) clasesHoy.push({ materia: m, horario: h });
    });
  });
  clasesHoy.sort((a,b) => a.horario.hora_inicio.localeCompare(b.horario.hora_inicio));

  // Stats rápidas
  const proximoExamen = proximos[0];
  const diasAlProximo = proximoExamen ? diasHasta(proximoExamen.fecha) : null;

  // Examen más urgente con progreso
  const conUnidades = proximos.filter(e => e.unidades?.length > 0);
  const progresoGlobal = conUnidades.length
    ? Math.round(conUnidades.reduce((acc, e) => {
        const u = e.unidades;
        const pct = u.length
          ? ((u.filter(x=>x.progreso==='la_vi').length * 0.33
            + u.filter(x=>x.progreso==='la_entiendo').length * 0.66
            + u.filter(x=>x.progreso==='la_domino').length) / u.length * 100)
          : 0;
        return acc + pct;
      }, 0) / conUnidades.length)
    : null;

  el.innerHTML = `
    <!-- Stats rápidas -->
    <div class="dashboard-grid" style="margin-bottom:24px;">
      <div class="stat-card accent">
        <p class="card-title" style="font-size:0.78rem;margin-bottom:6px;">Próximo examen</p>
        ${proximoExamen
          ? `<div class="countdown">${diasAlProximo === 0 ? '¡Hoy!' : diasAlProximo + 'd'}</div>
             <p class="countdown-label">${escHtml(proximoExamen.materias?.nombre || '')}</p>`
          : `<div class="countdown" style="font-size:1.2rem;">😎</div>
             <p class="countdown-label">Sin exámenes próximos</p>`
        }
      </div>
      <div class="stat-card">
        <p class="card-title" style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;">Materias activas</p>
        <div class="countdown" style="font-size:2rem;">${materias.length}</div>
        <p class="countdown-label" style="color:var(--text-muted);">${examenes.filter(e=>e.estado==='pendiente').length} examen${examenes.filter(e=>e.estado==='pendiente').length !== 1 ? 'es' : ''} pendiente${examenes.filter(e=>e.estado==='pendiente').length !== 1 ? 's' : ''}</p>
      </div>
    </div>

    ${progresoGlobal !== null ? `
    <!-- Progreso de estudio global -->
    <div style="margin-bottom:24px;">
      <p class="section-title">Progreso de estudio</p>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:0.88rem;font-weight:500;">Promedio general de unidades</span>
          <span style="font-family:'DM Mono',monospace;font-size:0.9rem;font-weight:500;">${progresoGlobal}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${progresoGlobal}%;"></div>
        </div>
      </div>
    </div>` : ''}

    <!-- Clases de hoy -->
    <div style="margin-bottom:24px;">
      <p class="section-title">Hoy — ${capFirst(diaHoy)}</p>
      ${clasesHoy.length
        ? `<div class="clases-hoy">
             ${clasesHoy.map(c => `
               <div class="clase-item" style="border-color:${c.materia.color};background:${c.materia.color}11;">
                 <span class="clase-hora">${c.horario.hora_inicio.slice(0,5)}–${c.horario.hora_fin.slice(0,5)}</span>
                 <span style="font-size:0.88rem;font-weight:500;">${escHtml(c.materia.nombre)}</span>
               </div>`).join('')}
           </div>`
        : `<div class="card" style="text-align:center;padding:20px;">
             <p style="font-size:0.875rem;color:var(--text-muted);">Sin clases hoy 🎉</p>
           </div>`
      }
    </div>

    <!-- Próximos exámenes -->
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <p class="section-title" style="margin:0;">Próximos exámenes</p>
        <button class="btn-secondary btn-sm" onclick="navegarA('examenes')">Ver todos</button>
      </div>
      ${proximos.length
        ? `<div class="proximos-examenes">
             ${proximos.slice(0,5).map((e, idx) => {
               const dias = diasHasta(e.fecha);
               const badge = urgenciaBadge(dias);
               const unidades = e.unidades || [];
               const pct = unidades.length
                 ? Math.round(((unidades.filter(u=>u.progreso==='la_vi').length * 0.33
                   + unidades.filter(u=>u.progreso==='la_entiendo').length * 0.66
                   + unidades.filter(u=>u.progreso==='la_domino').length) / unidades.length * 100))
                 : null;

               // Intervalo al siguiente
               let intervaloHTML = '';
               if (idx < proximos.length - 1) {
                 const sig = proximos[idx + 1];
                 const diffDias = Math.round((new Date(sig.fecha+'T00:00:00') - new Date(e.fecha+'T00:00:00')) / (1000*60*60*24));
                 intervaloHTML = `<p class="proximo-fecha" style="margin-top:4px;">🔜 ${diffDias}d hasta ${escHtml(sig.materias?.nombre||'')}</p>`;
               }

               return `
                 <div class="proximo-item">
                   <div class="proximo-countdown">
                     <div class="proximo-num" style="color:${dias<=7?'var(--red)':dias<=15?'var(--yellow)':'var(--text-primary)'}">
                       ${dias === 0 ? '0' : dias < 0 ? '—' : dias}
                     </div>
                     <div class="proximo-dias">días</div>
                   </div>
                   <div class="proximo-info">
                     <p class="proximo-materia">${escHtml(e.materias?.nombre||'')}</p>
                     <p class="proximo-tipo">${{parcial:'Parcial',final:'Final',recuperatorio:'Recuperatorio'}[e.tipo]||e.tipo}</p>
                     <p class="proximo-fecha">${formatFecha(e.fecha)}</p>
                     ${intervaloHTML}
                     ${pct !== null ? `
                       <div class="progress-bar-wrap" style="margin-top:6px;">
                         <div class="progress-bar-fill" style="width:${pct}%;height:4px;"></div>
                       </div>
                     ` : ''}
                   </div>
                   <span class="card-badge ${badge.clase}">${dias===0?'¡Hoy!':dias<0?'Pasado':dias+'d'}</span>
                 </div>`;
             }).join('')}
           </div>`
        : `<div class="card" style="text-align:center;padding:24px;">
             <p style="font-size:0.875rem;color:var(--text-muted);">No hay exámenes próximos cargados.</p>
             <button class="btn-primary btn-sm" style="margin-top:12px;" onclick="navegarA('examenes')">+ Agregar examen</button>
           </div>`
      }
    </div>
  `;
}

// ── Calendario ──
let _calMes = new Date().getMonth();
let _calAnio = new Date().getFullYear();

function renderCalendario() {
  const el = document.getElementById('calendario-content');
  const examenes = getExamenes();

  // Mapear fechas de exámenes
  const fechasExamenes = {};
  examenes.forEach(e => {
    if (!fechasExamenes[e.fecha]) fechasExamenes[e.fecha] = [];
    fechasExamenes[e.fecha].push(e);
  });

  const hoy = new Date();
  const primerDia = new Date(_calAnio, _calMes, 1);
  const ultimoDia = new Date(_calAnio, _calMes + 1, 0);
  const iniciaSemana = primerDia.getDay(); // 0=dom
  const totalDias = ultimoDia.getDate();

  // Días del mes anterior para rellenar
  const diasAnteriores = iniciaSemana;

  let celdas = '';

  // Encabezados
  celdas += DIAS_SHORT.map(d => `<div class="cal-day-name">${d}</div>`).join('');

  // Días del mes anterior (relleno)
  const mesAnterior = new Date(_calAnio, _calMes, 0);
  for (let i = diasAnteriores - 1; i >= 0; i--) {
    celdas += `<div class="cal-day other-month">${mesAnterior.getDate() - i}</div>`;
  }

  // Días del mes actual
  for (let d = 1; d <= totalDias; d++) {
    const fechaStr = `${_calAnio}-${String(_calMes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const esHoy = d === hoy.getDate() && _calMes === hoy.getMonth() && _calAnio === hoy.getFullYear();
    const examenesDia = fechasExamenes[fechaStr] || [];
    const tieneExamen = examenesDia.length > 0;
    const urgente = examenesDia.some(e => diasHasta(e.fecha) <= 7);

    celdas += `
      <div class="cal-day ${esHoy ? 'today' : ''} ${tieneExamen ? 'has-event' : ''} ${urgente ? 'urgent' : ''}"
           ${tieneExamen ? `onclick="mostrarExamenesDia('${fechaStr}')" style="cursor:pointer;"` : ''}>
        ${d}
      </div>`;
  }

  // Relleno del mes siguiente
  const celdasRestantes = 42 - diasAnteriores - totalDias;
  for (let d = 1; d <= celdasRestantes; d++) {
    celdas += `<div class="cal-day other-month">${d}</div>`;
  }

  // Armar lista de exámenes del mes
  const examenesDelMes = getExamenes().filter(e => {
    const f = new Date(e.fecha + 'T00:00:00');
    return f.getMonth() === _calMes && f.getFullYear() === _calAnio;
  }).sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

  el.innerHTML = `
    <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;">

      <!-- Calendario compacto -->
      <div class="cal-wrapper">
        <div class="cal-header">
          <h3 class="cal-title">${MESES_ES[_calMes]} ${_calAnio}</h3>
          <div class="cal-nav">
            <button onclick="cambiarMes(-1)">‹</button>
            <button onclick="cambiarMes(1)">›</button>
          </div>
        </div>
        <div class="cal-grid">${celdas}</div>
        <div class="cal-legend">
          <div class="cal-legend-item">
            <div class="cal-legend-dot" style="background:var(--accent)"></div>
            <span>Examen</span>
          </div>
          <div class="cal-legend-item">
            <div class="cal-legend-dot" style="background:var(--red)"></div>
            <span>Urgente (≤7 días)</span>
          </div>
        </div>
      </div>

      <!-- Lista de exámenes del mes -->
      <div style="flex:1;min-width:220px;">
        <p class="section-title" style="margin-bottom:12px;">Exámenes en ${MESES_ES[_calMes]}</p>
        ${examenesDelMes.length
          ? examenesDelMes.map(e => {
              const dias = diasHasta(e.fecha);
              const badge = urgenciaBadge(dias);
              return `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;background:var(--bg);">
                  <span style="width:10px;height:10px;border-radius:50%;background:${e.materias?.color||'#4f46e5'};flex-shrink:0;display:inline-block;"></span>
                  <div style="flex:1;min-width:0;">
                    <p style="font-size:0.88rem;font-weight:600;">${escHtml(e.materias?.nombre||'')}</p>
                    <p style="font-size:0.75rem;color:var(--text-muted);font-family:'DM Mono',monospace;">${formatFecha(e.fecha)} · ${{parcial:'Parcial',final:'Final',recuperatorio:'Recup.'}[e.tipo]||e.tipo}</p>
                  </div>
                  <span class="card-badge ${badge.clase}">${dias===0?'¡Hoy!':dias<0?'Pasado':dias+'d'}</span>
                </div>`;
            }).join('')
          : `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.875rem;border:1.5px dashed var(--border);border-radius:var(--radius-md);">
               Sin exámenes este mes
             </div>`
        }
      </div>

    </div>
  `;
}

function cambiarMes(dir) {
  _calMes += dir;
  if (_calMes > 11) { _calMes = 0; _calAnio++; }
  if (_calMes < 0)  { _calMes = 11; _calAnio--; }
  renderCalendario();
}

function mostrarExamenesDia(fechaStr) {
  const examenes = getExamenes().filter(e => e.fecha === fechaStr);
  const html = `
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${examenes.map(e => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-soft);border-radius:var(--radius-sm);">
          <span style="width:10px;height:10px;border-radius:50%;background:${e.materias?.color||'#4f46e5'};flex-shrink:0;display:inline-block;"></span>
          <div>
            <p style="font-weight:600;font-size:0.9rem;">${escHtml(e.materias?.nombre||'')}</p>
            <p style="font-size:0.78rem;color:var(--text-muted);">${{parcial:'Parcial',final:'Final',recuperatorio:'Recuperatorio'}[e.tipo]||e.tipo}</p>
          </div>
        </div>`).join('')}
    </div>
    <div class="modal-actions"><button class="btn-secondary" onclick="closeModal()">Cerrar</button></div>
  `;
  openModal(`Exámenes — ${formatFecha(fechaStr)}`, html);
}