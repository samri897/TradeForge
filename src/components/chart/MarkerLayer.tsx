import React, { useMemo } from 'react';
import { G, Polygon, Circle, Text as SvgText } from 'react-native-svg';
import type { Candle, ScriptMarker } from '../../types';

interface Props {
  markers: ScriptMarker[];
  candles: Candle[];
  from: number;
  to: number;
  width: number;
  height: number;
  priceMin: number;
  priceMax: number;
}

export function MarkerLayer({
  markers,
  candles,
  from,
  to,
  width,
  height,
  priceMin,
  priceMax,
}: Props) {
  const nodes = useMemo(() => {
    const timeToIndex = new Map<number, number>();
    candles.forEach((c, i) => timeToIndex.set(c.time, i));

    const bars = Math.max(1, to - from);
    const slot = width / bars;
    const range = priceMax - priceMin || 1;
    const yOf = (price: number) => height - ((price - priceMin) / range) * height;

    return markers.map((m, idx) => {
      const i = timeToIndex.get(m.time);
      if (i == null || i < from - 1 || i > to + 1) return null;
      const c = candles[i];
      if (!c) return null;

      const x = (i - from) * slot + slot / 2;
      let y: number;
      if (m.position === 'aboveBar') y = yOf(c.high) - 12;
      else if (m.position === 'belowBar') y = yOf(c.low) + 12;
      else y = yOf((c.high + c.low) / 2);

      if (m.shape === 'arrowUp') {
        const pts = `${x},${y - 6} ${x - 5},${y + 4} ${x + 5},${y + 4}`;
        return (
          <G key={`m${idx}`}>
            <Polygon points={pts} fill={m.color} />
            {m.text ? (
              <SvgText x={x} y={y - 10} fill={m.color} fontSize={9} textAnchor="middle">
                {m.text}
              </SvgText>
            ) : null}
          </G>
        );
      }
      if (m.shape === 'arrowDown') {
        const pts = `${x},${y + 6} ${x - 5},${y - 4} ${x + 5},${y - 4}`;
        return (
          <G key={`m${idx}`}>
            <Polygon points={pts} fill={m.color} />
            {m.text ? (
              <SvgText x={x} y={y + 16} fill={m.color} fontSize={9} textAnchor="middle">
                {m.text}
              </SvgText>
            ) : null}
          </G>
        );
      }
      return (
        <G key={`m${idx}`}>
          <Circle cx={x} cy={y} r={4} fill={m.color} />
          {m.text ? (
            <SvgText x={x} y={y - 8} fill={m.color} fontSize={9} textAnchor="middle">
              {m.text}
            </SvgText>
          ) : null}
        </G>
      );
    });
  }, [markers, candles, from, to, width, height, priceMin, priceMax]);

  return <G>{nodes}</G>;
}

export default MarkerLayer;
