/**
 * utils.js
 * Utilidades compartidas (UI + formatos + estado global compartido por módulos)
 */

export const state = {
  currentUser: null,
  activitiesData: [],
  eventsData: [],
  usersData: [],
  currentPage: 1,
  itemsPerPage: 10,
  charts: {},
};

// -------------------------
// UI helpers
// -------------------------

export function hideLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;
  loader.style.opacity = '0';
  setTimeout(() => {
    loader.classList.add('hidden');
  }, 300);
}

export function showLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;
  loader.classList.remove('hidden');
  loader.style.opacity = '1';
}

// -------------------------
// Date helpers
// -------------------------

export function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysDiffFromToday(dateValue) {
  const d = toDateOnly(dateValue);
  if (!d) return null;
  const today = toDateOnly(new Date());
  const diffMs = d.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// -------------------------
// Status / badges
// -------------------------

export function getStatusColor(status) {
  const colors = {
    pendiente: '#f59e0b',
    en_proceso: '#3b82f6',
    completado: '#10b981',
    cancelado: '#6b7280',
  };
  return colors[status] || '#6b7280';
}

export function getStatusText(status) {
  const texts = {
    pendiente: 'Pendiente',
    en_proceso: 'En Proceso',
    completado: 'Completado',
    cancelado: 'Cancelado',
  };
  return texts[status] || status;
}

export function getBadgeClass(status) {
  const classes = {
    pendiente: 'pending',
    en_proceso: 'in-progress',
    completado: 'completed',
    cancelado: 'canceled',
  };
  return classes[status] || '';
}

export function getPriorityText(priority) {
  const p = String(priority || 'media').toLowerCase();
  const map = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' };
  return map[p] || 'Media';
}

// -------------------------
// Sample data helpers
// -------------------------

export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function addDays(baseDate, deltaDays) {
  const d = new Date(baseDate.getTime());
  d.setDate(d.getDate() + deltaDays);
  return d;
}

export function isoDate(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

