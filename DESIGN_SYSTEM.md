# Sistema de Diseño Premium - Bitácora Digital UMSNH

## 📋 Introducción

El nuevo **Sistema de Diseño Premium** es una arquitectura completa de componentes, tokens y utilidades diseñada para crear una interfaz moderna, elegante y profesional.

**Inspiración:** Linear, Notion, Jira Cloud, GitHub Enterprise, Vercel, Supabase, Figma

---

## 🎨 Archivos del Sistema

### CSS
- **`design-system.css`** - Tokens, componentes base, utilidades (PRINCIPAL)
- **`premium-dashboard.css`** - Componentes específicos del dashboard
- **`premium-animations.css`** - Animaciones y transiciones
- **`premium-enhancements.css`** - Mejoras visuales del dashboard existente

### JavaScript
- **`premium-dashboard-components.js`** - Componentes interactivos y animaciones

---

## 🎯 Tokens de Diseño

### Colores Semánticos

```css
/* Información (Azul) */
--color-primary-600: #0284c7;

/* Operativo (Verde) */
--color-success-600: #16a34a;

/* Advertencia (Amarillo) */
--color-warning-600: #d97706;

/* Crítico (Rojo) */
--color-danger-600: #dc2626;

/* Estadísticas (Morado) */
--color-stats-600: #9333ea;

/* Neutro/Secundario (Gris) */
--color-neutral-600: #4b5563;
```

### Espaciado

```css
--spacing-xs: 0.25rem;    /* 4px */
--spacing-sm: 0.5rem;     /* 8px */
--spacing-md: 1rem;       /* 16px */
--spacing-lg: 1.5rem;     /* 24px */
--spacing-xl: 2rem;       /* 32px */
--spacing-2xl: 3rem;      /* 48px */
--spacing-3xl: 4rem;      /* 64px */
```

### Border Radius

```css
--radius-xs: 0.375rem;    /* 6px */
--radius-sm: 0.5rem;      /* 8px */
--radius-md: 0.75rem;     /* 12px */
--radius-lg: 1rem;        /* 16px */
--radius-xl: 1.25rem;     /* 20px */
--radius-2xl: 1.5rem;     /* 24px */
--radius-full: 9999px;    /* Círculo */
```

### Tipografía

```css
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-2xl: 1.5rem;    /* 24px */
--font-size-3xl: 1.875rem;  /* 30px */
--font-size-4xl: 2.25rem;   /* 36px */
```

---

## 🃏 Componentes Principales

### 1. TARJETAS (Cards)

```html
<!-- Tarjeta XL (Información Crítica) -->
<div class="card card-xl">
  <!-- Contenido -->
</div>

<!-- Tarjeta Grande -->
<div class="card card-lg">
  <!-- Contenido -->
</div>

<!-- Tarjeta Mediana -->
<div class="card card-md">
  <!-- Contenido -->
</div>

<!-- Tarjeta Pequeña -->
<div class="card card-sm">
  <!-- Contenido -->
</div>

<!-- Tarjeta Extra Pequeña -->
<div class="card card-xs">
  <!-- Contenido -->
</div>
```

### 2. BOTONES

```html
<!-- Botón Primario -->
<button class="btn btn-primary">Acción Principal</button>

<!-- Botón Secundario -->
<button class="btn btn-secondary">Acción Secundaria</button>

<!-- Botón Success -->
<button class="btn btn-success">Éxito</button>

<!-- Botón Warning -->
<button class="btn btn-warning">Advertencia</button>

<!-- Botón Danger -->
<button class="btn btn-danger">Peligro</button>

<!-- Tamaños -->
<button class="btn btn-sm btn-primary">Pequeño</button>
<button class="btn btn-primary">Normal</button>
<button class="btn btn-lg btn-primary">Grande</button>
```

### 3. BADGES

```html
<!-- Badge Success -->
<span class="badge badge-success">✓ Operativo</span>

<!-- Badge Warning -->
<span class="badge badge-warning">⏱ Pendiente</span>

<!-- Badge Danger -->
<span class="badge badge-danger">! Crítico</span>

<!-- Badge Info -->
<span class="badge badge-info">ⓘ Información</span>
```

### 4. INDICADORES

```html
<div class="card card-md indicator-card">
  <div class="indicator-header">
    <div class="indicator-title">
      <span class="indicator-icon">📊</span>
      Indicador
    </div>
    <div class="indicator-change positive">
      +12%
    </div>
  </div>
  <div class="indicator-value">1,234</div>
  <div class="indicator-chart">
    <canvas id="sparkline-chart" width="100" height="40"></canvas>
  </div>
</div>
```

### 5. TIMELINE

```html
<div class="timeline">
  <div class="timeline-item success">
    <div class="timeline-content">
      <div class="timeline-info">
        <div class="timeline-title">Título</div>
        <div class="timeline-description">Descripción</div>
        <div class="timeline-meta">
          <span class="timeline-time">🕐 10:30 AM</span>
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

### 6. TABLAS PREMIUM

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

### 7. ICONOGRAFÍA

```html
<!-- Iconos Premium -->
<span class="icon icon-sm">✓</span>
<span class="icon icon-md">✓</span>
<span class="icon icon-lg">✓</span>
<span class="icon icon-xl">✓</span>

<!-- Con Font Awesome -->
<i class="fas fa-check icon icon-md"></i>
```

---

## ✨ Animaciones

### Animaciones de Entrada

```html
<!-- Fade In Up -->
<div class="animate-fade-in-up">Contenido</div>

<!-- Slide Up -->
<div class="animate-slide-up">Contenido</div>

<!-- Slide Left -->
<div class="animate-slide-left">Contenido</div>

<!-- Scale In -->
<div class="animate-scale-in">Contenido</div>
```

### Animaciones Continuas

```html
<!-- Bounce -->
<div class="animate-bounce">Rebotando</div>

<!-- Pulse -->
<div class="animate-pulse">Pulsando</div>

<!-- Float -->
<div class="animate-float">Flotando</div>

<!-- Glow -->
<div class="animate-glow">Brillo</div>
```

### Hover Effects

```html
<!-- Lift -->
<div class="hover-lift">Levantarse al pasar el mouse</div>

<!-- Scale -->
<div class="hover-scale">Aumentar escala</div>

<!-- Glow -->
<div class="hover-glow">Brillo al pasar el mouse</div>

<!-- Rotate -->
<div class="hover-rotate">Rotar</div>
```

### Delays

```html
<div class="animate-fade-in-up animate-delay-100">Delay 0.1s</div>
<div class="animate-fade-in-up animate-delay-200">Delay 0.2s</div>
<div class="animate-fade-in-up animate-delay-300">Delay 0.3s</div>
```

---

## 🎭 Estados Semánticos

### Estados de Tarjetas

```html
<!-- Operativo (Verde) -->
<div class="state-operational-bg">
  <span class="state-operational">Operativo</span>
</div>

<!-- Pendiente (Amarillo) -->
<div class="state-pending-bg">
  <span class="state-pending">Pendiente</span>
</div>

<!-- En Progreso (Azul) -->
<div class="state-in-progress-bg">
  <span class="state-in-progress">En Progreso</span>
</div>

<!-- Completado (Verde Brillante) -->
<div class="state-completed-bg">
  <span class="state-completed">Completado</span>
</div>

<!-- Crítico (Rojo) -->
<div class="state-critical-bg">
  <span class="state-critical">Crítico</span>
</div>

<!-- Cancelado (Gris) -->
<div class="state-cancelled-bg">
  <span class="state-cancelled">Cancelado</span>
</div>
```

---

## 📐 Grid Layout Premium

```html
<!-- Grid automático del dashboard -->
<div class="grid-dashboard">
  <div class="card card-xl">XL Card</div>
  <div class="card card-lg">LG Card</div>
  <div class="card card-md">MD Card</div>
  <div class="card card-sm">SM Card</div>
</div>
```

Responsive:
- **Desktop 1400px+:** 4 columnas
- **Desktop 1200px:** 2 columnas
- **Tablet 768px:** 2 columnas
- **Mobile:** 1 columna

---

## 🌙 Modo Oscuro/Claro

El sistema soporta ambos modos automáticamente:

```html
<html class="dark">
  <!-- Contenido -->
</html>
```

Los colores se ajustan automáticamente via CSS custom properties.

---

## 🎪 Ejemplos Completos

### Hero Section

```html
<div class="dashboard-hero card card-xl">
  <div class="dashboard-hero-content">
    <div class="dashboard-hero-greeting">
      <div class="dashboard-hero-title">
        ¡Bienvenido, Juan!
      </div>
      <div class="dashboard-hero-time">
        <i class="fas fa-clock"></i>
        <span class="date">Monday, July 1, 2024</span>
        <span class="time">10:30 AM</span>
      </div>
    </div>
    
    <div class="dashboard-hero-actions">
      <div class="dashboard-hero-action">
        <div class="dashboard-hero-action-icon">
          <i class="fas fa-plus"></i>
        </div>
        <div class="dashboard-hero-action-text">
          <strong>Nueva Incidencia</strong>
          <small>Crear rápidamente</small>
        </div>
      </div>
      <!-- Más acciones -->
    </div>
  </div>
  
  <div class="dashboard-status-panel">
    <div class="dashboard-status-item">
      <div class="dashboard-status-item-icon">✓</div>
      <div class="dashboard-status-item-value">24</div>
      <div class="dashboard-status-item-label">Activos</div>
    </div>
    <!-- Más items -->
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
  
  <div class="quick-action-card">
    <div class="quick-action-icon">
      <i class="fas fa-calendar"></i>
    </div>
    <div class="quick-action-title">Nuevo Evento</div>
  </div>
  <!-- Más acciones -->
</div>
```

---

## 🚀 Mejores Prácticas

### 1. Consistencia
- Usa siempre los mismos tokens de color
- Mantén espaciados consistentes
- Usa la misma familia de iconos

### 2. Jerarquía Visual
```html
<!-- Muy importante: tarjeta grande -->
<div class="card card-xl">...</div>

<!-- Importante: tarjeta mediana -->
<div class="card card-md">...</div>

<!-- Secundario: tarjeta pequeña -->
<div class="card card-sm">...</div>
```

### 3. Estados Visuales
- Siempre mostrar el estado visualmente
- No solo con texto
- Usa colores semánticos

### 4. Animaciones
- No exagerar
- 0.2s a 0.3s es lo ideal
- Usa delays para cascadas

### 5. Responsividad
- Mobile first
- Prueba en 3 breakpoints: mobile, tablet, desktop
- Usa `grid-dashboard` para layouts

---

## 📱 Breakpoints

```css
/* Mobile */
@media (max-width: 640px)

/* Tablet */
@media (max-width: 768px)

/* Desktop Pequeño */
@media (max-width: 1024px)

/* Desktop Grande */
@media (min-width: 1400px)
```

---

## 🔧 Utilities Útiles

```html
<!-- Flexbox -->
<div class="flex-between">...</div>
<div class="flex-center">...</div>

<!-- Texto -->
<div class="text-truncate">...</div>
<div class="text-clamp-2">...</div>
<div class="text-clamp-3">...</div>

<!-- Opacidad -->
<div class="opacity-50">...</div>
<div class="opacity-75">...</div>

<!-- Transiciones -->
<div class="transition-fast">...</div>
<div class="transition-base">...</div>
<div class="transition-slow">...</div>
```

---

## 📚 Aplicar a Otras Secciones

Para aplicar este diseño a **Incidencias**, **Eventos**, **Documentos**, **Reportes**, **Usuarios** y **Configuración**:

1. Importar `design-system.css`
2. Usar clases de componentes (card, btn, badge)
3. Aplicar animaciones de entrada
4. Usar estados semánticos
5. Mantener espaciados consistentes
6. Aplicar mismo color scheme

Ejemplo:

```html
<section class="app-section">
  <div class="card card-lg">
    <h2 class="title-lg">Incidencias</h2>
    <div class="grid-dashboard">
      <div class="card card-md">
        <!-- Contenido -->
      </div>
    </div>
  </div>
</section>
```

---

## 🎨 Customización

Para cambiar colores globales, modifica las CSS variables en `design-system.css`:

```css
:root {
  --color-primary-600: #0284c7;  /* Cambiar aquí */
  --color-success-600: #16a34a;  /* Cambiar aquí */
  /* ... */
}
```

---

## 🐛 Soporte

El sistema es completamente compatible con:
- ✅ Chrome/Edge (últimas versiones)
- ✅ Firefox (últimas versiones)
- ✅ Safari (últimas versiones)
- ✅ Mobile browsers

---

## 📄 Versión

- **Sistema de Diseño Premium v1.0**
- **Fecha:** July 2024
- **Autor:** Bitácora Digital UMSNH
