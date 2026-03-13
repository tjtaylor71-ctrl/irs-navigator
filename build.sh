#!/bin/bash
# Railway deployment build script
set -e

echo "=== IRS Navigator Build ==="

# Step 1: Download vendor files
python3 << 'PYEOF'
import urllib.request, os
os.makedirs('static/vendor', exist_ok=True)
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
PYEOF

# Step 2: Install Babel
echo "Installing Babel..."
npm install --save-dev @babel/core @babel/cli @babel/preset-react 2>&1 | tail -3

# Step 3: Babel config — classic runtime means React.createElement, no imports needed
cat > babel.config.json << 'BABELEOF'
{
  "presets": [["@babel/preset-react", {"runtime": "classic"}]]
}
BABELEOF

# Step 4: Compile JSX → JS
echo "Compiling JSX..."
mkdir -p static/compiled
npx babel static/irs-selfhelp-app.jsx  -o static/compiled/irs-selfhelp-app.js
npx babel static/irs-intake-wizard.jsx -o static/compiled/irs-intake-wizard.js

# Step 5: Patch — remove CommonJS artifacts, add hooks header, expose to window
python3 << 'PYEOF'
import re, os

patches = [
    ('static/compiled/irs-selfhelp-app.js',  'IRSApp'),
    ('static/compiled/irs-intake-wizard.js',  'IRSIntakeWizard'),
]

header = 'const { useState, useEffect, useRef, useCallback, useMemo } = React;\n\n'

for path, comp in patches:
    code = open(path, encoding='utf-8').read()
    lines = []
    for line in code.splitlines():
        s = line.strip()
        if s.startswith('"use strict"'): continue
        if 'require(' in s: continue
        if s.startswith('Object.defineProperty(exports'): continue
        if s.startswith('exports.'): continue
        lines.append(line)
    result = '\n'.join(lines)
    # Fix Babel's (0, _react.useState) → useState, etc.
    result = re.sub(r'\(0,\s*_react\.\w+\)', lambda m: m.group().split('.')[-1].rstrip(')'), result)
    result = re.sub(r'_react\.(useState|useEffect|useRef|useCallback|useMemo)', r'\1', result)
    result = header + result + f'\n\nwindow.{comp} = {comp};\n'
    open(path, 'w', encoding='utf-8').write(result)
    print(f'  Patched {path}: {len(result)//1024}KB', flush=True)

print('Done.', flush=True)
PYEOF

echo "=== Build complete ==="
ls -lh static/compiled/
