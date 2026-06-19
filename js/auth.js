/**
 * auth.js
 * Autenticación (Supabase y modo local/admin demo).
 */

import {
  LOCAL_ADMIN_USERNAME,
  LOCAL_ADMIN_PASSWORD,
  LOCAL_STORAGE_PREFIX,
  PRIMARY_ADMIN_EMAIL,
  isReviewModeEnabled,
} from './config.js?v=1.5.4';
import { getAppSetting } from './config.js?v=1.5.4';
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

  // Si no contiene '@' y no es el usuario administrador local, autocompletar con el dominio institucional
  if (email && !email.includes('@')) {
    const isLocalUsername = (email.toLowerCase() === LOCAL_ADMIN_USERNAME.toLowerCase() || email === '2211999e' || email === '22119993');
    if (!isLocalUsername) {
      email = `${email}@umich.mx`;
    }
  }

  try {
    showLoader();

    // Tip UX: si el usuario intenta entrar con credenciales demo, guiar para activar Modo revisión
    const isDemoAttempt =
      String(email || '').toLowerCase().startsWith('demo.') &&
      String(email || '').toLowerCase().endsWith('@umich.mx') &&
      String(password || '') === 'demo1234';
    if (isDemoAttempt && !isReviewModeEnabled()) {
      const res = await Swal.fire({
        icon: 'info',
        title: 'Modo revisión',
        html:
          'Detecté que intentas usar un <b>acceso demo</b>.<br><br>' +
          'Para que funcione, primero activa <b>Modo revisión</b> (no toca datos reales).<br><br>' +
          '¿Quieres activarlo ahora?',
        showCancelButton: true,
        confirmButtonText: 'Sí, activar',
        cancelButtonText: 'Cancelar',
      });
      if (res.isConfirmed) {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}reviewMode`, 'true');
        window.location.reload();
        return;
      }
    }

    // =========================
    // Modo revisión: accesos demo (no toca datos reales)
    // =========================
    if (isReviewModeEnabled()) {
      const demos = [
        { email: 'demo.admin@umich.mx', pass: 'demo1234', role: 'admin', full_name: 'Admin Demo' },
        { email: 'demo.coordinador@umich.mx', pass: 'demo1234', role: 'coordinator', full_name: 'Coordinador Demo' },
        { email: 'demo.practicante@umich.mx', pass: 'demo1234', role: 'practitioner', full_name: 'Practicante Demo' },
      ];
      const match = demos.find((d) => d.email.toLowerCase() === String(email).toLowerCase() && password === d.pass);
      if (match) {
        state.currentUser = { id: `review-${match.role}`, email: match.email, full_name: match.full_name, role: match.role, account_status: 'approved' };
        try {
          localStorage.setItem(
            `${LOCAL_STORAGE_PREFIX}session`,
            JSON.stringify({
              user: {
                id: state.currentUser.id,
                email: state.currentUser.email,
                user_metadata: {
                  full_name: state.currentUser.full_name,
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
        Swal.fire({ icon: 'success', title: 'Modo revisión', text: `Entraste como ${match.full_name}`, timer: 1600, showConfirmButton: false });
        return;
      }
    }

    // Login local "admin demo" (funciona incluso sin Supabase)
    const isLocalAdmin = (email === LOCAL_ADMIN_USERNAME || email === '2211999e' || email === '22119993');
    if (isLocalAdmin && password === LOCAL_ADMIN_PASSWORD) {
      state.currentUser = {
        id: 'local-admin',
        email: PRIMARY_ADMIN_EMAIL,
        full_name: 'Administrador',
        role: 'admin',
        account_status: 'approved',
      };

      // Persistir sesión local para que "se guarde todo" incluso al recargar la página
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
        text: `Hola, ${state.currentUser.full_name}`,
        timer: 2000,
        showConfirmButton: false,
      });

      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
        text: 'Para solicitar acceso en línea, primero configura Supabase en Configuración (o desactiva Modo revisión).',
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
