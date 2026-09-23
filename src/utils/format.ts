import { format as fnsFormat } from 'date-fns';
import type { SymbolId, Timeframe } from '../types';
import { INSTRUMENTS } from '../constants/instruments';

export function formatPrice(value: number, symbol: SymbolId | string): string {
  const inst = INSTRUMENTS.find((i) => i.symbol === symbol);
  const digits = inst?.digits ?? 5;
  return value.toFixed(digits);
}

export function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

export function formatCandleTime(ms: number, timeframe: Timeframe): string {
  const d = new Date(ms);
  switch (timeframe) {
    case '1m':
    case '5m':
    case '15m':
    case '30m':
      return fnsFormat(d, 'HH:mm');
    case '1h':
    case '4h':
      return fnsFormat(d, 'MMM d HH:mm');
    case '1d':
    case '1w':
      return fnsFormat(d, 'MMM d yyyy');
    default:
      return fnsFormat(d, 'yyyy-MM-dd HH:mm');
  }
}

export function formatPct(from: number, to: number): string {
  if (!from) return '0.00%';
  const pct = ((to - from) / from) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function shortenSymbol(symbol: string): string {
  return symbol.replace('/', '');
}
