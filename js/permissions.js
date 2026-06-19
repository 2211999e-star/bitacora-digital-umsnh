/**
 * permissions.js
 * Reglas de permisos en UI (no reemplaza políticas de seguridad en backend).
 */

export function isAdmin(user) {
  return Boolean(user) && user.role === 'admin';
}

export function isCoordinator(user) {
  return Boolean(user) && user.role === 'coordinator';
}

export function canEditOwnedOrRole(user, rowUserId) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'coordinator') return true;
  return Boolean(rowUserId) && rowUserId === user.id;
}

export function canDelete(user) {
  return Boolean(user) && user.role === 'admin';
}

/**
 * Permisos críticos (aprobación de usuarios, cambio de roles, configuración crítica).
 * @param {object|null} user
 * @param {string} primaryEmail
 * @returns {boolean}
 */
export function isPrimaryAdmin(user, primaryEmail = '22119993@umich.mx') {
  return Boolean(user) && user.role === 'admin' && String(user.email || '').toLowerCase() === String(primaryEmail).toLowerCase();
}
