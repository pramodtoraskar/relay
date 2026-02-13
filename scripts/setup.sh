#!/usr/bin/env bash
# One-command install (Unix): install deps, build, run setup
set -e
cd "$(dirname "$0")/.."
npm install
npm run build
node scripts/setup.js
echo "Run: npx relay checkin  (or npm link and use 'relay checkin')"
