import { authClient } from "@/services/api/authClient";

const API_BASE_URL =
  (import.meta.env?.VITE_API_BASE_URL as string) ||
  (import.meta.env?.VITE_API_URL as string) ||
  "http://localhost:5000/api";

const TOKEN_STORAGE_KEY = "harvestwindow.auth.token";

function getAuthToken(): string | null {
  try {
    const memory = authClient.getAccessToken();
    if (memory) return memory;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function weatherFetch<T>(endpoint: string): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const base = API_BASE_URL.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const response = await fetch(`${base}${path}`, {
    method: "GET",
    headers,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const msg =
      body?.message ||
      (Array.isArray(body?.errors)
        ? body.errors.map((e: { field?: string; message: string }) => e.message).join(", ")
        : null) ||
      `Server returned ${response.status} ${response.statusText}`;
    throw new Error(msg);
  }

  return body as T;
}

export async function fetchFarmWeatherApi(farmId: string, refresh = false) {
  const query = refresh ? "?refresh=true" : "";
  const res = await weatherFetch<{ success: boolean; data: any }>(`/weather/${farmId}${query}`);
  return res.data;
}

export async function fetchCurrentLocationWeatherApi(latitude: number, longitude: number) {
  const res = await weatherFetch<{ success: boolean; data: any }>(
    `/weather/current?latitude=${latitude}&longitude=${longitude}`
  );
  return res.data;
}
