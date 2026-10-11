import { useState } from "react";
import {
  CloudLightning,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Info,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
} from "lucide-react";
import { Card, CardHeader, Button, Badge } from "@/components/common/ui";
import { WeatherRiskBreakdown } from "./WeatherRiskBreakdown";
import { WeatherEventTimeline } from "./WeatherEventTimeline";
import { WeatherRecommendations } from "./WeatherRecommendations";
import { WeatherRiskSkeleton } from "./WeatherRiskSkeleton";
import type { WeatherRiskAssessment, HarvestSuitability, RiskUrgency } from "@/types";
import { relativeTime } from "@/utils/date";
import { cn } from "@/utils/cn";

interface Props {
  assessment: WeatherRiskAssessment | null;
  loading: boolean;
  refreshing: boolean;
  error?: string | null;
  onRefresh: () => void | Promise<void>;
  cropName: string;
}

export function WeatherRiskCard({
  assessment,
  loading,
  refreshing,
  error,
  onRefresh,
  cropName,
}: Props) {
  if (loading && !assessment) {
    return <WeatherRiskSkeleton />;
  }

  if (error && !assessment) {
    return (
      <Card className="p-6 border-amber-200 bg-amber-50/50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-amber-900">Weather Risk Assessment Unavailable</h3>
            <p className="text-xs text-amber-800 leading-relaxed">{error}</p>
            <Button size="sm" variant="secondary" onClick={onRefresh} loading={refreshing}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry Assessment
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!assessment) {
    return (
      <Card className="p-6 border-line text-center">
        <div className="max-w-sm mx-auto space-y-3 py-4">
          <CloudLightning className="w-8 h-8 text-muted mx-auto" />
          <h3 className="text-sm font-semibold text-forest-deep">No Weather Assessment Yet</h3>
          <p className="text-xs text-muted leading-relaxed">
            Generate real-time weather risk evaluation for {cropName} across the upcoming harvest horizon.
          </p>
          <Button size="sm" variant="primary" onClick={onRefresh} loading={refreshing}>
            Calculate Weather Risk
          </Button>
        </div>
      </Card>
    );
  }

  const {
    overallRiskScore,
    harvestSuitability,
    urgency,
    confidence,
    risks,
    recommendations,
    explanation,
    harvestWindow,
    forecastCoverage,
    source,
  } = assessment;

  function getSuitabilityMeta(s: HarvestSuitability) {
    switch (s) {
      case "FAVORABLE":
        return {
          label: "Favorable Harvest Window",
          color: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: ShieldCheck,
          barColor: "bg-emerald-500",
        };
      case "CAUTION":
        return {
          label: "Caution Advised",
          color: "bg-amber-100 text-amber-800 border-amber-300",
          icon: AlertTriangle,
          barColor: "bg-amber-500",
        };
      case "UNFAVORABLE":
        return {
          label: "Unfavorable Weather Risk",
          color: "bg-red-100 text-red-800 border-red-300",
          icon: AlertTriangle,
          barColor: "bg-red-500",
        };
      default:
        return {
          label: "Insufficient Data",
          color: "bg-slate-100 text-slate-800 border-slate-300",
          icon: Info,
          barColor: "bg-slate-400",
        };
    }
  }

  function getUrgencyBadge(u: RiskUrgency) {
    switch (u) {
      case "CRITICAL":
        return "bg-red-600 text-white animate-pulse";
      case "HIGH":
        return "bg-orange-500 text-white";
      case "MEDIUM":
        return "bg-amber-500 text-white";
      default:
        return "bg-emerald-600 text-white";
    }
  }

  const meta = getSuitabilityMeta(harvestSuitability);
  const SuitabilityIcon = meta.icon;

  return (
    <Card className="border-line overflow-hidden shadow-sm">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <CloudLightning className="w-4 h-4 text-forest" />
            <span>Weather Intelligence & Harvest Risk</span>
          </div>
        }
        subtitle="Evaluating 10-day meteorological forecasts against harvest window, crop lodging sensitivity, and drying requirements."
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={onRefresh}
            loading={refreshing}
            className="h-8 text-[12px]"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="p-6 pt-3 space-y-6">
        {/* Top Header Summary Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border bg-soft/60">
          <div className="flex items-start md:items-center gap-3.5">
            <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border", meta.color)}>
              <SuitabilityIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold text-forest-deep text-[16px]">
                  {meta.label}
                </span>
                <span className={cn("px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider", getUrgencyBadge(urgency))}>
                  {urgency} Urgency
                </span>
                <span className="text-[11px] font-medium text-muted px-2 py-0.5 rounded border border-line bg-white">
                  {confidence} Confidence
                </span>
              </div>
              <p className="text-[12.5px] text-muted mt-0.5">
                Composite harvest risk score:{" "}
                <span className="font-bold text-forest-deep">{overallRiskScore}/100</span>
                {source?.provider ? ` • Source: ${source.provider}` : ""}
              </p>
            </div>
          </div>

          <div className="w-full md:w-48 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted mb-1">
              <span>Risk Severity</span>
              <span>{overallRiskScore}%</span>
            </div>
            <div className="w-full bg-line/80 rounded-full h-2 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", meta.barColor)}
                style={{ width: `${Math.max(4, overallRiskScore)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4 Risk Dimension Cards */}
        <WeatherRiskBreakdown risks={risks} overallScore={overallRiskScore} />

        {/* Forecast Timeline & Harvest Window Overlap */}
        <div className="border-t border-line/60 pt-4">
          <WeatherEventTimeline
            risks={risks}
            harvestWindow={harvestWindow}
            forecastCoverage={forecastCoverage}
          />
        </div>

        {/* Recommendations & Actionable Guidance */}
        <div className="border-t border-line/60">
          <WeatherRecommendations
            recommendations={recommendations}
            explanation={explanation}
          />
        </div>
      </div>
    </Card>
  );
}
