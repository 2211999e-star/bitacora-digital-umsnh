/**
 * force-light-theme.js
 * Inyecta CSS agresivo para forzar modo light en toda la aplicación
 * Se ejecuta DESPUÉS de que se cargue la página para máxima especificidad
 */

(function forceLightTheme() {
  // Ejecutar inmediatamente
  applyForcedLightTheme();

  function applyForcedLightTheme() {
    // Crear un <style> tag con CSS EXTREMADAMENTE agresivo
    const style = document.createElement('style');
    style.id = 'forced-light-theme-ultra';
    style.textContent = `
      /* ============= ULTRA AGGRESSIVE LIGHT THEME OVERRIDE ============= */

      /* 1. Remove dark class if present */
      html {
        color-scheme: light !important;
      }

      html.dark {
        --simple-bg: #ffffff !important;
        --simple-text: #1a1a1a !important;
      }

      /* 2. Global backgrounds - maximum specificity */
      html, html.dark, body, body.dark, main, main.dark {
        background-color: #f5f5f5 !important;
        color: #1a1a1a !important;
      }

      /* 3. Headers - force light */
      header, header.dark, [role="banner"], [role="banner"].dark {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border-bottom: 1px solid #e0e0e0 !important;
      }

      /* 4. Sidebars - force light */
      aside, aside.dark, [role="complementary"], [role="complementary"].dark,
      .sidebar, .sidebar.dark, nav, nav.dark {
        background-color: #f8f9fa !important;
        color: #1a1a1a !important;
      }

      /* 5. ALL SECTIONS - maximum specificity override */
      .section, .section.dark,
      [id^="section-"], [id^="section-"].dark,
      #section-dashboard, #section-dashboard.dark,
      #section-incidencias, #section-incidencias.dark,
      #section-eventos, #section-eventos.dark,
      #section-documentos, #section-documentos.dark,
      #section-reportes, #section-reportes.dark,
      #section-configuracion, #section-configuracion.dark,
      #section-usuarios, #section-usuarios.dark {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border: 1px solid #e0e0e0 !important;
      }

      /* 6. Dark mode variant override - CRITICAL */
      html.dark .section,
      html.dark [id^="section-"],
      html.dark .bg-gray-900,
      html.dark .bg-gray-800,
      html.dark .dark\\:bg-gray-900 {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
      }

      /* 7. Cards and panels */
      .card, .card.dark, .panel, .panel.dark,
      .dashboard-summary-card, .dashboard-summary-card.dark,
      .dashboard-kpi-card, .dashboard-kpi-card.dark,
      [class*="card"], [class*="card"].dark,
      [class*="panel"], [class*="panel"].dark {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border: 1px solid #e0e0e0 !important;
      }

      /* 8. Buttons */
      button, button.dark, [role="button"], [role="button"].dark {
        background-color: #0066cc !important;
        color: #ffffff !important;
        border: none !important;
      }

      button:hover, button:hover.dark {
        background-color: #004699 !important;
      }

      /* 9. Forms */
      input, input.dark, textarea, textarea.dark, select, select.dark {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border: 1px solid #d0d0d0 !important;
      }

      input:focus, textarea:focus, select:focus {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border-color: #0066cc !important;
      }

      /* 10. Tables */
      table, thead, tbody, tr, td, th {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
      }

      thead {
        background-color: #f8f9fa !important;
      }

      /* 11. Text elements */
      p, span, a, li, label, h1, h2, h3, h4, h5, h6 {
        color: #1a1a1a !important;
      }

      /* 12. Utilities: remove all dark color overrides */
      .dark\\:text-white, .dark\\:text-gray-100, .dark\\:text-gray-50 {
        color: #1a1a1a !important;
      }

      .dark\\:bg-gray-900, .dark\\:bg-gray-800, .dark\\:bg-gray-700,
      .dark\\:bg-slate-900, .dark\\:bg-slate-800 {
        background-color: #ffffff !important;
      }

      /* 13. Specific dark theme color overrides from Tailwind */
      html.dark .dark\\:bg-gray-900,
      html.dark .dark\\:bg-gray-800,
      html.dark .dark\\:text-white {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
      }

      /* 14. Remove any dark filters */
      html.dark, html.dark * {
        filter: none !important;
      }

      /* 15. Footer */
      footer, [role="contentinfo"] {
        background-color: #f8f9fa !important;
        color: #1a1a1a !important;
      }

      /* 16. Force remove dark class styles */
      @supports selector(:has(+ *)) {
        :root:has(.dark) {
          color-scheme: light !important;
        }
      }
    `;

    // Insert at end of HEAD for maximum specificity
    if (document.head) {
      document.head.appendChild(style);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.head.appendChild(style);
      });
    }

    // Remove dark class if present
    document.documentElement.classList.remove('dark');

    // Monitor for class changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: false
    });
  }
})();
