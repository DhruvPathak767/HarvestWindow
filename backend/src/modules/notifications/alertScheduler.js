/**
 * Phase AI-8: In-Process Alert Scheduler
 * Executes deterministic evaluations for harvest windows, weather cautions,
 * prediction changes, and crop health scans without requiring Redis or BullMQ.
 */

import { AlertEngineService } from "./alertEngine.service.js";
import { ALERT_RULES_CONFIG } from "./alertRules.config.js";

let schedulerTimer = null;
let isEvaluating = false;

export class AlertScheduler {
  /**
   * Starts the alert evaluation background job.
   */
  static start() {
    if (schedulerTimer) {
      console.log("[AlertScheduler] Scheduler is already active.");
      return;
    }

    const intervalMs = (ALERT_RULES_CONFIG.scheduler.intervalMinutes || 15) * 60 * 1000;

    console.log(`[AlertScheduler] Starting alert scheduler (interval: ${ALERT_RULES_CONFIG.scheduler.intervalMinutes} mins).`);

    // Initial evaluation after 5 seconds delay to allow server boot to finish
    setTimeout(() => {
      AlertScheduler.runCycle().catch((err) => {
        console.error("[AlertScheduler] Initial cycle failed:", err.message);
      });
    }, 5000);

    // Recurring cycle
    schedulerTimer = setInterval(() => {
      AlertScheduler.runCycle().catch((err) => {
        console.error("[AlertScheduler] Recurring cycle failed:", err.message);
      });
    }, intervalMs);
  }

  /**
   * Stops the background scheduler.
   */
  static stop() {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
      console.log("[AlertScheduler] Scheduler stopped.");
    }
  }

  /**
   * Runs an evaluation cycle with concurrency safety.
   */
  static async runCycle() {
    if (isEvaluating) {
      console.log("[AlertScheduler] Previous cycle still running, skipping.");
      return;
    }

    isEvaluating = true;
    const startTime = Date.now();

    try {
      const result = await AlertEngineService.evaluateAllUsers();
      const elapsed = Date.now() - startTime;
      console.log(
        `[AlertScheduler] Cycle complete in ${elapsed}ms: ${result.usersEvaluated} users evaluated, ${result.totalCreated} alerts created.`
      );
    } catch (err) {
      console.error("[AlertScheduler] Cycle execution error:", err.message);
    } finally {
      isEvaluating = false;
    }
  }
}
