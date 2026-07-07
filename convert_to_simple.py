#!/usr/bin/env python3
import re

# Leer el archivo
with open('bitacora-digital-umsnh/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Definir reemplazos
replacements = [
    ('dashboard-panel bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6', 'simple-card'),
    ('dashboard-panel bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8', 'simple-card mb-8'),
    ('dashboard-kpi-card rounded-xl border border-gray-200 dark:border-gray-800 p-4', 'simple-card-sm'),
    ('status-chip status-', 'simple-badge simple-badge-'),
    ('dashboard-stat-btn', ''),
    ('app-section app-section--', ''),
    ('section app-section', 'section'),
    ('grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8', 'simple-grid simple-grid-3 mb-8 gap-6'),
    ('grid grid-cols-1 md:grid-cols-3 gap-4 mb-8', 'simple-grid simple-grid-3 mb-8 gap-4'),
    ('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8', 'simple-grid simple-grid-4 mb-8 gap-4'),
    ('grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8', 'simple-grid simple-grid-3 mb-8 gap-6'),
    ('grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6', 'simple-grid simple-grid-2 gap-6 mt-6'),
    ('grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5', 'simple-grid simple-grid-2 gap-6 mt-5'),
    ('grid grid-cols-2 gap-3 mt-3', 'simple-grid simple-grid-2 gap-3 mt-3'),
    ('grid grid-cols-1 sm:grid-cols-2 gap-3', 'simple-grid simple-grid-2 gap-3'),
    ('text-lg font-semibold text-gray-900 dark:text-white', 'simple-kpi-label'),
    ('text-2xl font-bold text-gray-900 dark:text-white', 'simple-kpi-value'),
    ('text-sm text-gray-600 dark:text-gray-400', 'text-simple-secondary'),
    ('text-gray-900 dark:text-white', 'text-simple-text'),
    ('text-gray-600 dark:text-gray-400', 'text-simple-secondary'),
    ('text-gray-700 dark:text-gray-300', 'text-simple-text'),
    ('text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider', 'simple-kpi-label'),
]

count = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        count += 1
        print(f'Reemplazado ({count}): {old[:40]}...')

# Guardar el archivo
with open('bitacora-digital-umsnh/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nTotal de reemplazos: {count}')
print('✓ Conversión completada exitosamente')
