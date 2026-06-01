/**
 * config.js
 * Configuración: Supabase, preferencias de tema, utilidades de backup y controles de settings.
 */

import { isValidUrl } from './database.js';

export const LOCAL_ADMIN_USERNAME = '2211999e';
export const LOCAL_ADMIN_PASSWORD = '123456789';
export const LOCAL_STORAGE_PREFIX = 'bitacora_umich_';

// Administrador principal (único con permisos críticos)
export const PRIMARY_ADMIN_EMAIL = '2211999e@umich.mx';

// Modo revisión (para superiores): opera en modo local y con datos de prueba
export const REVIEW_MODE_KEY = `${LOCAL_STORAGE_PREFIX}reviewMode`; // 'true' | 'false'

export function isReviewModeEnabled() {
  return localStorage.getItem(REVIEW_MODE_KEY) === 'true';
}

export function setReviewModeEnabled(enabled) {
  localStorage.setItem(REVIEW_MODE_KEY, enabled ? 'true' : 'false');
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
  if (modeEl) {
    modeEl.textContent = supabase?.__local
      ? 'Modo offline (guardado en este navegador).'
      : 'Conectado a Supabase (guardado en la nube).';
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
    statusEl.className = 'inline-flex items-center px-2 py-1 rounded-full text-xs border';
    if (kind === 'ok')
      statusEl.className +=
        ' bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
    else if (kind === 'warn')
      statusEl.className +=
        ' bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800';
    else
      statusEl.className +=
        ' bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
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
