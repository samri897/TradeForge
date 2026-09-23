import React from 'react';
import { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import type { Candle, Timeframe } from '../../types';
import { colors } from '../../theme';
import { formatPrice, formatCandleTime } from '../../utils/format';

interface Props {
  index: number | null;
  candles: Candle[];
  from: number;
  to: number;
  width: number;
  height: number;
  priceMin: number;
  priceMax: number;
  symbol: string;
  timeframe: Timeframe;
}

export function CrosshairLayer({
  index,
  candles,
  from,
  to,
  width,
  height,
  priceMin,
  priceMax,
  symbol,
  timeframe,
}: Props) {
  if (index == null || !candles[index]) return null;

  const c = candles[index];
  const bars = Math.max(1, to - from);
  const slot = width / bars;
  const x = (index - from) * slot + slot / 2;
  const range = priceMax - priceMin || 1;
  const y = height - ((c.close - priceMin) / range) * height;

  const label = `${formatCandleTime(c.time, timeframe)}  O ${formatPrice(c.open, symbol)}  H ${formatPrice(c.high, symbol)}  L ${formatPrice(c.low, symbol)}  C ${formatPrice(c.close, symbol)}`;

  return (
    <G>
      <Line
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={colors.chart.crosshair}
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <Line
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={colors.chart.crosshair}
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <Rect x={8} y={8} width={Math.min(width - 16, 420)} height={22} rx={4} fill={colors.bg.elevated} opacity={0.92} />
      <SvgText x={14} y={23} fill={colors.text.primary} fontSize={11} fontFamily="System">
        {label}
      </SvgText>
      {/* price tag */}
      <Rect x={width - 70} y={y - 10} width={66} height={20} rx={3} fill={colors.chart.crosshairLabel} />
      <SvgText x={width - 62} y={y + 4} fill="#fff" fontSize={11}>
        {formatPrice(c.close, symbol)}
      </SvgText>
    </G>
  );
}

export default CrosshairLayer;
