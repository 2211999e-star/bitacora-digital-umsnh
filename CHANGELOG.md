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

---

## v1.6.1 — 2026-06-04

### Mejoras
- El nombre del usuario actual ahora se muestra mejor en la interfaz superior y con mejores fallbacks si falta `full_name`.
- Configuración: nuevo resumen superior con estado de guardado, modo revisión y sesión actual.
- Incidencias y eventos ahora muestran mejor quién registró el elemento.
- Mensajes de éxito más claros al crear/editar usuarios, incidencias y eventos.

---

## v1.6.2 — 2026-06-04

### Inspirado en referencias de mantenimiento
- Dashboard con indicador de **críticas** en la cabecera.
- Nuevo panel de **Ítems críticos** para incidencias urgentes, altas o vencidas.
- Nuevo panel de **Próximos 7 días** con eventos y entregas cercanas.
- Enfoque más tipo “centro de control” para operación y seguimiento.

---

## v1.6.3 — 2026-06-04

### Inspirado en SISMANUT
- Dashboard reforzado con bloques de **Histórico**, **Correctivas** y **Calendario de mantenimiento**.
- Más cercanía visual a una interfaz de mantenimiento industrial, pero conservando el estilo propio del sistema.
- Mejor jerarquía de monitoreo para seguimiento diario.

---

## v1.6.4 — 2026-06-04

### Centro de control
- Encabezado del dashboard más fuerte, con visión general y acciones principales.
- Nuevo bloque de **Alerta operativa** para urgencias y vencimientos inmediatos.
- Nueva **Distribución por estado** con barras visuales para seguimiento rápido.

---

## v1.6.5 — 2026-06-04

### Lectura rápida
- Nuevo resumen de salud operativa con tarjetas `OK`, `Atención` y `Urgente`.
- Más lectura inmediata del estado general al entrar al dashboard.

---

## v1.6.6 — 2026-06-04

### Interacciones
- Calendario del dashboard ahora es interactivo (click en días con agenda para ver eventos/entregas).
- Paneles de **Ítems críticos** y **Próximos 7 días** ahora incluyen botón directo para ver el registro.

---

## v1.6.7 — 2026-06-04

### Preventivo / Correctivo (más tipo SISMANUT)
- Se agregó selector de **Tipo de mantenimiento** (Preventivo/Correctivo) en el registro de incidencias.
- Se guarda como metadata (`mantenimiento`) dentro de Observaciones para mantener compatibilidad sin migraciones.
- Nuevo filtro en Incidencias para **Mantenimiento: Preventivo/Correctivo**.
- Dashboard y Reportes ahora calculan preventivo/correctivo desde esa metadata (con fallback a datos antiguos).

---

## v1.6.8 — 2026-06-04

### UX (flujo tipo SISMANUT)
- Accesos rápidos para **Nueva correctiva** y **Nueva preventiva** desde dashboard y sección de incidencias.
- “Tabs” rápidos en Incidencias para filtrar: Todas / Preventivo / Correctivo.
- El filtro de “Tipo de servicio” ahora se auto-completa con valores detectados en tus registros (compatibilidad con datos viejos).

---

## v1.6.9 — 2026-06-04

### Claridad
- Tabla de Incidencias ahora muestra columna **Mantenimiento** (Preventivo/Correctivo).
- El detalle de una incidencia ahora incluye “Mantenimiento” en el resumen/copia rápida.

---

## v1.7.0 — 2026-06-04

### Filtros más tipo “sistema de mantenimiento”
- Nuevo estado agrupado: **Activos** (Pendiente + En proceso).
- Nuevo filtro por **Entrega**: vencidas, hoy, próximos 7 días, sin fecha.
- Tarjetas de salud del dashboard ahora son clickeables para navegar a Incidencias con filtros aplicados.

---

## v1.7.1 — 2026-06-04

### Navegación operativa
- Tarjetas principales del dashboard ahora navegan a Incidencias con filtros/presets.
- Bloques de **Histórico** y **Correctivas** también abren vistas filtradas útiles.
- Incidencias ahora permite ordenar por fecha, entrega, prioridad y abiertas primero.
- Eventos mejora con filtros de fecha: hoy, próximos 7 días y atrasados.
