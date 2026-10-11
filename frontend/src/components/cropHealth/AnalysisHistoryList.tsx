import React, { useState } from "react";
import {
  Calendar,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Eye,
  Trash2,
  Filter,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/common/ui";
import type { CropHealthAnalysis, ConditionCategory } from "@/types";
import { cn } from "@/utils/cn";
import { AnalysisResultCard } from "./AnalysisResultCard";

interface Props {
  analyses: CropHealthAnalysis[];
  loading: boolean;
  onDelete: (id: string) => Promise<void>;
  onSelect?: (analysis: CropHealthAnalysis) => void;
  className?: string;
}

export function AnalysisHistoryList({
  analyses,
  loading,
  onDelete,
  onSelect,
  className,
}: Props) {
  const [selectedItem, setSelectedItem] = useState<CropHealthAnalysis | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredAnalyses = analyses.filter((a) => {
    const matchesCategory =
      filterCategory === "ALL" ||
      (filterCategory === "HEALTHY" && (a.status === "HEALTHY" || a.conditionCategory === "HEALTHY")) ||
      (filterCategory === "DISEASED" && a.status === "DISEASED") ||
      (filterCategory === "INCONCLUSIVE" && a.status === "INCONCLUSIVE");

    const matchesSearch =
      !searchQuery.trim() ||
      a.predictedClassName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.crop.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this scan record?")) {
      await onDelete(id);
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search scans by crop or disease..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-line bg-cream/30 text-forest-deep placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-forest/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs font-medium rounded-lg border border-line bg-cream/30 px-2.5 py-1.5 text-forest-deep focus:outline-none focus:ring-2 focus:ring-forest/30"
          >
            <option value="ALL">All Statuses ({analyses.length})</option>
            <option value="HEALTHY">Healthy Plants</option>
            <option value="DISEASED">Diseased Detections</option>
            <option value="INCONCLUSIVE">Inconclusive / Unfamiliar</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      {filteredAnalyses.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-forest/10 text-forest flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-forest-deep">No Crop Health Scans Found</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {analyses.length === 0
              ? "Upload a leaf photo above to evaluate disease symptoms and record your first diagnostic scan."
              : "No records match your current filter settings."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredAnalyses.map((analysis) => {
            const isHealthy =
              analysis.status === "HEALTHY" || analysis.conditionCategory === "HEALTHY";
            const isInconclusive =
              analysis.status === "INCONCLUSIVE" ||
              analysis.confidenceLevel === "INCONCLUSIVE";

            return (
              <div
                key={analysis.id}
                onClick={() => {
                  setSelectedItem(analysis);
                  onSelect?.(analysis);
                }}
                className="p-3.5 rounded-xl border border-line/80 bg-card hover:bg-cream/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
                      isHealthy
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                        : isInconclusive
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-600"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-600"
                    )}
                  >
                    {isHealthy ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : isInconclusive ? (
                      <HelpCircle className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-forest-deep">
                        {analysis.predictedClassName}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          isHealthy
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isInconclusive
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        {analysis.conditionCategory.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted mt-0.5">
                      <span>Crop: <strong>{analysis.crop}</strong></span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(analysis.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confidence & Actions */}
                <div className="flex items-center gap-3 sm:justify-end">
                  <div className="text-right">
                    <span className="text-sm font-extrabold font-display text-forest-deep block">
                      {(analysis.confidenceScore * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                      {analysis.confidenceLevel.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 pl-2 border-l border-line/60">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(analysis);
                      }}
                      className="text-xs p-1.5 text-muted hover:text-forest"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(analysis.id, e)}
                      className="text-xs p-1.5 text-muted hover:text-red-600"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal if an item is selected */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-forest-deep/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-3xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <AnalysisResultCard
              analysis={selectedItem}
              onReset={() => setSelectedItem(null)}
              onDelete={async (id) => {
                await onDelete(id);
                setSelectedItem(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
