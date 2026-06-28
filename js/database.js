/**
 * database.js
 * Inicialización de Supabase y fallback local (localStorage).
 *
 * Importante:
 * - Si no hay URL/ANON KEY válidos, la app opera en modo offline.
 * - El objeto `supabase` expone `__local` para identificar el fallback.
 */

// Supabase JS se carga globalmente desde index.html
// Accesible como: window.supabase.createClient()

import { getSupabaseConfig, LOCAL_STORAGE_PREFIX, isForceOfflineEnabled, isReviewModeEnabled } from './config.js?v=1.7.1';

// Helper para obtener createClient en tiempo de ejecución
function getCreateClient() {
  return window?.supabase?.createClient;
}

// Exportar createClient para uso en otros módulos
export function createClient(url, anonKey, options) {
  const fn = getCreateClient();
  if (!fn) throw new Error('Supabase client library not loaded');
  return fn(url, anonKey, options);
}

export function isValidUrl(url) {
  try {
    return /^https?:\/\//.test(url) && Boolean(new URL(url));
  } catch {
    return false;
  }
}

export function createSupabaseFallback() {
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
            unsubscribe: () => {},
          },
        },
      }),
      signInWithPassword: async () => ({ error: new Error('Supabase no configurado') }),
      signOut: async () => {
        localStorage.removeItem(sessionKey);
        return { error: null };
      },
      signUp: async () => ({ error: new Error('Supabase no configurado') }),
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
    }),
  };
}

export function createSupabase() {
  // En modo revisión forzamos persistencia local para que no se alteren datos reales.
  if (isReviewModeEnabled()) return createSupabaseFallback();
  // Permite forzar modo offline aunque existan credenciales configuradas.
  if (isForceOfflineEnabled()) return createSupabaseFallback();
  const { url, anonKey } = getSupabaseConfig();
  if (isValidUrl(url) && anonKey) {
    const createClient = getCreateClient();
    if (!createClient) {
      console.warn('Supabase client library not loaded, falling back to localStorage');
      return createSupabaseFallback();
    }
    const client = createClient(url, anonKey);
    // Bandera para mantener la misma interfaz que el fallback
    client.__local = false;
    return client;
  }
  return createSupabaseFallback();
}
