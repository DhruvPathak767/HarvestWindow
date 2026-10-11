import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Camera,
  Activity,
} from "lucide-react";
import { Card, CardHeader, Button } from "@/components/common/ui";
import { api } from "@/services/api";
import type { CropHealthAnalysis } from "@/types";
import { cn } from "@/utils/cn";

export function CropHealthWidget() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<CropHealthAnalysis[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadWidget() {
      try {
        const res = await api.getCropHealthHistory({ page: 1, limit: 3 });
        if (mounted && res?.analyses) {
          setAnalyses(res.analyses);
        }
      } catch (err: unknown) {
        console.warn("[CropHealthWidget] Failed to load scans:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadWidget();
    return () => {
      mounted = false;
    };
  }, []);

  const totalScans = analyses.length;
  const latestScan = analyses[0] || null;

  return (
    <Card className="border-line overflow-hidden">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-forest" />
            <span>Crop Health & Disease Intelligence</span>
          </div>
        }
        subtitle="Computer vision leaf pathology screening with verified ICAR advisory."
        action={
          <Link
            to="/app/crop-health"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-forest transition-colors hover:text-living"
          >
            Launch Health Scanner
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      />

      <div className="p-5 pt-3 space-y-4">
        {/* Quick Diagnostic Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-lg border border-line/60 bg-cream/40 flex flex-col justify-between">
            <span className="text-[12px] font-medium text-muted">Recent Scans</span>
            <p className="text-[22px] font-extrabold font-display text-forest-deep mt-1">
              {totalScans}
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 text-[12px] font-medium">
              <span>Supported Crops</span>
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-[13px] font-bold text-emerald-950 mt-1">
              Potato, Tomato, Corn, Grape, Apple
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-800 text-[12px] font-medium">
              <span>Pathology Model</span>
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-[13px] font-bold text-blue-950 mt-1">
              MobileNetV3 (25 Classes)
            </p>
          </div>
        </div>

        {/* Latest Scans List or Callout */}
        {latestScan ? (
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold text-forest-deep uppercase tracking-wider block">
              Latest Leaf Diagnoses
            </span>
            <div className="grid gap-2 sm:grid-cols-3">
              {analyses.map((scan) => {
                const isHealthy =
                  scan.status === "HEALTHY" || scan.conditionCategory === "HEALTHY";
                return (
                  <div
                    key={scan.id}
                    onClick={() => navigate("/app/crop-health")}
                    className="p-3 rounded-xl border border-line bg-cream/20 hover:bg-cream/50 transition-all cursor-pointer flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted font-medium">{scan.crop}</span>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
                            isHealthy
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          {(scan.confidenceScore * 100).toFixed(0)}% Conf.
                        </span>
                      </div>
                      <p className="text-xs font-bold text-forest-deep truncate mt-1">
                        {scan.predictedClassName}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] text-muted pt-1 border-t border-line/40">
                      <span>{new Date(scan.createdAt).toLocaleDateString()}</span>
                      <span className="text-forest font-semibold">View details →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-line bg-cream/20 text-center space-y-2">
            <p className="text-xs text-muted">
              No leaf diagnoses performed yet. Scan plant leaves to detect blight, mildew, rust, or virus symptoms early.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/app/crop-health")}
              className="text-xs font-semibold"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5 text-forest" />
              Scan Plant Leaf
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
