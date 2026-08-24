const STORAGE_KEY = 'bitacora_simple_v1_records';
const USER_KEY = 'bitacora_simple_v1_user';
const PROFILE_KEY_PREFIX = 'bitacora_simple_v1_profile_';
const EVENTS_KEY = 'bitacora_simple_v1_events';

const USERS = {
  ivan: {
    id: 'ivan',
    name: 'Iván',
    role: 'Comisionista / Coordinador del área',
    defaults: {
      full_name: 'Iván Fernández Mandujano',
      email: 'ivan.fernandez@umich.mx',
      matricula: '',
      area: 'Comisión Académica de Servicios Informáticos',
    },
  },
  kevin: {
    id: 'kevin',
    name: 'Kevin',
    role: 'Servicio en el área',
    defaults: {
      full_name: 'Kevin Contreras Gomez',
      email: '2211999e@umich.mx',
      matricula: '2211999e',
      area: 'Comisión Académica de Servicios Informáticos',
    },
  },
};

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u || !u.id || !u.name) return null;
    return u;
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem(USER_KEY);
}

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function safeStr(v) {
  return String(v ?? '').trim();
}

function profileKeyFor(userId) {
  const id = safeStr(userId).toLowerCase() || 'anon';
  return `${PROFILE_KEY_PREFIX}${id}`;
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '[]';
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records || []));
}

function loadProfile(user) {
  try {
    const key = profileKeyFor(user?.id);
    const raw = localStorage.getItem(key);
    if (!raw) return { full_name: '', email: '', matricula: '', area: '', role: safeStr(user?.role) };
    const p = JSON.parse(raw);
    return {
      full_name: safeStr(p?.full_name),
      email: safeStr(p?.email),
      matricula: safeStr(p?.matricula),
      area: safeStr(p?.area),
      role: safeStr(p?.role) || safeStr(user?.role),
    };
  } catch {
    return { full_name: '', email: '', matricula: '', area: '', role: safeStr(user?.role) };
  }
}

function saveProfile(user, profile) {
  const next = {
    full_name: safeStr(profile?.full_name),
    email: safeStr(profile?.email),
    matricula: safeStr(profile?.matricula),
    area: safeStr(profile?.area),
    role: safeStr(profile?.role) || safeStr(user?.role),
  };
  const key = profileKeyFor(user?.id);
  localStorage.setItem(key, JSON.stringify(next));
}

function ensureProfileDefaults(user) {
  if (!user?.id) return;
  const key = profileKeyFor(user.id);
  const exists = localStorage.getItem(key);
  if (exists) return;
  // Migración simple desde una versión anterior (perfil único)
  const legacyKey = 'bitacora_simple_v1_profile';
  const legacy = localStorage.getItem(legacyKey);
  if (legacy) {
    try {
      const p = JSON.parse(legacy);
      saveProfile(user, { ...p, role: USERS[user.id]?.role || safeStr(p?.role) });
      localStorage.removeItem(legacyKey);
      return;
    } catch {
      // noop
    }
  }
  const defaults = USERS[user.id]?.defaults || {};
  saveProfile(user, { ...defaults, role: USERS[user.id]?.role || '' });
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(EVENTS_KEY) || '[]';
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveEvents(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events || []));
}

function csvCell(value) {
  const v = value == null ? '' : String(value);
  const escaped = v.replaceAll('"', '""');
  if (/[",\n]/.test(escaped)) return `"${escaped}"`;
  return escaped;
}

function downloadCSV(filename, rows) {
  const safeName = (filename || 'export').replace(/[\\/:*?"<>|]+/g, '_');
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); // BOM para Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName.endsWith('.csv') ? safeName : `${safeName}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function setMonthToRange(month) {
  const value = safeStr(month);
  if (!value) return null;
  const [yRaw, mRaw] = value.split('-');
  const y = Number(yRaw);
  const m = Number(mRaw);
  if (!y || !m) return null;
  const first = new Date(y, m - 1, 1).toISOString().slice(0, 10);
  const last = new Date(y, m, 0).toISOString().slice(0, 10);
  return { start: first, end: last };
}

function inRange(dateISO, start, end) {
  const d = safeStr(dateISO).slice(0, 10);
  if (!d) return false;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

function formatDateHuman(dateISO) {
  const d = safeStr(dateISO).slice(0, 10);
  if (!d) return '—';
  return d;
}

function downloadHTML(filename, html) {
  const safeName = (filename || 'reporte').replace(/[\\/:*?"<>|]+/g, '_');
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName.endsWith('.html') ? safeName : `${safeName}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fetchAsDataUrl(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function matchesSearch(rec, q) {
  const query = safeStr(q).toLowerCase();
  if (!query) return true;
  const hay = [
    rec.desc,
    rec.action_detail,
    rec.location,
    rec.area,
    rec.assigned_to,
    rec.equipment_type,
    rec.inventory_number,
    rec.maintenance_type,
    rec.maintenance_detail,
    rec.serial_number,
    rec.created_by,
    rec.status,
    rec.date,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(query);
}

function statusBadge(status) {
  const st = safeStr(status).toLowerCase();
  if (st === 'completado') return `<span class="badge ok">Realizada</span>`;
  return `<span class="badge todo">Pendiente</span>`;
}

function sortNewest(a, b) {
  const ad = safeStr(a.date);
  const bd = safeStr(b.date);
  if (ad !== bd) return bd.localeCompare(ad);
  return safeStr(b.updated_at).localeCompare(safeStr(a.updated_at));
}

const els = {
  app: document.getElementById('app'),
  login: document.getElementById('login'),
  loginForm: document.getElementById('login-form'),
  loginUser: document.getElementById('login-user'),
  loginPass: document.getElementById('login-pass'),
  loginShowPass: document.getElementById('login-show-pass'),
  loginNow: document.getElementById('login-now'),
  usermenu: document.getElementById('usermenu'),
  userchip: document.getElementById('userchip'),
  usermenuMenu: document.getElementById('usermenu-menu'),
  usermenuTitle: document.getElementById('usermenu-title'),
  usermenuMeta: document.getElementById('usermenu-meta'),
  username: document.getElementById('username'),
  btnLogout: document.getElementById('btn-logout'),
  profileLine: document.getElementById('profileline'),
  btnHome: document.getElementById('btn-home'),
  btnReports: document.getElementById('btn-reports'),
  reportsMenu: document.getElementById('reports-menu'),
  btnProfile: document.getElementById('btn-profile'),
  btnEvents: document.getElementById('btn-events'),

  summary: document.getElementById('summary'),

  rows: document.getElementById('rows'),
  modal: document.getElementById('modal'),
  form: document.getElementById('form'),
  modalTitle: document.getElementById('modal-title'),
  btnNew: document.getElementById('btn-new'),
  btnExport: document.getElementById('btn-export'),
  btnExportLandscape: document.getElementById('btn-export-landscape'),
  btnPrint: document.getElementById('btn-print'),
  btnPrintLandscape: document.getElementById('btn-print-landscape'),
  btnClear: document.getElementById('btn-clear'),
  btnToday: document.getElementById('btn-today'),
  btnThisMonth: document.getElementById('btn-this-month'),
  btnCancel: document.getElementById('btn-cancel'),
  btnDelete: document.getElementById('btn-delete'),
  printHeader: document.getElementById('print-header'),
  printFooter: document.getElementById('print-footer'),
  pager: document.getElementById('pager'),

  // Burbuja lateral (acciones rápidas)
  fabToggle: document.getElementById('fab-toggle'),
  fabMenu: document.getElementById('fab-menu'),

  tabButtons: Array.from(document.querySelectorAll('.tab')),
  countAll: document.getElementById('count-all'),
  countPend: document.getElementById('count-pend'),
  countDone: document.getElementById('count-done'),
  filterMonth: document.getElementById('filter-month'),
  filterStart: document.getElementById('filter-start'),
  filterEnd: document.getElementById('filter-end'),
  filterQ: document.getElementById('filter-q'),

  fId: document.getElementById('f-id'),
  fDate: document.getElementById('f-date'),
  fStatus: document.getElementById('f-status'),
  fDesc: document.getElementById('f-desc'),
  fActionDetail: document.getElementById('f-action-detail'),
  fEquipmentType: document.getElementById('f-equipment-type'),
  fInventoryNumber: document.getElementById('f-inventory-number'),
  fMaintenanceType: document.getElementById('f-maintenance-type'),
  fMaintenanceDetail: document.getElementById('f-maintenance-detail'),
  fSerialNumber: document.getElementById('f-serial-number'),
  fLocation: document.getElementById('f-location'),
  fArea: document.getElementById('f-area'),
  fAssigned: document.getElementById('f-assigned'),

  // Perfil
  profileModal: document.getElementById('profile-modal'),
  profileForm: document.getElementById('profile-form'),
  pFullname: document.getElementById('p-fullname'),
  pEmail: document.getElementById('p-email'),
  pMatricula: document.getElementById('p-matricula'),
  pArea: document.getElementById('p-area'),
  pRole: document.getElementById('p-role'),
  btnProfileCancel: document.getElementById('btn-profile-cancel'),

  // Eventos
  eventsList: document.getElementById('events-list'),
  btnEventNew: document.getElementById('btn-event-new'),
  eventModal: document.getElementById('event-modal'),
  eventForm: document.getElementById('event-form'),
  eventModalTitle: document.getElementById('event-modal-title'),
  eId: document.getElementById('e-id'),
  eDate: document.getElementById('e-date'),
  eTitle: document.getElementById('e-title'),
  eNotes: document.getElementById('e-notes'),
  btnEventCancel: document.getElementById('btn-event-cancel'),
  btnEventDelete: document.getElementById('btn-event-delete'),
};

const uiState = {
  status: '',
  page: 1,
  pageSize: 10,
};

let __toastTimer = null;
function toast(msg) {
  const text = safeStr(msg);
  if (!text) return;
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('is-show');
  window.clearTimeout(__toastTimer);
  __toastTimer = window.setTimeout(() => el.classList.remove('is-show'), 1500);
}

function getFilters() {
  const month = safeStr(els.filterMonth?.value);
  const rangeFromMonth = month ? setMonthToRange(month) : null;
  const start = safeStr(rangeFromMonth?.start || els.filterStart?.value);
  const end = safeStr(rangeFromMonth?.end || els.filterEnd?.value);
  const q = safeStr(els.filterQ?.value);
  const status = safeStr(uiState.status);
  return { start, end, q, status };
}

function updateCounts(records) {
  const { start, end, q } = getFilters();
  const base = (records || [])
    .filter((r) => (start || end ? inRange(r.date, start, end) : true))
    .filter((r) => matchesSearch(r, q));

  const all = base.length;
  const pend = base.filter((r) => safeStr(r.status).toLowerCase() !== 'completado').length;
  const done = base.filter((r) => safeStr(r.status).toLowerCase() === 'completado').length;

  if (els.countAll) els.countAll.textContent = String(all);
  if (els.countPend) els.countPend.textContent = String(pend);
  if (els.countDone) els.countDone.textContent = String(done);
}

function filteredRecords(records) {
  const { start, end, q, status } = getFilters();
  return (records || [])
    .filter((r) => (status ? safeStr(r.status).toLowerCase() === status : true))
    .filter((r) => (start || end ? inRange(r.date, start, end) : true))
    .filter((r) => matchesSearch(r, q))
    .sort(sortNewest);
}

function summarizeRecords(list) {
  const all = (list || []).length;
  const pend = (list || []).filter((r) => safeStr(r.status).toLowerCase() !== 'completado').length;
  const done = (list || []).filter((r) => safeStr(r.status).toLowerCase() === 'completado').length;
  return { all, pend, done };
}

function nowHuman() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function renderLoginNow() {
  if (!els.loginNow) return;
  els.loginNow.textContent = `Hoy: ${nowHuman()}`;
}

function renderSummary(allRecords) {
  if (!els.summary) return;
  const { start, end, status } = getFilters();
  const list = filteredRecords(allRecords || []);
  const s = summarizeRecords(list);
  const user = getCurrentUser();
  const p = loadProfile(user);
  const month = safeStr(els.filterMonth?.value);
  const periodo = month || (start ? safeStr(start).slice(0, 7) : end ? safeStr(end).slice(0, 7) : '—');
  const rangeLabel = start || end ? `${start || '—'} → ${end || '—'}` : 'Sin rango';
  const sessionName = safeStr(p.full_name) || safeStr(user?.name) || '—';
  const donePct = s.all ? Math.round((s.done / s.all) * 100) : 0;

  els.summary.innerHTML = `
    <div class="summary-card">
      <div class="summary-k">Resumen Mensual (${escapeHtml(periodo)})</div>
      <div class="donut-wrap">
        <div class="donut" style="--done:${donePct}">
          <div class="donut-center" aria-hidden="true"></div>
        </div>
        <div>
          <div class="summary-big">${s.all}</div>
          <div class="summary-row">
            <span class="mini"><span class="mini-dot"></span>${s.done} Realizadas</span>
            <span class="mini"><span class="mini-dot warn"></span>${s.pend} Pendientes</span>
          </div>
          <div class="summary-v small">Rango: ${escapeHtml(rangeLabel)}</div>
        </div>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-k">Análisis Teórico de Estados</div>
      <div class="analysis">
        <b>Definición de Pendiente:</b> Actividad programada sin confirmar.<br>
        <b>Definición de Realizada:</b> Actividad confirmada con registro.<br>
        <b>Completar:</b> Cambia el estado y registra fecha/hora.
      </div>
      <div class="summary-v small">Filtro actual: <b>${escapeHtml(status || 'todas')}</b></div>
    </div>
    <div class="summary-card">
      <div class="summary-k">Sesión</div>
      <div class="summary-v">${escapeHtml(sessionName)}</div>
      <div class="summary-v small">Correo: ${escapeHtml(p.email || '—')}</div>
      <div class="summary-v small">Matrícula: ${escapeHtml(p.matricula || '—')}</div>
    </div>
  `;
}

function renderPager(totalItems) {
  if (!els.pager) return;
  const size = Number(uiState.pageSize) || 10;
  const pages = Math.max(1, Math.ceil((totalItems || 0) / size));
  uiState.page = Math.min(Math.max(1, uiState.page), pages);
  const p = uiState.page;

  if (pages <= 1) {
    els.pager.innerHTML = '';
    return;
  }

  const nums = [];
  const start = Math.max(1, p - 2);
  const end = Math.min(pages, p + 2);
  for (let i = start; i <= end; i++) nums.push(i);

  els.pager.innerHTML = `
    <button class="pbtn" type="button" data-page="prev" ${p <= 1 ? 'disabled' : ''}>‹</button>
    ${start > 1 ? `<button class="pbtn" type="button" data-page="1">1</button>` : ''}
    ${start > 2 ? `<span style="opacity:.6;padding:8px 6px;">…</span>` : ''}
    ${nums
      .map((n) => `<button class="pbtn ${n === p ? 'is-active' : ''}" type="button" data-page="${n}">${n}</button>`)
      .join('')}
    ${end < pages - 1 ? `<span style="opacity:.6;padding:8px 6px;">…</span>` : ''}
    ${end < pages ? `<button class="pbtn" type="button" data-page="${pages}">${pages}</button>` : ''}
    <button class="pbtn" type="button" data-page="next" ${p >= pages ? 'disabled' : ''}>›</button>
  `;
}

function render() {
  const all = loadRecords();
  const full = filteredRecords(all);
  const size = Number(uiState.pageSize) || 10;
  const pages = Math.max(1, Math.ceil(full.length / size));
  uiState.page = Math.min(Math.max(1, uiState.page), pages);
  const start = (uiState.page - 1) * size;
  const list = full.slice(start, start + size);
  updateCounts(all);
  renderEvents();
  renderProfileLine();
  renderSummary(all);
  renderPager(full.length);

  if (!els.rows) return;
  if (!list.length) {
    els.rows.innerHTML = `<tr><td colspan="9" class="empty">Sin registros con esos filtros.</td></tr>`;
    return;
  }

  els.rows.innerHTML = list
    .map((r) => {
      const date = safeStr(r.date);
      const desc = safeStr(r.desc);
      const actionDetail = safeStr(r.action_detail);
      const loc = safeStr(r.location) || '—';
      const area = safeStr(r.area) || '—';
      const assigned = safeStr(r.assigned_to) || '—';
      const equipmentParts = [
        ['Tipo', r.equipment_type],
        ['Patrimonio', r.inventory_number],
        ['Mantenimiento', r.maintenance_type],
        ['Detalle', r.maintenance_detail],
        ['Serie', r.serial_number],
      ].filter(([, value]) => safeStr(value));
      const equipment = equipmentParts.length
        ? equipmentParts.map(([label, value]) => `${label}: ${safeStr(value)}`).join(' · ')
        : '—';
      const createdBy = safeStr(r.created_by) || '—';
      const st = safeStr(r.status).toLowerCase();
      const canComplete = st !== 'completado';

      return `
        <tr>
          <td class="td-date">${date || '—'}</td>
          <td class="td-activity">${escapeHtml(desc) || '—'}${actionDetail ? `<div class="activity-detail">${escapeHtml(actionDetail)}</div>` : ''}</td>
          <td class="td-equipment">${escapeHtml(equipment)}</td>
          <td class="td-location">${escapeHtml(loc)}</td>
          <td class="td-area">${escapeHtml(area)}</td>
          <td class="td-assigned">${escapeHtml(assigned)}</td>
          <td class="td-created">${escapeHtml(createdBy)}</td>
          <td class="td-status">${statusBadge(st)}</td>
          <td class="td-actions">
            <div class="row-actions">
              ${canComplete ? `<button class="btn btn-ghost" type="button" data-action="complete" data-id="${r.id}">Completar</button>` : ''}
              <button class="btn btn-ghost" type="button" data-action="edit" data-id="${r.id}">Editar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function yyyyMMdd(date) {
  const d = date instanceof Date ? date : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function hhmm(date) {
  const d = date instanceof Date ? date : new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}${m}`;
}

function makeFolio() {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const now = new Date();
  return `BD-${yyyyMMdd(now)}-${hhmm(now)}-${rand}`;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function updateEquipmentFields() {
  const isEquipment = ['Computadora', 'Impresora'].includes(safeStr(els.fEquipmentType.value));
  document.querySelectorAll('.equipment-field').forEach((field) => {
    field.hidden = !isEquipment;
  });
}

function updateMaintenanceDetailField() {
  const isEquipment = ['Computadora', 'Impresora'].includes(safeStr(els.fEquipmentType.value));
  const isOther = isEquipment && safeStr(els.fMaintenanceType.value) === 'Otro arreglo';
  if (els.fMaintenanceDetail) els.fMaintenanceDetail.closest('.field').hidden = !isOther;
}

function openModalForNew() {
  els.modalTitle.textContent = 'Nueva actividad';
  els.fId.value = '';
  els.fDate.value = todayISO();
  els.fStatus.value = 'pendiente';
  els.fDesc.value = '';
  els.fActionDetail.value = '';
  els.fEquipmentType.value = 'Normal';
  els.fInventoryNumber.value = '';
  els.fMaintenanceType.value = '';
  els.fMaintenanceDetail.value = '';
  els.fSerialNumber.value = '';
  els.fLocation.value = '';
  els.fArea.value = '';
  els.fAssigned.value = '';
  els.btnDelete.hidden = true;
  updateEquipmentFields();
  updateMaintenanceDetailField();
  els.modal.showModal();
  setTimeout(() => els.fDesc.focus(), 50);
}

function openModalForEdit(id) {
  const records = loadRecords();
  const rec = records.find((r) => r.id === id);
  if (!rec) return;
  els.modalTitle.textContent = 'Editar actividad';
  els.fId.value = rec.id;
  els.fDate.value = rec.date || todayISO();
  els.fStatus.value = rec.status || 'pendiente';
  els.fDesc.value = rec.desc || '';
  els.fActionDetail.value = rec.action_detail || '';
  els.fEquipmentType.value = rec.equipment_type || 'Normal';
  els.fInventoryNumber.value = rec.inventory_number || '';
  els.fMaintenanceType.value = rec.maintenance_type || '';
  els.fMaintenanceDetail.value = rec.maintenance_detail || '';
  els.fSerialNumber.value = rec.serial_number || '';
  els.fLocation.value = rec.location || '';
  els.fArea.value = rec.area || '';
  els.fAssigned.value = rec.assigned_to || '';
  els.btnDelete.hidden = false;
  updateEquipmentFields();
  updateMaintenanceDetailField();
  els.modal.showModal();
  setTimeout(() => els.fDesc.focus(), 50);
}

function upsertFromForm() {
  const user = getCurrentUser();
  const profile = loadProfile(user);
  const id = safeStr(els.fId.value) || uid();
  const date = safeStr(els.fDate.value) || todayISO();
  const status = safeStr(els.fStatus.value).toLowerCase() === 'completado' ? 'completado' : 'pendiente';
  const desc = safeStr(els.fDesc.value);
  const action_detail = safeStr(els.fActionDetail.value);
  const selectedType = safeStr(els.fEquipmentType.value);
  const equipment_type = ['Computadora', 'Impresora'].includes(selectedType) ? selectedType : '';
  const inventory_number = equipment_type ? safeStr(els.fInventoryNumber.value) : '';
  const maintenance_type = equipment_type ? safeStr(els.fMaintenanceType.value) : '';
  const maintenance_detail = maintenance_type === 'Otro arreglo' ? safeStr(els.fMaintenanceDetail.value) : '';
  const serial_number = equipment_type ? safeStr(els.fSerialNumber.value) : '';
  const location = safeStr(els.fLocation.value);
  const area = safeStr(els.fArea.value);
  const assigned_to = safeStr(els.fAssigned.value);

  if (!desc) {
    els.fDesc.focus();
    return false;
  }

  const records = loadRecords();
  const now = new Date().toISOString();
  const idx = records.findIndex((r) => r.id === id);
  const base = idx >= 0 ? records[idx] : { id, created_at: now };
  const displayName =
    safeStr(profile.full_name) ||
    safeStr(user?.name) ||
    base.created_by ||
    '—';
  const next = {
    ...base,
    id,
    date,
    status,
    desc,
    action_detail,
    equipment_type,
    inventory_number,
    maintenance_type,
    maintenance_detail,
    serial_number,
    location,
    area,
    assigned_to,
    created_by: base.created_by || displayName,
    updated_by: user?.name || base.updated_by || null,
    completed_at: status === 'completado' ? (base.completed_at || now) : null,
    updated_at: now,
  };

  if (idx >= 0) records[idx] = next;
  else records.push(next);

  saveRecords(records);
  return true;
}

function deleteFromForm() {
  const id = safeStr(els.fId.value);
  if (!id) return;
  const records = loadRecords().filter((r) => r.id !== id);
  saveRecords(records);
}

function markCompleted(id) {
  const user = getCurrentUser();
  const records = loadRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const now = new Date().toISOString();
  records[idx] = {
    ...records[idx],
    status: 'completado',
    completed_at: records[idx].completed_at || now,
    updated_by: user?.name || records[idx].updated_by || null,
    updated_at: now,
  };
  saveRecords(records);
}

async function exportExcel({ orientation = 'portrait' } = {}) {
  const user = getCurrentUser();
  const profile = loadProfile(user);
  const list = filteredRecords(loadRecords());
  const { start, end, status } = getFilters();
  const stats = summarizeRecords(list);
  const hasEquipment = list.some((record) =>
    [record.equipment_type, record.inventory_number, record.maintenance_type, record.maintenance_detail, record.serial_number]
      .map(safeStr)
      .some(Boolean),
  );
  const orientLabel = orientation === 'landscape' ? 'horizontal' : 'vertical';
  const file = `bitacora_${status || 'todas'}_${start || 'inicio'}_${end || 'fin'}_excel_${orientLabel}`;

  try {
    const [umich, fcca] = await Promise.all([
      fetchAsDataUrl('./assets/logo_umich.png'),
      fetchAsDataUrl('./assets/logo_fcca.png'),
    ]);

    const now = new Date();
    const fechaGen = now.toISOString().slice(0, 19).replace('T', ' ');
    const folio = makeFolio();

    const pageCSS =
      orientation === 'landscape'
        ? '@page{size:A4 landscape;margin:10mm}'
        : '@page{size:A4 portrait;margin:12mm}';

    const colgroup =
      orientation === 'landscape'
        ? `
          <col style="width:104px">
          <col style="width:auto">
          ${hasEquipment ? '<col style="width:230px">' : ''}
          <col style="width:200px">
          <col style="width:230px">
          <col style="width:210px">
          <col style="width:150px">
          <col style="width:120px">
        `
        : `
          <col style="width:104px">
          <col style="width:auto">
          ${hasEquipment ? '<col style="width:190px">' : ''}
          <col style="width:170px">
          <col style="width:190px">
          <col style="width:180px">
          <col style="width:140px">
          <col style="width:120px">
        `;

    const rows = list
      .map((r) => {
        const estado = r.status === 'completado' ? 'Realizada' : 'Pendiente';
        return `
          <tr>
            <td>${escapeHtml(r.date || '')}</td>
            <td>${escapeHtml(r.desc || '')}${r.action_detail ? `<br><small>Detalle: ${escapeHtml(r.action_detail)}</small>` : ''}</td>
            ${hasEquipment ? `<td>${escapeHtml([
              ['Tipo', r.equipment_type],
              ['Patrimonio', r.inventory_number],
              ['Mantenimiento', r.maintenance_type],
              ['Detalle', r.maintenance_detail],
              ['Serie', r.serial_number],
            ].filter(([, value]) => safeStr(value)).map(([label, value]) => `${label}: ${safeStr(value)}`).join(' · '))}</td>` : ''}
            <td>${escapeHtml(r.location || '')}</td>
            <td>${escapeHtml(r.area || '')}</td>
            <td>${escapeHtml(r.assigned_to || '')}</td>
            <td>${escapeHtml(r.created_by || '')}</td>
            <td>${escapeHtml(estado)}</td>
          </tr>
        `;
      })
      .join('');

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reporte Bitácora</title>
  <style>
    ${pageCSS}
    body{font-family:Segoe UI,Roboto,Arial,sans-serif;margin:18px;color:#111}
    .header{display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid #ddd;border-radius:12px;padding:14px}
    .logos{display:flex;align-items:center;gap:12px}
    .logos img{height:38px;width:auto;max-width:160px;object-fit:contain}
    .h-title{font-weight:900;font-size:18px}
    .h-sub{color:#444;margin-top:4px;font-size:12px}
    .tags{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .tag{border:1px solid #ddd;background:#f7f7f7;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700}
    table{width:100%;border-collapse:collapse;margin-top:14px;table-layout:fixed}
    th,td{border-bottom:1px solid #eee;padding:10px;vertical-align:top;text-align:left;overflow-wrap:anywhere}
    th{background:#f2f2f2;font-size:12px;color:#333}
    tbody tr:nth-child(even){background:#fafafa}
    thead{display:table-header-group}
    tr{break-inside:avoid;page-break-inside:avoid}
    td:nth-child(1),td:nth-child(7){white-space:nowrap}
    td:nth-child(2){white-space:pre-wrap}
    .meta{margin-top:10px;font-size:12px;color:#333}
    .meta b{color:#111}
    .footer{margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .sig{border:1px dashed #bbb;border-radius:12px;padding:12px}
    .sig-line{margin-top:32px;border-top:2px solid #111;padding-top:8px;font-weight:900}
    .sig-meta{font-size:12px;color:#333;margin-top:2px}
    @media print{body{margin:0}.logos img{height:32px;max-width:140px}}
  </style>
</head>
<body>
  <div class="header">
    <div class="logos">
      <img src="${umich}" alt="UMSNH">
      <img src="${fcca}" alt="FCCA">
    </div>
    <div style="flex:1;min-width:240px">
      <div class="h-title">Bitácora Digital · Reporte</div>
      <div class="h-sub">UMSNH - Comisión Académica de Servicios Informáticos · Generado: ${escapeHtml(fechaGen)} · Folio: ${escapeHtml(folio)}</div>
      <div class="meta">
        Usuario sesión: <b>${escapeHtml(user?.name || '—')}</b> ·
        Nombre: <b>${escapeHtml(profile.full_name || '—')}</b> ·
        Correo: <b>${escapeHtml(profile.email || '—')}</b> ·
        Matrícula: <b>${escapeHtml(profile.matricula || '—')}</b> ·
        Comisión Académica: <b>${escapeHtml(profile.area || '—')}</b> ·
        Rol: <b>${escapeHtml(profile.role || '—')}</b>
      </div>
    </div>
    <div class="tags">
      <div class="tag">Estado: ${escapeHtml(status || 'todas')}</div>
      <div class="tag">Inicio: ${escapeHtml(start || '—')}</div>
      <div class="tag">Fin: ${escapeHtml(end || '—')}</div>
      <div class="tag">Registros: ${list.length}</div>
      <div class="tag">Pend: ${stats.pend}</div>
      <div class="tag">Real: ${stats.done}</div>
    </div>
  </div>

  <table>
    <colgroup>
      ${colgroup}
    </colgroup>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Actividad</th>
        ${hasEquipment ? '<th>Equipo</th>' : ''}
        <th>Ubicación</th>
        <th>Comisión Académica</th>
        <th>Responsable(s)</th>
        <th>Registró</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan=\"${hasEquipment ? 8 : 7}\">Sin registros.</td></tr>`}
    </tbody>
  </table>

  <div class="footer">
    <div class="sig">
      <div class="sig-line">${escapeHtml(USERS.ivan.defaults.full_name)}</div>
      <div class="sig-meta">${escapeHtml(USERS.ivan.role)} · ${escapeHtml(USERS.ivan.defaults.email)}</div>
    </div>
    <div class="sig">
      <div class="sig-line">${escapeHtml(USERS.kevin.defaults.full_name)}</div>
      <div class="sig-meta">${escapeHtml(USERS.kevin.role)} · ${escapeHtml(USERS.kevin.defaults.email)} · Matrícula: ${escapeHtml(USERS.kevin.defaults.matricula)}</div>
    </div>
  </div>
</body>
</html>`;

    downloadHTML(file, html);
    toast('Reporte listo (ábrelo con Excel).');
  } catch {
    // fallback: CSV
    const out = [
      ['Fecha', 'Actividad', ...(hasEquipment ? ['Equipo'] : []), 'Ubicación', 'Comisión Académica', 'Responsable(s)', 'Registró', 'Estado'],
      ...list.map((r) => [
        r.date || '',
        r.action_detail ? `${r.desc || ''}\nDetalle: ${r.action_detail}` : r.desc || '',
        ...(hasEquipment ? [[r.equipment_type, r.inventory_number, r.maintenance_type, r.maintenance_detail, r.serial_number].map(safeStr).filter(Boolean).join(' · ')] : []),
        r.location || '',
        r.area || '',
        r.assigned_to || '',
        r.created_by || '',
        r.status === 'completado' ? 'Realizada' : 'Pendiente',
      ]),
    ];
    downloadCSV(file, out);
    toast('Exportado a Excel (CSV).');
  }
}

function applyPrintOrientation(orientation) {
  // Limpieza previa
  document.body.classList.remove('print-landscape');
  document.body.classList.remove('print-without-equipment');
  document.getElementById('print-orientation-style')?.remove();

  if (orientation !== 'landscape') {
    return () => document.body.classList.remove('print-without-equipment');
  }

  document.body.classList.add('print-landscape');
  const style = document.createElement('style');
  style.id = 'print-orientation-style';
  style.textContent = '@page{size:A4 landscape;margin:12mm}';
  document.head.appendChild(style);

  return () => {
    document.body.classList.remove('print-landscape');
    document.body.classList.remove('print-without-equipment');
    document.getElementById('print-orientation-style')?.remove();
  };
}

function printCurrent({ orientation = 'portrait' } = {}) {
  const folio = makeFolio();
  preparePrintHeader(folio);
  preparePrintFooter(folio);
  const cleanup = applyPrintOrientation(orientation);
  const hasEquipment = filteredRecords(loadRecords()).some((record) =>
    [record.equipment_type, record.inventory_number, record.maintenance_type, record.maintenance_detail, record.serial_number]
      .map(safeStr)
      .some(Boolean),
  );
  document.body.classList.toggle('print-without-equipment', !hasEquipment);
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  // Fallback (algunos navegadores no disparan afterprint)
  window.setTimeout(cleanup, 1500);
}

// -----------------
// Perfil
// -----------------

function renderProfileLine() {
  if (!els.profileLine) return;
  const user = getCurrentUser();
  const p = loadProfile(user);
  const parts = [];
  if (p.full_name) parts.push(`<b>${escapeHtml(p.full_name)}</b>`);
  if (p.matricula) parts.push(`Matrícula: <b>${escapeHtml(p.matricula)}</b>`);
  if (p.area) parts.push(`Comisión Académica: <b>${escapeHtml(p.area)}</b>`);
  if (p.role) parts.push(`Rol: <b>${escapeHtml(p.role)}</b>`);
  if (!parts.length) {
    els.profileLine.hidden = true;
    els.profileLine.innerHTML = '';
    return;
  }
  els.profileLine.hidden = false;
  els.profileLine.innerHTML = parts.join(' · ');
}

function openProfile() {
  const user = getCurrentUser();
  const p = loadProfile(user);
  if (els.pFullname) els.pFullname.value = p.full_name || '';
  if (els.pEmail) els.pEmail.value = p.email || '';
  if (els.pMatricula) els.pMatricula.value = p.matricula || '';
  if (els.pArea) els.pArea.value = p.area || '';
  if (els.pRole) els.pRole.value = p.role || '';
  els.profileModal?.showModal();
  setTimeout(() => els.pFullname?.focus?.(), 50);
}

function saveProfileFromForm() {
  const user = getCurrentUser();
  const next = {
    full_name: safeStr(els.pFullname?.value),
    email: safeStr(els.pEmail?.value),
    matricula: safeStr(els.pMatricula?.value),
    area: safeStr(els.pArea?.value),
    role: safeStr(els.pRole?.value) || safeStr(user?.role),
  };
  saveProfile(user, next);
  renderProfileLine();
  toast('Perfil guardado.');
}

function preparePrintHeader(folio) {
  if (!els.printHeader) return;
  const user = getCurrentUser();
  const p = loadProfile(user);
  const { start, end, status } = getFilters();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const count = filteredRecords(loadRecords()).length;
  const stats = summarizeRecords(filteredRecords(loadRecords()));

  els.printHeader.hidden = false;
  els.printHeader.innerHTML = `
    <div class="print-header-row">
      <div class="print-header-left">
        <div class="brand-logos brand-logos--bar" aria-hidden="true">
          <img class="brand-logo brand-logo--umich" src="./assets/logo_umich.png" alt="" />
          <img class="brand-logo brand-logo--fcca" src="./assets/logo_fcca.png" alt="" />
        </div>
        <div>
          <div class="print-header-title">Bitácora Digital · Reporte</div>
          <div class="print-header-meta">${escapeHtml(p.area || 'Comisión Académica de Servicios Informáticos')} · ${escapeHtml(now)} · Folio: ${escapeHtml(folio || '')}</div>
          <div class="print-header-meta">
            ${escapeHtml(p.full_name || user?.name || '—')}
            ${p.matricula ? ` · Matrícula: ${escapeHtml(p.matricula)}` : ''}
            ${p.email ? ` · ${escapeHtml(p.email)}` : ''}
            ${p.role ? ` · ${escapeHtml(p.role)}` : ''}
          </div>
        </div>
      </div>
      <div class="print-tags">
        <span class="tag">Estado: ${escapeHtml(status || 'todas')}</span>
        <span class="tag">Inicio: ${escapeHtml(start || '—')}</span>
        <span class="tag">Fin: ${escapeHtml(end || '—')}</span>
        <span class="tag">Registros: ${count}</span>
        <span class="tag">Pend: ${stats.pend}</span>
        <span class="tag">Real: ${stats.done}</span>
      </div>
    </div>
  `;
}

function preparePrintFooter(folio) {
  if (!els.printFooter) return;
  els.printFooter.hidden = false;
  els.printFooter.innerHTML = `
    <div class="print-header-meta">Folio: ${escapeHtml(folio || '')}</div>
    <div class="print-footer-grid">
      <div class="sig">
        <div class="sig-line">${escapeHtml(USERS.ivan.defaults.full_name)}</div>
        <div class="sig-meta">${escapeHtml(USERS.ivan.role)} · <b>${escapeHtml(USERS.ivan.defaults.email)}</b></div>
      </div>
      <div class="sig">
        <div class="sig-line">${escapeHtml(USERS.kevin.defaults.full_name)}</div>
        <div class="sig-meta">${escapeHtml(USERS.kevin.role)} · <b>${escapeHtml(USERS.kevin.defaults.email)}</b> · Matrícula: <b>${escapeHtml(USERS.kevin.defaults.matricula)}</b></div>
      </div>
    </div>
  `;
}

// -----------------
// Eventos
// -----------------

function normalizeEvent(e) {
  return {
    id: safeStr(e?.id) || uid(),
    date: safeStr(e?.date).slice(0, 10) || todayISO(),
    title: safeStr(e?.title),
    notes: safeStr(e?.notes),
    created_at: safeStr(e?.created_at) || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function upcomingEvents(all) {
  const today = todayISO();
  return (all || [])
    .filter((e) => safeStr(e.date).slice(0, 10) >= today)
    .sort((a, b) => safeStr(a.date).localeCompare(safeStr(b.date)) || safeStr(a.updated_at).localeCompare(safeStr(b.updated_at)));
}

function renderEvents() {
  if (!els.eventsList) return;
  const all = upcomingEvents(loadEvents());
  const list = all.slice(0, 8);
  if (!list.length) {
    els.eventsList.innerHTML = `<div class="events-empty">Sin eventos próximos.</div>`;
    return;
  }
  els.eventsList.innerHTML = list
    .map((e) => {
      const d = formatDateHuman(e.date);
      const title = escapeHtml(e.title || '—');
      const notes = safeStr(e.notes);
      return `
        <div class="event-item">
          <div>
            <div class="event-date">${d}</div>
            <div class="event-meta">${e.date === todayISO() ? 'Hoy' : 'Próximo'}</div>
          </div>
          <div>
            <div class="event-title">${title}</div>
            ${notes ? `<div class="event-meta">${escapeHtml(notes)}</div>` : ''}
          </div>
          <div class="event-actions">
            <button class="btn btn-ghost" type="button" data-ev-action="edit" data-ev-id="${e.id}">Editar</button>
          </div>
        </div>
      `;
    })
    .join('');

  // Extra info en el apartado de eventos
  const container = document.querySelector('.panel-events .panel-title');
  if (container) {
    const next = all[0];
    const nextLabel = next?.date ? `${formatDateHuman(next.date)} · ${safeStr(next.title) || '—'}` : '—';
    container.textContent = `Próximos eventos (${all.length})`;
    const hint = document.querySelector('.events-hint');
    if (hint) hint.textContent = `Siguiente: ${nextLabel}`;
  }
}

function openEventForNew() {
  if (els.eventModalTitle) els.eventModalTitle.textContent = 'Nuevo evento';
  if (els.eId) els.eId.value = '';
  if (els.eDate) els.eDate.value = todayISO();
  if (els.eTitle) els.eTitle.value = '';
  if (els.eNotes) els.eNotes.value = '';
  if (els.btnEventDelete) els.btnEventDelete.hidden = true;
  els.eventModal?.showModal();
  setTimeout(() => els.eTitle?.focus?.(), 50);
}

function openEventForEdit(id) {
  const all = loadEvents();
  const ev = all.find((x) => x.id === id);
  if (!ev) return;
  if (els.eventModalTitle) els.eventModalTitle.textContent = 'Editar evento';
  if (els.eId) els.eId.value = ev.id;
  if (els.eDate) els.eDate.value = ev.date || todayISO();
  if (els.eTitle) els.eTitle.value = ev.title || '';
  if (els.eNotes) els.eNotes.value = ev.notes || '';
  if (els.btnEventDelete) els.btnEventDelete.hidden = false;
  els.eventModal?.showModal();
  setTimeout(() => els.eTitle?.focus?.(), 50);
}

function upsertEventFromForm() {
  const id = safeStr(els.eId?.value) || uid();
  const date = safeStr(els.eDate?.value).slice(0, 10) || todayISO();
  const title = safeStr(els.eTitle?.value);
  const notes = safeStr(els.eNotes?.value);
  if (!title) {
    els.eTitle?.focus?.();
    return false;
  }
  const all = loadEvents();
  const idx = all.findIndex((x) => x.id === id);
  const base = idx >= 0 ? all[idx] : { id, created_at: new Date().toISOString() };
  const next = normalizeEvent({ ...base, id, date, title, notes });
  if (idx >= 0) all[idx] = next;
  else all.push(next);
  saveEvents(all);
  return true;
}

function deleteEventFromForm() {
  const id = safeStr(els.eId?.value);
  if (!id) return;
  const next = loadEvents().filter((x) => x.id !== id);
  saveEvents(next);
}

// -----------------
// Wiring
// -----------------

function setActiveNav(activeId) {
  document.querySelectorAll('.topnav .navlink').forEach((b) => b.classList.toggle('is-active', b.id === activeId));
}

function closeReportsMenu() {
  if (!els.reportsMenu || !els.btnReports) return;
  els.reportsMenu.hidden = true;
  els.btnReports.setAttribute('aria-expanded', 'false');
}

function toggleReportsMenu() {
  if (!els.reportsMenu || !els.btnReports) return;
  const nextHidden = !els.reportsMenu.hidden ? true : false;
  els.reportsMenu.hidden = nextHidden;
  els.btnReports.setAttribute('aria-expanded', nextHidden ? 'false' : 'true');
}

function closeUserMenu() {
  if (!els.usermenuMenu) return;
  els.usermenuMenu.hidden = true;
}

function toggleUserMenu() {
  if (!els.usermenuMenu) return;
  els.usermenuMenu.hidden = !els.usermenuMenu.hidden;
}

function closeFabMenu() {
  if (!els.fabMenu || !els.fabToggle) return;
  els.fabMenu.hidden = true;
  els.fabToggle.setAttribute('aria-expanded', 'false');
}

function toggleFabMenu() {
  if (!els.fabMenu || !els.fabToggle) return;
  const nextHidden = !els.fabMenu.hidden ? true : false;
  els.fabMenu.hidden = nextHidden;
  els.fabToggle.setAttribute('aria-expanded', nextHidden ? 'false' : 'true');
}

function renderUserMenuInfo() {
  const user = getCurrentUser();
  const p = loadProfile(user);
  if (els.usermenuTitle) els.usermenuTitle.textContent = safeStr(p.full_name) || safeStr(user?.name) || '—';
  if (els.usermenuMeta) {
    const parts = [];
    if (p.role) parts.push(`Rol: ${p.role}`);
    if (p.email) parts.push(`Correo: ${p.email}`);
    if (p.matricula) parts.push(`Matrícula: ${p.matricula}`);
    els.usermenuMeta.textContent = parts.join(' · ') || '—';
  }
}

els.btnHome?.addEventListener('click', () => {
  closeReportsMenu();
  setActiveNav('btn-home');
  document.getElementById('main')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
});

els.btnReports?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  setActiveNav('btn-reports');
  toggleReportsMenu();
});

document.addEventListener('click', (e) => {
  if (!els.reportsMenu || els.reportsMenu.hidden) return;
  const inside = e.target?.closest?.('#reports-menu') || e.target?.closest?.('#btn-reports');
  if (!inside) closeReportsMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeReportsMenu();
    closeUserMenu();
    closeFabMenu();
  }
});

els.userchip?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  renderUserMenuInfo();
  toggleUserMenu();
});

document.addEventListener('click', (e) => {
  if (!els.usermenuMenu || els.usermenuMenu.hidden) return;
  const inside = e.target?.closest?.('#usermenu-menu') || e.target?.closest?.('#userchip');
  if (!inside) closeUserMenu();
});

els.fabToggle?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleFabMenu();
});

document.addEventListener('click', (e) => {
  if (!els.fabMenu || els.fabMenu.hidden) return;
  const inside = e.target?.closest?.('#fab-menu') || e.target?.closest?.('#fab-toggle');
  if (!inside) closeFabMenu();
});

els.btnNew.addEventListener('click', () => {
  closeReportsMenu();
  closeFabMenu();
  setActiveNav('btn-new');
  openModalForNew();
});
els.btnExport.addEventListener('click', () => {
  closeReportsMenu();
  closeFabMenu();
  exportExcel({ orientation: 'portrait' });
});
els.btnPrint.addEventListener('click', () => {
  closeReportsMenu();
  closeFabMenu();
  printCurrent({ orientation: 'portrait' });
});
els.btnExportLandscape?.addEventListener('click', () => {
  closeReportsMenu();
  closeFabMenu();
  exportExcel({ orientation: 'landscape' });
});
els.btnPrintLandscape?.addEventListener('click', () => {
  closeReportsMenu();
  closeFabMenu();
  printCurrent({ orientation: 'landscape' });
});
els.btnProfile?.addEventListener('click', () => {
  closeReportsMenu();
  setActiveNav('btn-profile');
  openProfile();
});
els.btnEvents?.addEventListener('click', () => {
  closeReportsMenu();
  setActiveNav('btn-events');
  // Solo baja a la sección de eventos (sin popup)
  document.querySelector('.panel-events')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
});
els.btnLogout?.addEventListener('click', () => {
  clearCurrentUser();
  location.reload();
});
els.btnClear.addEventListener('click', () => {
  uiState.status = '';
  uiState.page = 1;
  els.tabButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.status === ''));
  els.filterMonth.value = '';
  els.filterStart.value = '';
  els.filterEnd.value = '';
  els.filterQ.value = '';
  render();
});
els.btnToday?.addEventListener('click', () => {
  const t = todayISO();
  uiState.page = 1;
  if (els.filterMonth) els.filterMonth.value = '';
  if (els.filterStart) els.filterStart.value = t;
  if (els.filterEnd) els.filterEnd.value = t;
  render();
});
els.btnThisMonth?.addEventListener('click', () => {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const month = `${y}-${m}`;
  uiState.page = 1;
  if (els.filterMonth) els.filterMonth.value = month;
  const r = setMonthToRange(month);
  if (r) {
    if (els.filterStart) els.filterStart.value = r.start;
    if (els.filterEnd) els.filterEnd.value = r.end;
  }
  render();
});

els.tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const st = safeStr(btn.dataset.status);
    uiState.status = st;
    uiState.page = 1;
    els.tabButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
    render();
  });
});

els.filterMonth.addEventListener('change', () => {
  const r = setMonthToRange(els.filterMonth.value);
  if (r) {
    els.filterStart.value = r.start;
    els.filterEnd.value = r.end;
  }
  uiState.page = 1;
  render();
});
els.filterStart.addEventListener('change', () => {
  uiState.page = 1;
  render();
});
els.filterEnd.addEventListener('change', () => {
  uiState.page = 1;
  render();
});
els.filterQ.addEventListener('input', () => {
  // pequeña pausa para que se sienta suave
  window.clearTimeout(window.__bt_timer);
  window.__bt_timer = window.setTimeout(() => {
    uiState.page = 1;
    render();
  }, 120);
});

els.fEquipmentType.addEventListener('change', () => {
  updateEquipmentFields();
  updateMaintenanceDetailField();
});
els.fMaintenanceType.addEventListener('change', updateMaintenanceDetailField);

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!upsertFromForm()) return;
  els.modal.close();
  render();
  toast('Guardado.');
});

els.btnCancel.addEventListener('click', () => els.modal.close());
els.btnDelete.addEventListener('click', () => {
  if (!confirm('¿Eliminar este registro?')) return;
  deleteFromForm();
  els.modal.close();
  render();
  toast('Eliminado.');
});

document.addEventListener('click', (e) => {
  const btn = e.target?.closest?.('button[data-action][data-id]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'edit') openModalForEdit(id);
  if (action === 'complete') {
    markCompleted(id);
    uiState.page = 1;
    render();
    toast('Marcado como realizada.');
  }
});

els.pager?.addEventListener('click', (e) => {
  const btn = e.target?.closest?.('button[data-page]');
  if (!btn) return;
  const v = btn.dataset.page;
  const size = Number(uiState.pageSize) || 10;
  const total = filteredRecords(loadRecords()).length;
  const pages = Math.max(1, Math.ceil(total / size));
  if (v === 'prev') uiState.page = Math.max(1, uiState.page - 1);
  else if (v === 'next') uiState.page = Math.min(pages, uiState.page + 1);
  else uiState.page = Math.min(Math.max(1, Number(v) || 1), pages);
  render();
});

document.addEventListener('click', (e) => {
  const btn = e.target?.closest?.('button[data-ev-action][data-ev-id]');
  if (!btn) return;
  const action = btn.dataset.evAction;
  const id = btn.dataset.evId;
  if (action === 'edit') openEventForEdit(id);
});

els.profileForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  saveProfileFromForm();
  els.profileModal?.close();
});
els.btnProfileCancel?.addEventListener('click', () => els.profileModal?.close());

els.btnEventNew?.addEventListener('click', openEventForNew);
els.eventForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!upsertEventFromForm()) return;
  els.eventModal?.close();
  renderEvents();
  toast('Evento guardado.');
});
els.btnEventCancel?.addEventListener('click', () => els.eventModal?.close());
els.btnEventDelete?.addEventListener('click', () => {
  if (!confirm('¿Eliminar este evento?')) return;
  deleteEventFromForm();
  els.eventModal?.close();
  renderEvents();
  toast('Evento eliminado.');
});

function showAppForUser(user) {
  if (els.login) els.login.hidden = true;
  if (els.app) els.app.hidden = false;
  if (els.usermenu) els.usermenu.hidden = false;
  if (els.username) els.username.textContent = user?.name || 'Usuario';
  if (els.btnLogout) els.btnLogout.hidden = false;

  ensureProfileDefaults(user);

  // Defaults: rango del mes actual
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const month = `${y}-${m}`;
  if (els.filterMonth) els.filterMonth.value = month;
  const r = setMonthToRange(month);
  if (r) {
    if (els.filterStart) els.filterStart.value = r.start;
    if (els.filterEnd) els.filterEnd.value = r.end;
  }

  render();
}

function showLogin() {
  if (els.app) els.app.hidden = true;
  if (els.login) els.login.hidden = false;
  if (els.usermenu) els.usermenu.hidden = true;
  if (els.usermenuMenu) els.usermenuMenu.hidden = true;
  if (els.btnLogout) els.btnLogout.hidden = true;
  if (els.loginShowPass) els.loginShowPass.checked = false;
  if (els.loginPass) els.loginPass.type = 'password';
  renderLoginNow();
}

// Inicio
(() => {
  const user = getCurrentUser();
  if (user) {
    showAppForUser(user);
    return;
  }
  showLogin();
})();

els.loginForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const key = safeStr(els.loginUser?.value).toLowerCase();
  const pass = safeStr(els.loginPass?.value);
  if (pass !== '123456789') {
    alert('Contraseña incorrecta.');
    els.loginPass?.focus();
    return;
  }
  const user = USERS[key] || USERS.kevin;
  setCurrentUser(user);
  showAppForUser(user);
});

els.loginShowPass?.addEventListener('change', () => {
  if (!els.loginPass) return;
  els.loginPass.type = els.loginShowPass.checked ? 'text' : 'password';
});
