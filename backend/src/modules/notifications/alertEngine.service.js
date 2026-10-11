/**
 * Phase AI-8: Personalized Alert and Recommendation Engine
 * Evaluates real farm, crop, harvest, weather, and health records against deterministic rules,
 * enforcing deduplication, lifecycle transitions, quiet hours, and user preferences.
 */

import prisma from "../../config/prisma.js";
import {
  ALERT_SEVERITIES,
  ALERT_LIFECYCLES,
  ALERT_EVENT_TYPES,
  ALERT_RULES_CONFIG,
} from "./alertRules.config.js";
import { AlertDeduplicator } from "./alertDeduplicator.js";

export class AlertEngineService {
  /**
   * Evaluates all alert rules for a specific authenticated user.
   *
   * @param {string} userId
   * @returns {Promise<{ evaluatedCrops: number, evaluatedFarms: number, createdAlerts: number }>}
   */
  static async evaluateUserAlerts(userId) {
    if (!userId) return { evaluatedCrops: 0, evaluatedFarms: 0, createdAlerts: 0 };

    // 1. Fetch user preferences / settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });
    if (!settings) {
      settings = {
        harvestWindowAlerts: true,
        weatherCautions: true,
        predictionChangeAlerts: true,
        cropHealthAlerts: true,
        yieldAlerts: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        minSeverity: "info",
      };
    }

    // Check quiet hours
    const isQuiet = AlertDeduplicator.isQuietHours(
      settings.quietHoursStart ? `${settings.quietHoursStart}:00` : null,
      settings.quietHoursEnd ? `${settings.quietHoursEnd}:00` : null
    );

    // 2. Load user's farms and crops
    const farms = await prisma.farm.findMany({
      where: { userId },
      include: {
        crops: {
          include: {
            harvestPredictions: {
              orderBy: { createdAt: "desc" },
              take: 2,
            },
            yieldPredictions: {
              orderBy: { createdAt: "desc" },
              take: 2,
            },
            weatherAssessments: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        weatherAssessments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    let createdAlerts = 0;
    let evaluatedCrops = 0;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    for (const farm of farms) {
      // ----------------------------------------------------
      // A. Evaluate Farm-Level Weather Intelligence Risks
      // ----------------------------------------------------
      if (settings.weatherCautions) {
        const latestWeather = farm.weatherAssessments[0];
        if (latestWeather) {
          const riskScore = latestWeather.overallRiskScore || 0;
          const isCaution = latestWeather.harvestSuitability === "CAUTION" || latestWeather.harvestSuitability === "UNFAVORABLE";

          if (riskScore >= 60 || isCaution) {
            const severity = riskScore >= 80 ? ALERT_SEVERITIES.CRITICAL : ALERT_SEVERITIES.HIGH;

            if (AlertDeduplicator.meetsSeverityThreshold(severity, settings.minSeverity)) {
              if (!isQuiet || severity === ALERT_SEVERITIES.CRITICAL) {
                const dedupKey = AlertDeduplicator.generateKey({
                  userId,
                  farmId: farm.id,
                  eventType: ALERT_EVENT_TYPES.WEATHER_RISK_ESCALATION,
                  bucket: todayStr,
                });

                const existing = await AlertDeduplicator.findExistingActiveAlert(dedupKey);
                if (!existing) {
                  await prisma.notification.create({
                    data: {
                      userId,
                      farmId: farm.id,
                      type: "weather",
                      severity,
                      title: `Adverse Weather Alert: ${farm.name}`,
                      message: `Overall weather risk evaluated at ${riskScore}/100 with status ${latestWeather.harvestSuitability}. Urgency: ${latestWeather.urgency || "HIGH"}.`,
                      recommendedAction: "Review hourly precipitation and wind forecasts before scheduling cutting or drying.",
                      actionUrl: `/app/weather?farmId=${farm.id}`,
                      dedupKey,
                      status: ALERT_LIFECYCLES.ACTIVE,
                      expiresAt: new Date(Date.now() + 24 * 3600 * 1000), // 24 hours
                    },
                  });
                  createdAlerts++;
                }
              }
            }
          }
        }
      }

      // ----------------------------------------------------
      // B. Evaluate Crops on this Farm
      // ----------------------------------------------------
      for (const crop of farm.crops) {
        evaluatedCrops++;

        // 1. Upcoming Harvest Window Alerts
        if (settings.harvestWindowAlerts) {
          const prediction = crop.harvestPredictions[0];
          let harvestDate = prediction?.mostLikelyHarvestDate || crop.expectedHarvestDate;

          if (harvestDate) {
            const hDate = new Date(harvestDate);
            const diffTime = hDate.getTime() - now.getTime();
            const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const winStart = prediction?.estimatedHarvestStart ? new Date(prediction.estimatedHarvestStart) : new Date(hDate.getTime() - 3 * 86400000);
            const winEnd = prediction?.estimatedHarvestEnd ? new Date(prediction.estimatedHarvestEnd) : new Date(hDate.getTime() + 4 * 86400000);

            // Condition 1: Harvest window open right now
            if (now >= winStart && now <= winEnd) {
              const dedupKey = AlertDeduplicator.generateKey({
                userId,
                farmId: farm.id,
                cropId: crop.id,
                eventType: ALERT_EVENT_TYPES.HARVEST_WINDOW_OPEN,
                bucket: todayStr,
              });

              const existing = await AlertDeduplicator.findExistingActiveAlert(dedupKey);
              if (!existing && AlertDeduplicator.meetsSeverityThreshold(ALERT_SEVERITIES.HIGH, settings.minSeverity)) {
                await prisma.notification.create({
                  data: {
                    userId,
                    farmId: farm.id,
                    cropId: crop.id,
                    type: "harvest",
                    severity: ALERT_SEVERITIES.HIGH,
                    title: `Harvest Window Active: ${crop.cropName}`,
                    message: `${crop.cropName} on ${farm.name} is within its optimal harvest window (${winStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${winEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}).`,
                    recommendedAction: "Inspect field maturity (grain moisture/pod shattering resistance) and initiate harvesting operations.",
                    actionUrl: `/app/crops/${crop.id}`,
                    dedupKey,
                    status: ALERT_LIFECYCLES.ACTIVE,
                    expiresAt: winEnd,
                  },
                });
                createdAlerts++;
              }
            }
            // Condition 2: Harvest window approaching (1 to 7 days away)
            else if (daysUntil > 0 && daysUntil <= ALERT_RULES_CONFIG.harvest.approachingDaysThreshold) {
              const dedupKey = AlertDeduplicator.generateKey({
                userId,
                farmId: farm.id,
                cropId: crop.id,
                eventType: ALERT_EVENT_TYPES.HARVEST_WINDOW_APPROACHING,
                bucket: todayStr,
              });

              const existing = await AlertDeduplicator.findExistingActiveAlert(dedupKey);
              if (!existing && AlertDeduplicator.meetsSeverityThreshold(ALERT_SEVERITIES.MEDIUM, settings.minSeverity)) {
                await prisma.notification.create({
                  data: {
                    userId,
                    farmId: farm.id,
                    cropId: crop.id,
                    type: "harvest",
                    severity: ALERT_SEVERITIES.MEDIUM,
                    title: `Harvest Approaching in ${daysUntil} Day${daysUntil > 1 ? "s" : ""}: ${crop.cropName}`,
                    message: `Estimated harvest date is ${hDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`,
                    recommendedAction: "Finalize storage facilities, tarpaulins, labour, and transport logistics.",
                    actionUrl: `/app/crops/${crop.id}`,
                    dedupKey,
                    status: ALERT_LIFECYCLES.ACTIVE,
                    expiresAt: hDate,
                  },
                });
                createdAlerts++;
              }
            }
          }
        }

        // 2. Material Prediction Change Alerts
        if (settings.predictionChangeAlerts && crop.harvestPredictions.length >= 2) {
          const [currPred, prevPred] = crop.harvestPredictions;
          const currDate = new Date(currPred.mostLikelyHarvestDate);
          const prevDate = new Date(prevPred.mostLikelyHarvestDate);
          const diffDays = Math.round(Math.abs(currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays >= ALERT_RULES_CONFIG.predictionChange.dateShiftDaysThreshold) {
            const dedupKey = AlertDeduplicator.generateKey({
              userId,
              farmId: farm.id,
              cropId: crop.id,
              eventType: ALERT_EVENT_TYPES.PREDICTION_DATE_CHANGE,
              bucket: `${currPred.id}`,
            });

            const existing = await AlertDeduplicator.findExistingActiveAlert(dedupKey);
            if (!existing && AlertDeduplicator.meetsSeverityThreshold(ALERT_SEVERITIES.MEDIUM, settings.minSeverity)) {
              await prisma.notification.create({
                data: {
                  userId,
                  farmId: farm.id,
                  cropId: crop.id,
                  type: "prediction_change",
                  severity: ALERT_SEVERITIES.MEDIUM,
                  title: `Harvest Timeline Shifted: ${crop.cropName}`,
                  message: `Predicted harvest shifted by ${diffDays} days from ${prevDate.toLocaleDateString()} to ${currDate.toLocaleDateString()} based on updated weather observations and GDD accumulation.`,
                  recommendedAction: "Review updated forecast trajectory to adjust scheduling.",
                  actionUrl: `/app/crops/${crop.id}`,
                  dedupKey,
                  status: ALERT_LIFECYCLES.ACTIVE,
                  expiresAt: new Date(Date.now() + 7 * 86400000),
                },
              });
              createdAlerts++;
            }
          }
        }

        // 3. Yield Estimate Shift Alerts
        if (settings.yieldAlerts && crop.yieldPredictions.length >= 2) {
          const [currYield, prevYield] = crop.yieldPredictions;
          const currVal = Number(currYield.predictedYieldTonnesPerHectare);
          const prevVal = Number(prevYield.predictedYieldTonnesPerHectare);

          if (prevVal > 0) {
            const pctChange = Math.abs((currVal - prevVal) / prevVal) * 100;
            if (pctChange >= ALERT_RULES_CONFIG.predictionChange.yieldShiftPercentThreshold) {
              const dedupKey = AlertDeduplicator.generateKey({
                userId,
                farmId: farm.id,
                cropId: crop.id,
                eventType: ALERT_EVENT_TYPES.PREDICTION_YIELD_CHANGE,
                bucket: `${currYield.id}`,
              });

              const existing = await AlertDeduplicator.findExistingActiveAlert(dedupKey);
              if (!existing && AlertDeduplicator.meetsSeverityThreshold(ALERT_SEVERITIES.MEDIUM, settings.minSeverity)) {
                await prisma.notification.create({
                  data: {
                    userId,
                    farmId: farm.id,
                    cropId: crop.id,
                    type: "prediction_change",
                    severity: ALERT_SEVERITIES.MEDIUM,
                    title: `Yield Forecast Revised: ${crop.cropName}`,
                    message: `Forecast revised by ${pctChange.toFixed(1)}% (from ${prevVal.toFixed(2)} to ${currVal.toFixed(2)} t/ha).`,
                    recommendedAction: "Check yield drivers and soil nutrient adjustments.",
                    actionUrl: `/app/crops/${crop.id}`,
                    dedupKey,
                    status: ALERT_LIFECYCLES.ACTIVE,
                    expiresAt: new Date(Date.now() + 7 * 86400000),
                  },
                });
                createdAlerts++;
              }
            }
          }
        }
      }
    }

    // ----------------------------------------------------
    // C. Evaluate Crop Health Scans
    // ----------------------------------------------------
    if (settings.cropHealthAlerts) {
      const recentScans = await prisma.cropHealthAnalysis.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 48 * 3600 * 1000), // last 48 hours
          },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      });

      for (const scan of recentScans) {
        const isDiseased = scan.conditionCategory?.toLowerCase() !== "healthy" && !scan.predictedClassName?.toLowerCase().includes("healthy");
        const confidenceVal = Number(scan.confidence || 0);

        if (isDiseased && confidenceVal >= ALERT_RULES_CONFIG.cropHealth.minConfidenceThreshold) {
          const dedupKey = AlertDeduplicator.generateKey({
            userId,
            farmId: scan.farmId || "farm",
            cropId: scan.cropId || "crop",
            eventType: ALERT_EVENT_TYPES.CROP_HEALTH_CONCERN,
            bucket: scan.id,
          });

          const existing = await AlertDeduplicator.findExistingActiveAlert(dedupKey);
          if (!existing && AlertDeduplicator.meetsSeverityThreshold(ALERT_SEVERITIES.HIGH, settings.minSeverity)) {
            await prisma.notification.create({
              data: {
                userId,
                farmId: scan.farmId || null,
                cropId: scan.cropId || null,
                type: "crop_health",
                severity: ALERT_SEVERITIES.HIGH,
                title: `Disease Alert: ${scan.predictedClassName} on ${scan.cropName}`,
                message: `Leaf analysis identified ${scan.predictedClassName} (${(confidenceVal * 100).toFixed(0)}% confidence).`,
                recommendedAction: "Inspect field location and apply recommended integrated pest/disease control measures.",
                actionUrl: `/app/crop-health`,
                dedupKey,
                status: ALERT_LIFECYCLES.ACTIVE,
                expiresAt: new Date(Date.now() + 14 * 86400000),
              },
            });
            createdAlerts++;
          }
        }
      }
    }

    // Run expiration cleanup
    await AlertDeduplicator.expireStaleNotifications();

    return {
      evaluatedFarms: farms.length,
      evaluatedCrops,
      createdAlerts,
    };
  }

  /**
   * System-wide evaluation for all registered users (used by background scheduler).
   */
  static async evaluateAllUsers() {
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    let totalCreated = 0;
    for (const u of users) {
      try {
        const res = await this.evaluateUserAlerts(u.id);
        totalCreated += res.createdAlerts;
      } catch (err) {
        console.error(`[AlertEngine] Evaluation failed for user ${u.id}:`, err.message);
      }
    }

    return { usersEvaluated: users.length, totalCreated };
  }
}
