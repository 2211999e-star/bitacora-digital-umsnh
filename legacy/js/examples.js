/**
 * examples.js
 * Ejemplos de uso de las funciones de enhancements.js
 * Descomenta y ejecuta en la consola para probar
 */

// EJEMPLO 1: Búsqueda Rápida con Caché
// ====================================
/*
import { quickSearch } from './js/enhancements.js';

// Buscar todas las incidencias de "computadora"
const computers = quickSearch(
  state.activitiesData,
  'computadora',
  ['description', 'brand', 'model']
);

console.log('Resultados de búsqueda:', computers);
console.log('Total encontrado:', computers.length);
*/

// EJEMPLO 2: Validación de Campos
// =================================
/*
import { validators } from './js/enhancements.js';

const testEmail = 'usuario@umich.mx';
const testPhone = '4434567890';
const testUrl = 'https://www.umich.mx';

console.log('Email válido:', validators.email(testEmail)); // true
console.log('Teléfono válido:', validators.phone(testPhone)); // true
console.log('URL válida:', validators.url(testUrl)); // true
console.log('Campo requerido:', validators.required('algo')); // true
console.log('Longitud mínima:', validators.minLength(10)('esto es texto largo')); // true
*/

// EJEMPLO 3: Historial Local
// ============================
/*
import { LocalHistory } from './js/enhancements.js';

const history = new LocalHistory();

// Agregar búsquedas recientes
history.add('searches', { query: 'computadora', date: new Date() });
history.add('searches', { query: 'impresora', date: new Date() });
history.add('searches', { query: 'red', date: new Date() });

// Obtener historial
const searches = history.get('searches', 5);
console.log('Últimas búsquedas:', searches);

// Limpiar una categoría
// history.clear('searches');

// Limpiar todo
// history.clearAll();
*/

// EJEMPLO 4: Calculador de Estadísticas
// ======================================
/*
import { calculateStats } from './js/enhancements.js';

const stats = calculateStats(state.activitiesData);

console.log('Estadísticas del sistema:');
console.log('- Total de incidencias:', stats.total);
console.log('- Pendientes:', stats.pendiente);
console.log('- En proceso:', stats.en_proceso);
console.log('- Completadas:', stats.completado);
console.log('- Canceladas:', stats.cancelado);
console.log('- Preventivas:', stats.preventivo);
console.log('- Correctivas:', stats.correctivo);
console.log('- Prioridad alta/crítica:', stats.alta_priority);

// Mostrar en porcentajes
console.log('Porcentaje completado:', ((stats.completado / stats.total) * 100).toFixed(1) + '%');
*/

// EJEMPLO 5: Monitor de Rendimiento
// ==================================
/*
import { PerformanceMonitor } from './js/enhancements.js';

const monitor = new PerformanceMonitor();

// Medir tiempo de carga de actividades
monitor.start('load_activities');
await loadActivities({ supabase });
monitor.end('load_activities'); // Mostrará el tiempo en consola

// Medir múltiples operaciones
monitor.start('filter_and_sort');
const filtered = state.activitiesData.filter(a => a.priority === 'alta');
const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
const duration = monitor.end('filter_and_sort');

console.log(`Operación completada en ${duration.toFixed(2)}ms`);
*/

// EJEMPLO 6: Debounce para Búsqueda Real-time
// ============================================
/*
import { debounce, quickSearch } from './js/enhancements.js';

// Crear función de búsqueda con debounce
const debouncedSearch = debounce((query) => {
  if (!query) {
    console.log('Búsqueda limpiada');
    return;
  }
  
  const results = quickSearch(
    state.activitiesData,
    query,
    ['description', 'brand', 'reporter_name']
  );
  
  console.log(`Encontrados ${results.length} resultados para: "${query}"`);
}, 500); // 500ms de espera

// Simular búsqueda por cada letra
const searchTerm = 'computadora';
for (let i = 1; i <= searchTerm.length; i++) {
  setTimeout(() => {
    debouncedSearch(searchTerm.substring(0, i));
  }, i * 100);
}
*/

// EJEMPLO 7: Exportar JSON
// ========================
/*
import { exportJSON } from './js/enhancements.js';

// Exportar todas las incidencias
exportJSON('incidencias_backup_' + new Date().toISOString().split('T')[0], 
           state.activitiesData);

// Esto descargará un archivo JSON con todos los datos
*/

// EJEMPLO 8: Debounced Updates
// =============================
/*
import { DebouncedUpdate } from './js/enhancements.js';

// Crear actualizador que agrupa cambios
const updateHandler = new DebouncedUpdate((merged) => {
  console.log('Actualización final:', merged);
  // Hacer PUT a la BD aquí
}, 1000); // Agrupar cambios por 1 segundo

// Simular múltiples cambios rápidos
updateHandler.add({ nombre: 'Carlos' });
updateHandler.add({ apellido: 'García' });
updateHandler.add({ email: 'carlos@umich.mx' });
// Solo verá el merged al final

// O para cambios ocasionales
updateHandler.flush(); // Fuerza actualización inmediata
*/

// EJEMPLO 9: Obtener Estadísticas y Mostrarlas
// =============================================
/*
import { calculateStats } from './js/enhancements.js';

function displayStats() {
  const stats = calculateStats(state.activitiesData);
  
  const html = `
    <div style="padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
      <h2>📊 Estadísticas del Sistema</h2>
      <p><strong>Total:</strong> ${stats.total}</p>
      <p><strong>Pendiente:</strong> ${stats.pendiente} (${((stats.pendiente/stats.total)*100).toFixed(1)}%)</p>
      <p><strong>En proceso:</strong> ${stats.en_proceso} (${((stats.en_proceso/stats.total)*100).toFixed(1)}%)</p>
      <p><strong>Completado:</strong> ${stats.completado} (${((stats.completado/stats.total)*100).toFixed(1)}%)</p>
      <p><strong>Preventivas:</strong> ${stats.preventivo}</p>
      <p><strong>Correctivas:</strong> ${stats.correctivo}</p>
      <p><strong>Alta Prioridad:</strong> ${stats.alta_priority}</p>
    </div>
  `;
  
  Swal.fire({
    title: 'Estadísticas',
    html,
    icon: 'info'
  });
}

displayStats();
*/

// EJEMPLO 10: Ciclo Completo de Búsqueda Optimizada
// ==================================================
/*
import { debounce, quickSearch, PerformanceMonitor } from './js/enhancements.js';

const monitor = new PerformanceMonitor();

const optimizedSearch = debounce((query) => {
  monitor.start('search_' + query);
  
  const results = quickSearch(
    state.activitiesData,
    query,
    ['description', 'brand', 'reporter_name', 'department']
  );
  
  monitor.end('search_' + query);
  
  console.log(`✅ Búsqueda completada: ${results.length} resultados`);
  return results;
}, 300);

// Probar con múltiples búsquedas
const queries = ['computadora', 'red', 'software'];
queries.forEach((q, i) => {
  setTimeout(() => {
    optimizedSearch(q);
  }, i * 400);
});
*/

// ===== TIPS DE USO =====
/*
1. Abre la consola del navegador (F12 o Ctrl+Shift+I)
2. Ve a la pestaña "Console"
3. Copia uno de los ejemplos de arriba
4. Reemplaza los comentarios /* */ por nada (descomenta)
5. Pega en la consola
6. Presiona Enter

Cada ejemplo muestra cómo usar una función diferente de enhancements.js

Para resultados óptimos:
- Llena la base de datos con datos de ejemplo primero (botón "Cargar muestra")
- Luego prueba las búsquedas y estadísticas
- Observa cómo las búsquedas se cachean automáticamente
- Mira los tiempos de ejecución en la consola
*/
