#!/usr/bin/env bash
set -euo pipefail

cd /home/explore/Explorevalley

echo "[1/5] Cleaning previous dist outputs..."
rm -rf server/dist
rm -rf apps/app/web-dist

echo "[2/5] Building server..."
npm run build --workspace server

echo "[3/5] Building web app..."
npm --workspace @explorevalley/app run build:web

echo "[4/5] Restarting API service..."
sudo systemctl restart explorevalley-api.service

echo "[5/5] Restarting web service..."
sudo systemctl restart explorevalley-web.service

echo "Done."
