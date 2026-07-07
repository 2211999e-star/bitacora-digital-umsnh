# 🎯 GUÍA DE CONVERSIÓN HTML - PREMIUM → MINIMALISTA

**Fecha:** Julio 1, 2026  
**Estado:** Listo para implementar

---

## 📋 RESUMEN DE CAMBIOS

El CSS minimalista ya está en: `css/simple-design-system.css` ✅  
El CSS está importado en: `css/style.css` ✅  
**Ahora falta:** Actualizar HTML para usar nuevas clases

---

## 🔄 PATRONES DE CONVERSIÓN

### PATRÓN 1: Section Header (Título + Subtitle)

**Antes (Premium):**
```html
<div class="section-hero section-hero--dashboard mb-5">
  <h2 class="section-hero__title">Dashboard</h2>
  <p class="section-hero__subtitle">Resumen operativo</p>
</div>
```

**Después (Minimalista):**
```html
<div class="simple-section-header">
  <div>
    <h2 class="simple-section-title">Dashboard</h2>
    <p class="simple-section-subtitle">Resumen operativo</p>
  </div>
</div>
```

---

### PATRÓN 2: Toolbar (Filtros + Botón Nueva)

**Antes (Premium):**
```html
<div class="app-section-header flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
  <div>
    <h2 class="text-2xl font-bold">Incidencias</h2>
    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Total: 42</p>
  </div>
  <div class="flex flex-wrap gap-2">
    <input type="text" placeholder="Buscar..." />
    <select><option>Estado</option></select>
    <button>Nueva Incidencia</button>
  </div>
</div>
```

**Después (Minimalista):**
```html
<div class="simple-toolbar">
  <div class="simple-toolbar-filters">
    <input type="text" class="simple-input" placeholder="Buscar..." />
    <select class="simple-select">
      <option>Estado</option>
    </select>
  </div>
  <div class="simple-toolbar-actions">
    <button class="simple-btn">
      <i class="fas fa-plus"></i> Nueva Incidencia
    </button>
  </div>
</div>
```

---

### PATRÓN 3: Cards / Paneles

**Antes (Premium):**
```html
<div class="dashboard-hero-panel bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
  Contenido...
</div>
```

**Después (Minimalista):**
```html
<div class="simple-card">
  Contenido...
</div>
```

---

### PATRÓN 4: KPI Cards

**Antes (Premium):**
```html
<div class="grid grid-cols-1 xl:grid-cols-[1.5fr_.9fr] gap-6">
  <div class="bg-white dark:bg-gray-900 rounded-2xl border p-6">
    <p>Incidencias</p>
    <p style="font-size: 2rem;">42</p>
  </div>
</div>
```

**Después (Minimalista):**
```html
<div class="simple-grid simple-grid-2">
  <div class="simple-card">
    <div class="simple-kpi-card">
      <div>
        <p class="simple-kpi-label">Incidencias</p>
        <p class="simple-kpi-value">42</p>
      </div>
      <i class="fas fa-clipboard-list simple-kpi-icon"></i>
    </div>
  </div>
</div>
```

---

### PATRÓN 5: Tablas

**Antes (Premium):**
```html
<div class="overflow-x-auto border rounded-2xl border-gray-200 dark:border-gray-800">
  <table class="w-full">
    <thead>
      <tr class="border-b bg-gray-50 dark:bg-gray-800">
        <th class="px-6 py-3 text-left text-sm font-semibold">Nombre</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
        <td class="px-6 py-4">Valor</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Después (Minimalista):**
```html
<div class="simple-table-wrapper">
  <table class="simple-table">
    <thead>
      <tr>
        <th>Nombre</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Valor</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

### PATRÓN 6: Botones

**Antes (Premium):**
```html
<button class="px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-gray-800">
  Guardar
</button>
```

**Después (Minimalista):**
```html
<button class="simple-btn">
  <i class="fas fa-save"></i> Guardar
</button>
```

---

### PATRÓN 7: Estados / Badges

**Antes (Premium):**
```html
<span class="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-sm font-semibold">
  Completado
</span>
```

**Después (Minimalista):**
```html
<span class="simple-badge simple-badge-success">
  <i class="fas fa-check"></i> Completado
</span>
```

---

### PATRÓN 8: Modales

**Antes (Premium):**
```html
<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
  <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full mx-4">
    <h3>Título</h3>
    Contenido...
    <button>Guardar</button>
  </div>
</div>
```

**Después (Minimalista):**
```html
<div class="simple-modal-backdrop" id="mi-modal">
  <div class="simple-modal">
    <div class="simple-modal-header">
      <h3 class="simple-modal-title">Título</h3>
      <button class="simple-modal-close" onclick="document.getElementById('mi-modal').remove()">
        <i class="fas fa-xmark"></i>
      </button>
    </div>
    <div class="simple-modal-body">
      Contenido...
    </div>
    <div class="simple-modal-footer">
      <button class="simple-btn">Guardar</button>
    </div>
  </div>
</div>
```

---

### PATRÓN 9: Formularios

**Antes (Premium):**
```html
<form>
  <div class="mb-4">
    <label class="block text-sm font-medium mb-2">Email</label>
    <input type="email" class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800">
  </div>
  <button type="submit">Enviar</button>
</form>
```

**Después (Minimalista):**
```html
<form>
  <div class="simple-form-group">
    <label class="simple-form-label">Email</label>
    <input type="email" class="simple-input">
  </div>
  <button type="submit" class="simple-btn">Enviar</button>
</form>
```

---

### PATRÓN 10: Empty State

**Antes (Premium):**
```html
<div class="text-center py-12">
  <p class="text-gray-600 dark:text-gray-400">No hay datos</p>
</div>
```

**Después (Minimalista):**
```html
<div class="simple-empty-state">
  <div class="simple-empty-state-icon">
    <i class="fas fa-inbox"></i>
  </div>
  <div class="simple-empty-state-title">Sin registros</div>
  <div class="simple-empty-state-text">
    No hay datos. Crea uno para comenzar.
  </div>
  <button class="simple-btn">
    <i class="fas fa-plus"></i> Crear
  </button>
</div>
```

---

## 📝 EJEMPLO COMPLETO: Sección Incidencias

### Antes (Premium)

```html
<section id="section-activities" class="section app-section app-section--activities">
  <div class="section-hero section-hero--activities mb-5">
    <h2 class="section-hero__title">Incidencias</h2>
    <p class="section-hero__subtitle">Registro de problemas y mantenimiento</p>
  </div>
  
  <div class="app-section-header flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
    <div>
      <h2 class="text-2xl font-bold">Incidencias</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Total: 42</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <input type="text" placeholder="Buscar..." class="px-4 py-2 rounded-lg border"/>
      <select class="px-4 py-2 rounded-lg border">
        <option>Estado</option>
      </select>
      <button class="px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black">
        Nueva Incidencia
      </button>
    </div>
  </div>

  <div class="overflow-x-auto border rounded-2xl border-gray-200 dark:border-gray-800">
    <table class="w-full">
      <thead>
        <tr class="border-b bg-gray-50 dark:bg-gray-800">
          <th class="px-6 py-3 text-left font-semibold">Descripción</th>
          <th class="px-6 py-3 text-left font-semibold">Estado</th>
          <th class="px-6 py-3 text-left font-semibold">Acción</th>
        </tr>
      </thead>
      <tbody id="activities-table-body">
        <!-- Filas dinámicas -->
      </tbody>
    </table>
  </div>
</section>
```

### Después (Minimalista)

```html
<section id="section-activities" class="simple-section">
  <div class="simple-section-header">
    <div>
      <h2 class="simple-section-title">Incidencias</h2>
      <p class="simple-section-subtitle">Registro de problemas y mantenimiento (42 total)</p>
    </div>
  </div>
  
  <div class="simple-toolbar">
    <div class="simple-toolbar-filters">
      <input type="text" class="simple-input" placeholder="Buscar incidencias..." />
      <select class="simple-select">
        <option value="">Estado</option>
        <option value="pendiente">Pendiente</option>
        <option value="progreso">En Progreso</option>
        <option value="completado">Completado</option>
      </select>
    </div>
    <div class="simple-toolbar-actions">
      <button class="simple-btn" onclick="showActivityModal('new')">
        <i class="fas fa-plus"></i> Nueva Incidencia
      </button>
    </div>
  </div>

  <div class="simple-table-wrapper">
    <table class="simple-table">
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Estado</th>
          <th>Acción</th>
        </tr>
      </thead>
      <tbody id="activities-table-body">
        <!-- Filas dinámicas -->
      </tbody>
    </table>
  </div>
</section>
```

---

## 🎨 CLASES CLAVE A USAR

### Estructura
- `.simple-section` - Contenedor principal
- `.simple-section-header` - Header con título
- `.simple-section-title` - Título grande
- `.simple-section-subtitle` - Subtitle pequeño

### Toolbar
- `.simple-toolbar` - Contenedor toolbar
- `.simple-toolbar-filters` - Grupo de filtros
- `.simple-toolbar-actions` - Grupo de acciones

### Componentes
- `.simple-card` - Paneles/cards
- `.simple-card-lg` - Card grande
- `.simple-card-sm` - Card pequeña
- `.simple-grid` - Grid layout
- `.simple-grid-2` - 2 columnas
- `.simple-grid-3` - 3 columnas

### Inputs
- `.simple-input` - Input text
- `.simple-select` - Select dropdown
- `.simple-textarea` - Textarea
- `.simple-form-group` - Grupo formulario
- `.simple-form-label` - Label

### Botones
- `.simple-btn` - Botón primario
- `.simple-btn-secondary` - Botón secundario
- `.simple-btn-small` - Botón pequeño
- `.simple-btn-block` - Botón full width

### Tablas
- `.simple-table-wrapper` - Contenedor tabla
- `.simple-table` - Tabla
- `.simple-table-status` - Status badge
- `.simple-table-action` - Acciones

### Estados
- `.simple-badge` - Badge
- `.simple-badge-success` - Badge verde
- `.simple-badge-warning` - Badge amarillo
- `.simple-badge-danger` - Badge rojo
- `.simple-empty-state` - Empty state

### Modales
- `.simple-modal-backdrop` - Backdrop
- `.simple-modal` - Modal
- `.simple-modal-header` - Header
- `.simple-modal-title` - Título
- `.simple-modal-close` - Botón cerrar
- `.simple-modal-body` - Contenido
- `.simple-modal-footer` - Footer

---

## 📋 CHECKLIST DE CAMBIOS

### Secciones a Actualizar

- [ ] **Dashboard**
  - [ ] Section header
  - [ ] KPI cards
  - [ ] Gráficos (Chart.js puede mantener estilos)

- [ ] **Incidencias**
  - [ ] Section header
  - [ ] Toolbar (filtros + botón nueva)
  - [ ] Tabla
  - [ ] Modal crear/editar

- [ ] **Eventos**
  - [ ] Section header
  - [ ] Toolbar
  - [ ] Tabla
  - [ ] Modal

- [ ] **Documentos**
  - [ ] Section header
  - [ ] Toolbar
  - [ ] Grid
  - [ ] Modal

- [ ] **Reportes**
  - [ ] Section header
  - [ ] Selector tipo reporte
  - [ ] Gráficos
  - [ ] Tabla resultados

- [ ] **Usuarios**
  - [ ] Section header
  - [ ] Toolbar
  - [ ] Tabla
  - [ ] Modal

- [ ] **Configuración**
  - [ ] Section header
  - [ ] Formularios
  - [ ] Botones de acción

---

## 🔧 ELIMINAR / COMENTAR

### Remover de index.html

```html
<!-- ELIMINAR ESTO -->
<script defer src="./js/premium-dashboard-components.js"></script>

<!-- REMOVER LAS CLASES PREMIUM DE DIVS -->
<!-- class="dashboard-hero dashboard-hero-panel" -->
<!-- class="indicator-card" -->
<!-- class="timeline" -->
<!-- etc -->
```

---

## 📍 UBICACIONES EN index.html

**Dashboard:** ~Línea 360-800  
**Incidencias:** ~Línea 800-1200  
**Eventos:** ~Línea 1200-1600  
**Documentos:** ~Línea 1600-2000  
**Reportes:** ~Línea 2000-2400  
**Usuarios:** ~Línea 2400-2700  
**Configuración:** ~Línea 2700-3100  

---

## ✅ VENTAJAS DEL NUEVO DISEÑO

✅ **Más limpio** - Sin animaciones complejas  
✅ **Más rápido** - Menos CSS (700 líneas vs 3,800)  
✅ **Cohesivo con login** - Mismo patrón visual  
✅ **Fácil de mantener** - Clases simples  
✅ **Mejor mobile** - Responsive simple  

---

## 🚀 PRÓXIMOS PASOS

1. **Copiar ejemplos** de cada sección arriba
2. **Reemplazar** en index.html
3. **Testing** en navegador
4. **Ajustar** colores si es necesario
5. **Commit** a GitHub

---

**¿Necesitas ayuda con alguna sección específica?**
