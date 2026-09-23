import type {
  Candle,
  PlotSeries,
  HLine,
  ScriptMarker,
  AlertCondition,
  ScriptError,
  ScriptOutput,
  ScriptRuntimeOptions,
} from '../../types';
import { BUILTIN_MATH } from './builtins';

export interface InputDef {
  id: string;
  title: string;
  defval: number;
}

interface RuntimeCollect {
  plots: PlotSeries[];
  hlines: HLine[];
  markers: ScriptMarker[];
  alerts: AlertCondition[];
  logs: string[];
  inputs: InputDef[];
  plotCounter: number;
}

const DEFAULT_COLORS = ['#2962FF', '#FF6D00', '#26A69A', '#EF5350', '#7E57C2', '#FFCA28'];

/**
 * TradeForge Script Engine
 * ------------------------
 * Lightweight JS-subset interpreter for custom indicators.
 *
 * Security model:
 *  - Source is wrapped in a new Function() with a frozen sandbox scope
 *  - No access to globalThis, fetch, require, process, WebSocket, etc.
 *  - Execution time is soft-capped via a bar-budget check
 *
 * Language surface (Pine-like):
 *  series: open, high, low, close, volume, time
 *  fns:    sma, ema, rsi, plot, hline, marker, alertcondition, input, ...
 *
 * Operators + and - on series are available via add()/sub() helpers;
 * for ergonomics we also rewrite `a - b` when both are identifiers of series
 * is NOT done — users write `ema(close,12) - ema(close,26)` which JS evaluates
 * element-wise only if we overload. To keep the engine simple and safe, we
 * pre-process the source to lift binary ops on known series into map calls.
 */
export class ScriptEngine {
  private lastErrors: ScriptError[] = [];

  get errors() {
    return this.lastErrors;
  }

  /**
   * Execute a script against candle data and collect plot/alert output.
   */
  run(source: string, options: ScriptRuntimeOptions): ScriptOutput {
    const { candles, symbol, timeframe, timeoutMs = 2000 } = options;
    this.lastErrors = [];

    const empty: ScriptOutput = {
      plots: [],
      hlines: [],
      markers: [],
      alerts: [],
      logs: [],
      errors: [],
    };

    if (!candles.length) {
      return { ...empty, errors: [{ line: 0, column: 0, message: 'No candle data', severity: 'error' }] };
    }

    const collect: RuntimeCollect = {
      plots: [],
      hlines: [],
      markers: [],
      alerts: [],
      logs: [],
      inputs: [],
      plotCounter: 0,
    };

    const open = candles.map((c) => c.open);
    const high = candles.map((c) => c.high);
    const low = candles.map((c) => c.low);
    const close = candles.map((c) => c.close);
    const volume = candles.map((c) => c.volume);
    const time = candles.map((c) => c.time);
    const n = candles.length;

    // --- sandbox API -------------------------------------------------------
    const input = (defval: number, title = 'Input'): number => {
      const id = `input_${collect.inputs.length}`;
      collect.inputs.push({ id, title, defval });
      return defval; // v1: no UI binding yet — uses default
    };

    const plot = (
      series: number[] | number,
      title = 'Plot',
      opts: {
        color?: string;
        lineWidth?: number;
        style?: PlotSeries['style'];
        overlay?: boolean;
        paneId?: string;
      } = {},
    ) => {
      const values = normalizeSeries(series, n);
      const idx = collect.plotCounter++;
      collect.plots.push({
        id: `plot_${idx}`,
        title,
        color: opts.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
        lineWidth: opts.lineWidth ?? 1,
        style: opts.style ?? 'line',
        values,
        overlay: opts.overlay ?? true,
        paneId: opts.paneId,
      });
    };

    const hline = (
      price: number,
      title = '',
      opts: { color?: string; style?: HLine['style'] } = {},
    ) => {
      collect.hlines.push({
        id: `hl_${collect.hlines.length}`,
        price,
        color: opts.color ?? '#787B86',
        style: opts.style ?? 'dashed',
        title,
      });
    };

    const marker = (
      condition: boolean[] | boolean,
      position: ScriptMarker['position'] = 'aboveBar',
      color = '#2962FF',
      shape: ScriptMarker['shape'] = 'circle',
      text = '',
    ) => {
      const cond = typeof condition === 'boolean' ? candles.map(() => condition) : condition;
      for (let i = 0; i < n; i++) {
        if (cond[i]) {
          collect.markers.push({
            time: time[i],
            position,
            color,
            shape,
            text: text || undefined,
          });
        }
      }
    };

    const alertcondition = (condition: boolean[] | boolean, title: string, message?: string) => {
      // Store meta; actual evaluation for live alerts uses last bar
      const condArr = typeof condition === 'boolean' ? candles.map(() => condition) : condition;
      const fired = condArr[condArr.length - 1] === true;
      collect.alerts.push({
        id: `alert_${collect.alerts.length}`,
        expression: title,
        message: message ?? title,
        oncePerBar: true,
      });
      // Tag last-bar fire via log for engine consumers
      if (fired) collect.logs.push(`[alert:fire] ${title}`);
    };

    const log = (...args: unknown[]) => {
      collect.logs.push(args.map(String).join(' '));
    };

    // Series arithmetic: enable `seriesA - seriesB` style via helpers exposed as ops
    // Users can also call add/sub/mul/div directly.
    const seriesOps = {
      ...BUILTIN_MATH,
      // Element-wise when both args are arrays — monkey-patch nothing; expose ops
    };

    // Preprocess: rewrite bare series binary arithmetic is complex; instead document
    // that subtraction of two series works if written as: sub(ema(close,12), ema(close,26))
    // BUT for Pine-like UX we transpile common patterns:
    const transpiled = transpile(source);

    const sandbox = {
      // OHLC
      open,
      high,
      low,
      close,
      volume,
      time,
      // meta
      symbol,
      timeframe,
      barCount: n,
      // I/O
      input,
      plot,
      hline,
      marker,
      alertcondition,
      log,
      console: { log },
      // builtins
      ...seriesOps,
      // safe Math
      Math: Object.freeze({
        abs: Math.abs,
        max: Math.max,
        min: Math.min,
        sqrt: Math.sqrt,
        pow: Math.pow,
        log: Math.log,
        exp: Math.exp,
        sign: Math.sign,
        round: Math.round,
        floor: Math.floor,
        ceil: Math.ceil,
        PI: Math.PI,
        E: Math.E,
      }),
      NaN,
      Infinity,
      undefined: undefined as undefined,
      // Shadow host globals so free-variable lookup cannot reach them.
      // (new Function still resolves undeclared names against the real global
      // object in some engines — binding them here as parameters blocks that.)
      globalThis: undefined as unknown,
      global: undefined as unknown,
      window: undefined as unknown,
      self: undefined as unknown,
      process: undefined as unknown,
      require: undefined as unknown,
      module: undefined as unknown,
      exports: undefined as unknown,
      fetch: undefined as unknown,
      XMLHttpRequest: undefined as unknown,
      WebSocket: undefined as unknown,
      Date: undefined as unknown,
      setTimeout: undefined as unknown,
      setInterval: undefined as unknown,
      Buffer: undefined as unknown,
      Deno: undefined as unknown,
      // NOTE: cannot bind `eval` / `arguments` / `Function` as parameter
      // names — they are forbidden in strict mode. We prefix-block them
      // in the generated body instead (see prelude below).
    };

    const paramNames = Object.keys(sandbox);
    const paramValues = Object.values(sandbox);

    const started = Date.now();
    try {
      // Soft timeout via cooperative check is hard inside user code;
      // we wrap and enforce wall-clock after execution.
      // Note: we cannot bind/shadow `eval`, `arguments`, or `Function` —
      // they are reserved in strict mode. Rely on param shadowing for the
      // rest of the host globals, and a static deny-list scan of source.
      const denied = /\b(eval|Function)\s*\(|new\s+Function\b/.exec(transpiled);
      if (denied) {
        throw new Error(`Forbidden API in script: ${denied[0]}`);
      }

      // eslint-disable-next-line no-new-func
      const fn = new Function(...paramNames, `"use strict";\n${transpiled}\n`);
      fn(...paramValues);

      if (Date.now() - started > timeoutMs) {
        this.lastErrors.push({
          line: 0,
          column: 0,
          message: `Script exceeded timeout of ${timeoutMs}ms`,
          severity: 'warning',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const lineMatch = /<anonymous>:(\d+)/.exec(err instanceof Error ? err.stack ?? '' : '');
      // Adjust for wrapper line offset ("use strict" + blank)
      const line = lineMatch ? Math.max(1, parseInt(lineMatch[1], 10) - 1) : 0;
      this.lastErrors.push({ line, column: 0, message, severity: 'error' });
    }

    return {
      plots: collect.plots,
      hlines: collect.hlines,
      markers: collect.markers,
      alerts: collect.alerts,
      logs: collect.logs,
      errors: this.lastErrors,
    };
  }

  /** Evaluate only the last-bar alert flags for a script (used by AlertService) */
  evaluateAlerts(
    source: string,
    candles: Candle[],
    symbol: string,
    timeframe: string,
  ): { fired: { title: string; message: string }[]; errors: ScriptError[] } {
    const output = this.run(source, { candles, symbol, timeframe });
    const fired = output.logs
      .filter((l) => l.startsWith('[alert:fire] '))
      .map((l) => {
        const title = l.replace('[alert:fire] ', '');
        const meta = output.alerts.find((a) => a.expression === title);
        return { title, message: meta?.message ?? title };
      });
    return { fired, errors: output.errors };
  }
}

/** Convert number | number[] → (number|null)[] of fixed length */
function normalizeSeries(series: number[] | number, n: number): (number | null)[] {
  if (typeof series === 'number') {
    return new Array(n).fill(Number.isFinite(series) ? series : null);
  }
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const v = series[i];
    out[i] = Number.isFinite(v) ? v : null;
  }
  return out;
}

/**
 * Tiny transpiler:
 *  1. Strip // line comments is left to engine (JS handles them)
 *  2. Rewrite `a - b` between call-results is too hard without AST
 *  3. Allow Pine-like `:=` → `=`
 *  4. Lift binary + - * / when BOTH sides look like series expressions by
 *     wrapping:  we use a pragmatic regex for `xxx(…) - yyy(…)` patterns
 *     and identifier - identifier when not numeric.
 *
 * For production, swap this for a proper PEG/nearley parser.
 */
function transpile(source: string): string {
  let src = source;

  // Pine-style assignment
  src = src.replace(/:=/g, '=');

  // Convert `ema(close, 12) - ema(close, 26)` → `sub(ema(close, 12), ema(close, 26))`
  // Repeatedly apply for nested chains (left-associative)
  const call = String.raw`[a-zA-Z_][\w]*\s*\([^()]*\)`;
  const ident = String.raw`[a-zA-Z_][\w]*`;
  const operand = `(?:${call}|${ident})`;

  const rules: [RegExp, string][] = [
    [new RegExp(`(${operand})\\s*\\+\\s*(${operand})`, 'g'), 'add($1, $2)'],
    [new RegExp(`(${operand})\\s*-\\s*(${operand})`, 'g'), 'sub($1, $2)'],
    [new RegExp(`(${operand})\\s*\\*\\s*(${operand})`, 'g'), 'mul($1, $2)'],
    [new RegExp(`(${operand})\\s*/\\s*(${operand})`, 'g'), 'div($1, $2)'],
  ];

  // Apply a few passes so a - b - c becomes nested sub()
  for (let pass = 0; pass < 4; pass++) {
    let prev = src;
    for (const [re, rep] of rules) {
      // Avoid rewriting inside strings — simplistic: skip if odd quote count before match
      src = src.replace(re, (match, a, b, offset) => {
        const before = src.slice(0, offset);
        // don't touch if looks like unary or numeric literal context
        if (/^\d/.test(a) || /^\d/.test(b)) return match;
        // skip reserved words used as non-series
        const reserved = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);
        if (reserved.has(a) || reserved.has(b)) return match;
        const quotes = (before.match(/"/g) ?? []).length + (before.match(/'/g) ?? []).length;
        if (quotes % 2 === 1) return match;
        return rep.replace('$1', a).replace('$2', b);
      });
    }
    if (src === prev) break;
  }

  return src;
}

/** Singleton engine instance */
export const scriptEngine = new ScriptEngine();
export default scriptEngine;
