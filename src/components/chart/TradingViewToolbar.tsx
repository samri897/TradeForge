import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChartStore } from '../../store/chartStore';
import { INSTRUMENTS, TIMEFRAMES } from '../../constants/instruments';
import { formatPrice, formatPct } from '../../utils/format';
import type { SymbolId, Timeframe } from '../../types';

interface Props {
  onOpenEditor: () => void;
  onReload: () => void;
  isMock?: boolean;
}

export function TradingViewToolbar({ onOpenEditor, onReload, isMock }: Props) {
  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);
  const quote = useChartStore((s) => s.quote);
  const candles = useChartStore((s) => s.candles);
  const setSymbol = useChartStore((s) => s.setSymbol);
  const setTimeframe = useChartStore((s) => s.setTimeframe);

  const [symbolOpen, setSymbolOpen] = useState(false);

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const price = quote?.price ?? last?.close ?? 0;
  const changeFrom = prev?.close ?? last?.open ?? price;
  const up = price >= changeFrom;
  const pct = formatPct(changeFrom, price);

  return (
    <View style={styles.wrap}>
      {/* Top row - TradingView style */}
      <View style={styles.topRow}>
        {/* Symbol */}
        <TouchableOpacity style={styles.symbolBtn} onPress={() => setSymbolOpen(true)}>
          <Text style={styles.symbolText}>{symbol}</Text>
          <Ionicons name="chevron-down" size={12} color="#868993" />
        </TouchableOpacity>

        {/* Timeframes - TradingView style tabs */}
        <View style={styles.tfRow}>
          {TIMEFRAMES.slice(0, 7).map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setTimeframe(t.value)}
              style={[styles.tfBtn, timeframe === t.value && styles.tfBtnActive]}
            >
              <Text style={[styles.tfBtnText, timeframe === t.value && styles.tfBtnTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Right side - price */}
        <View style={styles.rightRow}>
          <Text style={[styles.priceText, { color: up ? '#089981' : '#F23645' }]}>{price ? formatPrice(price, symbol) : '—'}</Text>
          <Text style={[styles.pctText, { color: up ? '#089981' : '#F23645' }]}>{pct}</Text>
          {isMock && <View style={styles.demoBadge}><Text style={styles.demoText}>DEMO</Text></View>}
          <TouchableOpacity onPress={onReload} style={styles.iconBtn}>
            <Ionicons name="refresh" size={16} color="#868993" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenEditor} style={[styles.iconBtn, styles.codeBtn]}>
            <Ionicons name="code-slash" size={16} color="#2962FF" />
            <Text style={styles.codeText}>Pine</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Symbol picker modal - TradingView style */}
      <Modal visible={symbolOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSymbolOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Symbol Search</Text>
            <FlatList
              data={INSTRUMENTS}
              keyExtractor={(item) => item.symbol}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, item.symbol === symbol && styles.listItemActive]}
                  onPress={() => { setSymbol(item.symbol as SymbolId); setSymbolOpen(false); }}
                >
                  <View style={styles.listLeft}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#131722', borderBottomWidth: 1, borderBottomColor: '#2A2E39', paddingVertical: 6, paddingHorizontal: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  symbolBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#2A2E39', borderRadius: 4 },
  symbolText: { color: '#D1D4DC', fontWeight: '700', fontSize: 14 },
  tfRow: { flexDirection: 'row', gap: 2, flex: 1 },
  tfBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tfBtnActive: { backgroundColor: '#2962FF' },
  tfBtnText: { color: '#868993', fontSize: 12, fontWeight: '600' },
  tfBtnTextActive: { color: 'white' },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceText: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  pctText: { fontSize: 12, fontWeight: '600' },
  demoBadge: { backgroundColor: 'rgba(255, 152, 0, 0.2)', borderWidth: 1, borderColor: '#FF9800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  demoText: { color: '#FF9800', fontSize: 9, fontWeight: '700' },
  iconBtn: { padding: 6, borderRadius: 4 },
  codeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(41, 98, 255, 0.1)', paddingHorizontal: 8 },
  codeText: { color: '#2962FF', fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#1E222D', borderRadius: 8, borderWidth: 1, borderColor: '#2A2E39', maxHeight: '70%', padding: 16 },
  modalTitle: { color: '#D1D4DC', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 4 },
  listItemActive: { backgroundColor: '#2A2E39' },
  listLeft: { flex: 1 },
  listSymbol: { color: '#D1D4DC', fontWeight: '700', fontSize: 14 },
  listName: { color: '#868993', fontSize: 11, marginTop: 2 },
  listCat: { color: '#868993', fontSize: 10, textTransform: 'uppercase' },
});

export default TradingViewToolbar;
