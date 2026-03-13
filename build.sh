#!/bin/bash
# Railway deployment build script
set -e

echo "=== IRS Navigator Build ==="

python3 << 'PYEOF'
import urllib.request, os, re, sys

# ── Step 1: Download vendor files ──────────────────────────────────────────
os.makedirs('static/vendor', exist_ok=True)
os.makedirs('static/compiled', exist_ok=True)

vendor = {
    'static/vendor/react.production.min.js':
        'https://unpkg.com/react@18/umd/react.production.min.js',
    'static/vendor/react-dom.production.min.js':
        'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
}

for dest, url in vendor.items():
    print(f'Downloading {dest}...', flush=True)
    urllib.request.urlretrieve(url, dest)
    print(f'  Done: {os.path.getsize(dest)//1024}KB', flush=True)

# ── Step 2: Compile JSX → JS ───────────────────────────────────────────────
files = [
    ('static/irs-selfhelp-app.jsx',  'static/compiled/irs-selfhelp-app.js',  'IRSApp'),
    ('static/irs-intake-wizard.jsx',  'static/compiled/irs-intake-wizard.js',  'IRSIntakeWizard'),
]

for src, dst, comp in files:
    if not os.path.exists(src):
        print(f'WARNING: {src} not found — skipping', flush=True)
        continue
    print(f'Compiling {src}...', flush=True)
    code = open(src, encoding='utf-8').read()
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
    result  = 'const { useState, useEffect, useRef, useCallback, useMemo } = React;\n\n'
    result += '\n'.join(lines)
    result += f'\n\nwindow.{comp} = {comp};\n'
    open(dst, 'w', encoding='utf-8').write(result)
    print(f'  Done: {len(result)//1024}KB -> {dst}', flush=True)

print('=== Build complete ===', flush=True)
PYEOF
