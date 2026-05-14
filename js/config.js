// ============================================
// config.js — Cliente Supabase + utilidades globales
// ============================================

const SUPABASE_URL = 'https://umdiolnjxdjmmfvzommg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtZGlvbG5qeGRqbW1mdnpvbW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTc4MzYsImV4cCI6MjA5NDI5MzgzNn0.qDSH_K5rMG_CviuYqLC8d6F_FyjuzKLYBavvux5Uh6Q';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Colores disponibles para materias ──
const COLORES_MATERIAS = [
  '#4f46e5', // índigo
  '#0ea5e9', // celeste
  '#10b981', // verde
  '#f59e0b', // amarillo
  '#ef4444', // rojo
  '#ec4899', // rosa
  '#8b5cf6', // violeta
  '#f97316', // naranja
  '#14b8a6', // teal
  '#6366f1', // lavanda
];

// ── Toast global ──
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 2800);
}

// ── Modal global ──
function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-backdrop').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
}

// ── Formateo de fechas ──
function formatFecha(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function diasHasta(dateStr) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((fecha - hoy) / (1000 * 60 * 60 * 24));
  return diff;
}

function urgenciaBadge(dias) {
  if (dias < 0)  return { clase: 'badge-accent', texto: 'Pasado' };
  if (dias === 0) return { clase: 'badge-red',    texto: '¡Hoy!' };
  if (dias <= 7)  return { clase: 'badge-red',    texto: `${dias}d` };
  if (dias <= 15) return { clase: 'badge-yellow', texto: `${dias}d` };
  return               { clase: 'badge-green',  texto: `${dias}d` };
}

// ── Día de semana actual en español ──
const DIAS_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DIAS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function diaHoyES() {
  return DIAS_ES[new Date().getDay()];
}

// ── Render de color picker ──
function renderColorPicker(selectedColor = COLORES_MATERIAS[0]) {
  return `
    <div class="color-picker" id="color-picker">
      ${COLORES_MATERIAS.map(c => `
        <div class="color-option ${c === selectedColor ? 'selected' : ''}"
             style="background:${c}"
             data-color="${c}"
             onclick="selectColor(this)"></div>
      `).join('')}
    </div>
    <input type="hidden" id="selected-color" value="${selectedColor}" />
  `;
}

function selectColor(el) {
  document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('selected-color').value = el.dataset.color;
}