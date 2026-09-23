import { sma, ema, rsi, crossover, crossunder, highest, lowest } from '../builtins';

describe('builtins', () => {
  const close = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  test('sma length 3', () => {
    const out = sma(close, 3);
    expect(out[0]).toBeNaN();
    expect(out[1]).toBeNaN();
    expect(out[2]).toBeCloseTo(2);
    expect(out[9]).toBeCloseTo(9);
  });

  test('ema produces finite values after seed', () => {
    const out = ema(close, 3);
    expect(out[2]).toBeCloseTo(2);
    expect(Number.isFinite(out[9])).toBe(true);
  });

  test('rsi bounds', () => {
    const out = rsi(close, 5);
    const last = out[out.length - 1];
    expect(last).toBeGreaterThan(50); // steadily rising → high RSI
    expect(last).toBeLessThanOrEqual(100);
  });

  test('crossover detects cross', () => {
    const a = [1, 1, 3, 4];
    const b = [2, 2, 2, 2];
    const c = crossover(a, b);
    expect(c[2]).toBe(true);
    expect(c[3]).toBe(false);
  });

  test('crossunder detects cross', () => {
    const a = [3, 3, 1, 0];
    const b = [2, 2, 2, 2];
    const c = crossunder(a, b);
    expect(c[2]).toBe(true);
  });

  test('highest / lowest', () => {
    expect(highest(close, 3)[4]).toBe(5);
    expect(lowest(close, 3)[4]).toBe(3);
  });
});
