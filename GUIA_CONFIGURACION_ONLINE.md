# 🚀 GUÍA DE CONFIGURACIÓN ONLINE - BITÁCORA DIGITAL UMSNH

## Pasos para activar Supabase y guardar registros en línea

### PASO 1: Crear un proyecto en Supabase (5 minutos)

1. Ve a https://app.supabase.com/
2. Haz clic en "New project"
3. Completa:
   - **Project name**: `bitacora-umsnh` (o cualquier nombre)
   - **Database password**: Anota una contraseña fuerte
   - **Region**: Elige la más cercana a tu país (ej: São Paulo para Latinoamérica)
4. Haz clic en "Create new project" y espera 2-3 minutos a que se inicialice

### PASO 2: Ejecutar el script SQL (2 minutos)

1. En tu proyecto Supabase, ve a **SQL Editor** (lado izquierdo)
2. Haz clic en "New Query"
3. Abre el archivo `SUPABASE_SETUP.sql` de este proyecto en un editor de texto
4. Copia TODO el contenido del archivo
5. Pega en el SQL Editor de Supabase
6. Haz clic en el botón ▶ (Run) o presiona `Ctrl+Enter`
7. Espera a que se ejecute (deberías ver ✅ verde)

### PASO 3: Obtener las credenciales (2 minutos)

1. En Supabase, ve a **Settings** (ícono de engranaje, abajo a la izquierda)
2. Haz clic en **API**
3. Copia:
   - **Project URL**: Ej: `https://abcdef123456.supabase.co`
   - **anon public**: Ej: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### PASO 4: Configurar la aplicación (3 minutos)

1. Abre la aplicación en el navegador: `http://localhost:8000/bitacora-digital-umsnh/`
2. En la pantalla de login, haz clic en **⚙️ Configuración** (arriba a la derecha)
3. Busca la sección "Configuración de Supabase"
4. Pega:
   - **URL de Supabase**: La Project URL del paso anterior
   - **Clave Anon**: La clave pública del paso anterior
5. Haz clic en **Guardar configuración**
6. Haz clic en **Probar conexión** (debería aparecer ✅ Conexión exitosa)

### PASO 5: Desactivar modo offline (1 minuto)

1. En la misma ventana de configuración
2. Busca "Modo offline" o "Force offline"
3. **Desactiva** esa opción (desmarca el checkbox)
4. Haz clic en **Guardar**
5. **Recarga la página** (Ctrl+R o F5)

### PASO 6: Crear usuario admin (2 minutos)

1. La página debería mostrarte el login
2. En Supabase, ve a **Authentication** > **Users**
3. Haz clic en "Invite"
4. Crea un usuario con:
   - **Email**: Un email válido (ej: admin@umich.mx)
   - **Password**: Una contraseña fuerte
5. En la aplicación, usa ese email y contraseña para login
6. ¡Listo! Ya deberías estar dentro

### PASO 7: Probar guardado en línea (2 minutos)

1. Haz clic en **+ Nueva incidencia**
2. Completa un formulario simple
3. Haz clic en **Registrar**
4. Debería aparecer un mensaje ✅ "Registrada exitosamente"
5. Para verificar, ve a Supabase > **Table Editor** > **activities**
6. Deberías ver tu registro guardado en la tabla

---

## ✅ Checklist de verificación

- [ ] Proyecto Supabase creado
- [ ] Script SQL ejecutado sin errores
- [ ] URL y clave de Supabase copiadas
- [ ] Credenciales configuradas en la app
- [ ] Conexión a Supabase probada ✅
- [ ] Modo offline desactivado
- [ ] Usuario admin creado
- [ ] Primer registro guardado en línea

---

## 🆘 Solucionar problemas

### "Error: API Key no válida"
- **Solución**: Verifica que copiaste correctamente la clave (sin espacios adicionales)
- **Solución 2**: Regenera la clave en Supabase > Settings > API

### "Error: Tabla 'activities' no encontrada"
- **Solución**: Vuelve a ejecutar el script SQL completo
- **Verifica**: En Supabase > Table Editor, deberías ver: users, activities, events, reports, audit_log

### "Error: Sin permisos (PERMISSION DENIED)"
- **Solución**: Las políticas RLS no se aplicaron correctamente
- **Solución 2**: Ve a Supabase > SQL Editor y ejecuta:
  ```sql
  ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
  ALTER TABLE users DISABLE ROW LEVEL SECURITY;
  ```
  (Esto es temporal; después re-habilita una vez funcione)

### "Error de conexión / No se conecta a Supabase"
- **Verifica**: Tu conexión a internet funciona
- **Verifica**: La URL de Supabase comienza con `https://`
- **Solución**: Habilita nuevamente el modo offline temporalmente

### "Registros se guardan en localStorage en lugar de Supabase"
- **Causa**: El modo offline sigue habilitado
- **Solución**: 
  1. Abre DevTools (F12)
  2. Console > `localStorage.removeItem('bitacora_umich_forceOffline')`
  3. Recarga la página

---

## 📊 Próximas mejoras (opcional)

Una vez que todo funciona en línea, puedes:

1. **Autenticación con OAuth** (Google, GitHub): Ve a Supabase > Authentication > Providers
2. **Backups automáticos**: Supabase lo hace automáticamente
3. **Replicación de datos**: Para redundancia y velocidad global
4. **Analytics**: Supabase tiene built-in analytics
5. **Custom domains**: Para producción profesional

---

## 📞 Soporte

Si algo no funciona:
1. Revisa la consola del navegador (F12 > Console) para mensajes de error
2. Verifica que el script SQL se ejecutó completamente (sin errores rojo)
3. Contacta al equipo de CSI UMICH con los detalles del error

---

**¡Listo!** Una vez completados estos pasos, tu aplicación estará **100% en línea** y guardará todos los registros en Supabase.
