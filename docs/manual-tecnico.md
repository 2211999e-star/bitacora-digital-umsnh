# Manual Técnico — Bitácora Digital (UMSNH)

## 1. Descripción técnica
Aplicación **SPA estática** (HTML + Tailwind CSS + JS ES Modules) que puede operar en:
- **Modo offline**: persistencia local en `localStorage` (fallback que emula la API de Supabase).
- **Modo nube**: persistencia real usando **Supabase** (Auth + tablas).

Dependencias en runtime (CDN):
- `@supabase/supabase-js` (ESM)
- SweetAlert2
- Chart.js
- jsPDF + AutoTable

## 2. Estructura del proyecto
```
pagina-main/
├─ index.html
├─ js/
│  ├─ app.js              # entry: init + window.* handlers (onclick inline)
│  ├─ database.js         # createSupabase() + fallback local
│  ├─ config.js           # tema + supabase config + backup
│  ├─ auth.js             # login/logout + perfil
│  ├─ dashboard.js        # dashboard + charts + notificaciones
│  ├─ incidencias.js      # CRUD incidencias + MSINFO32 + muestra
│  ├─ eventos.js          # CRUD eventos
│  ├─ documentos.js       # repositorio documental + digitalización local
│  ├─ reportes.js         # controles de reportes + export PDF
│  ├─ usuarios.js         # CRUD profiles (admin)
│  ├─ permissions.js      # helpers de permisos UI
│  └─ utils.js            # estado compartido + helpers
├─ css/
│  ├─ tailwind.css
│  ├─ style.css           # agregador (@import)
│  ├─ components.css
│  ├─ forms.css
│  ├─ tables.css
│  ├─ dashboard.css
│  └─ responsive.css
├─ img/
│  └─ logos/
├─ supabase-schema.sql
└─ .env.example
```

## 3. Entry point y compatibilidad con HTML (onclick inline)
`index.html` contiene múltiples `onclick="..."`.

Para **no romper** el HTML, `js/app.js`:
- Inicializa la app.
- Registra listeners `addEventListener` (submit/change).
- Expone las funciones requeridas por el HTML como `window.*` (wrappers que llaman a los módulos).

Ejemplo:
```js
window.showSection = showSection;
window.exportPDF = (type, options = {}) => exportPDF({ supabase }, type, options);
```

## 4. Supabase vs Fallback local (localStorage)
### 4.1 Selección de modo
En `js/database.js`:
- Si existe `SUPABASE_URL` válida y `SUPABASE_ANON_KEY`, se crea cliente Supabase real.
- Si no, se usa `createSupabaseFallback()` y se marca `supabase.__local = true`.

### 4.2 Fallback local
El fallback implementa:
- `supabase.auth.getSession() / signOut()`
- `supabase.from('tabla').select()/insert()/update()/delete()` con filtros `eq()`, `order()` y `single()`

Persistencia:
- `localStorage` con prefijo `bitacora_umich_` (por ejemplo: `bitacora_umich_activities`).
- Repositorio documental local: `bitacora_umich_documents_v1`.

## 5. Configuración de Supabase
### 5.1 Dónde se definen URL/ANON KEY
Prioridad:
1. `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY` (en `index.html`).
2. `localStorage` (`bitacora_umich_supabaseUrl` / `bitacora_umich_supabaseAnonKey`) guardado desde la UI.

### 5.2 Esquema
Se incluye `supabase-schema.sql` como punto de partida.

Recomendación:
- Activar RLS y usar las políticas incluidas.
- Confirmar que `profiles` exista y contenga:
  - `role` (admin/coordinator/practitioner)
  - `account_status` (pending/approved/rejected/suspended)
  - `is_active`
- El trigger `handle_new_user()` crea perfiles nuevos como:
  - `account_status = 'pending'`
  - `is_active = false`
- Solo el administrador principal (`22119993@umich.mx`) cumple `is_primary_admin()` y puede:
  - aprobar/rechazar/suspender usuarios
  - cambiar roles
  - actualizar configuración crítica (tabla `settings`)

Tablas adicionales:
- `settings` (configuración persistente en DB)
- `reports_log` (registro de generación de reportes)

## 6. Reportes PDF
Implementado en `js/reportes.js` con `jsPDF` + `autoTable`.
Características:
- Encabezado con logos (dataURL guardados en `localStorage`).
- Estadísticas al final y bloque de firma.
- Filtros por fechas (inputs `report-date-start` / `report-date-end`).

## 7. Notificaciones por fechas
Implementado en `js/dashboard.js`.
Calcula:
- Eventos próximos (N días).
- Entregas próximas (N días).
- Atrasos (fechas pasadas).
Actualiza:
- Badge del header.
- Panel de recordatorios del dashboard.

## 8. Desarrollo local / prueba rápida
Servidor estático:
```bash
python -m http.server 8000
```
Abrir:
http://localhost:8000/

## 9. Despliegue
Al ser SPA estática, basta con subir:
- `index.html`
- `/js/*`
- `/css/*`
- `/img/*`

Si se usa Supabase:
- Agregar el dominio a **Allowed Redirect URLs** (Auth settings).
- Verificar políticas RLS.

## 10. Modo revisión
El “Modo revisión” fuerza el sistema a usar el fallback local (sin tocar Supabase) y muestra un banner visible.
Se activa desde login y existe para que superiores prueben la UI sin riesgo de modificar información real.
