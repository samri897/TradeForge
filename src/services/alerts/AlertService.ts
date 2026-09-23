import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AlertRule, AlertEvent, NotificationPayload } from '../../types';
import type { Candle, SymbolId, Timeframe } from '../../types';
import { scriptEngine } from '../scriptEngine';
import { marketData } from '../marketData/MarketDataService';

const RULES_KEY = '@tradeforge/alert_rules';
const EVENTS_KEY = '@tradeforge/alert_events';
const MAX_EVENTS = 200;

// expo-notifications is limited on web — load lazily and guard every call
type NotificationsModule = typeof import('expo-notifications');
let Notifications: NotificationsModule | null = null;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  if (Notifications) return Notifications;
  try {
    Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    return Notifications;
  } catch {
    return null;
  }
}

type EventListener = (event: AlertEvent) => void;

/**
 * Monitors active alert rules against live/historical data.
 * Call `start()` once from App bootstrap; it polls on an interval and
 * also reacts to inbound quotes via MarketDataService.
 */
class AlertService {
  private rules: AlertRule[] = [];
  private events: AlertEvent[] = [];
  private listeners = new Set<EventListener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private scriptSources = new Map<string, string>(); // scriptId → source
  private lastBarSeen = new Map<string, number>(); // ruleId → bar time
  private running = false;

  async init() {
    await this.load();
    await this.ensurePermissions();
  }

  async ensurePermissions() {
    const N = await getNotifications();
    if (!N) return;
    try {
      const { status: existing } = await N.getPermissionsAsync();
      if (existing !== 'granted') {
        await N.requestPermissionsAsync();
      }
    } catch {
      /* web / unsupported */
    }
  }

  onEvent(fn: EventListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getRules() {
    return this.rules.slice();
  }

  getEvents() {
    return this.events.slice();
  }

  /** Register the source code for a script so rules can evaluate it */
  registerScript(scriptId: string, source: string) {
    this.scriptSources.set(scriptId, source);
  }

  async addRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'triggerCount' | 'status'>) {
    const full: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      triggerCount: 0,
      status: 'active',
    };
    this.rules.push(full);
    await this.persist();
    return full;
  }

  async updateRule(id: string, patch: Partial<AlertRule>) {
    const idx = this.rules.findIndex((r) => r.id === id);
    if (idx < 0) return;
    this.rules[idx] = { ...this.rules[idx], ...patch };
    await this.persist();
  }

  async removeRule(id: string) {
    this.rules = this.rules.filter((r) => r.id !== id);
    await this.persist();
  }

  async markEventRead(id: string) {
    const ev = this.events.find((e) => e.id === id);
    if (ev) {
      ev.read = true;
      await this.persistEvents();
    }
  }

  async clearEvents() {
    this.events = [];
    await this.persistEvents();
  }

  start(intervalMs?: number) {
    if (this.running) return;
    this.running = true;
    const envInterval =
      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ALERT_POLL_INTERVAL_MS) ||
      '15000';
    const ms = intervalMs ?? Number(envInterval);

    this.timer = setInterval(() => {
      void this.tick();
    }, ms);

    // Also evaluate when quotes arrive (debounced per symbol by bar)
    marketData.onQuote((quote) => {
      void this.evaluateSymbol(quote.symbol);
    });
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    const symbols = [...new Set(this.rules.filter((r) => r.status === 'active').map((r) => r.symbol))];
    for (const symbol of symbols) {
      await this.evaluateSymbol(symbol as SymbolId);
    }
  }

  private async evaluateSymbol(symbol: SymbolId) {
    const active = this.rules.filter((r) => r.status === 'active' && r.symbol === symbol);
    if (!active.length) return;

    // Group by timeframe to avoid duplicate fetches
    const byTf = new Map<string, AlertRule[]>();
    for (const r of active) {
      const list = byTf.get(r.timeframe) ?? [];
      list.push(r);
      byTf.set(r.timeframe, list);
    }

    for (const [tf, rules] of byTf) {
      let candles: Candle[];
      try {
        candles = await marketData.getCandles(symbol, tf as Timeframe);
      } catch {
        continue;
      }
      if (!candles.length) continue;
      const lastTime = candles[candles.length - 1].time;
      const lastClose = candles[candles.length - 1].close;

      for (const rule of rules) {
        // oncePerBar gate
        if (rule.oncePerBar && this.lastBarSeen.get(rule.id) === lastTime) continue;

        const source = this.scriptSources.get(rule.scriptId);
        if (!source) continue;

        const { fired, errors } = scriptEngine.evaluateAlerts(source, candles, symbol, tf);
        if (errors.length) continue;

        // Match by condition title or fire all returned
        const matches = fired.filter(
          (f) =>
            f.title === rule.condition ||
            f.message === rule.condition ||
            rule.condition === '*' ||
            rule.condition === f.title,
        );

        // If rule.condition is a free-form label that matches an alertcondition title
        for (const m of matches.length ? matches : []) {
          this.lastBarSeen.set(rule.id, lastTime);
          await this.trigger(rule, m.message, lastClose);
        }
      }
    }
  }

  private async trigger(rule: AlertRule, message: string, price: number) {
    const event: AlertEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ruleId: rule.id,
      symbol: rule.symbol,
      message: message || rule.message,
      price,
      triggeredAt: Date.now(),
      read: false,
    };

    this.events.unshift(event);
    if (this.events.length > MAX_EVENTS) this.events.length = MAX_EVENTS;

    rule.triggerCount += 1;
    rule.lastTriggeredAt = event.triggeredAt;
    await this.persist();
    await this.persistEvents();

    this.listeners.forEach((l) => l(event));

    if (rule.channels === 'push' || rule.channels === 'both') {
      await this.sendPush({
        title: `${rule.symbol} · ${rule.name}`,
        body: event.message,
        data: { ruleId: rule.id, symbol: rule.symbol, screen: 'Chart' },
      });
    }
  }

  private async sendPush(payload: NotificationPayload) {
    try {
      const N = await getNotifications();
      if (!N) {
        // Web fallback: browser Notification API when permitted
        if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(payload.title, { body: payload.body });
          } else if (Notification.permission !== 'denied') {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') new Notification(payload.title, { body: payload.body });
          }
        }
        return;
      }
      await N.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: true,
        },
        trigger: null, // immediate
      });
    } catch (err) {
      console.warn('[AlertService] push failed', err);
    }
  }

  private async load() {
    try {
      const [r, e] = await Promise.all([
        AsyncStorage.getItem(RULES_KEY),
        AsyncStorage.getItem(EVENTS_KEY),
      ]);
      if (r) this.rules = JSON.parse(r);
      if (e) this.events = JSON.parse(e);
    } catch {
      this.rules = [];
      this.events = [];
    }
  }

  private async persist() {
    await AsyncStorage.setItem(RULES_KEY, JSON.stringify(this.rules));
  }

  private async persistEvents() {
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(this.events));
  }
}

export const alertService = new AlertService();
export default alertService;
