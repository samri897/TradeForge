import type { Candle } from './market';

/** Plot series produced by a custom indicator script */
export interface PlotSeries {
  id: string;
  title: string;
  color: string;
  lineWidth: number;
  style: 'line' | 'histogram' | 'circles' | 'cross' | 'area';
  /** Parallel to candle array; null = no value at that bar */
  values: (number | null)[];
  /** Overlay on price pane vs separate pane */
  overlay: boolean;
  paneId?: string;
}

export interface HLine {
  id: string;
  price: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
  title?: string;
}

export interface ScriptMarker {
  time: number;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  text?: string;
}

export interface AlertCondition {
  id: string;
  /** Human-readable expression, e.g. "crossover(ma_fast, ma_slow)" */
  expression: string;
  message: string;
  oncePerBar: boolean;
}

export interface ScriptOutput {
  plots: PlotSeries[];
  hlines: HLine[];
  markers: ScriptMarker[];
  alerts: AlertCondition[];
  logs: string[];
  errors: ScriptError[];
}

export interface ScriptError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface SavedScript {
  id: string;
  name: string;
  description: string;
  source: string;
  createdAt: number;
  updatedAt: number;
  /** Symbols this script is applied to (empty = all) */
  appliedSymbols: string[];
  enabled: boolean;
}

/** Context injected into the script runtime */
export interface ScriptContext {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  time: number[];
  /** Current bar index being evaluated (0 .. length-1) */
  barIndex: number;
  /** Total bars */
  barCount: number;
  symbol: string;
  timeframe: string;
}

export type BuiltinFn = (...args: unknown[]) => unknown;

export interface ScriptRuntimeOptions {
  candles: Candle[];
  symbol: string;
  timeframe: string;
  /** Max execution time per full run (ms) */
  timeoutMs?: number;
}
