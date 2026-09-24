import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TradingViewAdvancedChart } from '../components/chart/TradingViewAdvancedChart';
import { colors } from '../theme';

/** Single-page chart workspace; the embedded HTML owns the market/timeframe and script controls. */
export function ChartScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />
      <View style={styles.container}>
        <TradingViewAdvancedChart symbol="XAU/USD" timeframe="5m" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  container: { flex: 1, backgroundColor: colors.bg.primary, minHeight: 0 },
});

export default ChartScreen;
