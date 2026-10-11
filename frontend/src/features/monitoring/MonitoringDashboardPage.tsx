import React, { useState, useEffect } from "react";
import {
  Activity,
  BarChart3,
  Cpu,
  Layers,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Calendar,
  Sparkles,
  Search,
  Filter
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/common/ui";
import { monitoringApi } from "@/services/api";
import {
  ModelAccuracySummary,
  PredictionEvaluation,
  DriftAssessmentItem,
  ModelRegistryResponse,
  ModelEvaluationReportItem,
  MonitoringJobItem
} from "@/types";
import { ModelAccuracyOverview } from "@/components/monitoring/ModelAccuracyOverview";
import { ErrorDistributionChart } from "@/components/monitoring/ErrorDistributionChart";
import { DriftStatusCard } from "@/components/monitoring/DriftStatusCard";
import { ModelLineageTable } from "@/components/monitoring/ModelLineageTable";
import { cn } from "@/utils/cn";

type ActiveTab = "overview" | "drift" | "models" | "jobs";

export default function MonitoringDashboardPage() {
  const [tab, setTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data states
  const [accuracy, setAccuracy] = useState<ModelAccuracySummary | null>(null);
  const [evaluations, setEvaluations] = useState<PredictionEvaluation[]>([]);
  const [driftAssessments, setDriftAssessments] = useState<DriftAssessmentItem[]>([]);
  const [registry, setRegistry] = useState<ModelRegistryResponse | null>(null);
  const [reports, setReports] = useState<ModelEvaluationReportItem[]>([]);
  const [jobs, setJobs] = useState<MonitoringJobItem[]>([]);

  // Filters
  const [cropFilter, setCropFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, errsRes, driftRes, regRes, repRes, jobsRes] = await Promise.all([
        monitoringApi.getAccuracySummary({
          crop: cropFilter || undefined,
          region: regionFilter || undefined,
        }).catch(() => null),
        monitoringApi.getErrors({
          crop: cropFilter || undefined,
          region: regionFilter || undefined,
          limit: 50,
        }).catch(() => ({ items: [] })),
        monitoringApi.getDriftStatus().catch(() => ({ assessments: [] })),
        monitoringApi.getModelRegistry().catch(() => null),
        monitoringApi.getReports({ limit: 10 }).catch(() => ({ reports: [] })),
        monitoringApi.getMonitoringJobs({ limit: 15 }).catch(() => ({ jobs: [] })),
      ]);

      if (accRes) setAccuracy(accRes);
      if (errsRes?.items) setEvaluations(errsRes.items);
      if (driftRes?.assessments) setDriftAssessments(driftRes.assessments);
      if (regRes) setRegistry(regRes);
      if (repRes?.reports) setReports(repRes.reports);
      if (jobsRes?.jobs) setJobs(jobsRes.jobs);
    } catch (err) {
      console.error("[MonitoringDashboard] Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cropFilter, regionFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRunEvaluation = async () => {
    setActionLoading(true);
    try {
      const res = await monitoringApi.triggerEvaluation();
      showToast(`Evaluation completed! Evaluated ${res.recordsProcessed || 0} outcome records.`);
      await loadData();
    } catch (err: any) {
      showToast(`Evaluation failed: ${err?.message || "Unknown error"}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetrainCheck = async () => {
    setActionLoading(true);
    try {
      const res = await monitoringApi.triggerRetrainingCheck();
      const st = res.eligibility?.status || "INSUFFICIENT_DATA";
      showToast(`Retraining Check: Status is ${st}. ${res.eligibility?.recommended_action || ""}`);
      await loadData();
    } catch (err: any) {
      showToast(`Retrain check failed: ${err?.message || "Unknown error"}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteCandidate = async (modelVersion: string) => {
    if (!confirm(`Are you sure you want to promote candidate version '${modelVersion}' to active production?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await monitoringApi.promoteModel({ modelVersion });
      showToast(`Model version '${modelVersion}' successfully promoted to active production!`);
      await loadData();
    } catch (err: any) {
      showToast(`Promotion failed: ${err?.message || "Quality gates not satisfied."}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Prediction Monitoring & Continuous Improvement"
        subtitle="Phase AI-9: Closed-loop model accuracy evaluation, covariate drift surveillance, MLflow version lineage, and candidate retraining gates."
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-3.5 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Production Status Banner & Operational Actions */}
      <div className="p-4 rounded-2xl border border-line bg-card shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">
                Production Engine: {accuracy?.modelVersion || "2.0.0-agronomic-gdd-weather"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ACTIVE DEPLOYMENT
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evaluated {accuracy?.totalEvaluated || 0} verified harvest outcomes • MLflow persistent registry
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading || actionLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRetrainCheck}
            disabled={loading || actionLoading}
            className="flex items-center gap-1.5 text-xs text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Check Retraining Gates</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunEvaluation}
            disabled={loading || actionLoading}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{actionLoading ? "Processing..." : "Run Batch Evaluation"}</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-line pb-2">
        <button
          onClick={() => setTab("overview")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors",
            tab === "overview"
              ? "bg-forest/10 text-forest border border-forest/20 text-emerald-400"
              : "text-slate-400 hover:text-white"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Accuracy & Metrics</span>
        </button>

        <button
          onClick={() => setTab("drift")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors",
            tab === "drift"
              ? "bg-forest/10 text-forest border border-forest/20 text-emerald-400"
              : "text-slate-400 hover:text-white"
          )}
        >
          <Activity className="w-4 h-4" />
          <span>Covariate Drift Surveillance</span>
        </button>

        <button
          onClick={() => setTab("models")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors",
            tab === "models"
              ? "bg-forest/10 text-forest border border-forest/20 text-emerald-400"
              : "text-slate-400 hover:text-white"
          )}
        >
          <Cpu className="w-4 h-4" />
          <span>MLflow Model Lineage</span>
        </button>

        <button
          onClick={() => setTab("jobs")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors",
            tab === "jobs"
              ? "bg-forest/10 text-forest border border-forest/20 text-emerald-400"
              : "text-slate-400 hover:text-white"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Evaluation Reports & Scheduled Jobs</span>
        </button>
      </div>

      {/* Tab 1: Overview & Accuracy */}
      {tab === "overview" && (
        <div className="space-y-6">
          <ModelAccuracyOverview summary={accuracy} loading={loading} />
          <ErrorDistributionChart
            evaluations={evaluations}
            subgroups={accuracy?.subgroups}
            loading={loading}
          />
        </div>
      )}

      {/* Tab 2: Covariate Drift Telemetry */}
      {tab === "drift" && (
        <div className="space-y-6">
          <DriftStatusCard assessments={driftAssessments} loading={loading} />
        </div>
      )}

      {/* Tab 3: Model Lineage & Registry */}
      {tab === "models" && (
        <div className="space-y-6">
          <ModelLineageTable
            registry={registry}
            loading={loading}
            isAdmin={true}
            onPromote={handlePromoteCandidate}
          />
        </div>
      )}

      {/* Tab 4: Scheduled Jobs & Reports */}
      {tab === "jobs" && (
        <div className="space-y-6">
          {/* Historical Evaluation Reports */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Historical Model Evaluation Reports</span>
            </h3>
            {reports.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No archived evaluation reports. Run a batch evaluation job to create one.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3 pr-4">Report ID</th>
                      <th className="pb-3 px-4">Model Version</th>
                      <th className="pb-3 px-4">Evaluated Samples</th>
                      <th className="pb-3 px-4">MAE (Days)</th>
                      <th className="pb-3 px-4">Bias (Days)</th>
                      <th className="pb-3 px-4">Within ±3d %</th>
                      <th className="pb-3 pl-4">Generated At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {reports.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 pr-4 font-mono text-emerald-400">{r.reportId}</td>
                        <td className="py-3 px-4">{r.modelVersion}</td>
                        <td className="py-3 px-4">{r.totalEvaluated}</td>
                        <td className="py-3 px-4 font-mono">
                          {r.meanAbsoluteError !== null ? `${r.meanAbsoluteError.toFixed(2)}d` : "N/A"}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {r.meanSignedError !== null ? `${r.meanSignedError > 0 ? "+" : ""}${r.meanSignedError.toFixed(2)}d` : "N/A"}
                        </td>
                        <td className="py-3 px-4">{r.within3DaysPct !== null ? `${r.within3DaysPct}%` : "N/A"}</td>
                        <td className="py-3 pl-4 text-slate-400">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Job Runs Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-sky-400" />
              <span>Monitoring Job Runs</span>
            </h3>
            {jobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No background jobs executed yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3 pr-4">Job Type</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4">Records</th>
                      <th className="pb-3 px-4">Triggered By</th>
                      <th className="pb-3 pl-4">Started At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {jobs.map((j) => (
                      <tr key={j.id}>
                        <td className="py-3 pr-4 font-medium text-white">{j.jobType.replace(/_/g, " ")}</td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                              j.status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : j.status === "RUNNING"
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            )}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">{j.recordsProcessed}</td>
                        <td className="py-3 px-4 text-slate-400">{j.triggeredBy}</td>
                        <td className="py-3 pl-4 text-slate-400">
                          {new Date(j.startedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
