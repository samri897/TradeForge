import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { SymbolId, Timeframe } from '../../types';
import { buildTradingViewPageUrl } from './tradingViewConfig';

interface Props {
  symbol: SymbolId;
  timeframe: Timeframe;
  refreshKey?: number;
}

export function TradingViewAdvancedChart({ symbol, timeframe, refreshKey = 0 }: Props) {
  const baseUrl = typeof window !== 'undefined' && window.location.pathname.startsWith('/TradeForge')
    ? `${window.location.origin}/TradeForge/`
    : typeof window !== 'undefined'
      ? `${window.location.origin}/`
      : 'https://samri897.github.io/TradeForge/';
  const src = buildTradingViewPageUrl(baseUrl, symbol, timeframe, refreshKey);

  return (
    <View style={styles.container}>
      {React.createElement('iframe' as any, {
        key: `${symbol}-${timeframe}-${refreshKey}`,
        src,
        title: `TradingView chart for ${symbol}`,
        allowFullScreen: true,
        frameBorder: '0',
        style: styles.iframe,
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: '#131722', overflow: 'hidden' },
  iframe: {
    display: 'block',
    width: '100%',
    height: '100%',
    border: 0,
    backgroundColor: '#131722',
  } as any,
});

export default TradingViewAdvancedChart;
