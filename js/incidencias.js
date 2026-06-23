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
} from './utils.js?v=1.5.4';
import { canEditOwnedOrRole, canDelete } from './permissions.js?v=1.5.4';
import { updateNotificationBadge, loadDashboardData } from './dashboard.js?v=1.5.4';
import { exportPDF } from './reportes.js?v=1.5.4';
import { LOCAL_STORAGE_PREFIX } from './config.js?v=1.5.4';

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

function getMaintenanceServiceType(type = 'correctivo') {
  return String(type).toLowerCase() === 'preventivo'
    ? 'Mantenimiento preventivo'
    : 'Mantenimiento correctivo';
}

function getMaintenanceLabel(type = 'correctivo') {
  return String(type).toLowerCase() === 'preventivo' ? 'preventivo' : 'correctivo';
}

function setInlineSubmitState(form, isLoading = false) {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;

  const label = button.querySelector('span');
  const defaultText = button.dataset.defaultText || label?.textContent || 'Guardar';

  if (isLoading) {
    button.disabled = true;
    button.classList.add('opacity-80', 'cursor-not-allowed');
    if (label) label.textContent = 'Guardando...';
  } else {
    button.disabled = false;
    button.classList.remove('opacity-80', 'cursor-not-allowed');
    if (label) label.textContent = defaultText;
  }
}

function emphasizeMaintenanceForm(form) {
  if (!form) return;
  form.classList.add('ring-2', 'ring-offset-2', 'ring-gray-300', 'dark:ring-gray-600');
  setTimeout(() => {
    form.classList.remove('ring-2', 'ring-offset-2', 'ring-gray-300', 'dark:ring-gray-600');
  }, 1600);
}

function getActivityUiMeta(activity = {}) {
  const { meta, cleanText } = parseMetaBlock(activity.observations || '');
  const maintenanceType = String(meta.mantenimiento || '').toLowerCase().trim() ||
    (String(activity.service_type || '').toLowerCase().includes('mantenimiento preventivo') ? 'preventivo' : '') ||
    (String(activity.service_type || '').toLowerCase().includes('mantenimiento correctivo') ? 'correctivo' : '') ||
    'correctivo';
  const isPreventive = maintenanceType === 'preventivo';

  return {
    meta,
    cleanText,
    maintenanceType,
    maintenanceLabel: isPreventive ? 'Preventivo' : 'Correctivo',
    maintenanceBadgeClass: isPreventive
      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800',
    location: meta.edificio || activity.coordination || 'Sin ubicación',
    area: meta.carrera || activity.department || 'Sin área',
    folio: meta.folio || activity.folio || '—',
  };
}

function buildActivityActionButtons(activity, { canEdit = false, canDel = false, canDeliver = false, compact = false } = {}) {
  const baseClass = compact
    ? 'inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
    : 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors';

  return `
    <button onclick="viewActivity('${activity.id}')" class="${baseClass}" title="Ver detalle">
      <i class="fas fa-eye"></i>${compact ? '' : '<span>Ver</span>'}
    </button>
    <button onclick="exportActivityPDF('${activity.id}')" class="${baseClass}" title="PDF individual">
      <i class="fas fa-file-pdf text-red-500"></i>${compact ? '' : '<span>PDF</span>'}
    </button>
    ${canDeliver ? `
      <button onclick="markDelivered('${activity.id}')" class="${baseClass}" title="Marcar entregado">
        <i class="fas fa-check-double text-green-600"></i>${compact ? '' : '<span>Finalizar</span>'}
      </button>
    ` : ''}
    ${canEdit ? `
      <button onclick="editActivity('${activity.id}')" class="${baseClass}" title="Editar">
        <i class="fas fa-pen text-blue-500"></i>${compact ? '' : '<span>Editar</span>'}
      </button>
    ` : ''}
    ${canDel ? `
      <button onclick="deleteActivity('${activity.id}')" class="${baseClass}" title="Eliminar">
        <i class="fas fa-trash text-red-500"></i>${compact ? '' : '<span>Eliminar</span>'}
      </button>
    ` : ''}
  `;
}

function renderActivitiesCards(list = []) {
  const grid = document.getElementById('activities-records-grid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `
      <div class="col-span-full rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/50 p-12 text-center">
        <div class="w-16 h-16 mx-auto rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center">
          <i class="fas fa-clipboard-list text-gray-400 dark:text-gray-500 text-2xl"></i>
        </div>
        <h4 class="text-xl font-bold text-gray-900 dark:text-white mt-5">No hay incidencias registradas</h4>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">Crea una nueva incidencia preventiva o correctiva para empezar a llevar el control.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map((activity) => {
    const canEdit = canEditOwnedOrRole(state.currentUser, activity.user_id);
    const canDel = canDelete(state.currentUser);
    const canDeliver = canEdit && !['completado', 'cancelado'].includes(String(activity.task_status || '').toLowerCase());
    const ui = getActivityUiMeta(activity);
    const statusLabel = getStatusText(activity.task_status);
    const statusClass = `badge badge-${getBadgeClass(activity.task_status)}`;
    const priorityLabel = getPriorityText(activity.priority);
    const priorityClass = `badge badge-priority-${String(activity.priority || 'media')}`;
    const technicalInfo = [activity.brand, activity.model].filter(Boolean).join(' · ') || 'Sin datos técnicos';
    const extraText = ui.cleanText || 'Sin observaciones adicionales';

    return `
      <article class="relative flex flex-col rounded-[2rem] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg shadow-gray-200/50 dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group">
        <!-- Decorator line on top -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
        
        <!-- Header -->
        <div class="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-3">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${ui.maintenanceBadgeClass}">${ui.maintenanceLabel}</span>
              <span class="${statusClass} px-3 py-1 text-xs font-bold uppercase">${statusLabel}</span>
              <span class="${priorityClass} px-3 py-1 text-xs font-bold uppercase">${priorityLabel}</span>
            </div>
            <h4 class="text-xl font-bold text-gray-900 dark:text-white leading-tight">${activity.reporter_name || 'Sin reportante'}</h4>
            <div class="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
              <i class="fas fa-building mr-2 text-gray-400"></i> ${ui.area}
            </div>
          </div>
          <div class="sm:text-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm min-w-[140px]">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-1">Folio</p>
            <p class="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">${ui.folio}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium"><i class="far fa-calendar-alt mr-1"></i>${formatDate(activity.date)}</p>
          </div>
        </div>

        <!-- Body -->
        <div class="p-6 flex-1 flex flex-col gap-5">
          <!-- Info Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <p class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Ubicación</p>
              <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center"><i class="fas fa-map-marker-alt text-gray-400 mr-2"></i> ${ui.location}</p>
            </div>
            <div class="flex flex-col gap-1">
              <p class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Tipo de Servicio</p>
              <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center"><i class="fas fa-tools text-gray-400 mr-2"></i> ${activity.service_type || ui.maintenanceLabel}</p>
            </div>
          </div>

          <!-- Description -->
          <div class="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <p class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Descripción del problema</p>
            <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">${activity.description || 'Sin descripción registrada'}</p>
          </div>
          
          <!-- Extra Data -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1">
              <p class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Datos Técnicos</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">${technicalInfo}</p>
            </div>
            <div class="flex flex-col gap-1">
              <p class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Observaciones</p>
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">${extraText}</p>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex flex-wrap sm:flex-nowrap justify-end gap-2 mt-auto">
          ${buildActivityActionButtons(activity, { canEdit, canDel, canDeliver, compact: false })}
        </div>
      </article>
    `;
  }).join('');
}

export function openMaintenanceFormSection(type = 'correctivo') {
  const normalized = getMaintenanceLabel(type);
  try {
    if (typeof window._showSection === 'function') window._showSection('activities');
    else if (typeof window.showSection === 'function') window.showSection('activities');
  } catch {
    // noop
  }

  const formId = normalized === 'preventivo' ? 'preventive-maintenance-form' : 'corrective-maintenance-form';
  const form = document.getElementById(formId);
  if (!form) return;

  setTimeout(() => {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    emphasizeMaintenanceForm(form);
    const firstField = form.querySelector('input[type="text"], textarea, select');
    firstField?.focus?.();
  }, 80);
}

async function handleIndependentMaintenanceSubmit({ supabase } = {}, event) {
  event.preventDefault();

  const form = event.currentTarget;
  if (!form) return;

  const formData = new FormData(form);
  const maintenanceType = getMaintenanceLabel(formData.get('maintenance_kind') || 'correctivo');
  const commission = String(formData.get('commission') || '').trim();
  const reporterName = String(formData.get('reporter_name') || '').trim();
  const location = String(formData.get('location') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const taskStatusRaw = String(formData.get('status') || 'pendiente').trim().toLowerCase();
  const taskStatus = ['pendiente', 'en_proceso', 'completado'].includes(taskStatusRaw) ? taskStatusRaw : 'pendiente';

  const validationErrors = [];
  if (!commission) validationErrors.push('Comisión Académica o Área');
  if (!reporterName) validationErrors.push('Nombre Completo de Quien Reporta');
  if (!location) validationErrors.push('Ubicación Específica');
  if (!description) validationErrors.push('Descripción de la actividad');

  if (validationErrors.length > 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Completa los campos requeridos',
      html: `<div style="text-align:left">${validationErrors.map((item) => `<div style="margin:6px 0">• ${item}</div>`).join('')}</div>`,
      confirmButtonText: 'Entendido',
    });
    return;
  }

  setInlineSubmitState(form, true);

  try {
    showLoader();

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5);
    const folio = makeFolio();
    const serviceType = getMaintenanceServiceType(maintenanceType);
    const creatorName = state.currentUser?.full_name || state.currentUser?.email || reporterName;

    const meta = {
      folio,
      edificio: location,
      carrera: commission,
      salon: '',
      turno: null,
      mantenimiento: maintenanceType,
      tipo: serviceType,
      rapido: description,
      creado_por: creatorName,
      creado_email: state.currentUser?.email || null,
      formulario: 'bitacora_independiente',
    };

    const observations = buildMetaBlock(meta);
    const activityData = {
      date,
      time,
      received_date: date,
      delivery_date: taskStatus === 'completado' ? date : null,
      reporter_name: reporterName,
      department: commission,
      coordination: location,
      service_type: serviceType,
      description,
      priority: 'media',
      task_status: taskStatus,
      observations,
      assigned_to: null,
      user_id: state.currentUser?.id,
    };

    const { error } = await supabase.from('activities').insert(activityData);
    if (error) throw error;

    form.reset();
    await loadActivities({ supabase });
    await loadDashboardData({ supabase });

    const maintenanceLabel = maintenanceType === 'preventivo' ? 'Preventivo' : 'Correctivo';
    Swal.fire({
      icon: 'success',
      title: 'Registro guardado',
      html: `<div style="text-align:center"><b>${maintenanceLabel}</b> registrado con folio <b>${folio}</b>.</div>`,
      timer: 2200,
      showConfirmButton: false,
    });
    showToast({ type: 'success', title: 'Guardado', message: `Folio: ${folio}` });
  } catch (error) {
    console.error('Error saving independent maintenance form:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error al guardar',
      text: error?.message || 'No se pudo guardar el formulario de mantenimiento.',
      confirmButtonText: 'Entendido',
    });
  } finally {
    hideLoader();
    setInlineSubmitState(form, false);
  }
}

export function initializeIndependentMaintenanceForms({ supabase } = {}) {
  ['preventive-maintenance-form', 'corrective-maintenance-form'].forEach((formId) => {
    const form = document.getElementById(formId);
    if (!form || form.dataset.wired === 'true') return;
    form.dataset.wired = 'true';
    form.addEventListener('submit', (event) => handleIndependentMaintenanceSubmit({ supabase }, event));
  });
}

function setSelectedByDataAttr(selector, value) {
  // Para segmented control (maint-btn)
  if (selector === '.act-maint-btn') {
    document.querySelectorAll(selector).forEach((b) => {
      b.classList.remove('bg-black', 'dark:bg-white', 'text-white', 'dark:text-black', 'shadow-md');
      b.classList.add('bg-transparent', 'text-gray-700', 'dark:text-gray-300');
    });
    if (value) {
      document.querySelectorAll(`${selector}[data-value="${value}"]`).forEach((b) => {
        b.classList.remove('bg-transparent', 'text-gray-700', 'dark:text-gray-300');
        b.classList.add('bg-black', 'dark:bg-white', 'text-white', 'dark:text-black', 'shadow-md');
      });
    }
  } else {
    // Para otros selectores
    document.querySelectorAll(selector).forEach((b) => b.classList.remove('ring-2', 'ring-black', 'dark:ring-white'));
    if (!value) return;
    document.querySelectorAll(`${selector}[data-value="${value}"]`).forEach((b) => b.classList.add('ring-2', 'ring-black', 'dark:ring-white'));
  }
}

function renderLocationFieldsByMaintenanceType(type) {
  const fieldsContainer = document.getElementById('maint-location-fields');
  const titleEl = document.getElementById('maint-location-title');
  const subtitleEl = document.getElementById('maint-location-subtitle');

  if (!fieldsContainer) return;

  if (type === 'preventivo') {
    titleEl.textContent = '### Ubicación - Mantenimiento Preventivo';
    subtitleEl.textContent = 'Selecciona el área/acción académica y responsable.';
    
    fieldsContainer.innerHTML = `
      <div>
        <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Acción Académica / Área *</label>
        <select id="act-building" required class="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white transition-all">
          <option value="">Selecciona…</option>
          <option value="Coordinación CSI">Coordinación CSI</option>
          <option value="Soporte Técnico">Soporte Técnico</option>
          <option value="Infraestructura">Infraestructura</option>
          <option value="Redes">Redes</option>
          <option value="Desarrollo">Desarrollo</option>
          <option value="Otro">Otro…</option>
        </select>
        <input type="text" id="act-building-other-input" class="hidden mt-2 w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white transition-all" placeholder="Especifica el área">
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Nombre Completo de Quien Reporta *</label>
        <input type="text" id="act-career" required class="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white transition-all" placeholder="Ej. Juan Pérez García">
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Ubicación Específica *</label>
        <input type="text" id="act-room" required class="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white transition-all" placeholder="Ej. Edificio A, Aula 5">
      </div>
    `;
  } else {
    // Correctivo
    titleEl.textContent = '### Ubicación - Mantenimiento Correctivo';
    subtitleEl.textContent = 'Selecciona el área/acción académica y responsable.';
    
    fieldsContainer.innerHTML = `
      <div>
        <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Acción Académica / Área *</label>
        <select id="act-building" required class="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white transition-all">
          <option value="">Selecciona…</option>
          <option value="Coordinación CSI">Coordinación CSI</option>
          <option value="Soporte Técnico">Soporte Técnico</option>
          <option value="Infraestructura">Infraestructura</option>
          <option value="Redes">Redes</option>
          <option value="Desarrollo">Desarrollo</option>
          <option value="Otro">Otro…</option>
        </select>
        <input type="text" id="act-building-other-input" class="hidden mt-2 w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white transition-all" placeholder="Especifica el área">
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Nombre Completo de Quien Reporta *</label>
        <input type="text" id="act-career" required class="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white transition-all" placeholder="Ej. Juan Pérez García">
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Ubicación Específica *</label>
        <input type="text" id="act-room" required class="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white transition-all" placeholder="Ej. Edificio A, Aula 5">
      </div>
    `;
  }

  // Re-wire event listeners after rendering
  rewireLocationFields();
}

function rewireLocationFields() {
  // Building "Otro"
  const buildingSel = document.getElementById('act-building');
  const buildingOther = document.getElementById('act-building-other-input');
  const buildingOtherHidden = document.getElementById('act-building-other');
  if (buildingSel) {
    buildingSel.addEventListener('change', () => {
      const isOther = buildingSel.value === 'Otro';
      if (buildingOther) buildingOther.classList.toggle('hidden', !isOther);
      if (!isOther && buildingOther) buildingOther.value = '';
      if (!isOther && buildingOtherHidden) buildingOtherHidden.value = '';
    });
  }
  if (buildingOther) {
    buildingOther.addEventListener('input', () => {
      if (buildingOtherHidden) buildingOtherHidden.value = buildingOther.value;
    });
  }

  // Career "Otro" (only for correctivo)
  const careerSel = document.getElementById('act-career');
  const careerOther = document.getElementById('act-career-other-input');
  const careerOtherHidden = document.getElementById('act-career-other');
  if (careerSel && careerOther) {
    careerSel.addEventListener('change', () => {
      const isOther = careerSel.value === 'Otro';
      if (careerOther) careerOther.classList.toggle('hidden', !isOther);
      if (!isOther && careerOther) careerOther.value = '';
      if (!isOther && careerOtherHidden) careerOtherHidden.value = '';
    });
  }
  if (careerOther) {
    careerOther.addEventListener('input', () => {
      if (careerOtherHidden) careerOtherHidden.value = careerOther.value;
    });
  }

  // Room "Otro" (only for correctivo)
  const roomSel = document.getElementById('act-room');
  const roomOther = document.getElementById('act-room-other-input');
  const roomOtherHidden = document.getElementById('act-room-other');
  if (roomSel && roomOther) {
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

  // Shift buttons
  const shiftInput = document.getElementById('act-shift');
  document.querySelectorAll('.act-shift-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-value') || '';
      if (shiftInput) shiftInput.value = v;
      setSelectedByDataAttr('.act-shift-btn', v);
    });
  });
}

function ensureIncidenciaUXWired() {
  const form = document.getElementById('form-activity');
  if (!form || form.dataset.uxWired === 'true') return;
  form.dataset.uxWired = 'true';

  // Función auxiliar para validar campos en tiempo real
  const validateField = (fieldId, fieldName) => {
    const input = document.getElementById(fieldId);
    if (!input) return;

    const validate = () => {
      const isEmpty = !input.value || input.value.trim() === '';
      const parent = input.closest('.grid > div') || input.closest('[class*="flex"]');
      
      if (parent && isEmpty) {
        input.classList.add('border-red-500', 'focus:border-red-500');
        input.classList.remove('border-green-500', 'focus:border-green-500');
      } else if (parent && !isEmpty) {
        input.classList.remove('border-red-500', 'focus:border-red-500');
        input.classList.add('border-green-500', 'focus:border-green-500');
      }
    };

    input.addEventListener('blur', validate);
    input.addEventListener('input', validate);
  };

  // Validar campos clave
  validateField('act-career', 'Nombre');
  validateField('act-room', 'Ubicación');
  validateField('act-observations', 'Observaciones');

  // Tipo de mantenimiento (preventivo/correctivo) - se guarda en meta (observaciones)
  const maintInput = document.getElementById('act-maint-type');
  document.querySelectorAll('.act-maint-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-value') || 'correctivo';
      if (maintInput) maintInput.value = v;
      setSelectedByDataAttr('.act-maint-btn', v);
      renderLocationFieldsByMaintenanceType(v);
      // Scroll automático para ver los nuevos campos
      setTimeout(() => {
        const locationSection = document.querySelector('[class*="Ubicación"]');
        if (locationSection) locationSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    });
  });

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
      if (otherArea) {
        otherArea.classList.toggle('hidden', !showOther);
        if (showOther) {
          setTimeout(() => otherArea.focus(), 200);
        }
      }
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

  // Edificio "Otro"
  const buildingSel = document.getElementById('act-building');
  const buildingOther = document.getElementById('act-building-other-input');
  const buildingOtherHidden = document.getElementById('act-building-other');
  if (buildingSel) {
    buildingSel.addEventListener('change', () => {
      const isOther = buildingSel.value === 'Otro';
      if (buildingOther) buildingOther.classList.toggle('hidden', !isOther);
      if (!isOther && buildingOther) buildingOther.value = '';
      if (!isOther && buildingOtherHidden) buildingOtherHidden.value = '';
    });
  }
  if (buildingOther) {
    buildingOther.addEventListener('input', () => {
      if (buildingOtherHidden) buildingOtherHidden.value = buildingOther.value;
    });
  }

  // Carrera "Otro"
  const careerSel = document.getElementById('act-career');
  const careerOther = document.getElementById('act-career-other-input');
  const careerOtherHidden = document.getElementById('act-career-other');
  if (careerSel) {
    careerSel.addEventListener('change', () => {
      const isOther = careerSel.value === 'Otro';
      if (careerOther) careerOther.classList.toggle('hidden', !isOther);
      if (!isOther && careerOther) careerOther.value = '';
      if (!isOther && careerOtherHidden) careerOtherHidden.value = '';
    });
  }
  if (careerOther) {
    careerOther.addEventListener('input', () => {
      if (careerOtherHidden) careerOtherHidden.value = careerOther.value;
    });
  }

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
    populateServiceTypeFilterOptions();
    renderActivitiesTable();
    updateNotificationBadge();
  } catch (error) {
    console.error('Error loading activities:', error);
  }
}

function populateServiceTypeFilterOptions() {
  const sel = document.getElementById('filter-service-type');
  if (!sel) return;

  const current = sel.value || '';
  const fixed = Array.from(sel.querySelectorAll('option'))
    .map((o) => o.value)
    .filter((v) => v && v.trim());
  const fromData = (state.activitiesData || [])
    .map((a) => String(a.service_type || '').trim())
    .filter(Boolean);
  const merged = Array.from(new Set([...fixed, ...fromData])).sort((a, b) => a.localeCompare(b, 'es'));

  sel.innerHTML =
    `<option value="">Todos</option>` + merged.map((v) => `<option value="${v.replaceAll('"', '&quot;')}">${v}</option>`).join('');
  sel.value = merged.includes(current) ? current : '';
}

export function renderActivitiesTable() {
  const tbody = document.getElementById('table-activities');
  if (!tbody) return;

  const searchText = (document.getElementById('search-activities')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('filter-status')?.value || '';
  const filterService = (document.getElementById('filter-service-type')?.value || '').trim();
  const filterPriority = (document.getElementById('filter-priority')?.value || '').trim();
  const filterMaint = (document.getElementById('filter-maint-type')?.value || '').trim().toLowerCase();
  const filterDelivery = (document.getElementById('filter-delivery')?.value || '').trim().toLowerCase();
  const sortBy = (document.getElementById('activities-sort')?.value || 'date_desc').trim();

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

  if (filterMaint) {
    filtered = filtered.filter((a) => {
      const { meta } = parseMetaBlock(a.observations || '');
      const raw = String(meta.mantenimiento || '').toLowerCase().trim();
      const inferred =
        raw ||
        (String(a.service_type || '').toLowerCase().includes('mantenimiento preventivo') ? 'preventivo' : '') ||
        (String(a.service_type || '').toLowerCase().includes('mantenimiento correctivo') ? 'correctivo' : '') ||
        'correctivo';
      return inferred === filterMaint;
    });
  }
  if (filterStatus) {
    if (filterStatus === 'activos') filtered = filtered.filter((a) => ['pendiente', 'en_proceso'].includes(String(a.task_status || '').toLowerCase()));
    else filtered = filtered.filter((a) => a.task_status === filterStatus);
  }
  if (filterService) filtered = filtered.filter((a) => (a.service_type || '') === filterService);
  if (filterPriority) filtered = filtered.filter((a) => String(a.priority || 'media') === filterPriority);

  if (filterDelivery) {
    const today = new Date().toISOString().split('T')[0];
    const isOpen = (a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase());
    const inNext7 = (iso) => {
      if (!iso) return false;
      const d0 = new Date(today);
      const d1 = new Date(String(iso).slice(0, 10));
      const diff = Math.floor((d1 - d0) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    };
    filtered = filtered.filter((a) => {
      const d = a.delivery_date ? String(a.delivery_date).slice(0, 10) : '';
      if (filterDelivery === 'none') return !d;
      if (!d) return false;
      if (filterDelivery === 'today') return isOpen(a) && d === today;
      if (filterDelivery === 'overdue') return isOpen(a) && d < today;
      if (filterDelivery === 'next7') return isOpen(a) && inNext7(d);
      return true;
    });
  }

  const priorityWeight = { urgente: 4, alta: 3, media: 2, baja: 1 };
  const openWeight = { pendiente: 1, en_proceso: 2, completado: 3, cancelado: 4 };
  filtered = [...filtered].sort((a, b) => {
    const ad = String(a.date || '');
    const bd = String(b.date || '');
    const adel = a.delivery_date ? String(a.delivery_date).slice(0, 10) : '9999-12-31';
    const bdel = b.delivery_date ? String(b.delivery_date).slice(0, 10) : '9999-12-31';
    switch (sortBy) {
      case 'date_asc':
        return ad.localeCompare(bd);
      case 'delivery_asc':
        return adel.localeCompare(bdel) || ad.localeCompare(bd);
      case 'priority_desc':
        return (priorityWeight[String(b.priority || 'media')] || 0) - (priorityWeight[String(a.priority || 'media')] || 0) || adel.localeCompare(bdel);
      case 'status_open':
        return (openWeight[String(a.task_status || '')] || 99) - (openWeight[String(b.task_status || '')] || 99) || adel.localeCompare(bdel);
      case 'date_desc':
      default:
        return bd.localeCompare(ad);
    }
  });

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
    renderActivitiesCards([]);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
          <div class="flex flex-col items-center gap-2">
            <div class="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <i class="fas fa-clipboard-list text-gray-500 dark:text-gray-300"></i>
            </div>
            <div class="font-semibold">No se encontraron incidencias</div>
            <div class="text-sm">Prueba cambiando filtros o crea una nueva incidencia.</div>
            <button onclick="openMaintenanceFormSection('correctivo')" class="mt-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all">
              <i class="fas fa-plus mr-2"></i>
              Nueva correctiva
            </button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  renderActivitiesCards(paginated);
  tbody.innerHTML = paginated
    .map((activity) => {
      const canEdit = canEditOwnedOrRole(state.currentUser, activity.user_id);
      const canDel = canDelete(state.currentUser);
      const canDeliver = canEdit && !['completado', 'cancelado'].includes(String(activity.task_status || '').toLowerCase());
      const ui = getActivityUiMeta(activity);

      return `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">${formatDate(activity.date)}</td>
          <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${activity.reporter_name}</td>
          <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${ui.area}</td>
          <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${ui.location}</td>
          <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">${activity.description}</td>
          <td class="hidden lg:table-cell px-6 py-4">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ui.maintenanceBadgeClass}">${ui.maintenanceLabel}</span>
          </td>
          <td class="hidden lg:table-cell px-6 py-4">
            <span class="badge badge-${getBadgeClass(activity.task_status)}">${getStatusText(activity.task_status)}</span>
          </td>
          <td class="px-6 py-4">
            <div class="flex justify-center flex-wrap gap-2">
              ${buildActivityActionButtons(activity, { canEdit, canDel, canDeliver, compact: true })}
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
  const preventive = list.filter((a) => getActivityUiMeta(a).maintenanceType === 'preventivo').length;
  const corrective = list.filter((a) => getActivityUiMeta(a).maintenanceType === 'correctivo').length;

  el.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      <div class="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 bg-white/80 dark:bg-gray-900/50 shadow-sm">
        <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Registros</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-2">${total}</p>
      </div>
      <div class="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 p-4 bg-emerald-50/60 dark:bg-emerald-900/10">
        <p class="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Preventivo</p>
        <p class="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-2">${preventive}</p>
      </div>
      <div class="rounded-2xl border border-orange-200 dark:border-orange-900/40 p-4 bg-orange-50/60 dark:bg-orange-900/10">
        <p class="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wider">Correctivo</p>
        <p class="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-2">${corrective}</p>
      </div>
      <div class="rounded-2xl border border-orange-200 dark:border-orange-900/40 p-4 bg-orange-50/60 dark:bg-orange-900/10">
        <p class="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wider">Pendientes</p>
        <p class="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-2">${pending}</p>
      </div>
      <div class="rounded-2xl border border-blue-200 dark:border-blue-900/40 p-4 bg-blue-50/60 dark:bg-blue-900/10">
        <p class="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">En proceso</p>
        <p class="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-2">${inProgress}</p>
      </div>
      <div class="rounded-2xl border border-green-200 dark:border-green-900/40 p-4 bg-green-50/60 dark:bg-green-900/10">
        <p class="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">Completadas</p>
        <p class="text-2xl font-bold text-green-700 dark:text-green-300 mt-2">${completed}</p>
      </div>
      <div class="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/60 dark:bg-gray-800/40">
        <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Canceladas</p>
        <p class="text-2xl font-bold text-gray-700 dark:text-gray-200 mt-2">${canceled}</p>
      </div>
      <div class="rounded-2xl border border-red-200 dark:border-red-900/40 p-4 bg-red-50/60 dark:bg-red-900/10">
        <p class="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wider">Atrasadas</p>
        <p class="text-2xl font-bold text-red-700 dark:text-red-300 mt-2">${overdueCount}</p>
      </div>
      <div class="rounded-2xl border border-yellow-200 dark:border-yellow-900/40 p-4 bg-yellow-50/60 dark:bg-yellow-900/10">
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
  const mt = document.getElementById('filter-maint-type');
  const dlv = document.getElementById('filter-delivery');
  const sort = document.getElementById('activities-sort');
  if (s) s.value = '';
  if (st) st.value = '';
  if (sv) sv.value = '';
  if (pr) pr.value = '';
  if (mt) mt.value = '';
  if (dlv) dlv.value = '';
  if (sort) sort.value = 'date_desc';
  state.currentPage = 1;
  renderActivitiesTable();
}

export function filterActivities() {
  state.currentPage = 1;
  renderActivitiesTable();
}

export function setActivitiesMaintenanceFilter(value = '') {
  const mt = document.getElementById('filter-maint-type');
  if (mt) mt.value = value;
  state.currentPage = 1;
  renderActivitiesTable();
}

export function setActivitiesStatusFilter(value = '') {
  const st = document.getElementById('filter-status');
  if (st) st.value = value;
  state.currentPage = 1;
  renderActivitiesTable();
}

export function setActivitiesPriorityFilter(value = '') {
  const pr = document.getElementById('filter-priority');
  if (pr) pr.value = value;
  state.currentPage = 1;
  renderActivitiesTable();
}

export function setActivitiesDeliveryFilter(value = '') {
  const dlv = document.getElementById('filter-delivery');
  if (dlv) dlv.value = value;
  state.currentPage = 1;
  renderActivitiesTable();
}

export function setActivitiesSort(value = 'date_desc') {
  const sort = document.getElementById('activities-sort');
  if (sort) sort.value = value;
  state.currentPage = 1;
  renderActivitiesTable();
}

export function openActivitiesPreset(status = '', maint = '', priority = '', delivery = '', sort = 'date_desc') {
  const st = document.getElementById('filter-status');
  const mt = document.getElementById('filter-maint-type');
  const pr = document.getElementById('filter-priority');
  const dlv = document.getElementById('filter-delivery');
  const sortEl = document.getElementById('activities-sort');
  const search = document.getElementById('search-activities');
  const service = document.getElementById('filter-service-type');
  if (search) search.value = '';
  if (service) service.value = '';
  if (st) st.value = status;
  if (mt) mt.value = maint;
  if (pr) pr.value = priority;
  if (dlv) dlv.value = delivery;
  if (sortEl) sortEl.value = sort || 'date_desc';
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

export function showActivityModal(defaultMaintType = 'correctivo') {
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
  const maint = document.getElementById('act-maint-type');
  const maintNormalized = ['preventivo', 'correctivo'].includes(String(defaultMaintType).toLowerCase())
    ? String(defaultMaintType).toLowerCase()
    : 'correctivo';
  if (pri) pri.value = 'media';
  if (st) st.value = 'pendiente';
  if (maint) maint.value = maintNormalized;

  setSelectedByDataAttr('.act-priority-card', 'media');
  setSelectedByDataAttr('.act-status-chip', 'pendiente');
  setSelectedByDataAttr('.act-maint-btn', maintNormalized);
  setSelectedByDataAttr('.act-service-card', '');
  setSelectedByDataAttr('.act-quick-chip', '');

  // Render dynamic location fields based on maintenance type
  renderLocationFieldsByMaintenanceType(maintNormalized);

  const buildingOtherHidden = document.getElementById('act-building-other');
  const careerOtherHidden = document.getElementById('act-career-other');
  if (buildingOtherHidden) buildingOtherHidden.value = '';
  if (careerOtherHidden) careerOtherHidden.value = '';
  const shiftInput = document.getElementById('act-shift');
  if (shiftInput) {
    shiftInput.value = '';
    setSelectedByDataAttr('.act-shift-btn', '');
  }

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

    const form = document.getElementById('form-activity');
    if (form) form.reset();
    document.getElementById('act-building-other-input')?.classList.add('hidden');
    document.getElementById('act-career-other-input')?.classList.add('hidden');
    document.getElementById('act-room-other-input')?.classList.add('hidden');
    const initialBuildingOtherHidden = document.getElementById('act-building-other');
    if (initialBuildingOtherHidden) initialBuildingOtherHidden.value = '';
    const initialCareerOtherHidden = document.getElementById('act-career-other');
    if (initialCareerOtherHidden) initialCareerOtherHidden.value = '';
    const initialRoomOtherHidden = document.getElementById('act-room-other');
    if (initialRoomOtherHidden) initialRoomOtherHidden.value = '';
    const initialShiftEl = document.getElementById('act-shift');
    if (initialShiftEl) initialShiftEl.value = '';

    const modal = document.getElementById('modal-activity');
    modal.classList.remove('hidden');
    modal.classList.add('show');
    document.getElementById('modal-activity-title').textContent = 'Editar Actividad';

    document.getElementById('activity-id').value = data.id;

    const { meta, cleanText } = parseMetaBlock(data.observations || '');
    const maintHidden = document.getElementById('act-maint-type');
    const inferredMaint =
      String(meta.mantenimiento || '').toLowerCase().trim() ||
      (String(data.service_type || '').toLowerCase().includes('mantenimiento preventivo') ? 'preventivo' : '') ||
      (String(data.service_type || '').toLowerCase().includes('mantenimiento correctivo') ? 'correctivo' : '') ||
      'correctivo';
    if (maintHidden) maintHidden.value = inferredMaint;
    setSelectedByDataAttr('.act-maint-btn', inferredMaint);

    // Render dynamic location fields based on maintenance type
    renderLocationFieldsByMaintenanceType(inferredMaint);

    // Ubicación (mapeo actual: coordination=edificio, department=carrera)
    const building = meta.edificio || data.coordination || '';
    const career = meta.carrera || data.department || '';
    const room = meta.salon || '';
    const shift = meta.turno || '';

    const buildingEl = document.getElementById('act-building');
    const buildingOtherInput = document.getElementById('act-building-other-input');
    const buildingOtherHidden = document.getElementById('act-building-other');
    if (buildingEl) {
      const options = Array.from(buildingEl.options || []).map((o) => o.value);
      if (building && options.includes(building)) {
        buildingEl.value = building;
        if (buildingOtherInput) buildingOtherInput.classList.add('hidden');
      } else if (building) {
        buildingEl.value = 'Otro';
        if (buildingOtherInput) {
          buildingOtherInput.classList.remove('hidden');
          buildingOtherInput.value = building;
        }
        if (buildingOtherHidden) buildingOtherHidden.value = building;
      }
    }
    const careerEl = document.getElementById('act-career');
    const careerOtherInput = document.getElementById('act-career-other-input');
    const careerOtherHidden = document.getElementById('act-career-other');
    if (careerEl) {
      // Si es un input (preventivo), establecer directo el valor
      if (careerEl.tagName === 'INPUT') {
        careerEl.value = career;
      } else {
        // Si es un select (correctivo), buscar opciones
        const options = Array.from(careerEl.options || []).map((o) => o.value);
        if (career && options.includes(career)) {
          careerEl.value = career;
          if (careerOtherInput) careerOtherInput.classList.add('hidden');
        } else if (career) {
          careerEl.value = 'Otro';
          if (careerOtherInput) {
            careerOtherInput.classList.remove('hidden');
            careerOtherInput.value = career;
          }
          if (careerOtherHidden) careerOtherHidden.value = career;
        }
      }
    }
    const roomEl = document.getElementById('act-room');
    const roomOtherInput = document.getElementById('act-room-other-input');
    const roomOtherHidden = document.getElementById('act-room-other');
    if (roomEl) {
      // Si es un input (preventivo), establecer directo el valor
      if (roomEl.tagName === 'INPUT') {
        roomEl.value = room;
      } else {
        // Si es un select (correctivo), buscar opciones
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
    const maintType =
      String(meta.mantenimiento || '').toLowerCase().trim() ||
      (String(data.service_type || '').toLowerCase().includes('mantenimiento preventivo') ? 'preventivo' : '') ||
      (String(data.service_type || '').toLowerCase().includes('mantenimiento correctivo') ? 'correctivo' : '') ||
      'correctivo';
    const maintLabel = maintType === 'preventivo' ? 'Preventivo' : 'Correctivo';
    const createdBy = meta.creado_por || data.reporter_name || 'Usuario';
    const createdByEmail = meta.creado_email || '';
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
      `Mantenimiento: ${maintLabel}`,
      `Prioridad: ${getPriorityText(data.priority)}`,
      `Recibido: ${formatDate(data.received_date || data.date)}`,
      data.delivery_date ? `Entrega: ${formatDate(data.delivery_date)}` : null,
      `Registró: ${createdBy}${createdByEmail ? ` (${createdByEmail})` : ''}`,
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
          · Mantenimiento: <b>${maintLabel}</b>
          · Prioridad: <b>${getPriorityText(data.priority)}</b>
        </div>
        <div style="margin-top:8px;font-size:12px;color:#6b7280">
          Registró: <b>${createdBy}</b>${createdByEmail ? ` · <span>${createdByEmail}</span>` : ''}
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

  if (filterMaint) {
    filtered = filtered.filter((a) => {
      const { meta } = parseMetaBlock(a.observations || '');
      const raw = String(meta.mantenimiento || '').toLowerCase().trim();
      const inferred =
        raw ||
        (String(a.service_type || '').toLowerCase().includes('mantenimiento preventivo') ? 'preventivo' : '') ||
        (String(a.service_type || '').toLowerCase().includes('mantenimiento correctivo') ? 'correctivo' : '');
      return inferred === filterMaint;
    });
  }
  if (filterStatus) {
    if (filterStatus === 'activos') filtered = filtered.filter((a) => ['pendiente', 'en_proceso'].includes(a.task_status));
    else filtered = filtered.filter((a) => a.task_status === filterStatus);
  }
  if (filterService) filtered = filtered.filter((a) => (a.service_type || '') === filterService);
  if (filterPriority) filtered = filtered.filter((a) => String(a.priority || 'media') === filterPriority);

  if (filterDelivery) {
    const today = new Date().toISOString().split('T')[0];
    const isOpen = (a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase());
    const inNext7 = (iso) => {
      if (!iso) return false;
      const d0 = new Date(today);
      const d1 = new Date(String(iso).slice(0, 10));
      const diff = Math.floor((d1 - d0) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    };
    filtered = filtered.filter((a) => {
      const d = a.delivery_date ? String(a.delivery_date).slice(0, 10) : '';
      if (filterDelivery === 'none') return !d;
      if (!d) return false;
      if (filterDelivery === 'today') return isOpen(a) && d === today;
      if (filterDelivery === 'overdue') return isOpen(a) && d < today;
      if (filterDelivery === 'next7') return isOpen(a) && inNext7(d);
      return true;
    });
  }

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

    const buildingSel = document.getElementById('act-building')?.value || '';
    const buildingOther = document.getElementById('act-building-other')?.value?.trim() || '';
    const building = buildingSel === 'Otro' ? (buildingOther || 'Otro') : buildingSel;
    
    // act-career puede ser un input (preventivo) o un select (correctivo)
    const careerEl = document.getElementById('act-career');
    const careerValue = careerEl?.tagName === 'INPUT' ? (careerEl.value || '') : (careerEl?.value || '');
    const careerOther = document.getElementById('act-career-other')?.value?.trim() || '';
    const career = careerEl?.tagName === 'SELECT' && careerValue === 'Otro' ? (careerOther || 'Otro') : careerValue;
    
    // act-room puede ser un input (preventivo) o un select (correctivo)
    const roomEl = document.getElementById('act-room');
    const roomValue = roomEl?.tagName === 'INPUT' ? (roomEl.value || '') : (roomEl?.value || '');
    const roomOther = document.getElementById('act-room-other')?.value || '';
    const room = roomEl?.tagName === 'SELECT' && roomValue === 'Otro' ? (roomOther || 'Otro') : roomValue;
    
    const shift = document.getElementById('act-shift')?.value || '';

    const maintTypeRaw = document.getElementById('act-maint-type')?.value || 'correctivo';
    const maintType = ['preventivo', 'correctivo'].includes(String(maintTypeRaw).toLowerCase()) ? String(maintTypeRaw).toLowerCase() : 'correctivo';

    const service = document.getElementById('act-service-type')?.value || '';
    const quick = document.getElementById('act-quick-desc')?.value || '';
    const otherText = document.getElementById('act-problem-other')?.value?.trim() || '';
    const priority = document.getElementById('act-priority')?.value || 'media';
    const taskStatus = document.getElementById('act-task-status')?.value || 'pendiente';
    const observationsUser = document.getElementById('act-observations')?.value?.trim() || '';

    // Validaciones mejoradas
    const validationErrors = [];
    
    if (!building) validationErrors.push('📍 Selecciona una Acción Académica/Área');
    if (!career) validationErrors.push('👤 Completa el Nombre del Reportante');
    if (!room) validationErrors.push('📌 Especifica la Ubicación');
    if (!service) validationErrors.push('🔧 Selecciona un Tipo de Servicio');
    if (!quick) validationErrors.push('📝 Selecciona una Descripción Rápida');
    if (quick === 'Otro' && !otherText) validationErrors.push('✏️ Escribe una descripción cuando eliges "Otro"');
    
    if (validationErrors.length > 0) {
      hideLoader();
      Swal.fire({
        icon: 'warning',
        title: `Faltan ${validationErrors.length} campo(s)`,
        html: `<div style="text-align:left">${validationErrors.map(e => `<div style="margin:6px 0">• ${e}</div>`).join('')}</div>`,
        confirmButtonText: 'Entendido'
      });
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

    let creatorMeta = {
      creado_por: state.currentUser?.full_name || state.currentUser?.email || 'Usuario',
      creado_email: state.currentUser?.email || null,
    };
    if (id) {
      try {
        const { data: existing } = await supabase.from('activities').select('observations').eq('id', id).single();
        const prev = parseMetaBlock(existing?.observations || '').meta || {};
        creatorMeta = {
          creado_por: prev.creado_por || creatorMeta.creado_por,
          creado_email: prev.creado_email || creatorMeta.creado_email,
        };
      } catch {
        // noop
      }
    }

    const meta = {
      folio,
      edificio: building,
      carrera: career,
      salon: room,
      turno: shift || null,
      mantenimiento: maintType,
      tipo: service,
      rapido: quick,
      ...creatorMeta,
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
    let wasInsert = !id;
    
    try {
      if (id) {
        // Update
        const result = await supabase.from('activities').update(activityData).eq('id', id);
        error = result.error;
        if (!error) console.log('✅ Actividad actualizada:', id);
      } else {
        // Insert
        const result = await supabase.from('activities').insert(activityData);
        error = result.error;
        if (!error) console.log('✅ Actividad creada:',  result.data?.[0]?.id || 'success');
      }
    } catch (e) {
      error = e;
    }

    if (error) {
      hideLoader();
      console.error('❌ Error saving activity:', error);
      
      // Determinar el tipo de error y mostrar mensaje específico
      const errorMsg = String(error?.message || error || '').toLowerCase();
      let displayMsg = 'No se pudo guardar la actividad';
      
      if (errorMsg.includes('auth') || errorMsg.includes('permission') || errorMsg.includes('policy')) {
        displayMsg = 'No tienes permisos para realizar esta acción. Verifica tu rol de usuario.';
      } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
        displayMsg = 'Error de conexión. Verifica tu conexión a internet y que Supabase esté disponible.';
      } else if (errorMsg.includes('unique') || errorMsg.includes('constraint')) {
        displayMsg = 'Este registro ya existe o hay un conflicto de datos.';
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        html: `<div style="text-align:left"><p>${displayMsg}</p><p style="margin-top:8px;font-size:11px;color:#6b7280">${error?.message || ''}</p></div>`,
        confirmButtonText: 'Entendido'
      });
      throw error;
    }

    closeActivityModal();
    
    // Recargar datos con mejor feedback
    showLoader();
    await loadActivities({ supabase });
    await loadDashboardData({ supabase });
    hideLoader();

    const title = id ? '✅ Actualizada' : '✅ Registrada';
    const message = id
      ? `La actividad <b>${folio}</b> ha sido actualizada exitosamente`
      : `La actividad <b>${folio}</b> ha sido registrada exitosamente`;
    
    Swal.fire({
      icon: 'success',
      title,
      html: `<div style="text-align:center">${message}<br/><small style="color:#6b7280">Por: ${state.currentUser?.full_name || state.currentUser?.email || 'Usuario'}</small></div>`,
      timer: 2500,
      showConfirmButton: false,
      didClose: () => {
        showToast({ type: 'success', title: title.replace('✅ ', ''), message: `Folio: ${folio}` });
      }
    });
  } catch (error) {
    console.error('Error saving activity:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error?.message || 'No se pudo guardar la actividad',
    });
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
