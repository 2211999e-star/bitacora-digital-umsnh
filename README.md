# Proyecto de mantenimiento web

Este repositorio contiene dos resultados principales:

- `index.html`: una página web estática de presentación basada en un dashboard de mantenimiento.
- `bitacora-digital-umsnh/index.html`: una aplicación web más completa con UI de bitácora, modo offline y soporte opcional de Supabase.

> Nota: El archivo `manage.py` y las dependencias de Flask son remanentes históricos. El paquete `app` no está presente en este repositorio, por lo que el backend Flask no puede ejecutarse actualmente.

## Cómo abrir el proyecto

### Opción recomendada: servidor estático local

```powershell
cd "c:\Users\KEVIN\Desktop\sistema-mantenimiento-web"
python -m http.server 8000
```

Luego abre en el navegador:

- `http://127.0.0.1:8000/` para la página de presentación
- `http://127.0.0.1:8000/bitacora-digital-umsnh/` para la aplicación principal

> Si deseas abrir la app rápida, también puedes usar `./bitacora-digital-umsnh/index.html` desde el explorador si no usas servidor local.

### Opción directa

- Abre `index.html` para la página de presentación.
- Abre `bitacora-digital-umsnh/index.html` para la aplicación de bitácora.

## Estado actual

- `bitacora-digital-umsnh/` es un frontend estático que funciona con HTML/CSS/JS.
- El backend Flask original ya no está disponible en este repositorio.
- Si deseas restaurar el backend, necesitas recuperar el paquete `app/` y sus modelos asociados.
- El sitio puede ejecutarse localmente en `http://127.0.0.1:8000/` y la app principal en `http://127.0.0.1:8000/bitacora-digital-umsnh/`.

