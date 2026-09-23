import React, { useMemo } from 'react';
import { G, Rect } from 'react-native-svg';
import type { Candle } from '../../types';
import { colors } from '../../theme';

interface Props {
  candles: Candle[];
  from: number;
  to: number;
  width: number;
  height: number;
  /** y-offset from top of parent svg where volume pane starts */
  offsetY: number;
}

export function VolumeLayer({ candles, from, to, width, height, offsetY }: Props) {
  const nodes = useMemo(() => {
    const bars = Math.max(1, to - from);
    const slot = width / bars;
    const bodyW = Math.max(1, slot * 0.7);

    let maxVol = 1;
    for (let i = Math.floor(from); i <= Math.ceil(to); i++) {
      const c = candles[i];
      if (c && c.volume > maxVol) maxVol = c.volume;
    }

    const out: React.ReactNode[] = [];
    for (let i = Math.floor(from); i <= Math.ceil(to); i++) {
      const c = candles[i];
      if (!c) continue;
      const h = (c.volume / maxVol) * height;
      const x = (i - from) * slot + slot / 2;
      const up = c.close >= c.open;
      out.push(
        <Rect
          key={`v${i}`}
          x={x - bodyW / 2}
          y={offsetY + height - h}
          width={bodyW}
          height={h}
          fill={up ? colors.chart.volumeUp : colors.chart.volumeDown}
        />,
      );
    }
    return out;
  }, [candles, from, to, width, height, offsetY]);

  return <G>{nodes}</G>;
}

export default VolumeLayer;
