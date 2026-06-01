/**
 * app.js (entry)
 * Inicializa la aplicación y expone handlers a `window.*` para mantener compatibilidad
 * con los onclick inline del HTML.
 */

import { createSupabase } from './database.js';
import { state, hideLoader } from './utils.js';
import {
  applyThemePreference,
  getThemePreference,
  setThemePreference,
  initializeSettingsControls,
  toggleCfgAnonKey,
  testSupabaseConnection,
  saveSupabaseConfig,
  exportBackup,
  LOCAL_STORAGE_PREFIX,
  isReviewModeEnabled,
  setReviewModeEnabled,
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
  deleteActivity,
  handleActivitySubmit,
  handleMsInfoUpload,
  copyMsinfoCommand,
  downloadMsinfoScript,
} from './incidencias.js';
import { loadEvents, filterEvents, showEventModal, closeEventModal, editEvent, deleteEvent, handleEventSubmit } from './eventos.js';
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

const supabase = createSupabase();
const dbCtx = { supabase };

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

  // Load initial data
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
window.deleteActivity = (id) => deleteActivity(dbCtx, id);

// MSINFO32 helpers
window.copyMsinfoCommand = copyMsinfoCommand;
window.downloadMsinfoScript = downloadMsinfoScript;

// Eventos
window.filterEvents = filterEvents;
window.showEventModal = showEventModal;
window.closeEventModal = closeEventModal;
window.editEvent = (id) => editEvent(dbCtx, id);
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
