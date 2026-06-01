# Manual de Usuario — Bitácora Digital (UMSNH)

## 1. Acceso al sistema
1. Abre la aplicación en tu navegador.
2. Ingresa tu **correo** y **contraseña**.

### 1.1 Solicitud de acceso (registro)
1. En la pantalla de login presiona **“Solicitar acceso”**.
2. Captura: nombre completo, correo institucional y contraseña.
3. La cuenta queda en estado **Pendiente** y debe ser aprobada por el administrador principal.

### 1.2 Estados de cuenta
- **Pendiente**: “Tu cuenta está pendiente de aprobación por el administrador.”
- **Rechazado**: “Tu solicitud de acceso fue rechazada.”
- **Suspendido**: “Tu cuenta se encuentra suspendida. Contacta al administrador.”

### 1.3 Modo revisión (para superiores)
En el login puedes activar **Modo revisión** para evaluar el sistema sin alterar datos reales.
Incluye usuarios demo (contraseña: `demo1234`).

## 2. Navegación general
En el menú lateral puedes acceder a:
- **Dashboard**: indicadores, gráficas y recordatorios.
- **Incidencias**: alta/consulta/edición de incidencias.
- **Eventos**: registro de eventos y seguimiento.
- **Reportes**: exportación de PDFs (incidencias y eventos).
- **Configuración**: modo offline / Supabase / respaldo / preferencias.
- **Usuarios** (solo Admin): gestión de usuarios.

## 3. Dashboard
El dashboard muestra:
- Totales por estado: **Pendiente**, **En proceso**, **Completado**, **Cancelado**.
- Gráficas de incidencias y servicios.
- Recordatorios por fechas (eventos próximos y entregas cercanas).

**Notificaciones**:
- El ícono de campana muestra un contador con recordatorios por fechas.
- Al abrirlo, verás eventos/entregas próximas y atrasadas.

## 4. Incidencias (registro y seguimiento)
### 4.1 Crear una incidencia
1. Ve a **Incidencias**.
2. Clic en **Nueva incidencia**.
3. Completa el formulario rápido:
   - **Ubicación**: edificio, carrera, salón (y turno opcional).
   - **Problema**: selecciona tipo (tarjeta) y una descripción rápida (chip).
   - **Detalles**: prioridad y estado.
4. (Opcional) En **“Información técnica avanzada”** registra características del equipo.
5. Guarda.

### 4.2 Importar datos del equipo (MSINFO32)
En el modal de incidencia puedes:
- Copiar el comando para generar un reporte: **“Copiar comando”**.
- Descargar un script `.cmd` para generarlo: **“Descargar script”**.
- Subir el archivo generado (reporte de equipo) para auto-llenar marca/modelo/SO/RAM/almacenamiento/serie.

### 4.3 Editar / Ver detalle
- **Ver** muestra el detalle en una ventana.
- **Editar** abre el formulario con la información cargada (según permisos).

### 4.4 Marcar como entregado
Si tienes permiso, puedes marcar una incidencia como **completada** y registrar la **fecha de entrega (hoy)**.

### 4.5 Eliminar
Solo **Administrador** puede eliminar incidencias.

## 5. Eventos
### 5.1 Crear evento
1. Ve a **Eventos**.
2. Clic en **Nuevo evento**.
3. Captura fecha/hora, lugar, asignado y estatus.
4. Guarda.

### 5.2 Editar / Eliminar
- Editar: según permisos.
- Eliminar: solo **Administrador**.

## 6. Reportes (PDF)
En **Reportes** puedes generar:
- **Reporte de incidencias** (con filtros por rango de fechas).
- **Reporte preventivo/correctivo** (por tipo de servicio).
- **Reporte de eventos**.

El PDF incluye:
- Encabezado institucional
- Tabla de registros
- Estadísticas por estado
- Firma (opcional) y logos (opcionales)

## 7. Configuración
En **Configuración** puedes:
- Ver si estás en **modo offline** o **conectado a Supabase**.
- Guardar/editar **Supabase URL** y **ANON KEY**.
- Probar conexión.
- Exportar respaldo (JSON) e importar respaldo.
- Configurar datos institucionales de reportes (dependencia/facultad/firma).

## 8. Roles y permisos (resumen)
- **Administrador**: acceso total (incluye usuarios y eliminaciones).
- **Coordinador**: puede editar/gestionar y generar reportes (según configuración).
- **Practicante**: registro/seguimiento básico (sin eliminaciones).
