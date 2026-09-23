import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChartStore } from '../../store/chartStore';
import { INSTRUMENTS, TIMEFRAMES } from '../../constants/instruments';
import { colors, spacing, radius } from '../../theme';
import { formatPrice, formatPct } from '../../utils/format';
import type { ChartType, SymbolId, Timeframe } from '../../types';

interface Props {
  onOpenEditor: () => void;
  onReload: () => void;
  isMock?: boolean;
}

export function ChartToolbar({ onOpenEditor, onReload, isMock }: Props) {
  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);
  const chartType = useChartStore((s) => s.chartType);
  const quote = useChartStore((s) => s.quote);
  const candles = useChartStore((s) => s.candles);
  const connectionStatus = useChartStore((s) => s.connectionStatus);
  const setSymbol = useChartStore((s) => s.setSymbol);
  const setTimeframe = useChartStore((s) => s.setTimeframe);
  const setChartType = useChartStore((s) => s.setChartType);
  const resetViewport = useChartStore((s) => s.resetViewport);
  const zoom = useChartStore((s) => s.zoom);

  const [symbolOpen, setSymbolOpen] = useState(false);
  const [tfOpen, setTfOpen] = useState(false);

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const price = quote?.price ?? last?.close ?? 0;
  const changeFrom = prev?.close ?? last?.open ?? price;
  const up = price >= changeFrom;
  const pct = formatPct(changeFrom, price);

  const statusColor =
    connectionStatus === 'live'
      ? colors.status.success
      : connectionStatus === 'polling'
        ? colors.status.warning
        : connectionStatus === 'error' || connectionStatus === 'offline'
          ? colors.status.error
          : colors.text.muted;

  return (
    <View style={styles.wrap}>
      {/* Row 1: symbol + price */}
      <View style={styles.row}>
        <TouchableOpacity style={styles.symbolBtn} onPress={() => setSymbolOpen(true)}>
          <Text style={styles.symbolText}>{symbol}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
        </TouchableOpacity>

        <View style={styles.priceBlock}>
          <Text style={[styles.price, { color: up ? colors.candle.up : colors.candle.down }]}>
            {price ? formatPrice(price, symbol) : '—'}
          </Text>
          <Text style={[styles.pct, { color: up ? colors.candle.up : colors.candle.down }]}>
            {pct}
          </Text>
        </View>

        <View style={styles.rightActions}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          {isMock ? <Text style={styles.mockBadge}>DEMO</Text> : null}
          <TouchableOpacity onPress={onReload} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="refresh" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenEditor} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="code-slash" size={18} color={colors.accent.blue} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Row 2: timeframes + chart type + zoom */}
      <View style={styles.row2}>
        <TouchableOpacity style={styles.tfPill} onPress={() => setTfOpen(true)}>
          <Text style={styles.tfText}>
            {TIMEFRAMES.find((t) => t.value === timeframe)?.label ?? timeframe}
          </Text>
          <Ionicons name="chevron-down" size={12} color={colors.text.muted} />
        </TouchableOpacity>

        <View style={styles.tfScroll}>
          {TIMEFRAMES.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setTimeframe(t.value)}
              style={[styles.tfChip, timeframe === t.value && styles.tfChipActive]}
            >
              <Text
                style={[styles.tfChipText, timeframe === t.value && styles.tfChipTextActive]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tools}>
          {(['candlestick', 'line'] as ChartType[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setChartType(t)}
              style={[styles.toolBtn, chartType === t && styles.toolBtnActive]}
            >
              <Ionicons
                name={t === 'candlestick' ? 'bar-chart' : 'trending-up'}
                size={14}
                color={chartType === t ? colors.accent.blue : colors.text.muted}
              />
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => zoom(0.8)} style={styles.toolBtn}>
            <Ionicons name="add" size={16} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => zoom(1.25)} style={styles.toolBtn}>
            <Ionicons name="remove" size={16} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={resetViewport} style={styles.toolBtn}>
            <Ionicons name="scan" size={14} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Symbol picker */}
      <Modal visible={symbolOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSymbolOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Instrument</Text>
            <FlatList
              data={INSTRUMENTS}
              keyExtractor={(item) => item.symbol}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, item.symbol === symbol && styles.listItemActive]}
                  onPress={() => {
                    setSymbol(item.symbol as SymbolId);
                    setSymbolOpen(false);
                  }}
                >
                  <View>
                    <Text style={styles.listSymbol}>{item.symbol}</Text>
                    <Text style={styles.listName}>{item.name}</Text>
                  </View>
                  <Text style={styles.listCat}>{item.category}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* TF picker (compact alternative for small screens) */}
      <Modal visible={tfOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setTfOpen(false)}>
          <View style={[styles.modalCard, { maxHeight: 360 }]}>
            <Text style={styles.modalTitle}>Timeframe</Text>
            {TIMEFRAMES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.listItem, t.value === timeframe && styles.listItemActive]}
                onPress={() => {
                  setTimeframe(t.value as Timeframe);
                  setTfOpen(false);
                }}
              >
                <Text style={styles.listSymbol}>{t.label}</Text>
                <Text style={styles.listName}>{t.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  symbolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.tertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  symbolText: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  priceBlock: { flex: 1 },
  price: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pct: { fontSize: 12, fontWeight: '600' },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { padding: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  mockBadge: {
    color: colors.status.warning,
    fontSize: 10,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.status.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  row2: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tfPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.sm,
  },
  tfText: { color: colors.text.primary, fontSize: 12, fontWeight: '600' },
  tfScroll: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tfChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  tfChipActive: { backgroundColor: colors.bg.elevated },
  tfChipText: { color: colors.text.muted, fontSize: 11, fontWeight: '600' },
  tfChipTextActive: { color: colors.accent.blue },
  tools: { flexDirection: 'row', gap: 2 },
  toolBtn: { padding: 6, borderRadius: radius.sm },
  toolBtnActive: { backgroundColor: colors.bg.elevated },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    maxHeight: '70%',
    padding: spacing.md,
  },
  modalTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  listItemActive: { backgroundColor: colors.bg.elevated },
  listSymbol: { color: colors.text.primary, fontWeight: '700', fontSize: 14 },
  listName: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  listCat: { color: colors.text.muted, fontSize: 11, textTransform: 'uppercase' },
});

export default ChartToolbar;
