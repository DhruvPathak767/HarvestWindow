import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import type { YieldPrediction, ActualHarvestProduction } from "@/types";

export function useYieldPrediction(cropId?: string) {
  const [prediction, setPrediction] = useState<YieldPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [recording, setRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = useCallback(async () => {
    if (!cropId) {
      setPrediction(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCropYieldPrediction(cropId);
      setPrediction(data);
    } catch (err: unknown) {
      console.warn("[useYieldPrediction] Error loading prediction:", err);
      setError(err instanceof Error ? err.message : "Failed to load yield prediction");
    } finally {
      setLoading(false);
    }
  }, [cropId]);

  useEffect(() => {
    void fetchPrediction();
  }, [fetchPrediction]);

  const refreshPrediction = useCallback(
    async (overrides?: Record<string, unknown>) => {
      if (!cropId) return null;
      setRefreshing(true);
      setError(null);
      try {
        const data = await api.refreshCropYield(cropId, overrides);
        setPrediction(data);
        return data;
      } catch (err: unknown) {
        console.warn("[useYieldPrediction] Refresh error:", err);
        setError(err instanceof Error ? err.message : "Failed to refresh yield prediction");
        return null;
      } finally {
        setRefreshing(false);
      }
    },
    [cropId]
  );

  const recordActualHarvest = useCallback(
    async (data: { quantity: number; unit?: string; harvestDate?: string; notes?: string }) => {
      if (!cropId) return null;
      setRecording(true);
      try {
        const res = await api.recordActualProduction(cropId, data);
        return res;
      } catch (err: unknown) {
        console.warn("[useYieldPrediction] Record harvest error:", err);
        throw err;
      } finally {
        setRecording(false);
      }
    },
    [cropId]
  );

  return {
    prediction,
    loading,
    refreshing,
    recording,
    error,
    refreshPrediction,
    recordActualHarvest,
    reload: fetchPrediction,
  };
}
