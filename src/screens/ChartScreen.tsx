import React, { useCallback, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TradingViewToolbar } from '../components/chart/TradingViewToolbar';
import { TradingViewAdvancedChart } from '../components/chart/TradingViewAdvancedChart';
import { ScriptEditor } from '../components/editor/ScriptEditor';
import { useMarketData } from '../hooks/useMarketData';
import { useScriptStore } from '../store/scriptStore';
import { useChartStore } from '../store/chartStore';
import { colors } from '../theme';

/** Main chart workspace: TradingView's market feed/drawing tools plus TradeForge controls. */
export function ChartScreen() {
  // Retain the TradeForge candle store for its local Pine-style editor and alerts.
  const { reload } = useMarketData();
  const symbol = useChartStore((state) => state.symbol);
  const timeframe = useChartStore((state) => state.timeframe);
  const [refreshKey, setRefreshKey] = useState(0);
  const showEditor = useScriptStore((state) => state.showEditor);
  const setShowEditor = useScriptStore((state) => state.setShowEditor);

  const openEditor = useCallback(() => setShowEditor(true), [setShowEditor]);
  const closeEditor = useCallback(() => setShowEditor(false), [setShowEditor]);
  const refreshChart = useCallback(() => {
    setRefreshKey((key) => key + 1);
    void reload();
  }, [reload]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />
      <View style={styles.container}>
        <TradingViewToolbar onOpenEditor={openEditor} onReload={refreshChart} />
        <TradingViewAdvancedChart symbol={symbol} timeframe={timeframe} refreshKey={refreshKey} />
        <ScriptEditor visible={showEditor} onClose={closeEditor} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  container: { flex: 1, backgroundColor: colors.bg.primary },
});

export default ChartScreen;
