# TradeForge Architecture

## 1. High-level diagram

```
                 ┌──────────────────────────────────────────┐
                 │                 UI Layer                  │
                 │  ChartScreen · ScriptsScreen · Alerts    │
                 │  ChartCanvas (SVG) · ScriptEditor        │
                 └───────────────┬──────────────────────────┘
                                 │ hooks + Zustand
                 ┌───────────────▼──────────────────────────┐
                 │              State Layer                  │
                 │  chartStore  ·  scriptStore               │
                 └───────────────┬──────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌───────────────┐    ┌───────────────────┐    ┌──────────────────┐
│ MarketData    │    │ ScriptEngine      │    │ AlertService     │
│ Service       │───▶│ (sandbox + builtins)│◀──│ (poll + push)    │
└───────┬───────┘    └───────────────────┘    └────────┬─────────┘
        │                                              │
        ▼                                              ▼
 Twelve Data REST/WS                          Expo Notifications
 AsyncStorage cache                           AsyncStorage rules
```

## 2. Data flow — chart load

1. User picks `EUR/USD` + `H1` in `ChartToolbar`.
2. `chartStore.setSymbol/setTimeframe` clears candles.
3. `useMarketData` effect calls `marketData.getCandles()`.
4. Service checks memory cache → else Twelve Data `/time_series`.
5. On success (or mock fallback) → `chartStore.setCandles`.
6. Viewport resets to last N bars; price scale recomputed (incl. overlay plots).
7. Draft script auto-runs → plots/markers pushed into store → SVG re-renders.

## 3. Data flow — live tick

1. WS `price` event (or poll/mock) → `Quote`.
2. `chartStore.setQuote` updates header price.
3. `applyQuoteToCache` mutates last candle (or appends new bar on boundary).
4. Candle listeners fire → chart re-renders last body/wick.
5. `AlertService` may re-evaluate rules for that symbol.

## 4. Script execution model

```
source
  │ transpile (:= → =, series arithmetic → add/sub/mul/div)
  ▼
new Function(...sandboxKeys, body)
  │  sandbox = { open, high, low, close, volume, time,
  │              sma, ema, rsi, plot, hline, marker, alertcondition, Math, … }
  ▼
collect.plots / hlines / markers / alerts / logs / errors
  ▼
ScriptOutput → chartStore.setScriptOutput()
```

**Security**
- No `globalThis`, `window`, `fetch`, `require`, `process`, `eval`, `Function` inside the sandbox.
- Soft wall-clock timeout warning (default 2s).
- For multi-tenant production, move execution to a Worker / cloud function.

## 5. Alert pipeline

```
Script alertcondition(...) 
  → metadata stored in ScriptOutput.alerts
  → user taps "Save + Arm Alerts"
  → AlertRule persisted { scriptId, symbol, tf, condition title, channels }
  → AlertService.start() interval + onQuote
  → fetch candles → engine.evaluateAlerts()
  → oncePerBar gate → AlertEvent + push notification
```

> Mobile OS background limits apply. For reliable 24/7 alerts, mirror rules to a small Node/Cloud Run worker that uses the same `ScriptEngine` code.

## 6. Why SVG (and when to leave it)

`react-native-svg` keeps the first version dependency-light and works on web. Bottleneck appears around >2k visible points with many plots. Migration path:

```
ChartCanvas
  └─ swap CandleLayer/PlotLayer implementations to @shopify/react-native-skia
     (same props, different draw primitives)
```

## 7. Flutter port map (if needed)

| RN module | Flutter equivalent |
|-----------|--------------------|
| Zustand stores | Riverpod / Bloc |
| react-native-svg | `CustomPaint` or `fl_chart` / `interactive_chart` |
| ScriptEngine (`new Function`) | `flutter_js` or implement DSL in Dart |
| CodeMirror WebView | `webview_flutter` + same HTML bundle |
| Expo Notifications | `flutter_local_notifications` + FCM |
| Twelve Data client | `dio` / `web_socket_channel` |

## 8. API cost control (Twelve Data free tier)

- Cache candles 60s (`CACHE_TTL_MS`).
- One WS connection, multiplex symbols.
- Alert poll default 15s — raise in `.env` for low-traffic demos.
- Prefer H1+ for routine scripting; M1 burns credits fast on REST.
