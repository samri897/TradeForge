/** Starter templates shown in the script editor */

export const SCRIPT_TEMPLATES = {
  smaCross: {
    name: 'SMA Crossover',
    description: 'Classic fast/slow SMA cross with markers and alert',
    source: `// SMA Crossover — TradeForge Script v1
// Built-ins: sma, ema, crossover, crossunder, plot, hline, alertcondition

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
`,
  },

  rsi: {
    name: 'RSI with Levels',
    description: 'Relative Strength Index in a separate pane',
    source: `// RSI Indicator
const length = input(14, "RSI Length")
const overbought = input(70, "Overbought")
const oversold = input(30, "Oversold")

const rsiVal = rsi(close, length)

plot(rsiVal, "RSI", { color: "#7E57C2", lineWidth: 2, overlay: false, paneId: "rsi" })
hline(overbought, "OB", { color: "#EF5350", style: "dashed" })
hline(oversold, "OS", { color: "#26A69A", style: "dashed" })
hline(50, "Mid", { color: "#787B86", style: "dotted" })

alertcondition(crossover(rsiVal, oversold), "RSI Oversold Exit", "RSI crossed above oversold")
alertcondition(crossunder(rsiVal, overbought), "RSI Overbought Exit", "RSI crossed below overbought")
`,
  },

  macd: {
    name: 'MACD',
    description: 'MACD line, signal, and histogram',
    source: `// MACD
const fast = input(12, "Fast")
const slow = input(26, "Slow")
const signalLen = input(9, "Signal")

const macdLine = ema(close, fast) - ema(close, slow)
const signal = ema(macdLine, signalLen)
const hist = macdLine - signal

plot(macdLine, "MACD", { color: "#2962FF", overlay: false, paneId: "macd" })
plot(signal, "Signal", { color: "#FF6D00", overlay: false, paneId: "macd" })
plot(hist, "Histogram", { color: "#26A69A", style: "histogram", overlay: false, paneId: "macd" })

alertcondition(crossover(macdLine, signal), "MACD Bull", "MACD crossed above signal")
alertcondition(crossunder(macdLine, signal), "MACD Bear", "MACD crossed below signal")
`,
  },

  blank: {
    name: 'Blank Script',
    description: 'Empty template',
    source: `// TradeForge Script
// Available series: open, high, low, close, volume, time
// Functions: sma, ema, rsi, highest, lowest, crossover, crossunder
//            plot, hline, marker, alertcondition, input, nz, change, abs

const length = input(14, "Length")

// Your logic here
const ma = sma(close, length)
plot(ma, "MA", { color: "#2962FF", lineWidth: 2 })
`,
  },
} as const;

export type TemplateKey = keyof typeof SCRIPT_TEMPLATES;
