# 🎨 Sistema de Diseño Premium - QUICK REFERENCE

**Acceso rápido a clases y componentes principales**

---

## 🃏 TARJETAS

```html
<!-- Tamaños disponibles -->
<div class="card card-xl">Información crítica</div>
<div class="card card-lg">Indicador principal</div>
<div class="card card-md">Estadística</div>
<div class="card card-sm">Acceso rápido</div>
<div class="card card-xs">Acción</div>
```

---

## 🔘 BOTONES

### Variantes
```html
<button class="btn btn-primary">Primario</button>
<button class="btn btn-secondary">Secundario</button>
<button class="btn btn-success">Éxito</button>
<button class="btn btn-warning">Advertencia</button>
<button class="btn btn-danger">Peligro</button>
```

### Tamaños
```html
<button class="btn btn-sm btn-primary">Pequeño</button>
<button class="btn btn-primary">Normal</button>
<button class="btn btn-lg btn-primary">Grande</button>
```

### Estados
```html
<button class="btn btn-primary" disabled>Deshabilitado</button>
```

---

## 🏷️ BADGES

```html
<span class="badge badge-success">✓ Éxito</span>
<span class="badge badge-warning">⏱ Advertencia</span>
<span class="badge badge-danger">! Error</span>
<span class="badge badge-info">ⓘ Info</span>
<span class="badge badge-stats">📊 Stats</span>
```

---

## 📊 INDICADORES

```html
<div class="card card-md indicator-card">
  <div class="indicator-header">
    <div class="indicator-title">
      <span class="indicator-icon">📈</span>
      Conversiones
    </div>
    <div class="indicator-change positive">+12%</div>
  </div>
  <div class="indicator-value">12,345</div>
  <div class="indicator-chart">
    <canvas id="chart"></canvas>
  </div>
</div>
```

---

## 🎯 ESTADOS SEMÁNTICOS

```html
<!-- Operativo -->
<div class="state-operational-bg">
  <span class="state-operational">Operativo</span>
</div>

<!-- Pendiente -->
<div class="state-pending-bg">
  <span class="state-pending">Pendiente</span>
</div>

<!-- En progreso -->
<div class="state-in-progress-bg">
  <span class="state-in-progress">En progreso</span>
</div>

<!-- Completado -->
<div class="state-completed-bg">
  <span class="state-completed">Completado</span>
</div>

<!-- Crítico -->
<div class="state-critical-bg">
  <span class="state-critical">Crítico</span>
</div>

<!-- Cancelado -->
<div class="state-cancelled-bg">
  <span class="state-cancelled">Cancelado</span>
</div>
```

---

## 📐 TIPOGRAFÍA

```html
<!-- Títulos -->
<h1 class="title-xl">Título Extra Grande</h1>
<h2 class="title-lg">Título Grande</h2>
<h3 class="title-md">Título Mediano</h3>
<h4 class="title-sm">Título Pequeño</h4>

<!-- Body -->
<p class="body-lg">Texto grande</p>
<p class="body-base">Texto normal</p>
<p class="body-sm">Texto pequeño</p>

<!-- Labels -->
<p class="caption">ETIQUETA</p>
```

---

## 🌐 GRID DASHBOARD

```html
<!-- Layout automático y responsive -->
<div class="grid-dashboard">
  <div class="card card-xl">Tarjeta XL</div>
  <div class="card card-lg">Tarjeta LG</div>
  <div class="card card-md">Tarjeta MD</div>
</div>
```

**Breakpoints:**
- 1400px+: 4 columnas
- 1200px: 2 columnas  
- 768px: 2 columnas
- Mobile: 1 columna

---

## ✨ ANIMACIONES

### Entrada
```html
<div class="animate-fade-in-up">Fade In Up</div>
<div class="animate-fade-in-down">Fade In Down</div>
<div class="animate-slide-up">Slide Up</div>
<div class="animate-slide-left">Slide Left</div>
<div class="animate-slide-right">Slide Right</div>
<div class="animate-scale-in">Scale In</div>
```

### Continuas
```html
<div class="animate-bounce">Rebotando</div>
<div class="animate-pulse">Pulsando</div>
<div class="animate-spin">Girando</div>
<div class="animate-float">Flotando</div>
<div class="animate-glow">Brillo</div>
<div class="animate-heartbeat">Latido</div>
<div class="animate-swing">Columpiándose</div>
```

### Hover
```html
<div class="hover-lift">Elevarse</div>
<div class="hover-scale">Escalar</div>
<div class="hover-scale-down">Reducir</div>
<div class="hover-rotate">Rotar</div>
<div class="hover-glow">Brillo</div>
<div class="hover-color-shift">Cambiar color</div>
```

### Delays (Cascada)
```html
<div class="animate-fade-in-up animate-delay-100"></div>
<div class="animate-fade-in-up animate-delay-200"></div>
<div class="animate-fade-in-up animate-delay-300"></div>
```

---

## 🎪 COMPONENTES DASHBOARD

### Hero Section
```html
<div class="dashboard-hero card card-xl">
  <div class="dashboard-hero-content">
    <div class="dashboard-hero-greeting">
      <div class="dashboard-hero-title">Bienvenido</div>
      <div class="dashboard-hero-time">
        <i class="fas fa-clock"></i>
        <span class="time">10:30 AM</span>
      </div>
    </div>
    <div class="dashboard-hero-actions">
      <div class="dashboard-hero-action">
        <div class="dashboard-hero-action-icon">
          <i class="fas fa-plus"></i>
        </div>
        <div class="dashboard-hero-action-text">
          <strong>Acción</strong>
          <small>Descripción</small>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Quick Actions
```html
<div class="quick-actions-section">
  <div class="quick-action-card">
    <div class="quick-action-icon">
      <i class="fas fa-plus"></i>
    </div>
    <div class="quick-action-title">Nueva Incidencia</div>
  </div>
</div>
```

### Timeline
```html
<div class="timeline">
  <div class="timeline-item success">
    <div class="timeline-content">
      <div class="timeline-info">
        <div class="timeline-title">Título</div>
        <div class="timeline-description">Descripción</div>
        <div class="timeline-meta">
          <span class="timeline-time">10:30 AM</span>
          <span class="timeline-user">
            <div class="timeline-user-avatar">JD</div>
            Juan Díaz
          </span>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## 🎨 COLORES

```css
/* Tokens disponibles */
--color-primary-600:    #0284c7   /* Azul */
--color-success-600:    #16a34a   /* Verde */
--color-warning-600:    #d97706   /* Amarillo */
--color-danger-600:     #dc2626   /* Rojo */
--color-stats-600:      #9333ea   /* Morado */
--color-neutral-600:    #4b5563   /* Gris */
```

---

## 🎯 FORMULAR / INPUTS

```html
<div class="form-group">
  <label class="form-label">Etiqueta</label>
  <input class="form-input" type="text" placeholder="Ingrese texto">
</div>

<div class="form-group">
  <label class="form-label">Seleccionar</label>
  <select class="form-select">
    <option>Opción 1</option>
    <option>Opción 2</option>
  </select>
</div>

<div class="form-group">
  <label class="form-label">Comentario</label>
  <textarea class="form-textarea" rows="4"></textarea>
</div>
```

---

## 📊 TABLAS

```html
<table class="table-modern">
  <thead>
    <tr>
      <th>Columna 1</th>
      <th>Columna 2</th>
      <th>Columna 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Dato 1</td>
      <td>Dato 2</td>
      <td>Dato 3</td>
    </tr>
  </tbody>
</table>
```

---

## 🎭 ICONOGRAFÍA

```html
<!-- Tamaños -->
<span class="icon icon-xs"><i class="fas fa-check"></i></span>
<span class="icon icon-sm"><i class="fas fa-check"></i></span>
<span class="icon icon-md"><i class="fas fa-check"></i></span>
<span class="icon icon-lg"><i class="fas fa-check"></i></span>
<span class="icon icon-xl"><i class="fas fa-check"></i></span>
```

---

## 🧪 SKELETON LOADERS

```html
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-card"></div>
<div class="skeleton skeleton-avatar"></div>
```

---

## 🔌 UTILIDADES

### Flexbox
```html
<div class="flex-between">Espacio entre</div>
<div class="flex-center">Centrado</div>
```

### Texto
```html
<div class="text-truncate">Truncado...</div>
<div class="text-clamp-2">Máximo 2 líneas...</div>
<div class="text-clamp-3">Máximo 3 líneas...</div>
```

### Opacidad
```html
<div class="opacity-50">50% opaco</div>
<div class="opacity-75">75% opaco</div>
```

### Transiciones
```html
<div class="transition-fast">Rápido (0.15s)</div>
<div class="transition-base">Normal (0.2s)</div>
<div class="transition-slow">Lento (0.3s)</div>
<div class="transition-colors">Solo colores</div>
<div class="transition-transform">Solo transform</div>
<div class="transition-shadow">Solo sombra</div>
```

---

## 🌙 TEMA OSCURO

```html
<!-- El sistema detecta automáticamente -->
<html class="dark">
  <!-- Contenido se adapta automáticamente -->
</html>
```

---

## 📱 RESPONSIVE

```html
<!-- Los componentes son automáticamente responsive -->
<!-- Grid: 4 cols (1400px) → 2 cols (1200px) → 1 col (mobile) -->
<div class="grid-dashboard">
  <!-- Se adapta automáticamente -->
</div>
```

---

## 💡 MEJORES PRÁCTICAS

### 1. Consistencia
```html
<!-- Usar siempre los mismos tokens -->
<div class="badge badge-success">Éxito</div>
<button class="btn btn-success">Guardar</button>
```

### 2. Jerarquía
```html
<!-- Importante: tarjeta grande -->
<div class="card card-lg"></div>

<!-- Normal: tarjeta mediana -->
<div class="card card-md"></div>

<!-- Secundario: tarjeta pequeña -->
<div class="card card-sm"></div>
```

### 3. Estados Visuales
```html
<!-- NO solo mostrar en texto -->
<!-- SÍ mostrar visualmente con badges -->
<span class="badge badge-success">Completado</span>
```

### 4. Animaciones
```html
<!-- Entrada suave para nuevos elementos -->
<div class="animate-fade-in-up">Nuevo elemento</div>

<!-- Cascada para múltiples elementos -->
<div class="animate-fade-in-up animate-delay-100"></div>
<div class="animate-fade-in-up animate-delay-200"></div>
```

### 5. Espaciado
```html
<!-- Usar tokens de espaciado -->
<!-- var(--spacing-lg): 1.5rem, var(--spacing-xl): 2rem -->
<div style="margin-bottom: var(--spacing-lg);"></div>
```

---

## 🚀 ATAJO DE COLORES

| Estado | Color | Variable |
|--------|-------|----------|
| Éxito | Verde | `--color-success-600` |
| Advertencia | Amarillo | `--color-warning-600` |
| Error | Rojo | `--color-danger-600` |
| Información | Azul | `--color-primary-600` |
| Estadísticas | Morado | `--color-stats-600` |
| Secundario | Gris | `--color-neutral-600` |

---

## 📚 RECURSOS

- **Documentación Completa:** `DESIGN_SYSTEM.md`
- **Guía de Implementación:** `IMPLEMENTATION.md`
- **Archivos CSS:** `css/design-system.css`, `css/premium-*.css`
- **JavaScript:** `js/premium-dashboard-components.js`

---

## 🎯 FLUJO TÍPICO

1. **Crear Tarjeta** → `<div class="card card-md">`
2. **Agregar Contenido** → `<h3 class="title-md">Título</h3>`
3. **Agregar Botón** → `<button class="btn btn-primary">Acción</button>`
4. **Agregar Badge** → `<span class="badge badge-success">Estado</span>`
5. **Agregar Animación** → `class="animate-fade-in-up"`

---

## 📞 SOPORTE RÁPIDO

```
¿Cómo crear... ?

1. Tarjeta → .card .card-md
2. Botón → .btn .btn-primary
3. Badge → .badge .badge-success
4. Indicador → .indicator-card
5. Animación → .animate-fade-in-up
6. Estado → .state-success, .state-danger, etc.
7. Titulo → .title-lg, .title-md, etc.
8. Timeline → .timeline .timeline-item
```

---

**Última actualización:** Julio 1, 2024 ✨
