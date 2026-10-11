import React from "react";
import { DriftAssessmentItem, DriftSeverity } from "@/types";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  TrendingDown,
  Info
} from "lucide-react";

interface Props {
  assessments: DriftAssessmentItem[];
  loading?: boolean;
}

export const DriftStatusCard: React.FC<Props> = ({ assessments, loading }) => {
  if (loading) {
    return <div className="h-64 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />;
  }

  const primary = assessments.length > 0 ? assessments[0] : null;

  const getSeverityBadge = (sev: DriftSeverity) => {
    switch (sev) {
      case "NORMAL":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          label: "Normal / Stable",
          style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        };
      case "WATCH":
        return {
          icon: <Activity className="w-4 h-4 text-sky-400" />,
          label: "Watch List",
          style: "bg-sky-500/10 text-sky-400 border-sky-500/30",
        };
      case "WARNING":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          label: "Drift Warning",
          style: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      case "CRITICAL":
        return {
          icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
          label: "Degradation Alert",
          style: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        };
      case "INSUFFICIENT_DATA":
      default:
        return {
          icon: <HelpCircle className="w-4 h-4 text-slate-400" />,
          label: "Insufficient Telemetry",
          style: "bg-slate-800 text-slate-400 border-slate-700",
        };
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-sky-400" />
            <span>Covariate Shift & Degradation Monitoring</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Population Stability Index (PSI) & Rolling MAE Error Surveillance
          </p>
        </div>
        {primary && (
          <div
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              getSeverityBadge(primary.severity).style
            }`}
          >
            {getSeverityBadge(primary.severity).icon}
            <span>{getSeverityBadge(primary.severity).label}</span>
          </div>
        )}
      </div>

      {!primary ? (
        <div className="text-center py-8 text-sm text-slate-400">
          No drift surveillance reports registered yet.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-xs">
              <span className="text-slate-400 block mb-1">Surveillance Type</span>
              <span className="font-semibold text-white">
                {primary.driftType.replace(/_/g, " ")}
              </span>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-xs">
              <span className="text-slate-400 block mb-1">Max Drift Score (PSI)</span>
              <span className="font-semibold text-white">
                {primary.driftScore ? primary.driftScore.toFixed(3) : "0.000"} (Threshold: {primary.threshold || 0.25})
              </span>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-xs">
              <span className="text-slate-400 block mb-1">Telemetric Window</span>
              <span className="font-semibold text-white">
                Ref N={primary.referenceSampleSize} • Current N={primary.currentSampleSize}
              </span>
            </div>
          </div>

          {/* Operational recommendations */}
          {primary.recommendations && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 flex items-start space-x-3 text-xs text-slate-300">
              <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block mb-0.5">Operational Guidance</span>
                <p>{primary.recommendations}</p>
              </div>
            </div>
          )}

          {/* Detailed feature breakdowns if available */}
          {primary.summaryDetails?.feature_drifts && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Feature Stability Breakdown
              </h4>
              <div className="space-y-2">
                {primary.summaryDetails.feature_drifts.map((fd, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-medium text-white">{fd.feature_name}</span>
                      <span className="text-[11px] text-slate-400 block">{fd.message}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                        getSeverityBadge(fd.severity).style
                      }`}
                    >
                      {fd.severity}
                    </span>
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
