// ===== FECHA DE HOY =====
const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const hoy = new Date();
document.getElementById('fechaHoy').textContent =
  `${DIAS[hoy.getDay()]}, ${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`;


// ===== SISTEMA DE PESTAÑAS =====
const tabs  = document.querySelectorAll('.tab');
const pages = document.querySelectorAll('.page');

function showTab(tabId) {
  tabs.forEach(t  => t.classList.toggle('active',  t.dataset.tab === tabId));
  pages.forEach(p => p.classList.toggle('active',  p.id === `page-${tabId}`));
  // Animar barras de progreso al entrar en materias/proyectos
  if (tabId === 'materias' || tabId === 'proyectos') animateProgressBars();
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => showTab(tab.dataset.tab));
});

// Botones acceso rápido del inicio
document.querySelectorAll('.qnav-btn').forEach(btn => {
  btn.addEventListener('click', () => showTab(btn.dataset.goto));
});


// ===== TAREAS — CHECKBOXES =====
let doneCount = 0;
const doneList  = document.getElementById('doneList');
const doneCountEl = document.getElementById('doneCount');

// Limpia el mensaje inicial si es necesario
function refreshDoneList() {
  const noMsg = doneList.querySelector('.no-tasks-msg');
  if (doneCount > 0 && noMsg) noMsg.remove();
  if (doneCount === 0 && !doneList.querySelector('.no-tasks-msg')) {
    const li = document.createElement('li');
    li.className = 'no-tasks-msg';
    li.innerHTML = '<i class="fas fa-inbox"></i> Nada completado aún';
    doneList.appendChild(li);
  }
  doneCountEl.textContent = doneCount;
}

document.querySelectorAll('.task-check input[type=checkbox]').forEach(cb => {
  cb.addEventListener('change', function () {
    const item = this.closest('.task-item');
    if (this.checked) {
      // Mover a columna "Completadas" después de una pequeña animación
      item.classList.add('done-task');
      setTimeout(() => {
        const clone = item.cloneNode(true);
        clone.classList.remove('urgent');
        // Re-enlazar el nuevo checkbox
        const newCb = clone.querySelector('input[type=checkbox]');
        const newId = 'done-' + this.id;
        newCb.id = newId;
        newCb.checked = true;
        clone.querySelector('label').setAttribute('for', newId);
        newCb.addEventListener('change', function() {
          clone.remove();
          doneCount--;
          refreshDoneList();
        });
        doneList.appendChild(clone);
        item.remove();
        doneCount++;
        refreshDoneList();
      }, 300);
    }
  });
});


// ===== CALENDARIO MINI =====
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let calYear = 2026, calMonth = 3; // Abril 2026

// Array central de eventos del calendario
const eventsData   = []; // tareas: { nombre, materia, vence, url, completada }
const examenesData = []; // exámenes: { materia, tema, vence, url }

// Devuelve el color CSS de la materia desde la grilla (o rojo por defecto)
function getMateriaColor(nombreMateria) {
  for (const card of document.querySelectorAll('#materiasGrid .mat-card')) {
    if (card.querySelector('h3').textContent === nombreMateria)
      return card.style.getPropertyValue('--c') || '#e74c3c';
  }
  return '#e74c3c';
}

function buildCalendar(year, month) {
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  const todayDate = new Date();
  const isThisMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month;
  const todayDay   = isThisMonth ? todayDate.getDate() : -1;

  // Header
  const header = document.createElement('div');
  header.className = 'cal-header-row';
  header.innerHTML = `
    <button id="calPrev"><i class="fas fa-chevron-left"></i></button>
    <span>${MONTH_NAMES[month]} ${year}</span>
    <button id="calNext"><i class="fas fa-chevron-right"></i></button>
  `;
  grid.appendChild(header);

  // Días de la semana
  const wd = document.createElement('div');
  wd.className = 'cal-weekdays';
  ['Do','Lu','Ma','Mi','Ju','Vi','Sa'].forEach(d => {
    const el = document.createElement('div'); el.textContent = d; wd.appendChild(el);
  });
  grid.appendChild(wd);

  // Días del mes
  const days = document.createElement('div');
  days.className = 'cal-days';
  const firstDay   = new Date(year, month, 1).getDay();
  const totalDays  = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div'); el.className = 'cal-day empty'; days.appendChild(el);
  }
  for (let d = 1; d <= totalDays; d++) {
    const el = document.createElement('div');
    el.className = 'cal-day';
    el.textContent = d;
    if (d === todayDay) el.classList.add('today');
    if (isThisMonth && d < todayDay) el.classList.add('past');
    // Marcar días con eventos o exámenes
    const tieneEvento = eventsData.some(e =>
      e.vence.getDate() === d && e.vence.getMonth() === month && e.vence.getFullYear() === year
    ) || examenesData.some(e =>
      e.vence.getDate() === d && e.vence.getMonth() === month && e.vence.getFullYear() === year
    );
    if (tieneEvento) el.classList.add('has-event');
    days.appendChild(el);
  }
  grid.appendChild(days);

  document.getElementById('calPrev').addEventListener('click', () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
    buildCalendar(calYear, calMonth);
  });
  document.getElementById('calNext').addEventListener('click', () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
    buildCalendar(calYear, calMonth);
  });
}

// ===== FUNCIONES DEL PANEL DE PRÓXIMOS EVENTOS =====

function actualizarEventosList() {
  const eventsList = document.querySelector('.events-list');
  eventsList.innerHTML = '';

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  const tareas = eventsData
    .filter(e => !e.completada && e.vence >= hoy)
    .map(e => ({ ...e, _tipo: 'tarea' }));

  const examenes = examenesData
    .filter(e => e.vence >= hoy)
    .map(e => ({ ...e, _tipo: 'examen' }));

  const todos = [...tareas, ...examenes].sort((a, b) => a.vence - b.vence);

  if (todos.length === 0) {
    eventsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-check"></i>
        <p>No hay eventos próximos agendados</p>
      </div>`;
    return;
  }

  todos.forEach(item => {
    const day       = item.vence.getDate();
    const monthName = MONTH_NAMES[item.vence.getMonth()].slice(0, 3);
    const ev = document.createElement('div');
    ev.className = 'ev';
    if (item._tipo === 'tarea') {
      ev.innerHTML = `
        <div class="ev-date task-date">
          <span class="ev-day">${day}</span>
          <span class="ev-month">${monthName}</span>
        </div>
        <div class="ev-info">
          <h4>${taskLink(item.nombre, item.url)}</h4>
          <p><i class="fas fa-book"></i> ${escHtml(item.materia)}</p>
        </div>
        <span class="ev-pill task-pill">Tarea</span>`;
    } else {
      const primerLink = item.links && item.links[0];
      ev.innerHTML = `
        <div class="ev-date exam-date">
          <span class="ev-day">${day}</span>
          <span class="ev-month">${monthName}</span>
        </div>
        <div class="ev-info">
          <h4>${primerLink ? taskLink(item.tema, primerLink.url) : escHtml(item.tema)}</h4>
          <p><i class="fas fa-book"></i> ${escHtml(item.materia)}</p>
        </div>
        <span class="ev-pill exam-pill">Examen</span>`;
    }
    eventsList.appendChild(ev);
  });
}


// ===== STATS E INICIO =====
function actualizarStats() {
  const numMaterias = document.querySelectorAll('#materiasGrid .mat-card').length;
  document.getElementById('statMaterias').textContent = numMaterias;

  const pendientes = document.querySelectorAll(
    '.tareas-cols .tareas-col:nth-child(1) .task-list .task-item:not(.done-task), ' +
    '.tareas-cols .tareas-col:nth-child(2) .task-list .task-item:not(.done-task)'
  ).length;
  document.getElementById('statTareasPend').textContent = pendientes;

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const proximosExamenes = examenesData.filter(e => e.vence >= hoy).length;
  document.getElementById('statExamenes').textContent = proximosExamenes;
}

function actualizarActividadesSemana() {
  const container = document.getElementById('actividadesSemana');
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const en7 = new Date(hoy); en7.setDate(en7.getDate() + 7);

  const tareas = eventsData
    .filter(e => !e.completada && e.vence >= hoy && e.vence <= en7)
    .map(e => ({ titulo: e.nombre, materia: e.materia, vence: e.vence, url: e.url, _tipo: 'tarea' }));

  const examenes = examenesData
    .filter(e => e.vence >= hoy && e.vence <= en7)
    .map(e => ({ titulo: e.tema, materia: e.materia, vence: e.vence, url: e.url, _tipo: 'examen' }));

  const proximas = [...tareas, ...examenes].sort((a, b) => a.vence - b.vence);

  if (proximas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-check"></i>
        <p>No hay actividades agendadas para esta semana</p>
      </div>`;
    return;
  }

  container.innerHTML = '<div class="inicio-actividades"></div>';
  const grid = container.querySelector('.inicio-actividades');

  proximas.forEach(({ titulo, materia, vence, url, links, _tipo }) => {
    url = url || (links && links[0] && links[0].url) || '';
    const diff    = Math.round((vence - hoy) / 86400000);
    const dot     = diff <= 2 ? 'red' : 'orange';
    const when    = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : `En ${diff} días`;
    const isExam  = _tipo === 'examen';
    const statCls = diff <= 2 ? 'exam-st' : 'upcoming';
    const statLbl = isExam ? 'Examen' : (diff <= 2 ? 'Urgente' : 'Esta semana');
    const item = document.createElement('div');
    item.className = 'act-item';
    item.innerHTML = `
      <div class="act-dot ${dot}"></div>
      <div class="act-body">
        <strong>${taskLink(titulo, url)}</strong>
        <span><i class="fas fa-book"></i> ${escHtml(materia)} &nbsp;·&nbsp; ${when}</span>
      </div>
      <span class="act-status ${statCls}">${statLbl}</span>`;
    grid.appendChild(item);
  });
}

// ===== APUNTES =====
function construirApuntes() {
  const container = document.getElementById('apuntesContainer');
  container.innerHTML = '';

  if (materias.length === 0) {
    container.innerHTML = `
      <div class="apuntes-empty" id="apuntesEmpty">
        <i class="fas fa-sticky-note"></i>
        <p>Agregá materias para empezar a organizar tus apuntes</p>
      </div>`;
    return;
  }

  materias.forEach(({ nombre, card }) => {
    const color = card.style.getPropertyValue('--c') || 'var(--accent)';
    const row = document.createElement('div');
    row.className = 'apunte-row';
    row.style.setProperty('--c', color);
    row.dataset.materia = nombre;
    row.innerHTML = `
      <div class="apunte-row-header">
        <div class="apunte-row-icon"><i class="fas fa-book"></i></div>
        <h3 class="apunte-row-title">${escHtml(nombre)}</h3>
        <span class="apunte-row-badge">0 apuntes</span>
        <i class="fas fa-chevron-right apunte-row-chevron"></i>
      </div>
      <div class="apunte-row-body">
        <div class="apunte-body-empty">
          <i class="fas fa-sticky-note"></i> Sin apuntes aún para esta materia
        </div>
      </div>`;

    row.querySelector('.apunte-row-header').addEventListener('click', () => {
      row.classList.toggle('open');
    });

    container.appendChild(row);
  });
}

// ===== ANIMAR BARRAS DE PROGRESO =====
function animateProgressBars() {
  document.querySelectorAll('.mat-progress-bar, .proy-fill').forEach(bar => {
    if (bar.dataset.animated) return;
    const target = bar.style.width;
    bar.style.width = '0';
    bar.dataset.animated = '1';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { bar.style.width = target; });
    });
  });
}


// ===== ARRAY CENTRAL DE MATERIAS =====
let materias = [];   // { nombre, card }

// ===== CONTEXT MENU MATERIAS =====
const ctxMenu   = document.getElementById('ctxMenu');
let ctxTarget   = null;   // card sobre la que se hizo clic derecho

function openCtx(e, card) {
  e.preventDefault();
  ctxTarget = card;
  // Posicionar
  const x = Math.min(e.clientX, window.innerWidth  - 210);
  const y = Math.min(e.clientY, window.innerHeight - 100);
  ctxMenu.style.left = x + 'px';
  ctxMenu.style.top  = y + 'px';
  ctxMenu.classList.add('open');
}
function closeCtx() { ctxMenu.classList.remove('open'); }

document.addEventListener('click',       closeCtx);
document.addEventListener('contextmenu', e => { if (!e.target.closest('.mat-card')) closeCtx(); });
document.addEventListener('keydown',     e => { if (e.key === 'Escape') closeCtx(); });

// Eliminar materia
document.getElementById('ctxDelete').addEventListener('click', () => {
  if (!ctxTarget) return;
  materias = materias.filter(m => m.card !== ctxTarget);
  ctxTarget.remove();
  ctxTarget = null;
  closeCtx();
  guardarMateriaEnStorage();
  actualizarStats();
  construirApuntes();
});

// Modificar nombre
const modalRename  = document.getElementById('modalRename');
const inputRename  = document.getElementById('inputRename');

function openRename() {
  if (!ctxTarget) return;
  inputRename.value = ctxTarget.querySelector('h3').textContent;
  modalRename.classList.add('open');
  setTimeout(() => { inputRename.focus(); inputRename.select(); }, 120);
  closeCtx();
}
function closeRename() { modalRename.classList.remove('open'); inputRename.value = ''; }

document.getElementById('ctxRename').addEventListener('click',  openRename);
document.getElementById('renameClose').addEventListener('click', closeRename);
document.getElementById('renameCancel').addEventListener('click', closeRename);
modalRename.addEventListener('click', e => { if (e.target === modalRename) closeRename(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeRename(); });

document.getElementById('renameConfirm').addEventListener('click', guardarNombre);
inputRename.addEventListener('keydown', e => { if (e.key === 'Enter') guardarNombre(); });

function guardarNombre() {
  const nombre = inputRename.value.trim();
  if (!nombre || !ctxTarget) { inputRename.focus(); return; }
  ctxTarget.querySelector('h3').textContent = nombre;
  const entry = materias.find(m => m.card === ctxTarget);
  if (entry) entry.nombre = nombre;
  closeRename();
  ctxTarget = null;
  guardarMateriaEnStorage();
  construirApuntes();
}

// ===== MODAL AGREGAR MATERIA =====
const modalOverlay  = document.getElementById('modalMateria');
const inputMateria  = document.getElementById('inputMateria');
const materiasGrid  = document.getElementById('materiasGrid');

function openModal() {
  modalOverlay.classList.add('open');
  setTimeout(() => inputMateria.focus(), 120);
}
function closeModal() {
  modalOverlay.classList.remove('open');
  inputMateria.value = '';
}

document.getElementById('btnAgregarMateria').addEventListener('click', openModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

const MAT_COLORS = ['#6c63ff','#e74c3c','#27ae60','#e67e22','#2980b9','#16a085','#8e44ad','#d35400'];
let matColorIdx = 0;

// ===== PERSISTENCIA DE MATERIAS (localStorage) =====
function guardarMateriaEnStorage() {
  const nombres = [];
  document.querySelectorAll('#materiasGrid .mat-card h3').forEach(h3 => {
    nombres.push(h3.textContent);
  });
  localStorage.setItem('materias', JSON.stringify(nombres));
}

function crearCardMateria(nombre) {
  const emptyEl = document.getElementById('materiasEmpty');
  if (emptyEl) emptyEl.remove();

  const color = MAT_COLORS[matColorIdx % MAT_COLORS.length];
  matColorIdx++;

  const card = document.createElement('div');
  card.className = 'mat-card';
  card.style.setProperty('--c', color);
  card.innerHTML = `
    <div class="mat-top">
      <div class="mat-icon"><i class="fas fa-book"></i></div>
      <span class="mat-badge ok">Al día</span>
    </div>
    <h3>${escHtml(nombre)}</h3>
    <p class="mat-prof"><i class="fas fa-user-tie"></i> —</p>
    <div class="mat-progress">
      <div class="mat-progress-bar" style="width:0%"></div>
    </div>
    <div class="mat-progress-label"><span>Avance del cuatrimestre</span><span>0%</span></div>
  `;
  card.addEventListener('contextmenu', e => openCtx(e, card));
  card.addEventListener('click', () => abrirDetalleMateria(card));
  materiasGrid.appendChild(card);
  materias.push({ nombre, card });
  actualizarStats();
  construirApuntes();
  return card;
}

// Restaurar materias guardadas al cargar la página
(function restaurarMaterias() {
  const guardadas = JSON.parse(localStorage.getItem('materias') || '[]');
  guardadas.forEach(nombre => crearCardMateria(nombre));
})();

document.getElementById('modalConfirm').addEventListener('click', agregarMateria);
inputMateria.addEventListener('keydown', e => { if (e.key === 'Enter') agregarMateria(); });

function agregarMateria() {
  const nombre = inputMateria.value.trim();
  if (!nombre) { inputMateria.focus(); return; }

  crearCardMateria(nombre);
  guardarMateriaEnStorage();
  closeModal();
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Devuelve el nombre como link si hay URL válida, o texto plano si no
function taskLink(nombre, url) {
  if (!url) return escHtml(nombre);
  let safe = '';
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') safe = url;
  } catch {}
  if (!safe) return escHtml(nombre);
  return `<a href="${escHtml(safe)}" target="_blank" rel="noopener noreferrer" class="task-link">${escHtml(nombre)}</a>`;
}

// ===== DETALLE DE MATERIA =====
const modalDetalle = document.getElementById('modalDetalleMateria');
let materiaDetalleActual = null; // card actualmente abierta en el detalle

function abrirDetalleMateria(card) {
  materiaDetalleActual = card;
  const nombre = card.querySelector('h3').textContent;
  const hoy    = new Date(); hoy.setHours(0, 0, 0, 0);

  const todasLasTareas = eventsData.filter(e => e.materia === nombre);
  const pendientes     = todasLasTareas.filter(e => !e.completada);
  const entregadasArr  = todasLasTareas.filter(e => e.completada);

  document.querySelector('#detalleMateriaTitle span').textContent = nombre;

  let html = `
    <div class="detalle-stats">
      <div class="detalle-stat">
        <span class="detalle-stat-num" style="color:var(--red)">${pendientes.length}</span>
        <span class="detalle-stat-lbl">Pendientes</span>
      </div>
      <div class="detalle-stat">
        <span class="detalle-stat-num" style="color:var(--green)">${entregadasArr.length}</span>
        <span class="detalle-stat-lbl">Entregadas</span>
      </div>
      <div class="detalle-stat">
        <span class="detalle-stat-num">${todasLasTareas.length}</span>
        <span class="detalle-stat-lbl">Total tareas</span>
      </div>
    </div>`;

  // Pendientes
  if (pendientes.length > 0) {
    html += `<div class="detalle-section-title"><i class="fas fa-tasks"></i> &nbsp;Tareas pendientes</div>
    <ul class="detalle-tareas-list">`;
    pendientes.sort((a, b) => a.vence - b.vence).forEach(({ nombre: nt, vence, url }) => {
      const diff = Math.round((vence - hoy) / 86400000);
      const cuando = diff === 0 ? 'Vence hoy' : diff === 1 ? 'Vence mañana'
        : diff <= 7 ? `En ${diff} días`
        : `Vence el ${vence.toLocaleDateString('es-AR', { day:'numeric', month:'long' })}`;
      const dot = diff <= 2 ? 'red' : diff <= 7 ? 'orange' : 'yellow';
      html += `
        <li class="detalle-tarea-item">
          <span class="priority-dot ${dot}"></span>
          <div>
            <strong>${taskLink(nt, url)}</strong>
            <span class="detalle-tarea-fecha"><i class="fas fa-clock"></i> ${cuando}</span>
          </div>
        </li>`;
    });
    html += `</ul>`;
  } else {
    html += `<div class="detalle-empty"><i class="fas fa-check-circle"></i> ¡Al día! Sin tareas pendientes.</div>`;
  }

  // Entregadas
  if (entregadasArr.length > 0) {
    html += `<div class="detalle-section-title" style="margin-top:1.2rem"><i class="fas fa-check-double"></i> &nbsp;Entregadas</div>
    <ul class="detalle-tareas-list">`;
    entregadasArr.forEach(({ nombre: nt, vence, url }) => {
      const fechaStr = vence.toLocaleDateString('es-AR', { day:'numeric', month:'long' });
      html += `
        <li class="detalle-tarea-item detalle-tarea-done">
          <span class="priority-dot" style="background:var(--green)"></span>
          <div>
            <strong>${taskLink(nt, url)}</strong>
            <span class="detalle-tarea-fecha"><i class="fas fa-check"></i> Entregada · ${fechaStr}</span>
          </div>
        </li>`;
    });
    html += `</ul>`;
  }

  document.getElementById('detalleMateriaBody').innerHTML = html;
  modalDetalle.classList.add('open');
}

function refrescarDetalleMateria() {
  if (materiaDetalleActual && modalDetalle.classList.contains('open')) {
    abrirDetalleMateria(materiaDetalleActual);
  }
}

function cerrarDetalleMateria() {
  modalDetalle.classList.remove('open');
  materiaDetalleActual = null;
}
document.getElementById('detalleClose').addEventListener('click',  cerrarDetalleMateria);
document.getElementById('detalleCerrar').addEventListener('click', cerrarDetalleMateria);
modalDetalle.addEventListener('click', e => { if (e.target === modalDetalle) cerrarDetalleMateria(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarDetalleMateria(); });

// ===== MODAL NUEVA TAREA =====
const modalTarea   = document.getElementById('modalTarea');
const tareaNombre  = document.getElementById('tareaNombre');
const tareaMateria = document.getElementById('tareaMateria');
const tareaFecha   = document.getElementById('tareaFecha');
const tareaUrl     = document.getElementById('tareaUrl');

// Columnas de tareas
const colUrgentes  = document.querySelector('.tareas-cols .tareas-col:nth-child(1) .task-list');
const colSemana    = document.querySelector('.tareas-cols .tareas-col:nth-child(2) .task-list');
const colCountUrgentes = document.querySelector('.col-head.urgent-head .col-count');
const colCountSemana   = document.querySelector('.col-head.week-head .col-count');

function openModalTarea() {
  // Poblar select con las materias actuales
  tareaMateria.innerHTML = '<option value="" disabled selected>Seleccioná una materia...</option>';
  document.querySelectorAll('#materiasGrid .mat-card h3').forEach(h3 => {
    const opt = document.createElement('option');
    opt.value       = h3.textContent;
    opt.textContent = h3.textContent;
    tareaMateria.appendChild(opt);
  });
  // Fecha mínima = hoy
  tareaFecha.min   = new Date().toISOString().split('T')[0];
  tareaFecha.value = '';
  tareaNombre.value = '';
  tareaUrl.value = '';
  modalTarea.classList.add('open');
  setTimeout(() => tareaNombre.focus(), 120);
}
function closeModalTarea() {
  modalTarea.classList.remove('open');
}

document.getElementById('btnNuevaTarea').addEventListener('click', openModalTarea);
document.getElementById('tareaClose').addEventListener('click',   closeModalTarea);
document.getElementById('tareaCancel').addEventListener('click',  closeModalTarea);
modalTarea.addEventListener('click', e => { if (e.target === modalTarea) closeModalTarea(); });

document.getElementById('tareaConfirm').addEventListener('click', crearTarea);
tareaNombre.addEventListener('keydown', e => { if (e.key === 'Enter') crearTarea(); });

let tareaIdCounter = 100;

function crearTarea() {
  const nombre  = tareaNombre.value.trim();
  const materia = tareaMateria.value;
  const fecha   = tareaFecha.value;

  const rawUrl = tareaUrl.value.trim();
  let url = '';
  if (rawUrl) {
    try {
      const u = new URL(rawUrl);
      if (u.protocol === 'http:' || u.protocol === 'https:') url = rawUrl;
    } catch {}
  }

  if (!nombre)  { tareaNombre.focus();  return; }
  if (!materia) { tareaMateria.focus(); return; }
  if (!fecha)   { tareaFecha.focus();   return; }

  const hoy      = new Date(); hoy.setHours(0,0,0,0);
  const vence    = new Date(fecha + 'T00:00:00');
  const diffDias = Math.round((vence - hoy) / 86400000);

  let venceTexto;
  if      (diffDias === 0) venceTexto = 'Vence hoy';
  else if (diffDias === 1) venceTexto = 'Vence mañana';
  else if (diffDias <= 7)  venceTexto = `Vence en ${diffDias} días`;
  else {
    const d = vence.toLocaleDateString('es-AR', { day:'numeric', month:'long' });
    venceTexto = `Vence el ${d}`;
  }

  const esUrgente = diffDias <= 2;
  const lista     = esUrgente ? colUrgentes : colSemana;
  const dotColor  = diffDias <= 2 ? 'red' : diffDias <= 7 ? 'orange' : 'yellow';

  // Objeto de tarea compartido — permite actualizar estado desde cualquier lugar
  const taskEntry = { nombre, materia, vence, url, completada: false };

  const noMsg = lista.querySelector('.no-tasks-msg');
  if (noMsg) noMsg.remove();

  const id = 't' + tareaIdCounter++;
  const li = document.createElement('li');
  li.className = 'task-item' + (esUrgente ? ' urgent' : '');
  li.id = 'tarea-' + id;
  li.innerHTML = `
    <div class="task-check">
      <input type="checkbox" id="${id}"/>
      <label for="${id}"></label>
    </div>
    <div class="task-body">
      <h4>${taskLink(nombre, url)}</h4>
      <p><i class="fas fa-book"></i> ${escHtml(materia)} &nbsp;·&nbsp; <i class="fas fa-clock"></i> ${venceTexto}</p>
    </div>
    <span class="priority-dot ${dotColor}"></span>
  `;

  li.querySelector('input[type=checkbox]').addEventListener('change', function() {
    if (this.checked) {
      // ── Marcar como completada ──
      li.classList.add('done-task');
      setTimeout(() => {
        li.remove();
        if (!lista.querySelector('.task-item')) {
          const msg = document.createElement('li');
          msg.className = 'no-tasks-msg';
          msg.innerHTML = esUrgente
            ? '<i class="fas fa-check"></i> Sin urgentes'
            : '<i class="fas fa-check"></i> Sin tareas esta semana';
          lista.appendChild(msg);
        }
        const doneMsg = doneList.querySelector('.no-tasks-msg');
        if (doneMsg) doneMsg.remove();
        doneList.appendChild(li);
        doneCount++;
        doneCountEl.textContent = doneCount;
        taskEntry.completada = true;
        actualizarCounts();
        refrescarDetalleMateria();
      }, 280);
    } else {
      // ── Desmarcar → volver a la columna original ──
      li.classList.remove('done-task');
      setTimeout(() => {
        li.remove();
        const noMsgDest = lista.querySelector('.no-tasks-msg');
        if (noMsgDest) noMsgDest.remove();
        lista.appendChild(li);
        doneCount--;
        doneCountEl.textContent = doneCount;
        if (!doneList.querySelector('.task-item')) {
          const msg = document.createElement('li');
          msg.className = 'no-tasks-msg';
          msg.innerHTML = '<i class="fas fa-inbox"></i> Nada completado aún';
          doneList.appendChild(msg);
        }
        taskEntry.completada = false;
        actualizarCounts();
        refrescarDetalleMateria();
      }, 280);
    }
  });

  lista.appendChild(li);
  eventsData.push(taskEntry);
  actualizarEventosList();
  actualizarActividadesSemana();
  buildCalendar(calYear, calMonth);
  actualizarCounts();
  closeModalTarea();
}

function actualizarCounts() {
  colCountUrgentes.textContent = colUrgentes.querySelectorAll('.task-item:not(.done-task)').length;
  colCountSemana.textContent   = colSemana.querySelectorAll('.task-item:not(.done-task)').length;
  actualizarStats();
}

// ===== EXÁMENES =====
const modalExamen      = document.getElementById('modalExamen');
const examenMateria    = document.getElementById('examenMateria');
const examenTema       = document.getElementById('examenTema');
const examenFecha      = document.getElementById('examenFecha');
const examenUrl        = document.getElementById('examenUrl');
const examenNombreLink = document.getElementById('examenNombreLink');
const examenesGrid     = document.getElementById('examenesGrid');

// ── Modal nuevo examen ──
function openModalExamen() {
  examenMateria.innerHTML = '<option value="" disabled selected>Seleccioná una materia...</option>';
  document.querySelectorAll('#materiasGrid .mat-card h3').forEach(h3 => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = h3.textContent;
    examenMateria.appendChild(opt);
  });
  examenFecha.min        = new Date().toISOString().split('T')[0];
  examenFecha.value      = '';
  examenTema.value       = '';
  examenUrl.value        = '';
  examenNombreLink.value = '';
  modalExamen.classList.add('open');
  setTimeout(() => examenMateria.focus(), 120);
}
function closeModalExamen() { modalExamen.classList.remove('open'); }

document.getElementById('btnNuevoExamen').addEventListener('click', openModalExamen);
document.getElementById('examenClose').addEventListener('click',   closeModalExamen);
document.getElementById('examenCancel').addEventListener('click',  closeModalExamen);
modalExamen.addEventListener('click', e => { if (e.target === modalExamen) closeModalExamen(); });
document.getElementById('examenConfirm').addEventListener('click', crearExamen);
examenTema.addEventListener('keydown', e => { if (e.key === 'Enter') crearExamen(); });

function safeUrl(raw) {
  try {
    const u = new URL(raw);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? raw : '';
  } catch { return ''; }
}

function buildExamenCard(entry) {
  const hoy     = new Date(); hoy.setHours(0, 0, 0, 0);
  const diff    = Math.round((entry.vence - hoy) / 86400000);
  const pillCls = diff <= 2 ? 'hoy' : diff <= 7 ? 'pronto' : 'lejos';
  const pillTxt = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana'
    : diff <= 7 ? `En ${diff} días`
    : entry.vence.toLocaleDateString('es-AR', { day:'numeric', month:'long' });
  const diasTxt = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana'
    : diff < 0 ? 'Pasado' : `En ${diff} días`;

  const card = document.createElement('div');
  card.className = 'examen-card';
  card.style.setProperty('--ec', getMateriaColor(entry.materia));
  card.innerHTML = `
    <div class="examen-top">
      <span class="examen-materia-badge">${escHtml(entry.materia)}</span>
      <span class="examen-urgencia-pill ${pillCls}">${pillTxt}</span>
    </div>
    <div class="examen-tema">${escHtml(entry.tema)}</div>
    <div class="examen-footer">
      <span class="examen-fecha"><i class="fas fa-calendar-alt"></i>
        ${entry.vence.toLocaleDateString('es-AR', { weekday:'short', day:'numeric', month:'long' })}
      </span>
      <span class="examen-dias">${diasTxt}</span>
    </div>`;

  card._entry = entry;
  actualizarLinksCountCard(card, entry);
  card.addEventListener('click',       () => abrirDetalleExamen(card));
  card.addEventListener('contextmenu', e  => openCtxExamen(e, card));
  return card;
}

function actualizarLinksCountCard(card, entry) {
  let el = card.querySelector('.examen-links-count');
  if (entry.links.length > 0) {
    if (!el) {
      el = document.createElement('div');
      el.className = 'examen-links-count';
      card.querySelector('.examen-footer').before(el);
    }
    const n = entry.links.length;
    el.innerHTML = `<i class="fas fa-link"></i> ${n} recurso${n > 1 ? 's' : ''}`;
  } else if (el) {
    el.remove();
  }
}

function crearExamen() {
  const materia = examenMateria.value;
  const tema    = examenTema.value.trim();
  const fecha   = examenFecha.value;

  if (!materia) { examenMateria.focus(); return; }
  if (!tema)    { examenTema.focus();    return; }
  if (!fecha)   { examenFecha.focus();   return; }

  const url    = safeUrl(examenUrl.value.trim());
  const nombre = examenNombreLink.value.trim();
  const vence  = new Date(fecha + 'T00:00:00');
  const entry  = { materia, tema, vence, links: [] };
  if (url) entry.links.push({ url, nombre: nombre || tema });

  examenesData.push(entry);

  const emptyEl = document.getElementById('examenesEmpty');
  if (emptyEl) emptyEl.remove();

  examenesGrid.appendChild(buildExamenCard(entry));
  actualizarEventosList();
  actualizarActividadesSemana();
  buildCalendar(calYear, calMonth);
  actualizarStats();
  closeModalExamen();
}

// ── Context menu examen ──
const ctxMenuExamen  = document.getElementById('ctxMenuExamen');
let   ctxExamenTarget = null;

function openCtxExamen(e, card) {
  e.preventDefault();
  ctxExamenTarget = card;
  const x = Math.min(e.clientX, window.innerWidth  - 220);
  const y = Math.min(e.clientY, window.innerHeight - 140);
  ctxMenuExamen.style.left = x + 'px';
  ctxMenuExamen.style.top  = y + 'px';
  ctxMenuExamen.classList.add('open');
}
function closeCtxExamen() { ctxMenuExamen.classList.remove('open'); }

document.addEventListener('click',       closeCtxExamen);
document.addEventListener('contextmenu', e => { if (!e.target.closest('.examen-card')) closeCtxExamen(); });

// Eliminar examen
document.getElementById('ctxExamenDelete').addEventListener('click', () => {
  if (!ctxExamenTarget) return;
  const idx = examenesData.indexOf(ctxExamenTarget._entry);
  if (idx > -1) examenesData.splice(idx, 1);
  ctxExamenTarget.remove();
  ctxExamenTarget = null;
  closeCtxExamen();
  if (!examenesGrid.querySelector('.examen-card')) {
    const msg = document.createElement('div');
    msg.className = 'empty-state'; msg.id = 'examenesEmpty';
    msg.innerHTML = '<i class="fas fa-file-alt"></i><p>No hay exámenes registrados</p>';
    examenesGrid.appendChild(msg);
  }
  actualizarEventosList(); actualizarActividadesSemana();
  buildCalendar(calYear, calMonth); actualizarStats();
});

// ── Renombrar examen ──
const modalExamenRename = document.getElementById('modalExamenRename');
const examenRenameInput = document.getElementById('examenRenameInput');

function openExamenRename() {
  if (!ctxExamenTarget) return;
  examenRenameInput.value = ctxExamenTarget._entry.tema;
  modalExamenRename.classList.add('open');
  setTimeout(() => { examenRenameInput.focus(); examenRenameInput.select(); }, 120);
  closeCtxExamen();
}
function closeExamenRename() { modalExamenRename.classList.remove('open'); }

document.getElementById('ctxExamenRename').addEventListener('click',      openExamenRename);
document.getElementById('examenRenameClose').addEventListener('click',    closeExamenRename);
document.getElementById('examenRenameCancel').addEventListener('click',   closeExamenRename);
modalExamenRename.addEventListener('click', e => { if (e.target === modalExamenRename) closeExamenRename(); });
document.getElementById('examenRenameConfirm').addEventListener('click',  guardarNombreExamen);
examenRenameInput.addEventListener('keydown', e => { if (e.key === 'Enter') guardarNombreExamen(); });

function guardarNombreExamen() {
  const nombre = examenRenameInput.value.trim();
  if (!nombre || !ctxExamenTarget) { examenRenameInput.focus(); return; }
  ctxExamenTarget._entry.tema = nombre;
  ctxExamenTarget.querySelector('.examen-tema').textContent = nombre;
  const prevTarget = ctxExamenTarget;
  ctxExamenTarget = null;
  closeExamenRename();
  refrescarDetalleExamen();
  actualizarEventosList();
}

// ── Agregar URL a examen ──
const modalExamenUrl  = document.getElementById('modalExamenUrl');
const examenUrlInput  = document.getElementById('examenUrlInput');
const examenUrlNombre = document.getElementById('examenUrlNombre');

function openExamenUrl() {
  if (!ctxExamenTarget) return;
  examenUrlInput.value  = '';
  examenUrlNombre.value = '';
  modalExamenUrl.classList.add('open');
  setTimeout(() => examenUrlInput.focus(), 120);
  closeCtxExamen();
}
function closeExamenUrl() { modalExamenUrl.classList.remove('open'); }

document.getElementById('ctxExamenAddUrl').addEventListener('click',   openExamenUrl);
document.getElementById('examenUrlClose').addEventListener('click',    closeExamenUrl);
document.getElementById('examenUrlCancel').addEventListener('click',   closeExamenUrl);
modalExamenUrl.addEventListener('click', e => { if (e.target === modalExamenUrl) closeExamenUrl(); });
document.getElementById('examenUrlConfirm').addEventListener('click',  agregarUrlExamen);
examenUrlNombre.addEventListener('keydown', e => { if (e.key === 'Enter') agregarUrlExamen(); });

function agregarUrlExamen() {
  const url    = safeUrl(examenUrlInput.value.trim());
  const nombre = examenUrlNombre.value.trim();
  if (!url) { examenUrlInput.focus(); return; }
  if (!ctxExamenTarget) return;
  const entry = ctxExamenTarget._entry;
  entry.links.push({ url, nombre: nombre || entry.tema });
  actualizarLinksCountCard(ctxExamenTarget, entry);
  const prevTarget = ctxExamenTarget;
  ctxExamenTarget = null;
  closeExamenUrl();
  refrescarDetalleExamen();
}

// ── Detalle examen (click izquierdo) ──
const modalDetalleExamen = document.getElementById('modalDetalleExamen');
let   examenDetalleActual = null;

function abrirDetalleExamen(card) {
  examenDetalleActual = card;
  const entry = card._entry;
  const color = card.style.getPropertyValue('--ec') || '#e74c3c';

  document.getElementById('detalleExamenTitleSpan').textContent = entry.materia;

  const hoy  = new Date(); hoy.setHours(0, 0, 0, 0);
  const diff = Math.round((entry.vence - hoy) / 86400000);
  const fechaLarga = entry.vence.toLocaleDateString('es-AR',
    { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const diasStr = diff > 1 ? ` · En ${diff} días` : diff === 1 ? ' · Mañana'
    : diff === 0 ? ' · ¡Hoy!' : ' · Ya pasó';

  let html = `
    <div class="examen-detalle-header" style="--ec:${escHtml(color)}">
      <div class="examen-detalle-materia">${escHtml(entry.materia)}</div>
      <div class="examen-detalle-tema">${escHtml(entry.tema)}</div>
      <div class="examen-detalle-fecha"><i class="fas fa-calendar-alt"></i> ${fechaLarga}${diasStr}</div>
    </div>
    <div class="detalle-section-title"><i class="fas fa-link"></i> &nbsp;Recursos y material</div>`;

  if (entry.links.length > 0) {
    html += `<ul class="examen-links-list">`;
    entry.links.forEach(({ url, nombre }) => {
      html += `
        <li class="examen-link-item">
          <i class="fas fa-external-link-alt"></i>
          <a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer">${escHtml(nombre)}</a>
        </li>`;
    });
    html += `</ul>`;
  } else {
    html += `<div class="detalle-empty"><i class="fas fa-info-circle"></i> Sin recursos. Clic derecho en el examen para agregar una URL.</div>`;
  }

  document.getElementById('detalleExamenBody').innerHTML = html;
  modalDetalleExamen.classList.add('open');
}

function cerrarDetalleExamen() {
  modalDetalleExamen.classList.remove('open');
  examenDetalleActual = null;
}
function refrescarDetalleExamen() {
  if (examenDetalleActual && modalDetalleExamen.classList.contains('open'))
    abrirDetalleExamen(examenDetalleActual);
}

document.getElementById('detalleExamenClose').addEventListener('click',  cerrarDetalleExamen);
document.getElementById('detalleExamenCerrar').addEventListener('click', cerrarDetalleExamen);
modalDetalleExamen.addEventListener('click', e => { if (e.target === modalDetalleExamen) cerrarDetalleExamen(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarDetalleExamen(); });

// ===== INIT =====
buildCalendar(calYear, calMonth);
refreshDoneList();
