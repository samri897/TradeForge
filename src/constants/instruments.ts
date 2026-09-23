import type { Instrument, SymbolId, Timeframe } from '../types';

export const INSTRUMENTS: Instrument[] = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'forex', digits: 5, pipSize: 0.0001 },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'forex', digits: 5, pipSize: 0.0001 },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', category: 'forex', digits: 3, pipSize: 0.01 },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', category: 'forex', digits: 5, pipSize: 0.0001 },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', category: 'forex', digits: 5, pipSize: 0.0001 },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', category: 'forex', digits: 5, pipSize: 0.0001 },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', category: 'forex', digits: 5, pipSize: 0.0001 },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', category: 'forex', digits: 5, pipSize: 0.0001 },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', category: 'forex', digits: 3, pipSize: 0.01 },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', category: 'forex', digits: 3, pipSize: 0.01 },
  { symbol: 'XAU/USD', name: 'Gold / US Dollar', category: 'metal', digits: 2, pipSize: 0.01 },
];

export const DEFAULT_SYMBOL: SymbolId = 'EUR/USD';

export const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m', label: 'M1' },
  { value: '5m', label: 'M5' },
  { value: '15m', label: 'M15' },
  { value: '30m', label: 'M30' },
  { value: '1h', label: 'H1' },
  { value: '4h', label: 'H4' },
  { value: '1d', label: 'D1' },
  { value: '1w', label: 'W1' },
];

export const DEFAULT_TIMEFRAME: Timeframe = '1h';

/** Map app timeframe → Twelve Data interval param */
export const TWELVE_DATA_INTERVAL: Record<Timeframe, string> = {
  '1m': '1min',
  '5m': '5min',
  '15m': '15min',
  '30m': '30min',
  '1h': '1h',
  '4h': '4h',
  '1d': '1day',
  '1w': '1week',
};

export const DEFAULT_CANDLE_LIMIT = 500;
