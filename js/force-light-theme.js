/**
 * force-light-theme.js
 * Inyecta CSS agresivo para forzar modo light en toda la aplicación
 * EXCEPTO el login (que se deja intacto)
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
      /* NOTA: El login NO se modifica - se deja completamente intacto */

      /* 1. Remove dark class if present */
      html {
        color-scheme: light !important;
      }

      html.dark {
        --simple-bg: #ffffff !important;
        --simple-text: #1a1a1a !important;
      }

      /* 2. Global backgrounds - maximum specificity - EXCEPTO LOGIN */
      html:not(.login-visible), 
      html.dark:not(.login-visible),
      body:not([data-page="login"]),
      body.dark:not([data-page="login"]),
      main:not(.login-page),
      main.dark:not(.login-page) {
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

      /* 5. ALL SECTIONS - maximum specificity override - EXCEPTO LOGIN */
      .section:not(.login-screen), 
      .section.dark:not(.login-screen),
      [id^="section-"]:not(#login-screen), 
      [id^="section-"].dark:not(#login-screen),
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
      html.dark .section:not(.login-screen),
      html.dark [id^="section-"]:not(#login-screen),
      html.dark .bg-gray-900,
      html.dark .bg-gray-800,
      html.dark .dark\\:bg-gray-900 {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
      }

      /* 7. Cards and panels */
      .card:not(.login-card), 
      .card.dark:not(.login-card),
      .panel:not(.login-panel),
      .panel.dark:not(.login-panel),
      .dashboard-summary-card, .dashboard-summary-card.dark,
      .dashboard-kpi-card, .dashboard-kpi-card.dark,
      [class*="card"]:not(.login-card), 
      [class*="card"].dark:not(.login-card),
      [class*="panel"]:not(.login-panel),
      [class*="panel"].dark:not(.login-panel) {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border: 1px solid #e0e0e0 !important;
      }

      /* 8. Buttons */
      button:not(.login-btn), 
      button.dark:not(.login-btn),
      [role="button"]:not(.login-btn),
      [role="button"].dark:not(.login-btn) {
        background-color: #0066cc !important;
        color: #ffffff !important;
        border: none !important;
      }

      button:not(.login-btn):hover,
      button:not(.login-btn):hover.dark {
        background-color: #004699 !important;
      }

      /* 9. Forms - PERO NO EL LOGIN */
      .umsnh-login__form,
      #login-form,
      .login-screen,
      #login-screen {
        /* NO MODIFICAR - DEJAR INTACTO */
      }

      /* Otros formularios SÍ se modifican */
      form:not(.umsnh-login__form):not(#login-form),
      input:not(.login-input), 
      input.dark:not(.login-input),
      textarea:not(.login-textarea),
      textarea.dark:not(.login-textarea),
      select:not(.login-select),
      select.dark:not(.login-select) {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border: 1px solid #d0d0d0 !important;
      }

      input:not(.login-input):focus,
      textarea:not(.login-textarea):focus,
      select:not(.login-select):focus {
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
      p:not(.login-text), 
      span:not(.login-text), 
      a:not(.login-link), 
      li:not(.login-item), 
      label:not(.login-label),
      h1:not(.login-heading), 
      h2:not(.login-heading),
      h3:not(.login-heading),
      h4:not(.login-heading),
      h5:not(.login-heading),
      h6:not(.login-heading) {
        color: #1a1a1a !important;
      }

      /* 12. Footer */
      footer, [role="contentinfo"] {
        background-color: #f8f9fa !important;
        color: #1a1a1a !important;
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

    // Remove dark class if present (pero solo en sections, no en login)
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
