import { API_CONFIG, getAuthToken, setAuthToken } from "./index";
import { authClient } from "./authClient";
import type {
  NotificationItem,
  NotificationPreferences,
  ListNotificationsParams,
} from "@/types/notifications";

async function request<T>(endpoint: string, options: RequestInit = {}, retry = true): Promise<T> {
  let token = getAuthToken();
  if (!token) {
    try {
      const refreshed = await authClient.refreshSession();
      if (refreshed?.accessToken) {
        token = refreshed.accessToken;
        setAuthToken(token);
      }
    } catch {
      // Session not active
    }
  }

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const base = API_CONFIG.baseUrl.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${base}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to notification service.");
  }

  // Handle 401 with auto-refresh retry
  if (res.status === 401 && retry) {
    try {
      const refreshed = await authClient.refreshSession();
      if (refreshed?.accessToken) {
        setAuthToken(refreshed.accessToken);
        return request<T>(endpoint, options, false);
      }
    } catch {
      setAuthToken(null);
    }
    throw new Error("Authentication required. Please sign in to view alerts.");
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const notificationsClient = {
  async listNotifications(params: ListNotificationsParams = {}): Promise<{
    items: NotificationItem[];
    unreadCount: number;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (typeof params.isRead === "boolean") query.set("isRead", String(params.isRead));
    if (params.status) query.set("status", params.status);
    if (params.severity) query.set("severity", params.severity);
    if (params.type) query.set("type", params.type);
    if (params.farmId) query.set("farmId", params.farmId);
    if (params.cropId) query.set("cropId", params.cropId);

    const qs = query.toString();
    const endpoint = `/notifications${qs ? `?${qs}` : ""}`;
    const res = await request<{
      success: boolean;
      data: NotificationItem[];
      unreadCount: number;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(endpoint);

    return {
      items: res.data || [],
      unreadCount: res.unreadCount || 0,
      pagination: res.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getUnreadCount(): Promise<number> {
    const res = await request<{ success: boolean; unreadCount: number }>("/notifications/unread-count");
    return res.unreadCount || 0;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await request<{ success: boolean; data: NotificationItem }>(`/notifications/${id}/read`, {
      method: "PATCH",
    });
    return res.data;
  },

  async markAllAsRead(): Promise<{ updatedCount: number }> {
    const res = await request<{ success: boolean; data: { updatedCount: number } }>("/notifications/read-all", {
      method: "PATCH",
    });
    return res.data;
  },

  async dismissNotification(id: string): Promise<NotificationItem> {
    const res = await request<{ success: boolean; data: NotificationItem }>(`/notifications/${id}/dismiss`, {
      method: "PATCH",
    });
    return res.data;
  },

  async getPreferences(): Promise<NotificationPreferences> {
    const res = await request<{ success: boolean; data: NotificationPreferences }>("/notifications/preferences");
    return res.data;
  },

  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const res = await request<{ success: boolean; data: NotificationPreferences }>("/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(prefs),
    });
    return res.data;
  },

  async syncAlerts(): Promise<{ generated: number }> {
    const res = await request<{ success: boolean; data: { generated: number } }>("/notifications/evaluate", {
      method: "POST",
    });
    return res.data;
  },
};
