import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { SymbolId, Timeframe } from '../../types';
import { buildTradingViewPageUrl } from './tradingViewConfig';

interface Props {
  symbol: SymbolId;
  timeframe: Timeframe;
  refreshKey?: number;
}

const PAGES_BASE_URL = 'https://samri897.github.io/TradeForge/';

export function TradingViewAdvancedChart({ symbol, timeframe, refreshKey = 0 }: Props) {
  const sourceUri = buildTradingViewPageUrl(PAGES_BASE_URL, symbol, timeframe, refreshKey);

  return (
    <View style={styles.container}>
      <WebView
        key={`${symbol}-${timeframe}-${refreshKey}`}
        source={{ uri: sourceUri }}
        originWhitelist={['https://*', 'http://*']}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        scrollEnabled={false}
        allowsInlineMediaPlayback
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: '#131722', overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#131722' },
});

export default TradingViewAdvancedChart;
