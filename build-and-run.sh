#!/bin/bash

set -euo pipefail

rm -rf dist
npm install
./node_modules/.bin/tsc
cp index.html styles.css dist/

cd dist && python -m http.server 8000
