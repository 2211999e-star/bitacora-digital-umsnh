import re

def main():
    with open('index.html', encoding='utf-8') as f:
        html = f.read()
    
    def count(id_val):
        start = html.find(f'<section id="{id_val}"')
        if start == -1: return 'not found'
        end = html.find('</section>', start)
        sec = html[start:end]
        opens = len(re.findall(r'<div\b', sec))
        closes = len(re.findall(r'</div>', sec))
        return opens - closes
        
    print('dashboard:', count('section-dashboard'))
    print('activities:', count('section-activities'))
    print('events:', count('section-events'))
    print('reports:', count('section-reports'))
    print('settings:', count('section-settings'))
    print('users:', count('section-users'))

main()
