/**
 * auth.js
 * Autenticación (Supabase y modo local/admin demo).
 */

import {
  LOCAL_ADMIN_USERNAME,
  LOCAL_ADMIN_PASSWORD,
  LOCAL_STORAGE_PREFIX,
  PRIMARY_ADMIN_EMAIL,
} from './config.js?v=1.7.1';
import { getAppSetting } from './config.js?v=1.7.1';
import { showLoader, hideLoader } from './utils.js?v=1.5.4';

/**
 * Normaliza el estado de cuenta desde perfiles existentes (compatibilidad).
 * - Si existe `account_status`, se usa tal cual.
 * - Si no existe, se interpreta desde `is_active`:
 *   - is_active=true  -> approved
 *   - is_active=false -> suspended
 * @param {object} profile
 * @returns {'pending'|'approved'|'rejected'|'suspended'}
 */
function getAccountStatus(profile = {}) {
  const raw = String(profile.account_status || '').toLowerCase().trim();
  if (raw === 'pending' || raw === 'approved' || raw === 'rejected' || raw === 'suspended') return raw;
  return profile.is_active === false ? 'suspended' : 'approved';
}

function getBlockedLoginMessage(status) {
  if (status === 'pending') return 'Tu cuenta está pendiente de aprobación por el administrador.';
  if (status === 'rejected') return 'Tu solicitud de acceso fue rechazada.';
  if (status === 'suspended') return 'Tu cuenta se encuentra suspendida. Contacta al administrador.';
  return 'No se pudo iniciar sesión.';
}

function ensureLocalProfilesBootstrap() {
  const profilesKey = `${LOCAL_STORAGE_PREFIX}profiles`;
  const passMapKey = `${LOCAL_STORAGE_PREFIX}localUserPasswords`;

  let profiles = [];
  try {
    profiles = JSON.parse(localStorage.getItem(profilesKey) || '[]') || [];
  } catch {
    profiles = [];
  }

  if (!Array.isArray(profiles) || profiles.length === 0) {
    const nowIso = new Date().toISOString();
    profiles = [
      {
        id: 'local-admin',
        email: PRIMARY_ADMIN_EMAIL,
        full_name: 'Administrador',
        role: 'admin',
        is_active: true,
        account_status: 'approved',
        created_at: nowIso,
      },
      {
        id: `local-user-${Date.now()}-coord`,
        email: 'coordinador@umich.mx',
        full_name: 'Coordinador General',
        role: 'coordinator',
        is_active: true,
        account_status: 'approved',
        created_at: nowIso,
      },
      {
        id: `local-user-${Date.now()}-prac`,
        email: 'practicante@umich.mx',
        full_name: 'Practicante Soporte',
        role: 'practitioner',
        is_active: true,
        account_status: 'approved',
        created_at: nowIso,
      },
    ];
    localStorage.setItem(profilesKey, JSON.stringify(profiles));
  }

  let passMap = {};
  try {
    passMap = JSON.parse(localStorage.getItem(passMapKey) || '{}') || {};
  } catch {
    passMap = {};
  }

  const merged = {
    ...passMap,
    [PRIMARY_ADMIN_EMAIL.toLowerCase()]: passMap[PRIMARY_ADMIN_EMAIL.toLowerCase()] || LOCAL_ADMIN_PASSWORD,
    'coordinador@umich.mx': passMap['coordinador@umich.mx'] || '123456789',
    'practicante@umich.mx': passMap['practicante@umich.mx'] || '123456789',
  };
  localStorage.setItem(passMapKey, JSON.stringify(merged));
}

export async function loadUserProfile({ supabase, state, ui }, userId) {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (error) throw error;

    const status = getAccountStatus(data || {});
    if (status !== 'approved') {
      Swal.fire({ icon: 'warning', title: 'Acceso restringido', text: getBlockedLoginMessage(status) });
      await supabase.auth.signOut();
      return;
    }

    state.currentUser = {
      ...data,
      full_name: data?.full_name || String(data?.email || '').split('@')[0] || 'Usuario',
    };
    ui.updateUserDisplay();
    ui.updateAdminMenu();
  } catch (error) {
    console.error('Error loading user profile:', error);
    await supabase.auth.signOut();
  }
}

export async function handleLogin(ctx, e) {
  e.preventDefault();

  const { supabase, state, ui } = ctx;

  let email = (document.getElementById('login-email')?.value || '').trim();
  const password = document.getElementById('login-password')?.value || '';
  const localAdminAliases = new Set([
    String(LOCAL_ADMIN_USERNAME || '').toLowerCase(),
    String(PRIMARY_ADMIN_EMAIL || '').toLowerCase(),
    String(PRIMARY_ADMIN_EMAIL || '').toLowerCase().split('@')[0],
  ]);

  // Si no contiene '@' y no es el usuario administrador local, autocompletar con el dominio institucional
  if (email && !email.includes('@')) {
    const isLocalUsername = localAdminAliases.has(String(email || '').toLowerCase());
    if (!isLocalUsername) {
      email = `${email}@umich.mx`;
    }
  }

  const isLocalAdmin = localAdminAliases.has(String(email || '').toLowerCase());

  try {
    showLoader();

    if (supabase.__local) {
      ensureLocalProfilesBootstrap();
    }

    // Login local de usuarios precargados/creados (cuando se trabaja en fallback local)
    if (supabase.__local && !isLocalAdmin) {
      const { data: rows } = await supabase.from('profiles').select('*');
      const users = Array.isArray(rows) ? rows : [];
      const matchedUser = users.find((u) => {
        const mail = String(u?.email || '').toLowerCase();
        const typed = String(email || '').toLowerCase();
        return typed === mail || typed === mail.split('@')[0];
      });

      const passMapKey = `${LOCAL_STORAGE_PREFIX}localUserPasswords`;
      const passMap = (() => {
        try {
          return JSON.parse(localStorage.getItem(passMapKey) || '{}') || {};
        } catch {
          return {};
        }
      })();

      if (matchedUser) {
        const expected = String(passMap[String(matchedUser.email || '').toLowerCase()] || '');
        const status = getAccountStatus(matchedUser || {});
        if (String(password) === expected && status === 'approved') {
          state.currentUser = {
            id: matchedUser.id,
            email: matchedUser.email,
            full_name: matchedUser.full_name || String(matchedUser.email || '').split('@')[0],
            role: matchedUser.role || 'practitioner',
            account_status: status,
          };

          try {
            localStorage.setItem(
              `${LOCAL_STORAGE_PREFIX}session`,
              JSON.stringify({
                user: {
                  id: state.currentUser.id,
                  email: state.currentUser.email,
                  user_metadata: {
                    full_name: state.currentUser.full_name,
                    email: state.currentUser.email,
                    role: state.currentUser.role,
                  },
                },
              }),
            );
          } catch {
            // noop
          }

          ui.updateUserDisplay();
          ui.updateAdminMenu();
          ui.showApp();

          Swal.fire({
            icon: 'success',
            title: '¡Bienvenido!',
            text: `Hola, ${state.currentUser.full_name} (Modo Local)`,
            timer: 1700,
            showConfirmButton: false,
          });
          return;
        }

        if (status !== 'approved') {
          Swal.fire({ icon: 'warning', title: 'Acceso restringido', text: getBlockedLoginMessage(status) });
          return;
        }
      }
    }

    if (isLocalAdmin && password === LOCAL_ADMIN_PASSWORD) {
      if (supabase.__local) {
        state.currentUser = {
          id: 'local-admin',
          email: PRIMARY_ADMIN_EMAIL,
          full_name: 'Administrador',
          role: 'admin',
          account_status: 'approved',
        };

        try {
          localStorage.setItem(
            `${LOCAL_STORAGE_PREFIX}session`,
            JSON.stringify({
              user: {
                id: state.currentUser.id,
                email: state.currentUser.email,
                user_metadata: {
                  full_name: state.currentUser.full_name,
                  email: state.currentUser.email,
                  role: state.currentUser.role,
                },
              },
            }),
          );
        } catch {
          // noop
        }

        ui.updateUserDisplay();
        ui.updateAdminMenu();
        ui.showApp();

        Swal.fire({
          icon: 'success',
          title: '¡Bienvenido!',
          text: `Hola, ${state.currentUser.full_name} (Modo Offline)`,
          timer: 2000,
          showConfirmButton: false,
        });

        return;
      } else {
        // En línea: usar el correo real del administrador
        email = PRIMARY_ADMIN_EMAIL;
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Si el administrador local no existe en Supabase, lo creamos automáticamente
      if (isLocalAdmin && password === LOCAL_ADMIN_PASSWORD && error.message.includes('Invalid login')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: PRIMARY_ADMIN_EMAIL,
          password: LOCAL_ADMIN_PASSWORD,
          options: {
            data: { full_name: 'Administrador', role: 'admin' },
          },
        });
        if (signUpError) throw signUpError;
        
        // Crear perfil inicial
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          email: PRIMARY_ADMIN_EMAIL,
          full_name: 'Administrador',
          role: 'admin',
          is_active: true,
          account_status: 'approved'
        });
        
        // Iniciar sesión ahora
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email: PRIMARY_ADMIN_EMAIL,
          password: LOCAL_ADMIN_PASSWORD,
        });
        if (retryError) throw retryError;
        data.user = retryData.user;
      } else {
        throw error;
      }
    }

    if (error) throw error;

    await loadUserProfile(ctx, data.user.id);
    ui.showApp();

    Swal.fire({
      icon: 'success',
      title: '¡Bienvenido!',
      text: `Hola, ${state.currentUser?.full_name || 'Usuario'}`,
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error('Login error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error de autenticación',
      text: 'Credenciales incorrectas. Por favor, verifica tu correo y contraseña.',
    });
  } finally {
    hideLoader();
  }
}

export async function logout(ctx) {
  const { supabase, state, ui } = ctx;

  try {
    Swal.fire({
      title: '¿Cerrar sesión?',
      text: '¿Estás seguro de que quieres cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#000000',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
    }).then(async (result) => {
      if (result.isConfirmed) {
        await supabase.auth.signOut();
        state.currentUser = null;
        ui.showLogin();
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export function togglePassword() {
  const passwordInput = document.getElementById('login-password');
  const toggleIcon = document.getElementById('toggle-icon');

  if (!passwordInput || !toggleIcon) return;

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.classList.remove('fa-eye');
    toggleIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    toggleIcon.classList.remove('fa-eye-slash');
    toggleIcon.classList.add('fa-eye');
  }
}

/**
 * Registro de usuario (solicitud de acceso).
 * IMPORTANTE: la cuenta queda en estado PENDIENTE.
 */
export async function handleRegister(ctx, e) {
  e.preventDefault();
  const { supabase } = ctx;

  const name = (document.getElementById('register-name')?.value || '').trim();
  const email = (document.getElementById('register-email')?.value || '').trim();
  const password = (document.getElementById('register-password')?.value || '').trim();

  if (!name || !email || !password) {
    Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Completa nombre, correo y contraseña.' });
    return;
  }

  try {
    showLoader();

    if (supabase.__local) {
      Swal.fire({
        icon: 'info',
        title: 'Requiere base de datos',
        text: 'Para solicitar acceso en línea, primero configura Supabase en Configuración.',
      });
      return;
    }

    const allowReg = await getAppSetting({ supabase }, 'allow_registration', true);
    if (!allowReg) {
      Swal.fire({
        icon: 'warning',
        title: 'Registro deshabilitado',
        text: 'En este momento no se aceptan nuevos registros. Contacta al administrador.',
      });
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });
    if (error) throw error;

    // Nota: el trigger de DB debe crear el profile como PENDIENTE y NO activo.
    Swal.fire({
      icon: 'success',
      title: 'Solicitud enviada',
      text: 'Tu cuenta quedó pendiente de aprobación por el administrador.',
    });

    // Cierra modal (si existe)
    document.getElementById('modal-register')?.classList.add('hidden');
    document.getElementById('register-form')?.reset?.();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'No se pudo registrar', text: err?.message || 'Intenta nuevamente.' });
  } finally {
    hideLoader();
  }
}
