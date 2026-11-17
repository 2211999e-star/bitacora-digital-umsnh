# Datos de la bitacora

Esta carpeta conserva registros transcritos de las fotografias del pizarron. La aplicacion incluye una API propia para sincronizar los datos con MariaDB en instalaciones Ubuntu/Apache.

## Archivos

- `whiteboard-records.json`: registros transcritos de las fotografias del pizarron.

## Esquema de un registro

```json
{
  "id": "tablero-2026-04-13-impresora-chulada",
  "date": "2026-04-13",
  "status": "pendiente",
  "desc": "Impresora Chulada",
  "action_detail": "Mantenimiento",
  "assigned_to": "",
  "location": "",
  "source": "pizarron-2026-09-29"
}
```

En GitHub Pages los registros iniciales se copian a `localStorage` para que la demostracion funcione sin servidor. En el modo MariaDB no se insertan automaticamente; migra los datos existentes con la opcion de respaldo de la aplicacion.
