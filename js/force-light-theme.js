/**
 * force-light-theme.js
 * Inyecta CSS agresivo para forzar modo light en toda la aplicación
 * Se ejecuta DESPUÉS de que se cargue la página para máxima especificidad
 */

(function forceLightTheme() {
  // Esperar a que el DOM esté completamente listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyForcedLightTheme);
  } else {
    applyForcedLightTheme();
  }

  function applyForcedLightTheme() {
    // Crear un <style> tag con CSS agresivo
    const style = document.createElement('style');
    style.id = 'forced-light-theme-styles';
    style.textContent = `
      /* ============= FORCED LIGHT THEME ============= */
      /* Esto se ejecuta DESPUÉS de todos los otros CSS para máxima especificidad */

      /* 1. Remover clase dark si existe */
      html {
        --simple-bg: #ffffff !important;
        --simple-text: #1a1a1a !important;
        --simple-border: #e0e0e0 !important;
        --simple-shadow: rgba(0, 0, 0, 0.1) !important;
        color-scheme: light !important;
      }

      html.dark {
        --simple-bg: #ffffff !important;
        --simple-text: #1a1a1a !important;
        --simple-border: #e0e0e0 !important;
        --simple-shadow: rgba(0, 0, 0, 0.1) !important;
      }

      /* 2. Body y elementos globales */
      body, html.dark {
        background-color: #f5f5f5 !important;
        color: #1a1a1a !important;
      }

      /* 3. Headers */
      header, header.dark {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border-bottom: 1px solid #e0e0e0 !important;
      }

      /* 4. Sidebar */
      aside, aside.dark, [role="complementary"], [role="complementary"].dark {
        background-color: #f8f9fa !important;
        color: #1a1a1a !important;
        border-right: 1px solid #e0e0e0 !important;
      }

      /* 5. Main content */
      main, main.dark {
        background-color: #f5f5f5 !important;
        color: #1a1a1a !important;
      }

      /* 6. Sections y divs principales */
      .section, [id^="section-"], .section.dark {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border: 1px solid #e0e0e0 !important;
      }

      /* 7. Tarjetas y panels */
      .card, .panel, .dashboard-summary-card, [class*="card"], [class*="panel"] {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border: 1px solid #e0e0e0 !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
      }

      .dark .card, .dark .panel, .dark .dashboard-summary-card {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
      }

      /* 8. Formularios */
      input, textarea, select {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border: 1px solid #d0d0d0 !important;
      }

      input:focus, textarea:focus, select:focus {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border-color: #0066cc !important;
        box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1) !important;
      }

      /* 9. Botones */
      button, [role="button"] {
        background-color: #0066cc !important;
        color: #ffffff !important;
        border: none !important;
      }

      button:hover {
        background-color: #004699 !important;
      }

      button.secondary, button.outline {
        background-color: #f0f0f0 !important;
        color: #1a1a1a !important;
        border: 1px solid #d0d0d0 !important;
      }

      /* 10. Tablas */
      table, thead, tbody {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border: 1px solid #e0e0e0 !important;
      }

      thead {
        background-color: #f8f9fa !important;
      }

      tr:nth-child(even) {
        background-color: #fafafa !important;
      }

      /* 11. Text colors - override all dark text */
      p, span, a, li, label, h1, h2, h3, h4, h5, h6 {
        color: #1a1a1a !important;
      }

      a {
        color: #0066cc !important;
      }

      a:hover {
        color: #004699 !important;
      }

      /* 12. Backgrounds - override all dark backgrounds */
      .bg-white, .bg-gray-50, .bg-gray-100 {
        background-color: #ffffff !important;
      }

      .dark .bg-white, .dark .bg-gray-50, .dark .bg-gray-100 {
        background-color: #ffffff !important;
      }

      /* 13. Elementos específicos del dashboard */
      .dashboard-stat-btn, .dashboard-kpi-card, .dashboard-panel {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border: 1px solid #e0e0e0 !important;
      }

      /* 14. Icons y símbolos */
      svg, [class*="icon"] {
        color: #1a1a1a !important;
      }

      /* 15. Modals y dialogs */
      dialog, [role="dialog"], .modal {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
      }

      /* 16. Alerts y notificaciones */
      .alert, .notification, [role="alert"] {
        background-color: #f0f8ff !important;
        color: #1a1a1a !important;
        border: 1px solid #b3d9ff !important;
      }

      /* 17. Footers */
      footer, [role="contentinfo"] {
        background-color: #f8f9fa !important;
        color: #1a1a1a !important;
        border-top: 1px solid #e0e0e0 !important;
      }

      /* 18. Generic dark mode override for all Tailwind classes */
      .dark, html.dark * {
        background-color: inherit !important;
        color: inherit !important;
      }

      /* 19. Tailwind dark: variants - FORCE LIGHT */
      .dark\\:bg-gray-900, .dark\\:bg-gray-800, .dark\\:text-white {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
      }
    `;

    // Agregar al HEAD para máxima especificidad
    document.head.appendChild(style);

    // Remover clase dark del HTML si existe
    document.documentElement.classList.remove('dark');

    // Asegurar que nunca vuelva a agregarse
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.classList && mutation.target.classList.contains('dark')) {
          mutation.target.classList.remove('dark');
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  }
})();
