export type AlertStatus = 'active' | 'triggered' | 'paused' | 'expired';
export type AlertChannel = 'push' | 'in_app' | 'both';

export interface AlertRule {
  id: string;
  name: string;
  scriptId: string;
  symbol: string;
  timeframe: string;
  /** Condition expression from script, or free-form */
  condition: string;
  message: string;
  channels: AlertChannel;
  status: AlertStatus;
  oncePerBar: boolean;
  createdAt: number;
  lastTriggeredAt?: number;
  triggerCount: number;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  symbol: string;
  message: string;
  price: number;
  triggeredAt: number;
  read: boolean;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data: {
    ruleId: string;
    symbol: string;
    screen: 'Chart' | 'Alerts';
  };
}
