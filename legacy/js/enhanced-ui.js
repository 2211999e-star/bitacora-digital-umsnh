/**
 * enhanced-ui.js
 * Mejoras visuales y funcionales para la interfaz - animaciones, validaciones mejoradas, UX enhancements
 */

/**
 * Muestra un tooltip con efecto suave
 */
export function showTooltip(element, message, duration = 2000) {
  const tooltip = document.createElement('div');
  tooltip.className = 'fixed bottom-4 right-4 bg-black dark:bg-white text-white dark:text-black px-4 py-3 rounded-lg font-medium shadow-lg z-50 animate-slideInUp';
  tooltip.textContent = message;
  document.body.appendChild(tooltip);
  
  setTimeout(() => {
    tooltip.classList.add('animate-fadeOut');
    setTimeout(() => tooltip.remove(), 300);
  }, duration);
}

/**
 * Valida que un campo de formulario no esté vacío
 */
export function validateField(field, fieldName) {
  const value = field.value.trim();
  if (!value) {
    field.classList.add('border-red-500', 'dark:border-red-400');
    field.classList.remove('border-transparent');
    return false;
  }
  field.classList.remove('border-red-500', 'dark:border-red-400');
  field.classList.add('border-transparent');
  return true;
}

/**
 * Valida múltiples campos
 */
export function validateFields(fields) {
  const errors = [];
  
  fields.forEach(({ element, name, required = true }) => {
    if (required) {
      const value = element.value?.trim();
      if (!value) {
        errors.push(name);
        element.classList.add('border-red-500', 'dark:border-red-400');
      } else {
        element.classList.remove('border-red-500', 'dark:border-red-400');
      }
    }
  });
  
  return errors;
}

/**
 * Anima el cambio de valor en un elemento
 */
export function animateValueChange(element, newValue) {
  element.style.opacity = '0.5';
  element.textContent = newValue;
  
  setTimeout(() => {
    element.style.transition = 'opacity 0.3s ease-in-out';
    element.style.opacity = '1';
  }, 10);
}

/**
 * Crea un badge visual con animación
 */
export function createBadge(text, type = 'default') {
  const badgeClass = {
    'success': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    'error': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    'warning': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
    'info': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  }[type] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
  
  const badge = document.createElement('span');
  badge.className = `inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`;
  badge.textContent = text;
  
  return badge;
}

/**
 * Resalta un campo con efecto visual
 */
export function highlightField(field, duration = 2000) {
  const originalClass = field.className;
  field.classList.add('ring-2', 'ring-blue-400', 'shadow-lg');
  
  setTimeout(() => {
    field.classList.remove('ring-2', 'ring-blue-400', 'shadow-lg');
  }, duration);
}

/**
 * Muestra un spinner de carga en un botón
 */
export function setButtonLoading(button, isLoading = true) {
  if (isLoading) {
    button.disabled = true;
    button.classList.add('opacity-75', 'cursor-not-allowed');
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Procesando...';
    button.dataset.originalHTML = originalHTML;
  } else {
    button.disabled = false;
    button.classList.remove('opacity-75', 'cursor-not-allowed');
    button.innerHTML = button.dataset.originalHTML || 'Guardar';
  }
}

/**
 * Crea una animación de pulse para llamar atención
 */
export function pulseElement(element, count = 3) {
  let pulses = 0;
  const interval = setInterval(() => {
    element.style.opacity = pulses % 2 === 0 ? '0.5' : '1';
    pulses++;
    if (pulses > count * 2) {
      clearInterval(interval);
      element.style.opacity = '1';
    }
  }, 200);
}

/**
 * Efecto de scroll suave a un elemento
 */
export function smoothScroll(element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

/**
 * Validar selección de tipo de mantenimiento
 */
export function validateMaintenanceType(type) {
  return ['preventivo', 'correctivo'].includes(type);
}

/**
 * Obtener información de validación basada en tipo de mantenimiento
 */
export function getValidationMessages(type) {
  const messages = {
    'preventivo': {
      title: 'Mantenimiento Preventivo',
      description: 'Acciones programadas para evitar fallas',
      requiredFields: ['Acción Académica/Área', 'Nombre de Reportante', 'Ubicación Específica'],
      icon: 'shield-heart',
      color: 'emerald'
    },
    'correctivo': {
      title: 'Mantenimiento Correctivo',
      description: 'Acciones para corregir una falla existente',
      requiredFields: ['Edificio', 'Carrera', 'Salón'],
      icon: 'screwdriver-wrench',
      color: 'orange'
    }
  };
  
  return messages[type] || messages['correctivo'];
}

/**
 * Crear un resumen visual de la incidencia
 */
export function createIncidencySummary(data) {
  const summary = document.createElement('div');
  summary.className = 'bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 space-y-2';
  
  const items = [
    { label: 'Folio', value: data.folio },
    { label: 'Tipo', value: data.maintenanceType },
    { label: 'Servicio', value: data.serviceType },
    { label: 'Prioridad', value: data.priority },
    { label: 'Estado', value: data.status }
  ];
  
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'flex justify-between text-sm';
    row.innerHTML = `
      <span class="font-medium text-gray-600 dark:text-gray-400">${item.label}:</span>
      <span class="text-gray-900 dark:text-white font-semibold">${item.value}</span>
    `;
    summary.appendChild(row);
  });
  
  return summary;
}

/**
 * Feedback visual de éxito después de guardar
 */
export function showSuccessFeedback(duration = 3000) {
  const feedback = document.createElement('div');
  feedback.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg font-medium shadow-lg z-50 flex items-center gap-2 animate-slideInDown';
  feedback.innerHTML = '<i class="fas fa-check-circle"></i> Guardado exitosamente';
  document.body.appendChild(feedback);
  
  setTimeout(() => {
    feedback.style.animation = 'slideOutUp 0.3s ease-out forwards';
    setTimeout(() => feedback.remove(), 300);
  }, duration);
}

/**
 * Feedback visual de error
 */
export function showErrorFeedback(message = 'Error al procesar', duration = 3000) {
  const feedback = document.createElement('div');
  feedback.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg font-medium shadow-lg z-50 flex items-center gap-2 animate-slideInDown';
  feedback.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  document.body.appendChild(feedback);
  
  setTimeout(() => {
    feedback.style.animation = 'slideOutUp 0.3s ease-out forwards';
    setTimeout(() => feedback.remove(), 300);
  }, duration);
}

/**
 * Agregar efecto de bounce a un elemento
 */
export function addBounceEffect(element) {
  element.style.animation = 'bounce 0.6s ease-in-out';
  setTimeout(() => {
    element.style.animation = '';
  }, 600);
}

/**
 * Crear badge de estado con colores
 */
export function createStatusBadge(status) {
  const badgeConfig = {
    'pendiente': { icon: '⚪', color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200' },
    'en_proceso': { icon: '🟡', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' },
    'completado': { icon: '🟢', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' },
    'cancelado': { icon: '🔴', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' }
  };
  
  const config = badgeConfig[status] || badgeConfig['pendiente'];
  const badge = document.createElement('span');
  badge.className = `inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`;
  badge.textContent = `${config.icon} ${status}`;
  
  return badge;
}

/**
 * Crear badge de prioridad con colores
 */
export function createPriorityBadge(priority) {
  const badgeConfig = {
    'baja': { icon: '🔵', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200' },
    'media': { icon: '🟡', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' },
    'alta': { icon: '🟠', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200' },
    'urgente': { icon: '🔴', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' }
  };
  
  const config = badgeConfig[priority] || badgeConfig['media'];
  const badge = document.createElement('span');
  badge.className = `inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`;
  badge.textContent = `${config.icon} ${priority}`;
  
  return badge;
}

/**
 * Crear badge de tipo de mantenimiento
 */
export function createMaintenanceTypeBadge(type) {
  const badgeConfig = {
    'preventivo': {
      icon: '🛡️',
      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
    },
    'correctivo': {
      icon: '🔧',
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
    }
  };
  
  const config = badgeConfig[type] || badgeConfig['correctivo'];
  const badge = document.createElement('span');
  badge.className = `inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`;
  badge.textContent = `${config.icon} ${type === 'preventivo' ? 'Preventivo' : 'Correctivo'}`;
  
  return badge;
}

/**
 * Animar entrada de modal
 */
export function animateModalEntry() {
  const modal = document.getElementById('modal-activity');
  if (modal) {
    modal.style.animation = 'fadeIn 0.3s ease-out';
  }
}

/**
 * Animar salida de modal
 */
export function animateModalExit() {
  const modal = document.getElementById('modal-activity');
  if (modal) {
    modal.style.animation = 'fadeOut 0.2s ease-out forwards';
  }
}

export default {
  showTooltip,
  validateField,
  validateFields,
  animateValueChange,
  createBadge,
  highlightField,
  setButtonLoading,
  pulseElement,
  smoothScroll,
  validateMaintenanceType,
  getValidationMessages,
  createIncidencySummary,
  showSuccessFeedback,
  showErrorFeedback,
  addBounceEffect,
  createStatusBadge,
  createPriorityBadge,
  createMaintenanceTypeBadge,
  animateModalEntry,
  animateModalExit
};
