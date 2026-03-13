#!/bin/bash
# Railway deployment build script
# JSX is pre-compiled — just download React vendor files
set -e

echo "=== IRS Navigator Build ==="

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

print('=== Build complete ===', flush=True)
PYEOF
