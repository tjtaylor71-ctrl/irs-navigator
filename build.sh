#!/bin/bash
# Railway runs this once during deployment to download JS libraries locally.
# After this runs, the app serves React and Babel from its own /static/vendor/
# folder — no CDN calls, no network dependency at runtime.

set -e
mkdir -p static/vendor

echo "Downloading React..."
curl -sL https://unpkg.com/react@18/umd/react.production.min.js -o static/vendor/react.production.min.js

echo "Downloading ReactDOM..."
curl -sL https://unpkg.com/react-dom@18/umd/react-dom.production.min.js -o static/vendor/react-dom.production.min.js

echo "Downloading Babel standalone..."
curl -sL https://unpkg.com/@babel/standalone@7.23.5/babel.min.js -o static/vendor/babel.min.js

echo "Vendor files ready:"
ls -lh static/vendor/
