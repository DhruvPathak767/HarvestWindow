import React, { useState } from "react";
import {
  TrendingUp,
  Scale,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/common/ui";
import { useYieldPrediction } from "@/hooks/useYieldPrediction";
import { YieldSkeleton } from "./YieldSkeleton";
import { RecordActualProductionModal } from "./RecordActualProductionModal";
import type { PredictionStage, ConfidenceLevel } from "@/types";

interface Props {
  cropId: string;
  cropName: string;
}

const STAGE_LABELS: Record<PredictionStage, { label: string; color: string }> = {
  BEFORE_SOWING: { label: "Pre-Sowing Forecast", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  VEGETATIVE: { label: "Vegetative Stage", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  MID_SEASON: { label: "Mid-Season Estimate", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  NEAR_HARVEST: { label: "Pre-Harvest Estimate", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  POST_HARVEST: { label: "Post-Harvest Complete", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
};

const CONFIDENCE_BADGES: Record<ConfidenceLevel, { label: string; color: string }> = {
  HIGH: { label: "High Confidence", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  MODERATE: { label: "Moderate Confidence", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  LOW: { label: "Preliminary / Low", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
};

export function YieldPredictionCard({ cropId, cropName }: Props) {
  const {
    prediction,
    loading,
    refreshing,
    recording,
    error,
    refreshPrediction,
    recordActualHarvest,
  } = useYieldPrediction(cropId);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (loading && !prediction) {
    return <YieldSkeleton />;
  }

  if (error && !prediction) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground text-sm">Yield Prediction Unavailable</h3>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refreshPrediction()}
              className="mt-2 text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Assessment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!prediction) return null;

  const stageCfg = STAGE_LABELS[prediction.predictionStage] || STAGE_LABELS.MID_SEASON;
  const confCfg = CONFIDENCE_BADGES[prediction.confidence] || CONFIDENCE_BADGES.MODERATE;

  // Convert t/ha to quintals per acre: 1 t/ha ≈ 4.04686 quintals / acre
  const yieldQuintalsPerAcre = (prediction.yield.value * 4.04686).toFixed(1);

  const handleRecordSubmit = async (data: {
    quantity: number;
    unit: string;
    harvestDate: string;
    notes?: string;
  }) => {
    await recordActualHarvest(data);
    setSaveSuccessMsg(`Recorded ${data.quantity} ${data.unit} successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">
              Yield Forecasting & Production Estimates
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Machine learning forecast trained on Indian agro-climatic datasets with calibrated prediction bounds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${stageCfg.color}`}
          >
            {stageCfg.label}
          </span>
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${confCfg.color}`}
          >
            {confCfg.label}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshPrediction()}
            disabled={refreshing}
            className="text-xs gap-1.5 h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Predicted Yield */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Predicted Yield</span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">
              {prediction.yield.value.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">t / ha</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            ≈ <span className="font-semibold text-foreground">{yieldQuintalsPerAcre}</span> quintals / acre
          </div>
        </div>

        {/* KPI 2: Total Production */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between text-xs text-primary font-medium">
            <span>Expected Total Production</span>
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-primary">
              {prediction.production.value.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-primary">Tonnes</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            On <span className="font-semibold text-foreground">{prediction.plantedArea.value} {prediction.plantedArea.unit.toLowerCase()}</span> ({prediction.plantedArea.areaHectares.toFixed(2)} ha)
          </div>
        </div>

        {/* KPI 3: Calibrated Uncertainty Range */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>80% Prediction Interval</span>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </div>
          {prediction.uncertainty.available &&
          prediction.uncertainty.lowerYieldTonnesPerHectare &&
          prediction.uncertainty.upperYieldTonnesPerHectare ? (
            <>
              <div className="flex items-baseline gap-1.5 text-sm font-bold text-foreground">
                <span>{prediction.uncertainty.lowerYieldTonnesPerHectare.toFixed(2)}</span>
                <span className="text-muted-foreground">–</span>
                <span>{prediction.uncertainty.upperYieldTonnesPerHectare.toFixed(2)}</span>
                <span className="text-xs font-normal text-muted-foreground">t/ha</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Production bounds:{" "}
                <span className="font-medium text-foreground">
                  {prediction.uncertainty.lowerProductionTonnes?.toFixed(1) ?? "—"} –{" "}
                  {prediction.uncertainty.upperProductionTonnes?.toFixed(1) ?? "—"} T
                </span>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground pt-1">
              Deterministic point estimate
            </div>
          )}
        </div>
      </div>

      {/* Model & Quality Details */}
      <div className="p-3.5 rounded-xl bg-background border border-border/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>
            Algorithm: <strong className="text-foreground font-medium">{prediction.model.algorithm}</strong>
          </span>
          <span className="text-border">•</span>
          <span>
            Version: <strong className="text-foreground font-medium">{prediction.model.version}</strong>
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsRecordModalOpen(true)}
          className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 self-start sm:self-auto"
        >
          <Scale className="w-3.5 h-3.5" />
          Record Realized Harvest
        </Button>
      </div>

      {/* Data Quality Warnings */}
      {prediction.dataQuality.warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Agronomic Data Notes:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
            {prediction.dataQuality.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Record Harvest Modal */}
      <RecordActualProductionModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        cropName={cropName}
        onSubmit={handleRecordSubmit}
        loading={recording}
      />
    </div>
  );
}
