/**
 * usuarios.js
 * Gestión de usuarios (profiles) - solo admin.
 */

import { state, showLoader, hideLoader } from './utils.js?v=1.5.4';
import { getSupabaseConfig, PRIMARY_ADMIN_EMAIL } from './config.js?v=1.5.4';
import { createClient } from './database.js?v=1.5.4';
import { isAdmin, isPrimaryAdmin } from './permissions.js?v=1.5.4';

export function getRoleName(role) {
  const roles = {
    admin: 'Administrador',
    coordinator: 'Coordinador',
    practitioner: 'Practicante',
  };
  return roles[role] || role;
}

export async function loadUsers({ supabase } = {}) {
  if (!isAdmin(state.currentUser)) return;

  try {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    state.usersData = data || [];
    renderUsersTable();
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

function getAccountStatus(profile = {}) {
  const raw = String(profile.account_status || '').toLowerCase().trim();
  if (raw === 'pending' || raw === 'approved' || raw === 'rejected' || raw === 'suspended') return raw;
  return profile.is_active === false ? 'suspended' : 'approved';
}

function getStatusPill(status) {
  const map = {
    pending: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' },
    approved: { label: 'Aprobado', cls: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' },
    rejected: { label: 'Rechazado', cls: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' },
    suspended: { label: 'Suspendido', cls: 'bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-200' },
  };
  return map[status] || map.approved;
}

function renderUsersTable() {
  const tbody = document.getElementById('table-users');
  if (!tbody) return;

  if (!state.usersData.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
          No hay usuarios registrados
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.usersData
    .map(
      (user) => {
        const status = getAccountStatus(user);
        const pill = getStatusPill(status);
        const canManage = isPrimaryAdmin(state.currentUser, PRIMARY_ADMIN_EMAIL);
        const actionButtons = [];
        if (canManage && status === 'pending') {
          actionButtons.push(`
              <button onclick="approveUser('${user.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-green-600" title="Aprobar">
                <i class="fas fa-check"></i>
              </button>
              <button onclick="rejectUser('${user.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-red-600" title="Rechazar">
                <i class="fas fa-xmark"></i>
              </button>
          `);
        }
        if (canManage && status === 'approved') {
          actionButtons.push(`
              <button onclick="suspendUser('${user.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" title="Suspender">
                <i class="fas fa-ban"></i>
              </button>
          `);
        }
        if (canManage && status === 'suspended') {
          actionButtons.push(`
              <button onclick="activateUser('${user.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-green-600" title="Reactivar">
                <i class="fas fa-circle-play"></i>
              </button>
          `);
        }
        if (canManage) {
          actionButtons.push(`
              <button onclick="editUser('${user.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-blue-500" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
          `);
        } else {
          actionButtons.push(`
              <span class="text-xs text-gray-500 dark:text-gray-400">Solo lectura</span>
          `);
        }
        return `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <td class="px-6 py-4">
          <div class="flex items-center">
            <div class="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <i class="fas fa-user text-gray-500 dark:text-gray-400"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-900 dark:text-white">${user.full_name || String(user.email || '').split('@')[0] || 'Usuario'}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${user.email}</td>
        <td class="px-6 py-4">
          <span class="badge badge-${user.role}">${getRoleName(user.role)}</span>
        </td>
        <td class="px-6 py-4">
          <span class="px-2 py-1 rounded text-xs font-semibold ${pill.cls}">${pill.label}</span>
        </td>
        <td class="px-6 py-4">
          <div class="flex justify-center space-x-2">
            ${actionButtons.join('')}
          </div>
        </td>
      </tr>
    `;},
    )
    .join('');
}

export function showUserModal() {
  if (!isPrimaryAdmin(state.currentUser, PRIMARY_ADMIN_EMAIL)) {
    Swal.fire({ icon: 'error', title: 'Sin permiso', text: 'Solo el administrador principal puede crear usuarios.' });
    return;
  }
  const modal = document.getElementById('modal-user');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('show');
  document.getElementById('modal-user-title').textContent = 'Nuevo Usuario';
  document.getElementById('form-user').reset();
  document.getElementById('user-id').value = '';
  document.getElementById('user-password-field').classList.remove('hidden');

  // Mejor UX: enfocar primer campo
  setTimeout(() => {
    document.getElementById('usr-name')?.focus?.();
  }, 0);
}

export function closeUserModal() {
  const modal = document.getElementById('modal-user');
  if (!modal) return;

  modal.classList.remove('show');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
}

export async function editUser({ supabase } = {}, id) {
  if (!isPrimaryAdmin(state.currentUser, PRIMARY_ADMIN_EMAIL)) {
    Swal.fire({ icon: 'info', title: 'Solo lectura', text: 'Solo el administrador principal puede editar usuarios.' });
    return;
  }
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) throw error;

    const modal = document.getElementById('modal-user');
    modal.classList.remove('hidden');
    modal.classList.add('show');
    document.getElementById('modal-user-title').textContent = 'Editar Usuario';
    document.getElementById('user-password-field').classList.add('hidden');

    document.getElementById('user-id').value = data.id;
    document.getElementById('usr-name').value = data.full_name;
    document.getElementById('usr-email').value = data.email;
    document.getElementById('usr-role').value = data.role;
    document.getElementById('usr-status').value = getAccountStatus(data);
  } catch (error) {
    console.error('Error loading user:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el usuario' });
  }
}

export async function handleUserSubmit({ supabase } = {}, e) {
  e.preventDefault();

  if (!isPrimaryAdmin(state.currentUser, PRIMARY_ADMIN_EMAIL)) {
    Swal.fire({ icon: 'error', title: 'Sin permiso', text: 'Solo el administrador principal puede administrar usuarios.' });
    return;
  }

  try {
    showLoader();

    const id = document.getElementById('user-id').value;
    const name = document.getElementById('usr-name').value;
    const email = document.getElementById('usr-email').value;
    const role = document.getElementById('usr-role').value;
    const account_status = document.getElementById('usr-status').value;
    const isActive = account_status === 'approved';
    const password = document.getElementById('usr-password').value;

    if (!id) {
      // Create new user
      if (supabase.__local) {
        Swal.fire({
          icon: 'info',
          title: 'Requiere Supabase',
          text: 'Para crear usuarios en la nube (practicantes/coordinadores), primero configura Supabase en Configuración.',
        });
        hideLoader();
        return;
      }

      if (!password) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'La contraseña es requerida para nuevos usuarios' });
        hideLoader();
        return;
      }

      // Crear auth user sin cambiar la sesión del administrador:
      // usamos un cliente temporal sin persistencia de sesión.
      const { url, anonKey } = getSupabaseConfig();
      const tempClient = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (authError) throw authError;

      // Crear/actualizar profile (el trigger también lo crea, pero aquí definimos rol/activo)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: authData.user.id, email, full_name: name, role, is_active: isActive, account_status });
      if (profileError) throw profileError;
    } else {
      // Update existing user
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name, role, is_active: isActive, account_status })
        .eq('id', id);
      if (error) throw error;
    }

    closeUserModal();
    await loadUsers({ supabase });

    Swal.fire({
      icon: 'success',
      title: id ? 'Actualizado' : 'Creado',
      text: id
        ? `El usuario ha sido actualizado por ${state.currentUser?.full_name || state.currentUser?.email || 'el usuario actual'}`
        : `El usuario ha sido creado por ${state.currentUser?.full_name || state.currentUser?.email || 'el usuario actual'}`,
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error('Error saving user:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: error?.message || 'No se pudo guardar el usuario' });
  } finally {
    hideLoader();
  }
}

async function setUserStatus({ supabase } = {}, id, status) {
  if (!isPrimaryAdmin(state.currentUser, PRIMARY_ADMIN_EMAIL)) {
    Swal.fire({ icon: 'error', title: 'Sin permiso', text: 'Solo el administrador principal puede cambiar estados.' });
    return;
  }
  const isActive = status === 'approved';
  const { error } = await supabase.from('profiles').update({ account_status: status, is_active: isActive }).eq('id', id);
  if (error) throw error;
  await loadUsers({ supabase });
}

export async function approveUser({ supabase } = {}, id) {
  const r = await Swal.fire({
    icon: 'question',
    title: 'Aprobar usuario',
    text: '¿Deseas aprobar esta cuenta?',
    showCancelButton: true,
    confirmButtonText: 'Aprobar',
    cancelButtonText: 'Cancelar',
  });
  if (!r.isConfirmed) return;
  await setUserStatus({ supabase }, id, 'approved');
}

export async function rejectUser({ supabase } = {}, id) {
  const r = await Swal.fire({
    icon: 'warning',
    title: 'Rechazar usuario',
    text: '¿Deseas rechazar esta solicitud?',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    confirmButtonText: 'Rechazar',
    cancelButtonText: 'Cancelar',
  });
  if (!r.isConfirmed) return;
  await setUserStatus({ supabase }, id, 'rejected');
}

export async function suspendUser({ supabase } = {}, id) {
  const r = await Swal.fire({
    icon: 'warning',
    title: 'Suspender usuario',
    text: '¿Deseas suspender esta cuenta?',
    showCancelButton: true,
    confirmButtonColor: '#111827',
    confirmButtonText: 'Suspender',
    cancelButtonText: 'Cancelar',
  });
  if (!r.isConfirmed) return;
  await setUserStatus({ supabase }, id, 'suspended');
}

export async function activateUser({ supabase } = {}, id) {
  const r = await Swal.fire({
    icon: 'question',
    title: 'Reactivar usuario',
    text: '¿Deseas reactivar esta cuenta?',
    showCancelButton: true,
    confirmButtonText: 'Reactivar',
    cancelButtonText: 'Cancelar',
  });
  if (!r.isConfirmed) return;
  await setUserStatus({ supabase }, id, 'approved');
}
