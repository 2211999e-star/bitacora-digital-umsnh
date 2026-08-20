# Bitácora Digital (modo simple)

Sistema **ultra simple** para registrar actividades de mantenimiento/soporte como bitácora.

## Qué hace
- Guardar actividades como **Pendiente** o **Realizada**
- Marcar una actividad como **completada**
- Filtrar por **mes** o por **rango de fechas**
- Buscar por texto (equipo, lugar, persona, etc.)
- Exportar a **Excel** (se descarga como `.csv`, Excel lo abre)
- Imprimir la vista filtrada (día/mes) desde el botón **Imprimir**

## Cómo usar
1. Entra a la página
2. Clic en **Nueva actividad**
3. Llena: actividad, ubicación, área y responsable(s)
4. Guarda
5. Usa **Excel** o **Imprimir** con los filtros que necesites

## Notas
- Los datos se guardan en el navegador (LocalStorage). Si cambias de navegador o borras datos del sitio, se pierden.
- Para GitHub Pages se despliega desde la rama `main` (workflow en `.github/workflows/deploy-pages.yml`).
