import React, { useMemo } from 'react';
import { G, Path, Line, Circle, Rect } from 'react-native-svg';
import type { PlotSeries, HLine } from '../../types';

interface Props {
  plots: PlotSeries[];
  hlines: HLine[];
  from: number;
  to: number;
  width: number;
  height: number;
  priceMin: number;
  priceMax: number;
  /** If set, only render plots for this pane (and non-overlay when paneId matches) */
  paneId?: string;
  overlayOnly?: boolean;
}

export function PlotLayer({
  plots,
  hlines,
  from,
  to,
  width,
  height,
  priceMin,
  priceMax,
  paneId,
  overlayOnly = true,
}: Props) {
  const range = priceMax - priceMin || 1;
  const bars = Math.max(1, to - from);
  const slot = width / bars;
  const yOf = (price: number) => height - ((price - priceMin) / range) * height;

  const filtered = useMemo(() => {
    return plots.filter((p) => {
      if (overlayOnly) return p.overlay !== false && !p.paneId;
      if (paneId) return p.paneId === paneId;
      return !p.overlay;
    });
  }, [plots, paneId, overlayOnly]);

  const paths = useMemo(() => {
    return filtered.map((p) => {
      if (p.style === 'histogram') {
        const rects: React.ReactNode[] = [];
        const bodyW = Math.max(1, slot * 0.7);
        for (let i = Math.floor(from); i <= Math.ceil(to); i++) {
          const v = p.values[i];
          if (v == null || !Number.isFinite(v)) continue;
          const x = (i - from) * slot + slot / 2;
          const y0 = yOf(0);
          const y1 = yOf(v);
          const top = Math.min(y0, y1);
          const h = Math.max(1, Math.abs(y1 - y0));
          rects.push(
            <Rect
              key={`${p.id}_${i}`}
              x={x - bodyW / 2}
              y={top}
              width={bodyW}
              height={h}
              fill={v >= 0 ? p.color : '#EF5350'}
              opacity={0.8}
            />,
          );
        }
        return <G key={p.id}>{rects}</G>;
      }

      if (p.style === 'circles' || p.style === 'cross') {
        const dots: React.ReactNode[] = [];
        for (let i = Math.floor(from); i <= Math.ceil(to); i++) {
          const v = p.values[i];
          if (v == null || !Number.isFinite(v)) continue;
          const x = (i - from) * slot + slot / 2;
          const y = yOf(v);
          dots.push(
            <Circle key={`${p.id}_${i}`} cx={x} cy={y} r={3} fill={p.color} />,
          );
        }
        return <G key={p.id}>{dots}</G>;
      }

      // line / area
      let d = '';
      let started = false;
      for (let i = Math.floor(from); i <= Math.ceil(to); i++) {
        const v = p.values[i];
        if (v == null || !Number.isFinite(v)) {
          started = false;
          continue;
        }
        const x = (i - from) * slot + slot / 2;
        const y = yOf(v);
        if (!started) {
          d += `M ${x} ${y} `;
          started = true;
        } else {
          d += `L ${x} ${y} `;
        }
      }
      return (
        <Path
          key={p.id}
          d={d}
          stroke={p.color}
          strokeWidth={p.lineWidth}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );
    });
  }, [filtered, from, to, slot, priceMin, priceMax, height, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const hlineNodes = useMemo(() => {
    if (!overlayOnly && paneId) {
      // hlines are global — show on price pane only
      return null;
    }
    return hlines.map((h) => {
      if (h.price < priceMin || h.price > priceMax) return null;
      const y = yOf(h.price);
      const dash =
        h.style === 'dashed' ? '6 4' : h.style === 'dotted' ? '2 4' : undefined;
      return (
        <Line
          key={h.id}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke={h.color}
          strokeWidth={1}
          strokeDasharray={dash}
          opacity={0.8}
        />
      );
    });
  }, [hlines, priceMin, priceMax, width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <G>
      {paths}
      {overlayOnly ? hlineNodes : null}
    </G>
  );
}

export default PlotLayer;
