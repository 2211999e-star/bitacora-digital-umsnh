const STORAGE_KEY = 'bitacora_simple_v1_records';
const USER_KEY = 'bitacora_simple_v1_user';
const PROFILE_KEY_PREFIX = 'bitacora_simple_v1_profile_';
const EVENTS_KEY = 'bitacora_simple_v1_events';
const SEED_KEY = 'bitacora_simple_v1_whiteboard_seed_v2';
const API_URL = typeof window.BITACORA_API_URL === 'string' ? window.BITACORA_API_URL.trim() : '';

let serverSessionActive = false;
let serverRevision = 0;
let stateSyncTimer = null;
let stateSyncInFlight = false;
let stateSyncAgain = false;

const JULY_NOTES = [
  ['Laptop Dell: formateo', 'completado'],
  ['CPU Lenovo: formateo y limpieza', 'completado'],
  ['Antena del AIV 12', 'completado'],
  ['Antenas de posgrado', 'completado'],
  ['Traer antenas de cómputo A4', 'completado'],
  ['Instalar CPU', 'completado'],
  ['Cambio de base, salón 10', 'completado'],
  ['2 monitores: van Miguel y Benja', 'pendiente'],
  ['Antenas 15 y 16 A.V.: urgente, Kevin y Yair', 'pendiente'],
  ['Antena del Z15', 'pendiente'],
  ['Cañón: configurar A4 del salón 2', 'pendiente'],
  ['Instalación de CPU, salón 10 A4', 'pendiente'],
  ['Asignación de IP, edificio Y', 'pendiente'],
  ['Formateo de laboratorio 6, edificio Y: Luis, Miguel, Gerardo, Miguel y Benja', 'pendiente'],
  ['Formateo de laboratorio 2: Yair', 'pendiente'],
  ['Bitácora: urgente, Kevin', 'pendiente'],
];

const ARCHIVE_NOTES = [
  ['tablero-2026-04-13-impresora-chulada', '2026-04-13', 'Impresora Chulada', 'Mantenimiento', 'completado'],
  ['tablero-2026-04-16-impresora-hp', '2026-04-16', 'Impresora HP de la academia', 'Mantenimiento y fallas', 'completado'],
  ['tablero-2026-06-15-cpu-hp', '2026-06-15', 'CPU HP MXJ9460832', 'Cambio de disco y mantenimiento. Coordinación de Mercadotecnia', 'completado'],
  ['tablero-2026-09-02-servicio-social', '2026-09-02', 'Servicio social', 'Python y teclado', 'pendiente'],
  ['tablero-2026-09-bitacora-correctivo', '2026-09-29', 'Creación de bitácora de mantenimiento preventivo y correctivo', 'Kevin', 'completado'],
];

const USERS = {
  ivan: {
    id: 'ivan',
    name: 'Iván',
    role: 'Comisionista / Coordinador del área',
    is_admin: true,
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

const PREVENTIVE_TASKS = [
  'Limpieza interna',
  'Limpieza de software',
  'Actualización de sistema',
  'Revisión de antivirus',
  'Revisión de disco',
  'Otros',
];

const GENERAL_ACTIVITIES = [
  'Instalación de software',
  'Configuración de equipo o sistema',
  'Soporte a usuario',
  'Revisión de red e internet',
  'Instalación de equipo',
  'Configuración de impresora',
  'Asesoría o capacitación',
  'Inventario o registro de equipo',
];

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

function seedJulyNotes() {
  if (API_URL) return;
  const now = new Date().toISOString();
  const initialRecords = JULY_NOTES.map(([desc, status], index) => ({
    id: `julio-2026-${String(index + 1).padStart(2, '0')}`,
    created_at: now,
    updated_at: now,
    updated_by: 'Iván',
    created_by: 'Iván Fernández Mandujano',
    date: '2026-07-01',
    status,
    desc,
    action_detail: 'Nota inicial del pizarrón de mantenimiento de julio.',
    equipment_type: '',
    equipment_description: '',
    inventory_number: '',
    brand: '',
    model: '',
    maintenance_type: '',
    maintenance_detail: '',
    serial_number: '',
    location: '',
    area: 'Comisión Académica de Servicios Informáticos',
    assigned_to: '',
    completed_at: status === 'completado' ? now : null,
  }));
  const archiveRecords = ARCHIVE_NOTES.map(([id, date, desc, action_detail, status]) => ({
    id,
    created_at: now,
    updated_at: now,
    updated_by: 'Iván',
    created_by: 'Iván Fernández Mandujano',
    date,
    status,
    desc,
    action_detail,
    equipment_type: '',
    equipment_description: '',
    inventory_number: '',
    brand: '',
    model: '',
    maintenance_type: '',
    maintenance_detail: '',
    serial_number: '',
    location: '',
    area: 'Comisión Académica de Servicios Informáticos',
    assigned_to: status === 'completado' && id.includes('bitacora') ? 'Kevin' : '',
    completed_at: status === 'completado' ? now : null,
  }));
  const existing = loadRecords();
  const knownIds = new Set(existing.map((record) => record.id));
  const missing = [...initialRecords, ...archiveRecords].filter((record) => !knownIds.has(record.id));
  if (missing.length) saveRecords([...existing, ...missing]);
  localStorage.setItem(SEED_KEY, '1');
}

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function safeStr(v) {
  return String(v ?? '').trim();
}

function nestedValue(record, group, key, legacyKey = '') {
  return safeStr(record?.[group]?.[key] || (legacyKey ? record?.[legacyKey] : ''));
}

function recordCategory(record) {
  const saved = safeStr(record?.tipoRegistro || record?.record_type).toLowerCase();
  if (['general', 'preventivo', 'correctivo', 'recoleccion'].includes(saved)) return saved;
  const legacy = safeStr(record?.maintenance_type).toLowerCase();
  if (legacy.includes('correctivo')) return 'correctivo';
  if (legacy.includes('preventivo')) return 'preventivo';
  if (legacy && legacy !== 'sin especificar') return 'preventivo';
  return 'general';
}

function isCompletedStatus(status) {
  return ['completada', 'completado'].includes(safeStr(status).toLowerCase());
}

function isCancelledStatus(status) {
  return safeStr(status).toLowerCase() === 'cancelada';
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
  scheduleServerSync();
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
  scheduleServerSync();
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
  scheduleServerSync();
}

function setSyncStatus(message, isError = false) {
  const status = document.getElementById('sync-status');
  if (!status) return;
  status.hidden = !message;
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

async function apiRequest(action, options = {}) {
  const response = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('La API no respondió con JSON. Revisa la configuración de PHP en Apache.');
  }
  if (!response.ok) throw new Error(payload?.error || `Error del servidor (${response.status}).`);
  return payload;
}

function readLocalServerState() {
  const profiles = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(PROFILE_KEY_PREFIX)) continue;
    const username = key.slice(PROFILE_KEY_PREFIX.length);
    try {
      const profile = JSON.parse(localStorage.getItem(key) || 'null');
      if (profile && typeof profile === 'object' && !Array.isArray(profile)) profiles[username] = profile;
    } catch {
      // Omite perfiles locales con JSON inválido durante la migración.
    }
  }
  return { records: loadRecords(), events: loadEvents(), profiles };
}

function replaceLocalProfiles(profiles) {
  const keysToRemove = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(PROFILE_KEY_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  Object.entries(profiles || {}).forEach(([username, profile]) => {
    if (!/^[a-z0-9][a-z0-9_-]{2,31}$/i.test(username) || !profile || typeof profile !== 'object') return;
    localStorage.setItem(profileKeyFor(username), JSON.stringify(profile));
  });
}

function applyServerState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records || []));
  localStorage.setItem(EVENTS_KEY, JSON.stringify(state.events || []));
  replaceLocalProfiles(state.profiles);
}

function scheduleServerSync() {
  if (!API_URL || !serverSessionActive) return;
  setSyncStatus('Cambios locales pendientes de sincronización…');
  window.clearTimeout(stateSyncTimer);
  stateSyncTimer = window.setTimeout(() => {
    syncServerState();
  }, 400);
}

async function syncServerState() {
  if (!API_URL || !serverSessionActive) return true;
  window.clearTimeout(stateSyncTimer);
  if (stateSyncInFlight) {
    stateSyncAgain = true;
    return false;
  }
  stateSyncInFlight = true;
  let success = true;
  try {
    do {
      stateSyncAgain = false;
      const state = readLocalServerState();
      const result = await apiRequest('state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state, revision: serverRevision }),
      });
      serverRevision = result.revision;
    } while (stateSyncAgain);
    setSyncStatus('Sincronizado con el servidor.');
  } catch (error) {
    success = false;
    setSyncStatus(error.message, true);
  } finally {
    stateSyncInFlight = false;
  }
  return success;
}

async function loginToServer(username, password) {
  const result = await apiRequest('login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const state = result.state;
  serverRevision = Number(state?.revision) || 0;
  serverSessionActive = true;

  const local = readLocalServerState();
  const hasLocalData = local.records.length > 0 || local.events.length > 0 || Object.keys(local.profiles).length > 0;
  const serverIsEmpty = serverRevision === 0
    && (state.records?.length || 0) === 0
    && (state.events?.length || 0) === 0
    && Object.keys(state.profiles || {}).length === 0;
  if (serverIsEmpty && hasLocalData && confirm('La base de datos está vacía y este navegador tiene datos locales. ¿Quieres copiarlos al servidor para iniciar la bitácora compartida?')) {
    applyServerState(local);
    if (!await syncServerState()) {
      serverSessionActive = false;
      throw new Error('No se pudieron migrar los datos locales. No se guardaron en el servidor.');
    }
  } else {
    applyServerState(state);
  }
  return result.user;
}

function setUsersMessage(message, isError = false) {
  const element = document.getElementById('users-message');
  if (!element) return;
  element.hidden = !message;
  element.textContent = message;
  element.classList.toggle('is-error', isError);
}

function renderAdminUsers(users) {
  const list = document.getElementById('users-list');
  if (!list) return;
  if (!users.length) {
    list.textContent = 'No hay cuentas registradas.';
    return;
  }
  list.innerHTML = users.map((user) => `
    <article class="admin-user-row">
      <div class="admin-user-info">
        <strong>${escapeHtml(user.display_name)}</strong>
        <span>@${escapeHtml(user.username)}${user.role ? ` · ${escapeHtml(user.role)}` : ''}</span>
      </div>
      <form class="admin-password-form" data-user-password-form>
        <input type="hidden" name="username" value="${escapeHtml(user.username)}" />
        <label class="field">
          <span>Nueva contraseña</span>
          <input type="password" name="password" minlength="12" maxlength="1024" autocomplete="new-password" placeholder="Mínimo 12 caracteres" required />
        </label>
        <button class="btn btn-ghost" type="submit">Cambiar contraseña</button>
      </form>
    </article>
  `).join('');
}

async function loadAdminUsers() {
  setUsersMessage('Cargando cuentas…');
  try {
    const result = await apiRequest('users');
    renderAdminUsers(Array.isArray(result.users) ? result.users : []);
    setUsersMessage('');
  } catch (error) {
    setUsersMessage(error.message || 'No se pudieron cargar las cuentas.', true);
  }
}

function openUserAdministration() {
  if (!getCurrentUser()?.is_admin) return;
  document.getElementById('users-modal')?.showModal();
  const inputs = els.userCreateForm?.querySelectorAll('input, button') || [];
  inputs.forEach((input) => { input.disabled = !API_URL; });
  if (!API_URL) {
    els.usersList.textContent = 'Las cuentas se administran en la base de datos del servidor.';
    setUsersMessage('La administración de usuarios requiere la API PHP/MariaDB. Esta vista de GitHub Pages es solo demostrativa; activa la API en js/config.js en el servidor Apache.');
    return;
  }
  setUsersMessage('');
  loadAdminUsers();
}

async function createManagedUser(form) {
  const formData = new FormData(form);
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  setUsersMessage('');
  try {
    const result = await apiRequest('users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: formData.get('username'),
        display_name: formData.get('display_name'),
        role: formData.get('role'),
        password: formData.get('password'),
      }),
    });
    form.reset();
    await loadAdminUsers();
    setUsersMessage(result.message || 'Usuario agregado.');
  } catch (error) {
    setUsersMessage(error.message || 'No se pudo agregar el usuario.', true);
  } finally {
    if (submit) submit.disabled = false;
  }
}

async function changeManagedPassword(form) {
  const formData = new FormData(form);
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  setUsersMessage('');
  try {
    const result = await apiRequest('user-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password'),
      }),
    });
    form.reset();
    setUsersMessage(result.message || 'Contraseña actualizada.');
  } catch (error) {
    setUsersMessage(error.message || 'No se pudo cambiar la contraseña.', true);
  } finally {
    if (submit) submit.disabled = false;
  }
}

function downloadBlob(filename, blob) {
  const safeName = (filename || 'export').replace(/[\\/:*?"<>|]+/g, '_');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function excelColumnName(index) {
  let name = '';
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function worksheetXml(sheet) {
  const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
  const maxColumns = Math.max(1, ...rows.map((row) => row.length));
  const lastCell = `${excelColumnName(maxColumns - 1)}${Math.max(1, rows.length)}`;
  const cols = (sheet.widths || []).map((width, index) =>
    `<col min="${index + 1}" max="${index + 1}" width="${Math.max(8, Math.min(60, Number(width) || 16))}" customWidth="1"/>`,
  ).join('');
  const rowXml = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const address = `${excelColumnName(columnIndex)}${rowIndex + 1}`;
      const style = rowIndex === 0 ? ' s="1"' : '';
      if (typeof value === 'number' && Number.isFinite(value)) {
        return `<c r="${address}"${style}><v>${value}</v></c>`;
      }
      return `<c r="${address}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');
  const filter = rows.length > 1 ? `<autoFilter ref="A1:${lastCell}"/>` : '';
  const orientation = sheet.orientation === 'landscape' ? 'landscape' : 'portrait';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCell}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="19"/>
  <cols>${cols}</cols>
  <sheetData>${rowXml}</sheetData>
  ${filter}
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup paperSize="9" orientation="${orientation}"/>
</worksheet>`;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipFiles(files) {
  const encoder = new TextEncoder();
  const entries = Object.entries(files);
  const chunks = [];
  const centralDirectory = [];
  const date = new Date();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  let offset = 0;

  const makeHeader = (size, write) => {
    const bytes = new Uint8Array(size);
    write(new DataView(bytes.buffer));
    return bytes;
  };
  const joinBytes = (parts) => {
    const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let position = 0;
    parts.forEach((part) => {
      output.set(part, position);
      position += part.length;
    });
    return output;
  };

  for (const [name, content] of entries) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const checksum = crc32(data);
    const localHeader = makeHeader(30, (view) => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, dosTime, true);
      view.setUint16(12, dosDate, true);
      view.setUint32(14, checksum, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, nameBytes.length, true);
      view.setUint16(28, 0, true);
    });
    chunks.push(localHeader, nameBytes, data);

    const centralHeader = makeHeader(46, (view) => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, 0x0800, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, dosTime, true);
      view.setUint16(14, dosDate, true);
      view.setUint32(16, checksum, true);
      view.setUint32(20, data.length, true);
      view.setUint32(24, data.length, true);
      view.setUint16(28, nameBytes.length, true);
      view.setUint16(30, 0, true);
      view.setUint16(32, 0, true);
      view.setUint16(34, 0, true);
      view.setUint16(36, 0, true);
      view.setUint32(38, 0, true);
      view.setUint32(42, offset, true);
    });
    centralDirectory.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + data.length;
  }

  const centralBytes = joinBytes(centralDirectory);
  const endRecord = makeHeader(22, (view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, entries.length, true);
    view.setUint16(10, entries.length, true);
    view.setUint32(12, centralBytes.length, true);
    view.setUint32(16, offset, true);
    view.setUint16(20, 0, true);
  });
  return new Blob([...chunks, centralBytes, endRecord], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function downloadXlsx(filename, sheets) {
  const safeSheets = sheets.map((sheet, index) => {
    const name = safeStr(sheet.name).replace(/[\\/*?:\[\]]/g, '').slice(0, 31) || `Hoja${index + 1}`;
    return { ...sheet, name };
  });
  if (!safeSheets.length) throw new Error('El libro no contiene hojas.');

  const sheetOverrides = safeSheets.map((_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('');
  const workbookSheets = safeSheets.map((sheet, index) =>
    `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
  ).join('');
  const workbookRels = safeSheets.map((_, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  ).join('');
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${workbookSheets}</sheets>
</workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${workbookRels}
  <Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF176B63"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFDCE7E8"/></left><right style="thin"><color rgb="FFDCE7E8"/></right><top style="thin"><color rgb="FFDCE7E8"/></top><bottom style="thin"><color rgb="FFDCE7E8"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
  };
  safeSheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = worksheetXml(sheet);
  });
  downloadBlob(filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`, zipFiles(files));
}

function downloadBackup() {
  const backup = {
    app: 'bitacora-digital-umsnh',
    version: 1,
    exported_at: new Date().toISOString(),
    records: loadRecords(),
    events: loadEvents(),
    profiles: readLocalServerState().profiles,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob(`respaldo_bitacora_${todayISO()}.json`, blob);
  toast('Respaldo descargado. Guárdalo en un lugar seguro.');
}

async function restoreBackup(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    alert('El archivo supera el límite de 10 MB.');
    return;
  }
  try {
    const backup = JSON.parse(await file.text());
    const validRecords = Array.isArray(backup?.records) && backup.records.every((record) =>
      record && typeof record === 'object' && typeof record.id === 'string' && typeof record.desc === 'string',
    );
    const validEvents = Array.isArray(backup?.events) && backup.events.every((event) =>
      event && typeof event === 'object' && typeof event.id === 'string' && typeof event.title === 'string',
    );
    if (backup?.app !== 'bitacora-digital-umsnh' || backup?.version !== 1 || !validRecords || !validEvents) {
      throw new Error('Formato de respaldo no válido.');
    }
    if (!confirm(`El respaldo contiene ${backup.records.length} actividades y ${backup.events.length} eventos. Se reemplazarán los datos actuales. ¿Continuar?`)) return;

    saveRecords(backup.records);
    saveEvents(backup.events);
    replaceLocalProfiles(backup.profiles);
    if (API_URL && serverSessionActive && !await syncServerState()) {
      throw new Error('El respaldo quedó en este navegador, pero no se sincronizó con el servidor.');
    }
    uiState.page = 1;
    render();
    toast(API_URL ? 'Respaldo restaurado y sincronizado con el servidor.' : 'Respaldo restaurado correctamente.');
  } catch (error) {
    console.error('No se pudo restaurar el respaldo:', error);
    alert(error.message || 'No se pudo restaurar. Verifica que seleccionaste un respaldo válido de esta aplicación.');
  } finally {
    if (els.backupFile) els.backupFile.value = '';
  }
}

function setMonthToRange(month) {
  const value = safeStr(month);
  if (!value) return null;
  const [yRaw, mRaw] = value.split('-');
  const y = Number(yRaw);
  const m = Number(mRaw);
  if (!y || !m) return null;
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const finalDay = new Date(y, m, 0).getDate();
  const last = `${y}-${String(m).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
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
  const [year, month, day] = d.split('-');
  return year && month && day ? `${day}/${month}/${year}` : d;
}

function matchesSearch(rec, q) {
  const query = safeStr(q).toLowerCase();
  if (!query) return true;
  const equipment = rec.equipo || {};
  const maintenance = rec.mantenimiento || {};
  const location = rec.ubicacion || {};
  const hay = [
    rec.desc,
    rec.action_detail,
    rec.location || location.lugar,
    rec.area || location.area,
    rec.assigned_to || rec.tecnicos,
    rec.responsable_area || location.responsableArea,
    rec.recogidoPor,
    rec.equipment_type,
    rec.device_type || equipment.tipo,
    rec.tipoRegistro,
    rec.general_activity,
    rec.tipoActividadGeneral,
    rec.inventory_number || equipment.clavePatrimonio,
    rec.equipment_description || equipment.descripcion,
    rec.brand,
    equipment.marca,
    rec.model,
    equipment.modelo,
    rec.maintenance_type,
    rec.maintenance_detail,
    maintenance.falla,
    maintenance.diagnostico,
    maintenance.solucion,
    maintenance.refacciones,
    rec.serial_number,
    equipment.numeroSerie,
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
  const labels = {
    pendiente: ['Pendiente', 'todo'],
    en_proceso: ['En proceso', 'progress'],
    completada: ['Completada', 'ok'],
    completado: ['Realizada', 'ok'],
    cancelada: ['Cancelada', 'cancelled'],
  };
  const [label, className] = labels[st] || ['Pendiente', 'todo'];
  return `<span class="badge ${className}">${label}</span>`;
}

function statusLabel(status) {
  const st = safeStr(status).toLowerCase();
  return ({
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    completada: 'Completada',
    completado: 'Realizada',
    cancelada: 'Cancelada',
  })[st] || 'Pendiente';
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
  usermenuEmail: document.getElementById('usermenu-email'),
  usermenuMatricula: document.getElementById('usermenu-matricula'),
  usermenuRole: document.getElementById('usermenu-role'),
  userInitials: document.getElementById('user-initials'),
  username: document.getElementById('username'),
  btnLogout: document.getElementById('btn-logout'),
  btnMenuSettings: document.getElementById('btn-menu-settings'),
  btnAdminUsers: document.getElementById('btn-admin-users'),
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
  btnFullRecord: document.getElementById('btn-full-record'),
  btnBulk: document.getElementById('btn-bulk'),
  btnExport: document.getElementById('btn-export'),
  btnExportLandscape: document.getElementById('btn-export-landscape'),
  btnExportEvents: document.getElementById('btn-export-events'),
  btnPrint: document.getElementById('btn-print'),
  btnPrintLandscape: document.getElementById('btn-print-landscape'),
  btnPrintEvents: document.getElementById('btn-print-events'),
  btnClear: document.getElementById('btn-clear'),
  btnToday: document.getElementById('btn-today'),
  btnThisMonth: document.getElementById('btn-this-month'),
  btnCancel: document.getElementById('btn-cancel'),
  btnDelete: document.getElementById('btn-delete'),
  printHeader: document.getElementById('print-header'),
  printFooter: document.getElementById('print-footer'),
  pager: document.getElementById('pager'),
  pageSize: document.getElementById('page-size'),
  resultsLabel: document.getElementById('results-label'),
  backupFile: document.getElementById('backup-file'),
  btnBackup: document.getElementById('btn-backup'),
  btnRestore: document.getElementById('btn-restore'),

  // Burbuja lateral (acciones rápidas)
  fabToggle: document.getElementById('fab-toggle'),
  fabMenu: document.getElementById('fab-menu'),
  fabClose: document.getElementById('fab-close'),

  tabButtons: Array.from(document.querySelectorAll('.tab')),
  countAll: document.getElementById('count-all'),
  countPend: document.getElementById('count-pend'),
  countDone: document.getElementById('count-done'),
  filterMonth: document.getElementById('filter-month'),
  filterStart: document.getElementById('filter-start'),
  filterEnd: document.getElementById('filter-end'),
  filterQ: document.getElementById('filter-q'),
  filterRecordType: document.getElementById('filter-record-type'),
  filterMaintenance: document.getElementById('filter-maintenance'),

  fId: document.getElementById('f-id'),
  fDate: document.getElementById('f-date'),
  fStatus: document.getElementById('f-status'),
  fDesc: document.getElementById('f-desc'),
  fActionDetail: document.getElementById('f-action-detail'),
  fEquipmentType: document.getElementById('f-record-type'),
  fDeviceType: document.getElementById('f-device-type'),
  fEquipmentDescription: document.getElementById('f-equipment-description'),
  fBrand: document.getElementById('f-brand'),
  fModel: document.getElementById('f-model'),
  maintenanceSection: document.getElementById('maintenance-section'),
  generalActivitySection: document.getElementById('general-activity-section'),
  fGeneralActivity: document.getElementById('f-general-activity'),
  generalActivityCustomField: document.getElementById('general-activity-custom-field'),
  fGeneralActivityCustom: document.getElementById('f-general-activity-custom'),
  fInventoryNumber: document.getElementById('f-inventory-number'),
  fSerialNumber: document.getElementById('f-serial-number'),
  fLocation: document.getElementById('f-location'),
  fArea: document.getElementById('f-area'),
  fAssigned: document.getElementById('f-assigned'),
  equipmentSection: document.getElementById('equipment-section'),
  preventiveFields: document.getElementById('preventive-fields'),
  correctiveFields: document.getElementById('corrective-fields'),
  collectionSection: document.getElementById('collection-section'),
  locationSection: document.getElementById('location-section'),
  observationsField: document.getElementById('observations-field'),
  fPreventiveOther: document.getElementById('f-preventive-other'),
  fPreventiveOtherDetail: document.getElementById('f-preventive-other-detail'),
  preventiveOtherField: document.getElementById('preventive-other-field'),
  fNextMaintenance: document.getElementById('f-next-maintenance'),
  fReportedFailure: document.getElementById('f-reported-failure'),
  fDiagnosis: document.getElementById('f-diagnosis'),
  fSolution: document.getElementById('f-solution'),
  fParts: document.getElementById('f-parts'),
  fObservations: document.getElementById('f-observations'),
  retireEquipmentField: document.getElementById('retire-equipment-field'),
  fRetireEquipment: document.getElementById('f-retire-equipment'),
  fCollectedBy: document.getElementById('f-collected-by'),
  fCollectedDate: document.getElementById('f-collected-date'),
  fDeliveryDate: document.getElementById('f-delivery-date'),
  fReceivedBy: document.getElementById('f-received-by'),
  collectedDateField: document.getElementById('collected-date-field'),
  deliveryDateField: document.getElementById('delivery-date-field'),
  receivedByField: document.getElementById('received-by-field'),
  fAreaResponsible: document.getElementById('f-area-responsible'),
  fAreaRole: document.getElementById('f-area-role'),
  fAreaContact: document.getElementById('f-area-contact'),
  inventoryWarning: document.getElementById('inventory-warning'),
  btnSave: document.getElementById('btn-save'),
  saveHint: document.getElementById('save-hint'),
  btnModalClose: document.getElementById('btn-modal-close'),
  quickModal: document.getElementById('quick-modal'),
  quickForm: document.getElementById('quick-form'),
  qDate: document.getElementById('q-date'),
  qStatus: document.getElementById('q-status'),
  qGeneralActivity: document.getElementById('q-general-activity'),
  qGeneralActivityCustomField: document.getElementById('q-general-activity-custom-field'),
  qGeneralActivityCustom: document.getElementById('q-general-activity-custom'),
  qDesc: document.getElementById('q-desc'),
  btnQuickSave: document.getElementById('btn-quick-save'),
  quickSaveHint: document.getElementById('quick-save-hint'),
  btnQuickClose: document.getElementById('btn-quick-close'),
  btnQuickCancel: document.getElementById('btn-quick-cancel'),

  // Perfil
  profileModal: document.getElementById('profile-modal'),
  profileForm: document.getElementById('profile-form'),
  pFullname: document.getElementById('p-fullname'),
  pEmail: document.getElementById('p-email'),
  pMatricula: document.getElementById('p-matricula'),
  pArea: document.getElementById('p-area'),
  pRole: document.getElementById('p-role'),
  btnProfileCancel: document.getElementById('btn-profile-cancel'),
  usersModal: document.getElementById('users-modal'),
  btnUsersClose: document.getElementById('btn-users-close'),
  userCreateForm: document.getElementById('user-create-form'),
  usersList: document.getElementById('users-list'),

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
  bulkModal: document.getElementById('bulk-modal'),
  bulkForm: document.getElementById('bulk-form'),
  bulkMonth: document.getElementById('bulk-month'),
  bulkStatus: document.getElementById('bulk-status'),
  bulkText: document.getElementById('bulk-text'),
  btnBulkCancel: document.getElementById('btn-bulk-cancel'),
};

const uiState = {
  status: '',
  page: 1,
  pageSize: 10,
};

let formInitialSnapshot = '';
let quickInitialSnapshot = '';
let autoSuggestedNextMaintenance = '';
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

function toastSaved(message) {
  toast(API_URL ? `${message} Guardado localmente; sincronizando con el servidor…` : message);
}

function getFilters() {
  const month = safeStr(els.filterMonth?.value);
  const rangeFromMonth = month ? setMonthToRange(month) : null;
  const start = safeStr(rangeFromMonth?.start || els.filterStart?.value);
  const end = safeStr(rangeFromMonth?.end || els.filterEnd?.value);
  const q = safeStr(els.filterQ?.value);
  const status = safeStr(uiState.status);
  const recordType = safeStr(els.filterRecordType?.value);
  const maintenance = safeStr(els.filterMaintenance?.value);
  return { start, end, q, status, recordType, maintenance };
}

function matchesRecordType(record, type) {
  if (!type) return true;
  const category = recordCategory(record);
  const equipmentType = safeStr(record?.equipo?.tipo || record.device_type || record.equipment_type);
  if (type === 'Normal') return category === 'general';
  if (type === 'Mantenimiento') return category === 'preventivo' || category === 'correctivo';
  if (type === 'Computadora') return equipmentType === 'Computadora';
  if (type === 'Impresora') return equipmentType === 'Impresora';
  return equipmentType === type || category === type.toLowerCase();
}

function matchesMaintenance(record, maintenance) {
  if (!maintenance) return true;
  return safeStr(record.maintenance_type).toLowerCase() === maintenance.toLowerCase();
}

function matchesStatus(record, status) {
  const saved = safeStr(record.status).toLowerCase();
  if (status === 'pendiente') return ['pendiente', 'en_proceso'].includes(saved);
  if (status === 'completado') return isCompletedStatus(saved);
  return saved === status;
}

function updateCounts(records) {
  const { start, end, q, recordType, maintenance } = getFilters();
  const base = (records || [])
    .filter((r) => (start || end ? inRange(r.date, start, end) : true))
    .filter((r) => matchesSearch(r, q))
    .filter((r) => matchesRecordType(r, recordType))
    .filter((r) => matchesMaintenance(r, maintenance));

  const all = base.length;
  const pend = base.filter((r) => ['pendiente', 'en_proceso'].includes(safeStr(r.status).toLowerCase())).length;
  const done = base.filter((r) => isCompletedStatus(r.status)).length;

  if (els.countAll) els.countAll.textContent = String(all);
  if (els.countPend) els.countPend.textContent = String(pend);
  if (els.countDone) els.countDone.textContent = String(done);
}

function filteredRecords(records) {
  const { start, end, q, status, recordType, maintenance } = getFilters();
  return (records || [])
    .filter((r) => (status ? matchesStatus(r, status) : true))
    .filter((r) => (start || end ? inRange(r.date, start, end) : true))
    .filter((r) => matchesSearch(r, q))
    .filter((r) => matchesRecordType(r, recordType))
    .filter((r) => matchesMaintenance(r, maintenance))
    .sort(sortNewest);
}

function summarizeRecords(list) {
  const all = (list || []).length;
  const pend = (list || []).filter((r) => ['pendiente', 'en_proceso'].includes(safeStr(r.status).toLowerCase())).length;
  const done = (list || []).filter((r) => isCompletedStatus(r.status)).length;
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
      <div class="summary-k">Avance del período</div>
      <div class="summary-progress">
        <strong>${donePct}%</strong>
        <span class="summary-progress-track" role="progressbar" aria-label="Avance de actividades realizadas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${donePct}">
          <span class="summary-progress-fill" style="width:${donePct}%"></span>
        </span>
      </div>
      <div class="summary-v small">${s.done} de ${s.all} actividades realizadas</div>
      <div class="summary-v small">${s.pend ? `${s.pend} pendiente${s.pend === 1 ? '' : 's'} por atender` : 'Sin pendientes por atender'}</div>
      <div class="summary-v small">Vista: <b>${escapeHtml(status || 'todas')}</b></div>
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
  const table = document.getElementById('table');
  const hasEquipment = full.some((record) =>
    [
      record.equipment_type,
      record.equipment_description,
      record.inventory_number,
      record.brand,
      record.model,
      record.serial_number,
    ].map(safeStr).some(Boolean),
  );
  table?.classList.toggle('has-equipment', hasEquipment);
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
  if (els.resultsLabel) {
    const first = full.length ? start + 1 : 0;
    const last = Math.min(start + list.length, full.length);
    els.resultsLabel.textContent = `Mostrando ${first}–${last} de ${full.length} actividades`;
  }

  if (!els.rows) return;
  if (!list.length) {
    els.rows.innerHTML = `<tr><td colspan="${hasEquipment ? 10 : 9}" class="empty">Sin registros con esos filtros.</td></tr>`;
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
        ['Formato', r.equipment_type],
        ['Descripción', r.equipment_description],
        ['Clave de patrimonio', r.inventory_number],
        ['Marca', r.brand],
        ['Modelo', r.model],
        ['Serie', r.serial_number],
      ].filter(([, value]) => safeStr(value));
      const equipment = equipmentParts.length
        ? equipmentParts.map(([label, value]) => `${label}: ${safeStr(value)}`).join(' · ')
        : '—';
      const createdBy = safeStr(r.created_by) || '—';
      const st = safeStr(r.status).toLowerCase();
      const canComplete = !isCompletedStatus(st) && !isCancelledStatus(st);

      return `
        <tr>
          <td class="td-date" data-label="Fecha">${escapeHtml(formatDateHuman(date))}</td>
          <td class="td-activity" data-label="Actividad">${escapeHtml(desc) || '—'}${actionDetail ? `<div class="activity-detail">${escapeHtml(actionDetail)}</div>` : ''}</td>
          <td class="td-equipment" data-label="Equipo">${escapeHtml(equipment)}</td>
          <td class="td-maintenance" data-label="Mantenimiento">${escapeHtml(maintenanceSummary(r))}</td>
          <td class="td-location" data-label="Ubicación">${escapeHtml(loc)}</td>
          <td class="td-area" data-label="Comisión Académica">${escapeHtml(area)}</td>
          <td class="td-assigned" data-label="Responsable(s)">${escapeHtml(assigned)}</td>
          <td class="td-created" data-label="Registró">${escapeHtml(createdBy)}</td>
          <td class="td-status" data-label="Estado">${statusBadge(st)}</td>
          <td class="td-actions" data-label="Acciones">
            <div class="row-actions">
              ${canComplete ? `<button class="btn btn-ghost" type="button" data-action="complete" data-id="${escapeHtml(r.id)}">Completar</button>` : ''}
              <button class="btn btn-ghost" type="button" data-action="edit" data-id="${escapeHtml(r.id)}">Editar</button>
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

function maintenanceSummary(record) {
  const type = safeStr(record?.maintenance_type) || 'Sin especificar';
  const detail = safeStr(record?.maintenance_detail);
  const generalActivity = safeStr(record?.general_activity);
  const maintenance = type !== 'Sin especificar'
    ? (detail ? `${type} · ${detail}` : type)
    : '';
  const general = generalActivity ? `Actividad general · ${generalActivity}` : '';
  return [maintenance, general].filter(Boolean).join(' | ') || type;
}

function formCategory() {
  return safeStr(els.fEquipmentType?.value) || 'general';
}

function isEquipmentRecord() {
  return formCategory() !== 'general';
}

function isMaintenanceRecord() {
  return ['preventivo', 'correctivo'].includes(formCategory());
}

function addMonthsToDate(dateValue, months) {
  const [year, month, day] = safeStr(dateValue || todayISO()).split('-').map(Number);
  if (!year || !month || !day) return todayISO();
  const targetMonth = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  targetMonth.setDate(Math.min(day, lastDay));
  return `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}-${String(targetMonth.getDate()).padStart(2, '0')}`;
}

function updateFormSections() {
  const category = formCategory();
  const isGeneral = category === 'general';
  const isPreventive = category === 'preventivo';
  const isCorrective = category === 'correctivo';
  const isCollection = category === 'recoleccion';
  const equipmentRequired = !isGeneral;
  const wasPreventive = els.preventiveFields && !els.preventiveFields.hidden;

  if (els.generalActivitySection) els.generalActivitySection.hidden = !isGeneral;
  if (els.equipmentSection) els.equipmentSection.hidden = isGeneral;
  if (els.maintenanceSection) els.maintenanceSection.hidden = !isMaintenanceRecord();
  if (els.preventiveFields) {
    els.preventiveFields.hidden = !isPreventive;
    els.preventiveFields.disabled = !isPreventive;
  }
  if (els.correctiveFields) {
    els.correctiveFields.hidden = !isCorrective;
    els.correctiveFields.disabled = !isCorrective;
  }
  if (els.observationsField) els.observationsField.hidden = !isMaintenanceRecord();
  if (els.fGeneralActivity) els.fGeneralActivity.required = isGeneral;
  if (els.fInventoryNumber) els.fInventoryNumber.required = equipmentRequired;
  if (els.fReportedFailure) els.fReportedFailure.required = isCorrective;

  if (els.retireEquipmentField) els.retireEquipmentField.hidden = !isCorrective;
  if (els.fRetireEquipment) {
    els.fRetireEquipment.disabled = !isCorrective;
    if (isCollection) els.fRetireEquipment.value = 'si';
  }
  const hasRetirement = isCorrective && (
    safeStr(els.fRetireEquipment?.value) === 'si'
    || Boolean(safeStr(els.fCollectedBy?.value))
  );
  const showCollection = isCollection || hasRetirement;
  const showCollectionSection = isCollection || isCorrective;
  if (els.collectionSection) els.collectionSection.hidden = !showCollectionSection;
  if (els.fCollectedBy) els.fCollectedBy.disabled = !showCollectionSection;
  if (els.fCollectedDate) els.fCollectedDate.disabled = !showCollection;
  if (els.fDeliveryDate) els.fDeliveryDate.disabled = !showCollection;
  if (els.fReceivedBy) els.fReceivedBy.disabled = !showCollection;
  if (els.collectedDateField) els.collectedDateField.hidden = !showCollection;
  if (els.deliveryDateField) els.deliveryDateField.hidden = !showCollection;
  if (els.receivedByField) els.receivedByField.hidden = !showCollection;
  if (els.locationSection) els.locationSection.hidden = false;
  if (els.preventiveOtherField) els.preventiveOtherField.hidden = !Boolean(els.fPreventiveOther?.checked);
  if (els.fPreventiveOtherDetail) els.fPreventiveOtherDetail.required = isPreventive && Boolean(els.fPreventiveOther?.checked);
  if (isPreventive && !wasPreventive && els.fNextMaintenance) {
    if (!els.fNextMaintenance.value || els.fNextMaintenance.value === autoSuggestedNextMaintenance) {
      autoSuggestedNextMaintenance = addMonthsToDate(els.fDate?.value || todayISO(), 6);
      els.fNextMaintenance.value = autoSuggestedNextMaintenance;
    } else {
      autoSuggestedNextMaintenance = '';
    }
  }

  syncActivityFormState();
}

function savedGeneralActivities() {
  const savedOptions = [...new Set(loadRecords()
    .map((record) => safeStr(record.tipoActividadGeneral || record.general_activity))
    .filter((activity) => activity && !GENERAL_ACTIVITIES.includes(activity)))];
  return [...GENERAL_ACTIVITIES, ...savedOptions];
}

function populateGeneralActivitySelect(select, selectedValue = '') {
  if (!select) return '';
  const activities = savedGeneralActivities();
  const options = [
    '<option value="">Selecciona una actividad general</option>',
    ...activities.map((activity) => `<option value="${escapeHtml(activity)}">${escapeHtml(activity)}</option>`),
    '<option value="__custom__">Agregar y guardar otra actividad…</option>',
  ];
  select.innerHTML = options.join('');
  const isKnown = activities.includes(selectedValue);
  select.value = isKnown ? selectedValue : (selectedValue ? '__custom__' : '');
  return !isKnown && selectedValue ? selectedValue : '';
}

function updateGeneralActivityOptions(selectedValue = '') {
  if (!els.fGeneralActivity) return;
  if (els.fGeneralActivityCustom) {
    els.fGeneralActivityCustom.value = populateGeneralActivitySelect(els.fGeneralActivity, selectedValue);
  }
  updateGeneralActivityCustomField();
}

function updateGeneralActivityCustomField() {
  const isCustom = formCategory() === 'general' && els.fGeneralActivity?.value === '__custom__';
  if (els.generalActivityCustomField) els.generalActivityCustomField.hidden = !isCustom;
  if (els.fGeneralActivityCustom) els.fGeneralActivityCustom.required = isCustom;
  syncActivityFormState();
}

function populateDatalist(id, values) {
  const list = document.getElementById(id);
  if (!list) return;
  const unique = [...new Set(values.map(safeStr).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  list.replaceChildren(...unique.map((value) => {
    const option = document.createElement('option');
    option.value = value;
    return option;
  }));
}

function updateFormSuggestions() {
  const records = loadRecords();
  populateDatalist('inventory-suggestions', records.map((record) => nestedValue(record, 'equipo', 'clavePatrimonio', 'inventory_number')));
  populateDatalist('brand-suggestions', records.map((record) => nestedValue(record, 'equipo', 'marca', 'brand')));
  populateDatalist('location-suggestions', records.map((record) => nestedValue(record, 'ubicacion', 'lugar', 'location')));
  populateDatalist('responsible-suggestions', records.map((record) => nestedValue(record, 'ubicacion', 'responsableArea', 'responsable_area'))
    .concat(records.map((record) => safeStr(record.recibidoPor))));
  populateDatalist('technician-suggestions', records.map((record) => safeStr(record.tecnicos || record.assigned_to))
    .concat(records.map((record) => safeStr(record.recogidoPor))));
}

function formSnapshot() {
  return JSON.stringify([...els.form.querySelectorAll('input,select,textarea')]
    .filter((field) => field.type !== 'file')
    .map((field) => [field.id || field.name, field.type === 'checkbox' ? field.checked : field.value]));
}

function setFieldError(fieldId, message, reveal) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(`error-${fieldId.replace(/^f-/, '')}`);
  if (field) {
    if (message && reveal) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }
  if (error) {
    error.textContent = reveal ? message : '';
    error.hidden = !reveal || !message;
  }
}

function validateActivityForm(showErrors = false) {
  const category = formCategory();
  const isGeneral = category === 'general';
  const isEquipment = !isGeneral;
  const isCorrective = category === 'correctivo';
  const requiredValues = [
    ['f-date', safeStr(els.fDate?.value), 'Selecciona la fecha.'],
    ['f-desc', safeStr(els.fDesc?.value), 'Escribe la descripción de la actividad.'],
    ...(isGeneral ? [['f-general-activity', safeStr(els.fGeneralActivity?.value), 'Selecciona el tipo de actividad general.']] : []),
    ...(isEquipment ? [
      ['f-inventory-number', safeStr(els.fInventoryNumber?.value), 'La clave de patrimonio es obligatoria.'],
    ] : []),
    ...(isCorrective ? [['f-reported-failure', safeStr(els.fReportedFailure?.value), 'Describe la falla reportada.']] : []),
    ...(isGeneral && safeStr(els.fGeneralActivity?.value) === '__custom__'
      ? [['f-general-activity-custom', safeStr(els.fGeneralActivityCustom?.value), 'Escribe la actividad general.']]
      : []),
    ...(category === 'preventivo' && els.fPreventiveOther?.checked
      ? [['f-preventive-other-detail', safeStr(els.fPreventiveOtherDetail?.value), 'Especifica las otras tareas preventivas.']]
      : []),
  ];
  const errors = new Map(requiredValues.filter(([, value]) => !value).map(([fieldId, , message]) => [fieldId, message]));
  const collectedDate = safeStr(els.fCollectedDate?.value);
  const deliveryDate = safeStr(els.fDeliveryDate?.value);
  if (!els.fCollectedDate?.disabled && collectedDate && deliveryDate && deliveryDate < collectedDate) {
    errors.set('f-delivery-date', 'La fecha de entrega no puede ser anterior a la recolección.');
  }

  const fields = [...els.form.querySelectorAll('[id^="f-"]')];
  fields.forEach((field) => {
    const reveal = showErrors || field.dataset.touched === 'true';
    setFieldError(field.id, errors.get(field.id) || '', reveal);
  });
  return errors.size === 0;
}

function updateInventoryDuplicateWarning() {
  if (!els.inventoryWarning) return;
  const key = safeStr(els.fInventoryNumber?.value).toLowerCase();
  const currentId = safeStr(els.fId?.value);
  const duplicates = key
    ? loadRecords().filter((record) => record.id !== currentId
      && nestedValue(record, 'equipo', 'clavePatrimonio', 'inventory_number').toLowerCase() === key)
    : [];
  els.inventoryWarning.hidden = formCategory() === 'general' || duplicates.length === 0;
  els.inventoryWarning.textContent = duplicates.length
    ? `Aviso: esta clave ya aparece en ${duplicates.length} registro${duplicates.length === 1 ? '' : 's'}. Se guardará como historial del mismo equipo.`
    : '';
}

function syncActivityFormState() {
  if (!els.form || !els.btnSave) return;
  const valid = validateActivityForm();
  els.btnSave.disabled = !valid;
  if (els.saveHint) {
    els.saveHint.textContent = valid
      ? 'Listo para guardar.'
      : 'Completa los campos obligatorios para guardar.';
  }
  updateInventoryDuplicateWarning();
}

function closeActivityModal() {
  if (!els.modal?.open) return;
  if (formSnapshot() !== formInitialSnapshot
    && !confirm('Hay cambios sin guardar. ¿Quieres cerrar y descartarlos?')) return;
  els.modal.close();
}

function openModalForNew() {
  autoSuggestedNextMaintenance = '';
  els.form.reset();
  els.modalTitle.textContent = 'Nueva actividad';
  els.fId.value = '';
  els.fDate.value = todayISO();
  els.fStatus.value = 'pendiente';
  els.fRetireEquipment.value = 'no';
  els.btnDelete.hidden = true;
  els.form.querySelectorAll('[data-touched]').forEach((field) => delete field.dataset.touched);
  els.form.querySelectorAll('.field-error').forEach((field) => {
    field.textContent = '';
    field.hidden = true;
  });
  updateFormSuggestions();
  updateGeneralActivityOptions();
  updateFormSections();
  updateInventoryDuplicateWarning();
  formInitialSnapshot = formSnapshot();
  els.modal.showModal();
  setTimeout(() => els.fDesc.focus(), 50);
}

function quickFormSnapshot() {
  return JSON.stringify([...els.quickForm.querySelectorAll('input,select,textarea')]
    .map((field) => [field.id, field.value]));
}

function updateQuickActivityCustomField() {
  const isCustom = els.qGeneralActivity?.value === '__custom__';
  if (els.qGeneralActivityCustomField) els.qGeneralActivityCustomField.hidden = !isCustom;
  if (els.qGeneralActivityCustom) els.qGeneralActivityCustom.required = isCustom;
}

function validateQuickActivity(showErrors = false) {
  const selectedActivity = safeStr(els.qGeneralActivity?.value);
  const requiredValues = [
    ['q-date', safeStr(els.qDate?.value), 'Selecciona la fecha.'],
    ['q-status', safeStr(els.qStatus?.value), 'Selecciona el estado.'],
    ['q-general-activity', selectedActivity, 'Selecciona el tipo de actividad general.'],
    ['q-desc', safeStr(els.qDesc?.value), 'Escribe la descripción de la actividad.'],
    ...(selectedActivity === '__custom__'
      ? [['q-general-activity-custom', safeStr(els.qGeneralActivityCustom?.value), 'Escribe el tipo de actividad general.']]
      : []),
  ];
  const errors = new Map(requiredValues.filter(([, value]) => !value).map(([fieldId, , message]) => [fieldId, message]));
  [...els.quickForm.querySelectorAll('[id^="q-"]')].forEach((field) => {
    const reveal = showErrors || field.dataset.touched === 'true';
    setFieldError(field.id, errors.get(field.id) || '', reveal);
  });
  return errors.size === 0;
}

function syncQuickActivityFormState() {
  if (!els.quickForm || !els.btnQuickSave) return;
  const valid = validateQuickActivity();
  els.btnQuickSave.disabled = !valid;
  if (els.quickSaveHint) {
    els.quickSaveHint.textContent = valid
      ? 'Listo para guardar.'
      : 'Completa los campos obligatorios para guardar.';
  }
}

function openQuickActivityModal() {
  els.quickForm.reset();
  els.qDate.value = todayISO();
  els.qStatus.value = 'pendiente';
  els.qGeneralActivityCustom.value = populateGeneralActivitySelect(els.qGeneralActivity);
  updateQuickActivityCustomField();
  els.quickForm.querySelectorAll('[data-touched]').forEach((field) => delete field.dataset.touched);
  els.quickForm.querySelectorAll('.field-error').forEach((field) => {
    field.textContent = '';
    field.hidden = true;
  });
  syncQuickActivityFormState();
  quickInitialSnapshot = quickFormSnapshot();
  els.quickModal.showModal();
  setTimeout(() => els.qDesc.focus(), 50);
}

function closeQuickActivityModal() {
  if (!els.quickModal?.open) return;
  if (quickFormSnapshot() !== quickInitialSnapshot
    && !confirm('Hay cambios sin guardar. ¿Quieres cerrar y descartarlos?')) return;
  els.quickModal.close();
}

function saveQuickActivity() {
  if (!validateQuickActivity(true)) {
    els.quickForm.querySelector('[aria-invalid="true"]')?.focus();
    return false;
  }
  const user = getCurrentUser();
  const profile = loadProfile(user);
  const now = new Date().toISOString();
  const selectedActivity = safeStr(els.qGeneralActivity.value);
  const generalActivity = selectedActivity === '__custom__'
    ? safeStr(els.qGeneralActivityCustom.value)
    : selectedActivity;
  const status = safeStr(els.qStatus.value);
  const record = {
    id: uid(),
    created_at: now,
    updated_at: now,
    created_by: safeStr(profile.full_name) || safeStr(user?.name) || '—',
    updated_by: user?.name || null,
    date: safeStr(els.qDate.value),
    status,
    desc: safeStr(els.qDesc.value),
    action_detail: '',
    tipoRegistro: 'general',
    tipoActividadGeneral: generalActivity,
    equipo: { clavePatrimonio: '', tipo: '', marca: '', modelo: '', numeroSerie: '', descripcion: '' },
    mantenimiento: { tareas: [], otrasTareas: '', proximoMantenimiento: '', falla: '', diagnostico: '', solucion: '', refacciones: '', observaciones: '' },
    ubicacion: { lugar: '', area: '', responsableArea: '', cargo: '', contacto: '' },
    tecnicos: '',
    recogidoPor: '',
    fechaRecoleccion: '',
    fechaEntrega: '',
    recibidoPor: '',
    retiradoEquipo: false,
    general_activity: generalActivity,
    equipment_type: 'Normal',
    equipment_description: '',
    brand: '',
    model: '',
    inventory_number: '',
    maintenance_type: '',
    maintenance_detail: '',
    serial_number: '',
    location: '',
    area: '',
    assigned_to: '',
    completed_at: isCompletedStatus(status) ? now : null,
  };
  saveRecords([...loadRecords(), record]);
  uiState.page = 1;
  els.quickModal.close();
  render();
  toastSaved('Actividad guardada.');
  return true;
}

function openBulkModal() {
  const now = new Date();
  if (els.bulkMonth) els.bulkMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (els.bulkStatus) els.bulkStatus.value = 'pendiente';
  if (els.bulkText) els.bulkText.value = '';
  els.bulkModal?.showModal();
  setTimeout(() => els.bulkText?.focus(), 50);
}

function addBulkRecords() {
  const user = getCurrentUser();
  const profile = loadProfile(user);
  const month = safeStr(els.bulkMonth?.value);
  const range = setMonthToRange(month);
  const lines = safeStr(els.bulkText?.value)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
  if (!range || !lines.length) return false;

  const status = safeStr(els.bulkStatus?.value) === 'completado' ? 'completado' : 'pendiente';
  const now = new Date().toISOString();
  const records = loadRecords();
  lines.forEach((rawDesc, index) => {
    const isDone = /\blisto\b/i.test(rawDesc);
    const desc = rawDesc.replace(/\blisto\b/gi, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim() || rawDesc;
    const lineStatus = isDone ? 'completado' : status;
    records.push({
      id: `${uid()}_${index}`,
      created_at: now,
      updated_at: now,
      updated_by: user?.name || null,
      created_by: safeStr(profile.full_name) || safeStr(user?.name) || '—',
      date: range.start,
      status: lineStatus,
      desc,
      action_detail: '',
      equipment_type: '',
      equipment_description: '',
      inventory_number: '',
      brand: '',
      model: '',
      maintenance_type: '',
      maintenance_detail: '',
      serial_number: '',
      location: '',
      area: safeStr(profile.area),
      assigned_to: '',
      completed_at: lineStatus === 'completado' ? now : null,
    });
  });
  saveRecords(records);
  uiState.page = 1;
  render();
  toastSaved(`${lines.length} actividades agregadas.`);
  return true;
}

function openModalForEdit(id) {
  const records = loadRecords();
  const rec = records.find((r) => r.id === id);
  if (!rec) return;
  els.form.reset();
  els.modalTitle.textContent = 'Editar actividad';
  els.fId.value = rec.id;
  els.fDate.value = rec.date || todayISO();
  const savedStatus = safeStr(rec.status).toLowerCase();
  els.fStatus.value = savedStatus === 'completado' ? 'completada'
    : ['pendiente', 'en_proceso', 'completada', 'cancelada'].includes(savedStatus) ? savedStatus : 'pendiente';
  els.fDesc.value = rec.desc || '';
  els.fActionDetail.value = rec.detalle || rec.action_detail || '';
  els.fEquipmentType.value = recordCategory(rec);
  els.fGeneralActivityCustom.value = '';
  const generalActivity = safeStr(rec.tipoActividadGeneral || rec.general_activity);
  updateGeneralActivityOptions(generalActivity);

  const equipment = rec.equipo || {};
  const savedEquipmentType = safeStr(equipment.tipo || rec.device_type || rec.equipment_type);
  els.fDeviceType.value = ['Computadora', 'Laptop', 'Impresora', 'Monitor', 'No-break', 'Red', 'Otro'].includes(savedEquipmentType)
    ? savedEquipmentType
    : '';
  els.fEquipmentDescription.value = safeStr(equipment.descripcion || rec.equipment_description);
  els.fBrand.value = safeStr(equipment.marca || rec.brand);
  els.fModel.value = safeStr(equipment.modelo || rec.model);
  els.fInventoryNumber.value = safeStr(equipment.clavePatrimonio || rec.inventory_number);
  els.fSerialNumber.value = safeStr(equipment.numeroSerie || rec.serial_number);

  const maintenance = rec.mantenimiento || {};
  const savedTasks = Array.isArray(maintenance.tareas) ? maintenance.tareas : [];
  const legacyMaintenanceDetail = safeStr(rec.maintenance_detail);
  document.querySelectorAll('input[name="preventive-task"]').forEach((checkbox) => {
    checkbox.checked = savedTasks.includes(checkbox.value);
  });
  if (!savedTasks.length && legacyMaintenanceDetail && PREVENTIVE_TASKS.includes(legacyMaintenanceDetail)) {
    const task = [...document.querySelectorAll('input[name="preventive-task"]')]
      .find((checkbox) => checkbox.value === legacyMaintenanceDetail);
    if (task) task.checked = true;
  }
  const otherTask = safeStr(maintenance.otrasTareas)
    || (!savedTasks.length && legacyMaintenanceDetail && !PREVENTIVE_TASKS.includes(legacyMaintenanceDetail) ? legacyMaintenanceDetail : '');
  els.fPreventiveOther.checked = Boolean(otherTask);
  els.fPreventiveOtherDetail.value = otherTask;
  els.fNextMaintenance.value = safeStr(maintenance.proximoMantenimiento || rec.proximo_mantenimiento);
  autoSuggestedNextMaintenance = '';
  els.fReportedFailure.value = safeStr(maintenance.falla || rec.falla_reportada);
  els.fDiagnosis.value = safeStr(maintenance.diagnostico || rec.diagnostico);
  els.fSolution.value = safeStr(maintenance.solucion || rec.solucion_aplicada);
  els.fParts.value = safeStr(maintenance.refacciones || rec.refacciones);
  els.fObservations.value = safeStr(maintenance.observaciones || rec.observaciones);
  if (recordCategory(rec) === 'preventivo' && !els.fNextMaintenance.value) {
    autoSuggestedNextMaintenance = addMonthsToDate(els.fDate.value, 6);
    els.fNextMaintenance.value = autoSuggestedNextMaintenance;
  }

  const location = rec.ubicacion || {};
  els.fLocation.value = safeStr(location.lugar || rec.location);
  els.fArea.value = safeStr(location.area || rec.area);
  els.fAreaResponsible.value = safeStr(location.responsableArea || rec.responsable_area);
  els.fAreaRole.value = safeStr(location.cargo || rec.responsable_cargo);
  els.fAreaContact.value = safeStr(location.contacto || rec.responsable_contacto);
  els.fAssigned.value = safeStr(rec.tecnicos || rec.assigned_to);
  els.fRetireEquipment.value = recCategoryIsCollection(rec) || rec.retiradoEquipo ? 'si' : 'no';
  els.fCollectedBy.value = safeStr(rec.recogidoPor);
  els.fCollectedDate.value = safeStr(rec.fechaRecoleccion);
  els.fDeliveryDate.value = safeStr(rec.fechaEntrega);
  els.fReceivedBy.value = safeStr(rec.recibidoPor);
  els.btnDelete.hidden = false;
  els.form.querySelectorAll('[data-touched]').forEach((field) => delete field.dataset.touched);
  els.form.querySelectorAll('.field-error').forEach((field) => {
    field.textContent = '';
    field.hidden = true;
  });
  updateFormSuggestions();
  updateFormSections();
  updateInventoryDuplicateWarning();
  formInitialSnapshot = formSnapshot();
  els.modal.showModal();
  setTimeout(() => els.fDesc.focus(), 50);
}

function recCategoryIsCollection(record) {
  return recordCategory(record) === 'recoleccion';
}

function upsertFromForm() {
  if (!validateActivityForm(true)) {
    els.form.querySelector('[aria-invalid="true"]:not(:disabled)')?.focus();
    return false;
  }
  const user = getCurrentUser();
  const profile = loadProfile(user);
  const id = safeStr(els.fId.value) || uid();
  const date = safeStr(els.fDate.value) || todayISO();
  const status = safeStr(els.fStatus.value).toLowerCase();
  const desc = safeStr(els.fDesc.value);
  const detail = safeStr(els.fActionDetail.value);
  const tipoRegistro = formCategory();
  const isGeneral = tipoRegistro === 'general';
  const isEquipment = !isGeneral;
  const isPreventive = tipoRegistro === 'preventivo';
  const isCorrective = tipoRegistro === 'correctivo';
  const isCollection = tipoRegistro === 'recoleccion';
  const deviceType = isEquipment ? safeStr(els.fDeviceType.value) : '';
  const equipmentDescription = isEquipment ? safeStr(els.fEquipmentDescription.value) : '';
  const brand = isEquipment ? safeStr(els.fBrand.value) : '';
  const model = isEquipment ? safeStr(els.fModel.value) : '';
  const inventoryNumber = isEquipment ? safeStr(els.fInventoryNumber.value) : '';
  const serialNumber = isEquipment ? safeStr(els.fSerialNumber.value) : '';
  const maintenanceTasks = isPreventive
    ? [...document.querySelectorAll('input[name="preventive-task"]:checked')].map((checkbox) => checkbox.value)
    : [];
  const otherTasks = isPreventive && els.fPreventiveOther.checked ? safeStr(els.fPreventiveOtherDetail.value) : '';
  const maintenanceType = isPreventive ? 'Preventivo' : isCorrective ? 'Correctivo' : '';
  const failure = isCorrective ? safeStr(els.fReportedFailure.value) : '';
  const diagnosis = isCorrective ? safeStr(els.fDiagnosis.value) : '';
  const solution = isCorrective ? safeStr(els.fSolution.value) : '';
  const parts = isCorrective ? safeStr(els.fParts.value) : '';
  const observations = isMaintenanceRecord() ? safeStr(els.fObservations.value) : '';
  const maintenanceDetail = isPreventive
    ? maintenanceTasks.map((task) => task === 'Otros' ? otherTasks : task).filter(Boolean).join(', ')
    : failure;
  const selectedGeneralActivity = safeStr(els.fGeneralActivity?.value);
  const generalActivity = !isGeneral
    ? ''
    : selectedGeneralActivity === '__custom__'
      ? safeStr(els.fGeneralActivityCustom?.value)
      : selectedGeneralActivity;
  const location = safeStr(els.fLocation.value);
  const area = safeStr(els.fArea.value);
  const areaResponsible = safeStr(els.fAreaResponsible.value);
  const areaRole = safeStr(els.fAreaRole.value);
  const areaContact = safeStr(els.fAreaContact.value);
  const technicians = safeStr(els.fAssigned.value);
  const retired = isCollection || (isCorrective && (
    safeStr(els.fRetireEquipment.value) === 'si' || Boolean(safeStr(els.fCollectedBy.value))
  ));
  const collectedBy = retired ? safeStr(els.fCollectedBy.value) : '';
  const collectedDate = retired ? safeStr(els.fCollectedDate.value) : '';
  const deliveryDate = retired ? safeStr(els.fDeliveryDate.value) : '';
  const receivedBy = retired ? safeStr(els.fReceivedBy.value) : '';
  const equipment_type = isGeneral ? 'Normal' : isCollection ? 'Recolección' : deviceType;
  const equipment_description = equipmentDescription;
  const inventory_number = inventoryNumber;
  const serial_number = serialNumber;
  const maintenance_type = maintenanceType;
  const maintenance_detail = maintenanceDetail;
  const general_activity = generalActivity;
  const action_detail = detail;
  const assigned_to = technicians;

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
    tipoRegistro,
    tipoActividadGeneral: generalActivity,
    equipo: {
      clavePatrimonio: inventoryNumber,
      tipo: deviceType,
      marca: brand,
      modelo: model,
      numeroSerie: serialNumber,
      descripcion: equipmentDescription,
    },
    mantenimiento: {
      tareas: maintenanceTasks,
      otrasTareas: otherTasks,
      proximoMantenimiento: isPreventive ? safeStr(els.fNextMaintenance.value) : '',
      falla: failure,
      diagnostico: diagnosis,
      solucion: solution,
      refacciones: parts,
      observaciones: observations,
    },
    ubicacion: {
      lugar: location,
      area,
      responsableArea: areaResponsible,
      cargo: areaRole,
      contacto: areaContact,
    },
    tecnicos: technicians,
    recogidoPor: collectedBy,
    fechaRecoleccion: collectedDate,
    fechaEntrega: deliveryDate,
    recibidoPor: receivedBy,
    retiradoEquipo: retired,
    general_activity,
    equipment_type,
    equipment_description,
    brand,
    model,
    inventory_number,
    maintenance_type,
    maintenance_detail,
    serial_number,
    location,
    area,
    assigned_to,
    created_by: base.created_by || displayName,
    updated_by: user?.name || base.updated_by || null,
    completed_at: isCompletedStatus(status) ? (base.completed_at || now) : null,
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
    status: 'completada',
    completed_at: records[idx].completed_at || now,
    updated_by: user?.name || records[idx].updated_by || null,
    updated_at: now,
  };
  saveRecords(records);
}

function exportExcel({ orientation = 'portrait' } = {}) {
  const user = getCurrentUser();
  const profile = loadProfile(user);
  const list = filteredRecords(loadRecords());
  const { start, end, status } = getFilters();
  const stats = summarizeRecords(list);
  const maintenanceCounts = {
    preventive: list.filter((record) => safeStr(record.maintenance_type).toLowerCase() === 'preventivo').length,
    corrective: list.filter((record) => safeStr(record.maintenance_type).toLowerCase() === 'correctivo').length,
  };
  const orientLabel = orientation === 'landscape' ? 'horizontal' : 'vertical';
  const file = `bitacora_${status || 'todas'}_${start || 'inicio'}_${end || 'fin'}_excel_${orientLabel}.xlsx`;
  const activityRows = [
    ['Fecha', 'Actividad', 'Detalle de actividad', 'Formato', 'Descripción del equipo', 'Clave de patrimonio', 'Marca', 'Modelo', 'Número de serie', 'Actividad general', 'Clasificación de mantenimiento', 'Tipo de mantenimiento', 'Ubicación', 'Comisión Académica', 'Responsable(s)', 'Registró', 'Estado'],
    ...list.map((record) => [
      formatDateHuman(record.date),
      safeStr(record.desc),
      safeStr(record.action_detail),
      safeStr(record.equipment_type) || (record.maintenance_type ? 'Mantenimiento' : 'Actividad general'),
      safeStr(record.equipment_description),
      safeStr(record.inventory_number),
      safeStr(record.brand),
      safeStr(record.model),
      safeStr(record.serial_number),
      safeStr(record.general_activity),
      safeStr(record.maintenance_type),
      safeStr(record.maintenance_detail),
      safeStr(record.location),
      safeStr(record.area),
      safeStr(record.assigned_to),
      safeStr(record.created_by),
      statusLabel(record.status),
    ]),
  ];
  const summaryRows = [
    ['Resumen del reporte', 'Valor'],
    ['Generado', nowHuman()],
    ['Usuario de sesión', user?.name || '—'],
    ['Nombre', profile.full_name || '—'],
    ['Correo', profile.email || '—'],
    ['Matrícula', profile.matricula || '—'],
    ['Comisión Académica', profile.area || '—'],
    ['Orientación solicitada', orientLabel === 'horizontal' ? 'Horizontal' : 'Vertical'],
    ['Estado', status || 'Todos'],
    ['Desde', start || 'Sin límite'],
    ['Hasta', end || 'Sin límite'],
    ['Registros incluidos', stats.all],
    ['Pendientes', stats.pend],
    ['Realizadas', stats.done],
    ['Mantenimientos preventivos', maintenanceCounts.preventive],
    ['Mantenimientos correctivos', maintenanceCounts.corrective],
  ];

  try {
    downloadXlsx(file, [
      { name: 'Actividades', rows: activityRows, widths: [14, 36, 40, 22, 38, 22, 20, 24, 24, 30, 26, 34, 24, 38, 28, 28, 16], orientation },
      { name: 'Resumen', rows: summaryRows, widths: [30, 48] },
    ]);
    toast('Reporte de actividades descargado en Excel (.xlsx).');
  } catch (error) {
    console.error('No se pudo exportar el reporte de actividades:', error);
    toast('No se pudo generar el Excel de actividades. Intenta de nuevo.');
  }
}

function exportEventsExcel() {
  const events = loadEvents().sort((a, b) => safeStr(a.date).localeCompare(safeStr(b.date)));
  const rows = [
    ['Fecha', 'Evento', 'Notas', 'Registrado'],
    ...events.map((event) => [
      formatDateHuman(event.date),
      safeStr(event.title) || '—',
      safeStr(event.notes) || '—',
      event.created_at ? formatDateHuman(event.created_at) : '—',
    ]),
  ];
  try {
    downloadXlsx(`bitacora_eventos_${todayISO()}.xlsx`, [
      { name: 'Eventos', rows, widths: [16, 36, 60, 16] },
    ]);
    toast('Reporte de eventos descargado en Excel (.xlsx).');
  } catch (error) {
    console.error('No se pudo exportar el reporte de eventos:', error);
    toast('No se pudo generar el Excel de eventos. Intenta de nuevo.');
  }
}

function printEvents() {
  const events = loadEvents().sort((a, b) => safeStr(a.date).localeCompare(safeStr(b.date)));
  const popup = window.open('', '_blank');
  if (!popup) {
    alert('Permite las ventanas emergentes para imprimir los eventos.');
    return;
  }
  popup.opener = null;
  const rows = events.map((event) => `
    <tr>
      <td>${escapeHtml(formatDateHuman(event.date))}</td>
      <td>${escapeHtml(event.title || '—')}</td>
      <td>${escapeHtml(event.notes || '—')}</td>
    </tr>
  `).join('');
  try {
    popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reporte de eventos · Bitácora Digital</title>
    <style>
      @page{size:A4 portrait;margin:14mm}
      *{box-sizing:border-box}
      body{font-family:Segoe UI,Arial,sans-serif;color:#19354a;margin:24px;background:#fff}
      .report-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:18px 20px;border:1px solid #cfe0ee;border-left:6px solid #287ba7;border-radius:12px;background:#f1f8fd}
      h1{margin:0;color:#163d59;font-size:22px;letter-spacing:-.02em}
      .subtitle{margin:5px 0 0;color:#526c80;font-size:12px;line-height:1.5}
      .report-count{flex:0 0 auto;padding:7px 10px;border:1px solid #c7dce9;border-radius:999px;background:#fff;color:#245a7c;font-size:11px;font-weight:800}
      table{width:100%;border-collapse:collapse;margin-top:16px;table-layout:fixed}
      th,td{padding:9px 10px;border:1px solid #d2e1eb;text-align:left;vertical-align:top;overflow-wrap:anywhere}
      th{background:#dceefa;color:#284d67;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
      td{font-size:11px;line-height:1.45}
      td:first-child{width:110px;white-space:nowrap}
      tbody tr:nth-child(even){background:#f6fbff}
      thead{display:table-header-group}
      tr{break-inside:avoid;page-break-inside:avoid}
      .report-foot{margin-top:12px;color:#60788a;font-size:10px;text-align:right}
      @media print{body{margin:0}.report-head{break-inside:avoid;page-break-inside:avoid}}
    </style>
    </head><body><header class="report-head"><div><h1>Bitácora Digital · Eventos</h1><p class="subtitle">UMSNH · Comisión Académica de Servicios Informáticos<br>Reporte generado: ${escapeHtml(nowHuman())}</p></div><div class="report-count">${events.length} ${events.length === 1 ? 'evento' : 'eventos'}</div></header>
      <table><colgroup><col style="width:110px"><col style="width:30%"><col></colgroup><thead><tr><th>Fecha</th><th>Evento</th><th>Notas</th></tr></thead><tbody>${rows || '<tr><td colspan="3">Sin eventos registrados.</td></tr>'}</tbody></table>
      <footer class="report-foot">Bitácora Digital · UMSNH</footer></body></html>`);
    popup.document.close();
    window.setTimeout(() => {
      if (popup.closed) return;
      try {
        popup.focus();
        popup.print();
      } catch (error) {
        console.error('No se pudo imprimir el reporte de eventos:', error);
        popup.close();
        toast('No se pudo abrir la impresión de eventos.');
      }
    }, 250);
  } catch (error) {
    console.error('No se pudo preparar el reporte de eventos:', error);
    popup.close();
    toast('No se pudo preparar la impresión de eventos.');
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
  const previousPageSize = uiState.pageSize;
  const previousPage = uiState.page;
  const filtered = filteredRecords(loadRecords());
  uiState.pageSize = Math.max(1, filtered.length);
  uiState.page = 1;
  render();

  const folio = makeFolio();
  preparePrintHeader(folio);
  preparePrintFooter(folio);
  const cleanupOrientation = applyPrintOrientation(orientation);
  const hasEquipment = filteredRecords(loadRecords()).some((record) =>
    [
      record.equipment_type,
      record.equipment_description,
      record.inventory_number,
      record.brand,
      record.model,
      record.serial_number,
    ].map(safeStr).some(Boolean),
  );
  document.body.classList.toggle('print-without-equipment', !hasEquipment);
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    cleanupOrientation();
    uiState.pageSize = previousPageSize;
    uiState.page = previousPage;
    if (els.printHeader) els.printHeader.hidden = true;
    if (els.printFooter) els.printFooter.hidden = true;
    render();
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  try {
    window.print();
  } catch (error) {
    console.error('No se pudo imprimir el reporte de actividades:', error);
    cleanup();
    toast('No se pudo abrir la impresión de actividades.');
    return;
  }
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
  toastSaved('Perfil guardado.');
}

function preparePrintHeader(folio) {
  if (!els.printHeader) return;
  const user = getCurrentUser();
  const p = loadProfile(user);
  const { start, end, status } = getFilters();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const count = filteredRecords(loadRecords()).length;
  const stats = summarizeRecords(filteredRecords(loadRecords()));
  const filtered = filteredRecords(loadRecords());
  const maintenanceCounts = {
    preventive: filtered.filter((record) => safeStr(record.maintenance_type).toLowerCase() === 'preventivo').length,
    corrective: filtered.filter((record) => safeStr(record.maintenance_type).toLowerCase() === 'correctivo').length,
  };

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
        <span class="tag">Preventivos: ${maintenanceCounts.preventive}</span>
        <span class="tag">Correctivos: ${maintenanceCounts.corrective}</span>
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
            <div class="event-date">${escapeHtml(d)}</div>
            <div class="event-meta">${e.date === todayISO() ? 'Hoy' : 'Próximo'}</div>
          </div>
          <div>
            <div class="event-title">${title}</div>
            ${notes ? `<div class="event-meta">${escapeHtml(notes)}</div>` : ''}
          </div>
          <div class="event-actions">
            <button class="btn btn-ghost" type="button" data-ev-action="edit" data-ev-id="${escapeHtml(e.id)}">Editar</button>
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
  els.userchip?.setAttribute('aria-expanded', 'false');
}

function toggleUserMenu() {
  if (!els.usermenuMenu) return;
  closeFabMenu();
  els.usermenuMenu.hidden = !els.usermenuMenu.hidden;
  els.userchip?.setAttribute('aria-expanded', String(!els.usermenuMenu.hidden));
}

function closeFabMenu() {
  if (!els.fabMenu || !els.fabToggle) return;
  els.fabMenu.hidden = true;
  els.fabToggle.setAttribute('aria-expanded', 'false');
}

function toggleFabMenu() {
  if (!els.fabMenu || !els.fabToggle) return;
  closeUserMenu();
  const nextHidden = !els.fabMenu.hidden ? true : false;
  els.fabMenu.hidden = nextHidden;
  els.fabToggle.setAttribute('aria-expanded', nextHidden ? 'false' : 'true');
}

function userInitials(name) {
  const parts = safeStr(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  return `${first[0]}${last ? last[0] : first[1] || ''}`.toLocaleUpperCase();
}

function renderUserMenuInfo() {
  const user = getCurrentUser();
  const p = loadProfile(user);
  const displayName = safeStr(p.full_name) || safeStr(user?.name) || '—';
  if (els.usermenuTitle) els.usermenuTitle.textContent = displayName;
  if (els.username) els.username.textContent = safeStr(user?.name) || 'Usuario';
  if (els.userInitials) els.userInitials.textContent = userInitials(displayName);
  if (els.userchip) {
    els.userchip.title = displayName;
    els.userchip.setAttribute('aria-label', `Abrir menú de usuario de ${displayName}`);
  }
  const details = [
    [els.usermenuEmail, p.email ? `Correo: ${p.email}` : ''],
    [els.usermenuMatricula, p.matricula ? `Matrícula: ${p.matricula}` : ''],
    [els.usermenuRole, p.role ? `Rol: ${p.role}` : ''],
  ];
  details.forEach(([element, value]) => {
    if (!element) return;
    element.textContent = value;
    element.hidden = !value;
  });
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
  if (els.app?.hidden || e.defaultPrevented) return;
  const target = e.target;
  const typing = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    els.filterQ?.focus();
  } else if (e.altKey && e.key.toLowerCase() === 'n' && !typing && !els.modal?.open && !els.eventModal?.open && !els.profileModal?.open) {
    e.preventDefault();
    openModalForNew();
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
els.fabClose?.addEventListener('click', () => {
  closeFabMenu();
  els.fabToggle?.focus();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (els.fabMenu && !els.fabMenu.hidden) {
    closeFabMenu();
    els.fabToggle?.focus();
  }
  if (els.usermenuMenu && !els.usermenuMenu.hidden) {
    closeUserMenu();
    els.userchip?.focus();
  }
});

document.addEventListener('click', (e) => {
  if (!els.fabMenu || els.fabMenu.hidden) return;
  const inside = e.target?.closest?.('#fab-menu') || e.target?.closest?.('#fab-toggle');
  if (!inside) closeFabMenu();
});

els.btnNew.addEventListener('click', () => {
  closeReportsMenu();
  closeFabMenu();
  setActiveNav('btn-home');
  openQuickActivityModal();
});
els.btnFullRecord?.addEventListener('click', () => {
  closeReportsMenu();
  closeFabMenu();
  setActiveNav('btn-home');
  openModalForNew();
});
els.qGeneralActivity?.addEventListener('change', () => {
  updateQuickActivityCustomField();
  syncQuickActivityFormState();
});
els.quickForm?.addEventListener('input', (event) => {
  if (event.target instanceof HTMLElement) event.target.dataset.touched = 'true';
  syncQuickActivityFormState();
});
els.quickForm?.addEventListener('change', (event) => {
  if (event.target instanceof HTMLElement) event.target.dataset.touched = 'true';
  syncQuickActivityFormState();
});
els.quickForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  saveQuickActivity();
});
els.btnQuickCancel?.addEventListener('click', closeQuickActivityModal);
els.btnQuickClose?.addEventListener('click', closeQuickActivityModal);
els.quickModal?.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeQuickActivityModal();
});
els.quickModal?.addEventListener('click', (event) => {
  if (event.target === els.quickModal) closeQuickActivityModal();
});
els.btnBulk?.addEventListener('click', () => {
  closeFabMenu();
  openBulkModal();
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
els.btnExportEvents?.addEventListener('click', () => {
  closeFabMenu();
  exportEventsExcel();
});
els.btnPrintLandscape?.addEventListener('click', () => {
  closeReportsMenu();
  closeFabMenu();
  printCurrent({ orientation: 'landscape' });
});
els.btnPrintEvents?.addEventListener('click', () => {
  closeFabMenu();
  printEvents();
});
els.btnBackup?.addEventListener('click', () => {
  closeFabMenu();
  downloadBackup();
});
els.btnRestore?.addEventListener('click', () => {
  closeFabMenu();
  els.backupFile?.click();
});
els.backupFile?.addEventListener('change', () => restoreBackup(els.backupFile.files?.[0]));
els.btnProfile?.addEventListener('click', () => {
  closeReportsMenu();
  closeUserMenu();
  setActiveNav('btn-profile');
  openProfile();
});
els.btnMenuSettings?.addEventListener('click', () => {
  closeUserMenu();
  setActiveNav('btn-profile');
  openProfile();
});
els.btnAdminUsers?.addEventListener('click', () => {
  els.usermenuMenu.hidden = true;
  els.userchip?.setAttribute('aria-expanded', 'false');
  openUserAdministration();
});
els.btnUsersClose?.addEventListener('click', () => els.usersModal?.close());
els.userCreateForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  createManagedUser(els.userCreateForm);
});
els.usersList?.addEventListener('submit', (event) => {
  const form = event.target?.closest?.('[data-user-password-form]');
  if (!form) return;
  event.preventDefault();
  changeManagedPassword(form);
});
els.btnEvents?.addEventListener('click', () => {
  closeReportsMenu();
  setActiveNav('btn-events');
  // Solo baja a la sección de eventos (sin popup)
  document.querySelector('.panel-events')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
});
els.btnLogout?.addEventListener('click', async () => {
  closeUserMenu();
  clearCurrentUser();
  if (API_URL) {
    try {
      await apiRequest('logout', { method: 'POST' });
    } catch (error) {
      console.error('No se pudo cerrar la sesión remota:', error);
      alert('No se pudo cerrar la sesión en el servidor. Cierra el navegador y revisa la conexión si el problema continúa.');
    }
  }
  serverSessionActive = false;
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
  if (els.filterRecordType) els.filterRecordType.value = '';
  if (els.filterMaintenance) els.filterMaintenance.value = '';
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
  const currentMonth = `${y}-${m}`;
  const records = loadRecords();
  const hasCurrentRecords = records.some((record) => safeStr(record.date).slice(0, 7) === currentMonth);
  const latestMonth = records
    .map((record) => safeStr(record.date).slice(0, 7))
    .filter(Boolean)
    .sort()
    .at(-1);
  const month = hasCurrentRecords ? currentMonth : (latestMonth || currentMonth);
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
  els.filterMonth.value = '';
  uiState.page = 1;
  render();
});
els.filterEnd.addEventListener('change', () => {
  els.filterMonth.value = '';
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
els.filterRecordType?.addEventListener('change', () => {
  uiState.page = 1;
  render();
});
els.filterMaintenance?.addEventListener('change', () => {
  uiState.page = 1;
  render();
});

els.fEquipmentType.addEventListener('change', () => {
  if (formCategory() !== 'recoleccion') els.fRetireEquipment.value = 'no';
  updateGeneralActivityCustomField();
  updateFormSections();
  validateActivityForm(true);
});
els.fGeneralActivity?.addEventListener('change', () => {
  updateGeneralActivityCustomField();
  validateActivityForm(true);
  syncActivityFormState();
});
els.fPreventiveOther?.addEventListener('change', () => {
  updateFormSections();
  validateActivityForm(true);
});
els.fRetireEquipment?.addEventListener('change', () => {
  updateFormSections();
  validateActivityForm(true);
});
els.fCollectedBy?.addEventListener('input', () => {
  updateFormSections();
  validateActivityForm(true);
});
els.fDate?.addEventListener('change', () => {
  if (formCategory() === 'preventivo'
    && (!els.fNextMaintenance.value || els.fNextMaintenance.value === autoSuggestedNextMaintenance)) {
    autoSuggestedNextMaintenance = addMonthsToDate(els.fDate.value, 6);
    els.fNextMaintenance.value = autoSuggestedNextMaintenance;
  }
  syncActivityFormState();
});
els.fNextMaintenance?.addEventListener('input', () => {
  autoSuggestedNextMaintenance = '';
});
els.fInventoryNumber?.addEventListener('input', updateInventoryDuplicateWarning);
els.form.addEventListener('input', (event) => {
  if (event.target instanceof HTMLElement) event.target.dataset.touched = 'true';
  syncActivityFormState();
});
els.form.addEventListener('change', (event) => {
  if (event.target instanceof HTMLElement) event.target.dataset.touched = 'true';
  syncActivityFormState();
});
els.form.addEventListener('focusout', (event) => {
  if (event.target instanceof HTMLElement) event.target.dataset.touched = 'true';
  syncActivityFormState();
});

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!upsertFromForm()) return;
  els.modal.close();
  render();
  toastSaved('Actividad guardada.');
});

els.btnCancel.addEventListener('click', closeActivityModal);
els.btnModalClose?.addEventListener('click', closeActivityModal);
els.modal.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeActivityModal();
});
els.modal.addEventListener('click', (event) => {
  if (event.target === els.modal) closeActivityModal();
});
els.btnDelete.addEventListener('click', () => {
  if (!confirm('¿Eliminar este registro?')) return;
  deleteFromForm();
  els.modal.close();
  render();
  toastSaved('Actividad eliminada.');
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
    toastSaved('Actividad marcada como realizada.');
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
els.pageSize?.addEventListener('change', () => {
  uiState.pageSize = Number(els.pageSize.value) || 10;
  uiState.page = 1;
  render();
});

document.addEventListener('click', (e) => {
  const btn = e.target?.closest?.('button[data-ev-action][data-ev-id]');
  if (!btn) return;
  const action = btn.dataset.evAction;
  const id = btn.dataset.evId;
  if (action === 'edit') openEventForEdit(id);
});

els.btnProfileCancel?.addEventListener('click', () => els.profileModal?.close());
els.profileForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  saveProfileFromForm();
  renderUserMenuInfo();
  els.profileModal?.close();
});

els.btnEventNew?.addEventListener('click', openEventForNew);
els.eventForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!upsertEventFromForm()) return;
  els.eventModal?.close();
  renderEvents();
  toastSaved('Evento guardado.');
});
els.btnEventCancel?.addEventListener('click', () => els.eventModal?.close());
els.btnEventDelete?.addEventListener('click', () => {
  if (!confirm('¿Eliminar este evento?')) return;
  deleteEventFromForm();
  els.eventModal?.close();
  renderEvents();
  toastSaved('Evento eliminado.');
});

els.bulkForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!addBulkRecords()) return;
  els.bulkModal?.close();
});
els.btnBulkCancel?.addEventListener('click', () => els.bulkModal?.close());

function showAppForUser(user) {
  if (els.login) els.login.hidden = true;
  if (els.app) els.app.hidden = false;
  if (els.usermenu) els.usermenu.hidden = false;
  if (els.username) els.username.textContent = user?.name || 'Usuario';
  if (els.btnLogout) els.btnLogout.hidden = false;
  if (els.btnAdminUsers) els.btnAdminUsers.hidden = !user?.is_admin;

  ensureProfileDefaults(user);
  renderUserMenuInfo();

  // Inicio sin filtros: todo lo cargado queda visible desde el primer acceso.
  if (els.filterMonth) els.filterMonth.value = '';
  if (els.filterStart) els.filterStart.value = '';
  if (els.filterEnd) els.filterEnd.value = '';

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
  seedJulyNotes();
  if (API_URL) {
    const hint = document.querySelector('.login-hint');
    if (hint) hint.hidden = true;
    setSyncStatus('');
  }
  // La sesión es deliberadamente temporal: cada carga vuelve a pedir acceso.
  clearCurrentUser();
  showLogin();
})();

els.loginForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const key = safeStr(els.loginUser?.value).toLowerCase();
  const pass = safeStr(els.loginPass?.value);
  const submitButton = els.loginForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  (async () => {
    try {
      let user;
      if (API_URL) {
        user = await loginToServer(key, pass);
      } else {
        if (pass !== '123456789') throw new Error('Contraseña incorrecta.');
        user = USERS[key];
        if (!user) throw new Error('En el modo local solo están disponibles Iván y Kevin.');
      }
      setCurrentUser(user);
      showAppForUser(user);
    } catch (error) {
      alert(error.message || 'No se pudo iniciar sesión.');
      els.loginPass?.focus();
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  })();
});

els.loginShowPass?.addEventListener('change', () => {
  if (!els.loginPass) return;
  els.loginPass.type = els.loginShowPass.checked ? 'text' : 'password';
});
