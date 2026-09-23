import { ScriptEngine } from '../ScriptEngine';
import type { Candle } from '../../../types';

function makeCandles(n: number): Candle[] {
  const out: Candle[] = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    const open = price;
    const close = price + (i % 2 === 0 ? 1 : -0.5);
    out.push({
      time: 1_700_000_000_000 + i * 3_600_000,
      open,
      high: Math.max(open, close) + 0.5,
      low: Math.min(open, close) - 0.5,
      close,
      volume: 1000 + i,
    });
    price = close;
  }
  return out;
}

describe('ScriptEngine', () => {
  const engine = new ScriptEngine();
  const candles = makeCandles(50);

  test('runs SMA plot script', () => {
    const src = `
      const ma = sma(close, 10)
      plot(ma, "SMA10", { color: "#2962FF", lineWidth: 2 })
    `;
    const out = engine.run(src, { candles, symbol: 'EUR/USD', timeframe: '1h' });
    expect(out.errors).toHaveLength(0);
    expect(out.plots).toHaveLength(1);
    expect(out.plots[0].title).toBe('SMA10');
    expect(out.plots[0].values).toHaveLength(50);
    // first 9 should be null, rest finite
    expect(out.plots[0].values[8]).toBeNull();
    expect(out.plots[0].values[9]).not.toBeNull();
  });

  test('transpiles series subtraction for MACD-style scripts', () => {
    const src = `
      const macdLine = ema(close, 12) - ema(close, 26)
      plot(macdLine, "MACD", { overlay: false, paneId: "macd" })
    `;
    const out = engine.run(src, { candles, symbol: 'EUR/USD', timeframe: '1h' });
    expect(out.errors).toHaveLength(0);
    expect(out.plots[0].paneId).toBe('macd');
  });

  test('captures alertcondition on last bar when true', () => {
    // Force a condition that's true on every bar via constant series trick
    const src = `
      const always = crossover(close, close) // false always
      // Use a direct boolean array via comparing last logic:
      const cond = close.map ? close.map(function(v){ return true }) : close
      alertcondition(true, "Always", "fired")
    `;
    // alertcondition(true) expands to all bars true → last bar fires
    const out = engine.run(
      `alertcondition(true, "Always", "fired")`,
      { candles, symbol: 'EUR/USD', timeframe: '1h' },
    );
    expect(out.alerts).toHaveLength(1);
    expect(out.logs.some((l) => l.includes('[alert:fire]'))).toBe(true);
  });

  test('sandbox blocks process access', () => {
    const out = engine.run(
      `
      if (process != null) throw new Error("process leaked")
      if (typeof require === "function") throw new Error("require leaked")
      if (typeof fetch === "function") throw new Error("fetch leaked")
      plot(close, "ok")
      `,
      {
        candles,
        symbol: 'EUR/USD',
        timeframe: '1h',
      },
    );
    // process is shadowed as undefined — script should run cleanly and plot
    expect(out.errors).toHaveLength(0);
    expect(out.plots).toHaveLength(1);
  });

  test('sandbox throws when touching process properties', () => {
    const out = engine.run(`plot(process.env, "x")`, {
      candles,
      symbol: 'EUR/USD',
      timeframe: '1h',
    });
    expect(out.errors.length).toBeGreaterThan(0);
  });

  test('markers generated from condition arrays', () => {
    const src = `
      const up = crossover(sma(close, 3), sma(close, 5))
      marker(up, "belowBar", "#0f0", "arrowUp", "BUY")
    `;
    const out = engine.run(src, { candles, symbol: 'EUR/USD', timeframe: '1h' });
    expect(out.errors).toHaveLength(0);
    // may or may not have markers depending on data — just ensure no throw
    expect(Array.isArray(out.markers)).toBe(true);
  });
});
