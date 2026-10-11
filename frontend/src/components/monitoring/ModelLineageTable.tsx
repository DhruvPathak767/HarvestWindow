import React from "react";
import { ModelRegistryResponse, ModelRegistryItem } from "@/types";
import {
  GitCommit,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles
} from "lucide-react";

interface Props {
  registry: ModelRegistryResponse | null;
  loading?: boolean;
  onPromote?: (version: string) => void;
  isAdmin?: boolean;
}

export const ModelLineageTable: React.FC<Props> = ({
  registry,
  loading,
  onPromote,
  isAdmin,
}) => {
  if (loading) {
    return <div className="h-64 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />;
  }

  if (!registry) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <span>MLflow Model Registry & Lineage</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Tracking versioned models, validation checkpoints, and controlled deployment gates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full font-medium">
            Active: {registry.activeModel.modelVersion}
          </span>
        </div>
      </div>

      {/* Models Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-medium">
              <th className="pb-3 pr-4">Model Name & Version</th>
              <th className="pb-3 px-4">Algorithm Architecture</th>
              <th className="pb-3 px-4">Validation MAE</th>
              <th className="pb-3 px-4">Status</th>
              <th className="pb-3 px-4">Registered Date</th>
              {isAdmin && <th className="pb-3 pl-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {registry.models.map((m) => (
              <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="py-3 pr-4 font-medium text-white flex items-center space-x-2">
                  <GitCommit className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div>
                    <span>{m.modelVersion}</span>
                    <span className="text-[10px] text-slate-500 block">{m.modelName}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-300">{m.algorithm}</td>
                <td className="py-3 px-4 font-mono">
                  {m.validationMae !== null ? `${m.validationMae}d` : "Baseline"}
                </td>
                <td className="py-3 px-4">
                  {m.isActive ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Production</span>
                    </span>
                  ) : m.promotionStatus === "CANDIDATE" ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                      <Sparkles className="w-3 h-3" />
                      <span>Candidate</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                      {m.promotionStatus}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-400">
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
                {isAdmin && (
                  <td className="py-3 pl-4 text-right">
                    {!m.isActive && m.promotionStatus !== "REJECTED" && (
                      <button
                        onClick={() => onPromote && onPromote(m.modelVersion)}
                        className="text-[11px] font-semibold px-2.5 py-1 bg-purple-600/80 hover:bg-purple-600 text-white rounded transition-colors inline-flex items-center space-x-1"
                      >
                        <span>Promote</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MLflow Local Run Lineage */}
      {registry.mlflowRuns && registry.mlflowRuns.length > 0 && (
        <div className="pt-4 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Recent MLflow Tracking Runs</span>
          </h4>
          <div className="space-y-2">
            {registry.mlflowRuns.slice(0, 5).map((run, idx) => (
              <div
                key={idx}
                className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono text-purple-300 text-[11px] block">{run.run_id}</span>
                  <span className="text-slate-400 text-[10px]">
                    {run.run_name || "Training Run"} • Status: {run.status}
                  </span>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-300">
                  {run.metrics?.candidate_mae && `Candidate MAE: ${run.metrics.candidate_mae.toFixed(2)}d`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
