// Bitácora Digital - Comisión de Servicios Informáticos UMICH
// Main Application JavaScript

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
const SUPABASE_URL =
    window.SUPABASE_URL ||
    localStorage.getItem('bitacora_umich_supabaseUrl') ||
    '';
const SUPABASE_ANON_KEY =
    window.SUPABASE_ANON_KEY ||
    localStorage.getItem('bitacora_umich_supabaseAnonKey') ||
    '';

const LOCAL_ADMIN_USERNAME = '22119993';
const LOCAL_ADMIN_PASSWORD = '123456789';
const LOCAL_STORAGE_PREFIX = 'bitacora_umich_';

// Preferencia de tema
const THEME_KEY = `${LOCAL_STORAGE_PREFIX}theme`; // 'system' | 'light' | 'dark'

function getThemePreference() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved;
    // Compatibilidad: versiones anteriores usaban 'darkMode' booleano
    const old = localStorage.getItem('darkMode');
    if (old === 'true') return 'dark';
    if (old === 'false') return 'light';
    return 'system';
}

function applyThemePreference(pref = getThemePreference()) {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = pref === 'dark' || (pref === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', Boolean(shouldUseDark));
    // mantener compatibilidad
    localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
    updateThemeButtonsUI(pref);
}

function updateThemeButtonsUI(pref = getThemePreference()) {
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

window.setThemePreference = function (pref) {
    const next = (pref === 'system' || pref === 'light' || pref === 'dark') ? pref : 'system';
    localStorage.setItem(THEME_KEY, next);
    applyThemePreference(next);
    // Recalcular charts para que texto/leyendas se vean bien
    try { updateCharts(); } catch { }
};

function isValidUrl(url) {
    try {
        return /^https?:\/\//.test(url) && Boolean(new URL(url));
    } catch {
        return false;
    }
}

const supabase = isValidUrl(SUPABASE_URL) && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : createSupabaseFallback();

function createSupabaseFallback() {
    const safeJsonParse = (value, fallback) => {
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    };

    const storageKey = (table) => `${LOCAL_STORAGE_PREFIX}${table}`;
    const ensureTable = (table) => {
        const key = storageKey(table);
        if (!localStorage.getItem(key)) localStorage.setItem(key, '[]');
    };

    const loadTable = (table) => {
        ensureTable(table);
        return safeJsonParse(localStorage.getItem(storageKey(table)), []);
    };

    const saveTable = (table, rows) => {
        ensureTable(table);
        localStorage.setItem(storageKey(table), JSON.stringify(rows));
    };

    const makeId = () => {
        try {
            return crypto.randomUUID();
        } catch {
            return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        }
    };

    const applyFilters = (rows, filters) => {
        if (!filters.length) return rows;
        return rows.filter((row) => filters.every((f) => row?.[f.field] === f.value));
    };

    const applyOrder = (rows, orderBy) => {
        if (!orderBy) return rows;
        const { field, ascending } = orderBy;
        return [...rows].sort((a, b) => {
            const av = a?.[field];
            const bv = b?.[field];
            if (av === bv) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            if (av > bv) return ascending ? 1 : -1;
            return ascending ? -1 : 1;
        });
    };

    const buildQuery = (table, op, payload) => {
        const state = {
            table,
            op,
            payload,
            filters: [],
            orderBy: null,
            isSingle: false,
        };

        const execute = async () => {
            try {
                let rows = loadTable(state.table);
                const originalRows = rows;

                const matched = applyFilters(rows, state.filters);

                if (state.op === 'select') {
                    const ordered = applyOrder(matched, state.orderBy);
                    if (state.isSingle) {
                        return { data: ordered[0] ?? null, error: ordered.length ? null : new Error('No encontrado') };
                    }
                    return { data: ordered, error: null };
                }

                if (state.op === 'update') {
                    const updated = [];
                    rows = rows.map((r) => {
                        const isMatch = state.filters.every((f) => r?.[f.field] === f.value);
                        if (!isMatch) return r;
                        const next = { ...r, ...state.payload };
                        updated.push(next);
                        return next;
                    });
                    saveTable(state.table, rows);
                    if (state.isSingle) {
                        return { data: updated[0] ?? null, error: updated.length ? null : new Error('No encontrado') };
                    }
                    return { data: updated, error: null };
                }

                if (state.op === 'delete') {
                    const toDeleteIds = new Set(matched.map((r) => r.id));
                    const remaining = originalRows.filter((r) => !toDeleteIds.has(r.id));
                    saveTable(state.table, remaining);
                    if (state.isSingle) {
                        return { data: matched[0] ?? null, error: matched.length ? null : new Error('No encontrado') };
                    }
                    return { data: matched, error: null };
                }

                return { data: null, error: new Error('Operación no soportada') };
            } catch (error) {
                return { data: null, error };
            }
        };

        const builder = {
            select: (_columns = '*') => builder,
            eq: (field, value) => {
                state.filters.push({ field, value });
                return builder;
            },
            order: (field, { ascending = true } = {}) => {
                state.orderBy = { field, ascending };
                return builder;
            },
            single: async () => {
                state.isSingle = true;
                return execute();
            },
            then: (resolve, reject) => execute().then(resolve, reject),
        };

        return builder;
    };

    const sessionKey = `${LOCAL_STORAGE_PREFIX}session`;

    return {
        __local: true,
        auth: {
            getSession: async () => {
                const session = safeJsonParse(localStorage.getItem(sessionKey), null);
                return { data: { session } };
            },
            onAuthStateChange: () => ({
                data: {
                    subscription: {
                        unsubscribe: () => { },
                    }
                }
            }),
            signInWithPassword: async () => ({ error: new Error('Supabase no configurado') }),
            signOut: async () => {
                localStorage.removeItem(sessionKey);
                return { error: null };
            },
            signUp: async () => ({ error: new Error('Supabase no configurado') })
        },
        from: (table) => ({
            select: (_columns = '*') => buildQuery(table, 'select', { columns: _columns }),
            insert: async (data) => {
                try {
                    const rows = loadTable(table);
                    const incoming = Array.isArray(data) ? data : [data];
                    const now = new Date().toISOString();
                    const inserted = incoming.map((item) => ({
                        id: item?.id || makeId(),
                        created_at: item?.created_at || now,
                        ...item,
                    }));
                    saveTable(table, [...rows, ...inserted]);
                    return { data: inserted, error: null };
                } catch (error) {
                    return { data: null, error };
                }
            },
            update: (values) => buildQuery(table, 'update', values),
            delete: () => buildQuery(table, 'delete'),
        })
    };
}

// Global State
let currentUser = null;
let activitiesData = [];
let eventsData = [];
let usersData = [];
let currentPage = 1;
const itemsPerPage = 10;
let charts = {};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

async function initializeApp() {
    try {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // Local fallback session (sin Supabase)
            if (supabase.__local) {
                const meta = session.user?.user_metadata || {};
                currentUser = {
                    id: session.user?.id || 'local-user',
                    full_name: meta.full_name || 'Usuario',
                    role: meta.role || 'admin'
                };
                updateUserDisplay();
                updateAdminMenu();
                showApp();
            } else {
                await loadUserProfile(session.user.id);
                showApp();
            }
        } else {
            showLogin();
        }

        // Set up auth state listener
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                await loadUserProfile(session.user.id);
                showApp();
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
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

// Load User Profile
async function loadUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        if (data && data.is_active === false) {
            Swal.fire({
                icon: 'error',
                title: 'Cuenta inactiva',
                text: 'Tu cuenta está desactivada. Contacta al administrador.'
            });
            await supabase.auth.signOut();
            return;
        }

        currentUser = data;
        updateUserDisplay();
        updateAdminMenu();

    } catch (error) {
        console.error('Error loading user profile:', error);
        await supabase.auth.signOut();
    }
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Login Form
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Activity Form
    document.getElementById('form-activity').addEventListener('submit', handleActivitySubmit);

    // Event Form
    document.getElementById('form-event').addEventListener('submit', handleEventSubmit);

    // User Form
    document.getElementById('form-user').addEventListener('submit', handleUserSubmit);

    // MSINFO32 report import
    const reportFileInput = document.getElementById('act-report-file');
    if (reportFileInput) {
        reportFileInput.addEventListener('change', handleMsInfoUpload);
    }

    // Tema (system / light / dark)
    applyThemePreference();
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (getThemePreference() === 'system') applyThemePreference('system');
        };
        // Compatibilidad navegadores
        try {
            mq.addEventListener('change', handler);
        } catch {
            try { mq.addListener(handler); } catch { }
        }
    }

    // Reporte: firma/nombre (persistente)
    initializeReportControls();

    // Configuración
    initializeSettingsControls();
}

function initializeSettingsControls() {
    const modeEl = document.getElementById('storage-mode');
    if (modeEl) {
        modeEl.textContent = supabase.__local
            ? 'Modo offline (guardado en este navegador).'
            : 'Conectado a Supabase (guardado en la nube).';
    }

    const statusEl = document.getElementById('cfg-supabase-status');
    if (statusEl) {
        statusEl.textContent = supabase.__local ? 'Offline' : 'Conectado';
        statusEl.classList.toggle('bg-green-100', !supabase.__local);
        statusEl.classList.toggle('text-green-700', !supabase.__local);
        statusEl.classList.toggle('dark:bg-green-900/20', !supabase.__local);
        statusEl.classList.toggle('dark:text-green-400', !supabase.__local);
    }

    const urlInput = document.getElementById('cfg-supabase-url');
    const keyInput = document.getElementById('cfg-supabase-key');
    if (urlInput) urlInput.value = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}supabaseUrl`) || SUPABASE_URL || '';
    if (keyInput) keyInput.value = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}supabaseAnonKey`) || SUPABASE_ANON_KEY || '';

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

    bindMirror('cfg-report-org-unit', 'report-org-unit', `${LOCAL_STORAGE_PREFIX}reportOrgUnit`, 'Universidad Michoacana de San Nicolás de Hidalgo');
    bindMirror('cfg-report-faculty', 'report-faculty', `${LOCAL_STORAGE_PREFIX}reportFaculty`, '');
    bindMirror('cfg-report-signer-name', 'report-signer-name', `${LOCAL_STORAGE_PREFIX}reportSignerName`, (currentUser?.full_name || ''));
    bindMirror('cfg-report-signer-role', 'report-signer-role', `${LOCAL_STORAGE_PREFIX}reportSignerRole`, 'Comisión de Servicios Informáticos');

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
    try { updateThemeButtonsUI(); } catch { }
}

window.testSupabaseConnection = async function () {
    const statusEl = document.getElementById('cfg-supabase-status');
    const setStatus = (text, kind) => {
        if (!statusEl) return;
        statusEl.textContent = text;
        statusEl.className = 'inline-flex items-center px-2 py-1 rounded-full text-xs border';
        if (kind === 'ok') statusEl.className += ' bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
        else if (kind === 'warn') statusEl.className += ' bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800';
        else statusEl.className += ' bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
    };

    try {
        if (supabase.__local) {
            setStatus('Offline (sin Supabase)', 'warn');
            Swal.fire({ icon: 'info', title: 'Sin Supabase', text: 'Configura Supabase para usar la nube.' });
            return;
        }

        setStatus('Probando...', 'warn');
        // Prueba simple: leer 1 perfil (si hay RLS correcto, admin podrá leer; si no, regresará error)
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) throw error;

        setStatus('Conectado ✅', 'ok');
        Swal.fire({ icon: 'success', title: 'Conexión OK', text: 'Supabase está respondiendo correctamente.', timer: 1600, showConfirmButton: false });
    } catch (e) {
        setStatus('Error de conexión', 'err');
        Swal.fire({ icon: 'error', title: 'No conecta', text: (e && e.message) ? e.message : 'Revisa URL/ANON KEY y configuración de Supabase.' });
    }
};

window.saveSupabaseConfig = function () {
    const url = (document.getElementById('cfg-supabase-url')?.value || '').trim();
    const key = (document.getElementById('cfg-supabase-key')?.value || '').trim();

    if (url && !isValidUrl(url)) {
        Swal.fire({ icon: 'error', title: 'URL inválida', text: 'Verifica la URL de Supabase (debe iniciar con http/https).' });
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
        showConfirmButton: false
    }).then(() => window.location.reload());
};

window.exportBackup = function () {
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
        'darkMode'
    ];

    const backup = {
        version: 1,
        created_at: new Date().toISOString(),
        data: {}
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
};

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
            cancelButtonText: 'Cancelar'
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
            showConfirmButton: false
        }).then(() => window.location.reload());
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo importar el respaldo' });
    }
}

// Nota: Se eliminó la función/botón de "Borrar datos locales" por solicitud del usuario.

function initializeReportControls() {
    const urlToDataUrl = (url) => new Promise((resolve, reject) => {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.decoding = 'async';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = reject;
            img.src = url;
        } catch (e) {
            reject(e);
        }
    });

    const nameInput = document.getElementById('report-signer-name');
    const roleInput = document.getElementById('report-signer-role');
    const fileInput = document.getElementById('report-signer-file');
    const preview = document.getElementById('report-signer-preview');
    const clearBtn = document.getElementById('report-signer-clear-btn');
    const dateStart = document.getElementById('report-date-start');
    const dateEnd = document.getElementById('report-date-end');

    const orgUnitInput = document.getElementById('report-org-unit');
    const facultyInput = document.getElementById('report-faculty');

    const logoUmichInput = document.getElementById('report-logo-umich-file');
    const logoUmichPreview = document.getElementById('report-logo-umich-preview');
    const logoUmichClearBtn = document.getElementById('report-logo-umich-clear-btn');
    const logoFacultyInput = document.getElementById('report-logo-faculty-file');
    const logoFacultyPreview = document.getElementById('report-logo-faculty-preview');
    const logoFacultyClearBtn = document.getElementById('report-logo-faculty-clear-btn');

    if (!nameInput || !roleInput || !fileInput || !preview || !clearBtn) return;
    const alreadyInitialized = nameInput.dataset.initialized === 'true';

    const signerNameKey = `${LOCAL_STORAGE_PREFIX}reportSignerName`;
    const signerRoleKey = `${LOCAL_STORAGE_PREFIX}reportSignerRole`;
    const signatureKey = `${LOCAL_STORAGE_PREFIX}signatureImage`;
    const logoUmichKey = `${LOCAL_STORAGE_PREFIX}reportLogoUmich`;
    const logoFacultyKey = `${LOCAL_STORAGE_PREFIX}reportLogoFaculty`;
    const orgUnitKey = `${LOCAL_STORAGE_PREFIX}reportOrgUnit`;
    const facultyKey = `${LOCAL_STORAGE_PREFIX}reportFaculty`;
    const reportStartKey = `${LOCAL_STORAGE_PREFIX}reportDateStart`;
    const reportEndKey = `${LOCAL_STORAGE_PREFIX}reportDateEnd`;

    // Defaults
    const storedName = localStorage.getItem(signerNameKey);
    const storedRole = localStorage.getItem(signerRoleKey);
    nameInput.value = storedName || (currentUser?.full_name || nameInput.value || 'Ivan Fernandez Mandujano');
    roleInput.value = storedRole || (roleInput.value || 'Comisión de Servicios Informáticos');

    if (orgUnitInput) orgUnitInput.value = localStorage.getItem(orgUnitKey) || orgUnitInput.value || 'Universidad Michoacana de San Nicolás de Hidalgo';
    if (facultyInput) facultyInput.value = localStorage.getItem(facultyKey) || facultyInput.value || '';

    // Sincroniza valores hacia la pantalla de Configuración (si existe)
    const cfgOrg = document.getElementById('cfg-report-org-unit');
    const cfgFac = document.getElementById('cfg-report-faculty');
    const cfgName = document.getElementById('cfg-report-signer-name');
    const cfgRole = document.getElementById('cfg-report-signer-role');
    if (cfgOrg && orgUnitInput) cfgOrg.value = orgUnitInput.value;
    if (cfgFac && facultyInput) cfgFac.value = facultyInput.value;
    if (cfgName) cfgName.value = nameInput.value;
    if (cfgRole) cfgRole.value = roleInput.value;

    // Rango de fechas (persistente)
    if (dateStart && dateEnd) {
        const savedStart = localStorage.getItem(reportStartKey);
        const savedEnd = localStorage.getItem(reportEndKey);
        const today = new Date().toISOString().split('T')[0];
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        dateStart.value = savedStart || dateStart.value || firstDay;
        dateEnd.value = savedEnd || dateEnd.value || today;
    }

    const savedSig = localStorage.getItem(signatureKey);
    if (savedSig) {
        preview.src = savedSig;
        preview.classList.remove('hidden');
        clearBtn.classList.remove('hidden');
    }

    const savedUmichLogo = localStorage.getItem(logoUmichKey);
    if (savedUmichLogo && logoUmichPreview && logoUmichClearBtn) {
        logoUmichPreview.src = savedUmichLogo;
        logoUmichPreview.classList.remove('hidden');
        logoUmichClearBtn.classList.remove('hidden');
    }
    if (!savedUmichLogo && logoUmichPreview && logoUmichClearBtn) {
        // Logo incluido en el proyecto (assets/logos/logo-umich.png)
        urlToDataUrl('./assets/logos/logo-umich.png')
            .then((dataUrl) => {
                localStorage.setItem(logoUmichKey, String(dataUrl));
                logoUmichPreview.src = String(dataUrl);
                logoUmichPreview.classList.remove('hidden');
                logoUmichClearBtn.classList.remove('hidden');
            })
            .catch(() => { });
    }

    const savedFacultyLogo = localStorage.getItem(logoFacultyKey);
    if (savedFacultyLogo && logoFacultyPreview && logoFacultyClearBtn) {
        logoFacultyPreview.src = savedFacultyLogo;
        logoFacultyPreview.classList.remove('hidden');
        logoFacultyClearBtn.classList.remove('hidden');
    }
    if (!savedFacultyLogo && logoFacultyPreview && logoFacultyClearBtn) {
        // Logo incluido en el proyecto (assets/logos/logo-faculty.png)
        urlToDataUrl('./assets/logos/logo-faculty.png')
            .then((dataUrl) => {
                localStorage.setItem(logoFacultyKey, String(dataUrl));
                logoFacultyPreview.src = String(dataUrl);
                logoFacultyPreview.classList.remove('hidden');
                logoFacultyClearBtn.classList.remove('hidden');
            })
            .catch(() => { });
    }

    if (alreadyInitialized) return;
    nameInput.dataset.initialized = 'true';

    nameInput.addEventListener('input', () => {
        localStorage.setItem(signerNameKey, nameInput.value);
        const cfg = document.getElementById('cfg-report-signer-name');
        if (cfg) cfg.value = nameInput.value;
    });
    roleInput.addEventListener('input', () => {
        localStorage.setItem(signerRoleKey, roleInput.value);
        const cfg = document.getElementById('cfg-report-signer-role');
        if (cfg) cfg.value = roleInput.value;
    });
    if (orgUnitInput) orgUnitInput.addEventListener('input', () => {
        localStorage.setItem(orgUnitKey, orgUnitInput.value);
        const cfg = document.getElementById('cfg-report-org-unit');
        if (cfg) cfg.value = orgUnitInput.value;
    });
    if (facultyInput) facultyInput.addEventListener('input', () => {
        localStorage.setItem(facultyKey, facultyInput.value);
        const cfg = document.getElementById('cfg-report-faculty');
        if (cfg) cfg.value = facultyInput.value;
    });
    if (dateStart) dateStart.addEventListener('change', () => localStorage.setItem(reportStartKey, dateStart.value));
    if (dateEnd) dateEnd.addEventListener('change', () => localStorage.setItem(reportEndKey, dateEnd.value));

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const isOk = file.type === 'image/png' || file.type === 'image/jpeg';
        if (!isOk) {
            Swal.fire({ icon: 'error', title: 'Formato inválido', text: 'Para el PDF usa PNG o JPG.' });
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            try {
                localStorage.setItem(signatureKey, String(dataUrl));
            } catch {
                Swal.fire({ icon: 'error', title: 'Sin espacio', text: 'No se pudo guardar la firma en el navegador.' });
                return;
            }
            preview.src = String(dataUrl);
            preview.classList.remove('hidden');
            clearBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });

    const bindLogoInput = (inputEl, previewEl, clearEl, storageKey) => {
        if (!inputEl || !previewEl || !clearEl) return;
        inputEl.addEventListener('change', async () => {
            const file = inputEl.files?.[0];
            if (!file) return;
            const isOk = file.type === 'image/png' || file.type === 'image/jpeg';
            if (!isOk) {
                Swal.fire({ icon: 'error', title: 'Formato inválido', text: 'Para el PDF usa PNG o JPG.' });
                inputEl.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                try {
                    localStorage.setItem(storageKey, String(dataUrl));
                } catch {
                    Swal.fire({ icon: 'error', title: 'Sin espacio', text: 'No se pudo guardar el logo en el navegador.' });
                    return;
                }
                previewEl.src = String(dataUrl);
                previewEl.classList.remove('hidden');
                clearEl.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        });
    };

    bindLogoInput(logoUmichInput, logoUmichPreview, logoUmichClearBtn, logoUmichKey);
    bindLogoInput(logoFacultyInput, logoFacultyPreview, logoFacultyClearBtn, logoFacultyKey);
}

window.clearSignature = function () {
    const signatureKey = `${LOCAL_STORAGE_PREFIX}signatureImage`;
    localStorage.removeItem(signatureKey);
    const preview = document.getElementById('report-signer-preview');
    const clearBtn = document.getElementById('report-signer-clear-btn');
    const fileInput = document.getElementById('report-signer-file');
    if (preview) preview.classList.add('hidden');
    if (clearBtn) clearBtn.classList.add('hidden');
    if (fileInput) fileInput.value = '';
};

window.clearReportLogo = function (which) {
    const key = which === 'umich'
        ? `${LOCAL_STORAGE_PREFIX}reportLogoUmich`
        : `${LOCAL_STORAGE_PREFIX}reportLogoFaculty`;

    localStorage.removeItem(key);

    const preview = document.getElementById(which === 'umich' ? 'report-logo-umich-preview' : 'report-logo-faculty-preview');
    const clearBtn = document.getElementById(which === 'umich' ? 'report-logo-umich-clear-btn' : 'report-logo-faculty-clear-btn');
    const fileInput = document.getElementById(which === 'umich' ? 'report-logo-umich-file' : 'report-logo-faculty-file');

    if (preview) preview.classList.add('hidden');
    if (clearBtn) clearBtn.classList.add('hidden');
    if (fileInput) fileInput.value = '';
};

// MSINFO32 Import Functions
async function handleMsInfoUpload(event) {
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

    const normalize = (s) => (s || '')
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
    const storageMatch = text.match(/(\d+\.?\d*\s?(GB|TB))\s+(SSD|HDD|NVMe)/i)
        || text.match(/(SSD|HDD|NVMe).*?(\d+\.?\d*\s?(GB|TB))/i);
    if (storageMatch) {
        values.primaryStorage = storageMatch[0].replace(/\s+/g, ' ').trim();
    }

    return values;
}

// Utilidades para ayudar a generar/usar el reporte MSINFO32
window.copyMsinfoCommand = async function () {
    const cmd = 'msinfo32 /report C:\\\\reporte-equipo.txt';
    try {
        await navigator.clipboard.writeText(cmd);
        Swal.fire({ icon: 'success', title: 'Copiado', text: 'Comando copiado al portapapeles', timer: 1500, showConfirmButton: false });
    } catch {
        Swal.fire({ icon: 'info', title: 'Copia manual', text: cmd });
    }
};

window.downloadMsinfoScript = function () {
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
};

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        showLoader();

        if (email === LOCAL_ADMIN_USERNAME && password === LOCAL_ADMIN_PASSWORD) {
            currentUser = {
                id: 'local-admin',
                full_name: 'Administrador',
                role: 'admin'
            };
            // Persistir sesión local para que "se guarde todo" incluso al recargar la página
            try {
                localStorage.setItem(`${LOCAL_STORAGE_PREFIX}session`, JSON.stringify({
                    user: {
                        id: currentUser.id,
                        user_metadata: {
                            full_name: currentUser.full_name,
                            role: currentUser.role
                        }
                    }
                }));
            } catch { }
            updateUserDisplay();
            updateAdminMenu();
            showApp();

            Swal.fire({
                icon: 'success',
                title: '¡Bienvenido!',
                text: `Hola, ${currentUser.full_name}`,
                timer: 2000,
                showConfirmButton: false
            });

            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        await loadUserProfile(data.user.id);
        showApp();

        Swal.fire({
            icon: 'success',
            title: '¡Bienvenido!',
            text: `Hola, ${currentUser.full_name}`,
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('Login error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de autenticación',
            text: 'Credenciales incorrectas. Por favor, verifica tu correo y contraseña.'
        });
    } finally {
        hideLoader();
    }
}

window.logout = async function() {
    try {
        Swal.fire({
            title: '¿Cerrar sesión?',
            text: '¿Estás seguro de que quieres cerrar sesión?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#000000',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                await supabase.auth.signOut();
                currentUser = null;
                showLogin();
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
};

// Toggle Password Visibility
window.togglePassword = function() {
    const passwordInput = document.getElementById('login-password');
    const toggleIcon = document.getElementById('toggle-icon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
};

// UI Display Functions
function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    // Load initial data
    loadDashboardData();
    loadActivities();
    loadEvents();

    if (currentUser && currentUser.role === 'admin') {
        loadUsers();
    }

    // Refrescar controles del reporte (firma/nombre) con el usuario actual
    initializeReportControls();

    // Recordar última sección visitada (mejor UX)
    const last = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}lastSection`);
    if (last && last !== 'dashboard') {
        // Evitar abrir “Usuarios” si no eres admin
        if (last === 'users' && (!currentUser || currentUser.role !== 'admin')) return;
        if (document.getElementById(`section-${last}`)) {
            window.showSection(last);
        }
    }
}

function hideLoader() {
    const loader = document.getElementById('loader');
    loader.style.opacity = '0';
    setTimeout(() => {
        loader.classList.add('hidden');
    }, 300);
}

function showLoader() {
    const loader = document.getElementById('loader');
    loader.classList.remove('hidden');
    loader.style.opacity = '1';
}

function updateUserDisplay() {
    document.getElementById('user-name').textContent = currentUser.full_name;
    document.getElementById('user-role').textContent = getRoleName(currentUser.role);
}

function updateAdminMenu() {
    const adminMenu = document.getElementById('admin-menu');
    if (currentUser && currentUser.role === 'admin') {
        adminMenu.classList.remove('hidden');
    } else {
        adminMenu.classList.add('hidden');
    }

    // Controles especiales en incidencias (muestra)
    const seedBtn = document.getElementById('btn-seed-activities');
    const clearSeedBtn = document.getElementById('btn-clear-seed-activities');
    const canUseSamples = Boolean(currentUser) && (currentUser.role === 'admin' || currentUser.role === 'coordinator');
    if (seedBtn) seedBtn.classList.toggle('hidden', !canUseSamples);
    if (clearSeedBtn) clearSeedBtn.classList.toggle('hidden', !canUseSamples);
}

function getRoleName(role) {
    const roles = {
        admin: 'Administrador',
        coordinator: 'Coordinador',
        practitioner: 'Practicante'
    };
    return roles[role] || role;
}

// Navigation Functions
window.showSection = function(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });

    // Show selected section
    document.getElementById(`section-${sectionName}`).classList.remove('hidden');

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        activities: 'Incidencias',
        events: 'Eventos',
        reports: 'Reportes',
        settings: 'Configuración',
        users: 'Usuarios'
    };
    document.getElementById('page-title').textContent = titles[sectionName] || 'Dashboard';

    // Guardar sección para la próxima vez
    try {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}lastSection`, sectionName);
    } catch { }

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    const activeNavItem = document.querySelector(`.nav-item[onclick="showSection('${sectionName}')"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }

    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
        closeSidebar();
    }

    // Refresh data based on section
    if (sectionName === 'dashboard') {
        loadDashboardData();
    } else if (sectionName === 'activities') {
        loadActivities();
    } else if (sectionName === 'events') {
        loadEvents();
    } else if (sectionName === 'reports') {
        updateReportStats();
    } else if (sectionName === 'settings') {
        initializeSettingsControls();
    } else if (sectionName === 'users' && currentUser && currentUser.role === 'admin') {
        loadUsers();
    }
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
};

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
}

window.toggleDarkMode = function() {
    // Toggle rápido (botón del header): fuerza light/dark (no system)
    const isDark = document.documentElement.classList.contains('dark');
    window.setThemePreference(isDark ? 'light' : 'dark');
};

window.toggleCfgAnonKey = function () {
    const input = document.getElementById('cfg-supabase-key');
    const icon = document.getElementById('cfg-anonkey-icon');
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    if (icon) {
        icon.classList.toggle('fa-eye', !isHidden);
        icon.classList.toggle('fa-eye-slash', isHidden);
    }
};

// =========================
// Notificaciones / recordatorios por fechas
// =========================
const REMINDER_EVENT_DAYS = 3;      // Eventos próximos: 3 días
const REMINDER_DELIVERY_DAYS = 1;   // Entregas próximas: 1 día

function toDateOnly(value) {
    if (!value) return null;
    if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysDiffFromToday(dateValue) {
    const d = toDateOnly(dateValue);
    if (!d) return null;
    const today = toDateOnly(new Date());
    const diffMs = d.getTime() - today.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function getUpcomingEvents(daysAhead = REMINDER_EVENT_DAYS) {
    return (eventsData || [])
        .filter((e) => e && e.event_date)
        .filter((e) => !['completado', 'cancelado'].includes(String(e.status || '').toLowerCase()))
        .map((e) => ({ ...e, __days: daysDiffFromToday(e.event_date) }))
        .filter((e) => e.__days != null && e.__days >= 0 && e.__days <= daysAhead)
        .sort((a, b) => a.__days - b.__days);
}

function getDeliveryDueActivities(daysAhead = REMINDER_DELIVERY_DAYS) {
    return (activitiesData || [])
        .filter((a) => a && a.delivery_date)
        .filter((a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase()))
        .map((a) => ({ ...a, __days: daysDiffFromToday(a.delivery_date) }))
        .filter((a) => a.__days != null && a.__days >= 0 && a.__days <= daysAhead)
        .sort((a, b) => a.__days - b.__days);
}

function getOverdueEvents() {
    return (eventsData || [])
        .filter((e) => e && e.event_date)
        .filter((e) => !['completado', 'cancelado'].includes(String(e.status || '').toLowerCase()))
        .map((e) => ({ ...e, __days: daysDiffFromToday(e.event_date) }))
        .filter((e) => e.__days != null && e.__days < 0)
        .sort((a, b) => a.__days - b.__days);
}

function getOverdueDeliveries() {
    return (activitiesData || [])
        .filter((a) => a && a.delivery_date)
        .filter((a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase()))
        .map((a) => ({ ...a, __days: daysDiffFromToday(a.delivery_date) }))
        .filter((a) => a.__days != null && a.__days < 0)
        .sort((a, b) => a.__days - b.__days);
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    // Contador orientado a "fechas": próximos eventos + entregas próximas
    const upcomingEvents = getUpcomingEvents(REMINDER_EVENT_DAYS).length;
    const dueDeliveries = getDeliveryDueActivities(REMINDER_DELIVERY_DAYS).length;
    const overdueEvents = getOverdueEvents().length;
    const overdueDeliveries = getOverdueDeliveries().length;
    const total = upcomingEvents + dueDeliveries + overdueEvents + overdueDeliveries;

    if (total > 0) {
        badge.textContent = String(total);
        badge.classList.remove('hidden');
        badge.classList.add('notification-pulse');
    } else {
        badge.textContent = '';
        badge.classList.add('hidden');
        badge.classList.remove('notification-pulse');
    }
}

function renderDashboardReminders() {
    const container = document.getElementById('dashboard-reminders');
    if (!container) return;

    const upcoming = getUpcomingEvents(REMINDER_EVENT_DAYS).slice(0, 4);
    const due = getDeliveryDueActivities(REMINDER_DELIVERY_DAYS).slice(0, 4);

    const formatWhen = (days) => {
        if (days === 0) return 'Hoy';
        if (days === 1) return 'Mañana';
        return `En ${days} días`;
    };

    if (!upcoming.length && !due.length) {
        container.innerHTML = `
            <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50/60 dark:bg-gray-800/30">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Sin recordatorios</p>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">No hay eventos próximos ni entregas cercanas.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        ${upcoming.length ? `
            <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white/60 dark:bg-gray-900/40">
                <div class="flex items-center justify-between">
                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Eventos próximos</p>
                    <span class="text-[11px] px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">${getUpcomingEvents(REMINDER_EVENT_DAYS).length}</span>
                </div>
                <div class="mt-2 space-y-2">
                    ${upcoming.map(e => `
                        <div class="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${e.title || '—'}</p>
                                    <p class="text-xs text-gray-600 dark:text-gray-400 truncate">
                                        ${formatDate(e.event_date)} ${e.event_time ? `• ${e.event_time}` : ''} ${e.location ? `• ${e.location}` : ''}
                                    </p>
                                </div>
                                <span class="text-xs font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">${formatWhen(e.__days)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        ${due.length ? `
            <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white/60 dark:bg-gray-900/40">
                <div class="flex items-center justify-between">
                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Entregas próximas</p>
                    <span class="text-[11px] px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800">${getDeliveryDueActivities(REMINDER_DELIVERY_DAYS).length}</span>
                </div>
                <div class="mt-2 space-y-2">
                    ${due.map(i => `
                        <div class="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <div class="flex items-start justify-between gap-2">
                                <div class="min-w-0">
                                    <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${i.reporter_name || '—'} • ${i.department || '—'}</p>
                                    <p class="text-xs text-gray-600 dark:text-gray-400 truncate">
                                        Entrega: ${formatDate(i.delivery_date)} • ${getStatusText(i.task_status)}
                                    </p>
                                </div>
                                <span class="text-xs font-semibold text-orange-700 dark:text-orange-300 whitespace-nowrap">${formatWhen(i.__days)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

function renderDashboardInsights() {
    // KPIs
    const upcomingEventsEl = document.getElementById('kpi-upcoming-events');
    const overdueEventsEl = document.getElementById('kpi-overdue-events');
    const dueDeliveriesEl = document.getElementById('kpi-due-deliveries');
    const overdueDeliveriesEl = document.getElementById('kpi-overdue-deliveries');
    const completionRateEl = document.getElementById('kpi-completion-rate');
    const avgResolutionEl = document.getElementById('kpi-avg-resolution');
    const createdTodayEl = document.getElementById('kpi-created-today');
    const deliveredTodayEl = document.getElementById('kpi-delivered-today');

    const upcomingEvents = getUpcomingEvents(REMINDER_EVENT_DAYS);
    const overdueEvents = getOverdueEvents();
    const dueDeliveries = getDeliveryDueActivities(REMINDER_DELIVERY_DAYS);
    const overdueDeliveries = getOverdueDeliveries();

    if (upcomingEventsEl) upcomingEventsEl.textContent = String(upcomingEvents.length);
    if (overdueEventsEl) overdueEventsEl.textContent = String(overdueEvents.length);
    if (dueDeliveriesEl) dueDeliveriesEl.textContent = String(dueDeliveries.length);
    if (overdueDeliveriesEl) overdueDeliveriesEl.textContent = String(overdueDeliveries.length);

    const total = (activitiesData || []).length || 0;
    const completed = (activitiesData || []).filter((a) => a.task_status === 'completado').length;
    const rate = total ? Math.round((completed / total) * 100) : 0;
    if (completionRateEl) completionRateEl.textContent = `${rate}%`;

    // Tiempo promedio (recibido -> entrega) en completadas
    const durations = (activitiesData || [])
        .filter((a) => a.task_status === 'completado')
        .map((a) => {
            const received = toDateOnly(a.received_date || a.date);
            const delivered = toDateOnly(a.delivery_date);
            if (!received || !delivered) return null;
            const diffMs = delivered.getTime() - received.getTime();
            return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        })
        .filter((n) => typeof n === 'number');
    const avg = durations.length ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length) : null;
    if (avgResolutionEl) avgResolutionEl.textContent = avg == null ? '—' : `${avg} día${avg === 1 ? '' : 's'}`;

    // Hoy: creadas y entregadas
    const today = new Date().toISOString().split('T')[0];
    const createdToday = (activitiesData || []).filter((a) => String(a.date || '').slice(0, 10) === today).length;
    const deliveredToday = (activitiesData || []).filter((a) =>
        a.task_status === 'completado' && String(a.delivery_date || '').slice(0, 10) === today
    ).length;
    if (createdTodayEl) createdTodayEl.textContent = String(createdToday);
    if (deliveredTodayEl) deliveredTodayEl.textContent = String(deliveredToday);

    // Top departamentos / servicios
    const topDeptEl = document.getElementById('dashboard-top-departments');
    const topServicesEl = document.getElementById('dashboard-top-services');

    const countBy = (rows, field) => {
        const m = new Map();
        (rows || []).forEach((r) => {
            const k = String((r && r[field]) ? r[field] : 'Sin especificar').trim() || 'Sin especificar';
            m.set(k, (m.get(k) || 0) + 1);
        });
        return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };

    const dept = countBy(activitiesData, 'department').slice(0, 6);
    const services = countBy(activitiesData, 'service_type').slice(0, 6);
    const maxDept = dept[0]?.[1] || 1;
    const maxSvc = services[0]?.[1] || 1;

    if (topDeptEl) {
        topDeptEl.innerHTML = dept.length ? dept.map(([name, value]) => `
            <div class="flex items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">${name}</p>
                    <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mt-1">
                        <div class="h-2 rounded-full bg-black dark:bg-white" style="width:${Math.round((value / maxDept) * 100)}%"></div>
                    </div>
                </div>
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${value}</span>
            </div>
        `).join('') : `<p class="text-sm text-gray-500 dark:text-gray-400">Sin datos todavía.</p>`;
    }

    if (topServicesEl) {
        topServicesEl.innerHTML = services.length ? services.map(([name, value]) => `
            <div class="flex items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">${name}</p>
                    <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mt-1">
                        <div class="h-2 rounded-full bg-black dark:bg-white" style="width:${Math.round((value / maxSvc) * 100)}%"></div>
                    </div>
                </div>
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${value}</span>
            </div>
        `).join('') : `<p class="text-sm text-gray-500 dark:text-gray-400">Sin datos todavía.</p>`;
    }
}

window.showNotifications = function() {
    const upcoming = getUpcomingEvents(REMINDER_EVENT_DAYS).slice(0, 8);
    const due = getDeliveryDueActivities(REMINDER_DELIVERY_DAYS).slice(0, 8);
    const overdueE = getOverdueEvents().slice(0, 8);
    const overdueD = getOverdueDeliveries().slice(0, 8);

    const formatWhen = (days) => {
        if (days === 0) return 'Hoy';
        if (days === 1) return 'Mañana';
        return `En ${days} días`;
    };

    const html = `
        <div class="text-left">
            <p class="text-sm text-gray-600 dark:text-gray-300">Recordatorios por fecha</p>

            <div class="mt-3 grid grid-cols-1 gap-3">
                ${overdueE.length ? `
                    <div class="rounded-xl border border-red-200 dark:border-red-900/40 p-3 bg-red-50/60 dark:bg-red-900/10">
                        <div class="flex items-center justify-between">
                            <p class="font-semibold text-red-800 dark:text-red-200">Eventos atrasados</p>
                            <span class="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">${getOverdueEvents().length}</span>
                        </div>
                        <div class="mt-2 space-y-2">
                            ${overdueE.map(e => `
                                <div class="p-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-white/70 dark:bg-gray-900/30">
                                    <p class="text-sm font-semibold text-gray-900 dark:text-white">${e.title || '—'}</p>
                                    <p class="text-xs text-gray-700 dark:text-gray-300">Fecha: ${formatDate(e.event_date)} ${e.event_time ? `• ${e.event_time}` : ''}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white/60 dark:bg-gray-900/40">
                    <div class="flex items-center justify-between">
                        <p class="font-semibold text-gray-900 dark:text-gray-100">Eventos próximos (${REMINDER_EVENT_DAYS} días)</p>
                        <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">${getUpcomingEvents(REMINDER_EVENT_DAYS).length}</span>
                    </div>
                    <div class="mt-2 space-y-2">
                        ${upcoming.length ? upcoming.map(e => `
                            <div class="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                <div class="flex items-start justify-between gap-2">
                                    <div class="min-w-0">
                                        <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${e.title || '—'}</p>
                                        <p class="text-xs text-gray-600 dark:text-gray-400">
                                            ${formatDate(e.event_date)} ${e.event_time ? `• ${e.event_time}` : ''} ${e.location ? `• ${e.location}` : ''}
                                        </p>
                                    </div>
                                    <span class="text-xs font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">${formatWhen(e.__days)}</span>
                                </div>
                            </div>
                        `).join('') : `<p class="text-xs text-gray-600 dark:text-gray-400">No hay eventos próximos.</p>`}
                    </div>
                </div>

                ${overdueD.length ? `
                    <div class="rounded-xl border border-red-200 dark:border-red-900/40 p-3 bg-red-50/60 dark:bg-red-900/10">
                        <div class="flex items-center justify-between">
                            <p class="font-semibold text-red-800 dark:text-red-200">Entregas atrasadas</p>
                            <span class="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">${getOverdueDeliveries().length}</span>
                        </div>
                        <div class="mt-2 space-y-2">
                            ${overdueD.map(i => `
                                <div class="p-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-white/70 dark:bg-gray-900/30">
                                    <p class="text-sm font-semibold text-gray-900 dark:text-white">${i.reporter_name || '—'} • ${i.department || '—'}</p>
                                    <p class="text-xs text-gray-700 dark:text-gray-300">Entrega: ${formatDate(i.delivery_date)} • ${getStatusText(i.task_status)}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white/60 dark:bg-gray-900/40">
                    <div class="flex items-center justify-between">
                        <p class="font-semibold text-gray-900 dark:text-gray-100">Incidencias con entrega próxima (${REMINDER_DELIVERY_DAYS} día)</p>
                        <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">${getDeliveryDueActivities(REMINDER_DELIVERY_DAYS).length}</span>
                    </div>
                    <div class="mt-2 space-y-2">
                        ${due.length ? due.map(i => `
                            <div class="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                <div class="flex items-start justify-between gap-2">
                                    <div class="min-w-0">
                                        <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${i.reporter_name || '—'} • ${i.department || '—'}</p>
                                        <p class="text-xs text-gray-600 dark:text-gray-400">
                                            Entrega: ${formatDate(i.delivery_date)} • ${getStatusText(i.task_status)} ${i.priority ? `• ${getPriorityText(i.priority)}` : ''}
                                        </p>
                                    </div>
                                    <span class="text-xs font-semibold text-orange-700 dark:text-orange-300 whitespace-nowrap">${formatWhen(i.__days)}</span>
                                </div>
                            </div>
                        `).join('') : `<p class="text-xs text-gray-600 dark:text-gray-400">No hay entregas próximas.</p>`}
                    </div>
                </div>
            </div>
        </div>
    `;

    Swal.fire({
        icon: 'info',
        title: 'Notificaciones',
        html,
        showCancelButton: true,
        confirmButtonText: 'Ver incidencias',
        cancelButtonText: 'Cerrar'
    }).then((r) => {
        if (r.isConfirmed) window.showSection('activities');
    });
};

// Dashboard Functions
async function loadDashboardData() {
    try {
        // Load statistics (Incidencias)
        const { data: activities, error } = await supabase
            .from('activities')
            .select('*');

        if (error) throw error;

        activitiesData = activities || [];

        // Load events (para pendientes)
        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('*')
            .order('event_date', { ascending: true });
        if (eventsError) throw eventsError;
        eventsData = events || [];

        // Calculate statistics
        const total = activitiesData.length;
        const pending = activitiesData.filter(a => a.task_status === 'pendiente').length;
        const inProgress = activitiesData.filter(a => a.task_status === 'en_proceso').length;
        const completed = activitiesData.filter(a => a.task_status === 'completado').length;
        const canceled = activitiesData.filter(a => a.task_status === 'cancelado').length;

        // Update stats
        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-pending').textContent = pending;
        document.getElementById('stat-completed').textContent = completed;
        document.getElementById('stat-in-progress').textContent = inProgress;
        const canceledEl = document.getElementById('stat-canceled');
        if (canceledEl) canceledEl.textContent = String(canceled);

        // Resumen de mantenimiento (preventivo/correctivo)
        const prev = activitiesData.filter(a => a.service_type === 'Mantenimiento preventivo');
        const corr = activitiesData.filter(a => a.service_type === 'Mantenimiento correctivo');
        const prevPending = prev.filter(a => a.task_status === 'pendiente').length;
        const corrPending = corr.filter(a => a.task_status === 'pendiente').length;

        const prevTotalEl = document.getElementById('stat-maint-prev-total');
        const prevPendingEl = document.getElementById('stat-maint-prev-pending');
        const corrTotalEl = document.getElementById('stat-maint-corr-total');
        const corrPendingEl = document.getElementById('stat-maint-corr-pending');
        if (prevTotalEl) prevTotalEl.textContent = String(prev.length);
        if (prevPendingEl) prevPendingEl.textContent = String(prevPending);
        if (corrTotalEl) corrTotalEl.textContent = String(corr.length);
        if (corrPendingEl) corrPendingEl.textContent = String(corrPending);

        // Update charts
        updateCharts();

        // Load recent activities
        loadRecentActivities();

        // Load pending events
        loadPendingEvents();

        // Notificaciones reales
        updateNotificationBadge();
        renderDashboardReminders();
        renderDashboardInsights();

        // Estadísticas para sección de reportes
        updateReportStats();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateReportStats() {
    const container = document.getElementById('report-stats');
    if (!container) return;

    const totalInc = activitiesData.length;
    const pendingInc = activitiesData.filter(a => a.task_status === 'pendiente').length;
    const inProgressInc = activitiesData.filter(a => a.task_status === 'en_proceso').length;
    const completedInc = activitiesData.filter(a => a.task_status === 'completado').length;
    const canceledInc = activitiesData.filter(a => a.task_status === 'cancelado').length;

    const prev = activitiesData.filter(a => a.service_type === 'Mantenimiento preventivo');
    const corr = activitiesData.filter(a => a.service_type === 'Mantenimiento correctivo');

    const totalEv = eventsData.length;
    const pendingEv = eventsData.filter(e => e.status === 'pendiente').length;

    container.innerHTML = `
        <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">Incidencias</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">${totalInc}</p>
            <div class="grid grid-cols-4 gap-2 mt-3 text-xs">
                <div class="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-2">
                    <p class="text-orange-600 dark:text-orange-300 font-semibold">${pendingInc}</p>
                    <p class="text-gray-600 dark:text-gray-400">Pendientes</p>
                </div>
                <div class="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2">
                    <p class="text-blue-600 dark:text-blue-300 font-semibold">${inProgressInc}</p>
                    <p class="text-gray-600 dark:text-gray-400">En proceso</p>
                </div>
                <div class="rounded-lg bg-green-50 dark:bg-green-900/20 p-2">
                    <p class="text-green-600 dark:text-green-300 font-semibold">${completedInc}</p>
                    <p class="text-gray-600 dark:text-gray-400">Completadas</p>
                </div>
                <div class="rounded-lg bg-gray-100 dark:bg-gray-800 p-2">
                    <p class="text-gray-700 dark:text-gray-200 font-semibold">${canceledInc}</p>
                    <p class="text-gray-600 dark:text-gray-400">Canceladas</p>
                </div>
            </div>
        </div>

        <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">Mantenimiento</p>
            <div class="grid grid-cols-2 gap-3 mt-3 text-sm">
                <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                    <p class="font-semibold text-gray-900 dark:text-white">Preventivo</p>
                    <p class="text-xs text-gray-600 dark:text-gray-400">Total: <span class="font-semibold">${prev.length}</span></p>
                </div>
                <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                    <p class="font-semibold text-gray-900 dark:text-white">Correctivo</p>
                    <p class="text-xs text-gray-600 dark:text-gray-400">Total: <span class="font-semibold">${corr.length}</span></p>
                </div>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-400 mt-3">Usa los botones de “Reporte preventivo/correctivo” para exportar por tipo.</p>
        </div>

        <div class="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">Eventos</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">${totalEv}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400 mt-2">Pendientes: <span class="font-semibold text-orange-500">${pendingEv}</span></p>
        </div>
    `;
}

function loadPendingEvents() {
    const container = document.getElementById('pending-events');
    const stat = document.getElementById('stat-events-pending');
    if (!container || !stat) return;

    const pendingEvents = eventsData
        .filter((e) => e.status === 'pendiente')
        .sort((a, b) => {
            const ad = `${a.event_date || ''} ${a.event_time || ''}`.trim();
            const bd = `${b.event_date || ''} ${b.event_time || ''}`.trim();
            return ad.localeCompare(bd);
        });

    stat.textContent = String(pendingEvents.length);

    const top = pendingEvents.slice(0, 5);
    if (top.length === 0) {
        container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No hay eventos pendientes</p>';
        return;
    }

    container.innerHTML = top.map((ev) => `
        <div class="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
            <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">${ev.title}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                    ${formatDate(ev.event_date)} ${ev.event_time ? `• ${ev.event_time}` : ''} ${ev.location ? `• ${ev.location}` : ''}
                </p>
            </div>
            <span class="badge badge-${getBadgeClass(ev.status)}">${getStatusText(ev.status)}</span>
        </div>
    `).join('');
}

function updateCharts() {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#111827';
    const gridColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(17,24,39,0.08)';

    // Status Chart
    const statusEl = document.getElementById('chart-status');
    if (!statusEl) return;
    const statusCtx = statusEl.getContext('2d');

    if (charts.status) {
        charts.status.destroy();
    }

    const pending = activitiesData.filter(a => a.task_status === 'pendiente').length;
    const inProgress = activitiesData.filter(a => a.task_status === 'en_proceso').length;
    const completed = activitiesData.filter(a => a.task_status === 'completado').length;
    const canceled = activitiesData.filter(a => a.task_status === 'cancelado').length;

    charts.status = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Pendientes', 'En Proceso', 'Completadas', 'Canceladas'],
            datasets: [{
                data: [pending, inProgress, completed, canceled],
                backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#6b7280'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        boxWidth: 10,
                        boxHeight: 10,
                        padding: 14
                    }
                }
            }
        }
    });

    // Services Chart
    const servicesEl = document.getElementById('chart-services');
    if (!servicesEl) return;
    const servicesCtx = servicesEl.getContext('2d');

    if (charts.services) {
        charts.services.destroy();
    }

    const servicesCount = {};
    activitiesData.forEach(a => {
        servicesCount[a.service_type] = (servicesCount[a.service_type] || 0) + 1;
    });

    const labels = Object.keys(servicesCount);
    const data = Object.values(servicesCount);

    charts.services = new Chart(servicesCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cantidad',
                data: data,
                backgroundColor: isDark ? '#ffffff' : '#000000',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { display: false }
                }
            }
        }
    });

    // Trend Chart (últimos 14 días)
    const trendEl = document.getElementById('chart-trend');
    if (trendEl) {
        const trendCtx = trendEl.getContext('2d');
        if (charts.trend) charts.trend.destroy();

        const today = toDateOnly(new Date());
        const days = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
            days.push(d);
        }
        const labelsTrend = days.map((d) => {
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${dd}/${mm}`;
        });
        const mapCount = new Map(days.map((d) => [d.getTime(), 0]));
        (activitiesData || []).forEach((a) => {
            const dt = toDateOnly(a.date);
            if (!dt) return;
            const key = dt.getTime();
            if (mapCount.has(key)) mapCount.set(key, (mapCount.get(key) || 0) + 1);
        });
        const dataTrend = days.map((d) => mapCount.get(d.getTime()) || 0);

        charts.trend = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: labelsTrend,
                datasets: [{
                    label: 'Incidencias',
                    data: dataTrend,
                    borderColor: isDark ? '#ffffff' : '#111827',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(17,24,39,0.10)',
                    tension: 0.35,
                    fill: true,
                    pointRadius: 2,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Top departamentos (barras)
    const depEl = document.getElementById('chart-departments');
    if (depEl) {
        const depCtx = depEl.getContext('2d');
        if (charts.departments) charts.departments.destroy();

        const counts = {};
        (activitiesData || []).forEach((a) => {
            const key = String(a.department || 'Sin especificar').trim() || 'Sin especificar';
            counts[key] = (counts[key] || 0) + 1;
        });
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const labelsDep = entries.map(([k]) => (k.length > 18 ? k.slice(0, 18) + '…' : k));
        const dataDep = entries.map(([, v]) => v);

        charts.departments = new Chart(depCtx, {
            type: 'bar',
            data: {
                labels: labelsDep,
                datasets: [{
                    label: 'Cantidad',
                    data: dataDep,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.9)' : '#111827',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

function loadRecentActivities() {
    const container = document.getElementById('recent-activities');
    const recent = activitiesData.slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No hay incidencias recientes</p>';
        return;
    }

    container.innerHTML = recent.map(activity => `
        <div class="activity-item relative pl-6 py-2">
            <div class="activity-dot" style="color: ${getStatusColor(activity.task_status)}"></div>
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">${activity.reporter_name}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${activity.description.substring(0, 50)}...</p>
                </div>
                <div class="text-right">
                    <span class="badge badge-${getBadgeClass(activity.task_status)}">${getStatusText(activity.task_status)}</span>
                    <p class="text-xs text-gray-400 mt-1">${formatDate(activity.date)}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Activities Functions
async function loadActivities() {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        activitiesData = data || [];
        renderActivitiesTable();
        updateNotificationBadge();

    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

function renderActivitiesTable() {
    const tbody = document.getElementById('table-activities');
    const searchText = document.getElementById('search-activities').value.toLowerCase();
    const filterStatus = document.getElementById('filter-status').value;
    const filterService = (document.getElementById('filter-service-type')?.value || '').trim();
    const filterPriority = (document.getElementById('filter-priority')?.value || '').trim();

    let filtered = activitiesData;

    if (searchText) {
        filtered = filtered.filter(a =>
            a.reporter_name.toLowerCase().includes(searchText) ||
            a.department.toLowerCase().includes(searchText) ||
            a.description.toLowerCase().includes(searchText) ||
            (a.coordination || '').toLowerCase().includes(searchText) ||
            (a.assigned_to || '').toLowerCase().includes(searchText)
        );
    }

    if (filterStatus) {
        filtered = filtered.filter(a => a.task_status === filterStatus);
    }
    if (filterService) {
        filtered = filtered.filter((a) => (a.service_type || '') === filterService);
    }
    if (filterPriority) {
        filtered = filtered.filter((a) => String(a.priority || 'media') === filterPriority);
    }

    // Summary cards
    renderActivitiesSummary(filtered);

    // Cache count for pagination controls
    window.__activitiesFilteredCount = filtered.length;

    // Pagination
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = filtered.slice(start, end);

    // Update pagination info
    document.getElementById('showing-start').textContent = filtered.length > 0 ? start + 1 : 0;
    document.getElementById('showing-end').textContent = Math.min(end, filtered.length);
    document.getElementById('total-records').textContent = filtered.length;
    document.getElementById('current-page').textContent = `Página ${currentPage}`;

    if (paginated.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron actividades
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = paginated.map(activity => {
        const canEdit = Boolean(currentUser) && (
            currentUser.role === 'admin' ||
            currentUser.role === 'coordinator' ||
            (activity.user_id && activity.user_id === currentUser.id)
        );
        const canDelete = Boolean(currentUser) && currentUser.role === 'admin';
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
                    ${canDelete ? `
                        <button onclick="deleteActivity('${activity.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-red-500" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

function renderActivitiesSummary(list = []) {
    const el = document.getElementById('activities-summary');
    if (!el) return;

    const today = new Date().toISOString().split('T')[0];
    const isOpen = (a) => !['completado', 'cancelado'].includes(String(a.task_status || '').toLowerCase());
    const overdue = (a) => isOpen(a) && a.delivery_date && String(a.delivery_date).slice(0, 10) < today;
    const dueSoon = (a) => isOpen(a) && a.delivery_date && (String(a.delivery_date).slice(0, 10) === today);

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

window.clearActivitiesFilters = function () {
    const s = document.getElementById('search-activities');
    const st = document.getElementById('filter-status');
    const sv = document.getElementById('filter-service-type');
    const pr = document.getElementById('filter-priority');
    if (s) s.value = '';
    if (st) st.value = '';
    if (sv) sv.value = '';
    if (pr) pr.value = '';
    currentPage = 1;
    renderActivitiesTable();
};

window.filterActivities = function() {
    currentPage = 1;
    renderActivitiesTable();
};

window.prevPage = function() {
    if (currentPage > 1) {
        currentPage--;
        renderActivitiesTable();
    }
};

window.nextPage = function() {
    const total = Number(window.__activitiesFilteredCount ?? activitiesData.length);
    const totalPages = Math.ceil(total / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderActivitiesTable();
    }
};

// Activity Modal Functions
window.showActivityModal = function() {
    document.getElementById('modal-activity').classList.remove('hidden');
    document.getElementById('modal-activity').classList.add('show');
    document.getElementById('modal-activity-title').textContent = 'Nueva incidencia';
    document.getElementById('form-activity').reset();
    document.getElementById('activity-id').value = '';

    // Set default values
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0].substring(0, 5);
    document.getElementById('act-date').value = today;
    document.getElementById('act-time').value = now;
    const receivedEl = document.getElementById('act-received-date');
    if (receivedEl) receivedEl.value = today;
};

window.closeActivityModal = function() {
    document.getElementById('modal-activity').classList.remove('show');
    setTimeout(() => {
        document.getElementById('modal-activity').classList.add('hidden');
    }, 300);
};

window.editActivity = async function(id) {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('modal-activity').classList.remove('hidden');
        document.getElementById('modal-activity').classList.add('show');
        document.getElementById('modal-activity-title').textContent = 'Editar Actividad';

        document.getElementById('activity-id').value = data.id;
        document.getElementById('act-date').value = data.date;
        document.getElementById('act-time').value = data.time;
        const receivedEl = document.getElementById('act-received-date');
        if (receivedEl) receivedEl.value = data.received_date || data.date || '';
        const deliveryEl = document.getElementById('act-delivery-date');
        if (deliveryEl) deliveryEl.value = data.delivery_date || '';
        document.getElementById('act-reporter').value = data.reporter_name;
        document.getElementById('act-department').value = data.department;
        const coordinationEl = document.getElementById('act-coordination');
        if (coordinationEl) coordinationEl.value = data.coordination || '';
        const priorityEl = document.getElementById('act-priority');
        if (priorityEl) priorityEl.value = data.priority || 'media';
        document.getElementById('act-brand').value = data.brand || '';
        document.getElementById('act-model').value = data.model || '';
        document.getElementById('act-serial').value = data.serial_number || '';
        document.getElementById('act-os').value = data.operating_system || '';
        document.getElementById('act-ram').value = data.ram || '';
        document.getElementById('act-storage').value = data.storage || '';
        document.getElementById('act-user-equipo').value = data.user_equipo || '';
        document.getElementById('act-description').value = data.description;
        document.getElementById('act-assigned').value = data.assigned_to || '';
        document.getElementById('act-service-type').value = data.service_type;
        document.getElementById('act-diagnosis').value = data.diagnosis || '';
        document.getElementById('act-equipment-status').value = data.equipment_status;
        document.getElementById('act-evaluation').value = data.evaluation;
        document.getElementById('act-task-status').value = data.task_status;
        document.getElementById('act-observations').value = data.observations || '';

    } catch (error) {
        console.error('Error loading activity:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la actividad'
        });
    }
};

window.viewActivity = async function (id) {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const canEdit = Boolean(currentUser) && (
            currentUser.role === 'admin' ||
            currentUser.role === 'coordinator' ||
            (data.user_id && data.user_id === currentUser.id)
        );
        const canDeliver = canEdit && !['completado', 'cancelado'].includes(String(data.task_status || '').toLowerCase());

        const html = `
            <div style="text-align:left">
                <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
                    <div style="font-weight:700">Incidencia</div>
                    <div><span class="badge badge-${getBadgeClass(data.task_status)}">${getStatusText(data.task_status)}</span></div>
                </div>
                <div style="margin-top:10px;font-size:12px;color:#6b7280">
                    Recibido: <b>${formatDate(data.received_date || data.date)}</b>
                    ${data.delivery_date ? ` · Entrega: <b>${formatDate(data.delivery_date)}</b>` : ''}
                    · Prioridad: <b>${getPriorityText(data.priority)}</b>
                </div>
                <div style="margin-top:12px;padding:10px;border:1px solid #e5e7eb;border-radius:12px">
                    <div style="font-weight:600">${data.reporter_name || '—'}</div>
                    <div style="font-size:12px;color:#6b7280">${data.department || '—'}${data.coordination ? ` · ${data.coordination}` : ''}</div>
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
                ${data.observations ? `
                    <div style="margin-top:12px">
                        <div style="font-weight:700;margin-bottom:6px">Observaciones</div>
                        <div style="white-space:pre-wrap;font-size:13px;color:#111827">${(data.observations || '').trim()}</div>
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
            cancelButtonText: 'Cerrar'
        }).then((r) => {
            if (r.isConfirmed) window.exportActivityPDF(id);
            if (r.isDenied) window.markDelivered(id);
        });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el detalle.' });
    }
};

window.markDelivered = async function (id) {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select('id, user_id, reporter_name, department, received_date, date, task_status')
            .eq('id', id)
            .single();
        if (error) throw error;

        const canEdit = Boolean(currentUser) && (
            currentUser.role === 'admin' ||
            currentUser.role === 'coordinator' ||
            (data.user_id && data.user_id === currentUser.id)
        );
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
                text: 'La fecha de recibido es posterior a hoy. Corrige la fecha de recibido antes de marcar entregado.'
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
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;

        const { error: upErr } = await supabase
            .from('activities')
            .update({
                task_status: 'completado',
                delivery_date: today
            })
            .eq('id', id);
        if (upErr) throw upErr;

        await loadActivities();
        await loadDashboardData();

        Swal.fire({
            icon: 'success',
            title: 'Entregado',
            text: 'Se marcó como completado y se guardó la fecha de entrega (hoy).',
            timer: 1800,
            showConfirmButton: false
        });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo marcar como entregado.' });
    }
};

// =========================
// Datos de muestra (Incidencias)
// =========================
function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function addDays(baseDate, deltaDays) {
    const d = new Date(baseDate.getTime());
    d.setDate(d.getDate() + deltaDays);
    return d;
}

function isoDate(d) {
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
}

window.seedSampleActivities = async function () {
    try {
        if (!currentUser) return;
        if (!(currentUser.role === 'admin' || currentUser.role === 'coordinator')) {
            Swal.fire({ icon: 'error', title: 'Sin permiso', text: 'Solo admin/coordinador puede cargar datos de muestra.' });
            return;
        }

        const result = await Swal.fire({
            icon: 'question',
            title: 'Cargar datos de muestra',
            text: 'Se crearán 15 incidencias de ejemplo para probar filtros, dashboard y reportes. Luego puedes borrarlas con “Borrar muestra”.',
            showCancelButton: true,
            confirmButtonText: 'Cargar 15',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;

        showLoader();

        const departments = [
            'Facultad de Ingeniería', 'Biblioteca Central', 'Servicios Escolares', 'Rectoría',
            'Laboratorio de Cómputo', 'Posgrado', 'Contabilidad', 'Recursos Humanos'
        ];
        const serviceTypes = [
            'Mantenimiento preventivo', 'Mantenimiento correctivo', 'Reparación de equipos', 'Booteos',
            'Soporte WiFi UMICH', 'Soporte en eventos', 'Configuración de impresoras', 'Instalación de software',
            'Actualización de equipos'
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
            const delivery = status === 'completado'
                ? addDays(received, Math.floor(Math.random() * 4))
                : (Math.random() < 0.35 ? addDays(today, (Math.random() < 0.5 ? 0 : 1)) : null);

            const problemPool = [
                'Equipo no enciende / se apaga solo',
                'No hay acceso a internet (WiFi UMICH)',
                'Pantalla azul (BSOD) al iniciar',
                'Instalación de Office y activación',
                'Impresora no imprime / cola detenida',
                'Actualización de drivers y mantenimiento',
                'Equipo lento por almacenamiento lleno',
                'Soporte para proyector en evento',
                'Cambio de pasta térmica y limpieza'
            ];

            return {
                user_id: currentUser.id,
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
                evaluation: null
            };
        };

        const rows = Array.from({ length: 15 }, (_, i) => makeOne(i));

        const { error } = await supabase.from('activities').insert(rows);
        if (error) throw error;

        await loadActivities();
        await loadDashboardData();

        Swal.fire({ icon: 'success', title: 'Listo', text: 'Se cargaron 15 incidencias de muestra.', timer: 1800, showConfirmButton: false });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudieron crear los registros de muestra.' });
    } finally {
        hideLoader();
    }
};

window.clearSampleActivities = async function () {
    try {
        if (!currentUser) return;
        if (!(currentUser.role === 'admin' || currentUser.role === 'coordinator')) {
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
            cancelButtonText: 'Cancelar'
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

        await loadActivities();
        await loadDashboardData();
        Swal.fire({ icon: 'success', title: 'Borrado', text: `Se eliminaron ${ids.length} registros de muestra.`, timer: 1800, showConfirmButton: false });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudieron borrar los registros de muestra.' });
    } finally {
        hideLoader();
    }
};

window.exportActivityPDF = async function (id) {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const shortId = String(data.id || '').slice(0, 8) || 'incidencia';
        return window.exportPDF('activities', {
            title: `Reporte de Incidencia`,
            filenamePrefix: `incidencia_${shortId}`,
            rows: [data]
        });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el PDF individual.' });
    }
};

window.deleteActivity = async function(id) {
    try {
        if (!currentUser || currentUser.role !== 'admin') {
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
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const { error } = await supabase
                .from('activities')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await loadActivities();
            await loadDashboardData();

            Swal.fire({
                icon: 'success',
                title: 'Eliminada',
                text: 'La actividad ha sido eliminada',
                timer: 2000,
                showConfirmButton: false
            });
        }

    } catch (error) {
        console.error('Error deleting activity:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo eliminar la actividad'
        });
    }
};

async function handleActivitySubmit(e) {
    e.preventDefault();

    try {
        showLoader();

        const id = document.getElementById('activity-id').value;

        const receivedDate = (document.getElementById('act-received-date')?.value || '').trim();
        const deliveryDate = (document.getElementById('act-delivery-date')?.value || '').trim();
        if (receivedDate && deliveryDate && deliveryDate < receivedDate) {
            Swal.fire({ icon: 'error', title: 'Fechas inválidas', text: 'La fecha de entrega no puede ser anterior a la fecha de recibido.' });
            hideLoader();
            return;
        }

        const activityData = {
            date: document.getElementById('act-date').value,
            time: document.getElementById('act-time').value,
            received_date: receivedDate || document.getElementById('act-date').value,
            delivery_date: deliveryDate || null,
            reporter_name: document.getElementById('act-reporter').value,
            department: document.getElementById('act-department').value,
            coordination: (document.getElementById('act-coordination')?.value || '').trim() || null,
            priority: (document.getElementById('act-priority')?.value || 'media').trim(),
            brand: document.getElementById('act-brand').value,
            model: document.getElementById('act-model').value,
            serial_number: document.getElementById('act-serial').value || null,
            operating_system: document.getElementById('act-os').value || null,
            ram: document.getElementById('act-ram').value || null,
            storage: document.getElementById('act-storage').value || null,
            user_equipo: document.getElementById('act-user-equipo').value || null,
            description: document.getElementById('act-description').value,
            assigned_to: document.getElementById('act-assigned').value || null,
            service_type: document.getElementById('act-service-type').value,
            diagnosis: document.getElementById('act-diagnosis').value || null,
            equipment_status: document.getElementById('act-equipment-status').value,
            evaluation: document.getElementById('act-evaluation').value,
            task_status: document.getElementById('act-task-status').value,
            observations: document.getElementById('act-observations').value || null,
            user_id: currentUser.id
        };

        let error;
        if (id) {
            // Update
            const result = await supabase
                .from('activities')
                .update(activityData)
                .eq('id', id);
            error = result.error;
        } else {
            // Insert
            const result = await supabase
                .from('activities')
                .insert(activityData);
            error = result.error;
        }

        if (error) throw error;

        closeActivityModal();
        await loadActivities();
        await loadDashboardData();

        Swal.fire({
            icon: 'success',
            title: id ? 'Actualizada' : 'Registrada',
            text: id ? 'La actividad ha sido actualizada' : 'La actividad ha sido registrada',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('Error saving activity:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo guardar la actividad'
        });
    } finally {
        hideLoader();
    }
}

// Events Functions
async function loadEvents() {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('event_date', { ascending: true });

        if (error) throw error;

        eventsData = data || [];
        filterEvents();
        updateNotificationBadge();

    } catch (error) {
        console.error('Error loading events:', error);
    }
}

function renderEventsGrid(list = eventsData) {
    const grid = document.getElementById('events-grid');

    if (!list || list.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">No hay eventos registrados</div>';
        return;
    }

    grid.innerHTML = list.map(event => {
        const canEdit = Boolean(currentUser) && (
            currentUser.role === 'admin' ||
            currentUser.role === 'coordinator' ||
            (event.user_id && event.user_id === currentUser.id)
        );
        const canDelete = Boolean(currentUser) && currentUser.role === 'admin';

        return `
        <div class="event-card bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div class="p-6">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${event.title}</h3>
                    <span class="badge badge-${getBadgeClass(event.status)}">${getStatusText(event.status)}</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">${event.description || 'Sin descripción'}</p>
                ${event.observations ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-4"><b>Observaciones:</b> ${(event.observations || '').slice(0, 140)}${(event.observations || '').length > 140 ? '…' : ''}</p>` : ''}
                <div class="space-y-2 text-sm">
                    <div class="flex items-center text-gray-700 dark:text-gray-300">
                        <i class="fas fa-calendar w-5 text-gray-400"></i>
                        <span>${formatDate(event.event_date)}${event.event_time ? ' - ' + event.event_time : ''}</span>
                    </div>
                    ${event.location ? `
                        <div class="flex items-center text-gray-700 dark:text-gray-300">
                            <i class="fas fa-map-marker-alt w-5 text-gray-400"></i>
                            <span>${event.location}</span>
                        </div>
                    ` : ''}
                    ${event.assigned_to ? `
                        <div class="flex items-center text-gray-700 dark:text-gray-300">
                            <i class="fas fa-user w-5 text-gray-400"></i>
                            <span>${event.assigned_to}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    ${canEdit ? `
                        <button onclick="editEvent('${event.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-blue-500" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    ${canDelete ? `
                        <button onclick="deleteEvent('${event.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-red-500">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    }).join('');
}

window.filterEvents = function () {
    const searchText = (document.getElementById('search-events')?.value || '').toLowerCase();
    const filterStatus = document.getElementById('filter-events-status')?.value || '';

    let filtered = eventsData;
    if (searchText) {
        filtered = filtered.filter((e) =>
            (e.title || '').toLowerCase().includes(searchText) ||
            (e.description || '').toLowerCase().includes(searchText) ||
            (e.observations || '').toLowerCase().includes(searchText) ||
            (e.location || '').toLowerCase().includes(searchText) ||
            (e.assigned_to || '').toLowerCase().includes(searchText)
        );
    }
    if (filterStatus) filtered = filtered.filter((e) => e.status === filterStatus);

    renderEventsGrid(filtered);
};

window.showEventModal = function() {
    document.getElementById('modal-event').classList.remove('hidden');
    document.getElementById('modal-event').classList.add('show');
    document.getElementById('modal-event-title').textContent = 'Nuevo evento';
    document.getElementById('form-event').reset();
    document.getElementById('event-id').value = '';

    // Defaults
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0].substring(0, 5);
    const dateEl = document.getElementById('evt-date');
    const timeEl = document.getElementById('evt-time');
    if (dateEl) dateEl.value = today;
    if (timeEl) timeEl.value = now;
};

window.closeEventModal = function() {
    document.getElementById('modal-event').classList.remove('show');
    setTimeout(() => {
        document.getElementById('modal-event').classList.add('hidden');
    }, 300);
};

window.editEvent = async function(id) {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('modal-event').classList.remove('hidden');
        document.getElementById('modal-event').classList.add('show');
        document.getElementById('modal-event-title').textContent = 'Editar Evento';

        document.getElementById('event-id').value = data.id;
        document.getElementById('evt-title').value = data.title;
        document.getElementById('evt-description').value = data.description || '';
        document.getElementById('evt-date').value = data.event_date;
        document.getElementById('evt-time').value = data.event_time || '';
        document.getElementById('evt-location').value = data.location || '';
        document.getElementById('evt-status').value = data.status;
        document.getElementById('evt-assigned').value = data.assigned_to || '';
        const obs = document.getElementById('evt-observations');
        if (obs) obs.value = data.observations || '';

    } catch (error) {
        console.error('Error loading event:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar el evento'
        });
    }
};

window.deleteEvent = async function(id) {
    try {
        if (!currentUser || currentUser.role !== 'admin') {
            Swal.fire({ icon: 'error', title: 'Sin permiso', text: 'Solo el administrador puede eliminar eventos.' });
            return;
        }
        const result = await Swal.fire({
            title: '¿Eliminar evento?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await loadEvents();

            Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'El evento ha sido eliminado',
                timer: 2000,
                showConfirmButton: false
            });
        }

    } catch (error) {
        console.error('Error deleting event:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo eliminar el evento'
        });
    }
};

async function handleEventSubmit(e) {
    e.preventDefault();

    try {
        showLoader();

        const id = document.getElementById('event-id').value;
        const eventData = {
            title: document.getElementById('evt-title').value,
            description: document.getElementById('evt-description').value || null,
            event_date: document.getElementById('evt-date').value,
            event_time: document.getElementById('evt-time').value || null,
            location: document.getElementById('evt-location').value || null,
            status: document.getElementById('evt-status').value,
            assigned_to: document.getElementById('evt-assigned').value || null,
            observations: (document.getElementById('evt-observations')?.value || '').trim() || null,
            user_id: currentUser.id
        };

        let error;
        if (id) {
            const result = await supabase
                .from('events')
                .update(eventData)
                .eq('id', id);
            error = result.error;
        } else {
            const result = await supabase
                .from('events')
                .insert(eventData);
            error = result.error;
        }

        if (error) throw error;

        closeEventModal();
        await loadEvents();

        Swal.fire({
            icon: 'success',
            title: id ? 'Actualizado' : 'Registrado',
            text: id ? 'El evento ha sido actualizado' : 'El evento ha sido registrado',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('Error saving event:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo guardar el evento'
        });
    } finally {
        hideLoader();
    }
}

// Users Functions (Admin Only)
async function loadUsers() {
    if (!currentUser || currentUser.role !== 'admin') return;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        usersData = data || [];
        renderUsersTable();

    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUsersTable() {
    const tbody = document.getElementById('table-users');

    if (usersData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No hay usuarios registrados
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = usersData.map(user => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-gray-500 dark:text-gray-400"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-gray-900 dark:text-white">${user.full_name}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${user.email}</td>
            <td class="px-6 py-4">
                <span class="badge badge-${user.role}">${getRoleName(user.role)}</span>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}">
                    ${user.is_active ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="flex justify-center space-x-2">
                    <button onclick="editUser('${user.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-blue-500">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.showUserModal = function() {
    document.getElementById('modal-user').classList.remove('hidden');
    document.getElementById('modal-user').classList.add('show');
    document.getElementById('modal-user-title').textContent = 'Nuevo Usuario';
    document.getElementById('form-user').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-password-field').classList.remove('hidden');
};

window.closeUserModal = function() {
    document.getElementById('modal-user').classList.remove('show');
    setTimeout(() => {
        document.getElementById('modal-user').classList.add('hidden');
    }, 300);
};

window.editUser = async function(id) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('modal-user').classList.remove('hidden');
        document.getElementById('modal-user').classList.add('show');
        document.getElementById('modal-user-title').textContent = 'Editar Usuario';
        document.getElementById('user-password-field').classList.add('hidden');

        document.getElementById('user-id').value = data.id;
        document.getElementById('usr-name').value = data.full_name;
        document.getElementById('usr-email').value = data.email;
        document.getElementById('usr-role').value = data.role;
        document.getElementById('usr-active').checked = data.is_active;

    } catch (error) {
        console.error('Error loading user:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar el usuario'
        });
    }
};

async function handleUserSubmit(e) {
    e.preventDefault();

    if (!currentUser || currentUser.role !== 'admin') return;

    try {
        showLoader();

        const id = document.getElementById('user-id').value;
        const name = document.getElementById('usr-name').value;
        const email = document.getElementById('usr-email').value;
        const role = document.getElementById('usr-role').value;
        const isActive = document.getElementById('usr-active').checked;
        const password = document.getElementById('usr-password').value;

        if (!id) {
            // Create new user
            if (supabase.__local) {
                Swal.fire({
                    icon: 'info',
                    title: 'Requiere Supabase',
                    text: 'Para crear usuarios en la nube (practicantes/coordinadores), primero configura Supabase en Configuración.'
                });
                hideLoader();
                return;
            }

            if (!password) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'La contraseña es requerida para nuevos usuarios'
                });
                hideLoader();
                return;
            }

            // Crear auth user sin cambiar la sesión del administrador:
            // usamos un cliente temporal sin persistencia de sesión.
            const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
            });

            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name
                    }
                }
            });

            if (authError) throw authError;

            // Crear/actualizar profile (el trigger también lo crea, pero aquí definimos rol/activo)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    email: email,
                    full_name: name,
                    role: role,
                    is_active: isActive
                });

            if (profileError) throw profileError;

        } else {
            // Update existing user
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: name,
                    role: role,
                    is_active: isActive
                })
                .eq('id', id);

            if (error) throw error;
        }

        closeUserModal();
        await loadUsers();

        Swal.fire({
            icon: 'success',
            title: id ? 'Actualizado' : 'Creado',
            text: id ? 'El usuario ha sido actualizado' : 'El usuario ha sido creado',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('Error saving user:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo guardar el usuario'
        });
    } finally {
        hideLoader();
    }
}

// PDF Export Functions
window.exportPDF = async function(type, options = {}) {
    try {
        showLoader();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const signerName = (document.getElementById('report-signer-name')?.value || '').trim() || 'Ivan Fernandez Mandujano';
        const signerRole = (document.getElementById('report-signer-role')?.value || '').trim();
        const orgUnit = (document.getElementById('report-org-unit')?.value || localStorage.getItem(`${LOCAL_STORAGE_PREFIX}reportOrgUnit`) || '').trim();
        const faculty = (document.getElementById('report-faculty')?.value || localStorage.getItem(`${LOCAL_STORAGE_PREFIX}reportFaculty`) || '').trim();
        const signatureImage = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}signatureImage`);
        const logoUmich = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}reportLogoUmich`);
        const logoFaculty = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}reportLogoFaculty`);

        const headerBottomY = 44;

        const addHeader = () => {
            doc.setTextColor(0, 0, 0);

            // Logos (opcional)
            const logoH = 14;
            const logoY = 8;
            const leftX = 15;
            const rightX = pageWidth - 15 - 18;

            if (logoUmich) {
                try {
                    const format = logoUmich.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(logoUmich, format, leftX, logoY, 18, logoH);
                } catch { }
            }
            if (logoFaculty) {
                try {
                    const format = logoFaculty.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(logoFaculty, format, rightX, logoY, 18, logoH);
                } catch { }
            }

            doc.setFontSize(12);
            doc.text('Comisión de Servicios Informáticos', pageWidth / 2, 16, { align: 'center' });

            doc.setFontSize(18);
            doc.text('Hoja de Reportes', pageWidth / 2, 25, { align: 'center' });

            doc.setFontSize(9);
            if (orgUnit) doc.text(orgUnit, pageWidth / 2, 31, { align: 'center' });
            if (faculty) doc.text(faculty, pageWidth / 2, 36, { align: 'center' });

            doc.setTextColor(90);
            doc.text(`Generado: ${formatDate(new Date())}`, pageWidth / 2, 41, { align: 'center' });
            doc.setTextColor(0);
            doc.setDrawColor(220);
            doc.line(15, headerBottomY, pageWidth - 15, headerBottomY);
        };

        const addFooter = (pageNumber) => {
            const pageNum = pageNumber || doc.getCurrentPageInfo().pageNumber;
            doc.setDrawColor(230);
            doc.line(15, pageHeight - 14, pageWidth - 15, pageHeight - 14);
            doc.setFontSize(8);
            doc.setTextColor(120);
            doc.text('Bitácora Digital', 15, pageHeight - 8);
            doc.text(`Emitido: ${formatDate(new Date())}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
            doc.text(`Página ${pageNum}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
            doc.setTextColor(0);
        };

        if (type === 'activities') {
            const start = document.getElementById('report-date-start')?.value;
            const end = document.getElementById('report-date-end')?.value;
            const serviceTypeFilter = (options.serviceType || '').trim();
            const reportTitle = (options.title || '').trim() || (serviceTypeFilter
                ? `Reporte de ${serviceTypeFilter}`
                : 'Reporte de Incidencias');

            const inRange = (d) => {
                if (!d) return false;
                if (start && d < start) return false;
                if (end && d > end) return false;
                return true;
            };

            const base = Array.isArray(options.rows)
                ? options.rows
                : ((start || end)
                    ? activitiesData.filter((a) => inRange(a.date))
                    : [...activitiesData]);

            const rows = (serviceTypeFilter && !Array.isArray(options.rows))
                ? base.filter((a) => (a.service_type || '') === serviceTypeFilter)
                : base;

            addHeader();

            doc.setFontSize(12);
            const titleY = headerBottomY + 10;
            const metaY = titleY + 6;
            const tableStartY = metaY + 6;

            doc.text(reportTitle, 15, titleY);
            doc.setFontSize(9);
            const metaLine = Array.isArray(options.rows) && rows[0]
                ? `Recibido: ${formatDate(rows[0].received_date || rows[0].date)}${rows[0].delivery_date ? `  |  Entrega: ${formatDate(rows[0].delivery_date)}` : ''}${rows[0].priority ? `  |  Prioridad: ${getPriorityText(rows[0].priority)}` : ''}`
                : `Periodo: ${(start || '—')} a ${(end || '—')}  |  Total: ${rows.length}${serviceTypeFilter ? `  |  Filtro: ${serviceTypeFilter}` : ''}`;
            doc.text(metaLine, 15, metaY);

            const tableData = rows.map(a => ([
                formatDate(a.date),
                a.time || '-',
                a.reporter_name,
                a.department,
                `${a.brand || '-'} ${a.model || ''}`.trim(),
                a.serial_number || '-',
                a.operating_system || '-',
                a.service_type,
                getPriorityText(a.priority),
                getStatusText(a.task_status),
                a.assigned_to || '-'
            ]));

            doc.autoTable({
                startY: tableStartY,
                head: [[
                    'Fecha',
                    'Hora',
                    'Reportante',
                    'Departamento',
                    'Equipo',
                    'Serie',
                    'SO',
                    'Servicio',
                    'Prioridad',
                    'Estado',
                    'Responsable'
                ]],
                body: tableData,
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                headStyles: {
                    fillColor: [0, 0, 0],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                margin: { left: 10, right: 10, top: headerBottomY + 8 },
                didDrawPage: () => {
                    addHeader();
                    const pageNum = doc.getCurrentPageInfo().pageNumber;
                    addFooter(pageNum);
                }
            });

            // Estadísticas + firma
            let y = (doc.lastAutoTable?.finalY || 55) + 10;
            if (y > pageHeight - 70) {
                doc.addPage();
                addHeader();
                addFooter();
                y = headerBottomY + 10;
            }

            const stats = {
                total: rows.length,
                pendientes: rows.filter(a => a.task_status === 'pendiente').length,
                enProceso: rows.filter(a => a.task_status === 'en_proceso').length,
                completadas: rows.filter(a => a.task_status === 'completado').length,
                canceladas: rows.filter(a => a.task_status === 'cancelado').length
            };

            doc.setTextColor(0);
            doc.setFontSize(11);
            doc.text('Estadísticas:', 15, y);
            doc.setFontSize(9);
            doc.text(`Total: ${stats.total}`, 25, y + 8);
            doc.text(`Pendientes: ${stats.pendientes}`, 25, y + 14);
            doc.text(`En Proceso: ${stats.enProceso}`, 25, y + 20);
            doc.text(`Completadas: ${stats.completadas}`, 25, y + 26);
            doc.text(`Canceladas: ${stats.canceladas}`, 25, y + 32);

            const sigY = y + 46;
            doc.setFontSize(11);
            doc.text('FIRMA:', 15, sigY);
            doc.setDrawColor(0);
            doc.line(15, sigY + 18, 95, sigY + 18);

            if (signatureImage) {
                try {
                    const format = signatureImage.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(signatureImage, format, 15, sigY + 3, 60, 14);
                } catch { }
            }

            doc.setFontSize(10);
            doc.text(signerName, 15, sigY + 26);
            if (signerRole) {
                doc.setFontSize(9);
                doc.setTextColor(80);
                doc.text(signerRole, 15, sigY + 32);
            }
        }

        if (type === 'events') {
            const start = document.getElementById('report-date-start')?.value;
            const end = document.getElementById('report-date-end')?.value;

            const inRange = (d) => {
                if (!d) return false;
                if (start && d < start) return false;
                if (end && d > end) return false;
                return true;
            };

            const rows = (start || end)
                ? eventsData.filter((e) => inRange(e.event_date))
                : [...eventsData];

            addHeader();
            doc.setFontSize(12);
            const titleY = headerBottomY + 10;
            const metaY = titleY + 6;
            const tableStartY = metaY + 6;

            doc.text('Reporte de Eventos', 15, titleY);
            doc.setFontSize(9);
            doc.text(
                `Periodo: ${(start || '—')} a ${(end || '—')}  |  Total: ${rows.length}`,
                15,
                metaY
            );

            const tableData = rows.map(e => ([
                formatDate(e.event_date),
                e.event_time || '-',
                e.title || '-',
                e.location || '-',
                getStatusText(e.status),
                e.assigned_to || '-'
            ]));

            doc.autoTable({
                startY: tableStartY,
                head: [[
                    'Fecha',
                    'Hora',
                    'Evento',
                    'Ubicación',
                    'Estado',
                    'Asignado'
                ]],
                body: tableData,
                styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 10, right: 10, top: headerBottomY + 8 },
                didDrawPage: () => {
                    addHeader();
                    const pageNum = doc.getCurrentPageInfo().pageNumber;
                    addFooter(pageNum);
                }
            });

            let y = (doc.lastAutoTable?.finalY || 55) + 10;
            if (y > pageHeight - 70) {
                doc.addPage();
                addHeader();
                addFooter();
                y = headerBottomY + 10;
            }

            const stats = {
                total: rows.length,
                pendientes: rows.filter(e => e.status === 'pendiente').length,
                enProceso: rows.filter(e => e.status === 'en_proceso').length,
                completados: rows.filter(e => e.status === 'completado').length,
                cancelados: rows.filter(e => e.status === 'cancelado').length
            };

            doc.setTextColor(0);
            doc.setFontSize(11);
            doc.text('Estadísticas:', 15, y);
            doc.setFontSize(9);
            doc.text(`Total: ${stats.total}`, 25, y + 8);
            doc.text(`Pendientes: ${stats.pendientes}`, 25, y + 14);
            doc.text(`En Proceso: ${stats.enProceso}`, 25, y + 20);
            doc.text(`Completados: ${stats.completados}`, 25, y + 26);
            doc.text(`Cancelados: ${stats.cancelados}`, 25, y + 32);

            const sigY = y + 46;
            doc.setFontSize(11);
            doc.text('FIRMA:', 15, sigY);
            doc.setDrawColor(0);
            doc.line(15, sigY + 18, 95, sigY + 18);

            if (signatureImage) {
                try {
                    const format = signatureImage.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(signatureImage, format, 15, sigY + 3, 60, 14);
                } catch { }
            }

            doc.setFontSize(10);
            doc.text(signerName, 15, sigY + 26);
            if (signerRole) {
                doc.setFontSize(9);
                doc.setTextColor(80);
                doc.text(signerRole, 15, sigY + 32);
            }
        }

        const prefix = (options.filenamePrefix || '').trim() || (type === 'events' ? 'reporte_eventos' : `reporte_${type}`);
        doc.save(`${prefix}_${new Date().toISOString().split('T')[0]}.pdf`);

        Swal.fire({
            icon: 'success',
            title: 'PDF Generado',
            text: 'El reporte ha sido descargado',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el PDF'
        });
    } finally {
        hideLoader();
    }
};

window.exportMaintenanceReport = function (kind) {
    const normalized = String(kind || '').toLowerCase();
    if (normalized === 'preventivo') {
        return window.exportPDF('activities', {
            serviceType: 'Mantenimiento preventivo',
            title: 'Reporte de Mantenimiento preventivo',
            filenamePrefix: 'reporte_mantenimiento_preventivo'
        });
    }
    if (normalized === 'correctivo') {
        return window.exportPDF('activities', {
            serviceType: 'Mantenimiento correctivo',
            title: 'Reporte de Mantenimiento correctivo',
            filenamePrefix: 'reporte_mantenimiento_correctivo'
        });
    }

    return window.exportPDF('activities');
};

// Helper Functions
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getStatusColor(status) {
    const colors = {
        pendiente: '#f59e0b',
        en_proceso: '#3b82f6',
        completado: '#10b981',
        cancelado: '#6b7280'
    };
    return colors[status] || '#6b7280';
}

function getStatusText(status) {
    const texts = {
        pendiente: 'Pendiente',
        en_proceso: 'En Proceso',
        completado: 'Completado',
        cancelado: 'Cancelado'
    };
    return texts[status] || status;
}

function getBadgeClass(status) {
    const classes = {
        pendiente: 'pending',
        en_proceso: 'in-progress',
        completado: 'completed',
        cancelado: 'canceled'
    };
    return classes[status] || '';
}

function getPriorityText(priority) {
    const p = String(priority || 'media').toLowerCase();
    const map = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' };
    return map[p] || 'Media';
}

// Make functions globally available
window.handleLogin = handleLogin;
window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.toggleDarkMode = toggleDarkMode;
window.showNotifications = showNotifications;
