import React, { useCallback, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { useChartStore } from '../../store/chartStore';
import { formatCandleTime, formatPrice } from '../../utils/format';

const PRICE_SCALE_WIDTH = 72;
const TIME_SCALE_HEIGHT = 24;
const MIN_PRICE_PANE_HEIGHT = 60;

type Point = { x: number; y: number };
type Interaction =
  | { kind: 'pan'; x: number; from: number; to: number }
  | {
      kind: 'price';
      y: number;
      range: number;
      min: number;
      max: number;
      anchorRatio: number;
      anchorPrice: number;
    }
  | { kind: 'pinch'; distance: number; anchor: number };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Interactive TradingView-inspired chart with draggable and zoomable price scale. */
export function TradingViewChart() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const interactionRef = useRef<Interaction | null>(null);
  const suppressMouseUntilRef = useRef(0);

  const candles = useChartStore((s) => s.candles);
  const viewport = useChartStore((s) => s.viewport);
  const quote = useChartStore((s) => s.quote);
  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);
  const crosshairIndex = useChartStore((s) => s.crosshairIndex);
  const setViewport = useChartStore((s) => s.setViewport);
  const setCrosshairIndex = useChartStore((s) => s.setCrosshairIndex);
  const zoom = useChartStore((s) => s.zoom);
  const resetPriceScale = useChartStore((s) => s.resetPriceScale);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const chartWidth = Math.max(1, size.width - PRICE_SCALE_WIDTH);
  const timePaneY = Math.max(0, size.height - TIME_SCALE_HEIGHT);
  const volumeHeight = Math.max(0, Math.min(size.height * 0.16, timePaneY - MIN_PRICE_PANE_HEIGHT));
  const pricePaneHeight = Math.max(1, timePaneY - volumeHeight);
  const visibleBars = Math.max(1, viewport.to - viewport.from + 1);

  const pointFromEvent = useCallback((event: any, touch?: any): Point => {
    const native = event?.nativeEvent ?? event ?? {};
    const source = touch ?? native;
    const target = event?.currentTarget;
    const rect = typeof target?.getBoundingClientRect === 'function'
      ? target.getBoundingClientRect()
      : null;

    let x = source.locationX ?? source.offsetX ?? native.locationX ?? native.offsetX ?? 0;
    let y = source.locationY ?? source.offsetY ?? native.locationY ?? native.offsetY ?? 0;
    const clientX = source.clientX ?? native.clientX;
    const clientY = source.clientY ?? native.clientY;
    if (rect && typeof clientX === 'number') x = clientX - rect.left;
    if (rect && typeof clientY === 'number') y = clientY - rect.top;
    return { x, y };
  }, []);

  const getTouches = (event: any): any[] => {
    const touches = event?.nativeEvent?.touches ?? event?.touches;
    return touches ? Array.from(touches as ArrayLike<any>) : [];
  };

  const zoomPrice = useCallback((factor: number, anchorRatio = 0.5) => {
    const { priceMin, priceMax } = useChartStore.getState().viewport;
    const oldRange = Math.max(priceMax - priceMin, 1e-12);
    const anchor = clamp(anchorRatio, 0, 1);
    const anchorPrice = priceMax - anchor * oldRange;
    const nextRange = Math.max(oldRange * factor, Math.max(Math.abs(anchorPrice) * 1e-9, 1e-10));
    const nextMax = anchorPrice + anchor * nextRange;
    setViewport({ priceMin: nextMax - nextRange, priceMax: nextMax });
  }, [setViewport]);

  const indexAtX = useCallback((x: number) => {
    const index = Math.round(viewport.from + clamp(x / chartWidth, 0, 1) * visibleBars - 0.5);
    return clamp(index, 0, Math.max(0, candles.length - 1));
  }, [chartWidth, viewport.from, visibleBars, candles.length]);

  const beginInteraction = useCallback((event: any) => {
    const touches = getTouches(event);
    const point = pointFromEvent(event, touches[0]);

    if (touches.length >= 2) {
      const a = pointFromEvent(event, touches[0]);
      const b = pointFromEvent(event, touches[1]);
      const centerX = (a.x + b.x) / 2;
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      interactionRef.current = { kind: 'pinch', distance, anchor: clamp(centerX / chartWidth, 0, 1) };
      return;
    }

    if (point.x >= chartWidth && point.y < pricePaneHeight) {
      const range = Math.max(viewport.priceMax - viewport.priceMin, 1e-12);
      const anchorRatio = clamp(point.y / pricePaneHeight, 0, 1);
      interactionRef.current = {
        kind: 'price',
        y: point.y,
        range,
        min: viewport.priceMin,
        max: viewport.priceMax,
        anchorRatio,
        anchorPrice: viewport.priceMax - anchorRatio * range,
      };
      return;
    }

    if (point.x < chartWidth && point.y < timePaneY) {
      interactionRef.current = { kind: 'pan', x: point.x, from: viewport.from, to: viewport.to };
      setCrosshairIndex(indexAtX(point.x));
    }
  }, [chartWidth, pricePaneHeight, timePaneY, viewport.priceMin, viewport.priceMax, viewport.from, viewport.to, pointFromEvent, indexAtX, setCrosshairIndex]);

  const moveInteraction = useCallback((event: any) => {
    const touches = getTouches(event);

    // A second touch starts pinch-to-zoom. Spreading fingers zooms in; pinching zooms out.
    if (touches.length >= 2) {
      const a = pointFromEvent(event, touches[0]);
      const b = pointFromEvent(event, touches[1]);
      const centerX = (a.x + b.x) / 2;
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const previous = interactionRef.current;
      if (previous?.kind !== 'pinch') {
        interactionRef.current = { kind: 'pinch', distance, anchor: clamp(centerX / chartWidth, 0, 1) };
      } else {
        const factor = clamp(previous.distance / distance, 0.75, 1.35);
        if (Math.abs(factor - 1) > 0.005) zoom(factor, previous.anchor);
        interactionRef.current = { ...previous, distance };
      }
      return;
    }

    const current = interactionRef.current;
    if (current?.kind === 'pinch') {
      interactionRef.current = null;
      return;
    }

    const point = pointFromEvent(event, touches[0]);
    if (!current) {
      if (point.x < chartWidth && point.y < pricePaneHeight) {
        setCrosshairIndex(indexAtX(point.x));
      } else {
        setCrosshairIndex(null);
      }
      return;
    }

    if (current.kind === 'price') {
      const deltaY = point.y - current.y;
      // Dragging the scale down expands the range; dragging up zooms in.
      const nextRange = Math.max(
        current.range * Math.exp(clamp(deltaY / 150, -6, 6)),
        Math.max(Math.abs(current.anchorPrice) * 1e-9, 1e-10),
      );
      const nextMax = current.anchorPrice + current.anchorRatio * nextRange;
      setViewport({ priceMin: nextMax - nextRange, priceMax: nextMax });
      return;
    }

    if (current.kind === 'pan') {
      const deltaBars = ((current.x - point.x) / chartWidth) * visibleBars;
      const width = current.to - current.from;
      let from = current.from + deltaBars;
      let to = current.to + deltaBars;
      if (from < 0) {
        from = 0;
        to = Math.min(candles.length - 1, width);
      }
      if (to > candles.length - 1) {
        to = candles.length - 1;
        from = Math.max(0, to - width);
      }
      setViewport({ from, to });
      if (point.x < chartWidth && point.y < pricePaneHeight) {
        setCrosshairIndex(indexAtX(point.x));
      }
    }
  }, [chartWidth, visibleBars, candles.length, pricePaneHeight, pointFromEvent, setCrosshairIndex, indexAtX, setViewport, zoom]);

  const endInteraction = useCallback(() => {
    interactionRef.current = null;
  }, []);

  const onWheel = useCallback((event: any) => {
    const point = pointFromEvent(event);
    const native = event?.nativeEvent ?? event;
    const deltaY = native?.deltaY ?? 0;
    if (!deltaY) return;
    event?.preventDefault?.();
    if (point.x >= chartWidth && point.y < pricePaneHeight) {
      // Wheel over the right scale zooms the price axis, independently of time.
      const ratio = clamp(point.y / pricePaneHeight, 0, 1);
      zoomPrice(deltaY > 0 ? 1.12 : 0.89, ratio);
    } else {
      const anchor = clamp(point.x / chartWidth, 0, 1);
      zoom(deltaY > 0 ? 1.15 : 0.87, anchor);
    }
  }, [chartWidth, pricePaneHeight, pointFromEvent, zoomPrice, zoom]);

  const onMouseDown = useCallback((event: any) => {
    if (Date.now() < suppressMouseUntilRef.current) return;
    beginInteraction(event);
  }, [beginInteraction]);

  const onMouseMove = useCallback((event: any) => {
    if (interactionRef.current) moveInteraction(event);
    else moveInteraction(event);
  }, [moveInteraction]);

  const onTouchStart = useCallback((event: any) => {
    suppressMouseUntilRef.current = Date.now() + 700;
    beginInteraction(event);
  }, [beginInteraction]);

  const onTouchMove = useCallback((event: any) => {
    event?.preventDefault?.();
    moveInteraction(event);
  }, [moveInteraction]);

  const onLayoutProps = Platform.OS === 'web'
    ? {
        onWheel,
        onMouseDown,
        onMouseMove,
        onMouseUp: endInteraction,
        onMouseLeave: () => {
          endInteraction();
          setCrosshairIndex(null);
        },
        onTouchStart,
        onTouchMove,
        onTouchEnd: endInteraction,
        onTouchCancel: endInteraction,
        onDoubleClick: (event: any) => {
          const point = pointFromEvent(event);
          if (point.x >= chartWidth) resetPriceScale();
        },
      }
    : {
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: beginInteraction,
        onResponderMove: moveInteraction,
        onResponderRelease: endInteraction,
        onResponderTerminate: endInteraction,
        onResponderTerminationRequest: () => false,
      };

  if (size.width === 0 || size.height === 0) {
    return <View style={styles.container} onLayout={onLayout} />;
  }

  const lastCandle = candles[candles.length - 1];
  const crossCandle = crosshairIndex == null ? null : candles[crosshairIndex] ?? null;
  const displayCandle = crossCandle ?? lastCandle;
  const currentPrice = quote?.price ?? lastCandle?.close ?? 0;
  const previousClose = candles[candles.length - 2]?.close ?? lastCandle?.open ?? currentPrice;
  const currentColor = currentPrice >= previousClose ? '#089981' : '#F23645';
  const range = Math.max(viewport.priceMax - viewport.priceMin, 1e-12);
  const yOf = (price: number) => pricePaneHeight - ((price - viewport.priceMin) / range) * pricePaneHeight;

  const priceLabels = Array.from({ length: 8 }, (_, index) => {
    const ratio = index / 7;
    return {
      price: viewport.priceMin + ratio * range,
      y: pricePaneHeight - ratio * pricePaneHeight,
    };
  });

  const timeLabels: { time: number; x: number; index: number }[] = [];
  const step = Math.max(1, Math.floor(visibleBars / 6));
  for (let i = Math.max(0, Math.floor(viewport.from)); i <= Math.min(candles.length - 1, Math.ceil(viewport.to)); i += step) {
    const candle = candles[i];
    if (!candle) continue;
    const x = ((i - viewport.from + 0.5) / visibleBars) * chartWidth;
    timeLabels.push({ time: candle.time, x, index: i });
  }

  const visibleSlice = candles.slice(Math.max(0, Math.floor(viewport.from)), Math.min(candles.length, Math.ceil(viewport.to) + 1));
  const maxVolume = Math.max(1, ...visibleSlice.map((candle) => candle.volume || 0));

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View
        style={styles.canvasInteraction as any}
        {...(onLayoutProps as any)}
      >
        <Svg width={size.width} height={size.height}>
          <Rect x={0} y={0} width={size.width} height={size.height} fill="#131722" />

          {/* Subtle chart grid */}
          {timeLabels.map((label) => (
            <Line key={`vg-${label.index}`} x1={label.x} y1={0} x2={label.x} y2={pricePaneHeight} stroke="#1E222D" strokeWidth={1} />
          ))}
          {priceLabels.map((label, index) => (
            <Line key={`hg-${index}`} x1={0} y1={label.y} x2={chartWidth} y2={label.y} stroke="#1E222D" strokeWidth={1} />
          ))}

          {/* Candlesticks */}
          {(() => {
            const slot = chartWidth / visibleBars;
            const bodyWidth = Math.max(1, Math.min(12, slot * 0.68));
            const elements: React.ReactNode[] = [];
            for (let i = Math.max(0, Math.floor(viewport.from)); i <= Math.min(candles.length - 1, Math.ceil(viewport.to)); i++) {
              const candle = candles[i];
              if (!candle) continue;
              const x = (i - viewport.from + 0.5) * slot;
              const isUp = candle.close >= candle.open;
              const color = isUp ? '#089981' : '#F23645';
              const yHigh = yOf(candle.high);
              const yLow = yOf(candle.low);
              const yOpen = yOf(candle.open);
              const yClose = yOf(candle.close);
              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
              elements.push(<Line key={`wick-${i}`} x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={1} />);
              elements.push(<Rect key={`body-${i}`} x={x - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color} stroke={color} strokeWidth={0.5} />);
            }
            return elements;
          })()}

          {/* Volume bars */}
          {(() => {
            const slot = chartWidth / visibleBars;
            const bodyWidth = Math.max(1, Math.min(12, slot * 0.68));
            const elements: React.ReactNode[] = [];
            for (let i = Math.max(0, Math.floor(viewport.from)); i <= Math.min(candles.length - 1, Math.ceil(viewport.to)); i++) {
              const candle = candles[i];
              if (!candle) continue;
              const height = ((candle.volume || 0) / maxVolume) * Math.max(0, volumeHeight - 4);
              const x = (i - viewport.from + 0.5) * slot;
              const y = pricePaneHeight + volumeHeight - height;
              const fill = candle.close >= candle.open ? 'rgba(8, 153, 129, 0.48)' : 'rgba(242, 54, 69, 0.48)';
              elements.push(<Rect key={`volume-${i}`} x={x - bodyWidth / 2} y={y} width={bodyWidth} height={height} fill={fill} />);
            }
            return <G>{elements}</G>;
          })()}

          {/* Right-hand price scale */}
          <Rect x={chartWidth} y={0} width={PRICE_SCALE_WIDTH} height={pricePaneHeight} fill="#131722" />
          <Line x1={chartWidth} y1={0} x2={chartWidth} y2={size.height} stroke="#2A2E39" strokeWidth={1} />
          {priceLabels.map((label, index) => (
            <SvgText key={`price-${index}`} x={chartWidth + 4} y={label.y + 4} fill="#868993" fontSize={10} fontFamily="monospace">
              {formatPrice(label.price, symbol)}
            </SvgText>
          ))}

          {/* Current price marker on the scale */}
          {lastCandle && (() => {
            const y = clamp(yOf(currentPrice), 12, Math.max(12, pricePaneHeight - 12));
            return (
              <G>
                <Line x1={0} y1={y} x2={chartWidth} y2={y} stroke={currentColor} strokeWidth={1} strokeDasharray="3 3" opacity={0.8} />
                <Rect x={chartWidth} y={y - 12} width={PRICE_SCALE_WIDTH} height={24} fill={currentColor} />
                <SvgText x={chartWidth + 4} y={y + 4} fill="#FFFFFF" fontSize={10} fontWeight="bold" fontFamily="monospace">
                  {formatPrice(currentPrice, symbol)}
                </SvgText>
              </G>
            );
          })()}

          {/* Bottom time scale */}
          <Rect x={0} y={timePaneY} width={size.width} height={TIME_SCALE_HEIGHT} fill="#131722" />
          <Line x1={0} y1={timePaneY} x2={size.width} y2={timePaneY} stroke="#2A2E39" strokeWidth={1} />
          {timeLabels.map((label) => (
            <SvgText key={`time-${label.index}`} x={label.x - 22} y={timePaneY + 16} fill="#868993" fontSize={10}>
              {formatCandleTime(label.time, timeframe)}
            </SvgText>
          ))}

          {/* Crosshair with matching axis badges */}
          {crossCandle && crosshairIndex != null && (() => {
            const slot = chartWidth / visibleBars;
            const x = (crosshairIndex - viewport.from + 0.5) * slot;
            const y = clamp(yOf(crossCandle.close), 12, Math.max(12, pricePaneHeight - 12));
            return (
              <G>
                <Line x1={x} y1={0} x2={x} y2={timePaneY} stroke="#758696" strokeWidth={1} strokeDasharray="4 4" />
                <Line x1={0} y1={y} x2={chartWidth} y2={y} stroke="#758696" strokeWidth={1} strokeDasharray="4 4" />
                <Rect x={chartWidth} y={y - 12} width={PRICE_SCALE_WIDTH} height={24} fill="#758696" />
                <SvgText x={chartWidth + 4} y={y + 4} fill="#FFFFFF" fontSize={10} fontFamily="monospace">
                  {formatPrice(crossCandle.close, symbol)}
                </SvgText>
                <Rect x={clamp(x - 32, 0, Math.max(0, size.width - 64))} y={timePaneY} width={64} height={TIME_SCALE_HEIGHT} fill="#758696" />
                <SvgText x={clamp(x - 28, 4, Math.max(4, size.width - 60))} y={timePaneY + 16} fill="#FFFFFF" fontSize={9}>
                  {formatCandleTime(crossCandle.time, timeframe)}
                </SvgText>
              </G>
            );
          })()}

          <Rect x={0} y={0} width={chartWidth} height={pricePaneHeight} fill="none" stroke="#2A2E39" strokeWidth={1} />
        </Svg>
      </View>

      {/* OHLC readout */}
      <View pointerEvents="none" style={styles.ohlcLegend}>
        <Text style={styles.symbolLegend}>{symbol} · {timeframe}</Text>
        {displayCandle && (
          <View style={styles.ohlcRow}>
            <Text style={styles.ohlcPair}><Text style={styles.ohlcLabel}>O </Text><Text style={[styles.ohlcValue, { color: displayCandle.close >= displayCandle.open ? '#089981' : '#F23645' }]}>{formatPrice(displayCandle.open, symbol)}</Text></Text>
            <Text style={styles.ohlcPair}><Text style={styles.ohlcLabel}>H </Text><Text style={styles.ohlcValue}>{formatPrice(displayCandle.high, symbol)}</Text></Text>
            <Text style={styles.ohlcPair}><Text style={styles.ohlcLabel}>L </Text><Text style={styles.ohlcValue}>{formatPrice(displayCandle.low, symbol)}</Text></Text>
            <Text style={styles.ohlcPair}><Text style={styles.ohlcLabel}>C </Text><Text style={[styles.ohlcValue, { color: displayCandle.close >= displayCandle.open ? '#089981' : '#F23645' }]}>{formatPrice(displayCandle.close, symbol)}</Text></Text>
          </View>
        )}
      </View>

      {/* Direct axis controls: pinch/drag also work on the scale. */}
      <View style={styles.priceScaleControls}>
        <View style={styles.scaleButtonRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Zoom price scale in"
            onPress={() => zoomPrice(0.8)}
            style={styles.scaleButton}
          >
            <Ionicons name="add" size={14} color="#D1D4DC" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Zoom price scale out"
            onPress={() => zoomPrice(1.25)}
            style={styles.scaleButton}
          >
            <Ionicons name="remove" size={14} color="#D1D4DC" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Auto-fit price scale"
          onPress={resetPriceScale}
          style={styles.autoButton}
        >
          <Text style={styles.autoText}>AUTO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#131722', overflow: 'hidden' },
  canvasInteraction: {
    flex: 1,
    ...(Platform.OS === 'web' ? { cursor: 'crosshair', touchAction: 'none' } : {}),
  } as any,
  ohlcLegend: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: PRICE_SCALE_WIDTH + 6,
    zIndex: 5,
    gap: 3,
  },
  symbolLegend: { color: '#D1D4DC', fontSize: 13, fontWeight: '700' },
  ohlcRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 2 },
  ohlcPair: { color: '#D1D4DC', fontSize: 10, fontFamily: 'monospace' },
  ohlcLabel: { color: '#868993', fontSize: 10 },
  ohlcValue: { color: '#D1D4DC', fontSize: 10, fontFamily: 'monospace' },
  priceScaleControls: {
    position: 'absolute',
    top: 42,
    right: 3,
    zIndex: 10,
    width: PRICE_SCALE_WIDTH - 6,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    backgroundColor: 'rgba(19, 23, 34, 0.96)',
    borderRadius: 4,
  },
  scaleButtonRow: { flexDirection: 'row', gap: 3 },
  scaleButton: {
    width: 27,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2E39',
    borderRadius: 3,
  },
  autoButton: {
    width: 57,
    height: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2E39',
    borderRadius: 3,
  },
  autoText: { color: '#B2B5BE', fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
});

export default TradingViewChart;
