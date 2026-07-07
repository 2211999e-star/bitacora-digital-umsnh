import re

with open('index.html', encoding='utf-8') as f:
    content = f.read()

# Find the start and end of the dashboard section
start_marker = '<section id="section-dashboard" class="section">'
end_marker = '</section>\n\n                <!-- Activities Section'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1:
    print("ERROR: start marker not found")
elif end_idx == -1:
    print("ERROR: end marker not found")
else:
    print(f"Found dashboard section: chars {start_idx} to {end_idx}")
    print(f"Section snippet: ...{repr(content[end_idx-50:end_idx+50])}...")
