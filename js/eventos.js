/**
 * eventos.js
 * CRUD de eventos (events) + filtros y modales.
 */

import { state, showLoader, hideLoader, formatDate, getStatusText, getBadgeClass } from './utils.js';
import { canEditOwnedOrRole, canDelete } from './permissions.js';
import { updateNotificationBadge } from './dashboard.js';

export async function loadEvents({ supabase } = {}) {
  try {
    const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
    if (error) throw error;

    state.eventsData = data || [];
    filterEvents();
    updateNotificationBadge();
  } catch (error) {
    console.error('Error loading events:', error);
  }
}

function renderEventsGrid(list = state.eventsData) {
  const grid = document.getElementById('events-grid');
  if (!grid) return;

  if (!list || list.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">No hay eventos registrados</div>';
    return;
  }

  grid.innerHTML = list
    .map((event) => {
      const canEdit = canEditOwnedOrRole(state.currentUser, event.user_id);
      const canDel = canDelete(state.currentUser);

      return `
        <div class="event-card bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div class="p-6">
            <div class="flex justify-between items-start mb-3">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${event.title}</h3>
              <span class="badge badge-${getBadgeClass(event.status)}">${getStatusText(event.status)}</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">${event.description || 'Sin descripción'}</p>
            ${
              event.observations
                ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-4"><b>Observaciones:</b> ${(event.observations || '').slice(0, 140)}${
                    (event.observations || '').length > 140 ? '…' : ''
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

  let filtered = state.eventsData;
  if (searchText) {
    filtered = filtered.filter(
      (e) =>
        (e.title || '').toLowerCase().includes(searchText) ||
        (e.description || '').toLowerCase().includes(searchText) ||
        (e.observations || '').toLowerCase().includes(searchText) ||
        (e.location || '').toLowerCase().includes(searchText) ||
        (e.assigned_to || '').toLowerCase().includes(searchText),
    );
  }
  if (filterStatus) filtered = filtered.filter((e) => e.status === filterStatus);

  renderEventsGrid(filtered);
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
    if (obs) obs.value = data.observations || '';
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
    const eventData = {
      title: document.getElementById('evt-title').value,
      description: document.getElementById('evt-description').value || null,
      event_date: document.getElementById('evt-date').value,
      event_time: document.getElementById('evt-time').value || null,
      location: document.getElementById('evt-location').value || null,
      status: document.getElementById('evt-status').value,
      assigned_to: document.getElementById('evt-assigned').value || null,
      observations: (document.getElementById('evt-observations')?.value || '').trim() || null,
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
      text: id ? 'El evento ha sido actualizado' : 'El evento ha sido registrado',
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

