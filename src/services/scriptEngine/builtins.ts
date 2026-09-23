/**
 * Built-in technical functions available inside TradeForge scripts.
 * All series functions accept number[] and return number[] (aligned, nulls as NaN).
 */

export type NumSeries = number[];

function emptyLike(src: NumSeries): NumSeries {
  return new Array(src.length).fill(NaN);
}

/** Simple Moving Average */
export function sma(src: NumSeries, length: number): NumSeries {
  const out = emptyLike(src);
  const len = Math.max(1, Math.floor(length));
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (!Number.isFinite(v)) {
      sum = 0;
      continue;
    }
    sum += v;
    if (i >= len) {
      const old = src[i - len];
      if (Number.isFinite(old)) sum -= old;
    }
    if (i >= len - 1) {
      // verify window fully finite
      let ok = true;
      let s = 0;
      for (let j = i - len + 1; j <= i; j++) {
        if (!Number.isFinite(src[j])) {
          ok = false;
          break;
        }
        s += src[j];
      }
      out[i] = ok ? s / len : NaN;
    }
  }
  return out;
}

/** Exponential Moving Average */
export function ema(src: NumSeries, length: number): NumSeries {
  const out = emptyLike(src);
  const len = Math.max(1, Math.floor(length));
  const k = 2 / (len + 1);
  let prev = NaN;
  let seeded = false;
  let seedSum = 0;
  let seedCount = 0;

  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (!Number.isFinite(v)) continue;

    if (!seeded) {
      seedSum += v;
      seedCount++;
      if (seedCount === len) {
        prev = seedSum / len;
        out[i] = prev;
        seeded = true;
      }
      continue;
    }
    prev = v * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** RSI (Wilder) */
export function rsi(src: NumSeries, length: number): NumSeries {
  const out = emptyLike(src);
  const len = Math.max(1, Math.floor(length));
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < src.length; i++) {
    const change = src[i] - src[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i < len) {
      avgGain += gain;
      avgLoss += loss;
      continue;
    }
    if (i === len) {
      avgGain = (avgGain + gain) / len;
      avgLoss = (avgLoss + loss) / len;
    } else {
      avgGain = (avgGain * (len - 1) + gain) / len;
      avgLoss = (avgLoss * (len - 1) + loss) / len;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  }
  return out;
}

export function highest(src: NumSeries, length: number): NumSeries {
  const out = emptyLike(src);
  const len = Math.max(1, Math.floor(length));
  for (let i = 0; i < src.length; i++) {
    if (i < len - 1) continue;
    let m = -Infinity;
    let ok = true;
    for (let j = i - len + 1; j <= i; j++) {
      if (!Number.isFinite(src[j])) {
        ok = false;
        break;
      }
      if (src[j] > m) m = src[j];
    }
    out[i] = ok ? m : NaN;
  }
  return out;
}

export function lowest(src: NumSeries, length: number): NumSeries {
  const out = emptyLike(src);
  const len = Math.max(1, Math.floor(length));
  for (let i = 0; i < src.length; i++) {
    if (i < len - 1) continue;
    let m = Infinity;
    let ok = true;
    for (let j = i - len + 1; j <= i; j++) {
      if (!Number.isFinite(src[j])) {
        ok = false;
        break;
      }
      if (src[j] < m) m = src[j];
    }
    out[i] = ok ? m : NaN;
  }
  return out;
}

/** true when a crosses above b on this bar */
export function crossover(a: NumSeries, b: NumSeries): boolean[] {
  const n = Math.min(a.length, b.length);
  const out = new Array(n).fill(false);
  for (let i = 1; i < n; i++) {
    out[i] =
      Number.isFinite(a[i]) &&
      Number.isFinite(b[i]) &&
      Number.isFinite(a[i - 1]) &&
      Number.isFinite(b[i - 1]) &&
      a[i - 1] <= b[i - 1] &&
      a[i] > b[i];
  }
  return out;
}

export function crossunder(a: NumSeries, b: NumSeries): boolean[] {
  const n = Math.min(a.length, b.length);
  const out = new Array(n).fill(false);
  for (let i = 1; i < n; i++) {
    out[i] =
      Number.isFinite(a[i]) &&
      Number.isFinite(b[i]) &&
      Number.isFinite(a[i - 1]) &&
      Number.isFinite(b[i - 1]) &&
      a[i - 1] >= b[i - 1] &&
      a[i] < b[i];
  }
  return out;
}

export function change(src: NumSeries, length = 1): NumSeries {
  const out = emptyLike(src);
  const len = Math.max(1, Math.floor(length));
  for (let i = len; i < src.length; i++) {
    if (Number.isFinite(src[i]) && Number.isFinite(src[i - len])) {
      out[i] = src[i] - src[i - len];
    }
  }
  return out;
}

export function abs(src: NumSeries | number): NumSeries | number {
  if (typeof src === 'number') return Math.abs(src);
  return src.map((v) => (Number.isFinite(v) ? Math.abs(v) : NaN));
}

/** Replace NaN with replacement */
export function nz(src: NumSeries | number, replacement = 0): NumSeries | number {
  if (typeof src === 'number') return Number.isFinite(src) ? src : replacement;
  return src.map((v) => (Number.isFinite(v) ? v : replacement));
}

/** Arithmetic helpers that broadcast scalars over series */
export function add(a: NumSeries | number, b: NumSeries | number): NumSeries | number {
  return bin(a, b, (x, y) => x + y);
}
export function sub(a: NumSeries | number, b: NumSeries | number): NumSeries | number {
  return bin(a, b, (x, y) => x - y);
}
export function mul(a: NumSeries | number, b: NumSeries | number): NumSeries | number {
  return bin(a, b, (x, y) => x * y);
}
export function div(a: NumSeries | number, b: NumSeries | number): NumSeries | number {
  return bin(a, b, (x, y) => (y === 0 ? NaN : x / y));
}

function bin(
  a: NumSeries | number,
  b: NumSeries | number,
  op: (x: number, y: number) => number,
): NumSeries | number {
  if (typeof a === 'number' && typeof b === 'number') return op(a, b);
  const arrA = typeof a === 'number' ? null : a;
  const arrB = typeof b === 'number' ? null : b;
  const n = arrA?.length ?? arrB?.length ?? 0;
  const out = new Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    const x = arrA ? arrA[i] : (a as number);
    const y = arrB ? arrB[i] : (b as number);
    out[i] = Number.isFinite(x) && Number.isFinite(y) ? op(x, y) : NaN;
  }
  return out;
}

export const BUILTIN_MATH = {
  sma,
  ema,
  rsi,
  highest,
  lowest,
  crossover,
  crossunder,
  change,
  abs,
  nz,
  add,
  sub,
  mul,
  div,
  max: Math.max,
  min: Math.min,
  sqrt: Math.sqrt,
  log: Math.log,
  exp: Math.exp,
  PI: Math.PI,
};
