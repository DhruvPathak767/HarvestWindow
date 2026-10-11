import React from "react";
import {
  TrendingUp,
  Target,
  Calendar,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  Percent
} from "lucide-react";
import { ModelAccuracySummary } from "@/types";

interface Props {
  summary: ModelAccuracySummary | null;
  loading?: boolean;
}

export const ModelAccuracyOverview: React.FC<Props> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-800/40 rounded-xl border border-slate-700/50" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const isInsuff = summary.isInsufficientData;

  return (
    <div className="space-y-4">
      {/* Insufficient data notification banner */}
      {isInsuff && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start space-x-3 text-amber-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
          <div className="text-sm">
            <span className="font-semibold block">Preliminary Evaluation Sample</span>
            {summary.warnings.length > 0
              ? summary.warnings[0]
              : `Sample size (${summary.totalEvaluated}) is preliminary. Statistical metrics require at least 5 verified harvest outcomes.`}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mean Absolute Error */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Mean Absolute Error (MAE)</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {summary.meanAbsoluteError !== null ? `${summary.meanAbsoluteError.toFixed(1)}d` : "N/A"}
            </span>
            <span className="text-xs text-slate-400">average error</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Signed Bias: {summary.meanSignedError !== null ? `${summary.meanSignedError > 0 ? "+" : ""}${summary.meanSignedError.toFixed(1)}d` : "N/A"}</span>
            <span className="text-slate-500">{summary.meanSignedError && summary.meanSignedError > 0 ? "Late tendency" : "Early tendency"}</span>
          </div>
        </div>

        {/* Exact Date & Tolerance Accuracy */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Within ±3 Days</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {summary.within3DaysPct !== null ? `${summary.within3DaysPct}%` : "N/A"}
            </span>
            <span className="text-xs text-slate-400">of predictions</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Exact match: {summary.exactDateAccuracyPct !== null ? `${summary.exactDateAccuracyPct}%` : "N/A"}</span>
            <span>Within ±7d: {summary.within7DaysPct !== null ? `${summary.within7DaysPct}%` : "N/A"}</span>
          </div>
        </div>

        {/* Harvest Window Coverage */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Window Coverage</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {summary.windowCoveragePct !== null ? `${summary.windowCoveragePct}%` : "N/A"}
            </span>
            <span className="text-xs text-slate-400">inside window</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>RMSE: {summary.rootMeanSquaredError !== null ? `${summary.rootMeanSquaredError.toFixed(1)}d` : "N/A"}</span>
            <span className="text-slate-500">penalizes outliers</span>
          </div>
        </div>

        {/* Sample Count & Active Model */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Evaluated Outcomes</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {summary.totalEvaluated}
            </span>
            <span className="text-xs text-slate-400">verified pairs</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 truncate flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="truncate">Active: {summary.modelVersion}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
