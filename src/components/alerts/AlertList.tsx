import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { alertService } from '../../services/alerts';
import type { AlertRule, AlertEvent } from '../../types';
import { colors, spacing, radius } from '../../theme';
import { formatPrice } from '../../utils/format';

export function AlertList() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [tab, setTab] = useState<'rules' | 'events'>('events');

  const refresh = useCallback(() => {
    setRules(alertService.getRules());
    setEvents(alertService.getEvents());
  }, []);

  useEffect(() => {
    refresh();
    return alertService.onEvent(() => refresh());
  }, [refresh]);

  const toggleRule = async (rule: AlertRule) => {
    await alertService.updateRule(rule.id, {
      status: rule.status === 'active' ? 'paused' : 'active',
    });
    refresh();
  };

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'events' && styles.tabActive]}
          onPress={() => setTab('events')}
        >
          <Text style={[styles.tabText, tab === 'events' && styles.tabTextActive]}>
            Events ({events.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'rules' && styles.tabActive]}
          onPress={() => setTab('rules')}
        >
          <Text style={[styles.tabText, tab === 'rules' && styles.tabTextActive]}>
            Rules ({rules.length})
          </Text>
        </TouchableOpacity>
        {tab === 'events' && events.length > 0 ? (
          <TouchableOpacity
            onPress={async () => {
              await alertService.clearEvents();
              refresh();
            }}
          >
            <Text style={styles.clear}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {tab === 'events' ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No alerts triggered yet. Arm a script to begin.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.read && styles.cardUnread]}
              onPress={() => {
                void alertService.markEventRead(item.id).then(refresh);
              }}
            >
              <View style={styles.cardHead}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.time}>{new Date(item.triggeredAt).toLocaleString()}</Text>
              </View>
              <Text style={styles.msg}>{item.message}</Text>
              <Text style={styles.price}>@ {formatPrice(item.price, item.symbol)}</Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={rules}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No rules. Open the script editor → Run → Save + Arm Alerts.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.symbol}>{item.name}</Text>
                <Switch
                  value={item.status === 'active'}
                  onValueChange={() => toggleRule(item)}
                  trackColor={{ true: colors.accent.blue, false: colors.bg.elevated }}
                />
              </View>
              <Text style={styles.msg}>
                {item.symbol} · {item.timeframe} · {item.condition}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>Triggers: {item.triggerCount}</Text>
                {item.lastTriggeredAt ? (
                  <Text style={styles.meta}>
                    Last: {new Date(item.lastTriggeredAt).toLocaleString()}
                  </Text>
                ) : null}
                <TouchableOpacity onPress={() => void alertService.removeRule(item.id).then(refresh)}>
                  <Ionicons name="trash-outline" size={16} color={colors.status.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  tab: { paddingVertical: 6, paddingHorizontal: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent.blue },
  tabText: { color: colors.text.muted, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: colors.text.primary },
  clear: { color: colors.accent.blue, fontSize: 13, marginLeft: 'auto' },
  list: { padding: spacing.md, gap: spacing.sm },
  empty: {
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: spacing.sm,
  },
  cardUnread: { borderColor: colors.accent.blue },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  symbol: { color: colors.text.primary, fontWeight: '700', fontSize: 14 },
  time: { color: colors.text.muted, fontSize: 11 },
  msg: { color: colors.text.secondary, fontSize: 13, lineHeight: 18 },
  price: { color: colors.accent.cyan, fontSize: 12, marginTop: 6, fontWeight: '600' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  meta: { color: colors.text.muted, fontSize: 11, flex: 1 },
});

export default AlertList;
