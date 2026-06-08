/**
 * app.js (entry)
 * Inicializa la aplicación y expone handlers a `window.*` para mantener compatibilidad
 * con los onclick inline del HTML.
 */

import { createSupabase } from './database.js';
import { state, hideLoader, copyToClipboard, showToast } from './utils.js';
import {
  applyThemePreference,
  getThemePreference,
  setThemePreference,
  initializeSettingsControls,
  toggleCfgAnonKey,
  testSupabaseConnection,
  saveSupabaseConfig,
  exportBackup,
  clearOfflineData,
  LOCAL_STORAGE_PREFIX,
  isForceOfflineEnabled,
  isReviewModeEnabled,
  setReviewModeEnabled,
  setForceOfflineEnabled,
} from './config.js';
import { handleLogin, logout, togglePassword, loadUserProfile } from './auth.js';
import { handleRegister } from './auth.js';
import { loadDashboardData, updateReportStats, showNotifications, updateCharts } from './dashboard.js';
import {
  loadActivities,
  filterActivities,
  clearActivitiesFilters,
  prevPage,
  nextPage,
  showActivityModal,
  closeActivityModal,
  openActivityAdvancedModal,
  closeActivityAdvancedModal,
  editActivity,
  viewActivity,
  markDelivered,
  seedSampleActivities,
  clearSampleActivities,
  exportActivityPDF,
  exportActivitiesCSV,
  deleteActivity,
  handleActivitySubmit,
  handleMsInfoUpload,
  copyMsinfoCommand,
  downloadMsinfoScript,
} from './incidencias.js';
import { loadEvents, filterEvents, showEventModal, closeEventModal, editEvent, deleteEvent, handleEventSubmit, exportEventsCSV } from './eventos.js';
import {
  loadUsers,
  showUserModal,
  closeUserModal,
  editUser,
  handleUserSubmit,
  approveUser,
  rejectUser,
  suspendUser,
  activateUser,
  getRoleName,
} from './usuarios.js';
import { initializeReportControls, clearSignature, clearReportLogo, exportPDF, exportMaintenanceReport } from './reportes.js';

let supabase = createSupabase();
const dbCtx = { supabase };

let didWarnMissingSchema = false;

// -------------------------
// Command Palette (Ctrl+K)
// -------------------------

const cmdk = {
  open: false,
  items: [],
  activeIndex: 0,
  recents: [],
};

const CMDK_RECENTS_KEY = `${LOCAL_STORAGE_PREFIX}cmdkRecents`;

function loadCmdkRecents() {
  try {
    const raw = localStorage.getItem(CMDK_RECENTS_KEY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x.trim()).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveCmdkRecent(query) {
  const q = String(query || '').trim();
  if (!q) return;
  try {
    const current = loadCmdkRecents();
    const next = [q, ...current.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
    localStorage.setItem(CMDK_RECENTS_KEY, JSON.stringify(next));
    cmdk.recents = next;
  } catch {
    // noop
  }
}

function openCommandPalette() {
  const modal = document.getElementById('modal-command');
  if (!modal) return;
  cmdk.open = true;
  cmdk.activeIndex = 0;
  cmdk.recents = loadCmdkRecents();

  // Bloquear scroll de fondo
  try {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  } catch {
    // noop
  }

  modal.classList.remove('hidden');
  modal.classList.add('show');

  // Render inicial
  renderCmdkResults('');

  // Focus input
  setTimeout(() => document.getElementById('cmdk-input')?.focus?.(), 0);
}

function closeCommandPalette() {
  const modal = document.getElementById('modal-command');
  if (!modal) return;
  cmdk.open = false;
  modal.classList.remove('show');
  setTimeout(() => modal.classList.add('hidden'), 200);

  // Restaurar scroll
  try {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  } catch {
    // noop
  }
}

function buildCmdkItems() {
  const items = [];

  // Incidencias
  (state.activitiesData || []).forEach((a) => {
    const title = (a?.description || '').trim() || 'Incidencia';
    const subtitle = [a?.task_status ? `Estado: ${a.task_status}` : null, a?.priority ? `Prioridad: ${a.priority}` : null]
      .filter(Boolean)
      .join(' · ');
    const search = [
      a?.folio,
      a?.edificio,
      a?.carrera,
      a?.salon,
      a?.reporter_name,
      a?.department,
      a?.coordination,
      a?.service_type,
      a?.description,
      a?.assigned_to,
      a?.brand,
      a?.model,
      a?.operating_system,
      a?.date,
      a?.received_date,
      a?.delivery_date,
      subtitle,
    ]
      .filter(Boolean)
      .join(' ');
    items.push({
      type: 'activity',
      id: a.id,
      title,
      subtitle,
      search,
    });
  });

  // Eventos
  (state.eventsData || []).forEach((ev) => {
    const title = (ev?.title || '').trim() || 'Evento';
    const subtitle = [ev?.event_date ? ev.event_date : null, ev?.status ? `Estado: ${ev.status}` : null]
      .filter(Boolean)
      .join(' · ');
    const search = [
      ev?.title,
      ev?.event_date,
      ev?.event_time,
      ev?.status,
      ev?.location,
      ev?.description,
      subtitle,
    ]
      .filter(Boolean)
      .join(' ');
    items.push({
      type: 'event',
      id: ev.id,
      title,
      subtitle,
      search,
    });
  });

  return items;
}

function renderCmdkResults(queryRaw) {
  const q = String(queryRaw || '').toLowerCase().trim();
  const resultsEl = document.getElementById('cmdk-results');
  const metaEl = document.getElementById('cmdk-meta');
  if (!resultsEl || !metaEl) return;

  const all = buildCmdkItems();
  const filtered = q ? all.filter((it) => `${it.title} ${it.subtitle} ${it.search || ''}`.toLowerCase().includes(q)) : all.slice(0, 20);

  cmdk.items = filtered;
  cmdk.activeIndex = Math.min(cmdk.activeIndex, Math.max(filtered.length - 1, 0));

  metaEl.textContent = q
    ? `${filtered.length} resultado(s) · Incidencias: ${(filtered || []).filter((x) => x.type === 'activity').length} · Eventos: ${(filtered || []).filter((x) => x.type === 'event').length}`
    : `Sugerencias: ${filtered.length} · Recientes: ${(cmdk.recents || []).length}`;

  resultsEl.innerHTML = '';

  // Recientes (solo si no hay query)
  if (!q && Array.isArray(cmdk.recents) && cmdk.recents.length) {
    const header = document.createElement('div');
    header.className = 'px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900';
    header.textContent = 'Recientes';
    resultsEl.appendChild(header);

    cmdk.recents.slice(0, 5).forEach((rq) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white';
      btn.innerHTML = `<div class="flex items-center justify-between gap-3"><div class="truncate text-sm text-gray-900 dark:text-white">${rq}</div><span class="text-xs text-gray-500 dark:text-gray-400">↵</span></div>`;
      btn.addEventListener('click', () => {
        const input = document.getElementById('cmdk-input');
        if (!input) return;
        input.value = rq;
        renderCmdkResults(rq);
        input.focus();
      });
      resultsEl.appendChild(btn);
    });

    const header2 = document.createElement('div');
    header2.className = 'px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800';
    header2.textContent = 'Sugerencias';
    resultsEl.appendChild(header2);
  }

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'p-4 text-sm text-gray-600 dark:text-gray-300';
    empty.textContent = 'Sin resultados.';
    resultsEl.appendChild(empty);
    return;
  }

  filtered.forEach((it, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white';
    if (idx === cmdk.activeIndex) {
      btn.className += ' bg-gray-50 dark:bg-gray-800/60';
    }
    btn.dataset.type = it.type;
    btn.dataset.id = it.id;

    const top = document.createElement('div');
    top.className = 'flex items-center justify-between gap-3';

    const left = document.createElement('div');
    left.className = 'min-w-0';

    const title = document.createElement('div');
    title.className = 'font-semibold text-gray-900 dark:text-white truncate';
    title.textContent = it.title;

    const subtitle = document.createElement('div');
    subtitle.className = 'text-xs text-gray-500 dark:text-gray-400 truncate mt-1';
    subtitle.textContent = it.subtitle || (it.type === 'activity' ? 'Incidencia' : 'Evento');

    left.appendChild(title);
    left.appendChild(subtitle);

    const tag = document.createElement('span');
    tag.className =
      'shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200';
    tag.textContent = it.type === 'activity' ? 'Incidencia' : 'Evento';

    top.appendChild(left);
    top.appendChild(tag);
    btn.appendChild(top);

    btn.addEventListener('mouseenter', () => {
      cmdk.activeIndex = idx;
      renderCmdkResults(document.getElementById('cmdk-input')?.value || '');
    });

    btn.addEventListener('click', async () => {
      saveCmdkRecent(document.getElementById('cmdk-input')?.value || '');
      closeCommandPalette();
      if (it.type === 'activity') {
        window.showSection?.('activities');
        setTimeout(() => window.viewActivity?.(it.id), 50);
      } else if (it.type === 'event') {
        window.showSection?.('events');
        setTimeout(() => window.editEvent?.(it.id), 50);
      }
    });

    resultsEl.appendChild(btn);
  });
}

function updateNetStatusPill() {
  const el = document.getElementById('net-status');
  if (!el) return;

  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const local = Boolean(dbCtx?.supabase?.__local);
  const forced = (() => {
    try {
      return isForceOfflineEnabled();
    } catch {
      return false;
    }
  })();

  const setClasses = (kind) => {
    el.className = 'hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border';
    if (kind === 'ok') el.className += ' bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900/40';
    else if (kind === 'warn') el.className += ' bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-900/40';
    else el.className += ' bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-900/40';
  };

  if (!online) {
    el.textContent = 'Sin internet';
    setClasses('err');
    return;
  }

  if (local) {
    el.textContent = forced ? 'Offline (forzado)' : 'Offline';
    setClasses('warn');
    return;
  }

  el.textContent = 'Nube (Supabase)';
  setClasses('ok');
}

function isMissingSupabaseSchemaError(err) {
  const code = err?.code ? String(err.code) : '';
  const msg = err?.message ? String(err.message) : '';
  return (
    code === 'PGRST205' ||
    /schema cache/i.test(msg) ||
    /could not find the table/i.test(msg) ||
    /relation .* does not exist/i.test(msg)
  );
}

async function ensureDbReady() {
  // Si ya estamos en fallback local, no hay nada que validar.
  if (supabase?.__local) return true;

  try {
    // Health-check mínimo: si falta el esquema/tablas, Supabase responde con PGRST205.
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) throw error;
    return true;
  } catch (err) {
    if (isMissingSupabaseSchemaError(err)) {
      // Cambiar a modo offline de forma segura (sin romper toda la UI).
      setForceOfflineEnabled(true);
      supabase = createSupabase();
      dbCtx.supabase = supabase;

      if (!didWarnMissingSchema) {
        didWarnMissingSchema = true;
        Swal.fire({
          icon: 'warning',
          title: 'Supabase aún no está inicializado',
          html:
            'Detecté credenciales de Supabase configuradas, pero faltan tablas (por ejemplo <b>profiles</b>, <b>activities</b>, <b>events</b>).<br><br>' +
            'Para que el modo nube funcione, ejecuta el archivo <b>supabase_schema.sql</b> en tu proyecto de Supabase (SQL Editor) y revisa RLS/policies.<br><br>' +
            'Por ahora activé automáticamente el <b>modo offline</b> para que el sistema no falle.',
          confirmButtonText: 'Entendido',
        });
      }
      return false;
    }

    // Otros errores (red, permisos, etc.): dejamos que la UI lo maneje en cada módulo.
    return true;
  }
}

// -------------------------
// UI (login/app)
// -------------------------

function showLogin() {
  document.getElementById('login-screen')?.classList.remove('hidden');
  document.getElementById('app-container')?.classList.add('hidden');
  // Modal de registro (si quedó abierto)
  document.getElementById('modal-register')?.classList.add('hidden');
}

function openRegisterModal() {
  document.getElementById('modal-register')?.classList.remove('hidden');
}

function closeRegisterModal() {
  document.getElementById('modal-register')?.classList.add('hidden');
}

function enableReviewMode() {
  setReviewModeEnabled(true);
  window.location.reload();
}

function disableReviewMode() {
  setReviewModeEnabled(false);
  window.location.reload();
}

function showApp() {
  document.getElementById('login-screen')?.classList.add('hidden');
  document.getElementById('app-container')?.classList.remove('hidden');

  // Banner de Modo revisión
  const banner = document.getElementById('review-banner');
  if (banner) banner.classList.toggle('hidden', !isReviewModeEnabled());

  // Estado de conexión / modo
  updateNetStatusPill();

  // Load initial data (primero verificamos DB para evitar errores ruidosos)
  (async () => {
    await ensureDbReady();

    loadDashboardData(dbCtx);
    loadActivities(dbCtx);
    loadEvents(dbCtx);

    if (state.currentUser && state.currentUser.role === 'admin') loadUsers(dbCtx);

    // Refrescar controles del reporte (firma/nombre) con el usuario actual
    initializeReportControls();

    // Recordar última sección visitada (mejor UX)
    const last = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}lastSection`);
    if (last && last !== 'dashboard') {
      // Evitar abrir “Usuarios” si no eres admin
      if (last === 'users' && (!state.currentUser || state.currentUser.role !== 'admin')) return;
      if (document.getElementById(`section-${last}`)) window.showSection?.(last);
    }
  })();
}

function updateUserDisplay() {
  const nameEl = document.getElementById('user-name');
  const roleEl = document.getElementById('user-role');
  if (!nameEl || !roleEl || !state.currentUser) return;
  nameEl.textContent = state.currentUser.full_name;
  roleEl.textContent = getRoleName(state.currentUser.role);
}

function updateAdminMenu() {
  const adminMenu = document.getElementById('admin-menu');
  // Solo el admin principal ve el menú de administración
  const isPrimary = Boolean(state.currentUser) && state.currentUser.role === 'admin' && String(state.currentUser.email || '').toLowerCase() === '2211999e@umich.mx';
  if (adminMenu) adminMenu.classList.toggle('hidden', !isPrimary);

  // Controles especiales en incidencias (muestra)
  const seedBtn = document.getElementById('btn-seed-activities');
  const clearSeedBtn = document.getElementById('btn-clear-seed-activities');
  const canUseSamples = Boolean(state.currentUser) && (state.currentUser.role === 'admin' || state.currentUser.role === 'coordinator');
  if (seedBtn) seedBtn.classList.toggle('hidden', !canUseSamples);
  if (clearSeedBtn) clearSeedBtn.classList.toggle('hidden', !canUseSamples);
}

// -------------------------
// Navegación
// -------------------------

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar?.classList.add('-translate-x-full');
  overlay?.classList.add('hidden');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar?.classList.toggle('-translate-x-full');
  overlay?.classList.toggle('hidden');
}

function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.section').forEach((section) => section.classList.add('hidden'));

  // Show selected section
  document.getElementById(`section-${sectionName}`)?.classList.remove('hidden');

  // Update page title
  const titles = {
    dashboard: 'Dashboard',
    activities: 'Incidencias',
    events: 'Eventos',
    reports: 'Reportes',
    settings: 'Configuración',
    users: 'Usuarios',
  };
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.textContent = titles[sectionName] || 'Dashboard';

  // Guardar sección para la próxima vez
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}lastSection`, sectionName);
  } catch {
    // noop
  }

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  const activeNavItem = document.querySelector(`.nav-item[onclick="showSection('${sectionName}')"]`);
  if (activeNavItem) activeNavItem.classList.add('active');

  // Close sidebar on mobile
  if (window.innerWidth < 1024) closeSidebar();

  // Refresh data based on section
  if (sectionName === 'dashboard') {
    loadDashboardData(dbCtx);
  } else if (sectionName === 'activities') {
    loadActivities(dbCtx);
  } else if (sectionName === 'events') {
    loadEvents(dbCtx);
  } else if (sectionName === 'reports') {
    updateReportStats();
  } else if (sectionName === 'settings') {
    initializeSettingsControls({ supabase, currentUser: state.currentUser });
  } else if (sectionName === 'users' && state.currentUser && state.currentUser.role === 'admin') {
    loadUsers(dbCtx);
  }
}

function toggleDarkMode() {
  // Toggle rápido (botón del header): fuerza light/dark (no system)
  const isDark = document.documentElement.classList.contains('dark');
  setThemePreference(isDark ? 'light' : 'dark', { onThemeChanged: () => updateCharts() });
}

// -------------------------
// Init
// -------------------------

function initializeEventListeners() {
  // Login Form
  document.getElementById('login-form')?.addEventListener('submit', (e) => handleLogin({ supabase, state, ui }, e));
  document.getElementById('register-form')?.addEventListener('submit', (e) => handleRegister({ supabase, state, ui }, e));

  // Activity Form
  document.getElementById('form-activity')?.addEventListener('submit', (e) => handleActivitySubmit(dbCtx, e));

  // Event Form
  document.getElementById('form-event')?.addEventListener('submit', (e) => handleEventSubmit(dbCtx, e));

  // User Form
  document.getElementById('form-user')?.addEventListener('submit', (e) => handleUserSubmit(dbCtx, e));

  // MSINFO32 report import
  const reportFileInput = document.getElementById('act-report-file');
  if (reportFileInput) reportFileInput.addEventListener('change', (e) => handleMsInfoUpload({}, e));

  // Tema (system / light / dark)
  applyThemePreference(getThemePreference());
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (getThemePreference() === 'system') applyThemePreference('system');
    };
    // Compatibilidad navegadores
    try {
      mq.addEventListener('change', handler);
    } catch {
      try {
        mq.addListener(handler);
      } catch {
        // noop
      }
    }
  }

  // Reporte: firma/nombre (persistente)
  initializeReportControls();

  // Configuración
  initializeSettingsControls({ supabase, currentUser: state.currentUser });

  // Estado de red (online/offline)
  window.addEventListener('online', updateNetStatusPill);
  window.addEventListener('offline', updateNetStatusPill);

  // Atajo: Ctrl+K (o Cmd+K) abre buscador global
  document.addEventListener('keydown', (e) => {
    const isK = String(e.key || '').toLowerCase() === 'k';
    const withMod = e.ctrlKey || e.metaKey;
    if (!withMod || !isK) return;
    e.preventDefault();
    openCommandPalette();
  });

  // Wiring de UI del Command Palette (si existe en DOM)
  const cmdInput = document.getElementById('cmdk-input');
  if (cmdInput && !cmdInput.dataset.initialized) {
    cmdInput.dataset.initialized = 'true';
    cmdInput.addEventListener('input', () => renderCmdkResults(cmdInput.value));
    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeCommandPalette();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        cmdk.activeIndex = Math.min(cmdk.activeIndex + 1, Math.max(cmdk.items.length - 1, 0));
        renderCmdkResults(cmdInput.value);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        cmdk.activeIndex = Math.max(cmdk.activeIndex - 1, 0);
        renderCmdkResults(cmdInput.value);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const it = cmdk.items[cmdk.activeIndex];
        if (!it) return;
        saveCmdkRecent(cmdInput.value);
        closeCommandPalette();
        if (it.type === 'activity') {
          window.showSection?.('activities');
          setTimeout(() => window.viewActivity?.(it.id), 50);
        } else if (it.type === 'event') {
          window.showSection?.('events');
          setTimeout(() => window.editEvent?.(it.id), 50);
        }
      }
    });
  }

  // Escape global: cerrar modales/overlays si están abiertos
  if (!document.body.dataset.escapeWired) {
    document.body.dataset.escapeWired = 'true';
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;

      // 1) Command Palette
      if (cmdk.open) {
        e.preventDefault();
        closeCommandPalette();
        return;
      }

      // 2) Dropdowns <details>
      const openDetails = document.querySelectorAll('details[open]');
      if (openDetails.length) {
        openDetails.forEach((d) => d.removeAttribute('open'));
        return;
      }

      // 3) Modales principales (si existen)
      const tryClose = (id, fn) => {
        const modal = document.getElementById(id);
        if (modal && modal.classList.contains('show') && typeof fn === 'function') {
          fn();
          return true;
        }
        return false;
      };

      if (tryClose('modal-activity', window.closeActivityModal)) return;
      if (tryClose('modal-event', window.closeEventModal)) return;
      if (tryClose('modal-user', window.closeUserModal)) return;
      if (tryClose('modal-register', window.closeRegisterModal)) return;
    });
  }

  // Cierre automático de menús tipo <details> al hacer click fuera
  if (!document.body.dataset.detailsWired) {
    document.body.dataset.detailsWired = 'true';
    document.addEventListener('click', (e) => {
      document.querySelectorAll('details[open]').forEach((d) => {
        if (!d.contains(e.target)) d.removeAttribute('open');
      });
    });
  }
}

async function initializeApp() {
  try {
    // Modo revisión: datos demo (solo local)
    if (isReviewModeEnabled() && supabase.__local) {
      await seedReviewModeData();
    }

    // Check for existing session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      // Local fallback session (sin Supabase)
      if (supabase.__local) {
        const meta = session.user?.user_metadata || {};
        state.currentUser = {
          id: session.user?.id || 'local-user',
          full_name: meta.full_name || 'Usuario',
          role: meta.role || 'admin',
        };
        updateUserDisplay();
        updateAdminMenu();
        showApp();
      } else {
        await loadUserProfile({ supabase, state, ui }, session.user.id);
        showApp();
      }
    } else {
      showLogin();
    }

    // Estado de conexión / modo (por si la sesión restaura una sección distinta)
    try {
      updateNetStatusPill();
    } catch {
      // noop
    }

    // Set up auth state listener
    supabase.auth.onAuthStateChange(async (event, session2) => {
      if (event === 'SIGNED_IN' && session2) {
        await loadUserProfile({ supabase, state, ui }, session2.user.id);
        showApp();
      } else if (event === 'SIGNED_OUT') {
        state.currentUser = null;
        showLogin();
      }
    });

    // Initialize event listeners
    initializeEventListeners();

    // Hide loader
    hideLoader();
  } catch (error) {
    console.error('Error initializing app:', error);
    hideLoader();
    showLogin();
  }
}

async function seedReviewModeData() {
  const key = `${LOCAL_STORAGE_PREFIX}reviewSeeded_v1`;
  if (localStorage.getItem(key) === 'true') return;

  const demoProfiles = [
    { id: 'review-admin', email: 'demo.admin@umich.mx', full_name: 'Admin Demo', role: 'admin', account_status: 'approved', is_active: true },
    { id: 'review-coordinator', email: 'demo.coordinador@umich.mx', full_name: 'Coordinador Demo', role: 'coordinator', account_status: 'approved', is_active: true },
    { id: 'review-practitioner', email: 'demo.practicante@umich.mx', full_name: 'Practicante Demo', role: 'practitioner', account_status: 'approved', is_active: true },
  ];

  const today = new Date();
  const iso = today.toISOString().slice(0, 10);

  const demoEvents = [
    { title: 'Soporte a evento académico', event_date: iso, event_time: '10:00', location: 'Auditorio', status: 'pendiente', description: 'Prueba de agenda en modo revisión', observations: 'MUESTRA: modo revisión' },
    { title: 'Mantenimiento laboratorio', event_date: iso, event_time: '13:30', location: 'Laboratorio 2', status: 'en_proceso', description: 'Revisión de equipos', observations: 'MUESTRA: modo revisión' },
  ];

  try {
    await supabase.from('profiles').insert(demoProfiles);
  } catch {
    // noop
  }
  try {
    await supabase.from('events').insert(demoEvents);
  } catch {
    // noop
  }

  localStorage.setItem(key, 'true');
}

const ui = { showLogin, showApp, updateUserDisplay, updateAdminMenu };

document.addEventListener('DOMContentLoaded', async () => {
  await initializeApp();
});

// -------------------------
// window.* handlers (compat)
// -------------------------

// Tema
window.setThemePreference = (pref) => setThemePreference(pref, { onThemeChanged: () => updateCharts() });

// Auth / UI
window.logout = () => logout({ supabase, state, ui });
window.togglePassword = togglePassword;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.enableReviewMode = enableReviewMode;
window.disableReviewMode = disableReviewMode;

// Navegación y layout
window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.toggleDarkMode = toggleDarkMode;
window.showNotifications = showNotifications;

// Configuración (Supabase / backup)
window.toggleCfgAnonKey = toggleCfgAnonKey;
window.testSupabaseConnection = () => testSupabaseConnection({ supabase });
window.saveSupabaseConfig = saveSupabaseConfig;
window.exportBackup = exportBackup;
window.clearOfflineData = clearOfflineData;

// Incidencias
window.clearActivitiesFilters = clearActivitiesFilters;
window.filterActivities = filterActivities;
window.prevPage = prevPage;
window.nextPage = nextPage;
window.showActivityModal = showActivityModal;
window.closeActivityModal = closeActivityModal;
window.openActivityAdvancedModal = openActivityAdvancedModal;
window.closeActivityAdvancedModal = closeActivityAdvancedModal;
window.editActivity = (id) => editActivity(dbCtx, id);
window.viewActivity = (id) => viewActivity(dbCtx, id);
window.markDelivered = (id) => markDelivered(dbCtx, id);
window.seedSampleActivities = () => seedSampleActivities(dbCtx);
window.clearSampleActivities = () => clearSampleActivities(dbCtx);
window.exportActivityPDF = (id) => exportActivityPDF(dbCtx, id);
window.exportActivitiesCSV = () => exportActivitiesCSV();
window.deleteActivity = (id) => deleteActivity(dbCtx, id);

// MSINFO32 helpers
window.copyMsinfoCommand = copyMsinfoCommand;
window.downloadMsinfoScript = downloadMsinfoScript;

// Eventos
window.filterEvents = filterEvents;
window.showEventModal = showEventModal;
window.closeEventModal = closeEventModal;
window.editEvent = (id) => editEvent(dbCtx, id);
window.exportEventsCSV = () => exportEventsCSV();
window.deleteEvent = (id) => deleteEvent(dbCtx, id);

// Usuarios
window.showUserModal = showUserModal;
window.closeUserModal = closeUserModal;
window.editUser = (id) => editUser(dbCtx, id);
window.approveUser = (id) => approveUser(dbCtx, id);
window.rejectUser = (id) => rejectUser(dbCtx, id);
window.suspendUser = (id) => suspendUser(dbCtx, id);
window.activateUser = (id) => activateUser(dbCtx, id);

// Reportes
window.clearSignature = clearSignature;
window.clearReportLogo = clearReportLogo;
window.exportPDF = (type, options = {}) => exportPDF(dbCtx, type, options);
window.exportMaintenanceReport = (kind) => exportMaintenanceReport(dbCtx, kind);

// Command Palette
window.openCommandPalette = openCommandPalette;
window.closeCommandPalette = closeCommandPalette;

// Clipboard helper (para botones/acciones rápidas)
window.copyToClipboard = async (text) => {
  const ok = await copyToClipboard(text);
  if (ok) showToast({ type: 'success', title: 'Copiado', message: 'Se copió al portapapeles.' });
  else Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo copiar.' });
};
