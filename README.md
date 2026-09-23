# TradeForge

> A TradingView-style mobile trading app built with **React Native (Expo)** — real-time Forex & XAUUSD charts, Pine-like custom scripting, and a background alert engine.

![platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-blue)
![stack](https://img.shields.io/badge/stack-Expo%2051%20%2B%20TypeScript-indigo)

---

## Features

| Area | What you get |
|------|----------------|
| **Market data** | Twelve Data REST + WebSocket (auto-falls back to realistic mock candles when no API key) |
| **Instruments** | Major Forex pairs + **XAU/USD** |
| **Charting** | Candlestick / line, pinch-zoom, pan, crosshair, volume pane, multi-pane indicators |
| **Timeframes** | M1 · M5 · M15 · M30 · H1 · H4 · D1 · W1 |
| **Script editor** | Built-in mono editor (+ optional CodeMirror WebView). Templates: SMA Cross, RSI, MACD |
| **Script engine** | Sandboxed JS interpreter with `sma/ema/rsi/plot/marker/alertcondition` (Pine-like) |
| **Alerts** | Rules armed from scripts → in-app events + Expo push notifications |

---

## Project structure

```
TradeForge/
├── App.tsx                          # Entry — hydrate scripts, start alerts
├── app.json                         # Expo config
├── package.json
├── .env.example                     # API keys
├── docs/
│   ├── ARCHITECTURE.md              # System design deep-dive
│   └── SCRIPT_LANGUAGE.md           # TradeForge Script reference
└── src/
    ├── api/
    │   └── twelveData.ts            # REST + WS client
    ├── components/
    │   ├── chart/
    │   │   ├── ChartCanvas.tsx      # ★ Main interactive chart
    │   │   ├── ChartToolbar.tsx     # Symbol / TF / price header
    │   │   ├── CandleLayer.tsx
    │   │   ├── PlotLayer.tsx
    │   │   ├── VolumeLayer.tsx
    │   │   ├── MarkerLayer.tsx
    │   │   └── CrosshairLayer.tsx
    │   ├── editor/
    │   │   ├── ScriptEditor.tsx     # ★ Code editor modal
    │   │   └── ScriptEditorWeb.tsx  # Optional CodeMirror WebView
    │   └── alerts/
    │       └── AlertList.tsx
    ├── screens/
    │   ├── ChartScreen.tsx          # ★ Primary screen
    │   ├── ScriptsScreen.tsx
    │   └── AlertsScreen.tsx
    ├── services/
    │   ├── marketData/
    │   │   ├── MarketDataService.ts # Cache, WS, polling, mock
    │   │   └── mockData.ts
    │   ├── scriptEngine/
    │   │   ├── ScriptEngine.ts      # ★ Sandboxed interpreter
    │   │   ├── builtins.ts          # sma, ema, rsi, crossover…
    │   │   └── __tests__/
    │   └── alerts/
    │       └── AlertService.ts      # ★ Background monitor + push
    ├── store/
    │   ├── chartStore.ts            # Zustand — viewport, candles, plots
    │   └── scriptStore.ts           # Saved scripts + draft buffer
    ├── hooks/
    │   ├── useMarketData.ts
    │   └── useChartGestures.ts
    ├── navigation/
    │   └── RootNavigator.tsx
    ├── constants/
    ├── theme/
    ├── types/
    └── utils/
```

---

## Quick start

### 1. Install

```bash
cd TradeForge
npm install
```

### 2. API key (optional for demo)

```bash
cp .env.example .env
# Edit .env → set EXPO_PUBLIC_TWELVE_DATA_API_KEY
# Free key: https://twelvedata.com
```

> Without a key the app runs in **DEMO** mode with synthetic candles and live-ish mock ticks — perfect for UI/script development.

### 3. Run

```bash
npx expo start
# then press i / a / w for iOS simulator, Android emulator, or web
```

### 4. Unit-test the script engine

```bash
npm install --save-dev babel-jest @babel/preset-env @babel/preset-typescript
npm run test:engine
```

---

## Core component breakdown

### 1. `MarketDataService` — data spine
- `getCandles(symbol, tf)` → REST history (cached 60s)
- `connectQuotes([symbols])` → WebSocket, falls back to REST poll or mock
- `applyQuoteToCache` mutates/extends the last bar so the chart breathes in real time
- Emits via listener sets (no React coupling)

### 2. `ChartCanvas` + layers — rendering
- SVG panes: **price** (candles + overlay plots + markers) → **volume** → **indicator panes** (`paneId`)
- Gestures via `react-native-gesture-handler`: pan, pinch-zoom, tap crosshair, double-tap clear
- Viewport + price scale live in `chartStore` (Zustand)

### 3. `ScriptEngine` — Pine-like runtime
- Source wrapped in `new Function(...sandboxKeys)` — **no** `fetch`, `require`, `process`, `globalThis`
- Built-ins: `sma`, `ema`, `rsi`, `highest`, `lowest`, `crossover`, `crossunder`, `plot`, `hline`, `marker`, `alertcondition`, `input`
- Tiny transpile pass rewrites `ema(close,12) - ema(close,26)` → `sub(ema(...), ema(...))` so MACD-style math works

### 4. `ScriptEditor` — authoring UX
- Mono `TextInput` + line gutter (native-safe)
- Templates, save/load (AsyncStorage), Run, **Save + Arm Alerts**
- Optional `ScriptEditorWeb` embeds CodeMirror 5 for syntax highlighting

### 5. `AlertService` — monitoring
- Persisted rules + event log
- Polling interval (`EXPO_PUBLIC_ALERT_POLL_INTERVAL_MS`, default 15s) + quote-driven evaluation
- `oncePerBar` de-duplication
- Expo Notifications for push; in-app list on the Alerts tab

---

## Main chart screen — data flow

```
ChartScreen
 ├─ useMarketData()
 │    ├─ marketData.getCandles() ──► chartStore.setCandles()
 │    ├─ marketData.onQuote()    ──► chartStore.setQuote() + applyQuoteToCache
 │    └─ auto-run draft script   ──► chartStore.setScriptOutput()
 ├─ ChartToolbar  (symbol / TF / zoom / open editor)
 ├─ ChartCanvas   (reads chartStore → SVG layers)
 └─ ScriptEditor  (modal)
      runDraft() → ScriptEngine.run() → setScriptOutput()
      save+arm  → alertService.addRule()
```

---

## Example script (SMA Crossover)

```js
const fastLen = input(9, "Fast Length")
const slowLen = input(21, "Slow Length")

const maFast = sma(close, fastLen)
const maSlow = sma(close, slowLen)

plot(maFast, "SMA Fast", { color: "#2962FF", lineWidth: 2 })
plot(maSlow, "SMA Slow", { color: "#FF6D00", lineWidth: 2 })

const bull = crossover(maFast, maSlow)
const bear = crossunder(maFast, maSlow)

marker(bull, "aboveBar", "#26A69A", "arrowUp", "BUY")
marker(bear, "belowBar", "#EF5350", "arrowDown", "SELL")

alertcondition(bull, "Bullish Cross", "Fast SMA crossed above Slow SMA")
alertcondition(bear, "Bearish Cross", "Fast SMA crossed below Slow SMA")
```

---

## Why React Native (not Flutter)?

| Concern | RN choice |
|---------|-----------|
| Script engine | First-class JS sandbox (`new Function`) — same language users write |
| Editor | Monaco / CodeMirror are JS; WebView bridge is trivial |
| Ecosystem | Expo Notifications, gesture-handler, SVG are mature |
| Web target | `expo start --web` shares 95% of the code |

Flutter remains viable (Dart FFI + a JS engine like `flutter_js`, or reimplement the DSL in Dart). The architecture docs map 1:1 if you port later.

---

## Roadmap / production hardening

- [ ] Vendor CodeMirror assets for offline IDE
- [ ] Input() UI bindings (currently uses defaults)
- [ ] Heikin-Ashi + more chart types
- [ ] Drawing tools (trendline, fib)
- [ ] Server-side alert worker (don't rely on mobile background alone)
- [ ] Proper PEG parser instead of regex transpile
- [ ] Order ticket / broker adapter (OANDA, IBKR)
- [ ] Replace SVG with Skia (`@shopify/react-native-skia`) for 60fps on dense history

---

## License

MIT — build on it freely.
