import type { Candle, Quote, SymbolId, Timeframe } from '../../types';

/** Deterministic pseudo-random from seed */
function mulberry32(seed: number) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE_PRICES: Record<string, number> = {
  'EUR/USD': 1.085,
  'GBP/USD': 1.265,
  'USD/JPY': 149.5,
  'USD/CHF': 0.885,
  'AUD/USD': 0.655,
  'USD/CAD': 1.365,
  'NZD/USD': 0.605,
  'EUR/GBP': 0.858,
  'EUR/JPY': 162.2,
  'GBP/JPY': 189.1,
  'XAU/USD': 2345.0,
};

function tfMs(tf: Timeframe): number {
  const map: Record<Timeframe, number> = {
    '1m': 60_000,
    '5m': 300_000,
    '15m': 900_000,
    '30m': 1_800_000,
    '1h': 3_600_000,
    '4h': 14_400_000,
    '1d': 86_400_000,
    '1w': 604_800_000,
  };
  return map[tf];
}

/** Generate realistic-looking synthetic OHLC for demos / offline */
export function generateMockCandles(
  symbol: SymbolId,
  timeframe: Timeframe,
  count = 500,
): Candle[] {
  const rand = mulberry32(hashCode(symbol + timeframe));
  const base = BASE_PRICES[symbol] ?? 1;
  const volatility = symbol === 'XAU/USD' ? 0.004 : symbol.includes('JPY') ? 0.002 : 0.0012;
  const ms = tfMs(timeframe);
  const now = Date.now();
  const start = Math.floor((now - count * ms) / ms) * ms;

  const candles: Candle[] = [];
  let price = base * (0.98 + rand() * 0.04);

  for (let i = 0; i < count; i++) {
    const drift = (rand() - 0.48) * volatility * price;
    const open = price;
    const close = price + drift;
    const wick = volatility * price * (0.2 + rand() * 0.8);
    const high = Math.max(open, close) + wick * rand();
    const low = Math.min(open, close) - wick * rand();
    const volume = Math.floor(500 + rand() * 5000);

    candles.push({
      time: start + i * ms,
      open: round(open, symbol),
      high: round(high, symbol),
      low: round(low, symbol),
      close: round(close, symbol),
      volume,
    });
    price = close;
  }
  return candles;
}

const liveState = new Map<SymbolId, number>();

export function generateMockQuote(symbol: SymbolId): Quote {
  const prev = liveState.get(symbol) ?? BASE_PRICES[symbol] ?? 1;
  const volatility = symbol === 'XAU/USD' ? 0.0004 : 0.00008;
  const next = prev * (1 + (Math.random() - 0.5) * volatility * 2);
  liveState.set(symbol, next);
  const spread = symbol === 'XAU/USD' ? 0.25 : symbol.includes('JPY') ? 0.01 : 0.00008;
  return {
    symbol,
    price: next,
    bid: next - spread / 2,
    ask: next + spread / 2,
    timestamp: Date.now(),
  };
}

function round(n: number, symbol: string) {
  const digits = symbol === 'XAU/USD' ? 2 : symbol.includes('JPY') ? 3 : 5;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h || 1;
}
