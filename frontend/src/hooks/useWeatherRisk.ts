import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/services/api";
import type { WeatherRiskAssessment } from "@/types";

export function useWeatherRisk(cropId?: string | null) {
  const [assessment, setAssessment] = useState<WeatherRiskAssessment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef<boolean>(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchAssessment = useCallback(
    async (force = false) => {
      if (!cropId) {
        setAssessment(null);
        setLoading(false);
        setError(null);
        return;
      }

      if (force) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const data = force
          ? await api.refreshCropWeatherRisk(cropId)
          : await api.getCropWeatherRisk(cropId);

        if (isMounted.current) {
          setAssessment(data);
        }
      } catch (err: unknown) {
        if (isMounted.current) {
          console.warn(`[useWeatherRisk] Error fetching weather risk for crop ${cropId}:`, err);
          setError(err instanceof Error ? err.message : "Failed to load weather intelligence");
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [cropId]
  );

  useEffect(() => {
    void fetchAssessment(false);
  }, [fetchAssessment]);

  const refresh = useCallback(async () => {
    await fetchAssessment(true);
  }, [fetchAssessment]);

  return {
    assessment,
    loading,
    refreshing,
    error,
    refresh,
  };
}
