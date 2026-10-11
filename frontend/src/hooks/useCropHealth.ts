import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import type {
  CropHealthAnalysis,
  CropHealthHistoryResponse,
  CropHealthStatusResponse,
} from "@/types";

export function useCropHealth(cropId?: string) {
  const [currentAnalysis, setCurrentAnalysis] = useState<CropHealthAnalysis | null>(null);
  const [history, setHistory] = useState<CropHealthAnalysis[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [status, setStatus] = useState<CropHealthStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getCropHealthStatus();
      setStatus(data);
    } catch (err: unknown) {
      console.warn("[useCropHealth] Could not fetch status:", err);
    }
  }, []);

  const fetchHistory = useCallback(
    async (page = 1, limit = 20) => {
      setLoading(true);
      setError(null);
      try {
        const res: CropHealthHistoryResponse = await api.getCropHealthHistory({
          cropId,
          page,
          limit,
        });
        setHistory(res.analyses);
        setHistoryTotal(res.total);
      } catch (err: unknown) {
        console.warn("[useCropHealth] Failed to load scan history:", err);
        setError(err instanceof Error ? err.message : "Failed to load scan history");
      } finally {
        setLoading(false);
      }
    },
    [cropId]
  );

  useEffect(() => {
    void fetchStatus();
    void fetchHistory();
  }, [fetchStatus, fetchHistory]);

  const analyzeImage = useCallback(
    async (file: File, selectedCropId?: string) => {
      setAnalyzing(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("image", file);
        const targetCropId = selectedCropId || cropId;
        if (targetCropId) {
          formData.append("cropId", targetCropId);
        }

        const analysis = await api.analyzeCropHealth(formData, targetCropId);
        setCurrentAnalysis(analysis);
        // Refresh history to include new analysis
        void fetchHistory();
        return analysis;
      } catch (err: unknown) {
        console.warn("[useCropHealth] Image analysis failed:", err);
        const msg = err instanceof Error ? err.message : "Image analysis failed";
        setError(msg);
        throw err;
      } finally {
        setAnalyzing(false);
      }
    },
    [cropId, fetchHistory]
  );

  const deleteAnalysis = useCallback(
    async (analysisId: string) => {
      try {
        await api.deleteCropHealthAnalysis(analysisId);
        setHistory((prev) => prev.filter((a) => a.id !== analysisId));
        setHistoryTotal((prev) => Math.max(0, prev - 1));
        if (currentAnalysis?.id === analysisId) {
          setCurrentAnalysis(null);
        }
      } catch (err: unknown) {
        console.warn("[useCropHealth] Delete failed:", err);
        throw err;
      }
    },
    [currentAnalysis]
  );

  const clearCurrentAnalysis = useCallback(() => {
    setCurrentAnalysis(null);
    setError(null);
  }, []);

  return {
    currentAnalysis,
    history,
    historyTotal,
    status,
    loading,
    analyzing,
    error,
    analyzeImage,
    fetchHistory,
    fetchStatus,
    deleteAnalysis,
    clearCurrentAnalysis,
    setCurrentAnalysis,
  };
}
