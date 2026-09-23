import { useMemo } from 'react';
import { Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useChartStore } from '../store/chartStore';

/**
 * Pinch-to-zoom + pan + crosshair for the chart canvas.
 * On web, also relies on ChartCanvas wheel/mouse handlers as a backup
 * because browser gesture support varies.
 */
export function useChartGestures(chartWidth: number) {
  const pan = useChartStore((s) => s.pan);
  const zoom = useChartStore((s) => s.zoom);
  const viewport = useChartStore((s) => s.viewport);
  const candles = useChartStore((s) => s.candles);
  const setCrosshairIndex = useChartStore((s) => s.setCrosshairIndex);

  return useMemo(() => {
    const barsVisible = Math.max(1, viewport.to - viewport.from);
    const barWidth = Math.max(1, chartWidth / barsVisible);

    const panGesture = Gesture.Pan()
      .minDistance(Platform.OS === 'web' ? 4 : 8)
      .onEnd((e) => {
        const deltaBars = Math.round(-e.translationX / barWidth);
        if (deltaBars !== 0) pan(deltaBars);
      });

    const pinchGesture = Gesture.Pinch().onEnd((e) => {
      // scale > 1 → zoom in (fewer bars)
      const factor = 1 / Math.max(0.1, e.scale);
      zoom(factor, 0.5);
    });

    const tapGesture = Gesture.Tap().onEnd((e) => {
      const ratio = e.x / Math.max(1, chartWidth);
      const idx = Math.round(viewport.from + ratio * barsVisible);
      const clamped = Math.max(0, Math.min(candles.length - 1, idx));
      setCrosshairIndex(clamped);
    });

    const longPress = Gesture.LongPress().onStart((e) => {
      const ratio = e.x / Math.max(1, chartWidth);
      const idx = Math.round(viewport.from + ratio * barsVisible);
      setCrosshairIndex(Math.max(0, Math.min(candles.length - 1, idx)));
    });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => setCrosshairIndex(null));

    return Gesture.Simultaneous(
      panGesture,
      pinchGesture,
      Gesture.Exclusive(doubleTap, tapGesture, longPress),
    );
  }, [chartWidth, viewport, candles.length, pan, zoom, setCrosshairIndex]);
}
