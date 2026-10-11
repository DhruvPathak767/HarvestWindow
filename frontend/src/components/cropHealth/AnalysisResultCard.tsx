import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Activity,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  PhoneCall,
  ExternalLink,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/common/ui";
import type {
  CropHealthAnalysis,
  ConfidenceLevel,
  ConditionCategory,
  CropHealthPredictionStatus,
} from "@/types";
import { cn } from "@/utils/cn";

interface Props {
  analysis: CropHealthAnalysis;
  onReset?: () => void;
  onDelete?: (id: string) => Promise<void>;
  className?: string;
}

const CATEGORY_LABELS: Record<ConditionCategory, { label: string; color: string }> = {
  HEALTHY: { label: "Healthy Crop", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  FUNGAL_DISEASE: { label: "Fungal Infection", color: "bg-rose-500/10 text-rose-700 border-rose-500/30" },
  BACTERIAL_DISEASE: { label: "Bacterial Infection", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  VIRAL_DISEASE: { label: "Viral Infection", color: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
  PEST_DAMAGE: { label: "Pest Damage", color: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  NUTRIENT_OR_ENVIRONMENTAL_STRESS: { label: "Environmental Stress", color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  UNKNOWN_OR_UNSUPPORTED: { label: "Unfamiliar Condition", color: "bg-slate-500/10 text-slate-700 border-slate-500/30" },
};

const CONFIDENCE_BADGES: Record<ConfidenceLevel, { label: string; color: string; desc: string }> = {
  HIGH_CONFIDENCE: {
    label: "High Confidence",
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    desc: "Strong visual concordance with reference pathology patterns.",
  },
  MODERATE_CONFIDENCE: {
    label: "Moderate Confidence",
    color: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    desc: "Plausible pattern match; consider taking additional photos from other angles.",
  },
  LOW_CONFIDENCE: {
    label: "Low Confidence",
    color: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    desc: "Uncertain classification. Symptoms may be atypical or confounded by lighting.",
  },
  INCONCLUSIVE: {
    label: "Inconclusive",
    color: "bg-red-500/10 text-red-700 border-red-500/30",
    desc: "Cannot determine diagnosis. Image quality, blur, or unsupported crop detected.",
  },
};

export function AnalysisResultCard({
  analysis,
  onReset,
  onDelete,
  className,
}: Props) {
  const isHealthy = analysis.status === "HEALTHY" || analysis.conditionCategory === "HEALTHY";
  const isInconclusive = analysis.status === "INCONCLUSIVE" || analysis.confidenceLevel === "INCONCLUSIVE";
  const isUnfamiliar = analysis.status === "UNFAMILIAR";

  const categoryMeta =
    CATEGORY_LABELS[analysis.conditionCategory as ConditionCategory] ||
    CATEGORY_LABELS.UNKNOWN_OR_UNSUPPORTED;

  const confidenceMeta =
    CONFIDENCE_BADGES[analysis.confidenceLevel as ConfidenceLevel] ||
    CONFIDENCE_BADGES.MODERATE_CONFIDENCE;

  const recommendations = analysis.recommendations;

  return (
    <div className={cn("bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-6", className)}>
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
              isHealthy
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                : isInconclusive
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                : "bg-rose-500/10 border-rose-500/30 text-rose-600"
            )}
          >
            {isHealthy ? (
              <ShieldCheck className="w-6 h-6" />
            ) : isInconclusive ? (
              <HelpCircle className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold font-display text-forest-deep">
                {analysis.predictedClassName}
              </h2>
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border", categoryMeta.color)}>
                {categoryMeta.label}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Crop: <strong className="text-forest-deep">{analysis.crop}</strong>
              {analysis.scientificName && (
                <span className="italic ml-2 text-forest-deep/80">({analysis.scientificName})</span>
              )}
            </p>
          </div>
        </div>

        {/* Confidence Percentage & Badge */}
        <div className="text-left sm:text-right shrink-0">
          <div className="flex items-baseline gap-1.5 sm:justify-end">
            <span className="text-2xl font-extrabold font-display text-forest-deep">
              {(analysis.confidenceScore * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-muted">confidence</span>
          </div>
          <span className={cn("inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border mt-1", confidenceMeta.color)}>
            {confidenceMeta.label}
          </span>
        </div>
      </div>

      {/* 2. Quality Warnings Alert if any */}
      {analysis.qualityWarnings && analysis.qualityWarnings.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Image Quality Advisory</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11.5px]">
            {analysis.qualityWarnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Honest Diagnostic Assessment Box */}
      <div className="p-4 rounded-xl border border-line bg-cream/30 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-forest-deep uppercase tracking-wider">
          <Info className="w-3.5 h-3.5 text-forest" />
          <span>Diagnostic Interpretation</span>
        </div>
        <p className="text-xs text-forest-deep/85 leading-relaxed">
          {confidenceMeta.desc} Softmax model probability represents statistical pattern correspondence to training images and is not an absolute clinical guarantee. Always cross-reference with physical field observation.
        </p>
      </div>

      {/* 4. Alternative Classifications */}
      {analysis.alternatives && analysis.alternatives.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-forest-deep uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-forest" />
            Alternative Likely Classifications
          </h3>

          <div className="grid gap-2 sm:grid-cols-3">
            {analysis.alternatives.map((alt, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-line bg-cream/20 flex flex-col justify-between space-y-1.5"
              >
                <div>
                  <span className="text-[11px] text-muted block">{alt.crop}</span>
                  <span className="text-xs font-semibold text-forest-deep block truncate" title={alt.className}>
                    {alt.className}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-forest-deep mb-1">
                    <span>Likelihood</span>
                    <span>{(alt.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-forest-deep/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-forest rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(5, alt.confidence * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Visible Symptom Profile */}
      {recommendations?.symptomSummary && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-forest-deep uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-forest" />
            Verified Symptom Characteristics (ICAR / KVK)
          </h3>
          <p className="text-xs text-forest-deep/90 leading-relaxed p-3.5 rounded-xl border border-line bg-cream/15">
            {recommendations.symptomSummary}
          </p>
        </div>
      )}

      {/* 6. Actionable Agricultural Guidance */}
      {recommendations && (
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold text-forest-deep uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-living" />
            Recommended Next Steps & Preventive Management
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Immediate Field Steps */}
            {recommendations.immediateSteps && recommendations.immediateSteps.length > 0 && (
              <div className="p-3.5 rounded-xl border border-line bg-cream/30 space-y-2">
                <span className="text-xs font-bold text-forest-deep flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Immediate Field Inspection Steps
                </span>
                <ul className="space-y-1.5 text-xs text-forest-deep/85">
                  {recommendations.immediateSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-forest-deep/60 mt-0.5">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Non-Chemical & Preventive Practices */}
            {recommendations.preventiveMeasures && recommendations.preventiveMeasures.length > 0 && (
              <div className="p-3.5 rounded-xl border border-line bg-cream/30 space-y-2">
                <span className="text-xs font-bold text-forest-deep flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                  Non-Chemical & Cultural Prevention
                </span>
                <ul className="space-y-1.5 text-xs text-forest-deep/85">
                  {recommendations.preventiveMeasures.map((measure, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-forest-deep/60 mt-0.5">•</span>
                      <span>{measure}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Expert Consultation Notice (KVK / Agronomist) */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3">
            <PhoneCall className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-blue-900">When to Consult Local Agricultural Experts:</span>
              <p className="text-blue-800 leading-relaxed">
                {recommendations.expertGuidance ||
                  "If symptoms appear on more than 10-15% of plants or spread rapidly across field rows, immediately bring symptomatic leaf samples in a sealed plastic bag to your local Krishi Vigyan Kendra (KVK) or block agriculture extension officer."}
              </p>
              <p className="text-[11px] text-blue-900/80 font-medium pt-1">
                ⚠️ Chemical Safety Rule: Never spray chemical fungicides or pesticides based purely on an automated phone scan without local specialist confirmation and regulatory label adherence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7. Footer: Metadata & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60 text-[11px] text-muted">
        <div>
          <span>Model: <strong>{analysis.modelVersion}</strong></span>
          <span className="mx-2">·</span>
          <span>Scanned: {new Date(analysis.createdAt).toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-2">
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDelete(analysis.id)}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Record
            </Button>
          )}

          {onReset && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Scan Another Leaf
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
