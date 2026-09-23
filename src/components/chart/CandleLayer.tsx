import React, { useMemo } from 'react';
import { G, Rect, Line } from 'react-native-svg';
import type { Candle, ChartType } from '../../types';
import { colors } from '../../theme';

interface Props {
  candles: Candle[];
  from: number;
  to: number;
  width: number;
  height: number;
  priceMin: number;
  priceMax: number;
  chartType: ChartType;
}

export function CandleLayer({
  candles,
  from,
  to,
  width,
  height,
  priceMin,
  priceMax,
  chartType,
}: Props) {
  const nodes = useMemo(() => {
    const bars = Math.max(1, to - from);
    const slot = width / bars;
    const bodyWidth = Math.max(1, slot * 0.7);
    const range = priceMax - priceMin || 1;
    const yOf = (price: number) => height - ((price - priceMin) / range) * height;

    const elements: React.ReactNode[] = [];

    if (chartType === 'line' || chartType === 'area') {
      // drawn by PlotLayer-style path — simple segments here
      for (let i = Math.floor(from); i < Math.ceil(to); i++) {
        const c = candles[i];
        const n = candles[i + 1];
        if (!c || !n) continue;
        const x1 = (i - from) * slot + slot / 2;
        const x2 = (i + 1 - from) * slot + slot / 2;
        elements.push(
          <Line
            key={`l${i}`}
            x1={x1}
            y1={yOf(c.close)}
            x2={x2}
            y2={yOf(n.close)}
            stroke={colors.accent.blue}
            strokeWidth={1.5}
          />,
        );
      }
      return elements;
    }

    for (let i = Math.floor(from); i <= Math.ceil(to); i++) {
      const c = candles[i];
      if (!c) continue;

      const x = (i - from) * slot + slot / 2;
      const up = c.close >= c.open;
      const color = up ? colors.candle.up : colors.candle.down;
      const yHigh = yOf(c.high);
      const yLow = yOf(c.low);
      const yOpen = yOf(c.open);
      const yClose = yOf(c.close);
      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1, Math.abs(yClose - yOpen));

      elements.push(
        <G key={`c${i}`}>
          <Line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={1} />
          <Rect
            x={x - bodyWidth / 2}
            y={bodyTop}
            width={bodyWidth}
            height={bodyH}
            fill={color}
          />
        </G>,
      );
    }
    return elements;
  }, [candles, from, to, width, height, priceMin, priceMax, chartType]);

  return <G>{nodes}</G>;
}

export default CandleLayer;
