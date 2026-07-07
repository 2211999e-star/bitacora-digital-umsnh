#!/usr/bin/env python3
import re

with open('bitacora-digital-umsnh/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Reemplazos finales
final_replacements = {
    'rounded-xl border border-gray-200 dark:border-gray-800 p-4': 'simple-card-sm',
    'rounded-xl border border-gray-200 dark:border-gray-800 p-6': 'simple-card',
    'px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800': 'simple-btn simple-btn-secondary',
    'px-4 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black': 'simple-btn',
    'px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800': 'simple-btn simple-btn-secondary',
    'px-3 py-2 rounded-lg bg-white': 'simple-btn simple-btn-secondary',
    'border border-gray-200 dark:border-gray-800': 'simple-border',
}

count = 0
for old, new in final_replacements.items():
    if old in content:
        content = content.replace(old, new)
        count += 1

# Remover clases vacías
content = re.sub(r'class="\s*"', '', content)
content = re.sub(r'  +', ' ', content)  # Normalizar espacios

with open('bitacora-digital-umsnh/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'✓ {count} reemplazos finales completados')
print('✓ HTML convertido exitosamente al diseño minimalista')
