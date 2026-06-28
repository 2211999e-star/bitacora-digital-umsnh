/**
 * config.js
 * Configuración: Supabase, preferencias de tema, utilidades de backup y controles de settings.
 */

import { isValidUrl } from './database.js?v=1.5.5';

export const LOCAL_ADMIN_USERNAME = '221199e';
export const LOCAL_ADMIN_PASSWORD = '123456789';
export const LOCAL_STORAGE_PREFIX = 'bitacora_umich_';

// Administrador principal (único con permisos críticos)
export const PRIMARY_ADMIN_EMAIL = '221199e@umich.mx';

// Modo revisión (para superiores): opera en modo local y con datos de prueba
export const REVIEW_MODE_KEY = `${LOCAL_STORAGE_PREFIX}reviewMode`; // 'true' | 'false'

export function isReviewModeEnabled() {
  return false;
}

export function setReviewModeEnabled(enabled) {
  localStorage.setItem(REVIEW_MODE_KEY, 'false');
}

// Forzar modo offline (útil cuando Supabase está configurado pero aún no tiene tablas/policies)
export const FORCE_OFFLINE_KEY = `${LOCAL_STORAGE_PREFIX}forceOffline`; // 'true' | 'false'

export function isForceOfflineEnabled() {
  return localStorage.getItem(FORCE_OFFLINE_KEY) === 'true';
}

export function setForceOfflineEnabled(enabled) {
  localStorage.setItem(FORCE_OFFLINE_KEY, enabled ? 'true' : 'false');
}

// Preferencia de tema
export const THEME_KEY = `${LOCAL_STORAGE_PREFIX}theme`; // 'system' | 'light' | 'dark'

export function getSupabaseConfig() {
  const url =
    window.SUPABASE_URL ||
    localStorage.getItem(`${LOCAL_STORAGE_PREFIX}supabaseUrl`) ||
    '';

  const anonKey =
    window.SUPABASE_ANON_KEY ||
    localStorage.getItem(`${LOCAL_STORAGE_PREFIX}supabaseAnonKey`) ||
    '';

  return { url, anonKey };
}

export function getThemePreference() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'system' || saved === 'light' || saved === 'dark') return saved;
  // Compatibilidad: versiones anteriores usaban 'darkMode' booleano
  const old = localStorage.getItem('darkMode');
  if (old === 'true') return 'dark';
  if (old === 'false') return 'light';
  return 'system';
}

export function updateThemeButtonsUI(pref = getThemePreference()) {
  const btns = [
    { id: 'btn-theme-system', key: 'system' },
    { id: 'btn-theme-light', key: 'light' },
    { id: 'btn-theme-dark', key: 'dark' },
  ];
  btns.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const active = pref === key;
    el.classList.toggle('ring-2', active);
    el.classList.toggle('ring-black', active);
    el.classList.toggle('dark:ring-white', active);
  });
}

export function applyThemePreference(pref = getThemePreference()) {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldUseDark = pref === 'dark' || (pref === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', Boolean(shouldUseDark));
  // mantener compatibilidad
  localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
  updateThemeButtonsUI(pref);
}

export function setThemePreference(pref, { onThemeChanged } = {}) {
  const next = pref === 'system' || pref === 'light' || pref === 'dark' ? pref : 'system';
  localStorage.setItem(THEME_KEY, next);
  applyThemePreference(next);
  // Recalcular charts para que texto/leyendas se vean bien
  try {
    onThemeChanged?.(next);
  } catch {
    // noop
  }
}

export function toggleCfgAnonKey() {
  const input = document.getElementById('cfg-supabase-key');
  const icon = document.getElementById('cfg-anonkey-icon');
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  if (icon) {
    icon.classList.toggle('fa-eye', !isHidden);
    icon.classList.toggle('fa-eye-slash', isHidden);
  }
}

// =========================
// Settings (DB / localStorage)
// =========================
const SETTINGS_LS_KEY = `${LOCAL_STORAGE_PREFIX}appSettings`;

function readSettingsCache() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_LS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeSettingsCache(next) {
  try {
    localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(next || {}));
  } catch {
    // noop
  }
}

export async function getAppSetting({ supabase } = {}, key, fallbackValue) {
  const cache = readSettingsCache();
  if (cache[key] !== undefined) return cache[key];

  if (supabase && !supabase.__local) {
    try {
      const { data, error } = await supabase.from('settings').select('value').eq('key', key).single();
      if (!error && data?.value !== undefined) {
        const nextCache = { ...cache, [key]: data.value };
        writeSettingsCache(nextCache);
        return data.value;
      }
    } catch {
      // noop
    }
  }

  return fallbackValue;
}

export async function setAppSetting({ supabase } = {}, key, value) {
  const cache = readSettingsCache();
  const nextCache = { ...cache, [key]: value };
  writeSettingsCache(nextCache);

  if (supabase && !supabase.__local) {
    // Guardado real en DB (requiere permisos del admin principal por RLS)
    const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
    if (error) throw error;
  }
}

export function initializeSettingsControls({ supabase, currentUser } = {}) {
  const modeEl = document.getElementById('storage-mode');
  const modeBadgeEl = document.getElementById('storage-mode-badge');
  const summaryStorageEl = document.getElementById('cfg-summary-storage');
  const summaryUserEl = document.getElementById('cfg-summary-user');
  const summaryRoleEl = document.getElementById('cfg-summary-role');
  if (modeEl) {
    modeEl.textContent = supabase?.__local
      ? 'Modo offline (guardado en este navegador).'
      : 'Conectado a Supabase (guardado en la nube).';
  }
  if (modeBadgeEl) {
    const isOffline = Boolean(supabase?.__local);
    modeBadgeEl.textContent = isOffline ? 'Offline' : 'Nube';
    modeBadgeEl.className = `status-chip ${isOffline ? 'status-warning' : 'status-success'}`;
  }
  if (summaryStorageEl) {
    summaryStorageEl.textContent = supabase?.__local ? 'Trabajando en offline' : 'Guardado en la nube';
  }

  // Toggle: forzar modo offline
  const forceOfflineEl = document.getElementById('cfg-force-offline');
  if (forceOfflineEl) {
    forceOfflineEl.checked = isForceOfflineEnabled();
    if (!forceOfflineEl.dataset.initialized) {
      forceOfflineEl.dataset.initialized = 'true';
      forceOfflineEl.addEventListener('change', async () => {
        try {
          setForceOfflineEnabled(Boolean(forceOfflineEl.checked));
          await Swal.fire({
            icon: 'success',
            title: 'Listo',
            text: 'Se recargará la página para aplicar el modo de guardado.',
            timer: 1400,
            showConfirmButton: false,
          });
        } catch {
          // noop
        } finally {
          window.location.reload();
        }
      });
    }
  }

  const statusEl = document.getElementById('cfg-supabase-status');
  if (statusEl) {
    statusEl.textContent = supabase?.__local ? 'Offline' : 'Conectado';
    statusEl.classList.toggle('bg-green-100', !supabase?.__local);
    statusEl.classList.toggle('text-green-700', !supabase?.__local);
    statusEl.classList.toggle('dark:bg-green-900/20', !supabase?.__local);
    statusEl.classList.toggle('dark:text-green-400', !supabase?.__local);
  }

  const { url, anonKey } = getSupabaseConfig();
  const urlInput = document.getElementById('cfg-supabase-url');
  const keyInput = document.getElementById('cfg-supabase-key');
  if (urlInput) urlInput.value = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}supabaseUrl`) || url || '';
  if (keyInput) keyInput.value = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}supabaseAnonKey`) || anonKey || '';

  if (summaryUserEl) {
    summaryUserEl.textContent = currentUser?.full_name || String(currentUser?.email || '').split('@')[0] || 'Usuario actual';
  }
  if (summaryRoleEl) {
    const roleMap = { admin: 'Administrador', coordinator: 'Coordinador', practitioner: 'Practicante' };
    summaryRoleEl.textContent = roleMap[currentUser?.role] || 'Sin rol definido';
  }
  // Configuración institucional para PDF (sin duplicar lógica: se guarda en los mismos keys de reportes)
  const bindMirror = (cfgId, reportId, storageKey, fallbackValue = '') => {
    const cfgEl = document.getElementById(cfgId);
    if (!cfgEl) return;
    const saved = localStorage.getItem(storageKey);
    cfgEl.value = saved ?? fallbackValue ?? '';

    if (cfgEl.dataset.initialized === 'true') return;
    cfgEl.dataset.initialized = 'true';

    cfgEl.addEventListener('input', () => {
      localStorage.setItem(storageKey, cfgEl.value);
      const reportEl = document.getElementById(reportId);
      if (reportEl) reportEl.value = cfgEl.value;
    });
  };

  bindMirror(
    'cfg-report-org-unit',
    'report-org-unit',
    `${LOCAL_STORAGE_PREFIX}reportOrgUnit`,
    'Universidad Michoacana de San Nicolás de Hidalgo',
  );
  bindMirror('cfg-report-faculty', 'report-faculty', `${LOCAL_STORAGE_PREFIX}reportFaculty`, '');
  bindMirror(
    'cfg-report-signer-name',
    'report-signer-name',
    `${LOCAL_STORAGE_PREFIX}reportSignerName`,
    currentUser?.full_name || '',
  );
  bindMirror(
    'cfg-report-signer-role',
    'report-signer-role',
    `${LOCAL_STORAGE_PREFIX}reportSignerRole`,
    'Comisión de Servicios Informáticos',
  );

  const importInput = document.getElementById('cfg-import-backup');
  if (importInput && !importInput.dataset.initialized) {
    importInput.dataset.initialized = 'true';
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await importBackupFile(file);
      e.target.value = '';
    });
  }

  // UI de botones de tema (si existen)
  try {
    updateThemeButtonsUI();
  } catch {
    // noop
  }

  // Usuarios y seguridad (si existe UI)
  const allowReg = document.getElementById('cfg-allow-registration');
  const manualApproval = document.getElementById('cfg-manual-approval');
  const adminEmail = document.getElementById('cfg-primary-admin-email');
  if (adminEmail) adminEmail.textContent = PRIMARY_ADMIN_EMAIL;

  const isPrimary = String(currentUser?.email || '').toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() && currentUser?.role === 'admin';
  if (allowReg) allowReg.disabled = !isPrimary;
  if (manualApproval) manualApproval.disabled = true; // siempre activo por requisito

  (async () => {
    if (allowReg) {
      const value = await getAppSetting({ supabase }, 'allow_registration', true);
      allowReg.checked = Boolean(value);
      if (!allowReg.dataset.initialized) {
        allowReg.dataset.initialized = 'true';
        allowReg.addEventListener('change', async () => {
          try {
            await setAppSetting({ supabase }, 'allow_registration', Boolean(allowReg.checked));
            Swal.fire({ icon: 'success', title: 'Guardado', text: 'Preferencia actualizada.', timer: 1200, showConfirmButton: false });
          } catch (e) {
            Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: e?.message || 'Verifica permisos del admin principal.' });
          }
        });
      }
    }
    if (manualApproval) {
      manualApproval.checked = true;
    }
  })();
}

export async function testSupabaseConnection({ supabase } = {}) {
  const statusEl = document.getElementById('cfg-supabase-status');
  const setStatus = (text, kind) => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'status-chip';
    if (kind === 'ok')
      statusEl.className += ' status-success';
    else if (kind === 'warn')
      statusEl.className += ' status-warning';
    else
      statusEl.className += ' status-muted';
  };

  try {
    if (supabase?.__local) {
      setStatus('Offline (sin Supabase)', 'warn');
      Swal.fire({ icon: 'info', title: 'Sin Supabase', text: 'Configura Supabase para usar la nube.' });
      return;
    }

    setStatus('Probando...', 'warn');
    // Prueba simple: leer 1 perfil (si hay RLS correcto, admin podrá leer; si no, regresará error)
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) throw error;

    setStatus('Conectado ✅', 'ok');
    Swal.fire({
      icon: 'success',
      title: 'Conexión OK',
      text: 'Supabase está respondiendo correctamente.',
      timer: 1600,
      showConfirmButton: false,
    });
  } catch (e) {
    setStatus('Error de conexión', 'err');
    Swal.fire({
      icon: 'error',
      title: 'No conecta',
      text: e?.message || 'Revisa URL/ANON KEY y configuración de Supabase.',
    });
  }
}

export function saveSupabaseConfig() {
  const url = (document.getElementById('cfg-supabase-url')?.value || '').trim();
  const key = (document.getElementById('cfg-supabase-key')?.value || '').trim();

  if (url && !isValidUrl(url)) {
    Swal.fire({
      icon: 'error',
      title: 'URL inválida',
      text: 'Verifica la URL de Supabase (debe iniciar con http/https).',
    });
    return;
  }
  if (url && !key) {
    Swal.fire({ icon: 'error', title: 'Falta ANON KEY', text: 'Si configuras la URL, también debes pegar el ANON KEY.' });
    return;
  }

  localStorage.setItem(`${LOCAL_STORAGE_PREFIX}supabaseUrl`, url);
  localStorage.setItem(`${LOCAL_STORAGE_PREFIX}supabaseAnonKey`, key);
  // Si el usuario está configurando Supabase, asumimos que quiere reintentar modo nube.
  try {
    setForceOfflineEnabled(false);
  } catch {
    // noop
  }

  Swal.fire({
    icon: 'success',
    title: 'Guardado',
    text: 'Configuración guardada. Se recargará la página para aplicar cambios.',
    timer: 1800,
    showConfirmButton: false,
  }).then(() => window.location.reload());
}

export function exportBackup() {
  const keys = [
    `${LOCAL_STORAGE_PREFIX}activities`,
    `${LOCAL_STORAGE_PREFIX}events`,
    `${LOCAL_STORAGE_PREFIX}profiles`,
    `${LOCAL_STORAGE_PREFIX}session`,
    `${LOCAL_STORAGE_PREFIX}reportOrgUnit`,
    `${LOCAL_STORAGE_PREFIX}reportFaculty`,
    `${LOCAL_STORAGE_PREFIX}reportSignerName`,
    `${LOCAL_STORAGE_PREFIX}reportSignerRole`,
    `${LOCAL_STORAGE_PREFIX}signatureImage`,
    `${LOCAL_STORAGE_PREFIX}reportLogoUmich`,
    `${LOCAL_STORAGE_PREFIX}reportLogoFaculty`,
    `${LOCAL_STORAGE_PREFIX}supabaseUrl`,
    `${LOCAL_STORAGE_PREFIX}supabaseAnonKey`,
    'darkMode',
  ];

  const backup = {
    version: 1,
    created_at: new Date().toISOString(),
    data: {},
  };

  keys.forEach((k) => {
    const v = localStorage.getItem(k);
    if (v != null) backup.data[k] = v;
  });

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `respaldo_bitacora_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function clearOfflineData() {
  const result = await Swal.fire({
    title: '¿Borrar datos locales?',
    text: 'Se borrarán incidencias/eventos/usuarios guardados en este navegador. No afecta Supabase.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, borrar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626',
  });

  if (!result.isConfirmed) return;

  const keep = new Set([
    // Preferencias / configuración
    `${LOCAL_STORAGE_PREFIX}supabaseUrl`,
    `${LOCAL_STORAGE_PREFIX}supabaseAnonKey`,
    `${LOCAL_STORAGE_PREFIX}forceOffline`,
    `${LOCAL_STORAGE_PREFIX}reviewMode`,
    `${LOCAL_STORAGE_PREFIX}theme`,
    `${LOCAL_STORAGE_PREFIX}lastSection`,
    // compat
    'darkMode',
  ]);

  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(LOCAL_STORAGE_PREFIX) && !keep.has(key)) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // noop
  }

  await Swal.fire({
    icon: 'success',
    title: 'Borrado',
    text: 'Se borraron los datos locales. Se recargará la página.',
    timer: 1600,
    showConfirmButton: false,
  });

  window.location.reload();
}

async function importBackupFile(file) {
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    if (!backup?.data || typeof backup.data !== 'object') {
      throw new Error('Formato de respaldo inválido');
    }

    const confirm = await Swal.fire({
      title: '¿Importar respaldo?',
      text: 'Se sobrescribirán los datos locales de este navegador.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, importar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    Object.entries(backup.data).forEach(([k, v]) => {
      if (typeof v === 'string') localStorage.setItem(k, v);
    });

    Swal.fire({
      icon: 'success',
      title: 'Importado',
      text: 'Respaldo importado. Se recargará la página.',
      timer: 1800,
      showConfirmButton: false,
    }).then(() => window.location.reload());
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: error?.message || 'No se pudo importar el respaldo' });
  }
}
