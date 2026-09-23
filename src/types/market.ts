/** OHLCV candle used across charting, scripting, and alerts */
export interface Candle {
  /** Unix timestamp in milliseconds */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export type SymbolId =
  | 'EUR/USD'
  | 'GBP/USD'
  | 'USD/JPY'
  | 'USD/CHF'
  | 'AUD/USD'
  | 'USD/CAD'
  | 'NZD/USD'
  | 'EUR/GBP'
  | 'EUR/JPY'
  | 'GBP/JPY'
  | 'XAU/USD';

export interface Instrument {
  symbol: SymbolId;
  name: string;
  category: 'forex' | 'metal';
  digits: number;
  pipSize: number;
}

export interface Quote {
  symbol: SymbolId;
  price: number;
  bid: number;
  ask: number;
  timestamp: number;
}

export interface ChartViewport {
  /** Index of first visible candle */
  from: number;
  /** Index of last visible candle */
  to: number;
  priceMin: number;
  priceMax: number;
}

export type ChartType = 'candlestick' | 'line' | 'area' | 'heikinashi';
