## v1.4.0 — 2026-06-04

### Nuevo
- PWA / Offline: `manifest.webmanifest` + `sw.js` para cache de archivos locales y mejor experiencia sin internet.
- Configuración: switch **Forzar modo offline** (ideal si Supabase aún no está listo).
- Configuración: botón **Borrar datos locales** (limpia incidencias/eventos/usuarios del navegador, no afecta Supabase).
- Barra superior: indicador de estado (**Nube / Offline / Sin internet**).
- Búsqueda rápida (Command Palette): **Ctrl+K** para buscar incidencias y eventos y abrirlos al instante.

### Mejoras
- Modales/overlays: mejor accesibilidad (teclado y ARIA) para cerrar y navegar.
- UX: enfoque automático en campos principales al abrir modales.
- PDFs: metadatos y encabezado configurable (orgUnit/faculty) + nombre de archivo con folio.

### Técnico
- Service Worker: respuesta 204 a `/@vite/client` para reducir ruido de 404 en entornos que lo solicitan.

---

## v1.4.1 — 2026-06-04

### Mejoras
- Rendimiento: `preconnect` a CDNs + scripts externos con `defer` para mejorar el tiempo de carga.
- Accesibilidad: modales con `role="dialog"` y `aria-modal="true"`.
- UX: el buscador global ahora bloquea el scroll de fondo y `Esc` cierra modales de forma consistente.

---

## v1.5.0 — 2026-06-04

### Nuevo
- Exportación **CSV** para Incidencias y Eventos (respeta búsqueda/filtros actuales).
- Sistema de **toasts** (notificaciones ligeras) para acciones rápidas como exportaciones.

### Mejoras
- Diseño: estados vacíos con CTA (botón para crear nueva incidencia/evento).
- Búsqueda rápida: ahora incluye “recientes” y busca por más campos (folio/ubicación/equipo/etc.).

---

## v1.5.1 — 2026-06-04

### Mejoras
- Incidencias: el buscador ahora encuentra también por **folio**, **ubicación** (edificio/carrera/salón/turno) y datos del equipo.
- Detalle de incidencia: botones para **copiar folio / ubicación / resumen** al portapapeles (con toast).
- Tablas: encabezado **sticky** + zebra stripes suaves para lectura más cómoda.

---

## v1.5.2 — 2026-06-04

### Mejoras
- Cache-busting en `app.js` y `sw.js` para que GitHub Pages y navegadores carguen la versión más reciente sin “atorarse” con caché.

---

## v1.5.3 — 2026-06-04

### Arreglos / Mejoras
- Service Worker: soporte correcto para cache-busting (`?v=`) guardando y resolviendo recursos con y sin querystring (mejor offline).
- Auth: si intentas entrar con credenciales demo, el sistema sugiere activar **Modo revisión** (evita confusión).
- UX: `Esc` cierra de forma consistente menús `<details>` y overlays; click fuera cierra menús.

---

## v1.6.0 — 2026-06-04

### Mejoras de interfaz
- Botones de icono unificados en topbar, cierres de modal y acciones rápidas.
- Focus, hover y estados disabled más consistentes en botones, formularios y archivos.
- Tarjetas de configuración más claras visualmente, con badges de estado.

### Configuración
- Nuevo bloque más claro para **Modo revisión** dentro de Configuración.
- Indicador visual para **modo de guardado** (Offline / Nube).
- Service Worker mejor preparado para convivir con cache-busting y modo offline.
