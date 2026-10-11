import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  CloudRain,
  Sprout,
  ShieldAlert,
  ArrowRight,
  Check,
  X,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  Sparkles,
  Tractor,
  Layers,
  Bot,
  Info,
} from "lucide-react";
import { useStore } from "@/store/AppStore";
import { notificationsClient } from "@/services/api/notificationsClient";
import type {
  NotificationItem,
  NotificationPreferences,
  AlertSeverity,
} from "@/types/notifications";
import { Button, Modal } from "@/components/common/ui";
import { relativeTime } from "@/utils/date";
import { cn } from "@/utils/cn";

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "high" | "harvest" | "weather">("all");
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    harvestWindowAlerts: true,
    weatherCautions: true,
    predictionChangeAlerts: true,
    cropHealthAlerts: true,
    yieldAlerts: true,
    weeklySummary: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    minSeverity: "info",
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load notifications and preferences on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listRes, prefsRes] = await Promise.all([
        notificationsClient.listNotifications({ limit: 50 }),
        notificationsClient.getPreferences().catch(() => null),
      ]);
      setNotifications(listRes.items);
      if (prefsRes) {
        setPreferences(prefsRes);
      }
    } catch (err: any) {
      console.warn("Failed to load notifications:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAlerts = async () => {
    setSyncing(true);
    setStatusMessage(null);
    try {
      const res = await notificationsClient.syncAlerts();
      setStatusMessage(`Alerts synchronized. ${res.generated} new alerts generated.`);
      await loadData();
    } catch (err: any) {
      setStatusMessage("Failed to evaluate alerts: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsClient.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err: any) {
      console.error("Mark read failed:", err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsClient.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: any) {
      console.error("Mark all read failed:", err.message);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await notificationsClient.dismissNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      console.error("Dismiss failed:", err.message);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      const updated = await notificationsClient.updatePreferences(preferences);
      setPreferences(updated);
      setPreferencesOpen(false);
      setStatusMessage("Notification preferences saved successfully.");
    } catch (err: any) {
      alert("Failed to save preferences: " + err.message);
    } finally {
      setSavingPrefs(false);
    }
  };

  // Filtered items based on active tab
  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === "unread") return !n.isRead;
    if (filterTab === "high") return n.severity === "critical" || n.severity === "high";
    if (filterTab === "harvest") return n.type === "harvest" || n.kind === "forecast";
    if (filterTab === "weather") return n.type === "weather" || n.kind === "weather";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const criticalCount = notifications.filter((n) => n.severity === "critical" || n.severity === "high").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* -------------------- HEADER -------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-line">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-forest-deep sm:text-3xl">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-gold px-2.5 py-0.5 font-mono text-xs font-bold text-forest-deep">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Personalized harvest window alerts, adverse weather cautions, and prediction change updates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSyncAlerts}
            disabled={syncing}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            {syncing ? "Evaluating..." : "Refresh Alerts"}
          </Button>

          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" onClick={handleMarkAllRead} className="gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Mark All Read
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPreferencesOpen(true)}
            className="gap-1.5 text-forest-deep"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Alert Preferences
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-forest/10 p-3 text-xs text-forest">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-forest hover:opacity-75">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* -------------------- STATS CARDS -------------------- */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">Total Active</p>
          <p className="mt-1 font-display text-2xl font-bold text-forest-deep">{notifications.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">Unread Alerts</p>
          <p className="mt-1 font-display text-2xl font-bold text-gold">{unreadCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">High & Critical</p>
          <p className="mt-1 font-display text-2xl font-bold text-danger">{criticalCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted">Evaluation Engine</p>
          <p className="mt-1 font-display text-xs font-semibold text-forest">Phase AI-8 Active</p>
        </div>
      </div>

      {/* -------------------- FILTER TABS -------------------- */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-line pb-3">
        {[
          { key: "all", label: "All Alerts" },
          { key: "unread", label: `Unread (${unreadCount})` },
          { key: "high", label: `Urgent (${criticalCount})` },
          { key: "harvest", label: "Harvest Windows" },
          { key: "weather", label: "Weather Risks" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterTab(tab.key as any)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
              filterTab === tab.key
                ? "bg-forest-deep text-cream shadow-sm"
                : "bg-cream/70 text-forest-deep hover:bg-cream"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* -------------------- NOTIFICATION CARDS LIST -------------------- */}
      <div className="mt-6 space-y-3.5">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted">Loading alerts...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-forest/10 text-forest mb-3">
              <CheckCircle2 className="h-6 w-6 text-gold" />
            </div>
            <h3 className="font-display text-base font-bold text-forest-deep">No alerts in this category</h3>
            <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
              All harvest windows, weather forecasts, and disease scans are within standard ranges.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isCritical = notif.severity === "critical";
            const isHigh = notif.severity === "high";

            return (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={cn(
                  "relative rounded-xl border p-4 sm:p-5 transition-all shadow-sm",
                  notif.isRead ? "bg-white/80 border-line" : "bg-white border-forest/40 ring-1 ring-forest/20",
                  isCritical && "border-danger/40 bg-danger/[0.02]"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* Severity Icon */}
                    <div
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg mt-0.5",
                        isCritical
                          ? "bg-danger/15 text-danger"
                          : isHigh
                          ? "bg-gold/20 text-gold-deep"
                          : "bg-forest/10 text-forest"
                      )}
                    >
                      {notif.type === "weather" ? (
                        <CloudRain className="h-5 w-5" />
                      ) : notif.type === "crop_health" ? (
                        <ShieldAlert className="h-5 w-5" />
                      ) : (
                        <Sprout className="h-5 w-5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
                            isCritical
                              ? "bg-danger/15 text-danger"
                              : isHigh
                              ? "bg-amber-100 text-amber-800"
                              : "bg-forest/10 text-forest"
                          )}
                        >
                          {notif.severity}
                        </span>

                        {notif.farm?.name && (
                          <span className="text-[11px] font-medium text-muted flex items-center gap-1">
                            <Tractor className="h-3 w-3" />
                            {notif.farm.name}
                          </span>
                        )}

                        <span className="text-[11px] text-muted flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" />
                          {relativeTime(notif.createdAt || notif.at)}
                        </span>
                      </div>

                      <h2 className="mt-1.5 font-display text-sm font-bold text-forest-deep sm:text-base">
                        {notif.title}
                      </h2>

                      <p className="mt-1 text-xs sm:text-sm text-forest-deep/80 leading-relaxed">
                        {notif.body || notif.message}
                      </p>

                      {/* Recommended Action Box */}
                      {notif.recommendedAction && (
                        <div className="mt-3 rounded-lg bg-cream/70 border border-line/80 p-3 text-xs">
                          <p className="font-semibold text-forest flex items-center gap-1.5 mb-0.5">
                            <Sparkles className="h-3.5 w-3.5 text-gold" />
                            Recommended Action:
                          </p>
                          <p className="text-forest-deep/90">{notif.recommendedAction}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 self-end sm:self-start shrink-0 pt-2 sm:pt-0">
                    {notif.actionUrl && (
                      <Link
                        to={notif.actionUrl}
                        className="inline-flex items-center gap-1 rounded-md bg-forest-deep px-3 py-1.5 text-xs font-semibold text-cream hover:bg-forest transition-colors shadow-sm"
                      >
                        <span>View Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}

                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="rounded-md border border-line p-1.5 text-xs text-muted hover:text-forest hover:bg-soft transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDismiss(notif.id)}
                      className="rounded-md border border-line p-1.5 text-xs text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Dismiss notification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* -------------------- ALERT PREFERENCES MODAL -------------------- */}
      <AnimatePresence>
        {preferencesOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-forest" />
                  <h3 className="font-display text-lg font-bold text-forest-deep">
                    Personalized Alert Preferences
                  </h3>
                </div>
                <button
                  onClick={() => setPreferencesOpen(false)}
                  className="rounded p-1 text-muted hover:text-forest-deep"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <p className="text-xs text-muted">
                  Configure deterministic rules, quiet hours, and trigger thresholds for scheduled monitoring.
                </p>

                {/* Toggles */}
                <div className="space-y-3">
                  {[
                    {
                      key: "harvestWindowAlerts",
                      label: "Harvest Window Alerts",
                      desc: "Alerts when harvest window opens, closes, or is within 7 days.",
                    },
                    {
                      key: "weatherCautions",
                      label: "Weather Caution Alerts",
                      desc: "Rainfall (>5mm) or gale winds during active harvest periods.",
                    },
                    {
                      key: "predictionChangeAlerts",
                      label: "Prediction Change Alerts",
                      desc: "Notifies when model shifts harvest date by 3 or more days.",
                    },
                    {
                      key: "yieldAlerts",
                      label: "Yield Forecast Shifts",
                      desc: "Notifies if predicted yield shifts by 10% or more.",
                    },
                    {
                      key: "cropHealthAlerts",
                      label: "Crop Health & Disease Scans",
                      desc: "Flags leaf disease findings with >= 50% confidence.",
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start gap-3 rounded-lg border border-line/70 p-3 hover:bg-cream/40 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean((preferences as any)[item.key])}
                        onChange={(e) =>
                          setPreferences({ ...preferences, [item.key]: e.target.checked })
                        }
                        className="mt-1 h-4 w-4 rounded border-line text-forest focus:ring-forest"
                      />
                      <div>
                        <span className="font-semibold text-xs text-forest-deep block">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-muted block">{item.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Minimum Severity */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-forest-deep mb-1">
                    Minimum Alert Severity
                  </label>
                  <select
                    value={preferences.minSeverity}
                    onChange={(e) =>
                      setPreferences({ ...preferences, minSeverity: e.target.value as AlertSeverity })
                    }
                    className="w-full rounded-md border border-line bg-cream/40 px-3 py-2 text-xs text-forest-deep"
                  >
                    <option value="info">Info (All notifications)</option>
                    <option value="low">Low (Standard operational notices)</option>
                    <option value="medium">Medium (Moderate operational cautions)</option>
                    <option value="high">High (Urgent weather & harvest windows)</option>
                    <option value="critical">Critical Only</option>
                  </select>
                </div>

                {/* Quiet Hours */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-forest-deep mb-1">
                      Quiet Hours Start
                    </label>
                    <select
                      value={preferences.quietHoursStart ?? ""}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          quietHoursStart: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full rounded-md border border-line bg-cream/40 px-3 py-2 text-xs text-forest-deep"
                    >
                      <option value="">Disabled</option>
                      {Array.from({ length: 24 }).map((_, h) => (
                        <option key={h} value={h}>
                          {h.toString().padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-forest-deep mb-1">
                      Quiet Hours End
                    </label>
                    <select
                      value={preferences.quietHoursEnd ?? ""}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          quietHoursEnd: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full rounded-md border border-line bg-cream/40 px-3 py-2 text-xs text-forest-deep"
                    >
                      <option value="">Disabled</option>
                      {Array.from({ length: 24 }).map((_, h) => (
                        <option key={h} value={h}>
                          {h.toString().padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-line">
                <Button variant="ghost" size="sm" onClick={() => setPreferencesOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSavePreferences}
                  disabled={savingPrefs}
                >
                  {savingPrefs ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
