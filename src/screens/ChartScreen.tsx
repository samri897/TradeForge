import React, { useCallback } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartToolbar } from '../components/chart/ChartToolbar';
import { ChartCanvas } from '../components/chart/ChartCanvas';
import { ScriptEditor } from '../components/editor/ScriptEditor';
import { useMarketData } from '../hooks/useMarketData';
import { useScriptStore } from '../store/scriptStore';
import { colors } from '../theme';

/**
 * Main chart screen — TradingView-style workspace.
 *
 * Layout:
 *  SafeArea
 *  ├─ ChartToolbar   (symbol, TF, price, actions)
 *  ├─ ChartCanvas    (interactive OHLC + indicators)
 *  └─ ScriptEditor   (modal)
 */
export function ChartScreen() {
  const { reload, isMock } = useMarketData();
  const showEditor = useScriptStore((s) => s.showEditor);
  const setShowEditor = useScriptStore((s) => s.setShowEditor);

  const openEditor = useCallback(() => setShowEditor(true), [setShowEditor]);
  const closeEditor = useCallback(() => setShowEditor(false), [setShowEditor]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />
      <View style={styles.container}>
        <ChartToolbar onOpenEditor={openEditor} onReload={() => void reload()} isMock={isMock} />
        <ChartCanvas />
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
