// ===== LONG PRESS (touch) =====
// Permite abrir menús de contexto con toque prolongado en táctil
function addLongPress(el, callback, ms = 600) {
  let timer = null;
  let moved = false;
  el.addEventListener('touchstart', e => {
    moved = false;
    const t = e.touches[0];
    timer = setTimeout(() => {
      if (!moved) {
        // Vibrar levemente si el dispositivo lo soporta
        if (navigator.vibrate) navigator.vibrate(40);
        callback(t.clientX, t.clientY);
      }
    }, ms);
  }, { passive: true });
  el.addEventListener('touchmove',   () => { moved = true; clearTimeout(timer); }, { passive: true });
  el.addEventListener('touchend',    () => clearTimeout(timer), { passive: true });
  el.addEventListener('touchcancel', () => clearTimeout(timer), { passive: true });
}

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
const examenesData  = []; // exámenes: { materia, tema, vence, url }
const proyectosData = []; // proyectos: { materia, tema, vence, links }

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
    // Marcar días con eventos, exámenes o proyectos
    const tieneEvento = eventsData.some(e =>
      e.vence.getDate() === d && e.vence.getMonth() === month && e.vence.getFullYear() === year
    ) || examenesData.some(e =>
      e.vence.getDate() === d && e.vence.getMonth() === month && e.vence.getFullYear() === year
    ) || proyectosData.some(e =>
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
    .map(e => ({ _entry: e, _tipo: 'tarea', vence: e.vence, nombre: e.nombre, materia: e.materia, url: (e.urls||[])[0]||e.url||'', links: e.urls||[] }));

  const examenes = examenesData
    .filter(e => e.vence >= hoy)
    .map(e => ({ _entry: e, _tipo: 'examen', vence: e.vence, nombre: e.tema, materia: e.materia, links: e.links||[] }));

  const proyectos = proyectosData
    .filter(e => e.vence >= hoy)
    .map(e => ({ _entry: e, _tipo: 'proyecto', vence: e.vence, nombre: e.tema, materia: e.materia, links: e.links||[] }));

  const todos = [...tareas, ...examenes, ...proyectos].sort((a, b) => a.vence - b.vence);

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
    ev._entry = item._entry;
    ev._tipo  = item._tipo;

    if (item._tipo === 'tarea') {
      ev.innerHTML = `
        <div class="ev-date task-date">
          <span class="ev-day">${day}</span>
          <span class="ev-month">${monthName}</span>
        </div>
        <div class="ev-info">
          <h4>${taskLink(item.nombre, item.url||'')}</h4>
          <p><i class="fas fa-book"></i> ${escHtml(item.materia)}</p>
        </div>
        <span class="ev-pill task-pill">Tarea</span>`;
    } else if (item._tipo === 'examen') {
      const primerLink = item.links && item.links[0];
      ev.innerHTML = `
        <div class="ev-date exam-date">
          <span class="ev-day">${day}</span>
          <span class="ev-month">${monthName}</span>
        </div>
        <div class="ev-info">
          <h4>${primerLink ? taskLink(item.nombre, primerLink.url) : escHtml(item.nombre)}</h4>
          <p><i class="fas fa-book"></i> ${escHtml(item.materia)}</p>
        </div>
        <span class="ev-pill exam-pill">Examen</span>`;
    } else {
      const primerLink = item.links && item.links[0];
      ev.innerHTML = `
        <div class="ev-date proj-date">
          <span class="ev-day">${day}</span>
          <span class="ev-month">${monthName}</span>
        </div>
        <div class="ev-info">
          <h4>${primerLink ? taskLink(item.nombre, primerLink.url) : escHtml(item.nombre)}</h4>
          <p><i class="fas fa-book"></i> ${escHtml(item.materia)}</p>
        </div>
        <span class="ev-pill proj-pill">Proyecto</span>`;
    }

    ev.addEventListener('contextmenu', e => openCtxCalEvento(e, ev));
    addLongPress(ev, (x, y) => openCtxCalEvento({ clientX: x, clientY: y }, ev));
    eventsList.appendChild(ev);
  });
}


// ===== CONTEXT MENU CALENDARIO =====
const ctxCalEvento = document.getElementById('ctxCalEvento');
let ctxCalTarget = null;

function openCtxCalEvento(e, ev) {
  if (e.preventDefault) e.preventDefault();
  if (e.stopPropagation) e.stopPropagation();
  ctxCalTarget = ev;
  const tipo = ev._tipo;
  const labels = { tarea: 'tarea', examen: 'examen', proyecto: 'proyecto' };
  document.getElementById('ctxCalIr').querySelector('span').textContent = 'Ir al ' + (labels[tipo] || 'evento');
  const btnComp = document.getElementById('ctxCalCompletar');
  btnComp.style.display = '';
  const x = Math.min(e.clientX, window.innerWidth  - 240);
  const y = Math.min(e.clientY, window.innerHeight - 160);
  ctxCalEvento.style.left = x + 'px';
  ctxCalEvento.style.top  = y + 'px';
  ctxCalEvento.classList.add('open');
}
function closeCtxCalEvento() { ctxCalEvento.classList.remove('open'); }
document.addEventListener('click',       closeCtxCalEvento);
document.addEventListener('contextmenu', e => { if (!e.target.closest('.ev')) closeCtxCalEvento(); });
document.addEventListener('keydown',     e => { if (e.key === 'Escape') closeCtxCalEvento(); });

document.getElementById('ctxCalCompletar').addEventListener('click', () => {
  if (!ctxCalTarget) return;
  const entry = ctxCalTarget._entry;
  const tipo  = ctxCalTarget._tipo;
  closeCtxCalEvento(); ctxCalTarget = null;

  if (tipo === 'tarea') {
    const li = document.getElementById('tarea-' + entry.id);
    if (li && !li.classList.contains('done-task')) {
      const cb = li.querySelector('input[type=checkbox]');
      if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    }
  } else if (tipo === 'examen') {
    const idx = examenesData.indexOf(entry);
    if (idx > -1) examenesData.splice(idx, 1);
    examenesCompletados.push(entry);
    const card = [...examenesGrid.querySelectorAll('.examen-card')].find(c => c._entry === entry);
    if (card) card.remove();
    if (!examenesGrid.querySelector('.examen-card')) {
      const msg = document.createElement('div');
      msg.className = 'empty-state'; msg.id = 'examenesEmpty';
      msg.innerHTML = '<i class="fas fa-file-alt"></i><p>No hay exámenes registrados</p>';
      examenesGrid.appendChild(msg);
    }
    actualizarStats();
  } else if (tipo === 'proyecto') {
    const idx = proyectosData.indexOf(entry);
    if (idx > -1) proyectosData.splice(idx, 1);
    proyectosCompletados.push(entry);
    const card = [...proyectosGrid.querySelectorAll('.proyecto-card')].find(c => c._entry === entry);
    if (card) card.remove();
    if (!proyectosGrid.querySelector('.proyecto-card')) {
      const msg = document.createElement('div');
      msg.className = 'empty-state'; msg.id = 'proyectosEmpty';
      msg.innerHTML = '<i class="fas fa-project-diagram"></i><p>No hay proyectos registrados</p>';
      proyectosGrid.appendChild(msg);
    }
    actualizarStats();
  }
  actualizarEventosList(); actualizarActividadesSemana();
  buildCalendar(calYear, calMonth); guardarPortalData();
});

document.getElementById('ctxCalEliminar').addEventListener('click', () => {
  if (!ctxCalTarget) return;
  const entry = ctxCalTarget._entry;
  const tipo  = ctxCalTarget._tipo;
  closeCtxCalEvento(); ctxCalTarget = null;

  if (tipo === 'tarea') {
    const li = document.getElementById('tarea-' + entry.id);
    const idx = eventsData.indexOf(entry);
    if (idx !== -1) eventsData.splice(idx, 1);
    if (li) {
      const wasDone = li.classList.contains('done-task');
      li.remove();
      if (wasDone) { doneCount = Math.max(0, doneCount - 1); doneCountEl.textContent = doneCount; refreshDoneList(); }
    }
    actualizarCounts();
  } else if (tipo === 'examen') {
    const idx = examenesData.indexOf(entry);
    if (idx > -1) examenesData.splice(idx, 1);
    const card = [...examenesGrid.querySelectorAll('.examen-card')].find(c => c._entry === entry);
    if (card) card.remove();
    if (!examenesGrid.querySelector('.examen-card')) {
      const msg = document.createElement('div');
      msg.className = 'empty-state'; msg.id = 'examenesEmpty';
      msg.innerHTML = '<i class="fas fa-file-alt"></i><p>No hay exámenes registrados</p>';
      examenesGrid.appendChild(msg);
    }
    actualizarStats();
  } else if (tipo === 'proyecto') {
    const idx = proyectosData.indexOf(entry);
    if (idx > -1) proyectosData.splice(idx, 1);
    const card = [...proyectosGrid.querySelectorAll('.proyecto-card')].find(c => c._entry === entry);
    if (card) card.remove();
    if (!proyectosGrid.querySelector('.proyecto-card')) {
      const msg = document.createElement('div');
      msg.className = 'empty-state'; msg.id = 'proyectosEmpty';
      msg.innerHTML = '<i class="fas fa-project-diagram"></i><p>No hay proyectos registrados</p>';
      proyectosGrid.appendChild(msg);
    }
    actualizarStats();
  }
  actualizarEventosList(); actualizarActividadesSemana();
  buildCalendar(calYear, calMonth); guardarPortalData();
});

document.getElementById('ctxCalIr').addEventListener('click', () => {
  if (!ctxCalTarget) return;
  const entry = ctxCalTarget._entry;
  const tipo  = ctxCalTarget._tipo;
  closeCtxCalEvento(); ctxCalTarget = null;

  if (tipo === 'tarea') {
    showTab('tareas');
    const li = document.getElementById('tarea-' + entry.id);
    if (!li) return;
    const lista    = li.parentElement;
    const esUrgente = lista === colUrgentes;
    const dot      = li.querySelector('.priority-dot');
    const dotColor = dot
      ? (dot.classList.contains('red') ? 'red' : dot.classList.contains('orange') ? 'orange' : 'yellow')
      : 'yellow';
    const hoy  = new Date(); hoy.setHours(0,0,0,0);
    const diff = Math.round((entry.vence - hoy) / 86400000);
    const venceTexto = diff === 0 ? 'Vence hoy'
      : diff === 1 ? 'Vence mañana'
      : diff <= 7  ? `Vence en ${diff} días`
      : `Vence el ${entry.vence.toLocaleDateString('es-AR', { day:'numeric', month:'long' })}`;
    abrirDetalleTarea(entry, li, lista, esUrgente, dotColor, venceTexto);

  } else if (tipo === 'examen') {
    showTab('examenes');
    const card = [...examenesGrid.querySelectorAll('.examen-card')].find(c => c._entry === entry);
    if (card) abrirDetalleExamen(card);

  } else {
    showTab('proyectos');
    const card = [...proyectosGrid.querySelectorAll('.proyecto-card')].find(c => c._entry === entry);
    if (card) abrirDetalleProyecto(card);
  }
});

// ===== ACTUALIZAR CARDS DE MATERIAS =====
function actualizarMatCards() {
  document.querySelectorAll('.mat-card').forEach(card => {
    const nombre     = card.querySelector('h3')?.textContent;
    if (!nombre) return;
    const total      = eventsData.filter(e => e.materia === nombre).length;
    const completadas = eventsData.filter(e => e.materia === nombre && e.completada).length;
    const pendientes  = total - completadas;

    // Badge
    const badge = card.querySelector('.mat-badge');
    if (badge) {
      if (pendientes === 0) {
        badge.className = 'mat-badge ok';
        badge.textContent = 'Al día';
      } else if (pendientes === 1) {
        badge.className = 'mat-badge pending';
        badge.textContent = '1 tarea pendiente';
      } else {
        badge.className = 'mat-badge pending';
        badge.textContent = `${pendientes} tareas pendientes`;
      }
    }

    // Barra de progreso
    const bar = card.querySelector('.mat-progress-bar');
    const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;
    if (bar) { bar.style.width = pct + '%'; delete bar.dataset.animated; }

    // Etiqueta "0/1"
    const label = card.querySelector('.mat-progress-label span:last-child');
    if (label) label.textContent = `${completadas}/${total}`;
  });
}

// ===== STATS E INICIO =====
function actualizarStats() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  // ── Stats superiores ──
  const numMaterias = document.querySelectorAll('#materiasGrid .mat-card').length;
  document.getElementById('statMaterias').textContent = numMaterias;

  const pendientes = document.querySelectorAll(
    '.tareas-cols .tareas-col:nth-child(1) .task-list .task-item:not(.done-task), ' +
    '.tareas-cols .tareas-col:nth-child(2) .task-list .task-item:not(.done-task)'
  ).length;
  document.getElementById('statTareasPend').textContent = pendientes;

  const proximosExamenes = examenesData.filter(e => e.vence >= hoy).length;
  document.getElementById('statExamenes').textContent = proximosExamenes;

  // ── Quick nav ──
  const qMat = document.getElementById('qnavMaterias');
  if (qMat) qMat.textContent = numMaterias > 0
    ? numMaterias + (numMaterias === 1 ? ' materia activa' : ' materias activas')
    : 'Sin materias registradas';

  const qTar = document.getElementById('qnavTareas');
  if (qTar) qTar.textContent = pendientes > 0
    ? pendientes + (pendientes === 1 ? ' tarea pendiente' : ' tareas pendientes')
    : 'Sin tareas pendientes';

  const qEx = document.getElementById('qnavExamenes');
  if (qEx) qEx.textContent = proximosExamenes > 0
    ? proximosExamenes + (proximosExamenes === 1 ? ' examen próximo' : ' exámenes próximos')
    : 'Sin exámenes registrados';

  const en30 = new Date(hoy); en30.setDate(en30.getDate() + 30);
  const eventosProximos = eventsData.filter(e => !e.completada && e.vence >= hoy && e.vence <= en30).length
    + examenesData.filter(e => e.vence >= hoy && e.vence <= en30).length;
  const qCal = document.getElementById('qnavCalendario');
  if (qCal) qCal.textContent = eventosProximos > 0
    ? eventosProximos + (eventosProximos === 1 ? ' evento próximo' : ' eventos próximos')
    : 'Sin eventos próximos';

  const numApuntes = document.querySelectorAll('.apunte-item').length;
  const qApu = document.getElementById('qnavApuntes');
  if (qApu) qApu.textContent = numApuntes > 0
    ? numApuntes + (numApuntes === 1 ? ' apunte guardado' : ' apuntes guardados')
    : 'Sin apuntes guardados';

  // ── Hero badges ──
  const en7 = new Date(hoy); en7.setDate(en7.getDate() + 7);

  const badgeTareas = document.getElementById('heroBadgeTareas');
  if (badgeTareas) {
    if (pendientes > 0) {
      badgeTareas.className = 'badge badge-warning';
      badgeTareas.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${pendientes} tarea${pendientes > 1 ? 's' : ''} pendiente${pendientes > 1 ? 's' : ''}`;
    } else {
      badgeTareas.className = 'badge badge-success';
      badgeTareas.innerHTML = '<i class="fas fa-check-circle"></i> Sin tareas pendientes';
    }
  }

  const examenesProximos = examenesData.filter(e => e.vence >= hoy && e.vence <= en7).length;
  const badgeEventos = document.getElementById('heroBadgeEventos');
  if (badgeEventos) {
    if (examenesProximos > 0) {
      badgeEventos.className = 'badge badge-warning';
      badgeEventos.innerHTML = `<i class="fas fa-calendar-alt"></i> ${examenesProximos} examen${examenesProximos > 1 ? 'es' : ''} esta semana`;
    } else if (proximosExamenes > 0) {
      badgeEventos.className = 'badge badge-info';
      badgeEventos.innerHTML = `<i class="fas fa-calendar-alt"></i> ${proximosExamenes} examen${proximosExamenes > 1 ? 'es' : ''} próximo${proximosExamenes > 1 ? 's' : ''}`;
    } else {
      badgeEventos.className = 'badge badge-success';
      badgeEventos.innerHTML = '<i class="fas fa-calendar-check"></i> Sin eventos esta semana';
    }
  }

  const numProyectos = proyectosData.filter(p => p.vence >= hoy).length;
  const statProy = document.getElementById('statProyectos');
  if (statProy) statProy.textContent = numProyectos;
  const badgeProyectos = document.getElementById('heroBadgeProyectos');
  if (badgeProyectos) {
    if (numProyectos > 0) {
      badgeProyectos.className = 'badge badge-info';
      badgeProyectos.innerHTML = `<i class="fas fa-project-diagram"></i> ${numProyectos} proyecto${numProyectos > 1 ? 's' : ''} activo${numProyectos > 1 ? 's' : ''}`;
    } else {
      badgeProyectos.className = 'badge badge-success';
      badgeProyectos.innerHTML = '<i class="fas fa-star"></i> Sin proyectos activos';
    }
  }

  const qProy = document.getElementById('qnavProyectos');
  if (qProy) qProy.textContent = numProyectos > 0
    ? numProyectos + (numProyectos === 1 ? ' proyecto activo' : ' proyectos activos')
    : 'Sin proyectos activos';
}

function actualizarActividadesSemana() {
  const container = document.getElementById('actividadesSemana');
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const en7 = new Date(hoy); en7.setDate(en7.getDate() + 7);

  const tareas = eventsData
    .filter(e => !e.completada && e.vence >= hoy && e.vence <= en7)
    .map(e => ({ titulo: e.nombre, materia: e.materia, vence: e.vence, url: (e.urls||[])[0]||e.url||'', _tipo: 'tarea' }));

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
    const dot     = diff <= 1 ? 'red' : 'orange';
    const when    = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : `En ${diff} días`;
    const isExam  = _tipo === 'examen';
    const statCls = diff <= 1 ? 'exam-st' : 'upcoming';
    const statLbl = isExam ? 'Examen' : (diff <= 1 ? 'Urgente' : 'Pendiente');
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
const apunteDropdown = document.getElementById('apunteDropdown');
const modalApunte    = document.getElementById('modalApunte');
let apunteTargetRow  = null;
let apunteTipo       = null; // 'url' | 'gdoc' | 'nota'

const APUNTE_TIPOS = {
  url:  { icon: 'fas fa-link',        title: 'Agregar URL',             placeholder: 'https://' },
  gdoc: { icon: 'fab fa-google-drive', title: 'Documento de Google',    placeholder: 'https://docs.google.com/...' },
  nota: { icon: 'fas fa-pencil-alt',   title: 'Mi propio apunte',       placeholder: '' },
};

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

    const addBtn = document.createElement('button');
    addBtn.className = 'apunte-add-btn';
    addBtn.title = 'Agregar apunte';
    addBtn.innerHTML = '<i class="fas fa-plus"></i>';
    addBtn.addEventListener('click', e => {
      e.stopPropagation();
      apunteTargetRow = row;
      const isOpen = apunteDropdown.classList.contains('open');
      if (isOpen) {
        apunteDropdown.classList.remove('open', 'open-up');
        return;
      }
      const rect = addBtn.getBoundingClientRect();
      const ddH  = apunteDropdown.offsetHeight || 130;
      const openUp = (window.innerHeight - rect.bottom) < ddH + 10;
      apunteDropdown.classList.toggle('open-up', openUp);
      apunteDropdown.style.top  = openUp
        ? (rect.top - ddH - 6) + 'px'
        : (rect.bottom + 6) + 'px';
      apunteDropdown.style.left = Math.min(rect.right - 210, window.innerWidth - 220) + 'px';
      apunteDropdown.classList.add('open');
    });

    row.innerHTML = `
      <div class="apunte-row-header">
        <div class="apunte-row-icon"><i class="fas fa-book"></i></div>
        <h3 class="apunte-row-title">${escHtml(nombre)}</h3>
        <span class="apunte-row-badge">0 apuntes</span>
        <i class="fas fa-chevron-right apunte-row-chevron"></i>
      </div>
      <div class="apunte-row-body">
        <div class="apunte-items-list"></div>
        <div class="apunte-body-empty">
          <i class="fas fa-sticky-note"></i> Sin apuntes aún — usá el <strong>+</strong> para agregar
        </div>
      </div>`;

    // Insertar el botón + antes del chevron
    const header = row.querySelector('.apunte-row-header');
    header.insertBefore(addBtn, header.querySelector('.apunte-row-chevron'));

    header.addEventListener('click', () => row.classList.toggle('open'));

    container.appendChild(row);
  });

  // Restaurar items desde localStorage
  try {
    const guardados = JSON.parse(localStorage.getItem('portal_apuntes') || '{}');
    document.querySelectorAll('.apunte-row').forEach(row => {
      const items = guardados[row.dataset.materia];
      if (items && items.length) restaurarApuntesEnRow(row, items);
    });
  } catch {}
}

// ── Helpers de items ─────────────────────────────────────────────────
const CAT_ORDER  = ['nota', 'gdoc', 'url'];
const CAT_LABELS = { nota: 'Apuntes propios', gdoc: 'Google Docs', url: 'Links' };
const CAT_ICONS  = { nota: 'fas fa-align-left', gdoc: 'fab fa-google-drive', url: 'fas fa-link' };

function crearItemEl(data) {
  const itemEl = document.createElement('div');
  if (data.tipo === 'nota') {
    itemEl.className      = 'apunte-item apunte-item-nota';
    itemEl.dataset.noteId = data.noteId || '';
    itemEl.innerHTML      = `<i class="fas fa-align-left"></i><a href="editor.html?id=${data.noteId}" target="_blank" rel="noopener" class="apunte-nota-link">${escHtml(data.nombre)}</a>`;
  } else {
    const icon = data.tipo === 'gdoc' ? 'fab fa-google-drive' : 'fas fa-link';
    itemEl.className = `apunte-item apunte-item-${data.tipo}`;
    itemEl.innerHTML = `<i class="${icon}"></i><a href="${escHtml(data.url)}" target="_blank" rel="noopener noreferrer">${escHtml(data.nombre)}</a>`;
  }
  itemEl.addEventListener('contextmenu', e => openCtxApunte(e, itemEl));
  addLongPress(itemEl, (x, y) => openCtxApunte({ clientX: x, clientY: y }, itemEl));
  return itemEl;
}

function reordenarItems(row) {
  const list = row.querySelector('.apunte-items-list');
  // Recolectar items existentes
  const items = [];
  list.querySelectorAll('.apunte-item').forEach(item => {
    items.push({
      tipo: item.classList.contains('apunte-item-nota') ? 'nota'
          : item.classList.contains('apunte-item-gdoc') ? 'gdoc' : 'url',
      el: item
    });
  });
  // Redibujar con etiquetas de categoría
  list.innerHTML = '';
  CAT_ORDER.forEach(tipo => {
    const grupo = items.filter(i => i.tipo === tipo);
    if (!grupo.length) return;
    const lbl = document.createElement('div');
    lbl.className = 'apunte-cat-label';
    lbl.innerHTML = `<i class="${CAT_ICONS[tipo]}"></i> ${CAT_LABELS[tipo]}`;
    list.appendChild(lbl);
    grupo.forEach(i => list.appendChild(i.el));
  });
  const count = list.querySelectorAll('.apunte-item').length;
  row.querySelector('.apunte-row-badge').textContent = `${count} apunte${count !== 1 ? 's' : ''}`;
}

function restaurarApuntesEnRow(row, items) {
  if (!items || !items.length) return;
  const list     = row.querySelector('.apunte-items-list');
  const emptyMsg = row.querySelector('.apunte-body-empty');
  list.innerHTML = '';
  CAT_ORDER.forEach(tipo => {
    const grupo = items.filter(i => i.tipo === tipo);
    if (!grupo.length) return;
    const lbl = document.createElement('div');
    lbl.className = 'apunte-cat-label';
    lbl.innerHTML = `<i class="${CAT_ICONS[tipo]}"></i> ${CAT_LABELS[tipo]}`;
    list.appendChild(lbl);
    grupo.forEach(data => list.appendChild(crearItemEl(data)));
  });
  if (emptyMsg) emptyMsg.style.display = 'none';
  const count = list.querySelectorAll('.apunte-item').length;
  row.querySelector('.apunte-row-badge').textContent = `${count} apunte${count !== 1 ? 's' : ''}`;
}

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', e => {
  if (!e.target.closest('.apunte-add-btn') && !e.target.closest('#apunteDropdown'))
    apunteDropdown.classList.remove('open', 'open-up');
});

// Items del dropdown → acción según tipo
document.querySelectorAll('.apunte-dropdown-item').forEach(btn => {
  btn.addEventListener('click', () => {
    apunteTipo = btn.dataset.tipo;
    apunteDropdown.classList.remove('open', 'open-up');

    // Documento de Google → abre docs.new y luego muestra el modal para pegar el link
    if (apunteTipo === 'gdoc') {
      window.open('https://docs.new', '_blank', 'noopener,noreferrer');
      // Sigue al modal para que el usuario pegue el link del doc creado
    }

    // Mi propio apunte → abre editor.html en nueva pestaña
    if (apunteTipo === 'nota') {
      const noteId = 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      window.open('editor.html?id=' + noteId, '_blank', 'noopener');
      if (apunteTargetRow) {
        const list   = apunteTargetRow.querySelector('.apunte-items-list');
        const itemEl = crearItemEl({ tipo: 'nota', noteId, nombre: 'Apunte sin título' });
        list.appendChild(itemEl);
        reordenarItems(apunteTargetRow);
        apunteTargetRow.querySelector('.apunte-body-empty').style.display = 'none';
        apunteTargetRow.classList.add('open');
        guardarPortalData();
      }
      apunteTargetRow = null;
      return;
    }

    const { icon, title, placeholder } = APUNTE_TIPOS[apunteTipo];
    const titleEl = document.getElementById('apunteTipoTitle');
    titleEl.querySelector('i').className = icon;
    titleEl.querySelector('span').textContent = title;

    const linkSec = document.getElementById('apunteLinkSection');
    const notaSec = document.getElementById('apunteNotaSection');
    linkSec.style.display = apunteTipo !== 'nota' ? '' : 'none';
    notaSec.style.display = apunteTipo === 'nota' ? '' : 'none';

    document.getElementById('apunteUrlInput').value      = '';
    document.getElementById('apunteUrlInput').placeholder = placeholder;
    document.getElementById('apunteNombreInput').value   = '';
    document.getElementById('apunteTexto').value         = '';

    modalApunte.classList.add('open');
    setTimeout(() => {
      if (apunteTipo === 'nota') document.getElementById('apunteTexto').focus();
      else document.getElementById('apunteUrlInput').focus();
    }, 120);
  });
});

function closeModalApunte() { modalApunte.classList.remove('open'); }
document.getElementById('apunteClose').addEventListener('click',  closeModalApunte);
document.getElementById('apunteCancel').addEventListener('click', closeModalApunte);
modalApunte.addEventListener('click', e => { if (e.target === modalApunte) closeModalApunte(); });
document.getElementById('apunteConfirm').addEventListener('click', guardarApunte);
document.getElementById('apunteTexto').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.ctrlKey) guardarApunte();
});

function guardarApunte() {
  if (!apunteTargetRow) return;
  const list = apunteTargetRow.querySelector('.apunte-items-list');

  const raw    = document.getElementById('apunteUrlInput').value.trim();
  const nombre = document.getElementById('apunteNombreInput').value.trim();
  const url    = safeUrl(raw);
  if (!url) { document.getElementById('apunteUrlInput').focus(); return; }

  const itemEl = crearItemEl({ tipo: apunteTipo, url, nombre: nombre || raw });
  list.appendChild(itemEl);
  reordenarItems(apunteTargetRow);
  apunteTargetRow.querySelector('.apunte-body-empty').style.display = 'none';
  apunteTargetRow.classList.add('open');

  closeModalApunte();
  guardarPortalData();
  apunteTargetRow = null;
}

// ===== CONTEXT MENU APUNTE =====
const ctxMenuApunte  = document.getElementById('ctxMenuApunte');
let ctxApunteTarget  = null; // el .apunte-item sobre el que se hizo clic derecho

function openCtxApunte(e, itemEl) {
  if (e.preventDefault) e.preventDefault();
  ctxApunteTarget = itemEl;
  ctxMenuApunte.style.left = Math.min(e.clientX, window.innerWidth  - 180) + 'px';
  ctxMenuApunte.style.top  = Math.min(e.clientY, window.innerHeight - 80)  + 'px';
  ctxMenuApunte.classList.add('open');
}

document.addEventListener('click', e => {
  if (!ctxMenuApunte.contains(e.target)) ctxMenuApunte.classList.remove('open');
});

document.getElementById('ctxApunteDelete').addEventListener('click', () => {
  ctxMenuApunte.classList.remove('open');
  if (!ctxApunteTarget) return;
  const row = ctxApunteTarget.closest('.apunte-row');

  // Si es una nota propia, eliminar también su contenido de localStorage
  const noteId = ctxApunteTarget.dataset.noteId;
  if (noteId) localStorage.removeItem('apunte_' + noteId);

  ctxApunteTarget.remove();
  if (row) {
    // Eliminar etiquetas de categoría que quedaron sin ítems
    row.querySelectorAll('.apunte-cat-label').forEach(lbl => {
      const next = lbl.nextElementSibling;
      if (!next || next.classList.contains('apunte-cat-label')) lbl.remove();
    });
    const count = row.querySelectorAll('.apunte-items-list .apunte-item').length;
    row.querySelector('.apunte-row-badge').textContent = count > 0 ? `${count} apunte${count > 1 ? 's' : ''}` : '0 apuntes';
    const emptyMsg = row.querySelector('.apunte-body-empty');
    if (emptyMsg) emptyMsg.style.display = count === 0 ? '' : 'none';
  }
  guardarPortalData();
  ctxApunteTarget = null;
});

document.getElementById('ctxApunteRename').addEventListener('click', () => {
  ctxMenuApunte.classList.remove('open');
  if (!ctxApunteTarget) return;
  const linkEl = ctxApunteTarget.querySelector('a, .apunte-nota-link, span');
  if (!linkEl) return;
  const actual = linkEl.textContent.trim();
  const nuevo  = prompt('Nuevo nombre:', actual);
  if (nuevo && nuevo.trim() && nuevo.trim() !== actual) {
    linkEl.textContent = nuevo.trim();
    // Si es un apunte de editor, actualizar también en localStorage
    const noteId = ctxApunteTarget.dataset.noteId;
    if (noteId) {
      try {
        const raw  = localStorage.getItem('apunte_' + noteId);
        const data = raw ? JSON.parse(raw) : {};
        data.title = nuevo.trim();
        localStorage.setItem('apunte_' + noteId, JSON.stringify(data));
      } catch {}
    }
  }
  ctxApunteTarget = null;
});

// Sincroniza títulos de apuntes cuando el editor guarda en localStorage
window.addEventListener('storage', e => {
  if (!e.key || !e.key.startsWith('apunte_')) return;
  const noteId = e.key.slice('apunte_'.length);
  const linkEl = document.querySelector(`.apunte-item[data-note-id="${noteId}"] .apunte-nota-link`);
  if (!linkEl) return;
  try {
    const data = JSON.parse(e.newValue);
    if (data && data.title) linkEl.textContent = data.title;
  } catch {}
});

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
  if (e.preventDefault) e.preventDefault();
  ctxTarget = card;
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
  if (typeof window.syncPortalData === 'function') window.syncPortalData();
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
  addLongPress(card, (x, y) => openCtx({ clientX: x, clientY: y }, card));
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
    pendientes.sort((a, b) => a.vence - b.vence).forEach(({ nombre: nt, vence, url, urls }) => {
      url = (urls||[])[0] || url || '';
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
    entregadasArr.forEach(({ nombre: nt, vence, url, urls }) => {
      url = (urls||[])[0] || url || '';
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
const modalTarea    = document.getElementById('modalTarea');
const tareaNombre   = document.getElementById('tareaNombre');
const tareaMateria  = document.getElementById('tareaMateria');
const tareaFecha    = document.getElementById('tareaFecha');
const tareaUrlsCont = document.getElementById('tareaUrlsContainer');
const tareaArchivo  = document.getElementById('tareaArchivo');
const tareaFileName  = document.getElementById('tareaFileName');
const tareaFileLabel = document.getElementById('tareaFileLabel');
let tareaArchivoData = null; // { name, dataUrl, type }

async function extraerTextoPDF(dataUrl) {
  if (typeof pdfjsLib === 'undefined') return '';
  try {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pdf  = await pdfjsLib.getDocument({ data: bytes }).promise;
    let texto  = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      texto += content.items.map(it => it.str).join(' ') + '\n';
    }
    return texto.trim();
  } catch { return ''; }
}

tareaArchivo.addEventListener('change', () => {
  const file = tareaArchivo.files[0];
  if (!file) {
    tareaArchivoData = null;
    tareaFileName.textContent = 'Seleccionar archivo...';
    tareaFileLabel.classList.remove('has-file');
    return;
  }
  tareaFileName.textContent = file.name;
  tareaFileLabel.classList.add('has-file');
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    let textoExtraido = '';
    if (file.type === 'application/pdf') {
      textoExtraido = await extraerTextoPDF(dataUrl);
    } else if (file.type.startsWith('text/')) {
      try { textoExtraido = atob(dataUrl.split(',')[1]); } catch {}
    }
    tareaArchivoData = { name: file.name, dataUrl, type: file.type, textoExtraido };
  };
  reader.readAsDataURL(file);
});

// ── Gestión de filas de URL en el modal ──
function crearUrlRow(value) {
  const row = document.createElement('div');
  row.className = 'tarea-url-row';
  row.innerHTML = `
    <input class="modal-input tarea-url-input" type="url" placeholder="https://..." autocomplete="off" value="${escHtml(value || '')}"/>
    <button type="button" class="tarea-url-btn remove-btn" title="Quitar URL"><i class="fas fa-minus"></i></button>
    <button type="button" class="tarea-url-btn add-btn" title="Agregar otra URL"><i class="fas fa-plus"></i></button>
  `;
  row.querySelector('.add-btn').addEventListener('click', () => {
    tareaUrlsCont.appendChild(crearUrlRow(''));
    sincronizarBotonesUrl();
    tareaUrlsCont.lastElementChild.querySelector('.tarea-url-input').focus();
  });
  row.querySelector('.remove-btn').addEventListener('click', () => {
    row.remove();
    sincronizarBotonesUrl();
  });
  return row;
}

function sincronizarBotonesUrl() {
  const rows = tareaUrlsCont.querySelectorAll('.tarea-url-row');
  rows.forEach((r, i) => {
    r.querySelector('.remove-btn').style.display = rows.length > 1 ? '' : 'none';
  });
}

function resetUrlRows() {
  tareaUrlsCont.innerHTML = '';
  tareaUrlsCont.appendChild(crearUrlRow(''));
  sincronizarBotonesUrl();
}

function recogerUrls() {
  const urls = [];
  tareaUrlsCont.querySelectorAll('.tarea-url-input').forEach(inp => {
    const raw = inp.value.trim();
    if (!raw) return;
    try {
      const u = new URL(raw);
      if (u.protocol === 'http:' || u.protocol === 'https:') urls.push(raw);
    } catch {}
  });
  return urls;
}

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
  resetUrlRows();
  tareaArchivo.value = '';
  tareaArchivoData = null;
  tareaFileName.textContent = 'Seleccionar archivo...';
  tareaFileLabel.classList.remove('has-file');
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

// ===== MODAL DETALLE TAREA (click izquierdo en tarea) =====
const modalDetalleTarea = document.getElementById('modalDetalleTarea');
let dtTaskEntry = null, dtLi = null, dtLista = null, dtEsUrgente = false, dtDotColor = '', dtVenceTexto = '';

function renderDtArchivos() {
  const cont = document.getElementById('dtArchivos');
  cont.innerHTML = '';
  const urls    = dtTaskEntry.urls    || [];
  const archivos = dtTaskEntry.archivos || [];
  if (urls.length === 0 && archivos.length === 0) return;
  urls.forEach(u => {
    const div = document.createElement('div');
    div.className = 'dt-archivo-item';
    div.innerHTML = `<i class="fas fa-link"></i><a href="${escHtml(u)}" target="_blank" rel="noopener noreferrer">${escHtml(u)}</a>`;
    cont.appendChild(div);
  });
  archivos.forEach(a => {
    const div = document.createElement('div');
    div.className = 'dt-archivo-item';
    if (a.dataUrl) {
      const isImg = a.type?.startsWith('image/');
      const iconos = { 'application/pdf':'fa-file-pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation':'fa-file-powerpoint','application/msword':'fa-file-word','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'fa-file-word','application/vnd.ms-excel':'fa-file-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'fa-file-excel' };
      const ico = isImg ? 'fa-image' : (iconos[a.type] || 'fa-file-alt');
      div.innerHTML = `<i class="fas ${ico}"></i><a href="${a.dataUrl}" download="${escHtml(a.name)}">${escHtml(a.name)}</a>`;
    } else {
      div.innerHTML = `<i class="fas fa-paperclip"></i><span style="color:var(--muted)">${escHtml(a.name)}</span>`;
    }
    cont.appendChild(div);
  });
}

function abrirDetalleTarea(taskEntry, li, lista, esUrgente, dotColor, venceTexto) {
  dtTaskEntry = taskEntry; dtLi = li; dtLista = lista;
  dtEsUrgente = esUrgente; dtDotColor = dotColor; dtVenceTexto = venceTexto;
  document.getElementById('dtNombre').textContent  = taskEntry.nombre;
  document.getElementById('dtMateria').textContent = taskEntry.materia;
  document.getElementById('dtFecha').textContent   = venceTexto;
  renderDtArchivos();
  // Ocultar paneles inline
  document.getElementById('dtRenombrarBox').style.display = 'none';
  document.getElementById('dtUrlBox').style.display = 'none';
  modalDetalleTarea.classList.add('open');
}

function cerrarDetalleTarea() { modalDetalleTarea.classList.remove('open'); }

document.getElementById('dtClose').addEventListener('click', cerrarDetalleTarea);
modalDetalleTarea.addEventListener('click', e => { if (e.target === modalDetalleTarea) cerrarDetalleTarea(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalDetalleTarea.classList.contains('open')) cerrarDetalleTarea(); });

// ── Cambiar nombre ──
document.getElementById('dtRenombrar').addEventListener('click', () => {
  const box = document.getElementById('dtRenombrarBox');
  document.getElementById('dtUrlBox').style.display = 'none';
  box.style.display = box.style.display === 'none' ? '' : 'none';
  if (box.style.display !== 'none') {
    document.getElementById('dtRenombrarInput').value = dtTaskEntry.nombre;
    document.getElementById('dtRenombrarInput').focus();
  }
});
document.getElementById('dtRenombrarCancelar').addEventListener('click', () => {
  document.getElementById('dtRenombrarBox').style.display = 'none';
});
document.getElementById('dtRenombrarGuardar').addEventListener('click', () => {
  const nuevo = document.getElementById('dtRenombrarInput').value.trim();
  if (!nuevo) return;
  dtTaskEntry.nombre = nuevo;
  document.getElementById('dtNombre').textContent = nuevo;
  document.getElementById('dtRenombrarBox').style.display = 'none';
  // Actualizar li
  const body = dtLi.querySelector('.task-body');
  if (body) body.innerHTML = buildTaskBodyHtml(dtTaskEntry, dtVenceTexto);
  actualizarEventosList(); actualizarActividadesSemana(); guardarPortalData(); refrescarDetalleMateria?.();
});

// ── Agregar URL ──
document.getElementById('dtAgregarUrl').addEventListener('click', () => {
  const box = document.getElementById('dtUrlBox');
  document.getElementById('dtRenombrarBox').style.display = 'none';
  box.style.display = box.style.display === 'none' ? '' : 'none';
  if (box.style.display !== 'none') {
    document.getElementById('dtUrlInput').value = '';
    document.getElementById('dtUrlInput').focus();
  }
});
document.getElementById('dtUrlCancelar').addEventListener('click', () => {
  document.getElementById('dtUrlBox').style.display = 'none';
});
document.getElementById('dtUrlGuardar').addEventListener('click', () => {
  const raw = document.getElementById('dtUrlInput').value.trim();
  if (!raw) return;
  let valid = '';
  try { const u = new URL(raw); if (u.protocol === 'http:' || u.protocol === 'https:') valid = raw; } catch {}
  if (!valid) { document.getElementById('dtUrlInput').focus(); return; }
  dtTaskEntry.urls = [...(dtTaskEntry.urls || []), valid];
  document.getElementById('dtUrlBox').style.display = 'none';
  renderDtArchivos();
  const body = dtLi.querySelector('.task-body');
  if (body) body.innerHTML = buildTaskBodyHtml(dtTaskEntry, dtVenceTexto);
  guardarPortalData();
});

// ── Agregar archivo ──
const dtArchivoInput = document.getElementById('dtArchivoInput');
document.getElementById('dtAgregarArchivo').addEventListener('click', () => {
  dtArchivoInput.value = '';
  dtArchivoInput.click();
});
dtArchivoInput.addEventListener('change', () => {
  const file = dtArchivoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const a = { name: file.name, type: file.type, dataUrl: ev.target.result };
    dtTaskEntry.archivos = [...(dtTaskEntry.archivos || []), a];
    if (a.type.startsWith('image/')) {
      try { localStorage.setItem('portal_archivo_' + dtTaskEntry.id + '_' + dtTaskEntry.archivos.length, a.dataUrl); } catch {}
    }
    renderDtArchivos();
    const body = dtLi.querySelector('.task-body');
    if (body) body.innerHTML = buildTaskBodyHtml(dtTaskEntry, dtVenceTexto);
    guardarPortalData();
  };
  reader.readAsDataURL(file);
});

// ── Eliminar tarea ──
document.getElementById('dtEliminar').addEventListener('click', () => {
  cerrarDetalleTarea();
  setTimeout(() => {
    dtLi.remove();
    const idx = eventsData.indexOf(dtTaskEntry);
    if (idx !== -1) eventsData.splice(idx, 1);

    // Limpiar TODOS los datos de localStorage asociados a esta tarea
    const tid = dtTaskEntry.id;
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k === 'portal_archivo_' + tid || k === 'portal_archivo_texto_' + tid || k.startsWith('portal_archivo_' + tid + '_'))) {
        keysToDelete.push(k);
      }
    }
    keysToDelete.forEach(k => localStorage.removeItem(k));

    if (dtTaskEntry.completada) {
      doneCount = Math.max(0, doneCount - 1);
      doneCountEl.textContent = doneCount;
      if (!doneList.querySelector('.task-item')) {
        const msg = document.createElement('li');
        msg.className = 'no-tasks-msg';
        msg.innerHTML = '<i class="fas fa-inbox"></i> Nada completado aún';
        doneList.appendChild(msg);
      }
    } else {
      if (!dtLista.querySelector('.task-item')) {
        const msg = document.createElement('li');
        msg.className = 'no-tasks-msg';
        msg.innerHTML = dtEsUrgente ? '<i class="fas fa-check"></i> Sin urgentes' : '<i class="fas fa-check"></i> Sin tareas esta semana';
        dtLista.appendChild(msg);
      }
    }
    actualizarCounts(); actualizarEventosList(); actualizarActividadesSemana();
    buildCalendar(calYear, calMonth); refrescarDetalleMateria?.();
    actualizarMatCards(); guardarPortalData();
  }, 100);
});

// ── Helper: HTML para adjuntos (URLs + archivos) en la tarjeta ──
function buildArchivoHtml(archivo) {
  if (!archivo) return '';
  if (archivo.type.startsWith('image/')) {
    return `<div class="task-attachment">
      <img src="${archivo.dataUrl}" alt="${escHtml(archivo.name)}" title="${escHtml(archivo.name)}"
           onclick="window.open(this.src,'_blank')"/>
      <a href="${archivo.dataUrl}" download="${escHtml(archivo.name)}">
        <i class="fas fa-download"></i>${escHtml(archivo.name)}
      </a>
    </div>`;
  }
  const iconos = { 'application/pdf':'fa-file-pdf','application/vnd.ms-powerpoint':'fa-file-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation':'fa-file-powerpoint','application/msword':'fa-file-word','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'fa-file-word','application/vnd.ms-excel':'fa-file-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'fa-file-excel' };
  const ico = iconos[archivo.type] || 'fa-file-alt';
  return `<div class="task-attachment">
    <a href="${archivo.dataUrl}" download="${escHtml(archivo.name)}">
      <i class="fas ${ico}"></i>${escHtml(archivo.name)}
    </a>
  </div>`;
}

function buildTaskBodyHtml(taskEntry, venceTexto) {
  const primerUrl = (taskEntry.urls || [])[0] || taskEntry.url || '';
  let html = `<h4>${taskLink(taskEntry.nombre, primerUrl)}</h4>
    <p><i class="fas fa-book"></i> ${escHtml(taskEntry.materia)} &nbsp;·&nbsp; <i class="fas fa-clock"></i> ${venceTexto}</p>`;
  (taskEntry.archivos || (taskEntry.archivo ? [taskEntry.archivo] : [])).forEach(a => {
    html += buildArchivoHtml(a);
  });
  return html;
}

function attachCheckboxHandler(li, lista, esUrgente, taskEntry) {
  li.querySelector('input[type=checkbox]').addEventListener('change', function() {
    if (this.checked) {
      li.classList.add('done-task');
      setTimeout(() => {
        li.remove();
        if (!lista.querySelector('.task-item')) {
          const msg = document.createElement('li');
          msg.className = 'no-tasks-msg';
          msg.innerHTML = esUrgente ? '<i class="fas fa-check"></i> Sin urgentes' : '<i class="fas fa-check"></i> Sin tareas pendientes';
          lista.appendChild(msg);
        }
        const doneMsg = doneList.querySelector('.no-tasks-msg');
        if (doneMsg) doneMsg.remove();
        doneList.appendChild(li);
        doneCount++; doneCountEl.textContent = doneCount;
        taskEntry.completada = true;
        actualizarCounts(); refrescarDetalleMateria();
        actualizarEventosList(); actualizarActividadesSemana();
        buildCalendar(calYear, calMonth); actualizarMatCards(); guardarPortalData();
      }, 280);
    } else {
      li.classList.remove('done-task');
      setTimeout(() => {
        li.remove();
        const noMsgDest = lista.querySelector('.no-tasks-msg');
        if (noMsgDest) noMsgDest.remove();
        lista.appendChild(li);
        doneCount--; doneCountEl.textContent = doneCount;
        if (!doneList.querySelector('.task-item')) {
          const msg = document.createElement('li');
          msg.className = 'no-tasks-msg';
          msg.innerHTML = '<i class="fas fa-inbox"></i> Nada completado aún';
          doneList.appendChild(msg);
        }
        taskEntry.completada = false;
        actualizarCounts(); refrescarDetalleMateria();
        actualizarEventosList(); actualizarActividadesSemana();
        buildCalendar(calYear, calMonth); actualizarMatCards(); guardarPortalData();
      }, 280);
    }
  });
}

function attachTaskClickHandler(li, taskEntry, lista, esUrgente, dotColor, venceTexto) {
  li.addEventListener('click', function(e) {
    if (e.target.closest('.task-check') || e.target.closest('.task-attachment')) return;
    abrirDetalleTarea(taskEntry, li, lista, esUrgente, dotColor, venceTexto);
  });
}

function crearTarea() {
  const nombre  = tareaNombre.value.trim();
  const materia = tareaMateria.value;
  const fecha   = tareaFecha.value;
  const urls    = recogerUrls();

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

  const esUrgente = diffDias <= 1;
  const lista     = esUrgente ? colUrgentes : colSemana;
  const dotColor  = diffDias <= 1 ? 'red' : diffDias <= 7 ? 'orange' : 'yellow';

  const archivo   = tareaArchivoData ? { ...tareaArchivoData } : null;
  const archivos  = archivo ? [archivo] : [];
  const id        = 't' + tareaIdCounter++;
  const taskEntry = { id, nombre, materia, vence, urls, archivos, completada: false };

  if (archivo?.type?.startsWith('image/') && archivo.dataUrl) {
    try { localStorage.setItem('portal_archivo_' + id, archivo.dataUrl); } catch {}
  }
  if (archivo && !archivo.type?.startsWith('image/') && archivo.textoExtraido) {
    try { localStorage.setItem('portal_archivo_texto_' + id, archivo.textoExtraido); } catch {}
  }

  const noMsg = lista.querySelector('.no-tasks-msg');
  if (noMsg) noMsg.remove();
  const li = document.createElement('li');
  li.className = 'task-item' + (esUrgente ? ' urgent' : '');
  li.id = 'tarea-' + id;

  li.innerHTML = `
    <div class="task-check">
      <input type="checkbox" id="${id}"/>
      <label for="${id}"></label>
    </div>
    <div class="task-body">${buildTaskBodyHtml(taskEntry, venceTexto)}</div>
    <span class="priority-dot ${dotColor}"></span>
  `;

  attachCheckboxHandler(li, lista, esUrgente, taskEntry);
  attachTaskClickHandler(li, taskEntry, lista, esUrgente, dotColor, venceTexto);

  lista.appendChild(li);
  eventsData.push(taskEntry);
  actualizarEventosList();
  actualizarActividadesSemana();
  buildCalendar(calYear, calMonth);
  actualizarCounts();
  actualizarMatCards();
  closeModalTarea();
}

function actualizarCounts() {
  colCountUrgentes.textContent = colUrgentes.querySelectorAll('.task-item:not(.done-task)').length;
  colCountSemana.textContent   = colSemana.querySelectorAll('.task-item:not(.done-task)').length;
  actualizarStats();
  guardarPortalData();
}

function guardarPortalData() {
  if (typeof window.syncPortalData === 'function') window.syncPortalData();
  try {
    // Tareas (incluye nombre de archivo adjunto si hay)
    const tareasSerial = eventsData.map(e => ({
      id:         e.id || '',
      nombre:     e.nombre,
      materia:    e.materia,
      vence:      e.vence instanceof Date ? e.vence.toISOString().split('T')[0] : e.vence,
      completada: e.completada,
      urls:       e.urls || (e.url ? [e.url] : []),
      archivos:   (e.archivos || (e.archivo ? [e.archivo] : [])).map(a => ({
        name: a.name, type: a.type,
        esImagen: a.type?.startsWith('image/') || false,
      })),
    }));
    localStorage.setItem('portal_tareas', JSON.stringify(tareasSerial));

    // Exámenes
    const examsSerial = examenesData.map(e => ({
      materia: e.materia,
      tema:    e.tema,
      vence:   e.vence instanceof Date ? e.vence.toISOString().split('T')[0] : e.vence,
      links:   e.links || [],
    }));
    localStorage.setItem('portal_examenes', JSON.stringify(examsSerial));

    // Exámenes completados
    const examsCompSerial = examenesCompletados.map(e => ({
      materia: e.materia,
      tema:    e.tema,
      vence:   e.vence instanceof Date ? e.vence.toISOString().split('T')[0] : e.vence,
      links:   e.links || [],
    }));
    localStorage.setItem('portal_examenes_completados', JSON.stringify(examsCompSerial));

    // Proyectos
    const proyectosSerial = proyectosData.map(p => ({
      materia: p.materia,
      tema:    p.tema,
      vence:   p.vence instanceof Date ? p.vence.toISOString().split('T')[0] : p.vence,
      links:   p.links || [],
    }));
    localStorage.setItem('portal_proyectos', JSON.stringify(proyectosSerial));

    // Proyectos completados
    const proyCompSerial = proyectosCompletados.map(p => ({
      materia: p.materia,
      tema:    p.tema,
      vence:   p.vence instanceof Date ? p.vence.toISOString().split('T')[0] : p.vence,
      links:   p.links || [],
    }));
    localStorage.setItem('portal_proyectos_completados', JSON.stringify(proyCompSerial));

    // Apuntes — serializar el DOM de cada fila
    const apuntesSerial = {};
    document.querySelectorAll('.apunte-row').forEach(row => {
      const materia = row.dataset.materia;
      if (!materia) return;
      apuntesSerial[materia] = [];
      row.querySelectorAll('.apunte-item').forEach(item => {
        const link = item.querySelector('a');
        const noteId = item.dataset.noteId || '';
        if (item.classList.contains('apunte-item-nota')) {
          apuntesSerial[materia].push({ tipo: 'nota', nombre: link?.textContent || 'Apunte', noteId });
        } else if (item.classList.contains('apunte-item-gdoc')) {
          apuntesSerial[materia].push({ tipo: 'gdoc', nombre: link?.textContent || 'Google Doc', url: link?.href || '' });
        } else {
          apuntesSerial[materia].push({ tipo: 'url', nombre: link?.textContent || '', url: link?.href || '' });
        }
      });
    });
    localStorage.setItem('portal_apuntes', JSON.stringify(apuntesSerial));
  } catch {}
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
  addLongPress(card, (x, y) => openCtxExamen({ clientX: x, clientY: y }, card));
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
  guardarPortalData();
  closeModalExamen();
}

// ── Context menu examen ──
const ctxMenuExamen  = document.getElementById('ctxMenuExamen');
let   ctxExamenTarget = null;

function openCtxExamen(e, card) {
  if (e.preventDefault) e.preventDefault();
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
  buildCalendar(calYear, calMonth); actualizarStats(); guardarPortalData();
});

// ── Marcar examen como completado ──
const examenesCompletados = [];

function marcarExamenCompletado() {
  if (!ctxExamenTarget) return;
  const entry = ctxExamenTarget._entry;
  const idx   = examenesData.indexOf(entry);
  if (idx > -1) examenesData.splice(idx, 1);
  examenesCompletados.push(entry);
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
  buildCalendar(calYear, calMonth); actualizarStats(); guardarPortalData();
}

document.getElementById('ctxExamenComplete').addEventListener('click', marcarExamenCompletado);

// ── Modal Completados Examen ──
const modalCompletadosExamen = document.getElementById('modalCompletadosExamen');

function abrirCompletadosExamen() {
  const body  = document.getElementById('completadosExamenBody');
  const empty = document.getElementById('completadosExamenEmpty');
  // Limpiar lista anterior
  body.querySelectorAll('.completados-examen-list').forEach(el => el.remove());

  if (!examenesCompletados.length) {
    if (!empty) {
      const e = document.createElement('div');
      e.className = 'empty-state'; e.id = 'completadosExamenEmpty';
      e.innerHTML = '<i class="fas fa-check-double"></i><p>Ningún examen marcado como completado</p>';
      body.appendChild(e);
    }
    modalCompletadosExamen.classList.add('open');
    return;
  }

  if (empty) empty.remove();

  const list = document.createElement('div');
  list.className = 'completados-examen-list';

  examenesCompletados.forEach((entry, i) => {
    const color = getMateriaColor(entry.materia);
    const fechaTxt = entry.vence instanceof Date
      ? entry.vence.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
      : entry.vence;

    const item = document.createElement('div');
    item.className = 'completado-examen-item';
    item.style.setProperty('--ec', color);
    item.innerHTML = `
      <div class="completado-examen-icon"><i class="fas fa-check"></i></div>
      <div class="completado-examen-info">
        <div class="completado-examen-materia">${escHtml(entry.materia)}</div>
        <div class="completado-examen-tema">${escHtml(entry.tema)}</div>
        <div class="completado-examen-fecha"><i class="fas fa-calendar-alt" style="margin-right:.3rem"></i>${fechaTxt}</div>
      </div>
      <div class="completado-examen-acciones">
        <button class="completado-examen-undo" title="Volver a exámenes" data-idx="${i}"><i class="fas fa-undo"></i> Deshacer</button>
        <button class="completado-examen-del" title="Eliminar" data-idx="${i}"><i class="fas fa-trash"></i></button>
      </div>`;
    list.appendChild(item);
  });

  list.addEventListener('click', e => {
    const btnUndo = e.target.closest('.completado-examen-undo');
    if (btnUndo) {
      const idx   = parseInt(btnUndo.dataset.idx, 10);
      const entry = examenesCompletados.splice(idx, 1)[0];
      examenesData.push(entry);
      const emptyEl = document.getElementById('examenesEmpty');
      if (emptyEl) emptyEl.remove();
      examenesGrid.appendChild(buildExamenCard(entry));
      actualizarEventosList(); actualizarActividadesSemana();
      buildCalendar(calYear, calMonth); actualizarStats(); guardarPortalData();
      abrirCompletadosExamen();
      return;
    }
    const btnDel = e.target.closest('.completado-examen-del');
    if (btnDel) {
      const idx = parseInt(btnDel.dataset.idx, 10);
      examenesCompletados.splice(idx, 1);
      guardarPortalData();
      abrirCompletadosExamen();
    }
  });

  body.appendChild(list);
  modalCompletadosExamen.classList.add('open');
}

function cerrarCompletadosExamen() { modalCompletadosExamen.classList.remove('open'); }

document.getElementById('btnCompletadosExamen').addEventListener('click', abrirCompletadosExamen);
document.getElementById('completadosExamenClose').addEventListener('click', cerrarCompletadosExamen);
document.getElementById('completadosExamenCerrar').addEventListener('click', cerrarCompletadosExamen);
modalCompletadosExamen.addEventListener('click', e => { if (e.target === modalCompletadosExamen) cerrarCompletadosExamen(); });

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

// ===== PROYECTOS =====
const modalProyecto      = document.getElementById('modalProyecto');
const proyectoMateria    = document.getElementById('proyectoMateria');
const proyectoTema       = document.getElementById('proyectoTema');
const proyectoFecha      = document.getElementById('proyectoFecha');
const proyectoUrl        = document.getElementById('proyectoUrl');
const proyectoNombreLink = document.getElementById('proyectoNombreLink');
const proyectosGrid      = document.getElementById('proyectosGrid');

// ── Modal nuevo proyecto ──
function openModalProyecto() {
  proyectoMateria.innerHTML = '<option value="" disabled selected>Seleccioná una materia...</option>';
  document.querySelectorAll('#materiasGrid .mat-card h3').forEach(h3 => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = h3.textContent;
    proyectoMateria.appendChild(opt);
  });
  proyectoFecha.min        = new Date().toISOString().split('T')[0];
  proyectoFecha.value      = '';
  proyectoTema.value       = '';
  proyectoUrl.value        = '';
  proyectoNombreLink.value = '';
  modalProyecto.classList.add('open');
  setTimeout(() => proyectoMateria.focus(), 120);
}
function closeModalProyecto() { modalProyecto.classList.remove('open'); }

document.getElementById('btnNuevoProyecto').addEventListener('click', openModalProyecto);
document.getElementById('proyectoClose').addEventListener('click',   closeModalProyecto);
document.getElementById('proyectoCancel').addEventListener('click',  closeModalProyecto);
modalProyecto.addEventListener('click', e => { if (e.target === modalProyecto) closeModalProyecto(); });
document.getElementById('proyectoConfirm').addEventListener('click', crearProyecto);
proyectoTema.addEventListener('keydown', e => { if (e.key === 'Enter') crearProyecto(); });

function buildProyectoCard(entry) {
  const hoy     = new Date(); hoy.setHours(0, 0, 0, 0);
  const diff    = Math.round((entry.vence - hoy) / 86400000);
  const pillCls = diff <= 2 ? 'hoy' : diff <= 7 ? 'pronto' : 'lejos';
  const pillTxt = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana'
    : diff <= 7 ? `En ${diff} días`
    : entry.vence.toLocaleDateString('es-AR', { day:'numeric', month:'long' });
  const diasTxt = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana'
    : diff < 0 ? 'Pasado' : `En ${diff} días`;

  const card = document.createElement('div');
  card.className = 'proyecto-card';
  card.style.setProperty('--pc', getMateriaColor(entry.materia));
  card.innerHTML = `
    <div class="proyecto-top">
      <span class="proyecto-materia-badge">${escHtml(entry.materia)}</span>
      <span class="proyecto-urgencia-pill ${pillCls}">${pillTxt}</span>
    </div>
    <div class="proyecto-tema">${escHtml(entry.tema)}</div>
    <div class="proyecto-footer">
      <span class="proyecto-fecha"><i class="fas fa-calendar-alt"></i>
        ${entry.vence.toLocaleDateString('es-AR', { weekday:'short', day:'numeric', month:'long' })}
      </span>
      <span class="proyecto-dias">${diasTxt}</span>
    </div>`;

  card._entry = entry;
  actualizarLinksCountProyectoCard(card, entry);
  card.addEventListener('click',       () => abrirDetalleProyecto(card));
  card.addEventListener('contextmenu', e  => openCtxProyecto(e, card));
  addLongPress(card, (x, y) => openCtxProyecto({ clientX: x, clientY: y }, card));
  return card;
}

function actualizarLinksCountProyectoCard(card, entry) {
  let el = card.querySelector('.proyecto-links-count');
  if (entry.links.length > 0) {
    if (!el) {
      el = document.createElement('div');
      el.className = 'proyecto-links-count';
      card.querySelector('.proyecto-footer').before(el);
    }
    const n = entry.links.length;
    el.innerHTML = `<i class="fas fa-link"></i> ${n} recurso${n > 1 ? 's' : ''}`;
  } else if (el) {
    el.remove();
  }
}

function crearProyecto() {
  const materia = proyectoMateria.value;
  const tema    = proyectoTema.value.trim();
  const fecha   = proyectoFecha.value;

  if (!materia) { proyectoMateria.focus(); return; }
  if (!tema)    { proyectoTema.focus();    return; }
  if (!fecha)   { proyectoFecha.focus();   return; }

  const url    = safeUrl(proyectoUrl.value.trim());
  const nombre = proyectoNombreLink.value.trim();
  const vence  = new Date(fecha + 'T00:00:00');
  const entry  = { materia, tema, vence, links: [] };
  if (url) entry.links.push({ url, nombre: nombre || tema });

  proyectosData.push(entry);

  const emptyEl = document.getElementById('proyectosEmpty');
  if (emptyEl) emptyEl.remove();

  proyectosGrid.appendChild(buildProyectoCard(entry));
  actualizarStats();
  guardarPortalData();
  closeModalProyecto();
}

// ── Context menu proyecto ──
const ctxMenuProyecto  = document.getElementById('ctxMenuProyecto');
let   ctxProyectoTarget = null;

function openCtxProyecto(e, card) {
  if (e.preventDefault) e.preventDefault();
  ctxProyectoTarget = card;
  const x = Math.min(e.clientX, window.innerWidth  - 220);
  const y = Math.min(e.clientY, window.innerHeight - 140);
  ctxMenuProyecto.style.left = x + 'px';
  ctxMenuProyecto.style.top  = y + 'px';
  ctxMenuProyecto.classList.add('open');
}
function closeCtxProyecto() { ctxMenuProyecto.classList.remove('open'); }

document.addEventListener('click',       closeCtxProyecto);
document.addEventListener('contextmenu', e => { if (!e.target.closest('.proyecto-card')) closeCtxProyecto(); });

// ── Marcar proyecto como completado ──
const proyectosCompletados = [];

function marcarProyectoCompletado() {
  if (!ctxProyectoTarget) return;
  const entry = ctxProyectoTarget._entry;
  const idx   = proyectosData.indexOf(entry);
  if (idx > -1) proyectosData.splice(idx, 1);
  proyectosCompletados.push(entry);
  ctxProyectoTarget.remove();
  ctxProyectoTarget = null;
  closeCtxProyecto();
  if (!proyectosGrid.querySelector('.proyecto-card')) {
    const msg = document.createElement('div');
    msg.className = 'empty-state'; msg.id = 'proyectosEmpty';
    msg.innerHTML = '<i class="fas fa-project-diagram"></i><p>No hay proyectos registrados</p>';
    proyectosGrid.appendChild(msg);
  }
  actualizarEventosList(); actualizarActividadesSemana();
  buildCalendar(calYear, calMonth); actualizarStats(); guardarPortalData();
}

document.getElementById('ctxProyectoComplete').addEventListener('click', marcarProyectoCompletado);

// ── Modal Completados Proyecto ──
const modalCompletadosProyecto = document.getElementById('modalCompletadosProyecto');

function abrirCompletadosProyecto() {
  const body  = document.getElementById('completadosProyectoBody');
  body.querySelectorAll('.completados-examen-list').forEach(el => el.remove());

  if (!proyectosCompletados.length) {
    if (!document.getElementById('completadosProyectoEmpty')) {
      const e = document.createElement('div');
      e.className = 'empty-state'; e.id = 'completadosProyectoEmpty';
      e.innerHTML = '<i class="fas fa-check-double"></i><p>Ningún proyecto marcado como completado</p>';
      body.appendChild(e);
    }
    modalCompletadosProyecto.classList.add('open');
    return;
  }

  const empty = document.getElementById('completadosProyectoEmpty');
  if (empty) empty.remove();

  const list = document.createElement('div');
  list.className = 'completados-examen-list';

  proyectosCompletados.forEach((entry, i) => {
    const color = getMateriaColor(entry.materia);
    const fechaTxt = entry.vence instanceof Date
      ? entry.vence.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
      : entry.vence;

    const item = document.createElement('div');
    item.className = 'completado-examen-item';
    item.style.setProperty('--ec', color);
    item.innerHTML = `
      <div class="completado-examen-icon"><i class="fas fa-check"></i></div>
      <div class="completado-examen-info">
        <div class="completado-examen-materia">${escHtml(entry.materia)}</div>
        <div class="completado-examen-tema">${escHtml(entry.tema)}</div>
        <div class="completado-examen-fecha"><i class="fas fa-calendar-alt" style="margin-right:.3rem"></i>${fechaTxt}</div>
      </div>
      <div class="completado-examen-acciones">
        <button class="completado-examen-undo" title="Volver a proyectos" data-idx="${i}"><i class="fas fa-undo"></i> Deshacer</button>
        <button class="completado-examen-del" title="Eliminar" data-idx="${i}"><i class="fas fa-trash"></i></button>
      </div>`;
    list.appendChild(item);
  });

  list.addEventListener('click', e => {
    const btnUndo = e.target.closest('.completado-examen-undo');
    if (btnUndo) {
      const idx   = parseInt(btnUndo.dataset.idx, 10);
      const entry = proyectosCompletados.splice(idx, 1)[0];
      proyectosData.push(entry);
      const emptyEl = document.getElementById('proyectosEmpty');
      if (emptyEl) emptyEl.remove();
      proyectosGrid.appendChild(buildProyectoCard(entry));
      actualizarEventosList(); actualizarActividadesSemana();
      buildCalendar(calYear, calMonth); actualizarStats(); guardarPortalData();
      abrirCompletadosProyecto();
      return;
    }
    const btnDel = e.target.closest('.completado-examen-del');
    if (btnDel) {
      const idx = parseInt(btnDel.dataset.idx, 10);
      proyectosCompletados.splice(idx, 1);
      guardarPortalData();
      abrirCompletadosProyecto();
    }
  });

  body.appendChild(list);
  modalCompletadosProyecto.classList.add('open');
}

function cerrarCompletadosProyecto() { modalCompletadosProyecto.classList.remove('open'); }

document.getElementById('btnCompletadosProyecto').addEventListener('click', abrirCompletadosProyecto);
document.getElementById('completadosProyectoClose').addEventListener('click', cerrarCompletadosProyecto);
document.getElementById('completadosProyectoCerrar').addEventListener('click', cerrarCompletadosProyecto);
modalCompletadosProyecto.addEventListener('click', e => { if (e.target === modalCompletadosProyecto) cerrarCompletadosProyecto(); });

// Eliminar proyecto
document.getElementById('ctxProyectoDelete').addEventListener('click', () => {
  if (!ctxProyectoTarget) return;
  const idx = proyectosData.indexOf(ctxProyectoTarget._entry);
  if (idx > -1) proyectosData.splice(idx, 1);
  ctxProyectoTarget.remove();
  ctxProyectoTarget = null;
  closeCtxProyecto();
  if (!proyectosGrid.querySelector('.proyecto-card')) {
    const msg = document.createElement('div');
    msg.className = 'empty-state'; msg.id = 'proyectosEmpty';
    msg.innerHTML = '<i class="fas fa-project-diagram"></i><p>No hay proyectos registrados</p>';
    proyectosGrid.appendChild(msg);
  }
  actualizarStats(); guardarPortalData();
});

// ── Renombrar proyecto ──
const modalProyectoRename = document.getElementById('modalProyectoRename');
const proyectoRenameInput = document.getElementById('proyectoRenameInput');

function openProyectoRename() {
  if (!ctxProyectoTarget) return;
  proyectoRenameInput.value = ctxProyectoTarget._entry.tema;
  modalProyectoRename.classList.add('open');
  setTimeout(() => { proyectoRenameInput.focus(); proyectoRenameInput.select(); }, 120);
  closeCtxProyecto();
}
function closeProyectoRename() { modalProyectoRename.classList.remove('open'); }

document.getElementById('ctxProyectoRename').addEventListener('click',      openProyectoRename);
document.getElementById('proyectoRenameClose').addEventListener('click',    closeProyectoRename);
document.getElementById('proyectoRenameCancel').addEventListener('click',   closeProyectoRename);
modalProyectoRename.addEventListener('click', e => { if (e.target === modalProyectoRename) closeProyectoRename(); });
document.getElementById('proyectoRenameConfirm').addEventListener('click',  guardarNombreProyecto);
proyectoRenameInput.addEventListener('keydown', e => { if (e.key === 'Enter') guardarNombreProyecto(); });

function guardarNombreProyecto() {
  const nombre = proyectoRenameInput.value.trim();
  if (!nombre || !ctxProyectoTarget) { proyectoRenameInput.focus(); return; }
  ctxProyectoTarget._entry.tema = nombre;
  ctxProyectoTarget.querySelector('.proyecto-tema').textContent = nombre;
  ctxProyectoTarget = null;
  closeProyectoRename();
  refrescarDetalleProyecto();
  guardarPortalData();
}

// ── Agregar URL a proyecto ──
const modalProyectoUrl  = document.getElementById('modalProyectoUrl');
const proyectoUrlInput  = document.getElementById('proyectoUrlInput');
const proyectoUrlNombre = document.getElementById('proyectoUrlNombre');

function openProyectoUrl() {
  if (!ctxProyectoTarget) return;
  proyectoUrlInput.value  = '';
  proyectoUrlNombre.value = '';
  modalProyectoUrl.classList.add('open');
  setTimeout(() => proyectoUrlInput.focus(), 120);
  closeCtxProyecto();
}
function closeProyectoUrl() { modalProyectoUrl.classList.remove('open'); }

document.getElementById('ctxProyectoAddUrl').addEventListener('click',   openProyectoUrl);
document.getElementById('proyectoUrlClose').addEventListener('click',    closeProyectoUrl);
document.getElementById('proyectoUrlCancel').addEventListener('click',   closeProyectoUrl);
modalProyectoUrl.addEventListener('click', e => { if (e.target === modalProyectoUrl) closeProyectoUrl(); });
document.getElementById('proyectoUrlConfirm').addEventListener('click',  agregarUrlProyecto);
proyectoUrlNombre.addEventListener('keydown', e => { if (e.key === 'Enter') agregarUrlProyecto(); });

function agregarUrlProyecto() {
  const url    = safeUrl(proyectoUrlInput.value.trim());
  const nombre = proyectoUrlNombre.value.trim();
  if (!url) { proyectoUrlInput.focus(); return; }
  if (!ctxProyectoTarget) return;
  const entry = ctxProyectoTarget._entry;
  entry.links.push({ url, nombre: nombre || entry.tema });
  actualizarLinksCountProyectoCard(ctxProyectoTarget, entry);
  ctxProyectoTarget = null;
  closeProyectoUrl();
  refrescarDetalleProyecto();
  guardarPortalData();
}

// ── Detalle proyecto (click izquierdo) ──
const modalDetalleProyecto = document.getElementById('modalDetalleProyecto');
let   proyectoDetalleActual = null;

function abrirDetalleProyecto(card) {
  proyectoDetalleActual = card;
  const entry = card._entry;
  const color = card.style.getPropertyValue('--pc') || '#e67e22';

  document.getElementById('detalleProyectoTitleSpan').textContent = entry.materia;

  const hoy  = new Date(); hoy.setHours(0, 0, 0, 0);
  const diff = Math.round((entry.vence - hoy) / 86400000);
  const fechaLarga = entry.vence.toLocaleDateString('es-AR',
    { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const diasStr = diff > 1 ? ` · En ${diff} días` : diff === 1 ? ' · Mañana'
    : diff === 0 ? ' · ¡Hoy!' : ' · Ya pasó';

  let html = `
    <div class="proyecto-detalle-header" style="--pc:${escHtml(color)}">
      <div class="proyecto-detalle-materia">${escHtml(entry.materia)}</div>
      <div class="proyecto-detalle-tema">${escHtml(entry.tema)}</div>
      <div class="proyecto-detalle-fecha"><i class="fas fa-calendar-alt"></i> ${fechaLarga}${diasStr}</div>
    </div>
    <div class="detalle-section-title"><i class="fas fa-link"></i> &nbsp;Recursos y material</div>`;

  if (entry.links.length > 0) {
    html += `<ul class="proyecto-links-list">`;
    entry.links.forEach(({ url, nombre }) => {
      html += `
        <li class="proyecto-link-item">
          <i class="fas fa-external-link-alt"></i>
          <a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer">${escHtml(nombre)}</a>
        </li>`;
    });
    html += `</ul>`;
  } else {
    html += `<div class="detalle-empty"><i class="fas fa-info-circle"></i> Sin recursos. Clic derecho en el proyecto para agregar una URL.</div>`;
  }

  document.getElementById('detalleProyectoBody').innerHTML = html;
  modalDetalleProyecto.classList.add('open');
}

function cerrarDetalleProyecto() {
  modalDetalleProyecto.classList.remove('open');
  proyectoDetalleActual = null;
}
function refrescarDetalleProyecto() {
  if (proyectoDetalleActual && modalDetalleProyecto.classList.contains('open'))
    abrirDetalleProyecto(proyectoDetalleActual);
}

document.getElementById('detalleProyectoClose').addEventListener('click',  cerrarDetalleProyecto);
document.getElementById('detalleProyectoCerrar').addEventListener('click', cerrarDetalleProyecto);
modalDetalleProyecto.addEventListener('click', e => { if (e.target === modalDetalleProyecto) cerrarDetalleProyecto(); });

// ===== RESTAURAR TAREAS DESDE LOCALSTORAGE =====
(function restaurarTareas() {
  try {
    const saved = JSON.parse(localStorage.getItem('portal_tareas') || '[]');
    if (!saved.length) return;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    saved.forEach(t => {
      const vence    = new Date(t.vence + 'T00:00:00');
      const diffDias = Math.round((vence - hoy) / 86400000);
      const esUrgente = diffDias <= 1;
      const dotColor  = diffDias <= 1 ? 'red' : diffDias <= 7 ? 'orange' : 'yellow';
      let venceTexto;
      if      (diffDias === 0) venceTexto = 'Vence hoy';
      else if (diffDias === 1) venceTexto = 'Vence mañana';
      else if (diffDias <= 7)  venceTexto = `Vence en ${diffDias} días`;
      else { const d = vence.toLocaleDateString('es-AR', { day:'numeric', month:'long' }); venceTexto = `Vence el ${d}`; }

      const id = t.id || ('t' + tareaIdCounter++);
      // Migrar formato viejo (url / archivoNombre) al nuevo (urls / archivos)
      const urls    = t.urls || (t.url ? [t.url] : []);
      const archivos = (t.archivos || []).map(a => ({
        name: a.name, type: a.type,
        dataUrl: a.dataUrl || (a.esImagen ? (localStorage.getItem('portal_archivo_' + id) || '') : '') || '',
        textoExtraido: (!a.esImagen && !(a.type || '').startsWith('image/'))
          ? (localStorage.getItem('portal_archivo_texto_' + id) || '') : ''
      }));
      const taskEntry = { id, nombre: t.nombre, materia: t.materia, vence, urls, archivos, completada: t.completada };
      eventsData.push(taskEntry);

      const lista = esUrgente ? colUrgentes : colSemana;
      const li = document.createElement('li');
      li.className = 'task-item' + (esUrgente && !t.completada ? ' urgent' : '') + (t.completada ? ' done-task' : '');
      li.id = 'tarea-' + id;
      li.innerHTML = `
        <div class="task-check">
          <input type="checkbox" id="${id}" ${t.completada ? 'checked' : ''}/>
          <label for="${id}"></label>
        </div>
        <div class="task-body">${buildTaskBodyHtml(taskEntry, venceTexto)}</div>
        <span class="priority-dot ${dotColor}"></span>`;

      attachCheckboxHandler(li, lista, esUrgente, taskEntry);
      attachTaskClickHandler(li, taskEntry, lista, esUrgente, dotColor, venceTexto);

      if (t.completada) {
        const noMsg = doneList.querySelector('.no-tasks-msg');
        if (noMsg) noMsg.remove();
        doneList.appendChild(li);
        doneCount++;
      } else {
        const noMsg = lista.querySelector('.no-tasks-msg');
        if (noMsg) noMsg.remove();
        lista.appendChild(li);
      }
    });
    doneCountEl.textContent = doneCount;
    actualizarMatCards();
  } catch(e) { console.error('restaurarTareas:', e); }
})();

// ===== RESTAURAR EXÁMENES DESDE LOCALSTORAGE =====
(function restaurarExamenes() {
  try {
    const saved = JSON.parse(localStorage.getItem('portal_examenes') || '[]');
    if (!saved.length) return;
    const emptyEl = document.getElementById('examenesEmpty');
    if (emptyEl) emptyEl.remove();
    saved.forEach(e => {
      const entry = { materia: e.materia, tema: e.tema, vence: new Date(e.vence + 'T00:00:00'), links: e.links || [] };
      examenesData.push(entry);
      examenesGrid.appendChild(buildExamenCard(entry));
    });
  } catch(e) { console.error('restaurarExamenes:', e); }
})();

// ===== RESTAURAR EXÁMENES COMPLETADOS DESDE LOCALSTORAGE =====
(function restaurarExamenesCompletados() {
  try {
    const saved = JSON.parse(localStorage.getItem('portal_examenes_completados') || '[]');
    saved.forEach(e => {
      examenesCompletados.push({ materia: e.materia, tema: e.tema, vence: new Date(e.vence + 'T00:00:00'), links: e.links || [] });
    });
  } catch(e) { console.error('restaurarExamenesCompletados:', e); }
})();

// ===== RESTAURAR PROYECTOS DESDE LOCALSTORAGE =====
(function restaurarProyectos() {
  try {
    const saved = JSON.parse(localStorage.getItem('portal_proyectos') || '[]');
    if (!saved.length) return;
    const emptyEl = document.getElementById('proyectosEmpty');
    if (emptyEl) emptyEl.remove();
    saved.forEach(p => {
      const entry = { materia: p.materia, tema: p.tema, vence: new Date(p.vence + 'T00:00:00'), links: p.links || [] };
      proyectosData.push(entry);
      proyectosGrid.appendChild(buildProyectoCard(entry));
    });
  } catch(e) { console.error('restaurarProyectos:', e); }
})();

// ===== RESTAURAR PROYECTOS COMPLETADOS DESDE LOCALSTORAGE =====
(function restaurarProyectosCompletados() {
  try {
    const saved = JSON.parse(localStorage.getItem('portal_proyectos_completados') || '[]');
    saved.forEach(p => {
      proyectosCompletados.push({ materia: p.materia, tema: p.tema, vence: new Date(p.vence + 'T00:00:00'), links: p.links || [] });
    });
  } catch(e) { console.error('restaurarProyectosCompletados:', e); }
})();

// ===== INIT =====
buildCalendar(calYear, calMonth);
refreshDoneList();
actualizarEventosList();
actualizarActividadesSemana();
actualizarStats();
