# Bitácora Digital

Sistema **ultra simple** para registrar actividades de mantenimiento/soporte como bitácora.

## Qué hace
- Guardar actividades como **Pendiente** o **Realizada**
- Registrar opcionalmente computadoras e impresoras con número de patrimonio, tipo de mantenimiento y número de serie
- Marcar una actividad como **completada**
- Filtrar por **mes** o por **rango de fechas**
- Buscar por texto (equipo, lugar, persona, etc.)
- Exportar reportes a **Excel (.xlsx)**
- Imprimir la vista filtrada (día/mes) desde el botón **Imprimir**
- Descargar y restaurar un respaldo `.json` con actividades, eventos y perfiles
- Elegir cuántos registros mostrar por página y usar atajos de teclado

## Cómo usar
1. Entra a la página
2. Clic en **Nueva actividad**
3. Llena: actividad, ubicación, área y responsable(s)
4. Guarda
5. Usa **Excel** o **Imprimir** con los filtros que necesites
6. Abre **Acciones → Descargar respaldo** para guardar una copia. Restaurar una copia reemplaza los registros y eventos actuales.

## Atajos
- **Ctrl/Cmd + K**: enfocar búsqueda
- **Alt + N**: crear actividad

## Almacenamiento y despliegue

### GitHub Pages / modo local
- Por defecto, `js/config.js` deja desactivada la API. Los datos se guardan en LocalStorage y el acceso de demostración no es autenticación segura.
- Este modo sirve para pruebas; no uses datos confidenciales ni lo publiques como sistema compartido.
- GitHub Pages se despliega desde `main` mediante `.github/workflows/deploy-pages.yml`.

### Ubuntu + Apache + PHP + MariaDB
La aplicación incluye una API PHP para autenticar usuarios y compartir actividades, eventos y perfiles entre dispositivos. Requiere PHP 8.1 o superior con `pdo_mysql`, MariaDB y HTTPS para producción.

1. Instala Apache, MariaDB y PHP con el controlador MySQL, e inicia los servicios:
   ```sh
   sudo apt update
   sudo apt install apache2 mariadb-server php libapache2-mod-php php-mysql
   sudo systemctl enable --now apache2 mariadb
   ```
2. Crea una base y un usuario MariaDB exclusivo para la aplicación (usa una contraseña larga y reemplaza los valores de ejemplo):
   ```sql
   CREATE DATABASE bitacora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'bitacora_app'@'localhost' IDENTIFIED BY 'USA_UNA_CONTRASENA_LARGA';
   ```
3. En una base nueva, importa `api/schema.sql`. Si ya habías creado las tablas antes de esta actualización, aplica también la migración que añade el permiso de administración y habilita la cuenta `ivan`:
   ```sh
   sudo mariadb bitacora < api/schema.sql
   sudo mariadb bitacora < api/migration-admin-users.sql
   ```
   En una instalación nueva, la migración también se puede ejecutar; es idempotente.
4. Otorga al usuario solo los permisos que necesita:
   ```sql
   GRANT SELECT, INSERT, UPDATE ON bitacora.users TO 'bitacora_app'@'localhost';
   GRANT SELECT, UPDATE ON bitacora.app_state TO 'bitacora_app'@'localhost';
   FLUSH PRIVILEGES;
   ```
5. Copia `api/config.example.php` a `/etc/bitacora-digital/config.php`, completa conexión y contraseña, y protege el archivo:
   ```sh
   sudo install -d -o root -g www-data -m 750 /etc/bitacora-digital
   sudo install -o root -g www-data -m 640 api/config.example.php /etc/bitacora-digital/config.php
   sudo nano /etc/bitacora-digital/config.php
   ```
6. Ejecuta `api/create-user.php` para crear las cuentas iniciales `ivan` y `kevin`. El script solicita las contraseñas de forma interactiva y requiere al menos 12 caracteres. La cuenta `ivan` queda como administradora:
   ```sh
   sudo -u www-data php api/create-user.php
   ```
7. En el servidor, cambia `window.BITACORA_API_URL` en `js/config.js` a `'./api/index.php'`. No pongas contraseñas ni secretos en ese archivo.
8. Publica el contenido de la aplicación en el `DocumentRoot` de Apache y configura HTTPS. La API y la interfaz deben quedar bajo el mismo origen.
9. Abre `https://tu-dominio/api/index.php?action=health`; debe responder `{"ok":true}`. Después inicia sesión con una de las cuentas creadas.

Los cambios aparecen inicialmente como locales y el indicador del sistema informa si ya se sincronizaron. La API usa revisiones para impedir que una sesión sobrescriba silenciosamente cambios de otra; ante un conflicto, conserva la copia local y muestra un error. Descarga un respaldo antes de recargar y obtener la versión del servidor.

Al iniciar sesión como `ivan`, abre el menú de usuario y selecciona **Administrar usuarios** para crear cuentas y cambiar contraseñas. Las altas y cambios se escriben directamente en la tabla `users` de MariaDB; las cuentas creadas desde el panel no reciben permisos de administración. Solo una cuenta marcada `is_admin` en la base de datos puede usar estas operaciones.

Para llevar datos del sitio anterior, descarga primero **Acciones → Descargar respaldo** desde el navegador antiguo. Entra al servidor, inicia sesión y usa **Acciones → Restaurar respaldo**. Restaurar reemplaza el estado compartido completo.

No se ha instalado ni probado un servidor Ubuntu en este entorno. Configura MariaDB y Apache en el servidor real antes de usarlo con información de producción; mantén copias de seguridad regulares de la base de datos.
