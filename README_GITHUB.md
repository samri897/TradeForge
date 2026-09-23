# TradeForge — TradingView-style Mobile Charting

Live Forex & Gold charting with Pine Script-like engine, built with Expo 51.

**Live Demo:** https://8081-ibvs9trnciqmm4pa6syx9.e2b.app (temporary sandbox, see GitHub Pages setup for permanent)

## Features
- 📈 Real-time EUR/USD, XAU/USD via Twelve Data (live key active)
- 🎨 TradingView-style dark UI, SVG candlesticks, crosshair, drag/wheel zoom
- 📜 Custom script engine (SMA, RSI, etc.) — 12/12 tests pass
- 🔔 Alerts with background polling
- 📱 Expo Go + APK build

## Quick Start
```bash
npm install
npm run web          # web at localhost:8081
npx expo start --tunnel  # phone via Expo Go QR
```

## GitHub Pages Deployment (Permanent Live Link)

This repo includes `.github/workflows/web.yml` which auto-deploys to GitHub Pages on push to `main`.

**Setup (one-time):**
1. Create GitHub repo (e.g., `TradeForge`)
2. Push code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/TradeForge.git
git push -u origin main
```
3. In GitHub repo → Settings → Pages → Source: **GitHub Actions**
4. Add secret: Settings → Secrets → Actions → New secret
   - Name: `EXPO_PUBLIC_TWELVE_DATA_API_KEY`
   - Value: `8ae10d4b2a41480b99a65947abecf2a4` (your key)
5. Push to main → Action builds → Your site at `https://YOUR_USERNAME.github.io/TradeForge/`

## APK Build (GitHub Actions)

Workflow `.github/workflows/apk.yml` builds APK without EAS (uses local Gradle).

On push to main:
- Action runs `expo prebuild` + `./gradlew assembleRelease`
- APK uploaded as artifact: Actions → Build APK → Artifacts → TradeForge-APK

Download → Install on Android (allow unknown sources).

No Expo account needed for this method!

## EAS Build (Alternative)

If you want EAS cloud build:
```bash
npm install -g eas-cli
eas login
eas init --id <your-project-id>  # create project at expo.dev first
eas build --platform android --profile preview
```

## Live Data
Set in `.env`:
```
EXPO_PUBLIC_TWELVE_DATA_API_KEY=your_key
```
Get free key at https://twelvedata.com (800 req/day)

## Project Structure
- `src/components/chart/ChartCanvas.tsx` — SVG chart with web wheel/drag
- `src/services/scriptEngine/` — sandboxed script runner
- `src/services/marketData/` — Twelve Data + mock fallback
- `src/store/` — Zustand stores

## Tests
```bash
npm test
```

Built with Expo 51, RN 0.74, Zustand, RN-SVG, Gesture Handler
