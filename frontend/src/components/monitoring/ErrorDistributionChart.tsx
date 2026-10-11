import React, { useMemo } from "react";
import { PredictionEvaluation } from "@/types";
import { BarChart3, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";

interface Props {
  evaluations: PredictionEvaluation[];
  subgroups?: Record<string, any>;
  loading?: boolean;
}

export const ErrorDistributionChart: React.FC<Props> = ({ evaluations, subgroups, loading }) => {
  const bins = useMemo(() => {
    const buckets = [
      { label: "<-7d (Early)", min: -Infinity, max: -8, count: 0, color: "bg-amber-500/80" },
      { label: "-7 to -4d", min: -7, max: -4, count: 0, color: "bg-sky-500/80" },
      { label: "-3 to -1d", min: -3, max: -1, count: 0, color: "bg-emerald-400/80" },
      { label: "Exact 0d", min: 0, max: 0, count: 0, color: "bg-emerald-500" },
      { label: "+1 to +3d", min: 1, max: 3, count: 0, color: "bg-emerald-400/80" },
      { label: "+4 to +7d", min: 4, max: 7, count: 0, color: "bg-sky-500/80" },
      { label: ">+7d (Late)", min: 8, max: Infinity, count: 0, color: "bg-amber-500/80" },
    ];

    for (const ev of evaluations) {
      const err = ev.errorDays;
      for (const b of buckets) {
        if (err >= b.min && err <= b.max) {
          b.count++;
          break;
        }
      }
    }
    return buckets;
  }, [evaluations]);

  const maxBinCount = Math.max(...bins.map((b) => b.count), 1);

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 h-64 animate-pulse" />
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>Harvest Date Error Distribution</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Days difference: Actual Harvest Date minus Predicted Date (Positive = Late, Negative = Early)
          </p>
        </div>
        <span className="text-xs text-slate-400 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/50">
          N = {evaluations.length} observations
        </span>
      </div>

      {evaluations.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          No evaluated predictions available to graph distribution.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Histogram Bar Visualization */}
          <div className="grid grid-cols-7 gap-2 h-44 items-end pt-4 px-2 border-b border-slate-800">
            {bins.map((b, idx) => {
              const heightPct = Math.max(12, Math.round((b.count / maxBinCount) * 100));
              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  <span className="text-xs font-semibold text-white mb-1.5 opacity-90 group-hover:scale-110 transition-transform">
                    {b.count}
                  </span>
                  <div className="w-full bg-slate-800/40 rounded-t-md h-full flex items-end">
                    <div
                      className={`w-full ${b.color} rounded-t-md transition-all duration-500`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 text-center mt-2 truncate w-full" title={b.label}>
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Subgroup Insights Breakdown */}
          {subgroups && Object.keys(subgroups).length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Subgroup Accuracy Breakdown
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(subgroups).map(([name, data]: [string, any]) => (
                  <div
                    key={name}
                    className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-white block">{name}</span>
                      <span className="text-slate-400 text-[11px]">
                        MAE: {data.mean_absolute_error !== null ? `${data.mean_absolute_error}d` : "N/A"} • N={data.total_evaluated || 0}
                      </span>
                    </div>
                    {data.is_insufficient_data ? (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        Provisional
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
