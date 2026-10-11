/**
 * Phase AI-8: Personalized Alerts and Notifications Types
 */

export type AlertSeverity = "info" | "low" | "medium" | "high" | "critical";

export type AlertStatus = "ACTIVE" | "RESOLVED" | "EXPIRED" | "SUPERSEDED" | "DISMISSED";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  message: string;
  severity: AlertSeverity;
  recommendedAction?: string;
  actionUrl?: string;
  status: AlertStatus;
  dedupKey?: string;
  kind: string;
  type: string;
  isRead: boolean;
  readAt?: string | null;
  dismissedAt?: string | null;
  expiresAt?: string | null;
  at: string;
  createdAt: string;
  updatedAt?: string;
  farmId?: string;
  cropId?: string;
  farm?: {
    id: string;
    name: string;
  };
  crop?: {
    id: string;
    name: string;
  };
}

export interface NotificationPreferences {
  harvestWindowAlerts: boolean;
  weatherCautions: boolean;
  predictionChangeAlerts: boolean;
  cropHealthAlerts: boolean;
  yieldAlerts: boolean;
  weeklySummary: boolean;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
  minSeverity: AlertSeverity;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
  status?: string;
  severity?: string;
  type?: string;
  farmId?: string;
  cropId?: string;
}
