# ⚡ QUICK START - Activar Bitácora Digital en Línea

## 5 pasos = 15 minutos ⏱️

### 📍 PASO 1: Crear Supabase (5 minutos)

```
→ https://app.supabase.com
→ "New project"
→ Name: bitacora-umsnh
→ Password: (cualquier contraseña fuerte)
→ Region: São Paulo (Latinoamérica)
→ Crear y esperar 2-3 minutos
```

---

### 📍 PASO 2: Crear tablas (2 minutos)

```
1. En Supabase: SQL Editor → New Query
2. Abre el archivo: SUPABASE_SETUP.sql
3. Copia TODO el contenido
4. Pega en SQL Editor
5. Click ▶ (Run)
6. Espera ✅ verde
```

---

### 📍 PASO 3: Copiar credenciales (1 minuto)

```
En Supabase:
  Settings → API

Copia estos dos valores:
  • Project URL (ej: https://abc.supabase.co)
  • anon public (la clave larga)

Guárdalos en notepad por mientras
```

---

### 📍 PASO 4: Configurar app (3 minutos)

```
1. Abre: http://localhost:8000/bitacora-digital-umsnh/
2. Click ⚙️ (Configuración) - arriba a la derecha
3. Busca: "Configuración de Supabase"
4. Pega:
   - URL de Supabase: [PEGA LA URL]
   - Clave Anon: [PEGA LA CLAVE]
5. Click "Guardar configuración"
6. Click "Probar conexión" → ✅ exitosa
```

---

### 📍 PASO 5: Crear usuario (3 minutos)

```
En Supabase:
  Authentication → Users → Invite

Completa:
  • Email: admin@umich.mx
  • DESMARCAR "Auto send invite"
  • Abajo: Click "Set password"
  • Password: (contraseña fuerte)
  • Invite

Ahora en la app usa este usuario para login
```

---

## ✅ ¡LISTO!

Ahora todos los registros se guardan **en línea en Supabase** 🎉

---

## 📝 Si necesitas ayuda

**Archivo de guía detallada:** `GUIA_CONFIGURACION_ONLINE.md`

**Errores comunes:**
- ❌ "API Key no válida" → Copia sin espacios extras
- ❌ "Tabla no encontrada" → Corre el SQL script otra vez
- ❌ "Registros en localStorage" → Abre DevTools > Console > `localStorage.removeItem('bitacora_umich_forceOffline')` > Recarga

---

## 🎯 Qué cambió en la aplicación

Hicimos que la app:
- ✅ Leyera credenciales de localStorage (fácil de configurar)
- ✅ Desactivara el modo offline forzado (ahora permite conectar)
- ✅ Tuviera funciones para probar la conexión a Supabase
- ✅ Validara correctamente las credenciales

Ahora la puedes conectar a Supabase en 15 minutos.

---

**Creado:** 15 de junio de 2026
**Versión:** 1.5.2
