const STORAGE_KEY = 'bitacora_simple_v1_records';
const USER_KEY = 'bitacora_simple_v1_user';

const USERS = {
  ivan: { id: 'ivan', name: 'Iván' },
  kevin: { id: 'kevin', name: 'Kevin' },
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

function matchesSearch(rec, q) {
  const query = safeStr(q).toLowerCase();
  if (!query) return true;
  const hay = [
    rec.desc,
    rec.location,
    rec.area,
    rec.assigned_to,
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
  userchip: document.getElementById('userchip'),
  username: document.getElementById('username'),
  btnLogout: document.getElementById('btn-logout'),

  rows: document.getElementById('rows'),
  modal: document.getElementById('modal'),
  form: document.getElementById('form'),
  modalTitle: document.getElementById('modal-title'),
  btnNew: document.getElementById('btn-new'),
  btnExport: document.getElementById('btn-export'),
  btnPrint: document.getElementById('btn-print'),
  btnClear: document.getElementById('btn-clear'),
  btnToday: document.getElementById('btn-today'),
  btnThisMonth: document.getElementById('btn-this-month'),
  btnCancel: document.getElementById('btn-cancel'),
  btnDelete: document.getElementById('btn-delete'),

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
  fLocation: document.getElementById('f-location'),
  fArea: document.getElementById('f-area'),
  fAssigned: document.getElementById('f-assigned'),
};

const uiState = {
  status: '',
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

function render() {
  const all = loadRecords();
  const list = filteredRecords(all);
  updateCounts(all);

  if (!els.rows) return;
  if (!list.length) {
    els.rows.innerHTML = `<tr><td colspan="8" class="empty">Sin registros con esos filtros.</td></tr>`;
    return;
  }

  els.rows.innerHTML = list
    .map((r) => {
      const date = safeStr(r.date);
      const desc = safeStr(r.desc);
      const loc = safeStr(r.location) || '—';
      const area = safeStr(r.area) || '—';
      const assigned = safeStr(r.assigned_to) || '—';
      const createdBy = safeStr(r.created_by) || '—';
      const st = safeStr(r.status).toLowerCase();
      const canComplete = st !== 'completado';

      return `
        <tr>
          <td>${date || '—'}</td>
          <td>${escapeHtml(desc) || '—'}</td>
          <td>${escapeHtml(loc)}</td>
          <td>${escapeHtml(area)}</td>
          <td>${escapeHtml(assigned)}</td>
          <td>${escapeHtml(createdBy)}</td>
          <td>${statusBadge(st)}</td>
          <td>
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

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function openModalForNew() {
  els.modalTitle.textContent = 'Nueva actividad';
  els.fId.value = '';
  els.fDate.value = todayISO();
  els.fStatus.value = 'pendiente';
  els.fDesc.value = '';
  els.fLocation.value = '';
  els.fArea.value = '';
  els.fAssigned.value = '';
  els.btnDelete.hidden = true;
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
  els.fLocation.value = rec.location || '';
  els.fArea.value = rec.area || '';
  els.fAssigned.value = rec.assigned_to || '';
  els.btnDelete.hidden = false;
  els.modal.showModal();
  setTimeout(() => els.fDesc.focus(), 50);
}

function upsertFromForm() {
  const user = getCurrentUser();
  const id = safeStr(els.fId.value) || uid();
  const date = safeStr(els.fDate.value) || todayISO();
  const status = safeStr(els.fStatus.value).toLowerCase() === 'completado' ? 'completado' : 'pendiente';
  const desc = safeStr(els.fDesc.value);
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
  const next = {
    ...base,
    id,
    date,
    status,
    desc,
    location,
    area,
    assigned_to,
    created_by: base.created_by || user?.name || '—',
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

function exportExcel() {
  const list = filteredRecords(loadRecords());
  const { start, end, status } = getFilters();
  const file = `bitacora_${status || 'todas'}_${start || 'inicio'}_${end || 'fin'}`;
  const out = [
    ['Fecha', 'Actividad', 'Ubicación', 'Área', 'Responsable(s)', 'Registró', 'Estado'],
    ...list.map((r) => [
      r.date || '',
      r.desc || '',
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

function printCurrent() {
  window.print();
}

// -----------------
// Wiring
// -----------------

els.btnNew.addEventListener('click', openModalForNew);
els.btnExport.addEventListener('click', exportExcel);
els.btnPrint.addEventListener('click', printCurrent);
els.btnLogout?.addEventListener('click', () => {
  clearCurrentUser();
  location.reload();
});
els.btnClear.addEventListener('click', () => {
  uiState.status = '';
  els.tabButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.status === ''));
  els.filterMonth.value = '';
  els.filterStart.value = '';
  els.filterEnd.value = '';
  els.filterQ.value = '';
  render();
});
els.btnToday?.addEventListener('click', () => {
  const t = todayISO();
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
  render();
});
els.filterStart.addEventListener('change', render);
els.filterEnd.addEventListener('change', render);
els.filterQ.addEventListener('input', () => {
  // pequeña pausa para que se sienta suave
  window.clearTimeout(window.__bt_timer);
  window.__bt_timer = window.setTimeout(render, 120);
});

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
    render();
    toast('Marcado como realizada.');
  }
});

function showAppForUser(user) {
  if (els.login) els.login.hidden = true;
  if (els.app) els.app.hidden = false;
  if (els.userchip) els.userchip.hidden = false;
  if (els.username) els.username.textContent = user?.name || 'Usuario';
  if (els.btnLogout) els.btnLogout.hidden = false;

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
  if (els.userchip) els.userchip.hidden = true;
  if (els.btnLogout) els.btnLogout.hidden = true;
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
