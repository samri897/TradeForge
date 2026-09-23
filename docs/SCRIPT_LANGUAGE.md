# TradeForge Script Language

A Pine-inspired subset that compiles to sandboxed JavaScript.

## Series (read-only arrays)

| Name | Description |
|------|-------------|
| `open` `high` `low` `close` | OHLC arrays (oldest → newest) |
| `volume` | Tick/volume array |
| `time` | Bar open time, ms epoch |
| `symbol` | string |
| `timeframe` | string (`1h`, `1d`, …) |
| `barCount` | number |

## Inputs

```js
const length = input(14, "RSI Length")  // returns default in v1
```

## Technical functions

```js
sma(src, length) → number[]
ema(src, length) → number[]
rsi(src, length) → number[]
highest(src, length) → number[]
lowest(src, length) → number[]
change(src, length = 1) → number[]
abs(x) · nz(x, rep = 0)
add(a,b) sub(a,b) mul(a,b) div(a,b)
crossover(a, b) → boolean[]
crossunder(a, b) → boolean[]
```

Binary `+ - * /` between series **calls/identifiers** is auto-rewritten to `add/sub/mul/div`.

## Outputs

### plot
```js
plot(series, title, {
  color: "#2962FF",
  lineWidth: 2,
  style: "line" | "histogram" | "circles" | "cross" | "area",
  overlay: true,          // false → separate pane
  paneId: "rsi"           // groups multiple series
})
```

### hline
```js
hline(70, "OB", { color: "#EF5350", style: "dashed" })
```

### marker
```js
marker(conditionBoolArray, "aboveBar" | "belowBar" | "inBar",
       color, "arrowUp" | "arrowDown" | "circle" | "square", "LABEL")
```

### alertcondition
```js
alertcondition(conditionBoolArray, "Title", "Message shown in notification")
```
Last-bar `true` → engine logs `[alert:fire] Title` which `AlertService` consumes.

## Full example — MACD

```js
const fast = input(12, "Fast")
const slow = input(26, "Slow")
const signalLen = input(9, "Signal")

const macdLine = ema(close, fast) - ema(close, slow)
const signal = ema(macdLine, signalLen)
const hist = macdLine - signal

plot(macdLine, "MACD", { color: "#2962FF", overlay: false, paneId: "macd" })
plot(signal, "Signal", { color: "#FF6D00", overlay: false, paneId: "macd" })
plot(hist, "Hist", { style: "histogram", overlay: false, paneId: "macd" })

alertcondition(crossover(macdLine, signal), "MACD Bull", "MACD crossed above signal")
```

## Safety rules

- No network, filesystem, or device APIs inside scripts.
- Avoid unbounded loops over synthetic arrays you create — prefer the provided series helpers.
- Execution is wall-clock checked (~2s default).
