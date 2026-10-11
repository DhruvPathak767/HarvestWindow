import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Camera,
  History,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, Button } from "@/components/common/ui";
import { useCropHealth } from "@/hooks/useCropHealth";
import { ImageUploadZone } from "./ImageUploadZone";
import { AnalysisResultCard } from "./AnalysisResultCard";
import { AnalysisHistoryList } from "./AnalysisHistoryList";
import { cn } from "@/utils/cn";

interface Props {
  cropId: string;
  cropName: string;
}

export function CropHealthSection({ cropId, cropName }: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan");

  const {
    currentAnalysis,
    history,
    historyTotal,
    loading,
    analyzing,
    error,
    analyzeImage,
    deleteAnalysis,
    clearCurrentAnalysis,
    setCurrentAnalysis,
  } = useCropHealth(cropId);

  return (
    <Card className="border-line overflow-hidden">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-forest" />
            <span>Crop Disease & Leaf Pathology Screening</span>
          </div>
        }
        subtitle={`Diagnose leaf abnormalities, blight, and fungal/viral infections for ${cropName}.`}
        action={
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 rounded-md text-muted hover:text-forest transition-colors"
            aria-label="Toggle section"
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        }
      />

      {isOpen && (
        <div className="p-5 pt-3 space-y-4">
          {/* Sub Tabs */}
          <div className="flex border-b border-line gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("scan")}
              className={cn(
                "pb-2.5 pt-1 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5",
                activeTab === "scan"
                  ? "border-forest text-forest-deep"
                  : "border-transparent text-muted hover:text-forest-deep"
              )}
            >
              <Camera className="w-3.5 h-3.5" />
              Scan {cropName} Leaf
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "pb-2.5 pt-1 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5",
                activeTab === "history"
                  ? "border-forest text-forest-deep"
                  : "border-transparent text-muted hover:text-forest-deep"
              )}
            >
              <History className="w-3.5 h-3.5" />
              Past Diagnoses ({historyTotal})
            </button>
          </div>

          {activeTab === "scan" ? (
            <div className="space-y-4">
              {currentAnalysis ? (
                <AnalysisResultCard
                  analysis={currentAnalysis}
                  onReset={clearCurrentAnalysis}
                  onDelete={async (id) => {
                    await deleteAnalysis(id);
                    clearCurrentAnalysis();
                  }}
                />
              ) : (
                <ImageUploadZone
                  preselectedCropId={cropId}
                  onAnalyze={async (file) => {
                    await analyzeImage(file, cropId);
                  }}
                  analyzing={analyzing}
                />
              )}
            </div>
          ) : (
            <AnalysisHistoryList
              analyses={history}
              loading={loading}
              onDelete={deleteAnalysis}
              onSelect={(item) => setCurrentAnalysis(item)}
            />
          )}
        </div>
      )}
    </Card>
  );
}
