/**
 * premium-dashboard-components.js
 * Componentes premium para el dashboard
 */

/**
 * Inicializar componentes del dashboard premium
 */
function initPremiumDashboard() {
  initHeroSection();
  initQuickActions();
  initIndicators();
  initTimeline();
  initAnimations();
}

/**
 * Hero Section - Sección principal con bienvenida
 */
function initHeroSection() {
  const heroTime = document.getElementById('dashboard-hero-time');
  if (!heroTime) return;

  function updateTime() {
    const now = new Date();
    const time = now.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const date = now.toLocaleDateString('es-ES', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (heroTime) {
      heroTime.innerHTML = `
        <div class="dashboard-hero-time">
          <i class="fas fa-clock mr-2"></i>
          <span class="date">${date}</span>
          <span class="time font-mono">${time}</span>
        </div>
      `;
    }
  }

  updateTime();
  setInterval(updateTime, 1000);
}

/**
 * Quick Actions - Acciones rápidas con animación
 */
function initQuickActions() {
  const quickActions = document.querySelectorAll('.quick-action-card');
  
  quickActions.forEach((action, index) => {
    action.style.animationDelay = `${index * 0.1}s`;
    action.classList.add('animate-fade-in-up');
    
    action.addEventListener('mouseenter', function() {
      this.classList.add('hover-lift');
    });
    
    action.addEventListener('mouseleave', function() {
      this.classList.remove('hover-lift');
    });
  });
}

/**
 * Indicators - Indicadores con animación de números
 */
function initIndicators() {
  const indicators = document.querySelectorAll('.indicator-value');
  
  indicators.forEach((indicator) => {
    const finalValue = parseInt(indicator.textContent) || 0;
    const startValue = 0;
    const duration = 1000; // ms
    const step = finalValue / (duration / 16); // 60fps
    
    let currentValue = startValue;
    
    const animate = () => {
      currentValue += step;
      if (currentValue >= finalValue) {
        indicator.textContent = finalValue.toLocaleString('es-ES');
      } else {
        indicator.textContent = Math.floor(currentValue).toLocaleString('es-ES');
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  });
}

/**
 * Timeline - Línea del tiempo con animación de scroll
 */
function initTimeline() {
  const timelineItems = document.querySelectorAll('.timeline-item');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        entry.target.style.animationDelay = `${index * 0.1}s`;
        entry.target.classList.add('animate-slide-left');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.3
  });

  timelineItems.forEach(item => observer.observe(item));
}

/**
 * Animaciones Generales
 */
function initAnimations() {
  // Fade-in para elementos con clase stagger-item
  const staggerItems = document.querySelectorAll('.stagger-item');
  staggerItems.forEach((item, index) => {
    item.style.animationDelay = `${index * 0.1}s`;
  });

  // Hover effects en tarjetas
  const cards = document.querySelectorAll('.card, .card-xl, .card-lg, .card-md, .card-sm');
  cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-4px)';
    });
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });
}

/**
 * Crear Sparkline (mini gráfico de línea)
 */
function createSparkline(canvasId, data, color = '#0ea5e9') {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext('2d');
  const padding = 2;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;

  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  // Limpiar canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar línea
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((value, index) => {
    const x = padding + (index / (data.length - 1)) * width;
    const y = padding + height - ((value - minValue) / range) * height;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Rellenar área bajo la línea
  ctx.lineTo(padding + width, padding + height);
  ctx.lineTo(padding, padding + height);
  ctx.closePath();
  ctx.fillStyle = color + '20';
  ctx.fill();
}

/**
 * Animar números
 */
function animateNumber(element, startValue, endValue, duration = 1000) {
  const range = endValue - startValue;
  const increment = range / (duration / 16);
  let currentValue = startValue;

  const animate = () => {
    currentValue += increment;
    if ((increment > 0 && currentValue >= endValue) || (increment < 0 && currentValue <= endValue)) {
      element.textContent = endValue.toLocaleString('es-ES');
    } else {
      element.textContent = Math.floor(currentValue).toLocaleString('es-ES');
      requestAnimationFrame(animate);
    }
  };

  animate();
}

/**
 * Crear Badge de estado
 */
function createStateBadge(state) {
  const badges = {
    'operational': { class: 'badge-success', icon: '✓', text: 'Operativo' },
    'pending': { class: 'badge-warning', icon: '⏱', text: 'Pendiente' },
    'in-progress': { class: 'badge-info', icon: '⟳', text: 'En progreso' },
    'completed': { class: 'badge-success', icon: '✓', text: 'Completado' },
    'critical': { class: 'badge-danger', icon: '!', text: 'Crítico' },
    'cancelled': { class: 'badge', icon: '✕', text: 'Cancelado' }
  };

  const badge = badges[state] || badges['cancelled'];
  return `<span class="badge ${badge.class}">${badge.icon} ${badge.text}</span>`;
}

/**
 * Crear Card de Indicador
 */
function createIndicatorCard(data) {
  return `
    <div class="card card-md indicator-card">
      <div class="indicator-header">
        <div class="indicator-title">
          <span class="indicator-icon">${data.icon}</span>
          ${data.title}
        </div>
        <div class="indicator-change ${data.change >= 0 ? 'positive' : 'negative'}">
          ${Math.abs(data.change)}%
        </div>
      </div>
      <div class="indicator-value">${data.value.toLocaleString('es-ES')}</div>
      <div class="indicator-chart">
        <canvas id="sparkline-${data.id}" width="100" height="40"></canvas>
      </div>
    </div>
  `;
}

/**
 * Mostrar Toast Notification
 */
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;

  document.body.appendChild(toast);
  toast.style.animation = 'slideUp 0.3s ease-out';

  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Crear Timeline Item
 */
function createTimelineItem(data) {
  const state = data.state || 'info';
  return `
    <div class="timeline-item ${state}">
      <div class="timeline-content">
        <div class="timeline-info">
          <div class="timeline-title">${data.title}</div>
          <div class="timeline-description">${data.description}</div>
          <div class="timeline-meta">
            <span class="timeline-time"><i class="fas fa-clock"></i> ${data.time}</span>
            <span class="timeline-user">
              <div class="timeline-user-avatar">${data.user.charAt(0).toUpperCase()}</div>
              ${data.user}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Implementar Ripple Effect en botones
 */
function initRippleEffect() {
  const buttons = document.querySelectorAll('button, a[role="button"]');
  
  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      ripple.classList.add('ripple-effect');
      
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      
      this.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

/**
 * Scroll animations - Animar elementos al hacer scroll
 */
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.card, .indicator-card, .stat-box').forEach(el => {
    observer.observe(el);
  });
}

/**
 * Tema claro/oscuro con transición suave
 */
function initThemeToggle() {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');

  // Mantener preferencia de tema
  if (localStorage.getItem('theme')) {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
  }

  // Listener para cambios
  const observer = new MutationObserver(() => {
    if (html.classList.contains('dark')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  });

  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
}

/**
 * Inicializar todo al cargar
 */
document.addEventListener('DOMContentLoaded', function() {
  if (document.readyState === 'loading') return;
  
  initPremiumDashboard();
  initRippleEffect();
  initScrollAnimations();
  initThemeToggle();
});
