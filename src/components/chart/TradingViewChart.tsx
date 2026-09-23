import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Text, Platform } from 'react-native';
import Svg, { Rect, Line, G, Text as SvgText } from 'react-native-svg';
import { useChartStore } from '../../store/chartStore';
import { colors } from '../../theme';
import { formatPrice, formatCandleTime } from '../../utils/format';

/**
 * TradingView-style chart - professional look
 * - Right price scale (60px) with current price highlight
 * - Bottom time scale (24px)
 * - Top OHLC legend
 * - Grid, crosshair with axis labels
 * - Volume with TradingView colors
 */

const PRICE_SCALE_WIDTH = 60;
const TIME_SCALE_HEIGHT = 24;
const VOLUME_HEIGHT_RATIO = 0.15;

export function TradingViewChart() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const dragRef = useRef<{ x: number; from: number; to: number } | null>(null);

  const candles = useChartStore((s) => s.candles);
  const viewport = useChartStore((s) => s.viewport);
  const quote = useChartStore((s) => s.quote);
  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);
  const crosshairIndex = useChartStore((s) => s.crosshairIndex);
  const setViewport = useChartStore((s) => s.setViewport);
  const setCrosshairIndex = useChartStore((s) => s.setCrosshairIndex);
  const zoom = useChartStore((s) => s.zoom);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const chartWidth = Math.max(0, size.width - PRICE_SCALE_WIDTH);
  const volumeHeight = size.height * VOLUME_HEIGHT_RATIO;
  const pricePaneHeight = size.height - TIME_SCALE_HEIGHT - volumeHeight;
  const timePaneY = pricePaneHeight + volumeHeight;

  const indexAtX = useCallback((x: number) => {
    const bars = Math.max(1, viewport.to - viewport.from);
    const ratio = x / Math.max(1, chartWidth);
    const idx = Math.round(viewport.from + ratio * bars);
    return Math.max(0, Math.min(candles.length - 1, idx));
  }, [viewport, chartWidth, candles.length]);

  const onWheel = useCallback((e: any) => {
    const dy = e.nativeEvent?.deltaY ?? e.deltaY ?? 0;
    if (!dy) return;
    e.preventDefault?.();
    const factor = dy > 0 ? 1.15 : 0.85;
    zoom(factor, 0.5);
  }, [zoom]);

  const onMouseDown = useCallback((e: any) => {
    const x = e.nativeEvent?.locationX ?? e.nativeEvent?.clientX ?? 0;
    dragRef.current = { x, from: viewport.from, to: viewport.to };
  }, [viewport.from, viewport.to]);

  const onMouseMove = useCallback((e: any) => {
    const x = e.nativeEvent?.locationX ?? e.nativeEvent?.clientX ?? 0;
    if (chartWidth > 0) setCrosshairIndex(indexAtX(x));
    const drag = dragRef.current;
    if (!drag) return;
    const bars = Math.max(1, drag.to - drag.from);
    const barWidth = chartWidth / bars;
    const deltaBars = Math.round((drag.x - x) / barWidth);
    if (deltaBars === 0) return;
    let from = drag.from + deltaBars;
    let to = drag.to + deltaBars;
    if (from < 0) { from = 0; to = bars; }
    if (to > candles.length - 1) { to = candles.length - 1; from = Math.max(0, to - bars); }
    setViewport({ from, to });
  }, [chartWidth, candles.length, indexAtX, setCrosshairIndex, setViewport]);

  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  if (size.width === 0 || size.height === 0) {
    return <View style={styles.container} onLayout={onLayout} />;
  }

  const lastCandle = candles[candles.length - 1];
  const crossCandle = crosshairIndex != null ? candles[crosshairIndex] : null;
  const displayCandle = crossCandle || lastCandle;
  const currentPrice = quote?.price ?? lastCandle?.close ?? 0;
  const prevClose = candles[candles.length - 2]?.close ?? lastCandle?.open ?? currentPrice;
  const isUp = currentPrice >= prevClose;
  const priceColor = isUp ? '#089981' : '#F23645';

  const range = viewport.priceMax - viewport.priceMin || 1;
  const yOf = (price: number) => pricePaneHeight - ((price - viewport.priceMin) / range) * pricePaneHeight;

  // Price scale labels - 8 levels
  const priceLabels = [];
  for (let i = 0; i <= 7; i++) {
    const ratio = i / 7;
    const price = viewport.priceMin + ratio * range;
    const y = pricePaneHeight - ratio * pricePaneHeight;
    priceLabels.push({ price, y });
  }

  // Time labels - every N bars
  const timeLabels = [];
  const bars = viewport.to - viewport.from;
  const step = Math.max(1, Math.floor(bars / 6));
  for (let i = Math.floor(viewport.from); i <= Math.ceil(viewport.to); i += step) {
    const c = candles[i];
    if (!c) continue;
    const x = ((i - viewport.from) / Math.max(1, bars)) * chartWidth;
    timeLabels.push({ time: c.time, x, index: i });
  }

  const webHandlers = Platform.OS === 'web' ? {
    onWheel, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp,
  } : {};

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* OHLC Legend - TradingView style top left */}
      <View style={styles.ohlcLegend}>
        <Text style={styles.symbolLegend}>{symbol} · {timeframe}</Text>
        {displayCandle && (
          <Text style={styles.ohlcText}>
            <Text style={styles.ohlcLabel}>O</Text><Text style={[styles.ohlcValue, { color: displayCandle.close >= displayCandle.open ? '#089981' : '#F23645' }]}>{formatPrice(displayCandle.open, symbol)} </Text>
            <Text style={styles.ohlcLabel}>H</Text><Text style={styles.ohlcValue}>{formatPrice(displayCandle.high, symbol)} </Text>
            <Text style={styles.ohlcLabel}>L</Text><Text style={styles.ohlcValue}>{formatPrice(displayCandle.low, symbol)} </Text>
            <Text style={styles.ohlcLabel}>C</Text><Text style={[styles.ohlcValue, { color: displayCandle.close >= displayCandle.open ? '#089981' : '#F23645' }]}>{formatPrice(displayCandle.close, symbol)}</Text>
          </Text>
        )}
      </View>

      <View style={{ flex: 1, cursor: Platform.OS === 'web' ? 'crosshair' : undefined } as any} {...webHandlers}>
        <Svg width={size.width} height={size.height}>
          {/* Background */}
          <Rect x={0} y={0} width={size.width} height={size.height} fill="#131722" />

          {/* Grid - vertical */}
          {timeLabels.map((t, idx) => (
            <Line key={`vg${idx}`} x1={t.x} y1={0} x2={t.x} y2={pricePaneHeight} stroke="#1E222D" strokeWidth={1} opacity={0.6} />
          ))}
          {/* Grid - horizontal */}
          {priceLabels.map((p, idx) => (
            <Line key={`hg${idx}`} x1={0} y1={p.y} x2={chartWidth} y2={p.y} stroke="#1E222D" strokeWidth={1} opacity={0.6} />
          ))}

          {/* Candles - TradingView style */}
          {(() => {
            const barsCount = Math.max(1, viewport.to - viewport.from);
            const slot = chartWidth / barsCount;
            const bodyWidth = Math.max(1, Math.min(12, slot * 0.7));
            const elements: React.ReactNode[] = [];
            for (let i = Math.floor(viewport.from); i <= Math.ceil(viewport.to); i++) {
              const c = candles[i];
              if (!c) continue;
              const x = (i - viewport.from) * slot + slot / 2;
              const up = c.close >= c.open;
              const color = up ? '#089981' : '#F23645';
              const yHigh = yOf(c.high);
              const yLow = yOf(c.low);
              const yOpen = yOf(c.open);
              const yClose = yOf(c.close);
              const bodyTop = Math.min(yOpen, yClose);
              const bodyH = Math.max(1, Math.abs(yClose - yOpen));

              // Wick
              elements.push(<Line key={`w${i}`} x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={1} />);
              // Body - filled for down, hollow with border for up (TradingView style) - simplified to filled both
              if (up) {
                elements.push(<Rect key={`b${i}`} x={x - bodyWidth/2} y={bodyTop} width={bodyWidth} height={bodyH} fill={color} stroke={color} strokeWidth={1} />);
              } else {
                elements.push(<Rect key={`b${i}`} x={x - bodyWidth/2} y={bodyTop} width={bodyWidth} height={bodyH} fill={color} />);
              }
            }
            return elements;
          })()}

          {/* Volume */}
          {(() => {
            const barsCount = Math.max(1, viewport.to - viewport.from);
            const slot = chartWidth / barsCount;
            const bodyWidth = Math.max(1, Math.min(12, slot * 0.7));
            const maxVol = Math.max(...candles.slice(Math.floor(viewport.from), Math.ceil(viewport.to)).map(c => c.volume || 0), 1);
            const elements: React.ReactNode[] = [];
            for (let i = Math.floor(viewport.from); i <= Math.ceil(viewport.to); i++) {
              const c = candles[i];
              if (!c) continue;
              const x = (i - viewport.from) * slot + slot / 2;
              const up = c.close >= c.open;
              const vol = c.volume || 0;
              const h = (vol / maxVol) * (volumeHeight - 4);
              const y = pricePaneHeight + volumeHeight - h;
              elements.push(<Rect key={`v${i}`} x={x - bodyWidth/2} y={y} width={bodyWidth} height={h} fill={up ? 'rgba(8, 153, 129, 0.5)' : 'rgba(242, 54, 69, 0.5)'} />);
            }
            return <G>{elements}</G>;
          })()}

          {/* Price scale background */}
          <Rect x={chartWidth} y={0} width={PRICE_SCALE_WIDTH} height={pricePaneHeight} fill="#131722" />
          <Line x1={chartWidth} y1={0} x2={chartWidth} y2={size.height} stroke="#2A2E39" strokeWidth={1} />

          {/* Price labels on right scale */}
          {priceLabels.map((p, idx) => (
            <G key={`pl${idx}`}>
              <SvgText x={chartWidth + 4} y={p.y + 4} fill="#868993" fontSize={11} fontFamily="monospace">{formatPrice(p.price, symbol)}</SvgText>
            </G>
          ))}

          {/* Current price label - TradingView style with colored background */}
          {lastCandle && (
            <G>
              <Rect x={chartWidth} y={yOf(currentPrice) - 12} width={PRICE_SCALE_WIDTH} height={24} fill={priceColor} />
              <SvgText x={chartWidth + 4} y={yOf(currentPrice) + 4} fill="white" fontSize={11} fontWeight="bold" fontFamily="monospace">{formatPrice(currentPrice, symbol)}</SvgText>
            </G>
          )}

          {/* Time scale background */}
          <Rect x={0} y={timePaneY} width={size.width} height={TIME_SCALE_HEIGHT} fill="#131722" />
          <Line x1={0} y1={timePaneY} x2={size.width} y2={timePaneY} stroke="#2A2E39" strokeWidth={1} />

          {/* Time labels */}
          {timeLabels.map((t, idx) => (
            <SvgText key={`tl${idx}`} x={t.x - 20} y={timePaneY + 16} fill="#868993" fontSize={10}>{formatCandleTime(t.time, timeframe)}</SvgText>
          ))}

          {/* Crosshair */}
          {crosshairIndex != null && crossCandle && (() => {
            const barsCount = Math.max(1, viewport.to - viewport.from);
            const slot = chartWidth / barsCount;
            const x = (crosshairIndex - viewport.from) * slot + slot / 2;
            const y = yOf(crossCandle.close);
            return (
              <G>
                <Line x1={x} y1={0} x2={x} y2={pricePaneHeight} stroke="#758696" strokeWidth={1} strokeDasharray="4 4" opacity={0.8} />
                <Line x1={0} y1={y} x2={chartWidth} y2={y} stroke="#758696" strokeWidth={1} strokeDasharray="4 4" opacity={0.8} />
                {/* Crosshair price label */}
                <Rect x={chartWidth} y={y - 12} width={PRICE_SCALE_WIDTH} height={24} fill="#758696" />
                <SvgText x={chartWidth + 4} y={y + 4} fill="white" fontSize={11} fontFamily="monospace">{formatPrice(crossCandle.close, symbol)}</SvgText>
                {/* Crosshair time label */}
                <Rect x={x - 30} y={timePaneY} width={60} height={TIME_SCALE_HEIGHT} fill="#758696" />
                <SvgText x={x - 20} y={timePaneY + 16} fill="white" fontSize={10}>{formatCandleTime(crossCandle.time, timeframe)}</SvgText>
              </G>
            );
          })()}

          {/* Border */}
          <Rect x={0} y={0} width={chartWidth} height={pricePaneHeight} fill="none" stroke="#2A2E39" strokeWidth={1} />
        </Svg>
      </View>

      {/* Current price ticker at top right - TradingView style */}
      <View style={[styles.priceTicker, { backgroundColor: priceColor }]}>
        <Text style={styles.priceTickerText}>{formatPrice(currentPrice, symbol)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#131722', overflow: 'hidden' },
  ohlcLegend: {
    position: 'absolute',
    top: 8,
    left: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  symbolLegend: { color: '#D1D4DC', fontSize: 14, fontWeight: '700' },
  ohlcText: { flexDirection: 'row', gap: 6 },
  ohlcLabel: { color: '#868993', fontSize: 11 },
  ohlcValue: { color: '#D1D4DC', fontSize: 11, fontFamily: 'monospace' },
  priceTicker: {
    position: 'absolute',
    top: 40,
    right: 70,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priceTickerText: { color: 'white', fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
});

export default TradingViewChart;
