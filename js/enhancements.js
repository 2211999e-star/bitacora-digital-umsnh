/**
 * enhancements.js
 * Mejoras adicionales, utilities y optimizaciones para la aplicación
 * - Funciones de búsqueda mejorada
 * - Caché de datos
 * - Optimización de rendimiento
 * - Mejoras de UX adicionales
 */

// ========== CACHE DE BÚSQUEDA ==========
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Búsqueda rápida con caché
 * @param {Array} haystack - Array de objetos para buscar
 * @param {string} query - Término de búsqueda
 * @param {Array<string>} fields - Campos donde buscar
 */
export function quickSearch(haystack, query, fields = []) {
  if (!query || query.trim() === '') return haystack;
  
  const cacheKey = `search_${query}_${fields.join(',')}`;
  
  // Verificar si está en caché
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.results;
    }
  }

  const q = query.toLowerCase().trim();
  const results = haystack.filter(item => {
    return fields.some(field => {
      const value = String(item[field] || '').toLowerCase();
      return value.includes(q);
    });
  });

  // Guardar en caché
  searchCache.set(cacheKey, {
    results,
    timestamp: Date.now()
  });

  return results;
}

// ========== DEBOUNCE PARA BÚSQUEDA EN TIEMPO REAL ==========
export function debounce(func, delayMs = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delayMs);
  };
}

// ========== OPTIMIZACIÓN DE TABLA CON VIRTUALIZATION ==========
export function virtualizeTableRows(containerSelector, itemHeight = 50, visibleRows = 10) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  let startIndex = 0;
  const maxItems = container.children.length;
  
  container.addEventListener('scroll', () => {
    const scrollTop = container.scrollTop;
    const newStartIndex = Math.floor(scrollTop / itemHeight);
    
    if (newStartIndex !== startIndex) {
      startIndex = newStartIndex;
      updateVisibleRows();
    }
  }, { passive: true });

  function updateVisibleRows() {
    const rows = Array.from(container.children);
    rows.forEach((row, index) => {
      const isVisible = index >= startIndex && index < startIndex + visibleRows + 2;
      row.style.display = isVisible ? '' : 'none';
    });
  }
}

// ========== FORMATEADOR DE NÚMEROS Y MONEDA ==========
export function formatCurrency(amount, locale = 'es-MX') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

// ========== ESTADÍSTICAS RÁPIDAS ==========
export function calculateStats(activities = []) {
  return {
    total: activities.length,
    pendiente: activities.filter(a => a.task_status === 'pendiente').length,
    en_proceso: activities.filter(a => a.task_status === 'en_proceso').length,
    completado: activities.filter(a => a.task_status === 'completado').length,
    cancelado: activities.filter(a => a.task_status === 'cancelado').length,
    preventivo: activities.filter(a => String(a.service_type || '').includes('preventivo')).length,
    correctivo: activities.filter(a => String(a.service_type || '').includes('correctivo')).length,
    alta_priority: activities.filter(a => ['alta', 'urgente'].includes(a.priority)).length,
  };
}

// ========== NOTIFICACIONES EN TIEMPO REAL ==========
export function scheduleNotificationCheck(callback, intervalMs = 10000) {
  const checkInterval = setInterval(callback, intervalMs);
  return () => clearInterval(checkInterval);
}

// ========== EXPORTADOR DE DATOS JSON ==========
export function exportJSON(filename, data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ========== VALIDADOR DE CAMPOS ==========
export const validators = {
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value) => /^\d{7,15}$/.test(value.replace(/\D/g, '')),
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  required: (value) => value && String(value).trim() !== '',
  minLength: (len) => (value) => String(value).length >= len,
  maxLength: (len) => (value) => String(value).length <= len,
  numeric: (value) => /^\d+$/.test(value),
  alphanumeric: (value) => /^[a-zA-Z0-9]+$/.test(value),
};

// ========== HISTORIAL LOCAL MEJORADO ==========
export class LocalHistory {
  constructor(prefix = 'app_history_') {
    this.prefix = prefix;
    this.maxItems = 50;
  }

  add(category, item) {
    const key = `${this.prefix}${category}`;
    const history = this.get(category) || [];
    
    // Evitar duplicados
    const filtered = history.filter(h => JSON.stringify(h) !== JSON.stringify(item));
    
    // Agregar al inicio y limitar tamaño
    filtered.unshift(item);
    filtered.splice(this.maxItems);
    
    localStorage.setItem(key, JSON.stringify(filtered));
  }

  get(category, limit = null) {
    const key = `${this.prefix}${category}`;
    try {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return limit ? data.slice(0, limit) : data;
    } catch {
      return [];
    }
  }

  clear(category) {
    const key = `${this.prefix}${category}`;
    localStorage.removeItem(key);
  }

  clearAll() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// ========== OBSERVADOR DE CAMBIOS CON DEBOUNCE ==========
export function observeElement(selector, callback, delay = 500) {
  const element = document.querySelector(selector);
  if (!element) return;

  let timeoutId;

  const observer = new MutationObserver((mutations) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(mutations), delay);
  });

  observer.observe(element, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true,
  });

  return () => observer.disconnect();
}

// ========== GENERADOR DE RESÚMENES ==========
export function generateSummary(text, maxWords = 50) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  
  return words.slice(0, maxWords).join(' ') + '...';
}

// ========== CONVERGENCIA DE ACTUALIZACIONES EN TIEMPO REAL ==========
export class DebouncedUpdate {
  constructor(callback, delay = 1000) {
    this.callback = callback;
    this.delay = delay;
    this.queue = [];
    this.timeoutId = null;
  }

  add(data) {
    this.queue.push(data);
    clearTimeout(this.timeoutId);
    
    this.timeoutId = setTimeout(() => {
      const merged = this.queue.reduce((acc, item) => {
        return { ...acc, ...item };
      }, {});
      
      this.callback(merged);
      this.queue = [];
    }, this.delay);
  }

  flush() {
    clearTimeout(this.timeoutId);
    if (this.queue.length > 0) {
      const merged = this.queue.reduce((acc, item) => {
        return { ...acc, ...item };
      }, {});
      
      this.callback(merged);
      this.queue = [];
    }
  }
}

// ========== PERFORMANCE MONITOR ==========
export class PerformanceMonitor {
  constructor(prefix = 'perf_') {
    this.prefix = prefix;
    this.marks = new Map();
  }

  start(label) {
    this.marks.set(label, performance.now());
  }

  end(label, shouldLog = true) {
    if (!this.marks.has(label)) return null;
    
    const duration = performance.now() - this.marks.get(label);
    this.marks.delete(label);
    
    if (shouldLog) {
      console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
}
