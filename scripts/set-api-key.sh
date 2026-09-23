#!/bin/bash
# Helper to set Twelve Data key and restart web
set -e
cd "$(dirname "$0")/.."
if [ -z "$1" ]; then
  echo "Usage: ./scripts/set-api-key.sh YOUR_TWELVE_DATA_KEY"
  echo "Get free key at https://twelvedata.com/"
  exit 1
fi
KEY=$1
echo "EXPO_PUBLIC_TWELVE_DATA_API_KEY=$KEY" > .env
echo "EXPO_PUBLIC_ALERT_POLL_INTERVAL_MS=15000" >> .env
echo "✅ .env updated with live key"
echo "Restarting web server..."
# Kill old web if running via pid file? Just inform user
echo "Run: npm run web  OR  npx expo start --web --port 8081"
cat .env
