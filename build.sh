#!/bin/bash
# Railway deployment build script
set -e

echo "=== IRS Navigator Build ==="

# Step 1: Download React vendor files
echo "Downloading React + ReactDOM..."
python3 -c "
import urllib.request, os
os.makedirs('static/vendor', exist_ok=True)
files = {
    'static/vendor/react.production.min.js': 'https://unpkg.com/react@18/umd/react.production.min.js',
    'static/vendor/react-dom.production.min.js': 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
}
for dest, url in files.items():
    if not os.path.exists(dest):
        print(f'  Downloading {dest}...')
        urllib.request.urlretrieve(url, dest)
        print(f'  Done: {os.path.getsize(dest)//1024}KB')
    else:
        print(f'  Already exists: {dest}')
print('Vendor files ready.')
"

# Step 2: Strip imports/exports from JSX so browser can run it directly
echo "Preparing JS files..."
python3 -c "
import re, os
os.makedirs('static/compiled', exist_ok=True)

def prepare(src_path, dst_path):
    code = open(src_path, encoding='utf-8').read()
    lines = []
    for line in code.splitlines():
        s = line.strip()
        if s.startswith('import ') and ' from ' in s:
            continue
        if s.startswith('export default '):
            line = line.replace('export default ', '')
        if s == 'export default':
            continue
        lines.append(line)
    result = 'const { useState, useEffect, useRef, useCallback, useMemo } = React;\n\n'
    result += '\n'.join(lines)
    open(dst_path, 'w', encoding='utf-8').write(result)
    print(f'  {src_path} -> {dst_path} ({len(result)//1024}KB)')

files = [
    ('static/irs-selfhelp-app.jsx',  'static/compiled/irs-selfhelp-app.js'),
    ('static/irs-intake-wizard.jsx',  'static/compiled/irs-intake-wizard.js'),
]
for src, dst in files:
    if os.path.exists(src):
        prepare(src, dst)
    else:
        print(f'  WARNING: {src} not found')
print('Done.')
"

echo ""
echo "=== Build complete ==="
ls -lh static/vendor/ 2>/dev/null && ls -lh static/compiled/ 2>/dev/null
