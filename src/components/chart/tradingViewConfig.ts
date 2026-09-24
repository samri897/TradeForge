import type { SymbolId, Timeframe } from '../../types';

/** TradingView OANDA tickers for the markets supported in TradeForge. */
export const TRADINGVIEW_SYMBOLS: Record<SymbolId, string> = {
  'XAU/USD': 'OANDA:XAUUSD',
  'EUR/USD': 'OANDA:EURUSD',
  'GBP/USD': 'OANDA:GBPUSD',
  'USD/JPY': 'OANDA:USDJPY',
  'USD/CHF': 'OANDA:USDCHF',
  'AUD/USD': 'OANDA:AUDUSD',
  'USD/CAD': 'OANDA:USDCAD',
  'NZD/USD': 'OANDA:NZDUSD',
  'EUR/GBP': 'OANDA:EURGBP',
  'EUR/JPY': 'OANDA:EURJPY',
  'GBP/JPY': 'OANDA:GBPJPY',
};

/** TradingView Advanced Chart Widget interval values. */
export const TRADINGVIEW_INTERVALS: Record<Timeframe, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
  '1w': 'W',
};

export function buildTradingViewPageUrl(
  baseUrl: string,
  symbol: SymbolId,
  timeframe: Timeframe,
  refreshKey = 0,
): string {
  const url = new URL('tradingview-advanced-chart.html', baseUrl);
  url.searchParams.set('symbol', TRADINGVIEW_SYMBOLS[symbol]);
  url.searchParams.set('interval', TRADINGVIEW_INTERVALS[timeframe]);
  url.searchParams.set('refresh', String(refreshKey));
  return url.toString();
}
