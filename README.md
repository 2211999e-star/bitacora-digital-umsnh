# Bitácora Digital (modo simple)

Sistema **ultra simple** para registrar actividades de mantenimiento/soporte como bitácora.

## Qué hace
- Guardar actividades como **Pendiente** o **Realizada**
- Registrar opcionalmente computadoras e impresoras con número de patrimonio, tipo de mantenimiento y número de serie
- Marcar una actividad como **completada**
- Filtrar por **mes** o por **rango de fechas**
- Buscar por texto (equipo, lugar, persona, etc.)
- Exportar a **Excel** (se descarga como `.csv`, Excel lo abre)
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

## Notas
- Los datos se guardan en el navegador (LocalStorage). Si cambias de navegador o borras datos del sitio, se pierden.
- El inicio de sesión es local y solo identifica al usuario; no es un mecanismo de seguridad. No almacenes datos confidenciales en esta aplicación estática.
- Para GitHub Pages se despliega desde la rama `main` (workflow en `.github/workflows/deploy-pages.yml`).
