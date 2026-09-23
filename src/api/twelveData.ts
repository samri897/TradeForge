import type { Candle, Quote, SymbolId, Timeframe } from '../types';
import { TWELVE_DATA_INTERVAL, DEFAULT_CANDLE_LIMIT } from '../constants/instruments';

const BASE_URL = 'https://api.twelvedata.com';

function readEnv(key: string): string {
  try {
    // Metro inlines EXPO_PUBLIC_* at bundle time when accessed via process.env.X
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>;
    return env[key] ?? '';
  } catch {
    return '';
  }
}

const API_KEY = readEnv('EXPO_PUBLIC_TWELVE_DATA_API_KEY');

export class TwelveDataError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'TwelveDataError';
  }
}

interface TDTimeSeriesValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}

interface TDTimeSeriesResponse {
  meta?: { symbol: string; interval: string; exchange?: string };
  values?: TDTimeSeriesValue[];
  status?: string;
  message?: string;
  code?: number;
}

interface TDPriceResponse {
  price?: string;
  status?: string;
  message?: string;
}

function assertKey() {
  if (!API_KEY || API_KEY.includes('your_')) {
    throw new TwelveDataError(
      'Missing EXPO_PUBLIC_TWELVE_DATA_API_KEY. Copy .env.example → .env and add your key.',
      401,
      'NO_API_KEY',
    );
  }
}

function parseCandle(v: TDTimeSeriesValue): Candle {
  // Twelve Data returns "YYYY-MM-DD HH:mm:ss" in exchange tz (UTC for forex)
  const time = Date.parse(v.datetime.replace(' ', 'T') + 'Z');
  return {
    time: Number.isFinite(time) ? time : 0,
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    volume: v.volume ? parseFloat(v.volume) : 0,
  };
}

/**
 * Fetch historical OHLCV candles.
 * Docs: https://twelvedata.com/docs#time-series
 */
export async function fetchTimeSeries(
  symbol: SymbolId,
  timeframe: Timeframe,
  outputsize: number = DEFAULT_CANDLE_LIMIT,
): Promise<Candle[]> {
  assertKey();

  const params = new URLSearchParams({
    symbol,
    interval: TWELVE_DATA_INTERVAL[timeframe],
    outputsize: String(outputsize),
    apikey: API_KEY,
    format: 'JSON',
    dp: '5',
  });

  const res = await fetch(`${BASE_URL}/time_series?${params.toString()}`);
  if (!res.ok) {
    throw new TwelveDataError(`HTTP ${res.status}`, res.status);
  }

  const data = (await res.json()) as TDTimeSeriesResponse;

  if (data.status === 'error' || !data.values) {
    throw new TwelveDataError(data.message ?? 'Time series request failed', data.code);
  }

  // API returns newest-first → reverse to oldest-first for charting/scripting
  return data.values.map(parseCandle).reverse().filter((c) => c.time > 0);
}

/** Latest mid price snapshot */
export async function fetchPrice(symbol: SymbolId): Promise<number> {
  assertKey();
  const params = new URLSearchParams({ symbol, apikey: API_KEY });
  const res = await fetch(`${BASE_URL}/price?${params.toString()}`);
  const data = (await res.json()) as TDPriceResponse;
  if (!data.price) {
    throw new TwelveDataError(data.message ?? 'Price request failed');
  }
  return parseFloat(data.price);
}

/**
 * Build a WebSocket URL for real-time quotes.
 * Connect with: new WebSocket(getQuoteWsUrl()) then send subscribe message.
 * Docs: https://twelvedata.com/docs#real-time-price-websocket
 */
export function getQuoteWsUrl(): string {
  assertKey();
  const override = readEnv('EXPO_PUBLIC_WS_URL');
  if (override) return `${override}?apikey=${API_KEY}`;
  return `wss://ws.twelvedata.com/v1/quotes/price?apikey=${API_KEY}`;
}

export function buildSubscribeMessage(symbols: SymbolId[]): string {
  return JSON.stringify({
    action: 'subscribe',
    params: { symbols: symbols.join(',') },
  });
}

export function buildUnsubscribeMessage(symbols: SymbolId[]): string {
  return JSON.stringify({
    action: 'unsubscribe',
    params: { symbols: symbols.join(',') },
  });
}

/** Parse inbound WS price event → Quote | null */
export function parseWsQuote(raw: string): Quote | null {
  try {
    const msg = JSON.parse(raw) as {
      event?: string;
      symbol?: string;
      price?: number | string;
      bid?: number | string;
      ask?: number | string;
      timestamp?: number;
    };
    if (msg.event !== 'price' || !msg.symbol || msg.price == null) return null;
    const price = typeof msg.price === 'string' ? parseFloat(msg.price) : msg.price;
    const bid = msg.bid != null ? Number(msg.bid) : price;
    const ask = msg.ask != null ? Number(msg.ask) : price;
    return {
      symbol: msg.symbol as SymbolId,
      price,
      bid,
      ask,
      timestamp: (msg.timestamp ?? Date.now() / 1000) * 1000,
    };
  } catch {
    return null;
  }
}
