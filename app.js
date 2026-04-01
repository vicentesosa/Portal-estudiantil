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
const EVENT_DAYS = new Set([]);
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let calYear = 2026, calMonth = 3; // Abril 2026

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
    if (d === todayDay)  el.classList.add('today');
    if (EVENT_DAYS.has(d)) el.classList.add('has-event');
    if (isThisMonth && d < todayDay) el.classList.add('past');
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
  materiasGrid.appendChild(card);
  materias.push({ nombre, card });
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

// ===== MODAL NUEVA TAREA =====
const modalTarea   = document.getElementById('modalTarea');
const tareaNombre  = document.getElementById('tareaNombre');
const tareaMateria = document.getElementById('tareaMateria');
const tareaFecha   = document.getElementById('tareaFecha');

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

  if (!nombre)  { tareaNombre.focus();  return; }
  if (!materia) { tareaMateria.focus(); return; }
  if (!fecha)   { tareaFecha.focus();   return; }

  const hoy      = new Date(); hoy.setHours(0,0,0,0);
  const vence    = new Date(fecha + 'T00:00:00');
  const diffDias = Math.round((vence - hoy) / 86400000);

  // Texto de vencimiento
  let venceTexto;
  if      (diffDias === 0) venceTexto = 'Vence hoy';
  else if (diffDias === 1) venceTexto = 'Vence mañana';
  else if (diffDias <= 7)  venceTexto = `Vence en ${diffDias} días`;
  else {
    const d = vence.toLocaleDateString('es-AR', { day:'numeric', month:'long' });
    venceTexto = `Vence el ${d}`;
  }

  // Decidir columna: urgente = vence en ≤2 días, semana = resto
  const esUrgente = diffDias <= 2;
  const lista     = esUrgente ? colUrgentes : colSemana;
  const dotColor  = diffDias <= 2 ? 'red' : diffDias <= 7 ? 'orange' : 'yellow';

  // Quitar mensaje vacío si existe
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
      <h4>${escHtml(nombre)}</h4>
      <p><i class="fas fa-book"></i> ${escHtml(materia)} &nbsp;·&nbsp; <i class="fas fa-clock"></i> ${venceTexto}</p>
    </div>
    <span class="priority-dot ${dotColor}"></span>
  `;

  // Checkbox → mover a completadas
  li.querySelector('input[type=checkbox]').addEventListener('change', function() {
    if (!this.checked) return;
    li.classList.add('done-task');
    setTimeout(() => {
      li.remove();
      actualizarCounts();
      const noMsg2 = lista.querySelector('.task-item');
      if (!noMsg2) {
        const msg = document.createElement('li');
        msg.className = 'no-tasks-msg';
        msg.innerHTML = esUrgente
          ? '<i class="fas fa-check"></i> Sin urgentes'
          : '<i class="fas fa-check"></i> Sin tareas esta semana';
        lista.appendChild(msg);
      }
      // Agregar a completadas
      const doneMsg = doneList.querySelector('.no-tasks-msg');
      if (doneMsg) doneMsg.remove();
      const doneLi = document.createElement('li');
      doneLi.className = 'task-item done-task';
      doneLi.innerHTML = `
        <div class="task-check"><input type="checkbox" id="done-${id}" checked/><label for="done-${id}"></label></div>
        <div class="task-body"><h4>${escHtml(nombre)}</h4><p><i class="fas fa-book"></i> ${escHtml(materia)}</p></div>
      `;
      doneList.appendChild(doneLi);
      doneCount++;
      doneCountEl.textContent = doneCount;
    }, 280);
  });

  lista.appendChild(li);
  actualizarCounts();
  closeModalTarea();
}

function actualizarCounts() {
  colCountUrgentes.textContent = colUrgentes.querySelectorAll('.task-item:not(.done-task)').length;
  colCountSemana.textContent   = colSemana.querySelectorAll('.task-item:not(.done-task)').length;
}

// ===== INIT =====
buildCalendar(calYear, calMonth);
refreshDoneList();
