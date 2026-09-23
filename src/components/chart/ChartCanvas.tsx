import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  LayoutChangeEvent,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import Svg, { Rect, Line, G, Text as SvgText } from 'react-native-svg';
import { GestureDetector } from 'react-native-gesture-handler';
import { useChartStore } from '../../store/chartStore';
import { useChartGestures } from '../../hooks/useChartGestures';
import { CandleLayer } from './CandleLayer';
import { PlotLayer } from './PlotLayer';
import { VolumeLayer } from './VolumeLayer';
import { CrosshairLayer } from './CrosshairLayer';
import { MarkerLayer } from './MarkerLayer';
import { colors, theme } from '../../theme';
import { formatPrice } from '../../utils/format';

/**
 * Main interactive chart surface.
 * Layout:
 *  ┌─────────────────────────────┐
 *  │  price pane (candles+plots) │  ~75%
 *  │  volume                     │  ~15%
 *  │  indicator panes (optional) │  remaining
 *  └─────────────────────────────┘
 */
export function ChartCanvas() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const dragRef = useRef<{ x: number; from: number; to: number } | null>(null);

  const candles = useChartStore((s) => s.candles);
  const viewport = useChartStore((s) => s.viewport);
  const chartType = useChartStore((s) => s.chartType);
  const plots = useChartStore((s) => s.plots);
  const hlines = useChartStore((s) => s.hlines);
  const markers = useChartStore((s) => s.markers);
  const crosshairIndex = useChartStore((s) => s.crosshairIndex);
  const loading = useChartStore((s) => s.loading);
  const error = useChartStore((s) => s.error);
  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);
  const zoom = useChartStore((s) => s.zoom);
  const setViewport = useChartStore((s) => s.setViewport);
  const setCrosshairIndex = useChartStore((s) => s.setCrosshairIndex);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const gesture = useChartGestures(size.width);

  // --- Web mouse / wheel helpers -------------------------------------------
  const indexAtX = useCallback(
    (x: number) => {
      const bars = Math.max(1, viewport.to - viewport.from);
      const ratio = x / Math.max(1, size.width);
      const idx = Math.round(viewport.from + ratio * bars);
      return Math.max(0, Math.min(candles.length - 1, idx));
    },
    [viewport, size.width, candles.length],
  );

  const onWheel = useCallback(
    (e: { nativeEvent?: { deltaY?: number; clientX?: number }; deltaY?: number; preventDefault?: () => void }) => {
      const dy = e.nativeEvent?.deltaY ?? e.deltaY ?? 0;
      if (!dy) return;
      e.preventDefault?.();
      // scroll up → zoom in
      const factor = dy > 0 ? 1.15 : 0.85;
      zoom(factor, 0.5);
    },
    [zoom],
  );

  const onMouseDown = useCallback(
    (e: { nativeEvent?: { pageX?: number; clientX?: number; locationX?: number } }) => {
      const x =
        e.nativeEvent?.locationX ??
        e.nativeEvent?.clientX ??
        e.nativeEvent?.pageX ??
        0;
      dragRef.current = { x, from: viewport.from, to: viewport.to };
    },
    [viewport.from, viewport.to],
  );

  const onMouseMove = useCallback(
    (e: { nativeEvent?: { pageX?: number; clientX?: number; locationX?: number; buttons?: number } }) => {
      const x =
        e.nativeEvent?.locationX ??
        e.nativeEvent?.clientX ??
        e.nativeEvent?.pageX ??
        0;
      // Crosshair follow
      if (size.width > 0) setCrosshairIndex(indexAtX(x));

      const drag = dragRef.current;
      if (!drag) return;
      const bars = Math.max(1, drag.to - drag.from);
      const barWidth = size.width / bars;
      const deltaBars = Math.round((drag.x - x) / barWidth);
      if (deltaBars === 0) return;
      let from = drag.from + deltaBars;
      let to = drag.to + deltaBars;
      if (from < 0) {
        from = 0;
        to = bars;
      }
      if (to > candles.length - 1) {
        to = candles.length - 1;
        from = Math.max(0, to - bars);
      }
      setViewport({ from, to });
    },
    [size.width, candles.length, indexAtX, setCrosshairIndex, setViewport],
  );

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const panePlots = plots.filter((p) => p.paneId);
  const paneIds = [...new Set(panePlots.map((p) => p.paneId!))];
  const extraPanes = paneIds.length;
  const volRatio = theme.chart.volumeHeightRatio;
  const priceRatio = Math.max(0.45, 0.75 - extraPanes * 0.15);
  const indicatorRatio = extraPanes > 0 ? (1 - priceRatio - volRatio) / extraPanes : 0;

  const priceH = size.height * priceRatio;
  const volH = size.height * volRatio;
  const indH = size.height * indicatorRatio;

  const priceLabels = buildPriceLabels(viewport.priceMin, viewport.priceMax, 6);

  const webHandlers =
    Platform.OS === 'web'
      ? {
          // RN-web maps these onto the DOM node
          onWheel,
          onMouseDown,
          onMouseMove,
          onMouseUp,
          onMouseLeave: onMouseUp,
        }
      : {};

  return (
    <View style={styles.container} onLayout={onLayout}>
      {loading && candles.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.blue} size="large" />
          <Text style={styles.hint}>Loading candles…</Text>
        </View>
      ) : error && candles.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : size.width > 0 && size.height > 0 ? (
        <GestureDetector gesture={gesture}>
          <View
            style={{ flex: 1, cursor: Platform.OS === 'web' ? 'crosshair' : undefined } as object}
            {...webHandlers}
          >
            <Svg width={size.width} height={size.height}>
              <Rect x={0} y={0} width={size.width} height={size.height} fill={colors.bg.secondary} />

              <G>
                {priceLabels.map((p) => {
                  const range = viewport.priceMax - viewport.priceMin || 1;
                  const y = priceH - ((p - viewport.priceMin) / range) * priceH;
                  return (
                    <G key={`g${p}`}>
                      <Line
                        x1={0}
                        y1={y}
                        x2={size.width}
                        y2={y}
                        stroke={colors.chart.grid}
                        strokeWidth={1}
                      />
                      <SvgText
                        x={size.width - 6}
                        y={y - 3}
                        fill={colors.text.muted}
                        fontSize={10}
                        textAnchor="end"
                      >
                        {formatPrice(p, symbol)}
                      </SvgText>
                    </G>
                  );
                })}
              </G>

              <CandleLayer
                candles={candles}
                from={viewport.from}
                to={viewport.to}
                width={size.width}
                height={priceH}
                priceMin={viewport.priceMin}
                priceMax={viewport.priceMax}
                chartType={chartType}
              />
              <PlotLayer
                plots={plots}
                hlines={hlines}
                from={viewport.from}
                to={viewport.to}
                width={size.width}
                height={priceH}
                priceMin={viewport.priceMin}
                priceMax={viewport.priceMax}
                overlayOnly
              />
              <MarkerLayer
                markers={markers}
                candles={candles}
                from={viewport.from}
                to={viewport.to}
                width={size.width}
                height={priceH}
                priceMin={viewport.priceMin}
                priceMax={viewport.priceMax}
              />

              <VolumeLayer
                candles={candles}
                from={viewport.from}
                to={viewport.to}
                width={size.width}
                height={volH}
                offsetY={priceH}
              />

              <Line
                x1={0}
                y1={priceH}
                x2={size.width}
                y2={priceH}
                stroke={colors.border.default}
                strokeWidth={1}
              />

              {paneIds.map((pid, idx) => {
                const y0 = priceH + volH + idx * indH;
                const paneSeries = panePlots.filter((p) => p.paneId === pid);
                const { min, max } = extent(paneSeries, viewport.from, viewport.to);
                return (
                  <G key={pid} transform={`translate(0, ${y0})`}>
                    <Line
                      x1={0}
                      y1={0}
                      x2={size.width}
                      y2={0}
                      stroke={colors.border.default}
                      strokeWidth={1}
                    />
                    <SvgText x={8} y={14} fill={colors.text.muted} fontSize={10}>
                      {pid.toUpperCase()}
                    </SvgText>
                    <PlotLayer
                      plots={plots}
                      hlines={[]}
                      from={viewport.from}
                      to={viewport.to}
                      width={size.width}
                      height={indH - 4}
                      priceMin={min}
                      priceMax={max}
                      paneId={pid}
                      overlayOnly={false}
                    />
                  </G>
                );
              })}

              <CrosshairLayer
                index={crosshairIndex}
                candles={candles}
                from={viewport.from}
                to={viewport.to}
                width={size.width}
                height={priceH}
                priceMin={viewport.priceMin}
                priceMax={viewport.priceMax}
                symbol={symbol}
                timeframe={timeframe}
              />
            </Svg>
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

function buildPriceLabels(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

function extent(plots: { values: (number | null)[] }[], from: number, to: number) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of plots) {
    for (let i = Math.floor(from); i <= Math.ceil(to); i++) {
      const v = p.values[i];
      if (v == null || !Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min)) {
    min = 0;
    max = 1;
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.1;
  return { min: min - pad, max: max + pad };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hint: { color: colors.text.muted, fontSize: 13 },
  error: { color: colors.status.error, fontSize: 13, paddingHorizontal: 24, textAlign: 'center' },
});

export default ChartCanvas;
