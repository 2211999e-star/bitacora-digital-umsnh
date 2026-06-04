/**
 * incidencias.js
 * CRUD de incidencias (activities) + filtros + paginación + MSINFO32 + datos de muestra.
 */

import {
  state,
  showLoader,
  hideLoader,
  formatDate,
  getStatusText,
  getBadgeClass,
  getPriorityText,
  randomPick,
  addDays,
  isoDate,
  downloadCSV,
  showToast,
} from './utils.js';
import { canEditOwnedOrRole, canDelete } from './permissions.js';
import { updateNotificationBadge, loadDashboardData } from './dashboard.js';
import { exportPDF } from './reportes.js';
import { LOCAL_STORAGE_PREFIX } from './config.js';

/**
 * Construye un bloque de metadata embebido en Observaciones para mantener compatibilidad
 * con BD existente sin forzar migraciones inmediatas.
 * @param {object} meta
 * @returns {string}
 */
function buildMetaBlock(meta = {}) {
  try {
    return `__meta__=${JSON.stringify(meta)}`;
  } catch {
    return '';
  }
}

/**
 * Extrae metadata embebida de Observaciones.
 * @param {string} text
 * @returns {{meta: object, cleanText: string}}
 */
function parseMetaBlock(text = '') {
  const raw = String(text || '');
  const lines = raw.split('\n');
  const metaLineIndex = lines.findIndex((l) => l.trim().startsWith('__meta__='));
  if (metaLineIndex === -1) return { meta: {}, cleanText: raw };
  const metaRaw = lines[metaLineIndex].trim().slice('__meta__='.length);
  const cleanLines = lines.filter((_, idx) => idx !== metaLineIndex);
  try {
    const meta = JSON.parse(metaRaw);
    return { meta: meta && typeof meta === 'object' ? meta : {}, cleanText: cleanLines.join('\n').trim() };
  } catch {
    return { meta: {}, cleanText: cleanLines.join('\n').trim() };
  }
}

function makeFolio() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `UMSNH-${y}${m}${day}-${rand}`;
}

function setSelectedByDataAttr(selector, value) {
  document.querySelectorAll(selector).forEach((b) => b.classList.remove('ring-2', 'ring-black', 'dark:ring-white'));
  if (!value) return;
  document.querySelectorAll(`${selector}[data-value="${value}"]`).forEach((b) => b.classList.add('ring-2', 'ring-black', 'dark:ring-white'));
}

function ensureIncidenciaUXWired() {
  const form = document.getElementById('form-activity');
  if (!form || form.dataset.uxWired === 'true') return;
  form.dataset.uxWired = 'true';

  // Servicio (tarjetas)
  const serviceInput = document.getElementById('act-service-type');
  document.querySelectorAll('.act-service-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-value') || '';
      if (serviceInput) serviceInput.value = v;
      setSelectedByDataAttr('.act-service-card', v);
    });
  });

  // Descripción rápida (chips)
  const quickInput = document.getElementById('act-quick-desc');
  const otherArea = document.getElementById('act-problem-other');
  document.querySelectorAll('.act-quick-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-value') || '';
      if (quickInput) quickInput.value = v;
      setSelectedByDataAttr('.act-quick-chip', v);
      const showOther = v === 'Otro';
      if (otherArea) otherArea.classList.toggle('hidden', !showOther);
      if (!showOther && otherArea) otherArea.value = '';
    });
  });

  // Prioridad (cards)
  const priInput = document.getElementById('act-priority');
  document.querySelectorAll('.act-priority-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-value') || 'media';
      if (priInput) priInput.value = v;
      setSelectedByDataAttr('.act-priority-card', v);
    });
  });

  // Estado (chips)
  const stInput = document.getElementById('act-task-status');
  document.querySelectorAll('.act-status-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-value') || 'pendiente';
      if (stInput) stInput.value = v;
      setSelectedByDataAttr('.act-status-chip', v);
    });
  });

  // Turno (opcional)
  const shiftInput = document.getElementById('act-shift');
  document.querySelectorAll('.act-shift-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-value') || '';
      if (shiftInput) shiftInput.value = v;
      setSelectedByDataAttr('.act-shift-btn', v);
    });
  });

  // Salón "Otro"
  const roomSel = document.getElementById('act-room');
  const roomOther = document.getElementById('act-room-other-input');
  const roomOtherHidden = document.getElementById('act-room-other');
  if (roomSel) {
    roomSel.addEventListener('change', () => {
      const isOther = roomSel.value === 'Otro';
      if (roomOther) roomOther.classList.toggle('hidden', !isOther);
      if (!isOther && roomOther) roomOther.value = '';
      if (!isOther && roomOtherHidden) roomOtherHidden.value = '';
    });
  }
  if (roomOther) {
    roomOther.addEventListener('input', () => {
      if (roomOtherHidden) roomOtherHidden.value = roomOther.value;
    });
  }
}

export async function loadActivities({ supabase } = {}) {
  try {
    const { data, error } = await supabase.from('activities').select('*').order('date', { ascending: false });
    if (error) throw error;

    state.activitiesData = data || [];
    renderActivitiesTable();
    updateNotificationBadge();
  } catch (error) {
    console.error('Error loading activities:', error);
  }
}

export function renderActivitiesTable() {
  const tbody = document.getElementById('table-activities');
  if (!tbody) return;

  const searchText = (document.getElementById('search-activities')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('filter-status')?.value || '';
  const filterService = (document.getElementById('filter-service-type')?.value || '').trim();
  const filterPriority = (document.getElementById('filter-priority')?.value || '').trim();

  let filtered = state.activitiesData;

  if (searchText) {
    filtered = filtered.filter(
      (a) =>
        (() => {
          const { meta, cleanText } = parseMetaBlock(a.observations || '');
          const haystack = [
            a.reporter_name,
            a.department,
            a.description,
            a.coordination,
            a.assigned_to,
            a.service_type,
            a.brand,
            a.model,
            a.operating_system,
            a.folio,
            meta.folio,
            meta.edificio,
            meta.carrera,
            meta.salon,
            meta.turno,
            cleanText,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(searchText);
        })(),
    );
  }

  if (filterStatus) filtered = filtered.filter((a) => a.task_status === filterStatus);
  if (filterService) filtered = filtered.filter((a) => (a.service_type || '') === filterService);
  if (filterPriority) filtered = filtered.filter((a) => String(a.priority || 'media') === filterPriority);

  // Summary cards
  renderActivitiesSummary(filtered);

  // Cache count for pagination controls
  window.__activitiesFilteredCount = filtered.length;

  // Pagination
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const end = start + state.itemsPerPage;
  const paginated = filtered.slice(start, end);

  // Update pagination info
  const showingStart = document.getElementById('showing-start');
  const showingEnd = document.getElementById('showing-end');
  const totalRecords = document.getElementById('total-records');
  const currentPageEl = document.getElementById('current-page');
  if (showingStart) showingStart.textContent = filtered.length > 0 ? String(start + 1) : '0';
  if (showingEnd) showingEnd.textContent = String(Math.min(end, filtered.length));
  if (totalRecords) totalRecords.textContent = String(filtered.length);
  if (currentPageEl) currentPageEl.textContent = `Página ${state.currentPage}`;

  if (paginated.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
          <div class="flex flex-col items-center gap-2">
            <div class="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <i class="fas fa-clipboard-list text-gray-500 dark:text-gray-300"></i>
            </div>
            <div class="font-semibold">No se encontraron incidencias</div>
            <div class="text-sm">Prueba cambiando filtros o crea una nueva incidencia.</div>
            <button onclick="showActivityModal()" class="mt-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all">
              <i class="fas fa-plus mr-2"></i>
              Nueva incidencia
            </button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = paginated
    .map((activity) => {
      const canEdit = canEditOwnedOrRole(state.currentUser, activity.user_id);
      const canDel = canDelete(state.currentUser);
      const canDeliver = canEdit && !['completado', 'cancelado'].includes(String(activity.task_status || '').toLowerCase());

      return `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">${formatDate(activity.date)}</td>
          <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${activity.reporter_name}</td>
          <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${activity.department}</td>
          <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">${activity.description}</td>
          <td class="hidden lg:table-cell px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${activity.brand || '-'} ${activity.model || ''}</td>
          <td class="hidden xl:table-cell px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${activity.operating_system || '-'}</td>
          <td class="hidden lg:table-cell px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${activity.service_type}</td>
          <td class="hidden lg:table-cell px-6 py-4">
            <span class="badge badge-priority-${String(activity.priority || 'media')}">${getPriorityText(activity.priority)}</span>
          </td>
          <td class="px-6 py-4">
            <span class="badge badge-${getBadgeClass(activity.task_status)}">${getStatusText(activity.task_status)}</span>
          </td>
          <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${activity.assigned_to || '-'}</td>
          <td class="px-6 py-4">
            <div class="flex justify-center space-x-2">
              <button onclick="viewActivity('${activity.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" title="Ver detalle">
                <i class="fas fa-eye"></i>
              </button>
              <button onclick="exportActivityPDF('${activity.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-red-600" title="PDF individual">
                <i class="fas fa-file-pdf"></i>
              </button>
              ${canDeliver ? `
                <button onclick="markDelivered('${activity.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-green-600" title="Marcar entregado (hoy)">
                  <i class="fas fa-check-double"></i>
                </button>
              ` : ''}
              ${canEdit ? `
                <button onclick="editActivity('${activity.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-blue-500" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
              ` : ''}
              ${canDel ? `
                <button onclick="deleteActivity('${activity.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-red-500" title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderActivitiesSummary(list = []) {
  const el = document.getElementById('activities-summary');
  if (!el) return;

  const today = new Date().toISOString().split('T')[0];
  const isOpen = (a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase());
  const overdue = (a) => isOpen(a) && a.delivery_date && String(a.delivery_date).slice(0, 10) < today;
  const dueSoon = (a) => isOpen(a) && a.delivery_date && String(a.delivery_date).slice(0, 10) === today;

  const total = list.length;
  const pending = list.filter((a) => a.task_status === 'pendiente').length;
  const inProgress = list.filter((a) => a.task_status === 'en_proceso').length;
  const completed = list.filter((a) => a.task_status === 'completado').length;
  const canceled = list.filter((a) => a.task_status === 'cancelado').length;
  const overdueCount = list.filter(overdue).length;
  const dueTodayCount = list.filter(dueSoon).length;

  el.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-gray-900/40">
        <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Resultados</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-2">${total}</p>
      </div>
      <div class="rounded-xl border border-orange-200 dark:border-orange-900/40 p-4 bg-orange-50/60 dark:bg-orange-900/10">
        <p class="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wider">Pendientes</p>
        <p class="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-2">${pending}</p>
      </div>
      <div class="rounded-xl border border-blue-200 dark:border-blue-900/40 p-4 bg-blue-50/60 dark:bg-blue-900/10">
        <p class="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">En proceso</p>
        <p class="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-2">${inProgress}</p>
      </div>
      <div class="rounded-xl border border-green-200 dark:border-green-900/40 p-4 bg-green-50/60 dark:bg-green-900/10">
        <p class="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">Completadas</p>
        <p class="text-2xl font-bold text-green-700 dark:text-green-300 mt-2">${completed}</p>
      </div>
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Canceladas</p>
        <p class="text-2xl font-bold text-gray-700 dark:text-gray-200 mt-2">${canceled}</p>
      </div>
      <div class="rounded-xl border border-red-200 dark:border-red-900/40 p-4 bg-red-50/60 dark:bg-red-900/10">
        <p class="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wider">Atrasadas</p>
        <p class="text-2xl font-bold text-red-700 dark:text-red-300 mt-2">${overdueCount}</p>
      </div>
      <div class="rounded-xl border border-yellow-200 dark:border-yellow-900/40 p-4 bg-yellow-50/60 dark:bg-yellow-900/10">
        <p class="text-xs font-semibold text-yellow-800 dark:text-yellow-200 uppercase tracking-wider">Entrega hoy</p>
        <p class="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mt-2">${dueTodayCount}</p>
      </div>
    </div>
  `;
}

export function clearActivitiesFilters() {
  const s = document.getElementById('search-activities');
  const st = document.getElementById('filter-status');
  const sv = document.getElementById('filter-service-type');
  const pr = document.getElementById('filter-priority');
  if (s) s.value = '';
  if (st) st.value = '';
  if (sv) sv.value = '';
  if (pr) pr.value = '';
  state.currentPage = 1;
  renderActivitiesTable();
}

export function filterActivities() {
  state.currentPage = 1;
  renderActivitiesTable();
}

export function prevPage() {
  if (state.currentPage > 1) {
    state.currentPage--;
    renderActivitiesTable();
  }
}

export function nextPage() {
  const total = Number(window.__activitiesFilteredCount ?? state.activitiesData.length);
  const totalPages = Math.ceil(total / state.itemsPerPage);
  if (state.currentPage < totalPages) {
    state.currentPage++;
    renderActivitiesTable();
  }
}

// -------------------------
// Modales
// -------------------------

export function showActivityModal() {
  const modal = document.getElementById('modal-activity');
  if (!modal) return;

  ensureIncidenciaUXWired();

  modal.classList.remove('hidden');
  modal.classList.add('show');
  document.getElementById('modal-activity-title').textContent = 'Nueva incidencia';
  document.getElementById('form-activity').reset();
  document.getElementById('activity-id').value = '';

  // Folio automático
  const folio = makeFolio();
  const folioEl = document.getElementById('act-folio');
  const folioLbl = document.getElementById('act-folio-label');
  if (folioEl) folioEl.value = folio;
  if (folioLbl) folioLbl.textContent = folio;

  // Defaults
  const pri = document.getElementById('act-priority');
  const st = document.getElementById('act-task-status');
  if (pri) pri.value = 'media';
  if (st) st.value = 'pendiente';

  setSelectedByDataAttr('.act-priority-card', 'media');
  setSelectedByDataAttr('.act-status-chip', 'pendiente');
  setSelectedByDataAttr('.act-service-card', '');
  setSelectedByDataAttr('.act-quick-chip', '');

  const otherArea = document.getElementById('act-problem-other');
  if (otherArea) {
    otherArea.value = '';
    otherArea.classList.add('hidden');
  }

  // Mejor UX: enfocar primer campo requerido
  setTimeout(() => {
    document.getElementById('act-building')?.focus?.();
  }, 0);
}

export function closeActivityModal() {
  const modal = document.getElementById('modal-activity');
  if (!modal) return;

  modal.classList.remove('show');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
}

export function openActivityAdvancedModal() {
  const m = document.getElementById('modal-activity-advanced');
  if (m) m.classList.remove('hidden');
}

export function closeActivityAdvancedModal() {
  const m = document.getElementById('modal-activity-advanced');
  if (m) m.classList.add('hidden');
}

export async function editActivity({ supabase } = {}, id) {
  try {
    const { data, error } = await supabase.from('activities').select('*').eq('id', id).single();
    if (error) throw error;

    ensureIncidenciaUXWired();

    const modal = document.getElementById('modal-activity');
    modal.classList.remove('hidden');
    modal.classList.add('show');
    document.getElementById('modal-activity-title').textContent = 'Editar Actividad';

    document.getElementById('activity-id').value = data.id;

    const { meta, cleanText } = parseMetaBlock(data.observations || '');

    // Ubicación (mapeo actual: coordination=edificio, department=carrera)
    const building = meta.edificio || data.coordination || '';
    const career = meta.carrera || data.department || '';
    const room = meta.salon || '';
    const shift = meta.turno || '';

    const buildingEl = document.getElementById('act-building');
    if (buildingEl) buildingEl.value = building;
    const careerEl = document.getElementById('act-career');
    if (careerEl) careerEl.value = career;
    const roomEl = document.getElementById('act-room');
    const roomOtherInput = document.getElementById('act-room-other-input');
    const roomOtherHidden = document.getElementById('act-room-other');
    if (roomEl) {
      const options = Array.from(roomEl.options || []).map((o) => o.value);
      if (room && options.includes(room)) {
        roomEl.value = room;
        if (roomOtherInput) roomOtherInput.classList.add('hidden');
      } else if (room) {
        roomEl.value = 'Otro';
        if (roomOtherInput) {
          roomOtherInput.classList.remove('hidden');
          roomOtherInput.value = room;
        }
        if (roomOtherHidden) roomOtherHidden.value = room;
      }
    }
    const shiftEl = document.getElementById('act-shift');
    if (shiftEl) shiftEl.value = shift;
    setSelectedByDataAttr('.act-shift-btn', shift);

    // Problema
    const serviceInput = document.getElementById('act-service-type');
    if (serviceInput) serviceInput.value = meta.tipo || data.service_type || '';
    setSelectedByDataAttr('.act-service-card', serviceInput?.value || '');

    const quickInput = document.getElementById('act-quick-desc');
    const otherArea = document.getElementById('act-problem-other');
    const quick = meta.rapido || '';
    if (quickInput) quickInput.value = quick || (data.description || '');
    setSelectedByDataAttr('.act-quick-chip', quickInput?.value || '');
    if (otherArea) {
      const isOther = (quickInput?.value || '') === 'Otro';
      otherArea.classList.toggle('hidden', !isOther);
      otherArea.value = isOther ? (data.description || '') : '';
    }

    // Detalles
    const priorityEl = document.getElementById('act-priority');
    if (priorityEl) priorityEl.value = data.priority || 'media';
    setSelectedByDataAttr('.act-priority-card', priorityEl?.value || 'media');

    const taskEl = document.getElementById('act-task-status');
    if (taskEl) taskEl.value = data.task_status || 'pendiente';
    setSelectedByDataAttr('.act-status-chip', taskEl?.value || 'pendiente');

    // Observaciones limpias (sin meta)
    const obsEl = document.getElementById('act-observations');
    if (obsEl) obsEl.value = cleanText || '';

    // Folio
    const folio = meta.folio || document.getElementById('act-folio')?.value || makeFolio();
    const folioEl = document.getElementById('act-folio');
    const folioLbl = document.getElementById('act-folio-label');
    if (folioEl) folioEl.value = folio;
    if (folioLbl) folioLbl.textContent = folio;

    // Técnicos (modal avanzado)
    const brandEl = document.getElementById('act-brand');
    if (brandEl) brandEl.value = data.brand || '';
    const modelEl = document.getElementById('act-model');
    if (modelEl) modelEl.value = data.model || '';
    const serialEl = document.getElementById('act-serial');
    if (serialEl) serialEl.value = data.serial_number || '';
    const osEl = document.getElementById('act-os');
    if (osEl) osEl.value = data.operating_system || '';
    const ramEl = document.getElementById('act-ram');
    if (ramEl) ramEl.value = data.ram || '';
    const storEl = document.getElementById('act-storage');
    if (storEl) storEl.value = data.storage || '';
    const ueEl = document.getElementById('act-user-equipo');
    if (ueEl) ueEl.value = data.user_equipo || '';
    const asgEl = document.getElementById('act-assigned');
    if (asgEl) asgEl.value = data.assigned_to || '';
    const diagEl = document.getElementById('act-diagnosis');
    if (diagEl) diagEl.value = data.diagnosis || '';
  } catch (error) {
    console.error('Error loading activity:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la actividad' });
  }
}

export async function viewActivity({ supabase } = {}, id) {
  try {
    const { data, error } = await supabase.from('activities').select('*').eq('id', id).single();
    if (error) throw error;

    const { meta, cleanText } = parseMetaBlock(data.observations || '');
    const folio = meta.folio || '—';
    const ubicacion = [
      meta.edificio || data.coordination || '',
      meta.carrera || data.department || '',
      meta.salon || '',
      meta.turno ? `(${meta.turno})` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const canEdit = canEditOwnedOrRole(state.currentUser, data.user_id);
    const canDeliver = canEdit && !['completado', 'cancelado'].includes(String(data.task_status || '').toLowerCase());

    const resumen = [
      `Folio: ${folio}`,
      ubicacion ? `Ubicación: ${ubicacion}` : null,
      `Estado: ${getStatusText(data.task_status)}`,
      `Prioridad: ${getPriorityText(data.priority)}`,
      `Recibido: ${formatDate(data.received_date || data.date)}`,
      data.delivery_date ? `Entrega: ${formatDate(data.delivery_date)}` : null,
      `Descripción: ${(data.description || '').trim() || '—'}`,
    ]
      .filter(Boolean)
      .join('\n');

    const html = `
      <div style="text-align:left">
        <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
          <div style="font-weight:700">Incidencia</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge badge-${getBadgeClass(data.task_status)}">${getStatusText(data.task_status)}</span>
            ${
              canEdit
                ? `<button onclick="editActivity('${data.id}')" style="font-size:12px;padding:6px 10px;border-radius:10px;border:1px solid rgba(0,0,0,.08);background:#fff;cursor:pointer">Editar</button>`
                : ''
            }
          </div>
        </div>
        <div style="margin-top:10px;font-size:12px;color:#6b7280">
          Folio: <b>${folio}</b>
          <button onclick="copyToClipboard(${JSON.stringify(folio)})" style="margin-left:8px;font-size:12px;padding:4px 8px;border-radius:999px;border:1px solid rgba(0,0,0,.08);background:#fff;cursor:pointer">Copiar</button>
          ${ubicacion ? ` · Ubicación: <b>${ubicacion}</b>` : ''}
          ${ubicacion ? `<button onclick="copyToClipboard(${JSON.stringify(ubicacion)})" style="margin-left:8px;font-size:12px;padding:4px 8px;border-radius:999px;border:1px solid rgba(0,0,0,.08);background:#fff;cursor:pointer">Copiar ubicación</button>` : ''}
        </div>
        <div style="margin-top:10px;font-size:12px;color:#6b7280">
          Recibido: <b>${formatDate(data.received_date || data.date)}</b>
          ${data.delivery_date ? ` · Entrega: <b>${formatDate(data.delivery_date)}</b>` : ''}
          · Prioridad: <b>${getPriorityText(data.priority)}</b>
        </div>
        <div style="margin-top:10px">
          <button onclick="copyToClipboard(${JSON.stringify(resumen)})" style="font-size:12px;padding:6px 10px;border-radius:10px;border:1px solid rgba(0,0,0,.08);background:#fff;cursor:pointer">Copiar resumen</button>
        </div>
        <div style="margin-top:12px">
          <div style="font-weight:700;margin-bottom:6px">Descripción</div>
          <div style="white-space:pre-wrap;font-size:13px;color:#111827">${(data.description || '').trim() || '—'}</div>
        </div>
        ${data.diagnosis ? `
          <div style="margin-top:12px">
            <div style="font-weight:700;margin-bottom:6px">Diagnóstico</div>
            <div style="white-space:pre-wrap;font-size:13px;color:#111827">${(data.diagnosis || '').trim()}</div>
          </div>
        ` : ''}
        ${(cleanText || '').trim() ? `
          <div style="margin-top:12px">
            <div style="font-weight:700;margin-bottom:6px">Observaciones</div>
            <div style="white-space:pre-wrap;font-size:13px;color:#111827">${cleanText}</div>
          </div>
        ` : ''}
      </div>
    `;

    Swal.fire({
      title: 'Detalle de incidencia',
      html,
      showCancelButton: true,
      showDenyButton: canDeliver,
      confirmButtonText: 'PDF individual',
      denyButtonText: 'Marcar entregado',
      cancelButtonText: 'Cerrar',
    }).then((r) => {
      if (r.isConfirmed) window.exportActivityPDF?.(id);
      if (r.isDenied) window.markDelivered?.(id);
    });
  } catch {
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el detalle.' });
  }
}

export async function markDelivered({ supabase } = {}, id) {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('id, user_id, reporter_name, department, received_date, date, task_status')
      .eq('id', id)
      .single();
    if (error) throw error;

    const canEdit = canEditOwnedOrRole(state.currentUser, data.user_id);
    if (!canEdit) {
      Swal.fire({ icon: 'error', title: 'Sin permiso', text: 'No tienes permisos para marcar como entregado.' });
      return;
    }

    const status = String(data.task_status || '').toLowerCase();
    if (status === 'completado' || status === 'cancelado') {
      Swal.fire({ icon: 'info', title: 'Sin cambios', text: 'Esta incidencia ya está cerrada.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const received = (data.received_date || data.date || '').toString().slice(0, 10);
    if (received && today < received) {
      Swal.fire({
        icon: 'error',
        title: 'Fechas inválidas',
        text: 'La fecha de recibido es posterior a hoy. Corrige la fecha de recibido antes de marcar entregado.',
      });
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: '¿Marcar como entregado?',
      html: `
        <div style="text-align:left">
          <p><b>${data.reporter_name || '—'}</b> • ${data.department || '—'}</p>
          <p style="margin-top:6px">Se marcará como <b>Completado</b> y se pondrá la fecha de entrega en <b>${today}</b>.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;

    const { error: upErr } = await supabase.from('activities').update({ task_status: 'completado', delivery_date: today }).eq('id', id);
    if (upErr) throw upErr;

    await loadActivities({ supabase });
    await loadDashboardData({ supabase });

    Swal.fire({
      icon: 'success',
      title: 'Entregado',
      text: 'Se marcó como completado y se guardó la fecha de entrega (hoy).',
      timer: 1800,
      showConfirmButton: false,
    });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo marcar como entregado.' });
  }
}

// -------------------------
// Datos de muestra
// -------------------------

export async function seedSampleActivities({ supabase } = {}) {
  try {
    if (!state.currentUser) return;
    if (!(state.currentUser.role === 'admin' || state.currentUser.role === 'coordinator')) {
      Swal.fire({ icon: 'error', title: 'Sin permiso', text: 'Solo admin/coordinador puede cargar datos de muestra.' });
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: 'Cargar datos de muestra',
      text: 'Se crearán 15 incidencias de ejemplo para probar filtros, dashboard y reportes. Luego puedes borrarlas con “Borrar muestra”.',
      showCancelButton: true,
      confirmButtonText: 'Cargar 15',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;

    showLoader();

    const departments = [
      'Facultad de Ingeniería',
      'Biblioteca Central',
      'Servicios Escolares',
      'Rectoría',
      'Laboratorio de Cómputo',
      'Posgrado',
      'Contabilidad',
      'Recursos Humanos',
    ];
    const serviceTypes = [
      'Mantenimiento preventivo',
      'Mantenimiento correctivo',
      'Reparación de equipos',
      'Booteos',
      'Soporte WiFi UMICH',
      'Soporte en eventos',
      'Configuración de impresoras',
      'Instalación de software',
      'Actualización de equipos',
    ];
    const brands = ['HP', 'Dell', 'Lenovo', 'Acer', 'Asus'];
    const models = ['ProBook 440', 'Latitude 5420', 'ThinkPad E14', 'Aspire 5', 'VivoBook 15'];
    const os = ['Windows 10', 'Windows 11', 'Ubuntu 22.04', 'macOS (lab)'];
    const priorities = ['baja', 'media', 'alta', 'urgente'];
    const statuses = ['pendiente', 'en_proceso', 'completado', 'cancelado'];
    const people = ['Juan Pérez', 'María López', 'Carlos Hernández', 'Ana García', 'Luis Martínez', 'Sofía Ramírez'];
    const technicians = ['Practicante A', 'Practicante B', 'Coordinación CSI', 'Soporte Turno Matutino'];

    const today = new Date();
    const nowTime = new Date().toTimeString().slice(0, 5);

    const makeOne = (i) => {
      const status = randomPick(statuses);
      const date = addDays(today, -Math.floor(Math.random() * 12)); // últimos 12 días
      const received = addDays(date, 0);
      const delivery =
        status === 'completado' ? addDays(received, Math.floor(Math.random() * 4)) : Math.random() < 0.35 ? addDays(today, Math.random() < 0.5 ? 0 : 1) : null;

      const problemPool = [
        'Equipo no enciende / se apaga solo',
        'No hay acceso a internet (WiFi UMICH)',
        'Pantalla azul (BSOD) al iniciar',
        'Instalación de Office y activación',
        'Impresora no imprime / cola detenida',
        'Actualización de drivers y mantenimiento',
        'Equipo lento por almacenamiento lleno',
        'Soporte para proyector en evento',
        'Cambio de pasta térmica y limpieza',
      ];

      return {
        user_id: state.currentUser.id,
        date: isoDate(date),
        time: nowTime,
        received_date: isoDate(received),
        delivery_date: delivery ? isoDate(delivery) : null,
        reporter_name: randomPick(people),
        department: randomPick(departments),
        coordination: Math.random() < 0.4 ? 'Coordinación Académica' : null,
        brand: randomPick(brands),
        model: randomPick(models),
        serial_number: `SN-MUESTRA-${String(i + 1).padStart(3, '0')}`,
        operating_system: randomPick(os),
        ram: randomPick(['8 GB', '16 GB', '32 GB']),
        storage: randomPick(['256 GB SSD', '512 GB SSD', '1 TB HDD']),
        user_equipo: randomPick(['Lab-01', 'Oficina-12', 'Docencia-07', 'Recepción-02']),
        description: randomPick(problemPool),
        diagnosis: Math.random() < 0.6 ? 'Diagnóstico de muestra para probar reportes y seguimiento.' : null,
        observations: `MUESTRA: registro generado automáticamente para pruebas (${i + 1}/15).`,
        assigned_to: randomPick(technicians),
        service_type: randomPick(serviceTypes),
        priority: randomPick(priorities),
        task_status: status,
        evaluation: null,
      };
    };

    const rows = Array.from({ length: 15 }, (_, i) => makeOne(i));
    const { error } = await supabase.from('activities').insert(rows);
    if (error) throw error;

    await loadActivities({ supabase });
    await loadDashboardData({ supabase });

    Swal.fire({ icon: 'success', title: 'Listo', text: 'Se cargaron 15 incidencias de muestra.', timer: 1800, showConfirmButton: false });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudieron crear los registros de muestra.' });
  } finally {
    hideLoader();
  }
}

export async function clearSampleActivities({ supabase } = {}) {
  try {
    if (!state.currentUser) return;
    if (!(state.currentUser.role === 'admin' || state.currentUser.role === 'coordinator')) {
      Swal.fire({ icon: 'error', title: 'Sin permiso', text: 'Solo admin/coordinador puede borrar datos de muestra.' });
      return;
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Borrar muestra',
      text: 'Se eliminarán todas las incidencias que tengan “MUESTRA:” en observaciones.',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;

    showLoader();

    const { data, error } = await supabase.from('activities').select('id, observations');
    if (error) throw error;
    const ids = (data || [])
      .filter((a) => String(a.observations || '').startsWith('MUESTRA:'))
      .map((a) => a.id);

    for (const id of ids) {
      const { error: delErr } = await supabase.from('activities').delete().eq('id', id);
      if (delErr) throw delErr;
    }

    await loadActivities({ supabase });
    await loadDashboardData({ supabase });
    Swal.fire({ icon: 'success', title: 'Borrado', text: `Se eliminaron ${ids.length} registros de muestra.`, timer: 1800, showConfirmButton: false });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudieron borrar los registros de muestra.' });
  } finally {
    hideLoader();
  }
}

// -------------------------
// PDF individual (usa módulo reportes.js)
// -------------------------

export async function exportActivityPDF({ supabase } = {}, id) {
  try {
    const { data, error } = await supabase.from('activities').select('*').eq('id', id).single();
    if (error) throw error;

    const shortId = String(data.id || '').slice(0, 8) || 'incidencia';
    return exportPDF(
      { supabase },
      'activities',
      {
        title: 'Reporte de Incidencia',
        filenamePrefix: `incidencia_${shortId}`,
        rows: [data],
      },
    );
  } catch {
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el PDF individual.' });
  }
}

// -------------------------
// Exportación CSV (incidencias)
// -------------------------

function getFilteredActivities() {
  const searchText = (document.getElementById('search-activities')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('filter-status')?.value || '';
  const filterService = (document.getElementById('filter-service-type')?.value || '').trim();
  const filterPriority = (document.getElementById('filter-priority')?.value || '').trim();

  let filtered = state.activitiesData;

  if (searchText) {
    filtered = filtered.filter(
      (a) =>
        String(a.reporter_name || '').toLowerCase().includes(searchText) ||
        String(a.department || '').toLowerCase().includes(searchText) ||
        String(a.description || '').toLowerCase().includes(searchText) ||
        String(a.coordination || '').toLowerCase().includes(searchText) ||
        String(a.assigned_to || '').toLowerCase().includes(searchText) ||
        String(a.folio || '').toLowerCase().includes(searchText),
    );
  }

  if (filterStatus) filtered = filtered.filter((a) => a.task_status === filterStatus);
  if (filterService) filtered = filtered.filter((a) => (a.service_type || '') === filterService);
  if (filterPriority) filtered = filtered.filter((a) => String(a.priority || 'media') === filterPriority);

  return filtered;
}

export function exportActivitiesCSV() {
  try {
    const rows = getFilteredActivities();
    const out = [
      [
        'Folio',
        'Fecha',
        'Recibido',
        'Entrega',
        'Reportante',
        'Carrera/Departamento',
        'Edificio',
        'Salón',
        'Turno',
        'Tipo de servicio',
        'Descripción',
        'Prioridad',
        'Estado',
        'Asignado a',
        'Equipo',
        'Sistema operativo',
      ],
    ];

    rows.forEach((a) => {
      const { meta, cleanText } = parseMetaBlock(a.observations || '');
      const folio = meta.folio || a.folio || '—';
      const edificio = meta.edificio || a.coordination || '';
      const carrera = meta.carrera || a.department || '';
      const salon = meta.salon || '';
      const turno = meta.turno || '';
      const tipo = meta.tipo || a.service_type || '';

      const equipo = [a.brand || '', a.model || ''].join(' ').trim();
      const obs = cleanText ? `Obs: ${cleanText}` : '';
      const descBase = (a.description || '').trim();
      const desc = [descBase, obs].filter(Boolean).join(' | ');

      out.push([
        folio,
        a.date || '',
        a.received_date || '',
        a.delivery_date || '',
        a.reporter_name || '',
        carrera,
        edificio,
        salon,
        turno,
        tipo,
        desc,
        getPriorityText(a.priority),
        getStatusText(a.task_status),
        a.assigned_to || '',
        equipo,
        a.operating_system || '',
      ]);
    });

    const today = new Date().toISOString().slice(0, 10);
    downloadCSV(`incidencias_${today}`, out);
    showToast({ type: 'success', title: 'CSV generado', message: `Registros: ${rows.length}` });
  } catch (e) {
    console.error(e);
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo exportar el CSV.' });
  }
}

export async function deleteActivity({ supabase } = {}, id) {
  try {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      Swal.fire({ icon: 'error', title: 'Sin permiso', text: 'Solo el administrador puede eliminar incidencias.' });
      return;
    }
    const result = await Swal.fire({
      title: '¿Eliminar actividad?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;

      await loadActivities({ supabase });
      await loadDashboardData({ supabase });

      Swal.fire({ icon: 'success', title: 'Eliminada', text: 'La actividad ha sido eliminada', timer: 2000, showConfirmButton: false });
    }
  } catch (error) {
    console.error('Error deleting activity:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar la actividad' });
  }
}

export async function handleActivitySubmit({ supabase } = {}, e) {
  e.preventDefault();

  try {
    showLoader();

    const id = document.getElementById('activity-id').value;

    const building = document.getElementById('act-building')?.value || '';
    const career = document.getElementById('act-career')?.value || '';
    const roomSel = document.getElementById('act-room')?.value || '';
    const roomOther = document.getElementById('act-room-other')?.value || '';
    const room = roomSel === 'Otro' ? (roomOther || 'Otro') : roomSel;
    const shift = document.getElementById('act-shift')?.value || '';

    const service = document.getElementById('act-service-type')?.value || '';
    const quick = document.getElementById('act-quick-desc')?.value || '';
    const otherText = document.getElementById('act-problem-other')?.value?.trim() || '';
    const priority = document.getElementById('act-priority')?.value || 'media';
    const taskStatus = document.getElementById('act-task-status')?.value || 'pendiente';
    const observationsUser = document.getElementById('act-observations')?.value?.trim() || '';

    if (!building || !career || !room) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Completa Edificio, Carrera y Salón.' });
      return;
    }
    if (!service) {
      Swal.fire({ icon: 'warning', title: 'Falta el tipo', text: 'Selecciona un tipo de servicio.' });
      return;
    }
    if (!quick) {
      Swal.fire({ icon: 'warning', title: 'Falta la descripción', text: 'Selecciona una descripción rápida.' });
      return;
    }
    if (quick === 'Otro' && !otherText) {
      Swal.fire({ icon: 'warning', title: 'Especifica el problema', text: 'Escribe una breve descripción.' });
      return;
    }

    const now = new Date();
    const iso = now.toISOString();
    const date = iso.slice(0, 10);
    const time = now.toTimeString().slice(0, 5);

    const folio = document.getElementById('act-folio')?.value || makeFolio();

    // Técnicos (modal avanzado) - opcionales
    const brand = document.getElementById('act-brand')?.value?.trim() || null;
    const model = document.getElementById('act-model')?.value?.trim() || null;
    const serial_number = document.getElementById('act-serial')?.value?.trim() || null;
    const operating_system = document.getElementById('act-os')?.value?.trim() || null;
    const ram = document.getElementById('act-ram')?.value?.trim() || null;
    const storage = document.getElementById('act-storage')?.value?.trim() || null;
    const user_equipo = document.getElementById('act-user-equipo')?.value?.trim() || null;
    const assigned_to = document.getElementById('act-assigned')?.value?.trim() || null;
    const diagnosis = document.getElementById('act-diagnosis')?.value?.trim() || null;

    const meta = {
      folio,
      edificio: building,
      carrera: career,
      salon: room,
      turno: shift || null,
      tipo: service,
      rapido: quick,
    };

    const description = quick === 'Otro' ? otherText : quick;
    const observations = [buildMetaBlock(meta), observationsUser].filter(Boolean).join('\n').trim() || null;

    const activityData = {
      date,
      time,
      received_date: date,
      delivery_date: null,
      reporter_name: state.currentUser?.full_name || 'Usuario',
      department: career,
      coordination: building,
      service_type: service,
      description,
      priority,
      task_status: taskStatus,
      observations,
      // opcionales (técnicos)
      brand,
      model,
      serial_number,
      operating_system,
      ram,
      storage,
      user_equipo,
      assigned_to,
      diagnosis,
      user_id: state.currentUser.id,
    };

    let error;
    if (id) {
      // Update
      const result = await supabase.from('activities').update(activityData).eq('id', id);
      error = result.error;
    } else {
      // Insert
      const result = await supabase.from('activities').insert(activityData);
      error = result.error;
    }

    if (error) throw error;

    closeActivityModal();
    await loadActivities({ supabase });
    await loadDashboardData({ supabase });

    Swal.fire({
      icon: 'success',
      title: id ? 'Actualizada' : 'Registrada',
      text: id ? 'La actividad ha sido actualizada' : 'La actividad ha sido registrada',
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error('Error saving activity:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la actividad' });
  } finally {
    hideLoader();
  }
}

// -------------------------
// MSINFO32 import + helpers
// -------------------------

export async function handleMsInfoUpload(_ctx, event) {
  const file = event.target.files[0];
  if (!file) return;

  const text = await file.text();
  const data = parseMsInfoReport(text);

  if (data) {
    document.getElementById('act-brand').value = data.manufacturer || document.getElementById('act-brand').value;
    document.getElementById('act-model').value = data.model || document.getElementById('act-model').value;
    document.getElementById('act-os').value = data.osName || document.getElementById('act-os').value;
    document.getElementById('act-ram').value = data.totalMemory || document.getElementById('act-ram').value;
    document.getElementById('act-storage').value = data.primaryStorage || document.getElementById('act-storage').value;
    document.getElementById('act-serial').value = data.serialNumber || document.getElementById('act-serial').value;
    document.getElementById('act-user-equipo').value = data.registeredOwner || document.getElementById('act-user-equipo').value;
  }
}

function parseMsInfoReport(text) {
  const lines = text.split(/\r?\n/);
  const values = {};

  const normalize = (s) =>
    (s || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const keyMap = new Map([
    // EN
    ['system manufacturer', 'manufacturer'],
    ['system model', 'model'],
    ['os name', 'osName'],
    ['installed physical memory (ram)', 'totalMemory'],
    ['total physical memory', 'totalMemory'],
    ['system serial number', 'serialNumber'],
    ['system sku', 'serialNumber'],
    ['serial number', 'serialNumber'],
    ['registered owner', 'registeredOwner'],
    // ES (según idioma del sistema)
    ['fabricante del sistema', 'manufacturer'],
    ['modelo del sistema', 'model'],
    ['nombre del so', 'osName'],
    ['nombre del sistema operativo', 'osName'],
    ['memoria fisica instalada (ram)', 'totalMemory'],
    ['memoria fisica total', 'totalMemory'],
    ['numero de serie del sistema', 'serialNumber'],
    ['propietario registrado', 'registeredOwner'],
  ]);

  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const rawKey = line.slice(0, idx);
    const rawValue = line.slice(idx + 1);

    const key = normalize(rawKey);
    const value = (rawValue || '').trim();
    if (!key || !value) continue;

    const mapped = keyMap.get(key);
    if (!mapped) continue;

    if (mapped === 'serialNumber' && values.serialNumber) continue;
    if (mapped === 'totalMemory' && values.totalMemory) continue;

    values[mapped] = value;
  }

  // Infer primary storage if possible (varía según idioma)
  const storageMatch = text.match(/(\d+\.?\d*\s?(GB|TB))\s+(SSD|HDD|NVMe)/i) || text.match(/(SSD|HDD|NVMe).*?(\d+\.?\d*\s?(GB|TB))/i);
  if (storageMatch) values.primaryStorage = storageMatch[0].replace(/\s+/g, ' ').trim();

  return values;
}

export async function copyMsinfoCommand() {
  const cmd = 'msinfo32 /report C:\\\\reporte-equipo.txt';
  try {
    await navigator.clipboard.writeText(cmd);
    Swal.fire({ icon: 'success', title: 'Copiado', text: 'Comando copiado al portapapeles', timer: 1500, showConfirmButton: false });
  } catch {
    Swal.fire({ icon: 'info', title: 'Copia manual', text: cmd });
  }
}

export function downloadMsinfoScript() {
  const content = [
    '@echo off',
    'setlocal',
    'set "OUT=%USERPROFILE%\\\\Desktop\\\\reporte-equipo.txt"',
    'echo Generando reporte del equipo (MSINFO32)...',
    'echo Esto puede tardar un momento.',
    'msinfo32 /report "%OUT%"',
    'echo.',
    'echo Listo: %OUT%',
    'echo Abriendo el archivo...',
    'start "" "%OUT%"',
    'echo.',
    'echo Luego sube ese archivo en la pagina (Archivo de informe MSINFO32).',
    'pause',
  ].join('\r\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'generar_reporte_equipo.cmd';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
