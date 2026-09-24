import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChartStore } from '../../store/chartStore';
import { INSTRUMENTS, TIMEFRAMES } from '../../constants/instruments';
import { formatPct, formatPrice } from '../../utils/format';
import type { SymbolId } from '../../types';

interface Props {
  onOpenEditor: () => void;
  onReload: () => void;
  isMock?: boolean;
}

export function TradingViewToolbar({ onOpenEditor, onReload, isMock }: Props) {
  const symbol = useChartStore((state) => state.symbol);
  const timeframe = useChartStore((state) => state.timeframe);
  const quote = useChartStore((state) => state.quote);
  const candles = useChartStore((state) => state.candles);
  const loading = useChartStore((state) => state.loading);
  const setSymbol = useChartStore((state) => state.setSymbol);
  const setTimeframe = useChartStore((state) => state.setTimeframe);
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const [symbolOpen, setSymbolOpen] = useState(false);

  const last = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const price = quote?.price ?? last?.close ?? 0;
  const changeFrom = previous?.close ?? last?.open ?? price;
  const isUp = price >= changeFrom;
  const priceColor = isUp ? '#089981' : '#F23645';
  const changeText = price ? formatPct(changeFrom, price) : '—';

  return (
    <View style={styles.wrap}>
      {/* Row one: symbol, live quote and actions. Kept separate from timeframes to avoid clipping on phones. */}
      <View style={styles.topRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Choose symbol, currently ${symbol}`}
          style={styles.symbolButton}
          onPress={() => setSymbolOpen(true)}
        >
          <Text numberOfLines={1} style={styles.symbolText}>{symbol}</Text>
          <Ionicons name="chevron-down" size={13} color="#A7AAB3" />
        </TouchableOpacity>

        {isMock && (
          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>DEMO</Text>
          </View>
        )}

        <View style={styles.quoteBlock}>
          {loading && <ActivityIndicator size="small" color="#2962FF" style={styles.loader} />}
          <View style={styles.quoteTextBlock}>
            <Text numberOfLines={1} style={[styles.priceText, { color: priceColor }]}>
              {price ? formatPrice(price, symbol) : '—'}
            </Text>
            <Text numberOfLines={1} style={[styles.changeText, { color: priceColor }]}>
              {changeText}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Refresh chart data"
            onPress={onReload}
            style={styles.actionButton}
          >
            <Ionicons name="refresh" size={16} color="#C8CAD1" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Pine script editor"
            onPress={onOpenEditor}
            style={[styles.pineButton, compact && styles.pineButtonCompact]}
          >
            <Ionicons name="code-slash" size={15} color="#8EA8FF" />
            {!compact && <Text style={styles.pineText}>Pine</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* All eight timeframes are visible in a clean, swipeable tab strip. */}
      <View style={styles.timeframeRow}>
        <ScrollView
          style={styles.timeframeScroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeframeContent}
          keyboardShouldPersistTaps="handled"
        >
          {TIMEFRAMES.map((item) => {
            const selected = timeframe === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${item.label} timeframe`}
                onPress={() => setTimeframe(item.value)}
                style={[styles.timeframeTab, selected && styles.timeframeTabSelected]}
              >
                <Text style={[styles.timeframeText, selected && styles.timeframeTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {loading && <ActivityIndicator size="small" color="#2962FF" style={styles.timeframeLoader} />}
      </View>

      <Modal
        visible={symbolOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSymbolOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSymbolOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select market</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close symbol search"
                onPress={() => setSymbolOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color="#A7AAB3" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={INSTRUMENTS}
              keyExtractor={(item) => item.symbol}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.symbol === symbol;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.marketItem, selected && styles.marketItemSelected]}
                    onPress={() => {
                      setSymbol(item.symbol as SymbolId);
                      setSymbolOpen(false);
                    }}
                  >
                    <View style={styles.marketItemInfo}>
                      <Text style={styles.marketSymbol}>{item.symbol}</Text>
                      <Text numberOfLines={1} style={styles.marketName}>{item.name}</Text>
                    </View>
                    <Text style={styles.marketCategory}>{item.category}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#131722',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2E39',
    paddingTop: 7,
    paddingBottom: 6,
    paddingHorizontal: 10,
  },
  topRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6 },
  symbolButton: {
    maxWidth: 112,
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    backgroundColor: '#2A2E39',
    borderRadius: 5,
  },
  symbolText: { color: '#F0F1F4', fontWeight: '700', fontSize: 13 },
  demoBadge: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 152, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.45)',
    borderRadius: 4,
  },
  demoText: { color: '#FFB74D', fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },
  quoteBlock: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  loader: { marginRight: 1 },
  quoteTextBlock: { minWidth: 0, alignItems: 'flex-end' },
  priceText: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  changeText: { fontSize: 10, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionButton: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E222D',
    borderRadius: 5,
  },
  pineButton: {
    minWidth: 55,
    height: 31,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(41, 98, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(41, 98, 255, 0.28)',
    borderRadius: 5,
  },
  pineButtonCompact: { minWidth: 34, width: 34, paddingHorizontal: 0 },
  pineText: { color: '#A9BBFF', fontSize: 11, fontWeight: '700' },
  timeframeRow: { height: 34, flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  timeframeScroll: { flex: 1, minWidth: 0 },
  timeframeContent: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 6 },
  timeframeTab: {
    minWidth: 40,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeframeTabSelected: { backgroundColor: '#2962FF', borderColor: '#4D7CFF' },
  timeframeText: { color: '#A7AAB3', fontSize: 12, fontWeight: '600' },
  timeframeTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  timeframeLoader: { marginLeft: 4, marginRight: 2 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', padding: 18 },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '72%', padding: 14, backgroundColor: '#1E222D', borderWidth: 1, borderColor: '#363B49', borderRadius: 9 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  modalTitle: { color: '#F0F1F4', fontSize: 16, fontWeight: '700' },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  marketItem: { minHeight: 53, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 9, borderRadius: 5 },
  marketItemSelected: { backgroundColor: '#2A2E39' },
  marketItemInfo: { flex: 1, minWidth: 0, paddingRight: 12 },
  marketSymbol: { color: '#F0F1F4', fontSize: 13, fontWeight: '700' },
  marketName: { color: '#9A9DA7', fontSize: 11, marginTop: 2 },
  marketCategory: { color: '#858995', fontSize: 10, textTransform: 'uppercase' },
});

export default TradingViewToolbar;
