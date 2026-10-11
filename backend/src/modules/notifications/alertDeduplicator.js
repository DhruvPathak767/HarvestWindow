/**
 * Phase AI-8: Alert Deduplication and Lifecycle Management
 * Guarantees idempotency across recurring scheduler executions and manages
 * transitions between ACTIVE, RESOLVED, EXPIRED, and SUPERSEDED states.
 */

import prisma from "../../config/prisma.js";
import { ALERT_LIFECYCLES, ALERT_SEVERITIES } from "./alertRules.config.js";

export class AlertDeduplicator {
  /**
   * Generates a deterministic deduplication key for an event.
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} [params.farmId]
   * @param {string} [params.cropId]
   * @param {string} params.eventType
   * @param {string} [params.bucket] - e.g. YYYY-MM-DD or version hash
   * @returns {string}
   */
  static generateKey({ userId, farmId = "all", cropId = "general", eventType, bucket }) {
    const today = bucket || new Date().toISOString().slice(0, 10);
    return `dedup:${userId}:${farmId}:${cropId}:${eventType}:${today}`;
  }

  /**
   * Checks whether an active alert already exists with the given key.
   *
   * @param {string} dedupKey
   * @returns {Promise<Object|null>}
   */
  static async findExistingActiveAlert(dedupKey) {
    if (!dedupKey) return null;

    return prisma.notification.findFirst({
      where: {
        dedupKey,
        status: ALERT_LIFECYCLES.ACTIVE,
      },
    });
  }

  /**
   * Checks if current time is in user's quiet hours.
   *
   * @param {string|null} start - "HH:MM" e.g. "22:00"
   * @param {string|null} end - "HH:MM" e.g. "06:00"
   * @param {Date} [now]
   * @returns {boolean}
   */
  static isQuietHours(start, end, now = new Date()) {
    if (!start || !end) return false;

    try {
      const [startHour, startMin] = start.split(":").map(Number);
      const [endHour, endMin] = end.split(":").map(Number);

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = startHour * 60 + (startMin || 0);
      const endMinutes = endHour * 60 + (endMin || 0);

      if (startMinutes <= endMinutes) {
        // Simple daytime quiet hours (e.g. 13:00 - 15:00)
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // Overnight quiet hours (e.g. 22:00 - 06:00)
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    } catch {
      return false;
    }
  }

  /**
   * Determines if a notification should be filtered based on user's minimum severity threshold.
   *
   * @param {string} severity
   * @param {string} minSeverity - e.g. "low", "medium", "high"
   * @returns {boolean}
   */
  static meetsSeverityThreshold(severity, minSeverity = ALERT_SEVERITIES.LOW) {
    const weights = {
      [ALERT_SEVERITIES.INFO]: 0,
      [ALERT_SEVERITIES.LOW]: 1,
      [ALERT_SEVERITIES.MEDIUM]: 2,
      [ALERT_SEVERITIES.HIGH]: 3,
      [ALERT_SEVERITIES.CRITICAL]: 4,
    };

    const sWeight = weights[severity?.toLowerCase()] ?? 1;
    const mWeight = weights[minSeverity?.toLowerCase()] ?? 1;

    return sWeight >= mWeight;
  }

  /**
   * Marks older related active alerts as SUPERSEDED when a new prediction arrives.
   *
   * @param {string} userId
   * @param {string} cropId
   * @param {string} eventType
   */
  static async supersedePriorAlerts(userId, cropId, eventType) {
    if (!userId || !cropId) return;

    await prisma.notification.updateMany({
      where: {
        userId,
        cropId,
        type: eventType,
        status: ALERT_LIFECYCLES.ACTIVE,
      },
      data: {
        status: ALERT_LIFECYCLES.SUPERSEDED,
      },
    });
  }

  /**
   * Expires notifications past their expiration timestamp.
   */
  static async expireStaleNotifications() {
    const now = new Date();
    const result = await prisma.notification.updateMany({
      where: {
        status: ALERT_LIFECYCLES.ACTIVE,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: ALERT_LIFECYCLES.EXPIRED,
      },
    });

    return result.count;
  }
}
