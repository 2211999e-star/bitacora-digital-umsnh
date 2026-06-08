/**
 * dashboard.js
 * Dashboard, gráficos y notificaciones por fechas.
 */

import {
  state,
  formatDate,
  toDateOnly,
  daysDiffFromToday,
  getStatusText,
  getBadgeClass,
  getStatusColor,
  getPriorityText,
} from './utils.js';

// =========================
// Notificaciones / recordatorios por fechas
// =========================
const REMINDER_EVENT_DAYS = 3; // Eventos próximos: 3 días
const REMINDER_DELIVERY_DAYS = 1; // Entregas próximas: 1 día

function parseEmbeddedMeta(text = '') {
  const raw = String(text || '');
  const lines = raw.split('\n');
  const idx = lines.findIndex((l) => l.trim().startsWith('__meta__='));
  if (idx === -1) return { meta: {}, cleanText: raw };
  try {
    const meta = JSON.parse(lines[idx].trim().slice('__meta__='.length));
    return {
      meta: meta && typeof meta === 'object' ? meta : {},
      cleanText: lines.filter((_, i) => i !== idx).join('\n').trim(),
    };
  } catch {
    return { meta: {}, cleanText: lines.filter((_, i) => i !== idx).join('\n').trim() };
  }
}

function getActivityDisplayName(activity = {}) {
  const { meta } = parseEmbeddedMeta(activity.observations || '');
  return (
    activity.brand ||
    activity.model ||
    meta.folio ||
    activity.reporter_name ||
    activity.department ||
    'Incidencia'
  );
}

function getMaintenanceType(activity = {}) {
  const { meta } = parseEmbeddedMeta(activity.observations || '');
  const raw = String(meta.mantenimiento || '').toLowerCase().trim();
  if (raw === 'preventivo' || raw === 'correctivo') return raw;

  const st = String(activity.service_type || '').toLowerCase();
  if (st.includes('mantenimiento preventivo')) return 'preventivo';
  if (st.includes('mantenimiento correctivo')) return 'correctivo';
  return 'correctivo';
}

function getCriticalActivities(limit = 5) {
  return (state.activitiesData || [])
    .filter((a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase()))
    .map((a) => ({ ...a, __deliveryDays: a.delivery_date ? daysDiffFromToday(a.delivery_date) : null }))
    .filter((a) => {
      const priority = String(a.priority || '').toLowerCase();
      return priority === 'urgente' || priority === 'alta' || (typeof a.__deliveryDays === 'number' && a.__deliveryDays < 0);
    })
    .sort((a, b) => {
      const pa = String(a.priority || '').toLowerCase() === 'urgente' ? 3 : String(a.priority || '').toLowerCase() === 'alta' ? 2 : 1;
      const pb = String(b.priority || '').toLowerCase() === 'urgente' ? 3 : String(b.priority || '').toLowerCase() === 'alta' ? 2 : 1;
      const da = typeof a.__deliveryDays === 'number' ? a.__deliveryDays : 9999;
      const db = typeof b.__deliveryDays === 'number' ? b.__deliveryDays : 9999;
      if (da !== db) return da - db;
      return pb - pa;
    })
    .slice(0, limit);
}

function getNextSevenWindow(limit = 7) {
  const events = (state.eventsData || [])
    .filter((e) => e && e.event_date)
    .filter((e) => !['completado', 'cancelado'].includes(String(e.status || '').toLowerCase()))
    .map((e) => ({
      ...e,
      __type: 'event',
      __days: daysDiffFromToday(e.event_date),
      __label: e.title || 'Evento',
      __when: e.event_date,
    }))
    .filter((e) => typeof e.__days === 'number' && e.__days >= 0 && e.__days <= 7);

  const deliveries = (state.activitiesData || [])
    .filter((a) => a && a.delivery_date)
    .filter((a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase()))
    .map((a) => ({
      ...a,
      __type: 'delivery',
      __days: daysDiffFromToday(a.delivery_date),
      __label: getActivityDisplayName(a),
      __when: a.delivery_date,
    }))
    .filter((a) => typeof a.__days === 'number' && a.__days >= 0 && a.__days <= 7);

  return [...events, ...deliveries]
    .sort((a, b) => {
      if (a.__days !== b.__days) return a.__days - b.__days;
      return String(a.__when || '').localeCompare(String(b.__when || ''));
    })
    .slice(0, limit);
}

function renderMaintenanceCalendar() {
  const container = document.getElementById('dashboard-calendar');
  const monthEl = document.getElementById('dashboard-calendar-month');
  const summaryEl = document.getElementById('dashboard-calendar-summary');
  if (!container) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const startWeekDay = monthStart.getDay();
  const totalDays = monthEnd.getDate();
  const todayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const eventMap = new Map();
  (state.eventsData || []).forEach((e) => {
    if (!e?.event_date) return;
    eventMap.set(e.event_date, { ...(eventMap.get(e.event_date) || {}), event: true });
  });
  (state.activitiesData || []).forEach((a) => {
    if (!a?.delivery_date) return;
    const prev = eventMap.get(a.delivery_date) || {};
    const overdue = daysDiffFromToday(a.delivery_date) < 0 && !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase());
    eventMap.set(a.delivery_date, { ...prev, delivery: true, overdue: prev.overdue || overdue });
  });

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  if (monthEl) monthEl.textContent = `${monthNames[month]} ${year}`;

  const cells = [];
  weekDays.forEach((d) => cells.push(`<div class="dashboard-calendar-day">${d}</div>`));
  for (let i = 0; i < startWeekDay; i++) {
    cells.push('<div class="dashboard-calendar-cell is-muted"></div>');
  }
  for (let day = 1; day <= totalDays; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const flags = eventMap.get(key) || {};
    const classes = [
      'dashboard-calendar-cell',
      key === todayKey ? 'is-today' : '',
      flags.overdue ? 'is-overdue' : '',
      !flags.overdue && flags.delivery ? 'has-delivery' : '',
      !flags.overdue && flags.event ? 'has-event' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const interactive = flags.event || flags.delivery || flags.overdue;
    cells.push(
      `<div class="${classes}${interactive ? ' is-interactive' : ''}" ${interactive ? `data-date="${key}"` : ''} title="${key}">${day}</div>`,
    );
  }

  container.innerHTML = cells.join('');
  wireCalendarClicks();

  const nextRows = getNextSevenWindow(4);
  if (summaryEl) {
    summaryEl.innerHTML = nextRows.length
      ? nextRows
          .map((row) => `${row.__type === 'event' ? 'Evento' : 'Entrega'}: <b>${row.__label}</b> ${row.__days === 0 ? '(Hoy)' : row.__days === 1 ? '(Mañana)' : `(En ${row.__days} días)`}`)
          .join('<br>')
      : 'Sin eventos ni entregas cercanas en los próximos 7 días.';
  }
}

function wireCalendarClicks() {
  const container = document.getElementById('dashboard-calendar');
  if (!container || container.dataset.wired) return;
  container.dataset.wired = 'true';

  container.addEventListener('click', (e) => {
    const cell = e.target?.closest?.('.dashboard-calendar-cell[data-date]');
    const dateKey = cell?.getAttribute?.('data-date');
    if (!dateKey) return;
    showCalendarAgenda(dateKey);
  });
}

export function showCalendarAgenda(dateKey) {
  try {
    const events = (state.eventsData || [])
      .filter((e) => e && e.event_date === dateKey)
      .filter((e) => !['completado', 'cancelado'].includes(String(e.status || '').toLowerCase()));

    const deliveries = (state.activitiesData || [])
      .filter((a) => a && a.delivery_date === dateKey)
      .filter((a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase()));

    const html = `
      <div class="text-left">
        <p class="text-sm text-gray-600 dark:text-gray-300">Agenda del día</p>
        <p class="text-sm font-semibold text-gray-900 dark:text-white mt-1">${formatDate(dateKey)}</p>

        ${events.length ? `
          <div class="mt-4">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">Eventos</p>
            <div class="mt-2 space-y-2">
              ${events
                .slice(0, 8)
                .map(
                  (ev) => `
                    <div class="p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${ev.title || 'Evento'}</p>
                          <p class="text-xs text-gray-600 dark:text-gray-400">${ev.event_time ? `${ev.event_time} • ` : ''}${ev.location || 'Sin ubicación'}</p>
                        </div>
                        <button class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs font-semibold" onclick="window.showSection?.('events'); setTimeout(() => window.editEvent?.('${ev.id}'), 50)">Ver</button>
                      </div>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>
        ` : ''}

        ${deliveries.length ? `
          <div class="mt-4">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">Entregas</p>
            <div class="mt-2 space-y-2">
              ${deliveries
                .slice(0, 8)
                .map(
                  (a) => `
                    <div class="p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${getActivityDisplayName(a)}</p>
                          <p class="text-xs text-gray-600 dark:text-gray-400">${a.department || 'Sin área'} • ${getStatusText(a.task_status)}${a.priority ? ` • ${getPriorityText(a.priority)}` : ''}</p>
                        </div>
                        <button class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs font-semibold" onclick="window.showSection?.('activities'); setTimeout(() => window.viewActivity?.('${a.id}'), 50)">Ver</button>
                      </div>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>
        ` : ''}

        ${!events.length && !deliveries.length ? `
          <div class="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/60 dark:bg-gray-800/30">
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Sin agenda</p>
            <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">No hay eventos ni entregas programadas para este día.</p>
          </div>
        ` : ''}
      </div>
    `;

    Swal.fire({
      icon: 'info',
      title: 'Calendario',
      html,
      showCancelButton: true,
      confirmButtonText: 'Ir a Dashboard',
      cancelButtonText: 'Cerrar',
    });
  } catch (e) {
    console.error(e);
  }
}

function renderOperationalSummary() {
  const total = state.activitiesData.length;
  const completed = state.activitiesData.filter((a) => a.task_status === 'completado').length;
  const corrective = state.activitiesData.filter((a) => getMaintenanceType(a) === 'correctivo');
  const correctiveOpen = corrective.filter((a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase())).length;
  const historyEl = document.getElementById('stat-history-total');
  const historyCompletionEl = document.getElementById('stat-history-completion');
  const correctiveTotalEl = document.getElementById('stat-corrective-total');
  const correctiveOpenEl = document.getElementById('stat-corrective-open');
  const correctiveClosedEl = document.getElementById('stat-corrective-closed');

  if (historyEl) historyEl.textContent = String(total);
  if (historyCompletionEl) historyCompletionEl.textContent = `${total ? Math.round((completed / total) * 100) : 0}% completadas`;
  if (correctiveTotalEl) correctiveTotalEl.textContent = String(corrective.length);
  if (correctiveOpenEl) correctiveOpenEl.textContent = String(correctiveOpen);
  if (correctiveClosedEl) correctiveClosedEl.textContent = String(corrective.filter((a) => a.task_status === 'completado').length);

  const updatedAtEl = document.getElementById('dashboard-updated-at');
  if (updatedAtEl) {
    const now = new Date();
    updatedAtEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} · ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }
}

export function renderHealthSummary() {
  const okEl = document.getElementById('dashboard-health-ok');
  const warningEl = document.getElementById('dashboard-health-warning');
  const urgentEl = document.getElementById('dashboard-health-urgent');

  const all = state.activitiesData || [];
  const ok = all.filter((a) => String(a.task_status || '').toLowerCase() === 'completado').length;
  const warning = all.filter((a) => ['pendiente', 'en_proceso'].includes(String(a.task_status || '').toLowerCase())).length;
  const urgent = all.filter((a) => {
    const priority = String(a.priority || '').toLowerCase();
    const overdue = a.delivery_date ? daysDiffFromToday(a.delivery_date) < 0 : false;
    return priority === 'urgente' || overdue;
  }).length;

  if (okEl) okEl.textContent = String(ok);
  if (warningEl) warningEl.textContent = String(warning);
  if (urgentEl) urgentEl.textContent = String(urgent);
}

export function renderStatusDistribution() {
  const container = document.getElementById('dashboard-status-distribution');
  if (!container) return;

  const rows = [
    { key: 'pendiente', label: 'Pendiente', color: '#f59e0b' },
    { key: 'en_proceso', label: 'En proceso', color: '#3b82f6' },
    { key: 'completado', label: 'Completado', color: '#10b981' },
    { key: 'cancelado', label: 'Cancelado', color: '#6b7280' },
  ];
  const total = (state.activitiesData || []).length || 1;

  container.innerHTML = rows
    .map((row) => {
      const count = (state.activitiesData || []).filter((a) => a.task_status === row.key).length;
      const percent = Math.round((count / total) * 100);
      return `
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 min-w-0">
              <span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${row.color}"></span>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">${row.label}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">${count}</p>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">${percent}%</p>
            </div>
          </div>
          <div class="dashboard-meter-track">
            <div class="dashboard-meter-fill" style="width:${percent}%; background:${row.color}"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

export function renderExecutiveAlerts() {
  const container = document.getElementById('dashboard-alerts');
  const badgeEl = document.getElementById('dashboard-alert-badge');
  if (!container) return;

  const urgentActivities = (state.activitiesData || [])
    .filter((a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase()))
    .filter((a) => {
      const p = String(a.priority || '').toLowerCase();
      const dd = a.delivery_date ? daysDiffFromToday(a.delivery_date) : null;
      return p === 'urgente' || (typeof dd === 'number' && dd <= 1);
    })
    .slice(0, 3);

  const urgentEvents = getUpcomingEvents(1).slice(0, 2);
  const totalAlerts = urgentActivities.length + urgentEvents.length;
  if (badgeEl) badgeEl.textContent = `${totalAlerts} alertas`;

  if (!totalAlerts) {
    container.innerHTML = `
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/60 dark:bg-gray-800/30">
        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Operación estable</p>
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">No hay urgencias ni vencimientos inmediatos.</p>
      </div>
    `;
    return;
  }

  const blocks = [
    ...urgentActivities.map((a) => {
      const dd = a.delivery_date ? daysDiffFromToday(a.delivery_date) : null;
      return `
        <div class="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10 p-4">
          <p class="text-sm font-semibold text-red-800 dark:text-red-200">${getActivityDisplayName(a)}</p>
          <p class="text-xs text-red-700/80 dark:text-red-300/80 mt-1">${a.service_type || 'Servicio'} • ${a.department || 'Sin área'}</p>
          <p class="text-xs text-red-700/80 dark:text-red-300/80 mt-2">${dd == null ? 'Prioridad urgente' : dd < 0 ? 'Entrega vencida' : dd === 0 ? 'Entrega hoy' : 'Entrega mañana'}</p>
        </div>
      `;
    }),
    ...urgentEvents.map((e) => `
      <div class="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10 p-4">
        <p class="text-sm font-semibold text-blue-800 dark:text-blue-200">${e.title || 'Evento'}</p>
        <p class="text-xs text-blue-700/80 dark:text-blue-300/80 mt-1">${formatDate(e.event_date)}${e.event_time ? ` • ${e.event_time}` : ''}${e.location ? ` • ${e.location}` : ''}</p>
        <p class="text-xs text-blue-700/80 dark:text-blue-300/80 mt-2">${e.__days === 0 ? 'Programado hoy' : 'Programado mañana'}</p>
      </div>
    `),
  ];

  container.innerHTML = blocks.join('');
}

function getUpcomingEvents(daysAhead = REMINDER_EVENT_DAYS) {
  return (state.eventsData || [])
    .filter((e) => e && e.event_date)
    .filter((e) => !['completado', 'cancelado'].includes(String(e.status || '').toLowerCase()))
    .map((e) => ({ ...e, __days: daysDiffFromToday(e.event_date) }))
    .filter((e) => e.__days != null && e.__days >= 0 && e.__days <= daysAhead)
    .sort((a, b) => a.__days - b.__days);
}

function getDeliveryDueActivities(daysAhead = REMINDER_DELIVERY_DAYS) {
  return (state.activitiesData || [])
    .filter((a) => a && a.delivery_date)
    .filter((a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase()))
    .map((a) => ({ ...a, __days: daysDiffFromToday(a.delivery_date) }))
    .filter((a) => a.__days != null && a.__days >= 0 && a.__days <= daysAhead)
    .sort((a, b) => a.__days - b.__days);
}

function getOverdueEvents() {
  return (state.eventsData || [])
    .filter((e) => e && e.event_date)
    .filter((e) => !['completado', 'cancelado'].includes(String(e.status || '').toLowerCase()))
    .map((e) => ({ ...e, __days: daysDiffFromToday(e.event_date) }))
    .filter((e) => e.__days != null && e.__days < 0)
    .sort((a, b) => a.__days - b.__days);
}

function getOverdueDeliveries() {
  return (state.activitiesData || [])
    .filter((a) => a && a.delivery_date)
    .filter((a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase()))
    .map((a) => ({ ...a, __days: daysDiffFromToday(a.delivery_date) }))
    .filter((a) => a.__days != null && a.__days < 0)
    .sort((a, b) => a.__days - b.__days);
}

export function updateNotificationBadge() {
  const badge = document.getElementById('notification-badge');
  if (!badge) return;

  // Contador orientado a "fechas": próximos eventos + entregas próximas
  const upcomingEvents = getUpcomingEvents(REMINDER_EVENT_DAYS).length;
  const dueDeliveries = getDeliveryDueActivities(REMINDER_DELIVERY_DAYS).length;
  const overdueEvents = getOverdueEvents().length;
  const overdueDeliveries = getOverdueDeliveries().length;
  const total = upcomingEvents + dueDeliveries + overdueEvents + overdueDeliveries;

  if (total > 0) {
    badge.textContent = String(total);
    badge.classList.remove('hidden');
    badge.classList.add('notification-pulse');
  } else {
    badge.textContent = '';
    badge.classList.add('hidden');
    badge.classList.remove('notification-pulse');
  }
}

export function renderDashboardReminders() {
  const container = document.getElementById('dashboard-reminders');
  if (!container) return;

  const upcoming = getUpcomingEvents(REMINDER_EVENT_DAYS).slice(0, 4);
  const due = getDeliveryDueActivities(REMINDER_DELIVERY_DAYS).slice(0, 4);

  const formatWhen = (days) => {
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Mañana';
    return `En ${days} días`;
  };

  if (!upcoming.length && !due.length) {
    container.innerHTML = `
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/60 dark:bg-gray-800/30">
        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Sin recordatorios</p>
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">No hay eventos próximos ni entregas cercanas.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    ${upcoming.length ? `
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white/60 dark:bg-gray-900/40">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Eventos próximos</p>
          <span class="text-[11px] px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">${getUpcomingEvents(REMINDER_EVENT_DAYS).length}</span>
        </div>
        <div class="mt-2 space-y-2">
          ${upcoming.map((e) => `
            <div class="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${e.title || '—'}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-400 truncate">
                    ${formatDate(e.event_date)} ${e.event_time ? `• ${e.event_time}` : ''} ${e.location ? `• ${e.location}` : ''}
                  </p>
                </div>
                <span class="text-xs font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">${formatWhen(e.__days)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${due.length ? `
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white/60 dark:bg-gray-900/40">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Entregas próximas</p>
          <span class="text-[11px] px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800">${getDeliveryDueActivities(REMINDER_DELIVERY_DAYS).length}</span>
        </div>
        <div class="mt-2 space-y-2">
          ${due.map((i) => `
            <div class="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${i.reporter_name || '—'} • ${i.department || '—'}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-400 truncate">
                    Entrega: ${formatDate(i.delivery_date)} • ${getStatusText(i.task_status)}
                  </p>
                </div>
                <span class="text-xs font-semibold text-orange-700 dark:text-orange-300 whitespace-nowrap">${formatWhen(i.__days)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

export function renderDashboardInsights() {
  // KPIs
  const upcomingEventsEl = document.getElementById('kpi-upcoming-events');
  const overdueEventsEl = document.getElementById('kpi-overdue-events');
  const dueDeliveriesEl = document.getElementById('kpi-due-deliveries');
  const overdueDeliveriesEl = document.getElementById('kpi-overdue-deliveries');
  const completionRateEl = document.getElementById('kpi-completion-rate');
  const avgResolutionEl = document.getElementById('kpi-avg-resolution');
  const createdTodayEl = document.getElementById('kpi-created-today');
  const deliveredTodayEl = document.getElementById('kpi-delivered-today');

  const upcomingEvents = getUpcomingEvents(REMINDER_EVENT_DAYS);
  const overdueEvents = getOverdueEvents();
  const dueDeliveries = getDeliveryDueActivities(REMINDER_DELIVERY_DAYS);
  const overdueDeliveries = getOverdueDeliveries();

  if (upcomingEventsEl) upcomingEventsEl.textContent = String(upcomingEvents.length);
  if (overdueEventsEl) overdueEventsEl.textContent = String(overdueEvents.length);
  if (dueDeliveriesEl) dueDeliveriesEl.textContent = String(dueDeliveries.length);
  if (overdueDeliveriesEl) overdueDeliveriesEl.textContent = String(overdueDeliveries.length);

  const total = (state.activitiesData || []).length || 0;
  const completed = (state.activitiesData || []).filter((a) => a.task_status === 'completado').length;
  const rate = total ? Math.round((completed / total) * 100) : 0;
  if (completionRateEl) completionRateEl.textContent = `${rate}%`;

  // Tiempo promedio (recibido -> entrega) en completadas
  const durations = (state.activitiesData || [])
    .filter((a) => a.task_status === 'completado')
    .map((a) => {
      const received = toDateOnly(a.received_date || a.date);
      const delivered = toDateOnly(a.delivery_date);
      if (!received || !delivered) return null;
      const diffMs = delivered.getTime() - received.getTime();
      return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    })
    .filter((n) => typeof n === 'number');
  const avg = durations.length ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length) : null;
  if (avgResolutionEl) avgResolutionEl.textContent = avg == null ? '—' : `${avg} día${avg === 1 ? '' : 's'}`;

  // Hoy: creadas y entregadas
  const today = new Date().toISOString().split('T')[0];
  const createdToday = (state.activitiesData || []).filter((a) => String(a.date || '').slice(0, 10) === today).length;
  const deliveredToday = (state.activitiesData || []).filter(
    (a) => a.task_status === 'completado' && String(a.delivery_date || '').slice(0, 10) === today,
  ).length;
  if (createdTodayEl) createdTodayEl.textContent = String(createdToday);
  if (deliveredTodayEl) deliveredTodayEl.textContent = String(deliveredToday);

  // Top departamentos / servicios
  const topDeptEl = document.getElementById('dashboard-top-departments');
  const topServicesEl = document.getElementById('dashboard-top-services');

  const countBy = (rows, field) => {
    const m = new Map();
    (rows || []).forEach((r) => {
      const k = String(r && r[field] ? r[field] : 'Sin especificar').trim() || 'Sin especificar';
      m.set(k, (m.get(k) || 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const dept = countBy(state.activitiesData, 'department').slice(0, 6);
  const services = countBy(state.activitiesData, 'service_type').slice(0, 6);
  const maxDept = dept[0]?.[1] || 1;
  const maxSvc = services[0]?.[1] || 1;

  if (topDeptEl) {
    topDeptEl.innerHTML = dept.length
      ? dept
          .map(
            ([name, value]) => `
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">${name}</p>
                <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mt-1">
                  <div class="h-2 rounded-full bg-black dark:bg-white" style="width:${Math.round((value / maxDept) * 100)}%"></div>
                </div>
              </div>
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${value}</span>
            </div>
          `,
          )
          .join('')
      : `<p class="text-sm text-gray-500 dark:text-gray-400">Sin datos todavía.</p>`;
  }

  if (topServicesEl) {
    topServicesEl.innerHTML = services.length
      ? services
          .map(
            ([name, value]) => `
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">${name}</p>
                <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mt-1">
                  <div class="h-2 rounded-full bg-black dark:bg-white" style="width:${Math.round((value / maxSvc) * 100)}%"></div>
                </div>
              </div>
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${value}</span>
            </div>
          `,
          )
          .join('')
      : `<p class="text-sm text-gray-500 dark:text-gray-400">Sin datos todavía.</p>`;
  }
}

export function renderCriticalItems() {
  const container = document.getElementById('dashboard-critical-items');
  const statEl = document.getElementById('stat-critical-open');
  const badgeEl = document.getElementById('badge-critical-open');
  if (!container) return;

  const critical = getCriticalActivities(5);
  const totalCritical = getCriticalActivities(999).length;
  if (statEl) statEl.textContent = String(totalCritical);
  if (badgeEl) badgeEl.textContent = `${totalCritical} abiertas`;

  if (!critical.length) {
    container.innerHTML = `
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/60 dark:bg-gray-800/30">
        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Sin críticos activos</p>
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">No hay incidencias urgentes, altas o vencidas en este momento.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = critical
    .map((item) => {
      const overdue = typeof item.__deliveryDays === 'number' && item.__deliveryDays < 0;
      return `
        <div class="rounded-xl border ${overdue ? 'border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-800'} p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${getActivityDisplayName(item)}</p>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                ${item.service_type || 'Servicio'} • ${item.department || 'Sin área'}${item.coordination ? ` • ${item.coordination}` : ''}
              </p>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Estado: ${getStatusText(item.task_status)} • Prioridad: ${getPriorityText(item.priority)}
              </p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <span class="badge badge-${getBadgeClass(item.task_status)}">${getStatusText(item.task_status)}</span>
              <button class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs font-semibold" onclick="window.showSection?.('activities'); setTimeout(() => window.viewActivity?.('${item.id}'), 50)">Ver</button>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
            ${overdue ? `<span class="status-chip status-warning">Entrega vencida</span>` : ''}
            ${String(item.priority || '').toLowerCase() === 'urgente' ? `<span class="status-chip status-warning">Urgente</span>` : ''}
            ${String(item.priority || '').toLowerCase() === 'alta' ? `<span class="status-chip status-muted">Alta prioridad</span>` : ''}
          </div>
        </div>
      `;
    })
    .join('');
}

export function renderNextSevenDays() {
  const container = document.getElementById('dashboard-next-window');
  const badgeEl = document.getElementById('badge-next-seven');
  if (!container) return;

  const rows = getNextSevenWindow(7);
  if (badgeEl) badgeEl.textContent = `${rows.length} registros`;

  const formatWhen = (days) => {
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Mañana';
    return `En ${days} días`;
  };

  if (!rows.length) {
    container.innerHTML = `
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/60 dark:bg-gray-800/30">
        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Sin actividad próxima</p>
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">No hay eventos ni entregas programadas para los próximos 7 días.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = rows
    .map((row) => `
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[11px] px-2 py-1 rounded-full ${row.__type === 'event' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-200 border border-orange-200 dark:border-orange-800'}">
                ${row.__type === 'event' ? 'Evento' : 'Entrega'}
              </span>
            </div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white mt-2 truncate">${row.__label}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
              ${formatDate(row.__when)}${row.__type === 'event' && row.event_time ? ` • ${row.event_time}` : ''}${row.location ? ` • ${row.location}` : ''}${row.department ? ` • ${row.department}` : ''}
            </p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <span class="text-xs font-semibold ${row.__type === 'event' ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'} whitespace-nowrap">${formatWhen(row.__days)}</span>
            <button class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs font-semibold" onclick="${
              row.__type === 'event'
                ? `window.showSection?.('events'); setTimeout(() => window.editEvent?.('${row.id}'), 50)`
                : `window.showSection?.('activities'); setTimeout(() => window.viewActivity?.('${row.id}'), 50)`
            }">Ver</button>
          </div>
        </div>
      </div>
    `)
    .join('');
}

export function showNotifications() {
  const upcoming = getUpcomingEvents(REMINDER_EVENT_DAYS).slice(0, 8);
  const due = getDeliveryDueActivities(REMINDER_DELIVERY_DAYS).slice(0, 8);
  const overdueE = getOverdueEvents().slice(0, 8);
  const overdueD = getOverdueDeliveries().slice(0, 8);

  const formatWhen = (days) => {
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Mañana';
    return `En ${days} días`;
  };

  const html = `
    <div class="text-left">
      <p class="text-sm text-gray-600 dark:text-gray-300">Recordatorios por fecha</p>

      <div class="mt-3 grid grid-cols-1 gap-3">
        ${overdueE.length ? `
          <div class="rounded-xl border border-red-200 dark:border-red-900/40 p-3 bg-red-50/60 dark:bg-red-900/10">
            <div class="flex items-center justify-between">
              <p class="font-semibold text-red-800 dark:text-red-200">Eventos atrasados</p>
              <span class="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">${getOverdueEvents().length}</span>
            </div>
            <div class="mt-2 space-y-2">
              ${overdueE
                .map(
                  (e) => `
                  <div class="p-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-white/70 dark:bg-gray-900/30">
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">${e.title || '—'}</p>
                    <p class="text-xs text-gray-700 dark:text-gray-300">Fecha: ${formatDate(e.event_date)} ${e.event_time ? `• ${e.event_time}` : ''}</p>
                  </div>
                `,
                )
                .join('')}
            </div>
          </div>
        ` : ''}

        <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white/60 dark:bg-gray-900/40">
          <div class="flex items-center justify-between">
            <p class="font-semibold text-gray-900 dark:text-gray-100">Eventos próximos (${REMINDER_EVENT_DAYS} días)</p>
            <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">${getUpcomingEvents(REMINDER_EVENT_DAYS).length}</span>
          </div>
          <div class="mt-2 space-y-2">
            ${upcoming.length
              ? upcoming
                  .map(
                    (e) => `
                  <div class="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${e.title || '—'}</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400">
                          ${formatDate(e.event_date)} ${e.event_time ? `• ${e.event_time}` : ''} ${e.location ? `• ${e.location}` : ''}
                        </p>
                      </div>
                      <span class="text-xs font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">${formatWhen(e.__days)}</span>
                    </div>
                  </div>
                `,
                  )
                  .join('')
              : `<p class="text-xs text-gray-600 dark:text-gray-400">No hay eventos próximos.</p>`}
          </div>
        </div>

        ${overdueD.length ? `
          <div class="rounded-xl border border-red-200 dark:border-red-900/40 p-3 bg-red-50/60 dark:bg-red-900/10">
            <div class="flex items-center justify-between">
              <p class="font-semibold text-red-800 dark:text-red-200">Entregas atrasadas</p>
              <span class="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">${getOverdueDeliveries().length}</span>
            </div>
            <div class="mt-2 space-y-2">
              ${overdueD
                .map(
                  (i) => `
                  <div class="p-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-white/70 dark:bg-gray-900/30">
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">${i.reporter_name || '—'} • ${i.department || '—'}</p>
                    <p class="text-xs text-gray-700 dark:text-gray-300">Entrega: ${formatDate(i.delivery_date)} • ${getStatusText(i.task_status)}</p>
                  </div>
                `,
                )
                .join('')}
            </div>
          </div>
        ` : ''}

        <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white/60 dark:bg-gray-900/40">
          <div class="flex items-center justify-between">
            <p class="font-semibold text-gray-900 dark:text-gray-100">Incidencias con entrega próxima (${REMINDER_DELIVERY_DAYS} día)</p>
            <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">${getDeliveryDueActivities(REMINDER_DELIVERY_DAYS).length}</span>
          </div>
          <div class="mt-2 space-y-2">
            ${due.length
              ? due
                  .map(
                    (i) => `
                  <div class="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${i.reporter_name || '—'} • ${i.department || '—'}</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400">
                          Entrega: ${formatDate(i.delivery_date)} • ${getStatusText(i.task_status)} ${i.priority ? `• ${getPriorityText(i.priority)}` : ''}
                        </p>
                      </div>
                      <span class="text-xs font-semibold text-orange-700 dark:text-orange-300 whitespace-nowrap">${formatWhen(i.__days)}</span>
                    </div>
                  </div>
                `,
                  )
                  .join('')
              : `<p class="text-xs text-gray-600 dark:text-gray-400">No hay entregas próximas.</p>`}
          </div>
        </div>
      </div>
    </div>
  `;

  Swal.fire({
    icon: 'info',
    title: 'Notificaciones',
    html,
    showCancelButton: true,
    confirmButtonText: 'Ver incidencias',
    cancelButtonText: 'Cerrar',
  }).then((r) => {
    if (r.isConfirmed) window.showSection?.('activities');
  });
}

// =========================
// Dashboard functions
// =========================

export async function loadDashboardData({ supabase } = {}) {
  try {
    // Load statistics (Incidencias)
    const { data: activities, error } = await supabase.from('activities').select('*');
    if (error) throw error;
    state.activitiesData = activities || [];

    // Load events (para pendientes)
    const { data: events, error: eventsError } = await supabase.from('events').select('*').order('event_date', { ascending: true });
    if (eventsError) throw eventsError;
    state.eventsData = events || [];

    // Calculate statistics
    const total = state.activitiesData.length;
    const pending = state.activitiesData.filter((a) => a.task_status === 'pendiente').length;
    const inProgress = state.activitiesData.filter((a) => a.task_status === 'en_proceso').length;
    const completed = state.activitiesData.filter((a) => a.task_status === 'completado').length;
    const canceled = state.activitiesData.filter((a) => a.task_status === 'cancelado').length;

    // Update stats
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-in-progress').textContent = inProgress;
    const canceledEl = document.getElementById('stat-canceled');
    if (canceledEl) canceledEl.textContent = String(canceled);

    // Resumen de mantenimiento (preventivo/correctivo) - basado en meta (observaciones)
    const prev = state.activitiesData.filter((a) => getMaintenanceType(a) === 'preventivo');
    const corr = state.activitiesData.filter((a) => getMaintenanceType(a) === 'correctivo');
    const prevPending = prev.filter((a) => a.task_status === 'pendiente').length;
    const corrPending = corr.filter((a) => a.task_status === 'pendiente').length;

    const prevTotalEl = document.getElementById('stat-maint-prev-total');
    const prevPendingEl = document.getElementById('stat-maint-prev-pending');
    const corrTotalEl = document.getElementById('stat-maint-corr-total');
    const corrPendingEl = document.getElementById('stat-maint-corr-pending');
    if (prevTotalEl) prevTotalEl.textContent = String(prev.length);
    if (prevPendingEl) prevPendingEl.textContent = String(prevPending);
    if (corrTotalEl) corrTotalEl.textContent = String(corr.length);
    if (corrPendingEl) corrPendingEl.textContent = String(corrPending);

    // Update charts
    updateCharts();

    // Load recent activities
    loadRecentActivities();

    // Load pending events
    loadPendingEvents();

    // Notificaciones reales
    updateNotificationBadge();
    renderDashboardReminders();
    renderDashboardInsights();
    renderCriticalItems();
    renderNextSevenDays();
    renderOperationalSummary();
    renderMaintenanceCalendar();
    renderStatusDistribution();
    renderExecutiveAlerts();
    renderHealthSummary();

    // Estadísticas para sección de reportes
    updateReportStats();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

export function updateReportStats() {
  const container = document.getElementById('report-stats');
  if (!container) return;

  const totalInc = state.activitiesData.length;
  const pendingInc = state.activitiesData.filter((a) => a.task_status === 'pendiente').length;
  const inProgressInc = state.activitiesData.filter((a) => a.task_status === 'en_proceso').length;
  const completedInc = state.activitiesData.filter((a) => a.task_status === 'completado').length;
  const canceledInc = state.activitiesData.filter((a) => a.task_status === 'cancelado').length;

  const prev = state.activitiesData.filter((a) => getMaintenanceType(a) === 'preventivo');
  const corr = state.activitiesData.filter((a) => getMaintenanceType(a) === 'correctivo');

  const totalEv = state.eventsData.length;
  const pendingEv = state.eventsData.filter((e) => e.status === 'pendiente').length;

  container.innerHTML = `
    <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <p class="text-sm text-gray-600 dark:text-gray-400">Incidencias</p>
      <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">${totalInc}</p>
      <div class="grid grid-cols-4 gap-2 mt-3 text-xs">
        <div class="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-2">
          <p class="text-orange-600 dark:text-orange-300 font-semibold">${pendingInc}</p>
          <p class="text-gray-600 dark:text-gray-400">Pendientes</p>
        </div>
        <div class="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2">
          <p class="text-blue-600 dark:text-blue-300 font-semibold">${inProgressInc}</p>
          <p class="text-gray-600 dark:text-gray-400">En proceso</p>
        </div>
        <div class="rounded-lg bg-green-50 dark:bg-green-900/20 p-2">
          <p class="text-green-600 dark:text-green-300 font-semibold">${completedInc}</p>
          <p class="text-gray-600 dark:text-gray-400">Completadas</p>
        </div>
        <div class="rounded-lg bg-gray-100 dark:bg-gray-800 p-2">
          <p class="text-gray-700 dark:text-gray-200 font-semibold">${canceledInc}</p>
          <p class="text-gray-600 dark:text-gray-400">Canceladas</p>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <p class="text-sm text-gray-600 dark:text-gray-400">Mantenimiento</p>
      <div class="grid grid-cols-2 gap-3 mt-3 text-sm">
        <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
          <p class="font-semibold text-gray-900 dark:text-white">Preventivo</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">Total: <span class="font-semibold">${prev.length}</span></p>
        </div>
        <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
          <p class="font-semibold text-gray-900 dark:text-white">Correctivo</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">Total: <span class="font-semibold">${corr.length}</span></p>
        </div>
      </div>
      <p class="text-xs text-gray-600 dark:text-gray-400 mt-3">Usa los botones de “Reporte preventivo/correctivo” para exportar por tipo.</p>
    </div>

    <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <p class="text-sm text-gray-600 dark:text-gray-400">Eventos</p>
      <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">${totalEv}</p>
      <p class="text-xs text-gray-600 dark:text-gray-400 mt-2">Pendientes: <span class="font-semibold text-orange-500">${pendingEv}</span></p>
    </div>
  `;
}

export function loadPendingEvents() {
  const container = document.getElementById('pending-events');
  const stat = document.getElementById('stat-events-pending');
  if (!container || !stat) return;

  const pendingEvents = state.eventsData
    .filter((e) => e.status === 'pendiente')
    .sort((a, b) => {
      const ad = `${a.event_date || ''} ${a.event_time || ''}`.trim();
      const bd = `${b.event_date || ''} ${b.event_time || ''}`.trim();
      return ad.localeCompare(bd);
    });

  stat.textContent = String(pendingEvents.length);

  const top = pendingEvents.slice(0, 5);
  if (top.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No hay eventos pendientes</p>';
    return;
  }

  container.innerHTML = top
    .map(
      (ev) => `
      <div class="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
        <div>
          <p class="text-sm font-semibold text-gray-900 dark:text-white">${ev.title}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            ${formatDate(ev.event_date)} ${ev.event_time ? `• ${ev.event_time}` : ''} ${ev.location ? `• ${ev.location}` : ''}
          </p>
        </div>
        <span class="badge badge-${getBadgeClass(ev.status)}">${getStatusText(ev.status)}</span>
      </div>
    `,
    )
    .join('');
}

export function updateCharts() {
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#e5e7eb' : '#111827';
  const gridColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(17,24,39,0.08)';

  // Status Chart
  const statusEl = document.getElementById('chart-status');
  if (!statusEl) return;
  const statusCtx = statusEl.getContext('2d');

  if (state.charts.status) state.charts.status.destroy();

  const pending = state.activitiesData.filter((a) => a.task_status === 'pendiente').length;
  const inProgress = state.activitiesData.filter((a) => a.task_status === 'en_proceso').length;
  const completed = state.activitiesData.filter((a) => a.task_status === 'completado').length;
  const canceled = state.activitiesData.filter((a) => a.task_status === 'cancelado').length;

  state.charts.status = new Chart(statusCtx, {
    type: 'doughnut',
    data: {
      labels: ['Pendientes', 'En Proceso', 'Completadas', 'Canceladas'],
      datasets: [
        {
          data: [pending, inProgress, completed, canceled],
          backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#6b7280'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            boxWidth: 10,
            boxHeight: 10,
            padding: 14,
          },
        },
      },
    },
  });

  // Services Chart
  const servicesEl = document.getElementById('chart-services');
  if (!servicesEl) return;
  const servicesCtx = servicesEl.getContext('2d');

  if (state.charts.services) state.charts.services.destroy();

  const servicesCount = {};
  state.activitiesData.forEach((a) => {
    servicesCount[a.service_type] = (servicesCount[a.service_type] || 0) + 1;
  });

  const labels = Object.keys(servicesCount);
  const data = Object.values(servicesCount);

  state.charts.services = new Chart(servicesCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Cantidad',
          data,
          backgroundColor: isDark ? '#ffffff' : '#000000',
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: textColor },
          grid: { color: gridColor },
        },
        x: {
          ticks: { color: textColor },
          grid: { display: false },
        },
      },
    },
  });

  // Trend Chart (últimos 14 días)
  const trendEl = document.getElementById('chart-trend');
  if (trendEl) {
    const trendCtx = trendEl.getContext('2d');
    if (state.charts.trend) state.charts.trend.destroy();

    const today = toDateOnly(new Date());
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      days.push(d);
    }
    const labelsTrend = days.map((d) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${dd}/${mm}`;
    });
    const mapCount = new Map(days.map((d) => [d.getTime(), 0]));
    (state.activitiesData || []).forEach((a) => {
      const dt = toDateOnly(a.date);
      if (!dt) return;
      const key = dt.getTime();
      if (mapCount.has(key)) mapCount.set(key, (mapCount.get(key) || 0) + 1);
    });
    const dataTrend = days.map((d) => mapCount.get(d.getTime()) || 0);

    state.charts.trend = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: labelsTrend,
        datasets: [
          {
            label: 'Incidencias',
            data: dataTrend,
            borderColor: isDark ? '#ffffff' : '#111827',
            backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(17,24,39,0.10)',
            tension: 0.35,
            fill: true,
            pointRadius: 2,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
          x: {
            ticks: { color: textColor },
            grid: { display: false },
          },
        },
      },
    });
  }

  // Top departamentos (barras)
  const depEl = document.getElementById('chart-departments');
  if (depEl) {
    const depCtx = depEl.getContext('2d');
    if (state.charts.departments) state.charts.departments.destroy();

    const counts = {};
    (state.activitiesData || []).forEach((a) => {
      const key = String(a.department || 'Sin especificar').trim() || 'Sin especificar';
      counts[key] = (counts[key] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const labelsDep = entries.map(([k]) => (k.length > 18 ? `${k.slice(0, 18)}…` : k));
    const dataDep = entries.map(([, v]) => v);

    state.charts.departments = new Chart(depCtx, {
      type: 'bar',
      data: {
        labels: labelsDep,
        datasets: [
          {
            label: 'Cantidad',
            data: dataDep,
            backgroundColor: isDark ? 'rgba(255,255,255,0.9)' : '#111827',
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
          x: {
            ticks: { color: textColor },
            grid: { display: false },
          },
        },
      },
    });
  }
}

export function loadRecentActivities() {
  const container = document.getElementById('recent-activities');
  if (!container) return;

  const recent = state.activitiesData.slice(0, 5);
  if (recent.length === 0) {
    container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No hay incidencias recientes</p>';
    return;
  }

  container.innerHTML = recent
    .map(
      (activity) => `
      <div class="activity-item relative pl-6 py-2">
        <div class="activity-dot" style="color: ${getStatusColor(activity.task_status)}"></div>
        <div class="flex justify-between items-start">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">${activity.reporter_name}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${activity.description.substring(0, 50)}...</p>
          </div>
          <div class="text-right">
            <span class="badge badge-${getBadgeClass(activity.task_status)}">${getStatusText(activity.task_status)}</span>
            <p class="text-xs text-gray-400 mt-1">${formatDate(activity.date)}</p>
          </div>
        </div>
      </div>
    `,
    )
    .join('');
}

