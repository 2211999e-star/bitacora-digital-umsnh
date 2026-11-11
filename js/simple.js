const STORAGE_KEY = 'bitacora_simple_v1_records';
const USER_KEY = 'bitacora_simple_v1_user';
const PROFILE_KEY_PREFIX = 'bitacora_simple_v1_profile_';
const EVENTS_KEY = 'bitacora_simple_v1_events';
const SEED_KEY = 'bitacora_simple_v1_whiteboard_seed_v2';

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

function seedJulyNotes() {
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
    inventory_number: '',
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
    inventory_number: '',
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
    profiles: Object.fromEntries(Object.values(USERS).map((user) => [user.id, loadProfile(user)])),
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
    Object.entries(backup.profiles || {}).forEach(([id, profile]) => {
      if (!USERS[id] || !profile || typeof profile !== 'object') return;
      saveProfile(USERS[id], profile);
    });
    uiState.page = 1;
    render();
    toast('Respaldo restaurado correctamente.');
  } catch (error) {
    console.error('No se pudo restaurar el respaldo:', error);
    alert('No se pudo restaurar. Verifica que seleccionaste un respaldo válido de esta aplicación.');
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
    els.rows.innerHTML = `<tr><td colspan="10" class="empty">Sin registros con esos filtros.</td></tr>`;
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
  return detail ? `${type} · ${detail}` : type;
}

function updateEquipmentFields() {
  const isEquipment = ['Computadora', 'Impresora'].includes(safeStr(els.fEquipmentType.value));
  document.querySelectorAll('.equipment-field').forEach((field) => {
    field.hidden = !isEquipment;
  });
}

function updateMaintenanceDetailField() {
  const isOther = safeStr(els.fMaintenanceType.value) === 'Otro arreglo';
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
      inventory_number: '',
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
  toast(`${lines.length} actividades agregadas.`);
  return true;
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
  const maintenance_type = safeStr(els.fMaintenanceType.value);
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
    ['Fecha', 'Actividad', 'Detalle de actividad', 'Equipo', 'Mantenimiento', 'Ubicación', 'Comisión Académica', 'Responsable(s)', 'Registró', 'Estado'],
    ...list.map((record) => [
      formatDateHuman(record.date),
      safeStr(record.desc),
      safeStr(record.action_detail),
      [
        ['Tipo', record.equipment_type],
        ['Patrimonio', record.inventory_number],
        ['Serie', record.serial_number],
      ].filter(([, value]) => safeStr(value)).map(([label, value]) => `${label}: ${safeStr(value)}`).join(' · '),
      maintenanceSummary(record),
      safeStr(record.location),
      safeStr(record.area),
      safeStr(record.assigned_to),
      safeStr(record.created_by),
      record.status === 'completado' ? 'Realizada' : 'Pendiente',
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
      { name: 'Actividades', rows: activityRows, widths: [14, 36, 40, 32, 24, 24, 38, 28, 28, 16], orientation },
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
    [record.equipment_type, record.inventory_number, record.serial_number].map(safeStr).some(Boolean),
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

  ensureProfileDefaults(user);

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
  // La sesión es deliberadamente temporal: cada carga vuelve a pedir acceso.
  clearCurrentUser();
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
