# Bitácora Digital Institucional UMSNH

Sistema web tipo “sistema en la nube” para la **Comisión de Servicios Informáticos** de la **Universidad Michoacana de San Nicolás de Hidalgo (UMSNH)**.  
Permite registrar, administrar y dar seguimiento a **incidencias**, **eventos** y **reportes oficiales en PDF**, con soporte de **modo offline** (localStorage) y **conexión opcional a Supabase**.

---

## 1) ¿Para qué sirve?

La Bitácora Digital está pensada para uso institucional y académico. Su objetivo es:

- Centralizar el registro de incidencias de soporte (equipo, usuario, área, diagnóstico, estatus, responsable, etc.).
- Dar seguimiento por **estado** (Pendiente / En proceso / Completado / Cancelado) y **prioridad**.
- Registrar **eventos/actividades programadas**.
- Generar **reportes PDF** con encabezado institucional, periodos, firma y logos.
- Trabajar **sin internet** en modo offline y permitir **respaldo/importación**.

---

## 2) Funcionalidades principales

### Dashboard
- Estadísticas de incidencias por estado (incluye **Canceladas**).
- Resumen de mantenimiento preventivo/correctivo.
- Actividades recientes y eventos pendientes.
- Acciones rápidas.

### Incidencias
Registro con campos orientados a mesa de ayuda/soporte:
- Fecha/Hora del registro
- **Fecha de recibido** y **Fecha de entrega** (opcional)
- Reportante, departamento/área, coordinación (opcional)
- Datos del equipo (marca, modelo, serie, SO, RAM, almacenamiento, usuario del equipo)
- Descripción del problema, diagnóstico, observaciones
- Responsable, tipo de servicio
- Estado y evaluación
- **Prioridad** (Baja/Media/Alta/Urgente)

Acciones:
- Ver detalle
- Editar
- Eliminar (solo admin)
- **PDF individual** de una incidencia

### Eventos
- Registro de eventos con fecha/hora, ubicación, asignado, estado y observaciones.
- Vista en tarjetas.
- Eliminación (solo admin).

### Reportes (PDF)
- Reporte general, por mantenimiento (preventivo/correctivo) o por rango de fechas.
- PDF con:
  - Logo UMSNH (y opcional logo de facultad)
  - Encabezado institucional (Dependencia/Facultad opcionales)
  - Tabla de registros
  - Estadísticas por estado (incluye canceladas)
  - Firma opcional

### Configuración
- **Modo offline**: guarda datos en el navegador.
- Conexión opcional a **Supabase**.
- Respaldo (export JSON) e importación (restauración).
- Configuración para reportes: dependencia, facultad, firma, logos.

### Usuarios y roles
Roles previstos:
- **Administrador**: acceso total (incluye gestión de usuarios y eliminación).
- **Coordinador**: revisión, cambios de estado y generación de reportes (según configuración).
- **Practicante**: registro y seguimiento básico (sin eliminación).

> Nota: La UI oculta/expone algunas opciones según rol; la seguridad completa debe reforzarse en backend (Supabase policies) si se despliega a producción.

---

## 3) Estructura del proyecto

```
pagina-main/
├─ css/
│  ├─ tailwind.css
│  ├─ style.css               # agregador (importa parciales)
│  ├─ components.css
│  ├─ forms.css
│  ├─ tables.css
│  ├─ dashboard.css
│  └─ responsive.css
├─ js/
│  ├─ app.js                  # entry (ESM) - expone handlers a window.*
│  ├─ auth.js
│  ├─ dashboard.js
│  ├─ incidencias.js
│  ├─ eventos.js
│  ├─ reportes.js
│  ├─ usuarios.js
│  ├─ config.js
│  ├─ database.js
│  ├─ permissions.js
│  └─ utils.js
├─ img/
│  └─ logos/
│     ├─ logo-umich.png
│     └─ logo-faculty.png
├─ components/
│  └─ README.md
├─ docs/
│  ├─ manual-tecnico.md
│  └─ manual-usuario.md
├─ index.html
├─ .env.example
├─ supabase-schema.sql
├─ manifest.webmanifest
├─ sw.js
└─ favicon.svg
```

### ¿Qué hace cada archivo?
- **index.html**  
  Contiene toda la estructura del sistema: login, sidebar, secciones (dashboard/incidencias/eventos/reportes/configuración/usuarios) y modales.

- **js/app.js**  
  Entry ES Module. Inicializa la app, configura listeners y re-asigna todas las funciones requeridas por `onclick="..."` a `window.*` para mantener compatibilidad.

- **js/** (módulos)  
  Separación por dominio (auth/dashboard/incidencias/eventos/reportes/usuarios/config/database/permissions/utils) sin perder funcionalidad.

- **css/style.css**  
  Agregador de estilos. Importa los parciales para mantener un único `<link>` en `index.html`.

- **img/logos/**  
  Logos institucionales utilizados en interfaz, PWA y reportes PDF.

- **favicon.svg**  
  Ícono base del proyecto para navegador.

---

## 4) Cómo ejecutar (modo local)

Opción simple (servidor estático):

```bash
python -m http.server 8000
```

Luego abrir:
- http://localhost:8000/

---

## 4.1) Modo PWA / Offline (Service Worker)
Este proyecto incluye:
- `manifest.webmanifest`
- `sw.js` (cache de archivos locales para mejorar carga y uso offline)

Notas:
- El Service Worker solo se registra en **http/https** (no en `file://`).
- Para probar, usa `python -m http.server` o GitHub Pages.

---

## 5) Despliegue “modo nube” (Supabase + hosting)

Si vas a usar Supabase:
1. Crea tablas `activities`, `events`, `profiles` (según el modelo esperado).
2. Configura **RLS (Row Level Security)** y políticas por rol.
3. En **Configuración** del sistema pega:
   - Supabase URL
   - Supabase ANON KEY

Si no hay Supabase configurado, el sistema funciona en **modo offline**.

### Opción recomendada: usar el esquema listo (SQL)
En este repositorio se incluye:
- `supabase-schema.sql`

Pasos:
1. En Supabase → **SQL Editor** pega y ejecuta `supabase-schema.sql`.
2. En Supabase → **Authentication → Providers** habilita **Email**.
3. (Opcional) Desactiva “Confirm email” para pruebas internas.
4. En el sistema web → **Configuración** pega tu **Supabase URL** y **ANON KEY** (pública).

> Importante: por requisito institucional, el registro crea cuentas **Pendiente** y deben ser aprobadas por el **administrador principal**.

### Solución de problemas (Supabase)
- Si en consola aparece el error **PGRST205** (por ejemplo: “Could not find the table 'public.activities' in the schema cache”), significa que Supabase está configurado pero **aún no tiene creadas las tablas**.
  - Ejecuta `supabase-schema.sql` en Supabase → **SQL Editor**.
  - Verifica que estén creadas al menos: `profiles`, `activities`, `events`, `settings`.
  - Revisa RLS/policies según tu entorno.
- La app puede activar automáticamente **modo offline** para evitar que la interfaz “se rompa”. Al guardar Supabase de nuevo en **Configuración**, se reintentará el modo nube.

---

## 6) Despliegue en línea (estático)

Este proyecto es **estático** (HTML/CSS/JS). No requiere build para desplegar.

### A) Vercel
1. Sube el proyecto a GitHub.
2. En Vercel → New Project → Importa el repo.
3. Framework preset: **Other**.
4. Build Command: *(vacío)*.
5. Output directory: *(raíz)*.
6. Deploy.

### B) Netlify
1. Sube el proyecto a GitHub.
2. Netlify → Add new site → Import from Git.
3. Build command: *(vacío)*.
4. Publish directory: `./`
5. Deploy.

### C) GitHub Pages
1. En GitHub → Settings → Pages.
2. Source: **Deploy from a branch**.
3. Branch: `main` / folder `/root`.
4. Guardar y abrir la URL que te genere.

> Nota: en GitHub Pages el sitio es público. Usa Supabase con RLS correcto.

---

## 7) Modo revisión (para superiores)

En el login puedes activar **Modo revisión**:
- No altera datos reales: fuerza el sistema a modo local.
- Incluye usuarios demo:
  - `demo.admin@umich.mx` / `demo1234`
  - `demo.coordinador@umich.mx` / `demo1234`
  - `demo.practicante@umich.mx` / `demo1234`
- Muestra un aviso visible de “Modo revisión activo”.

---

## 8) Variables de entorno

Ver:
- `.env.example`

Regla: **NO** expongas claves privadas (Service Role Key). Solo se usa el **ANON KEY**.
1. Supabase → **SQL Editor** → New query
2. Pega el contenido de `supabase-schema.sql` y ejecútalo.
3. Supabase → **Authentication**:
   - Habilita **Email/Password**
   - Para un entorno interno, puedes desactivar temporalmente la confirmación por correo (opcional).

### Configurar credenciales en la app (para todos los usuarios)
En `index.html` hay un bloque:
```js
window.SUPABASE_URL = '';
window.SUPABASE_ANON_KEY = '';
```
Pega ahí tu URL y tu ANON KEY (no uses la Service Role Key).

> Alternativa: desde la sección **Configuración** puedes guardar URL/ANON KEY en localStorage y la app se recarga para aplicarlo.

### Variables de entorno (.env)
Este proyecto es una SPA estática (sin build obligatorio). Se incluye `.env.example` como referencia para despliegues donde sí exista un pipeline que inyecte variables de entorno.

### Hosting (Hostinger)
Como la app es una SPA estática, en Hostinger normalmente basta con:
1. Subir estos archivos a `public_html/`:
  - `index.html`, `css/`, `js/`, `img/`, `manifest.webmanifest`, `sw.js`
2. Verificar que **img/** también se subió.
3. Abrir tu dominio y probar login.

> Nota: si usas Supabase, asegúrate de agregar tu dominio en Supabase → Authentication → URL Configuration (Allowed Redirect URLs).

---

## 6) Estados y consistencia institucional

Estados soportados:
- `pendiente`
- `en_proceso`
- `completado`
- `cancelado`

Se incluyeron badges y métricas para todos los estados para mantener consistencia visual y funcional.
