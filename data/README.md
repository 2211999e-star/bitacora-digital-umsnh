# Datos de la bitacora

Esta carpeta es la fuente organizada de registros para una futura sincronizacion con una base de datos en la nube.

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

La aplicacion actualmente copia los registros iniciales a `localStorage` para funcionar sin servidor. Esta carpeta deja una fuente estable para migrar despues a Supabase, Firebase o una API propia.
