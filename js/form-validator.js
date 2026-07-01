/* ═══════════════════════════════════════════════════════════════════════════════
   VALIDACIONES DE FORMULARIOS
   Sistema unificado de validación con feedback visual
   ═══════════════════════════════════════════════════════════════════════════════ */

class FormValidator {
  constructor(formId) {
    this.form = document.getElementById(formId);
    this.errors = {};
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
      this.attachFieldListeners();
    }
  }

  attachFieldListeners() {
    if (!this.form) return;
    const fields = this.form.querySelectorAll('input, textarea, select');
    fields.forEach(field => {
      field.addEventListener('blur', () => this.validateField(field));
      field.addEventListener('change', () => this.validateField(field));
      field.addEventListener('input', (e) => {
        // Real-time validation para ciertos campos
        if (field.type === 'email' || field.name === 'email') {
          this.validateField(field);
        }
      });
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name || field.id;
    let error = null;

    // Validaciones básicas
    if (field.hasAttribute('required') && !value) {
      error = 'Este campo es requerido';
    } else if (field.type === 'email' && value && !this.isValidEmail(value)) {
      error = 'Correo inválido';
    } else if (field.type === 'url' && value && !this.isValidUrl(value)) {
      error = 'URL inválida';
    } else if (field.type === 'number' && value && isNaN(value)) {
      error = 'Debe ser un número';
    } else if (field.minLength && value && value.length < field.minLength) {
      error = `Mínimo ${field.minLength} caracteres`;
    } else if (field.maxLength && value && value.length > field.maxLength) {
      error = `Máximo ${field.maxLength} caracteres`;
    }

    // Validaciones personalizadas según nombre de campo
    if (!error) {
      error = this.validateCustom(field, value);
    }

    this.setFieldError(field, error);
    return !error;
  }

  validateCustom(field, value) {
    const fieldName = (field.name || field.id).toLowerCase();

    // Teléfono
    if (fieldName.includes('phone') && value && !/^[\d\s\-\+\(\)]{7,}$/.test(value)) {
      return 'Teléfono inválido';
    }

    // Contraseña
    if (fieldName.includes('password') && value) {
      if (value.length < 8) return 'Mínimo 8 caracteres';
      if (!/[A-Z]/.test(value)) return 'Debe incluir mayúscula';
      if (!/[0-9]/.test(value)) return 'Debe incluir número';
    }

    // Fecha
    if (field.type === 'date' && value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) return 'Fecha inválida';
    }

    return null;
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  setFieldError(field, error) {
    const container = field.closest('.form-group') || field.parentElement;
    let errorEl = container?.querySelector('.validation-error');

    if (error) {
      field.classList.add('error');
      field.classList.remove('valid');
      if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'validation-error';
        container.appendChild(errorEl);
      }
      errorEl.textContent = error;
      this.errors[field.name || field.id] = error;
    } else {
      field.classList.remove('error');
      if (field.value.trim()) field.classList.add('valid');
      if (errorEl) errorEl.remove();
      delete this.errors[field.name || field.id];
    }
  }

  validateForm() {
    if (!this.form) return false;
    const fields = this.form.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;

    fields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  }

  handleSubmit(e) {
    if (!this.validateForm()) {
      e.preventDefault();
      this.scrollToFirstError();
      return false;
    }
    return true;
  }

  scrollToFirstError() {
    const firstError = this.form?.querySelector('.error');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstError.focus();
    }
  }

  clearErrors() {
    if (!this.form) return;
    const fields = this.form.querySelectorAll('input, textarea, select');
    fields.forEach(field => {
      field.classList.remove('error', 'valid');
      const errorEl = field.parentElement?.querySelector('.validation-error');
      if (errorEl) errorEl.remove();
    });
    this.errors = {};
  }

  getErrors() {
    return this.errors;
  }

  isValid() {
    return Object.keys(this.errors).length === 0;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   INICIALIZAR VALIDADORES PARA TODOS LOS FORMULARIOS
   ═══════════════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Auto-inicializar validadores para formularios con ID
  const forms = document.querySelectorAll('form[id]');
  forms.forEach(form => {
    new FormValidator(form.id);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   FUNCIONES GLOBALES PARA VALIDACIONES ESPECÍFICAS
   ═══════════════════════════════════════════════════════════════════════════════ */

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRequired(value) {
  return value && value.trim().length > 0;
}

function validateMinLength(value, min) {
  return value.length >= min;
}

function validateMaxLength(value, max) {
  return value.length <= max;
}

function showValidationMessage(element, message, type = 'error') {
  const container = element.closest('.form-group') || element.parentElement;
  let msgEl = container?.querySelector('[class*="validation"]');

  if (!msgEl) {
    msgEl = document.createElement('div');
    msgEl.className = `validation-${type}`;
    container.appendChild(msgEl);
  }

  msgEl.textContent = message;
  msgEl.className = `validation-${type}`;

  // Auto-remover después de 3 segundos si es success
  if (type === 'success') {
    setTimeout(() => msgEl.remove(), 3000);
  }
}

function clearValidationMessage(element) {
  const container = element.closest('.form-group') || element.parentElement;
  const msgEl = container?.querySelector('[class*="validation"]');
  if (msgEl) msgEl.remove();
}
