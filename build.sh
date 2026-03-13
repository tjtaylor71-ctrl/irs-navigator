#!/bin/bash
# Railway runs this once during deployment to download JS libraries locally.
set -e
mkdir -p static/vendor

echo "Downloading vendor JS files..."
python3 -c "
import urllib.request, os

files = {
    'static/vendor/react.production.min.js': 'https://unpkg.com/react@18/umd/react.production.min.js',
    'static/vendor/react-dom.production.min.js': 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'static/vendor/babel.min.js': 'https://unpkg.com/@babel/standalone@7.23.5/babel.min.js',
}

for dest, url in files.items():
    print(f'  Downloading {dest}...')
    urllib.request.urlretrieve(url, dest)
    size = os.path.getsize(dest)
    print(f'  Done: {size//1024}KB')

print('All vendor files ready.')
"
