import { create } from 'zustand';
import type {
  Candle,
  ChartType,
  ChartViewport,
  PlotSeries,
  HLine,
  ScriptMarker,
  SymbolId,
  Timeframe,
  Quote,
} from '../types';
import { DEFAULT_SYMBOL, DEFAULT_TIMEFRAME } from '../constants/instruments';
import { theme } from '../theme';

interface ChartState {
  symbol: SymbolId;
  timeframe: Timeframe;
  chartType: ChartType;
  candles: Candle[];
  quote: Quote | null;
  loading: boolean;
  error: string | null;
  connectionStatus: string;

  /** Indicator overlays from script engine */
  plots: PlotSeries[];
  hlines: HLine[];
  markers: ScriptMarker[];

  /** Visible window (indices into candles) */
  viewport: ChartViewport;
  /** If false, keep the user's manual price range during pan and live updates. */
  priceScaleAuto: boolean;

  /** Crosshair */
  crosshairIndex: number | null;

  // actions
  setSymbol: (s: SymbolId) => void;
  setTimeframe: (tf: Timeframe) => void;
  setChartType: (t: ChartType) => void;
  setCandles: (c: Candle[]) => void;
  setQuote: (q: Quote | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setConnectionStatus: (s: string) => void;
  setScriptOutput: (plots: PlotSeries[], hlines: HLine[], markers: ScriptMarker[]) => void;
  setViewport: (v: Partial<ChartViewport>) => void;
  setCrosshairIndex: (i: number | null) => void;
  /** Pan by delta bars */
  pan: (deltaBars: number) => void;
  /** Zoom around anchor (0..1 within viewport) */
  zoom: (factor: number, anchor?: number) => void;
  /** Fit the vertical price scale to visible candles and overlays */
  resetPriceScale: () => void;
  resetViewport: () => void;
}

function defaultViewport(len: number): ChartViewport {
  const visible = Math.min(theme.chart.defaultVisibleBars, Math.max(len, 1));
  const from = Math.max(0, len - visible);
  const to = Math.max(0, len - 1);
  return { from, to, priceMin: 0, priceMax: 1 };
}

function recomputePriceRange(candles: Candle[], from: number, to: number, plots: PlotSeries[]) {
  let min = Infinity;
  let max = -Infinity;
  const a = Math.max(0, Math.floor(from));
  const b = Math.min(candles.length - 1, Math.ceil(to));
  for (let i = a; i <= b; i++) {
    const c = candles[i];
    if (!c) continue;
    if (c.low < min) min = c.low;
    if (c.high > max) max = c.high;
  }
  // Include overlay plots in scale
  for (const p of plots) {
    if (!p.overlay) continue;
    for (let i = a; i <= b; i++) {
      const v = p.values[i];
      if (v == null || !Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    min = min === Infinity ? 0 : min * 0.99;
    max = max === -Infinity ? 1 : max * 1.01;
  }
  const pad = (max - min) * 0.05;
  return { priceMin: min - pad, priceMax: max + pad };
}

export const useChartStore = create<ChartState>((set, get) => ({
  symbol: DEFAULT_SYMBOL,
  timeframe: DEFAULT_TIMEFRAME,
  chartType: 'candlestick',
  candles: [],
  quote: null,
  loading: false,
  error: null,
  connectionStatus: 'idle',
  plots: [],
  hlines: [],
  markers: [],
  viewport: defaultViewport(0),
  priceScaleAuto: true,
  crosshairIndex: null,

  setSymbol: (symbol) => set({
    symbol,
    candles: [],
    quote: null,
    plots: [],
    hlines: [],
    markers: [],
    crosshairIndex: null,
    viewport: defaultViewport(0),
    priceScaleAuto: true,
  }),
  setTimeframe: (timeframe) => set({
    timeframe,
    candles: [],
    plots: [],
    hlines: [],
    markers: [],
    crosshairIndex: null,
    viewport: defaultViewport(0),
    priceScaleAuto: true,
  }),
  setChartType: (chartType) => set({ chartType }),
  setCandles: (candles) => {
    const { plots, viewport, priceScaleAuto } = get();
    const vp = defaultViewport(candles.length);
    const range = priceScaleAuto
      ? recomputePriceRange(candles, vp.from, vp.to, plots)
      : { priceMin: viewport.priceMin, priceMax: viewport.priceMax };
    set({ candles, viewport: { ...vp, ...range }, error: null });
  },
  setQuote: (quote) => set({ quote }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setScriptOutput: (plots, hlines, markers) => {
    const { candles, viewport, priceScaleAuto } = get();
    const range = priceScaleAuto
      ? recomputePriceRange(candles, viewport.from, viewport.to, plots)
      : { priceMin: viewport.priceMin, priceMax: viewport.priceMax };
    set({ plots, hlines, markers, viewport: { ...viewport, ...range } });
  },
  setViewport: (v) => {
    const { viewport, candles, plots, priceScaleAuto } = get();
    const next = { ...viewport, ...v };
    const hasExplicitPriceRange = v.priceMin !== undefined || v.priceMax !== undefined;

    // Keep manual vertical zoom when only the price range changes. Previously the
    // automatic candle range overwrote every price-scale drag/zoom immediately.
    if (hasExplicitPriceRange) {
      const priceMin = next.priceMin;
      const priceMax = next.priceMax;
      if (Number.isFinite(priceMin) && Number.isFinite(priceMax) && priceMax > priceMin) {
        set({ viewport: { ...next, priceMin, priceMax }, priceScaleAuto: false });
      }
      return;
    }

    // Keep a user-adjusted price range while panning. In auto mode, fit the new window.
    if (v.from !== undefined || v.to !== undefined) {
      if (priceScaleAuto) {
        const range = recomputePriceRange(candles, next.from, next.to, plots);
        set({ viewport: { ...next, ...range } });
      } else {
        set({ viewport: next });
      }
      return;
    }

    set({ viewport: next });
  },
  setCrosshairIndex: (crosshairIndex) => set({ crosshairIndex }),

  pan: (deltaBars) => {
    const { viewport, candles, plots, priceScaleAuto } = get();
    const width = viewport.to - viewport.from;
    let from = viewport.from + deltaBars;
    let to = viewport.to + deltaBars;
    if (from < 0) {
      from = 0;
      to = width;
    }
    if (to > candles.length - 1) {
      to = candles.length - 1;
      from = Math.max(0, to - width);
    }
    const range = priceScaleAuto
      ? recomputePriceRange(candles, from, to, plots)
      : { priceMin: viewport.priceMin, priceMax: viewport.priceMax };
    set({ viewport: { from, to, ...range } });
  },

  zoom: (factor, anchor = 0.5) => {
    const { viewport, candles, plots, priceScaleAuto } = get();
    const width = viewport.to - viewport.from;
    const newWidth = Math.min(
      theme.chart.maxVisibleBars,
      Math.max(theme.chart.minVisibleBars, width * factor),
    );
    const center = viewport.from + width * anchor;
    let from = center - newWidth * anchor;
    let to = center + newWidth * (1 - anchor);
    if (from < 0) {
      from = 0;
      to = newWidth;
    }
    if (to > candles.length - 1) {
      to = candles.length - 1;
      from = Math.max(0, to - newWidth);
    }
    const range = priceScaleAuto
      ? recomputePriceRange(candles, from, to, plots)
      : { priceMin: viewport.priceMin, priceMax: viewport.priceMax };
    set({ viewport: { from, to, ...range } });
  },

  resetPriceScale: () => {
    const { candles, plots, viewport } = get();
    const range = recomputePriceRange(candles, viewport.from, viewport.to, plots);
    set({ viewport: { ...viewport, ...range }, priceScaleAuto: true });
  },

  resetViewport: () => {
    const { candles, plots } = get();
    const vp = defaultViewport(candles.length);
    const range = recomputePriceRange(candles, vp.from, vp.to, plots);
    set({ viewport: { ...vp, ...range }, priceScaleAuto: true });
  },
}));
