import { useEffect, useCallback, useRef } from 'react';
import { marketData } from '../services/marketData/MarketDataService';
import { useChartStore } from '../store/chartStore';
import { useScriptStore } from '../store/scriptStore';
import type { SymbolId, Timeframe } from '../types';

/**
 * Binds MarketDataService → chartStore for the active symbol/timeframe.
 * Also re-runs the active draft script whenever candles update.
 */
export function useMarketData() {
  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);
  const setCandles = useChartStore((s) => s.setCandles);
  const setQuote = useChartStore((s) => s.setQuote);
  const setLoading = useChartStore((s) => s.setLoading);
  const setError = useChartStore((s) => s.setError);
  const setConnectionStatus = useChartStore((s) => s.setConnectionStatus);
  const setScriptOutput = useChartStore((s) => s.setScriptOutput);
  const applyQuote = useCallback(
    (q: Parameters<typeof setQuote>[0]) => {
      if (!q) return;
      setQuote(q);
      marketData.applyQuoteToCache(q, timeframe);
    },
    [setQuote, timeframe],
  );

  const runScript = useScriptStore((s) => s.runDraft);
  const draftSource = useScriptStore((s) => s.draftSource);
  const requestIdRef = useRef(0);

  const reload = useCallback(
    async (sym: SymbolId = symbol, tf: Timeframe = timeframe) => {
      const requestId = ++requestIdRef.current;
      const isCurrentRequest = () => {
        const active = useChartStore.getState();
        return requestId === requestIdRef.current && active.symbol === sym && active.timeframe === tf;
      };

      setLoading(true);
      setError(null);
      try {
        const candles = await marketData.getCandles(sym, tf, { force: true });
        if (!isCurrentRequest()) return;
        setCandles(candles);
        // Auto-run current draft so overlays stay in sync
        if (draftSource.trim()) {
          const out = runScript(candles, sym, tf);
          setScriptOutput(out.plots, out.hlines, out.markers);
        }
      } catch (err) {
        if (isCurrentRequest()) {
          setError(err instanceof Error ? err.message : 'Failed to load market data');
        }
      } finally {
        if (isCurrentRequest()) setLoading(false);
      }
    },
    [symbol, timeframe, setCandles, setLoading, setError, draftSource, runScript, setScriptOutput],
  );

  // Initial + symbol/tf change
  useEffect(() => {
    void reload(symbol, timeframe);
  }, [symbol, timeframe]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live quotes
  useEffect(() => {
    marketData.connectQuotes([symbol]);
    const offQ = marketData.onQuote((q) => {
      if (q.symbol === symbol) applyQuote(q);
    });
    const offC = marketData.onCandles((sym, tf, candles) => {
      if (sym === symbol && tf === timeframe) {
        setCandles(candles);
      }
    });
    const offS = marketData.onStatus(setConnectionStatus);
    return () => {
      offQ();
      offC();
      offS();
    };
  }, [symbol, timeframe, applyQuote, setCandles, setConnectionStatus]);

  return { reload, isMock: marketData.isMockMode() };
}
