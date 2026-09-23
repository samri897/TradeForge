import 'react-native-gesture-handler';
import React, { useEffect, useState, Component, type ReactNode } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useScriptStore } from './src/store/scriptStore';
import { alertService } from './src/services/alerts';
import { colors } from './src/theme';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.boot}>
          <Text style={styles.bootText}>Something went wrong</Text>
          <Text style={styles.errorDetail}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * TradeForge — TradingView-style mobile app entry.
 */
export default function App() {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const hydrate = useScriptStore((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Ensure vector-icon fonts are ready (esp. web)
        const loadFont = (Ionicons as unknown as { loadFont?: () => Promise<void> }).loadFont;
        if (typeof loadFont === 'function') {
          await loadFont();
        }
        await hydrate();
        await alertService.init();
        alertService.start();
      } catch (err) {
        console.error('[TradeForge] boot failed', err);
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
      alertService.stop();
    };
  }, [hydrate]);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.accent.blue} />
        <Text style={styles.bootText}>TradeForge</Text>
      </View>
    );
  }

  if (bootError) {
    return (
      <View style={styles.boot}>
        <Text style={styles.bootText}>Boot error</Text>
        <Text style={styles.errorDetail}>{bootError}</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  boot: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  bootText: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  errorDetail: {
    color: colors.status.error,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 480,
  },
});
