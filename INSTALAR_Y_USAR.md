# 🎯 Bitácora Digital UMSNH - Instalación y Setup

## 🚀 Inicio rápido

### Opción 1: Ejecutar en local (sin conexión de internet)

```bash
cd bitacora-digital-umsnh
# Windows (PowerShell)
python -m http.server 8000

# macOS / Linux
python3 -m http.server 8000
```

Luego abre: `http://localhost:8000/bitacora-digital-umsnh/`

**Credenciales de prueba:**
- Usuario: `221199e`
- Contraseña: `123456789`

Los datos se guardarán en localStorage de tu navegador.

---

## 🌐 Opción 2: Conectar a Supabase (RECOMENDADO para producción)

### Paso 1: Crear proyecto Supabase

1. Ve a https://app.supabase.com/
2. Haz click en "New project"
3. Llena los datos:
   - **Project name**: bitacora-umsnh (o cualquier nombre)
   - **Database password**: Contraseña fuerte (anota en un lugar seguro)
   - **Region**: Elige la más cercana a tu ubicación (ej: São Paulo para Latinoamérica)
4. Espera 2-3 minutos a que se inicialice

### Paso 2: Crear las tablas

1. En tu proyecto Supabase, abre **SQL Editor** (lado izquierdo)
2. Click en "New Query"
3. Abre el archivo `SUPABASE_SETUP.sql` en este proyecto
4. Copia TODO el contenido
5. Pégalo en el editor SQL de Supabase
6. Haz click en ▶ (Run) o presiona Ctrl+Enter
7. Espera a que termine (verás ✅ verde)

**Tablas que se crearán:**
- `users` - Perfiles de usuario con roles
- `activities` - Incidencias y registros de mantenimiento
- `events` - Eventos programados
- `reports` - Reportes generados
- `audit_log` - Registro de auditoría

### Paso 3: Obtener credenciales

1. En Supabase, click en **Settings** (ícono de engranaje, abajo a la izquierda)
2. Click en **API**
3. Copia:
   - **Project URL** (ej: `https://abc123.supabase.co`)
   - **anon public** (la clave larga que empieza con `eyJ...`)

### Paso 4: Configurar la aplicación

1. Abre la app: `http://localhost:8000/bitacora-digital-umsnh/`
2. En la pantalla de login, busca **Configuración** (⚙️) en la esquina superior
3. Busca la sección "Configuración de Supabase"
4. Pega:
   - **URL de Supabase**: Pega la URL del paso anterior
   - **Clave Anon**: Pega la clave pública del paso anterior
5. Haz click en **Guardar configuración**
6. Haz click en **Probar conexión** (debería aparecer ✅)

### Paso 5: Crear usuario administrativo

1. En Supabase, ve a **Authentication** (lado izquierdo)
2. Click en **Users**
3. Click en **Invite**
4. Crea un usuario:
   - **Email**: admin@umich.mx (o tu email)
   - **Auto send invite**: Desmarca (vamos a crear con contraseña)
5. Debajo, haz click en "Set password"
6. Ingresa una contraseña fuerte

### Paso 6: Iniciar sesión

1. En la app, usa las credenciales que acabas de crear
2. ¡Listo! Ahora todos los registros se guardarán en Supabase

---

## 📋 Estructura del proyecto

```
sistema-mantenimiento-web/
├── bitacora-digital-umsnh/     # Frontend (parte que ejecutas)
│   ├── index.html              # Página principal
│   ├── manifest.webmanifest    # PWA (Progressive Web App)
│   ├── js/
│   │   ├── app.js              # Punto de entrada
│   │   ├── config.js           # Configuración de Supabase
│   │   ├── database.js         # Conexión a Supabase / fallback local
│   │   ├── incidencias.js      # Lógica de registros
│   │   ├── dashboard.js        # Dashboard y estadísticas
│   │   ├── reportes.js         # PDF y reportes
│   │   └── ... (otros módulos)
│   ├── css/                    # Estilos (Tailwind CSS)
│   └── sw.js                   # Service Worker (para offline)
├── SUPABASE_SETUP.sql          # ← Script para crear tablas
├── GUIA_CONFIGURACION_ONLINE.md # ← Guía detallada
└── RESUMEN_CAMBIOS_SESION.md   # ← Cambios de esta sesión
```

---

## 🔐 Seguridad

### La aplicación usa:
- **Autenticación** con Supabase Auth
- **RLS (Row Level Security)** - Los usuarios solo ven sus propios registros
- **Claves públicas** (anon key) - Seguro para usar en frontend
- **Auditoría automática** - Todos los cambios quedan registrados

### Credenciales locales (modo offline):
- Usuario: `221199e`
- Contraseña: `123456789`
- ⚠️ Solo para desarrollo/pruebas

---

## 🆘 Solucionar problemas

### "No puedo conectar a Supabase"
```
Error: API Key no válida
```
**Solución:**
- Verifica que copiaste la clave sin espacios extras
- Regenera la clave en Supabase > Settings > API

### "Tabla 'activities' no encontrada"
```
Error: relation "activities" does not exist
```
**Solución:**
- Abre el SQL Editor de Supabase
- Corre nuevamente el script `SUPABASE_SETUP.sql`
- Asegúrate de que no hay errores rojo

### "Registros se guardan en localStorage, no en Supabase"
**Solución:**
- Abre DevTools (F12) > Console
- Escribe: `localStorage.removeItem('bitacora_umich_forceOffline')`
- Presiona Enter
- Recarga la página

### "La app tarda mucho en cargar"
**Solución:**
- Si tarda más de 5 segundos, el fallback te mostrará el login
- Verifica tu conexión a internet
- Verifica que Supabase esté activo

---

## ✨ Funcionalidades principales

### Incidencias (Mantenimiento)
- ✅ Registrar mantenimiento correctivo
- ✅ Registrar mantenimiento preventivo
- ✅ Campos dinámicos según tipo
- ✅ Filtros y búsqueda
- ✅ Exportar a CSV/PDF

### Dashboard
- ✅ Estadísticas en tiempo real
- ✅ Gráficos de estado
- ✅ Alertas de prioridad
- ✅ Recordatorios

### Reportes
- ✅ Reportes personalizados
- ✅ Exportar a PDF
- ✅ Firma digital (en reportes)
- ✅ Filtros avanzados

### Administración
- ✅ Gestión de usuarios (roles)
- ✅ Aprobación/rechazo de solicitudes
- ✅ Suspentar usuarios
- ✅ Auditoría (si eres admin)

---

## 📞 Soporte

Si algo no funciona:

1. **Revisa la consola del navegador** (F12 > Console)
2. **Consulta el archivo `GUIA_CONFIGURACION_ONLINE.md`**
3. **Contacta a CSI UMICH** con los detalles del error

---

## 🎓 Notas de desarrollo

### Tecnologías usadas
- **Frontend**: HTML5, CSS3 (Tailwind), JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Almacenamiento**: Supabase PostgreSQL o localStorage
- **PWA**: Service Worker para uso offline

### Arquitectura
- **Modular**: Cada feature en su propio archivo JS
- **Responsive**: Funciona en desktop, tablet, móvil
- **Offline-first**: Funciona sin internet (modo local)
- **Seguro**: RLS, validaciones, auditoría

---

## 📄 Licencia

Uso interno UMSNH - Comisión de Servicios Informáticos

---

**¡Listo!** La app está lista para usar. 🎉

**Próximo paso:** Sigue la `GUIA_CONFIGURACION_ONLINE.md` para conectarla a Supabase.
