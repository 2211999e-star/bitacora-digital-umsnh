/**
 * eventos.js
 * CRUD de eventos (events) + filtros y modales.
 */

import { state, showLoader, hideLoader, formatDate, getStatusText, getBadgeClass, downloadCSV, showToast, buildStateBlock } from './utils.js?v=1.5.4';
import { canEditOwnedOrRole, canDelete } from './permissions.js?v=1.7.1';
import { updateNotificationBadge } from './dashboard.js?v=1.5.4';

function buildEventMeta(meta = {}) {
  try {
    return `__meta__=${JSON.stringify(meta)}`;
  } catch {
    return '';
  }
}

function parseEventMeta(text = '') {
  const raw = String(text || '');
  const lines = raw.split('\n');
  const metaLineIndex = lines.findIndex((l) => l.trim().startsWith('__meta__='));
  if (metaLineIndex === -1) return { meta: {}, cleanText: raw };
  const metaRaw = lines[metaLineIndex].trim().slice('__meta__='.length);
  const cleanLines = lines.filter((_, idx) => idx !== metaLineIndex);
  try {
    const meta = JSON.parse(metaRaw);
    return { meta: meta && typeof meta === 'object' ? meta : {}, cleanText: cleanLines.join('\n').trim() };
  } catch {
    return { meta: {}, cleanText: cleanLines.join('\n').trim() };
  }
}

export async function loadEvents({ supabase } = {}) {
  try {
    const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
    if (error) throw error;

    state.eventsData = data || [];
    filterEvents();
    updateNotificationBadge();
  } catch (error) {
    console.error('Error loading events:', error);
    const grid = document.getElementById('events-grid');
    if (grid) {
      grid.innerHTML = buildStateBlock({
        type: 'error',
        title: 'No se pudieron cargar los eventos',
        message: 'Verifica conexion, permisos o intenta recargar la pagina.',
        actionText: 'Reintentar',
        actionOnclick: 'loadEvents()'
      });
    }
  }
}

function renderEventsGrid(list = state.eventsData) {
  const grid = document.getElementById('events-grid');
  if (!grid) return;

  if (!list || list.length === 0) {
    grid.innerHTML = `<div class="col-span-full">${buildStateBlock({
      type: 'empty',
      title: 'No hay eventos registrados',
      message: 'Crea tu primer evento o ajusta los filtros activos.',
      actionText: 'Nuevo evento',
      actionOnclick: 'showEventModal()'
    })}</div>`;
    return;
  }

  grid.innerHTML = list
    .map((event) => {
      const canEdit = canEditOwnedOrRole(state.currentUser, event.user_id);
      const canDel = canDelete(state.currentUser);
      const { meta, cleanText } = parseEventMeta(event.observations || '');
      const createdBy = meta.creado_por || '';
      const createdByEmail = meta.creado_email || '';

      return `
        <div class="event-card bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div class="p-6">
            <div class="flex justify-between items-start mb-3">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${event.title}</h3>
              <span class="badge badge-${getBadgeClass(event.status)}">${getStatusText(event.status)}</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">${event.description || 'Sin descripción'}</p>
            ${
              cleanText
                ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-4"><b>Observaciones:</b> ${(cleanText || '').slice(0, 140)}${
                    (cleanText || '').length > 140 ? '…' : ''
                  }</p>`
                : ''
            }
            <div class="space-y-2 text-sm">
              <div class="flex items-center text-gray-700 dark:text-gray-300">
                <i class="fas fa-calendar w-5 text-gray-400"></i>
                <span>${formatDate(event.event_date)}${event.event_time ? ` - ${event.event_time}` : ''}</span>
              </div>
              ${
                event.location
                  ? `
                <div class="flex items-center text-gray-700 dark:text-gray-300">
                  <i class="fas fa-map-marker-alt w-5 text-gray-400"></i>
                  <span>${event.location}</span>
                </div>
              `
                  : ''
              }
              ${
                createdBy
                  ? `
                <div class="flex items-center text-gray-700 dark:text-gray-300">
                  <i class="fas fa-user-pen w-5 text-gray-400"></i>
                  <span>Registró: ${createdBy}${createdByEmail ? ` · ${createdByEmail}` : ''}</span>
                </div>
              `
                  : ''
              }
              ${
                event.assigned_to
                  ? `
                <div class="flex items-center text-gray-700 dark:text-gray-300">
                  <i class="fas fa-user w-5 text-gray-400"></i>
                  <span>${event.assigned_to}</span>
                </div>
              `
                  : ''
              }
            </div>
            <div class="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              ${
                canEdit
                  ? `
                <button onclick="editEvent('${event.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-blue-500" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
              `
                  : ''
              }
              ${
                canDel
                  ? `
                <button onclick="deleteEvent('${event.id}')" class="action-btn text-gray-600 dark:text-gray-400 hover:text-red-500">
                  <i class="fas fa-trash"></i>
                </button>
              `
                  : ''
              }
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

export function filterEvents() {
  const searchText = (document.getElementById('search-events')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('filter-events-status')?.value || '';
  const filterDate = document.getElementById('filter-events-date')?.value || '';
  const today = new Date().toISOString().split('T')[0];

  let filtered = state.eventsData;
  if (searchText) {
    filtered = filtered.filter(
      (e) =>
        (e.title || '').toLowerCase().includes(searchText) ||
        (e.description || '').toLowerCase().includes(searchText) ||
        (() => {
          const { meta, cleanText } = parseEventMeta(e.observations || '');
          return [cleanText, meta.creado_por, meta.creado_email].filter(Boolean).join(' ').toLowerCase().includes(searchText);
        })() ||
        (e.location || '').toLowerCase().includes(searchText) ||
        (e.assigned_to || '').toLowerCase().includes(searchText),
    );
  }
  if (filterStatus) {
    if (filterStatus === 'activos') filtered = filtered.filter((e) => ['pendiente', 'en_proceso'].includes(String(e.status || '').toLowerCase()));
    else filtered = filtered.filter((e) => e.status === filterStatus);
  }
  if (filterDate) {
    filtered = filtered.filter((e) => {
      const d = String(e.event_date || '').slice(0, 10);
      if (!d) return false;
      const diff = Math.floor((new Date(d) - new Date(today)) / (1000 * 60 * 60 * 24));
      if (filterDate === 'today') return d === today;
      if (filterDate === 'next7') return diff >= 0 && diff <= 7;
      if (filterDate === 'overdue') return diff < 0 && !['completado', 'cancelado'].includes(String(e.status || '').toLowerCase());
      return true;
    });
  }

  renderEventsGrid(filtered);
}

export function clearEventsFilters() {
  const search = document.getElementById('search-events');
  const status = document.getElementById('filter-events-status');
  const date = document.getElementById('filter-events-date');
  if (search) search.value = '';
  if (status) status.value = '';
  if (date) date.value = '';
  filterEvents();
}

// -------------------------
// Exportación CSV (eventos)
// -------------------------

function getFilteredEvents() {
  const searchText = (document.getElementById('search-events')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('filter-events-status')?.value || '';
  const filterDate = document.getElementById('filter-events-date')?.value || '';
  const today = new Date().toISOString().split('T')[0];

  let filtered = state.eventsData;
  if (searchText) {
    filtered = filtered.filter(
      (e) =>
        (e.title || '').toLowerCase().includes(searchText) ||
        (e.description || '').toLowerCase().includes(searchText) ||
        (() => {
          const { meta, cleanText } = parseEventMeta(e.observations || '');
          return [cleanText, meta.creado_por, meta.creado_email].filter(Boolean).join(' ').toLowerCase().includes(searchText);
        })() ||
        (e.location || '').toLowerCase().includes(searchText) ||
        (e.assigned_to || '').toLowerCase().includes(searchText),
    );
  }
  if (filterStatus) {
    if (filterStatus === 'activos') filtered = filtered.filter((e) => ['pendiente', 'en_proceso'].includes(String(e.status || '').toLowerCase()));
    else filtered = filtered.filter((e) => e.status === filterStatus);
  }
  if (filterDate) {
    filtered = filtered.filter((e) => {
      const d = String(e.event_date || '').slice(0, 10);
      if (!d) return false;
      const diff = Math.floor((new Date(d) - new Date(today)) / (1000 * 60 * 60 * 24));
      if (filterDate === 'today') return d === today;
      if (filterDate === 'next7') return diff >= 0 && diff <= 7;
      if (filterDate === 'overdue') return diff < 0 && !['completado', 'cancelado'].includes(String(e.status || '').toLowerCase());
      return true;
    });
  }
  return filtered;
}

export function exportEventsCSV() {
  try {
    const rows = getFilteredEvents();
    const out = [
      ['Fecha', 'Hora', 'Título', 'Estado', 'Ubicación', 'Asignado a', 'Descripción', 'Observaciones'],
    ];

    rows.forEach((e) => {
      out.push([
        e.event_date || '',
        e.event_time || '',
        e.title || '',
        getStatusText(e.status),
        e.location || '',
        e.assigned_to || '',
        e.description || '',
        parseEventMeta(e.observations || '').cleanText || '',
      ]);
    });

    const today = new Date().toISOString().slice(0, 10);
    downloadCSV(`eventos_${today}`, out);
    showToast({ type: 'success', title: 'CSV generado', message: `Registros: ${rows.length}` });
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo exportar el CSV.' });
  }
}

export function showEventModal() {
  const modal = document.getElementById('modal-event');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('show');
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

  // Mejor UX: enfocar primer campo
  setTimeout(() => {
    document.getElementById('evt-title')?.focus?.();
  }, 0);
}

export function closeEventModal() {
  const modal = document.getElementById('modal-event');
  if (!modal) return;

  modal.classList.remove('show');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
}

export async function editEvent({ supabase } = {}, id) {
  try {
    const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
    if (error) throw error;

    const modal = document.getElementById('modal-event');
    modal.classList.remove('hidden');
    modal.classList.add('show');
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
    if (obs) obs.value = parseEventMeta(data.observations || '').cleanText || '';
  } catch (error) {
    console.error('Error loading event:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el evento' });
  }
}

export async function deleteEvent({ supabase } = {}, id) {
  try {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
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
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;

      await loadEvents({ supabase });

      Swal.fire({ icon: 'success', title: 'Eliminado', text: 'El evento ha sido eliminado', timer: 2000, showConfirmButton: false });
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el evento' });
  }
}

export async function handleEventSubmit({ supabase } = {}, e) {
  e.preventDefault();

  try {
    showLoader();

    const id = document.getElementById('event-id').value;
    const observationsUser = (document.getElementById('evt-observations')?.value || '').trim();
    let creatorMeta = {
      creado_por: state.currentUser?.full_name || state.currentUser?.email || 'Usuario',
      creado_email: state.currentUser?.email || null,
    };
    if (id) {
      try {
        const { data: existing } = await supabase.from('events').select('observations').eq('id', id).single();
        const prev = parseEventMeta(existing?.observations || '').meta || {};
        creatorMeta = {
          creado_por: prev.creado_por || creatorMeta.creado_por,
          creado_email: prev.creado_email || creatorMeta.creado_email,
        };
      } catch {
        // noop
      }
    }
    const title = (document.getElementById('evt-title').value || '').trim();
    const description = (document.getElementById('evt-description').value || '').trim();
    const eventDate = (document.getElementById('evt-date').value || '').trim();
    const eventTime = (document.getElementById('evt-time').value || '').trim();
    const location = (document.getElementById('evt-location').value || '').trim();
    const status = (document.getElementById('evt-status').value || 'pendiente').trim();
    const assignedTo = (document.getElementById('evt-assigned').value || '').trim();

    if (!title || title.length < 4) {
      Swal.fire({ icon: 'warning', title: 'Título inválido', text: 'Escribe un título más descriptivo (mínimo 4 caracteres).' });
      return;
    }

    if (!eventDate) {
      Swal.fire({ icon: 'warning', title: 'Fecha requerida', text: 'Selecciona la fecha del evento.' });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (eventDate < today && ['pendiente', 'en_proceso'].includes(status)) {
      const confirmPast = await Swal.fire({
        icon: 'question',
        title: 'Evento en fecha pasada',
        text: 'La fecha seleccionada ya pasó. ¿Deseas guardarlo de todos modos?',
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar',
      });
      if (!confirmPast.isConfirmed) return;
    }

    const eventData = {
      title,
      description: description || null,
      event_date: eventDate,
      event_time: eventTime || null,
      location: location || null,
      status,
      assigned_to: assignedTo || null,
      observations: [buildEventMeta(creatorMeta), observationsUser].filter(Boolean).join('\n').trim() || null,
      user_id: state.currentUser.id,
    };

    let error;
    if (id) {
      const result = await supabase.from('events').update(eventData).eq('id', id);
      error = result.error;
    } else {
      const result = await supabase.from('events').insert(eventData);
      error = result.error;
    }

    if (error) throw error;

    closeEventModal();
    await loadEvents({ supabase });

    Swal.fire({
      icon: 'success',
      title: id ? 'Actualizado' : 'Registrado',
      text: id
        ? `El evento ha sido actualizado por ${state.currentUser?.full_name || state.currentUser?.email || 'el usuario actual'}`
        : `El evento ha sido registrado por ${state.currentUser?.full_name || state.currentUser?.email || 'el usuario actual'}`,
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error('Error saving event:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el evento' });
  } finally {
    hideLoader();
  }
}

