import type { Candle, Quote, SymbolId, Timeframe } from '../../types';
import {
  fetchTimeSeries,
  fetchPrice,
  getQuoteWsUrl,
  buildSubscribeMessage,
  buildUnsubscribeMessage,
  parseWsQuote,
  TwelveDataError,
} from '../../api/twelveData';
import { generateMockCandles, generateMockQuote } from './mockData';

type CandleListener = (symbol: SymbolId, timeframe: Timeframe, candles: Candle[]) => void;
type QuoteListener = (quote: Quote) => void;
type StatusListener = (status: ConnectionStatus) => void;

export type ConnectionStatus = 'idle' | 'connecting' | 'live' | 'polling' | 'offline' | 'error';

interface CacheEntry {
  candles: Candle[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 60_000;

/**
 * Central market-data facade.
 * - REST for history
 * - WebSocket for live quotes (falls back to polling / mock when key missing)
 * - In-memory candle cache keyed by symbol+timeframe
 */
class MarketDataService {
  private cache = new Map<string, CacheEntry>();
  private candleListeners = new Set<CandleListener>();
  private quoteListeners = new Set<QuoteListener>();
  private statusListeners = new Set<StatusListener>();
  private ws: WebSocket | null = null;
  private subscribed = new Set<SymbolId>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private status: ConnectionStatus = 'idle';
  private useMock = false;

  private cacheKey(symbol: SymbolId, tf: Timeframe) {
    return `${symbol}::${tf}`;
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  getStatus() {
    return this.status;
  }

  isMockMode() {
    return this.useMock;
  }

  onCandles(fn: CandleListener) {
    this.candleListeners.add(fn);
    return () => this.candleListeners.delete(fn);
  }

  onQuote(fn: QuoteListener) {
    this.quoteListeners.add(fn);
    return () => this.quoteListeners.delete(fn);
  }

  onStatus(fn: StatusListener) {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  /** Load (or return cached) historical candles */
  async getCandles(
    symbol: SymbolId,
    timeframe: Timeframe,
    opts: { force?: boolean; limit?: number } = {},
  ): Promise<Candle[]> {
    const key = this.cacheKey(symbol, timeframe);
    const hit = this.cache.get(key);
    if (!opts.force && hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) {
      return hit.candles;
    }

    try {
      const candles = await fetchTimeSeries(symbol, timeframe, opts.limit);
      this.useMock = false;
      this.cache.set(key, { candles, fetchedAt: Date.now() });
      this.candleListeners.forEach((l) => l(symbol, timeframe, candles));
      return candles;
    } catch (err) {
      // Graceful degradation: serve mock data so UI is demoable offline / without key
      if (err instanceof TwelveDataError && (err.code === 'NO_API_KEY' || err.status === 401)) {
        this.useMock = true;
        const candles = generateMockCandles(symbol, timeframe, opts.limit ?? 500);
        this.cache.set(key, { candles, fetchedAt: Date.now() });
        this.candleListeners.forEach((l) => l(symbol, timeframe, candles));
        this.setStatus('offline');
        return candles;
      }
      if (hit) return hit.candles;
      throw err;
    }
  }

  /** Patch last candle (or append) from a live quote — keeps chart alive */
  applyQuoteToCache(quote: Quote, timeframe: Timeframe) {
    const key = this.cacheKey(quote.symbol, timeframe);
    const entry = this.cache.get(key);
    if (!entry || entry.candles.length === 0) return;

    const candles = entry.candles.slice();
    const last = candles[candles.length - 1];
    const tfMs = timeframeToMs(timeframe);
    const barStart = Math.floor(quote.timestamp / tfMs) * tfMs;

    if (last.time === barStart) {
      candles[candles.length - 1] = {
        ...last,
        high: Math.max(last.high, quote.price),
        low: Math.min(last.low, quote.price),
        close: quote.price,
      };
    } else if (barStart > last.time) {
      candles.push({
        time: barStart,
        open: quote.price,
        high: quote.price,
        low: quote.price,
        close: quote.price,
        volume: 0,
      });
    } else {
      return;
    }

    this.cache.set(key, { candles, fetchedAt: entry.fetchedAt });
    this.candleListeners.forEach((l) => l(quote.symbol, timeframe, candles));
  }

  /** Start live quotes for a set of symbols */
  connectQuotes(symbols: SymbolId[]) {
    symbols.forEach((s) => this.subscribed.add(s));

    if (this.useMock) {
      this.startMockPolling();
      return;
    }

    try {
      this.openWebSocket();
    } catch {
      this.startRestPolling();
    }
  }

  unsubscribe(symbol: SymbolId) {
    this.subscribed.delete(symbol);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(buildUnsubscribeMessage([symbol]));
    }
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.setStatus('idle');
  }

  private openWebSocket() {
    this.setStatus('connecting');
    const url = getQuoteWsUrl();
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.setStatus('live');
      if (this.subscribed.size > 0) {
        ws.send(buildSubscribeMessage([...this.subscribed]));
      }
    };

    ws.onmessage = (ev) => {
      const quote = parseWsQuote(String(ev.data));
      if (quote) this.quoteListeners.forEach((l) => l(quote));
    };

    ws.onerror = () => {
      this.setStatus('error');
    };

    ws.onclose = () => {
      this.ws = null;
      // Fallback to REST polling
      this.startRestPolling();
    };
  }

  private startRestPolling() {
    if (this.pollTimer) return;
    this.setStatus('polling');
    this.pollTimer = setInterval(async () => {
      for (const symbol of this.subscribed) {
        try {
          const price = await fetchPrice(symbol);
          const quote: Quote = {
            symbol,
            price,
            bid: price,
            ask: price,
            timestamp: Date.now(),
          };
          this.quoteListeners.forEach((l) => l(quote));
        } catch {
          /* ignore single-tick failures */
        }
      }
    }, 5000);
  }

  private startMockPolling() {
    if (this.pollTimer) return;
    this.setStatus('offline');
    this.pollTimer = setInterval(() => {
      for (const symbol of this.subscribed) {
        const quote = generateMockQuote(symbol);
        this.quoteListeners.forEach((l) => l(quote));
      }
    }, 1500);
  }
}

function timeframeToMs(tf: Timeframe): number {
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

/** Singleton */
export const marketData = new MarketDataService();
export default marketData;
