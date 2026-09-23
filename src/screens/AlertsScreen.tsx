import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertList } from '../components/alerts/AlertList';
import { colors, spacing } from '../theme';

export function AlertsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.sub}>Rules armed from your custom scripts</Text>
      </View>
      <AlertList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.text.primary, fontSize: 24, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: 13, marginTop: 4 },
});

export default AlertsScreen;
