import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChartStore } from '../../store/chartStore';
import { INSTRUMENTS, TIMEFRAMES } from '../../constants/instruments';
import type { SymbolId } from '../../types';

interface Props {
  onOpenEditor: () => void;
  onReload: () => void;
}

/** Compact TradeForge controls; the embedded TradingView chart supplies the market feed and drawing toolbar. */
export function TradingViewToolbar({ onOpenEditor, onReload }: Props) {
  const symbol = useChartStore((state) => state.symbol);
  const timeframe = useChartStore((state) => state.timeframe);
  const setSymbol = useChartStore((state) => state.setSymbol);
  const setTimeframe = useChartStore((state) => state.setTimeframe);
  const [symbolOpen, setSymbolOpen] = useState(false);

  return (
    <View style={styles.wrap}>
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

        <View style={styles.dataSource}>
          <View style={styles.sourceDot} />
          <Text numberOfLines={1} style={styles.sourceText}>TRADINGVIEW DATA</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Refresh chart"
            onPress={onReload}
            style={styles.actionButton}
          >
            <Ionicons name="refresh" size={16} color="#C8CAD1" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Pine script editor"
            onPress={onOpenEditor}
            style={styles.pineButton}
          >
            <Ionicons name="code-slash" size={15} color="#A9BBFF" />
            <Text style={styles.pineText}>Pine</Text>
          </TouchableOpacity>
        </View>
      </View>

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
  topRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 7 },
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
  dataSource: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 5 },
  sourceDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#089981' },
  sourceText: { color: '#9A9DA7', fontSize: 9, fontWeight: '700', letterSpacing: 0.45 },
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
